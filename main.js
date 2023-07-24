
let version = '0.0.3';
const ALL_ID = -1;

function createNode(role,fbid){

    const namespace = 'zzyycc';
    const node = {}; //create new object

    node.fbid = fbid;
    node.role = role;
    node.id = `${Date.now()}`;//fb 会自动清除未知localstorage
    node.url = window.location.href;
    node.taskname = '';
    node.birthtime = Date.now(); //↑ exposed to others

    node.status = 'init';
    node.channel = new BroadcastChannel(namespace);
    node.masterid = role === 'master' ? node.id : -1;
    //should be the master only having the slaves info
    node.slaves = {};
    node.addSlave = (()=>{
            return function(remoteMsg){
                node.slaves[remoteMsg.fromid] = {
                    role:remoteMsg.role,
                    id:remoteMsg.fromid,
                    url:remoteMsg.url,
                    taskname:remoteMsg.taskname,
                    birthtime:remoteMsg.birthtime//↑消息宿主相关
                }
                console.log(node.slaves);
            }
    })();
    node.delSlave =(()=>{
        return function(id){
            delete node.slaves[id];
        }
    })();
    node.getNewSlave = (()=>{
        return function(url){
            return new Promise((resolve,reject)=>{
                const currtime = Date.now();
                window.open(url,"_blank");
                let times = 3;
                setTimeout(function check(){
                    for (const [id, slave] of Object.entries(node.slaves)) {
                        if('' === slave.taskname&&slave.birthtime>currtime){
                            resolve(id);
                            return;
                        }
                    }
                    if(times-- > 0){
                        setTimeout(check,5000);
                    }else{
                        reject(0);
                    }
                },5000);
        })
        }
    })();
    node.isTaskRunning =(()=>{
        return function(taskname){
            for (const [id, slave] of Object.entries(node.slaves)) {
                if(taskname === slave.taskname){
                    return true;
                }
            }
            return false;
        }
    })();
    node.getTaskId = (()=>{
        return function(taskname){
            for (const [id, slave] of Object.entries(node.slaves)) {
                if(taskname === slave.taskname){
                    return slave.id;
                }
            }
            return 101;//invalid id
        }
    })();
    //msg data structure
    // let package = {
    //     fbid,
    //     role,
    //     fromid,
    //     birthtime, ↑ source node info
    //     toid,
    //     msg,//syn,ack,fin,
    //     payload:{}
    //     timestamp,
    // }

    //封装消息发送接口
    node.sendMsgTo = (function () {
        return function(toid,msg,payload){
            console.log(`[channel]:${node.role} id ${node.id}-->${ALL_ID === toid ? 'brocast':'private'}  msg ${msg}`);
            node.channel.postMessage({
                fbid:node.fbid,
                role:node.role,
                fromid:node.id,
                url:node.url,
                taskname:node.taskname,
                birthtime:node.birthtime,//↑消息宿主相关
                toid: toid,
                msg:msg,
                msgtime:Date.now(),
                payload:payload//↑消息相关
            });
        }
    })();

    //封装消息监听接口
    node.listenMsg = (function(){
        return function(msg,cb){
            node.channel.addEventListener('message',evt=>{
                if((-1 === evt.data.toid || node.id === evt.data.toid)
                    && (evt.data.msg === msg)){
                    console.log(`[channel]:${ALL_ID === evt.data.toid ? 'brocast':'private'} msg ${msg}<--${evt.data.role} id ${evt.data.fromid}`);
                    //返回
                    cb(evt.data);
                }
            });
        };
    })();


    //封装指令注册接口
    node.directiveHandlers = {}
    node.onDirective = (function(){
        return function(directive,cb) {
            //每条指令函数唯一
            node.directiveHandlers[directive] = cb;
        };
    })();

    // 监听指令消息，这个一定是远程节点来的，结果需要消息送回（本地的节点本地执行）
    node.listenMsg('directive',function(remoteMsg){
        //执行指令处理函数
        console.log(`[channel]:${ALL_ID === remoteMsg.toid ? 'brocast':'private'} directive ${remoteMsg.payload.directive.name}<--${remoteMsg.role} id ${remoteMsg.fromid}`);
        console.log(remoteMsg.payload.directive);
        if(remoteMsg.payload.directive.name in node.directiveHandlers){

           const response =(()=>{
                const res = {};
                res.promise = new Promise((resolve,reject)=>{
                    res.send = (res)=>{
                        console.log(res);
                        resolve(res);
                    };
                });
                return res;
            })();

            //注入一个promise,一旦执行完可以拿到数据
            node.directiveHandlers[remoteMsg.payload.directive.name](node,remoteMsg.payload.directive,response);

            //返回结果给指令发送方
            response.promise.then((res)=>{
                node.sendMsgTo(remoteMsg.fromid,'response',{directive:remoteMsg.payload.directive,response:res});
            });
        }
    });

    // 监听指令执行结果，这个一定是远程节点来的，需要将pendingreponses转已决（本地的节点本地执行）
    node.listenMsg('response',function(remoteMsg){
        //执行指令处理函数
        if(remoteMsg.payload.directive.requestid in node.pendingResponses){
            // 未决转已决
            node.pendingResponses[remoteMsg.payload.directive.requestid].send(remoteMsg.payload.response);
        }
    });

    //封装指令发送接口，返回结果promise本地调用
    node.pendingResponses = {};
    node.sendDirective = (function(){
        return function(toid,directive) {
            directive.requestid = Date.now();
            //登记一个promise,一旦执行完可以拿到数据
            const response =(()=>{
                const res = {};
                res.promise = new Promise((resolve,reject)=>{
                    res.send = (res)=>{
                        resolve(res);
                    };
                });
                return res;
            })();
            node.pendingResponses[directive.requestid] = response;
            //发送指令
            if(toid === node.id)
            {
                //同一进程直接调用,channel监听不给自己发的消息
                if(directive.name in node.directiveHandlers){
                    node.directiveHandlers[directive.name](node,directive,response);
                    //指令处理函数将pendingresponses改成已决,即调用.send
                }
            }else{
                node.sendMsgTo(toid,'directive',{directive});
                //远程调用，需等待response消息将pendingresponses改成已决,即调用.send
            }
            //返回为pendingreponses给指令发送方
            return node.pendingResponses[directive.requestid].promise;
        };
    })();

    //一个directive返回后继续下一个，顺序执行
    node.pipeDirectives = (function(){
        return function (id,directives) {
            return directives.map(directive=>{
                 return ()=>{//delay the send
                     return node.sendDirective(id,directive);
                 }
             }).reduce((promise, cur) => promise.then(cur), Promise.resolve())
        }
    })();

    //广播握手、挥手消息
    //trigger syn
	node.sendMsgTo(ALL_ID,'syn',{})

     //trigger fin
     window.addEventListener('unload',()=>{
		node.sendMsgTo(ALL_ID,'fin',{})
	});

    //master pk
    function masterPK(node,remoteMsg){
        if(remoteMsg.role === 'master')
        {
            if(node.role ==='master')
            {
                console.log(`[--log--]:${node.role} id ${node.id} pk master with remote id ${remoteMsg.fromid}`);
                if(node.birthtime > remoteMsg.birthtime){
                    //the first master is master,change itself as slave
                    node.role = 'slave';
                    node.masterid = remoteMsg.fromid;
                    console.log(`[--log--]:this node id ${node.id} losed, changed from master to slave`);
                }else{
                    console.log(`[--log--]:${node.role} id ${node.id} outwins the master status`);
                }
            }else{
                node.masterid = remoteMsg.fromid;
            }
        }
    }

    //监听握手、挥手消息
    //listen syn
    node.listenMsg('syn',function(remoteMsg){
        !node.fbid?(node.fbid=remoteMsg.fbid):""; //for orphan node to syn id
        //master pk
        masterPK(node,remoteMsg);
        //master maintain slaves
        if('master' === node.role)
        {
            node.addSlave(remoteMsg);
        }
        //trigger ack
        node.sendMsgTo(remoteMsg.fromid,'ack',{});
    });

    //listen ack
    node.listenMsg('ack',function(remoteMsg){
        !node.fbid?(node.fbid=remoteMsg.fbid):""; //for orphan node to syn id
        //master pk
        masterPK(node,remoteMsg);
        //master maintain slaves
        if('master' === node.role)
        {
            node.addSlave(remoteMsg);
        }
    });

    //listen fin
    node.listenMsg('fin',function(remoteMsg){
        //master maintain slaves
        if('master' === node.role)
        {
            node.delSlave(remoteMsg.fromid);
        }
    });

    //listen close from master
    node.listenMsg('close',function(remoteMsg){
        //master maintain slaves
        if('master' === remoteMsg.role)
        {
            window.close();
        }
    });

    //status ready sometime after handshake
    node.onReady = (function(){
        return function(cb){
            setTimeout(()=>{
                console.log(`[--log--]:${node.role} id ${node.id} status ready`);
                node.status = 'ready';
                console.log(node);
                cb(node);
            },1000);
        }
    })();

     //封装定时任务接口
     node.runInterval = (function(){
        return function(interval,cb){
             console.log(`[--log--]:${node.role} id ${node.id} starting interval task`);
             const intervalId = setInterval(()=>{cb(node,intervalId)}, interval);
        };
    })();

    //封装延时任务接口
    node.runDelay = (function(){
        return function(dely,cb){
             console.log(`[--log--]:${node.role} id ${node.id} starting interval task`);
             return setTimeout(()=>{cb(node)}, dely);
        };
    })();

    //封装网络get接口
    node.get = (function(){
        return function(uri){

            console.log(`[--log--]:${node.role} id ${node.id} getting ?id=${fbid}&${uri}`);
            return new Promise((resolve,reject)=>{
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `${base_url}?id=${node.fbid}&${uri}`,
                    nocache: true,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    onload: function(response) {
                        if (response.status !== 200) {
                            console.log(`[--log--]:${node.role} id ${node.id} get res err ${response.status}`);
                            reject(uri);
                            return
                        }
                        console.log(`[--log--]:${node.role} id ${node.id} recv from ?id=${fbid}&${uri}`);
                        var ret = JSON.parse(response.responseText);
                        console.log(ret);
                        resolve(ret);
                    }//end of onload
                });
            });
        }
    })();

     //封装网络post接口
    node.post = (function(){
        return function(uri,data){

            console.log(`[--log--]:${node.role} id ${node.id} posting ?id=${fbid}&${uri}`);
            return new Promise((resolve,reject)=>{
                GM_xmlhttpRequest({
                    method: "POST",
                    url: `${base_url}?id=${node.fbid}&${uri}`,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data:data,
                    nocache: true,
                    onload: function(response) {
                        if (response.status !== 200) {
                            console.log(`[--log--]:${node.role} id ${node.id} get res err ${response.status}`);
                            reject(uri);
                            return
                        }
                        console.log(`[--log--]:${node.role} id ${node.id} recv from ?id=${fbid}&${uri}`);
                        var ret = JSON.parse(response.responseText);
                        console.log(ret);
                        resolve(ret);
                    }//end of onload
                });
            });
        }
    })();


    return node;
}


var base_url = 'https://script.google.com/macros/s/AKfycbx7sWNGm7XOQy7uYNirODutr5qtmjJ3ohiaqOnI-n-hFAtEJk26VgrKx1OPGVeI0fNR/exec';

function master(fbid){
	//create channel at init
    let node = createNode('master',fbid);


    let taskMapChannel = {};
    let fetchDirectives = function (node) {

    }

    //node ready
    node.onReady(function(node){

        //Begin:指令驱动的任务
        //directive ={
        // name,
        // ctx:{
        //
        // }
        // }
        //进入页面指令
        node.onDirective('打开',function(node,directive,response){
            console.log(directive);
            const taskname = directive.taskname;
            const url = directive.ctx.params[0];
            const len = directive.ctx.params[1];
            if(!node.isTaskRunning(taskname))
            {
                //open new page
                console.log(`[--log--]:${new Date()} ${directive.name} ${url} ${len}`);
                node.getNewSlave(url).then((slaveid)=>{
                    console.log(`idle slave ${slaveid} for ${taskname}`);
                    console.log(node.slaves[slaveid]);
                    node.slaves[slaveid].taskname = taskname;
                    node.sendDirective(slaveid,directive).then((ret)=>{
                        console.log(ret);
                        node.slaves[slaveid].taskurl = url;//重定向后实际slave.url可能和目标url有差别
                        console.log(node.slaves);
                        response.send({status:'ok',msg:`task ready ${taskname}`});
                    });
                });
            }else{
                //existed!
                response.send({status:'ok',msg:`task already ${taskname}`})
            }
        })

        //页面等待指令
        node.onDirective('等待',function(node,directive,response){
            console.log(`[--log--]:${new Date()} ${directive.name} ${directive.ctx.params[0]}`);
            setTimeout(function check(){
                response.send({status:'ok',msg:`wait ${directive.ctx.params[0]}`})
            },3000);
        });

       //页面随机滚动指令
        node.onDirective('随机滚动',function(node,directive,response){
            console.log(`[--log--]:${new Date()} ${directive.name}`);
            response.send({status:'ok',msg:`randomscroll`})
        });

        //离开页面指令
        node.onDirective('关闭',function(node,directive,response){
            console.log(directive);
        });

        node.onDirective('window_focus',function(node,directive,response){
           window.focus()
        });

        //......

        //End:指令驱动的任务

        //Begin:定时器驱动的任务
        //5s定时获取新动作
        node.runInterval(5000,function(node,intervalId){
            node.get(`api=fetchDirectives`)
                .then(function(ret){
                    ret.tasks.forEach(task=>{
                        console.log(task);
                        node.pipeDirectives(node.id,task.directives);
                    });//end of each page
            });
        });
        //End:定时器驱动的任务
    });



}

//slave page
function slave(fbid,action){
	//create channel at init
    let node = createNode('slave',fbid);

    //node ready
    node.onReady(function(node){
         console.log('i am in ready');
         console.log(node);
        //Begin:指令驱动的任务
        //directive ={
        // name,
        // ctx:{
        //
        // }
        // }

        //接收任务
        node.onDirective('打开',function(node,directive,response){
            const url = directive.ctx.params[0];
            const len = directive.ctx.params[1];
            //打开
            console.log(`打开 ${url}, 实际 ${window.location.href}`);
            node.taskname = directive.taskname;
            window.name = node.taskname;
            response.send({
                url:window.location.href
            });
        });

        node.onDirective('report_url',function(node,directive,response){
            response.send({
                url:window.location.href
            });
        });

        //离开页面指令
        node.onDirective('leave_page',function(node,directive,response){

        });

        //......

        //End:指令驱动的任务

        //Begin:定时器驱动的任务
//         node.runInterval(5000,function(node,intervalId){

//         });


        //End:定时器驱动的任务

    });

    const task = action.task;

    console.log(task);

}

function main(){
    const reMaster = /.*facebook\.com\/profile\.php\?id=(?<id>\d{15})/;
    const str = window.location.href;
    const isMaster = str.match(reMaster);

    const reSlave = /.*facebook\.com.*/;
    const isSlave = str.match(reSlave);

    //all facebook pages otherwise master page are slaves
    if(null !== isMaster){
        //in master page, run with facebook id
        master(isMaster.groups.id);
    }else if (null !== isSlave){
        //in slave page
        slave();
    }
}

console.log(`FBWanderer version ${version}`);

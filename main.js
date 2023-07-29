
let version = '0.1.0';
const ALL_ID = -1;

function worker_timer(){
    function timer(){
        const workercode = () => {
            const namespace = 'zzyycc-timer';
            const timerchannel = new BroadcastChannel(namespace);
            timerchannel.addEventListener('message',evt=>{
                if('starttimer' === evt.data.msg)
                {
                    setTimeout(()=>{
                        timerchannel.postMessage({
                            toid:evt.data.fromid,
                            msg:'endtimer',
                            timerid: evt.data.timerid
                        });
                    },evt.data.delay);
                }else if('startinterval'=== evt.data.msg){
                    setInterval(()=>{
                        timerchannel.postMessage({
                            toid:evt.data.fromid,
                            msg:'interval',
                            timerid: evt.data.timerid
                        });
                    },evt.data.delay);
                }
            });
        };

        let code = workercode.toString();
        code = code.substring(code.indexOf("{") + 1, code.lastIndexOf("}"));

        const blob = new Blob([code], { type: "application/javascript" });
        const worker_script = URL.createObjectURL(blob);
        console.log(`[--log--]:${new Date()} worker timer created!`);
        const timerWorker = new Worker(worker_script);
    }

    mainpage_eval(timer);
}

function mainpage_eval(func){
    var script = document.createElement("script");
    script.textContent = "(" + func.toString() + ")();";
    document.body.appendChild(script);
}

function dateFormat (date,format) { //author: meizz
  var o = {
      "M+": date.getMonth() + 1, //月份
      "d+": date.getDate(), //日
      "h+": date.getHours(), //小时
      "m+": date.getMinutes(), //分
      "s+": date.getSeconds(), //秒
      "q+": Math.floor((date.getMonth() + 3) / 3), //季度
      "S": date.getMilliseconds() //毫秒
  };
  if (/(y+)/.test(format)) {
      format = format.replace(RegExp.$1, (date.getFullYear() + "").substr(4 - RegExp.$1.length));
  }
  for (var k in o){
      if (new RegExp("(" + k + ")").test(format)){
          format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
      }
  }
  return format;
}

function getCurrTime(){
  return dateFormat(new Date,"yyyy-M-d hh:mm:ss");
}

function createNode(role,fbid){

    const namespace = 'zzyycc';
    const node = {}; //create new object

    node.fbid = fbid;
    node.role = role;
    node.id = `${Date.now()}`;//fb 会自动清除未知localstorage
    node.url = window.location.href;
    node.taskname = window.name; //初始是'', reload之后taskname还在
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
    node.slavespipe = [];
    node.getNewSlave = (()=>{
        return function(url){
            return new Promise((resolve,reject)=>{
                // const currtime = Date.now();
                window.open(url,"_blank");
                node.slavespipe.push(resolve);
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

    node.timerHandlers={};
    node.timerchannel = new BroadcastChannel(namespace+'-timer');
    node.callMeLater = (()=>{
        return function(delay,cb){
            let timerid = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
            node.timerHandlers[timerid] = cb;
            node.timerchannel.postMessage({
                fromid:node.id,
                msg:'starttimer',
                timerid: timerid,
                delay:delay
            });
        }
    })();
    node.timerchannel.addEventListener('message',evt=>{
        if((node.id === evt.data.toid && 'endtimer' === evt.data.msg))
        {
            let cb = node.timerHandlers[evt.data.timerid];
            cb(node);
            delete node.timerHandlers[evt.data.timerid];
        }else if((node.id === evt.data.toid && 'interval' === evt.data.msg)){
            let cb = node.timerHandlers[evt.data.timerid];
            cb(node);
        }else if((node.id === evt.data.toid && 'getresponse' === evt.data.msg)){
            console.log(evt.data.response);
        }
    });

     //封装定时任务接口
     node.startInterval = (function(){
        return function(interval,cb){
           let timerid = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
            node.timerHandlers[timerid] = cb;
            node.timerchannel.postMessage({
                fromid:node.id,
                msg:'startinterval',
                timerid: timerid,
                delay:interval
            });
        };
    })();

    //封装消息发送接口
    node.sendMsgTo = (function () {
        return function(toid,msg,payload){
            console.log(`[channel]:${getCurrTime()} ${node.role} id ${node.id}-->${ALL_ID === toid ? 'brocast':'private'}  msg ${msg}`);
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
                    console.log(`[channel]:${getCurrTime()} ${ALL_ID === evt.data.toid ? 'brocast':'private'} msg ${msg}<--${evt.data.role} id ${evt.data.fromid}`);
                    //返回
                    cb(evt.data);
                }
            });
        };
    })();


    //封装指令注册接口
    node.directiveHandlers = {'默认':(node,directive,response)=>{
        console.log(`收到${directive.name}，但未注册默认指令处理器`);
        response.send({status:'ok',msg:`收到指令 ${directive.name}，但未注册默认指令处理器`});
    }}
    node.onDirective = (function(){
        return function(directive,cb) {
            //每条指令函数唯一
            node.directiveHandlers[directive] = cb;
        };
    })();

    // 监听指令消息，这个一定是远程节点来的，结果需要消息送回（本地的节点本地执行）
    node.listenMsg('directive',function(remoteMsg){
        //执行指令处理函数
        console.log(`[channel]:${getCurrTime()} ${ALL_ID === remoteMsg.toid ? 'brocast':'private'} directive ${remoteMsg.payload.directive.name}<--${remoteMsg.role} id ${remoteMsg.fromid}`);
        let handler = node.directiveHandlers['默认'];
        if(remoteMsg.payload.directive.name in node.directiveHandlers)
        {
            handler = node.directiveHandlers[remoteMsg.payload.directive.name];
        }
        const response =(()=>{
            const res = {};
            res.promise = new Promise((resolve,reject)=>{
                res.send = (res)=>{
                    resolve(res);
                };
            });
            return res;
        })();

        //注入一个promise,一旦执行完可以拿到数据
        handler(node,remoteMsg.payload.directive,response);

        //返回结果给指令发送方
        response.promise.then((res)=>{
            node.sendMsgTo(remoteMsg.fromid,'response',{directive:remoteMsg.payload.directive,response:res});
        });
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
            //1s内可能并发，增加随机数
            directive.requestid = `${Date.now()}-${Math.floor(Math.random()*10000)}`;
            //登记一个promise,一旦执行完可以拿到数据
            const response =(()=>{
                const res = {};
                res.promise = new Promise((resolve,reject)=>{
                    res.send = (res)=>{
                        resolve(res);
                    };
                });
                res.createdtime = Date.now();
                res.requestid = directive.requestid;
                return res;
            })();
            node.pendingResponses[directive.requestid] = response;
            //发送指令
            if(toid === 101){//找不到节点
                return new Promise((resolve,reject)=>{
                    resolve({status:'error',msg: 'ID 101 the target node is not existed'});
                });
            }else if(toid === node.id)
            {
                //同一进程直接调用,channel监听不给自己发的消息
                let handler = node.directiveHandlers['默认'];
                if(directive.name in node.directiveHandlers)
                {
                    handler = node.directiveHandlers[directive.name];
                }
                handler(node,directive,response);
                //指令处理函数将pendingresponses改成已决,即调用.send
            }else{
                node.sendMsgTo(toid,'directive',{directive});
                //远程调用，需等待response消息将pendingresponses改成已决,即调用.send
            }
            //返回为pendingreponses给指令发送方
            return node.pendingResponses[directive.requestid].promise;
        };
    })();
    //delete from the object after its fullfilled 5 mins  to avoid mem leakage
    node.clearResources = (()=>{
        return function(){
            for (const [requestid, pendingResponse] of Object.entries(node.pendingResponses)) {
                if(pendingResponse.createdtime + 5*60*1000 < Date.now()){
                    pendingResponse.promise.then(()=>{
                        delete node.pendingResponses[requestid];
                    });
                }
            }
        }
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

    //listen pageready from slave
    node.listenMsg('pageready',function(remoteMsg){
        //master maintain slaves
        if('slave' === remoteMsg.role)
        {
            //如有任务再等待空节点，则resolve一下。shift先来先得
            if('' === remoteMsg.taskname&&node.slavespipe.length>0){
                //shift a resolve out and call
                node.slavespipe.shift()(remoteMsg.fromid);
            }else{
                const pending = node.pendingrefreshs[remoteMsg.taskname];
                if(pending)
                {
                    pending.resolve(remoteMsg.fromid);
                    delete node.pendingrefreshs[remoteMsg.taskname]; //release reference
                }
            }
        }
    });

    //status ready sometime after handshake
    node.onReady = (function(){
        return function(cb){
            setTimeout(()=>{ //这个时候页面应该还是激活状态，保留原生定时器
                console.log(`[--log--]:${node.role} id ${node.id} status ready`);
                node.status = 'ready';
                console.log(node);
                cb(node);
            },1000);
        }
    })();
    //refresh task
    node.pendingrefreshs = {};
    node.refreshTask = (function(){
        return function(taskname){
          const pendingrefresh = (()=>{
                const pending = {};
                pending.promise = new Promise((resolve,reject)=>{
                    pending.resolve = (slaveid)=>{resolve(slaveid);};
                });
                pending.createdtime = Date.now();
                return pending;
            })();
            const reloaddirective = {
                name:'刷新',
                taskname: taskname,
                ctx:{}
            };
            //刷新指令
            return node.sendDirective(node.getTaskId(taskname),reloaddirective)
                .then((ret)=>{
                node.pendingrefreshs[taskname] = pendingrefresh;
                //指令发送成功才返回promise
                return pendingrefresh.promise;
            });
        }
    })();


    //封装网络get接口
    node.get = (function(){
        return function(uri){
            return new Promise((resolve,reject)=>{
                console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} getting ?id=${fbid}&${uri}`);
                GM_xmlhttpRequest({
                    method: "GET",
                    url: `${base_url}?id=${node.fbid}&${uri}`,
                    nocache: true,
                    timeout:30000,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    onload: function(response) {
                        if (response.status !== 200) {
                            console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} get res err ${response.status}`);
                            reject(uri);
                            return
                        }
                        console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} recv from ?id=${fbid}&${uri}`);
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
            return new Promise((resolve,reject)=>{
                console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} posting ?id=${fbid}&${uri}`);
                GM_xmlhttpRequest({
                    method: "POST",
                    url: `${base_url}?id=${node.fbid}&${uri}`,
                    headers: {
                        "Content-Type": "application/json"
                    },
                    data: JSON.stringify(data),
                    nocache: true,
                    timeout:30000,
                    onload: function(response) {
                        if (response.status !== 200) {
                            console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} get res err ${response.status}`);
                            reject(uri);
                            return
                        }
                        console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} recv from ?id=${fbid}&${uri}`);
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

function parseTimeCfg(time){
    const hre=/([1-9]+[0-9]*)h/;
    const mre=/([1-9]+[0-9]*)m/;
    const sre=/([1-9]+[0-9]*)s/;
    return (time.match(hre)?time.match(hre)[1]*1:0)*3600+ (time.match(mre)?time.match(mre)[1]*1:0)*60+(time.match(sre)?time.match(sre)[1]*1:0);
}

function parseDirectives(taskname,directiveStr){
return directiveStr.split('=>').map(d=>{
            return {
              taskname:taskname,
              name:d.trim().match(/(.+)\(.*/)[1],
              ctx:{
                params:d.trim().match(/.+\((.*)\)/)[1].split(",")
              }
            }
          });
}

var base_url = 'https://script.google.com/macros/s/AKfycbyuzuix1V7fu6Zg3oCCKffXudk1Ix7OOgas-3up7PE9Ze2wnva2jjw90WDGInM1-jjq/exec';

function master(node){
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
            node.getNewSlave(url).then((slaveid)=>{
                console.log(`idle slave ${slaveid} for ${taskname}`);
                console.log(node.slaves[slaveid]);
                node.slaves[slaveid].taskname = taskname;
                console.log(`[--dir--]:${getCurrTime()} ${directive.name} ${url} ${len}`);
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

    //等待指令（给组合指令的后续指令增加延时）
    node.onDirective('等待',function(node,directive,response){
        let delay = parseTimeCfg(directive.ctx.params[0]);
        console.log(`[--dir--]:${getCurrTime()} ${directive.name} ${directive.ctx.params[0]}`);
        //seconds*1000
        node.callMeLater(delay*1000,function check(){
            response.send({status:'ok',msg:`wait ${delay}s`})
        });
    });

    //刷新指令
    node.onDirective('刷新',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //刷新指令，refresh返回即页面准备就绪
        node.refreshTask(directive.taskname).then((slaveid)=>{
            console.log(`[--log--]:${getCurrTime()} reload done with new id ${slaveid}`);
            response.send({status:'ok',msg:` reload done with new id ${slaveid} `});
        });
    });

    //发现指令
    node.onDirective('发现',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //目前就是结果透传，可能存在上报逻辑
        node.sendDirective(node.getTaskId(directive.taskname),directive).then((ret)=>{
            response.send(ret);
        });
    });

    //页面监听直播指令
    node.onDirective('监听直播',function(node,directive,response){
        const mode = directive.ctx.params[0];//即停,持续
        console.log(`[--dir--]:${getCurrTime()} ${directive.name} ${directive.ctx.params[0]}`);

        //由master持续调度监听任务直至监听到或页面关闭
        //监听=发现+刷新指令的顺序执行循环（发给master调度）
        (function reloadnfind(){
            node.pipeDirectives(node.id,parseDirectives(directive.taskname,'刷新()=>发现()')).then((ret)=>{
                if('found' === ret.msg && '即停'===mode ){
                    response.send({status:'ok',msg:`监听发现直播`});
                }else{//otherwise, unfound,持续监听场景
                    //持续监听找到
                    if('found' === ret.msg){
                        //TODO: 上报, 由server决定是否打开
                    }
                    if(101 !== node.getTaskId(directive.taskname))//slave is still alive
                    {
                        node.pipeDirectives(node.id,parseDirectives(directive.taskname,'等待(30s)'))
                            .then((ret)=>{
                            //循环检查
                            reloadnfind();
                        });
                    }else{
                        response.send({status:'ok',msg:`页面已关闭，退出监听直播`});
                    }
                }
            })
        })();
    });

    //master默认指令处理逻辑,转发指令
    //可能指令包含：发现、观看直播、进入直播、评论直播、播放直播、浏览、点赞、评论、随机滚动......
    node.onDirective('默认',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name} 默认转发`);
        //转发执行
        node.sendDirective(node.getTaskId(directive.taskname),directive).then((ret)=>{
            response.send({status:'ok',msg:``})
        });
    });

    //End:指令驱动的任务

    //Begin:定时器驱动的任务
    //5s定时获取新动作
     node.startInterval(5000,function(node){
        node.post(`api=fetchDirectives`,{})
         .then(function(ret){
            ret.tasks.forEach(task=>{
                console.log(task.taskname);
                node.pipeDirectives(node.id,task.directives);
            });//end of each page
        });
    });
    //5分钟清除资源
    node.startInterval(5*60*1000,node.clearResources);

    //End:定时器驱动的任务
}

//slave page
function slave(node){

    //Begin:指令驱动的任务
    //directive ={
    // name,
    // ctx:{
    //
    // }
    // }
    console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} status ready`);
    //接收任务
    node.onDirective('打开',function(node,directive,response){
        const url = directive.ctx.params[0];
        const len = directive.ctx.params[1];
        //打开
        console.log(`[--dir--]:${getCurrTime()} ${directive.name} ${url} ${len}, 实际 ${window.location.href}`);
        node.taskname = directive.taskname;
        window.name = node.taskname;

        //登记关闭时间
        const lifetime = parseTimeCfg(len);
        node.callMeLater(lifetime*1000,()=>{
            window.close();
        });
        //回复实际地址
        response.send({status:'ok',url:window.location.href});
    });


    //页面监听前先刷新
    node.onDirective('刷新',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //刷新时slaveid会换，通知注销本页面
        node.sendMsgTo(ALL_ID,'fin',{});//tells others i'm killed
        response.send({status:'ok',msg:`reloaded`})
        //先回复，再刷新
        window.location.reload();
    });

    //页面监听指令
    node.onDirective('发现',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //滚动10页
        window.scrollBy(0,window.innerHeight*10);
        //等待5s加载后,监听最新内容
        node.callMeLater(5*1000,()=>{
            let url = null;
            if(document.querySelector("div[aria-label*=\"正在觀看這段影片\"]")){
                url = document.querySelector("div[aria-label*=\"正在觀看這段影片\"]")
                    .parentElement.parentElement.querySelector("a").href;
                response.send({status:'ok',msg:`found`,url})
            }else{
                response.send({status:'ok',msg:`not found`,url})
            }
        });
    });

    //页面浏览指令
    node.onDirective('浏览',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        response.send({status:'ok',msg:``})
    });

    //页面点击观看直播
    node.onDirective('观看直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //切入视图中间
        let headerHeight = document.querySelector("div[role=\"navigation\"]").getBoundingClientRect().height*2;
        //scroll into view then offset the header
        document.querySelector("div[aria-label*=\"正在觀看這段影片\"]").scrollIntoView();
        window.scrollBy(0,-headerHeight);
        //滚动有延时
        node.callMeLater(3*1000,()=>{
            response.send({status:'ok',msg:`直播视频居中播放`})
        });
    });

    //页面点击观看直播
    node.onDirective('进入直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        let islive = document.querySelector("div[aria-label*=\"正在觀看這段影片\"]");
        if(islive){
            let zoombtn = document.querySelector("div[aria-label*=\"正在觀看這段影片\"]")
            .parentElement.parentElement.querySelector("a");
            console.log(zoombtn);
            if(zoombtn){
                const clickEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: false,//false进入详情页(a默认行为)，true是弹出框(fb拦截了默认行为）
                    view: unsafeWindow
                });
                zoombtn.dispatchEvent(clickEvent);
            }
        }

        response.send({status:'ok',msg:`进入直播`})
    });

    //页面点击评论直播
    node.onDirective('评论直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //缓一下重新点击
        let cmntbtn = document.querySelector("div[aria-label=\"留言\"]");
            //document.querySelector("div[role=\"dialog\"]").querySelector("div[aria-label=\"播放\"]");
        if(cmntbtn){
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: unsafeWindow
            });
            cmntbtn.dispatchEvent(clickEvent);
        }
        response.send({status:'ok',msg:``})
    });

    //页面点击评论直播
    node.onDirective('播放直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        //缓一下重新点击
        // let playbtn = document.querySelector("div[role=\"dialog\"]").querySelector("div[aria-label=\"播放\"]");
        // if(playbtn){
        //     const clickEvent = new MouseEvent('click', {
        //         bubbles: true,
        //         cancelable: true,
        //         view: unsafeWindow
        //     });
        //     playbtn.dispatchEvent(clickEvent);
        // }
        response.send({status:'ok',msg:``})
    });

    //页面点赞指令
    node.onDirective('点赞',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        response.send({status:'ok',msg:``})
    });

    //页面评论指令
    node.onDirective('评论',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name} ${directive.ctx.params[0]}`);
        let comment = directive.ctx.params[0];
        let editArea = document.querySelector("div[role=\"dialog\"] div[role=\"textbox\"]");
        let sendbtn = document.querySelector("div[role=\"dialog\"] div[aria-label=\"留言\"]")

        editArea.focus();
        document.execCommand('insertText', false, `${comment}`);
        node.callMeLater(1000,(node)=>{
            sendbtn.click();
        });
        response.send({status:'ok',msg:``});
    });

    //页面随机滚动指令
    node.onDirective('随机滚动',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        response.send({status:'ok',msg:``})
    });

    //关闭页面指令
    node.onDirective('关闭',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()} ${directive.name}`);
        response.send({status:'ok',msg:``})
        //延迟1s关闭，避免消息没返成功
        node.callMeLater(1000,()=>{
            window.close();
        });
    });

    //End:指令驱动的任务

    //Begin:定时器驱动的任务

    //5分钟清除资源
    node.startInterval(5*60*1000,node.clearResources);

    //End:定时器驱动的任务

    //页面准备ok通知master
    node.sendMsgTo(ALL_ID,'pageready',{});
}

function main(){
    const reMaster = /.*facebook\.com\/profile\.php\?id=(?<id>\d{15})/;
    const str = window.location.href;
    const isMaster = str.match(reMaster);

    const reSlave = /.*facebook\.com.*/;
    const isSlave = str.match(reSlave);

    let newNode = null;
    //all facebook pages otherwise master page are slaves
    if(null !== isMaster){
        //master node
        newNode = createNode('master',isMaster.groups.id);
    }else{
        //slave node
        newNode = createNode('slave',null);
    }
    //node ready
    newNode.onReady((node)=>{
        //master nodes may pk,so decide at last
        if('master' === node.role){
            worker_timer();
            //need sometime to initialize the workertimer
            setTimeout(()=>{master(node);},1000);
        }else{
            slave(node);
        }
    });

}

console.log(`FBWanderer version ${version}`);


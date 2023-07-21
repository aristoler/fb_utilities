
let version = '0.0.3';
const ALL_ID = -1;

function createNode(role,fbid){

    const namespace = 'zzyycc';
    const node = {}; //create new object

    node.fbid = fbid;
    node.role = role;
    node.id = Date.now();//fb 会自动清除未知localstorage
    node.birthtime = Date.now(); //↑ exposed to others

    node.status = 'init';
    node.channel = new BroadcastChannel(namespace);
    node.masterid = role === 'master' ? node.id : -1;
    node.neighbours = new Set(); //↑ inner info

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
                role:node.role,
                fromid:node.id,
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

    // 监听指令消息
    node.listenMsg('directive',function(remoteMsg){
        //执行指令处理函数
        console.log(`[channel]:${ALL_ID === remoteMsg.toid ? 'brocast':'private'} directive ${remoteMsg.payload.name}<--${remoteMsg.role} id ${remoteMsg.fromid}`);
        if(remoteMsg.payload.name in node.directiveHandlers){
            node.directiveHandlers[remoteMsg.payload.name](node);
        }
    });

    //封装指令发送接口
    node.sendDirective = (function(){
        return function(toid,directive) {
            if(toid === node.id)
            {
                //通一进程直接调用,channel不能给自己发消息
                if(directive.name in node.directiveHandlers){
                    node.directiveHandlers[directive.name](node,directive);
                }
            }else{
                node.sendMsgTo(toid,'directive',directive);
            }
        };
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
        if(node.role ==='master' && remoteMsg.role === 'master')
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
        }
    }

    //监听握手、挥手消息
    //listen syn
    node.listenMsg('syn',function(remoteMsg){
        node.neighbours.add(remoteMsg.fromid);
        //master pk
        masterPK(node,remoteMsg);
        //trigger ack
        node.sendMsgTo(ALL_ID,'ack',{});
    });

    //listen ack
    node.listenMsg('ack',function(remoteMsg){
        node.neighbours.add(remoteMsg.fromid);
        //master pk
        masterPK(node,remoteMsg);
    });

    //listen fin
    node.listenMsg('fin',function(remoteMsg){
        node.neighbours.delete(remoteMsg.fromid);
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
             return setInterval(()=>{cb(node)}, interval);
        };
    })();

    //封装延时任务接口
    node.runDelay = (function(){
        return function(dely,cb){
             console.log(`[--log--]:${node.role} id ${node.id} starting interval task`);
             return setTimeout(()=>{cb(node)}, dely);
        };
    })();


    return node;
}



var base_url = 'https://script.google.com/macros/s/AKfycbygYq3dV64EBKCTn1Mbh91vXwfXQZ0WFBgv9-8E98GMBNrmSR354ktt9KrKacwMyv8N/exec';

function master(fbid){
	//create channel at init
    let node = createNode('master',fbid);


    let taskMapChannel = {};
    let fetchDirectives = function (node) {
        console.log(`[--log--]:${node.role} id ${node.id} requesting /?api=fetchActions&id=${fbid}`);
        GM_xmlhttpRequest({
            method: "GET",
            url: `${base_url}?api=fetchActions&id=${fbid}`,
            headers: {
                "Content-Type": "application/json"
            },
            onload: function(response) {
                if (response.status !== 200) {
                    console.log(`[--log--]:${node.role} id ${node.id} get res err ${response.status}`);
                    return
                }
                var ret = JSON.parse(response.responseText);
                console.log(`[--log--]:${node.role} id ${node.id} recv from /?api=fetchActions&id=${fbid}`);
                console.log(ret);
                ret.actions.forEach(action=>{
                    node.sendDirective(node.id,{
                    name:action.action,
                    ctx:action.task
                    });
                });//end of forEach
            }//end of onload
        });
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
        node.onDirective('start_page',function(node,directive){
            console.log(directive);
            // if(!(action.task.origin in taskMapChannel))
            // {
            //     console.log(`[--log--]:open ${action.task.url}`);
            //     window.open(`${action.task.url}`,JSON.stringify({
            //         fbid,
            //         action:action
            //     }));
            // }
        });

        //离开页面指令
        node.onDirective('leave_page',function(node,directive){
            console.log(directive);
        });

        //......

        //End:指令驱动的任务
        //Begin:定时器驱动的任务
        node.runInterval(5000,fetchDirectives);
        //End:定时器驱动的任务

    });



}

//slave page
function slave(fbid,action){
	//create channel at init
    let node = createNode('slave',fbid);

    //node ready
    node.onReady()
    .then(function(node){



    });

    const task = action.task;

    console.log(task);

}
//orphan page
function orphan(fbid){
	//create channel at init
    let node = createNode('orphan',fbid);

    //node ready
    node.onReady()
    .then(function(node){



    });


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
        if('' !== window.name){
            let mission = JSON.parse(window.name);
            slave(mission.fbid,mission.action);
        }else{
            orphan();
        }
    }
}

console.log(`FBWanderer version ${version}`);
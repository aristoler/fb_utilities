// ==UserScript==
// @name         FBWanderer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  try to take over the world!
// @author       You
// @match        *.facebook.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @connect      google.com
// @connect      googleusercontent.com
// @connect      githubusercontent.com
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// @grant        GM_getTabs
// @grant        GM_addElement
// @grant        window.close
// @grant        window.focus

// ==/UserScript==

//begin of script
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
    //var script = document.createElement("script");
    //script.textContent = "(" + func.toString() + ")();";
    //document.body.appendChild(script);
    GM_addElement('script', {
  textContent:  "(" + func.toString() + ")();"
    });
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
  return dateFormat(new Date,"yyyy-MM-dd hh:mm:ss");
}
function getCurrDate(){
  return dateFormat(new Date,"yyyy-MM-dd");
}
function contains(dom,selector, text) {
  var elements = dom.querySelectorAll(selector);
  return Array.prototype.filter.call(elements, function(element){
    return RegExp(text).test(element.textContent);
  });
}
//post operation
function postText(text){
    //如何更改facebook的contenteditable
    //https://stackoverflow.com/questions/65040897/programmatically-change-input-value-in-facebooks-editable-div-input-area/65167751#65167751?newreg=5178a803f0c64caab1a24b2926343cfd
    return new Promise((resolve,reject)=>{
            var editArea = document.querySelector("div[role=\"presentation\"] div[role=\"textbox\"]");
            editArea.focus();//需要聚焦，否则保留placerholder的文字
            var eleToDispEvt = document.querySelector("div[role=\"presentation\"] div[role=\"textbox\"] span");
            let tmpSpan;
            tmpSpan = document.createElement("span");
            tmpSpan.setAttribute("data-text", "true");
            document.querySelector("div[data-editor]:first-child span").appendChild(tmpSpan);
            text.split('\n').forEach(line=>{
                //new text insert position
                document.querySelector("div[data-editor]:last-child span").dispatchEvent(new KeyboardEvent('keydown', {bubbles: true,'keyCode': 13}));
                tmpSpan.innerText = line;
                // simulate user's input
                document.querySelector("div[data-editor]:last-child span").dispatchEvent(new InputEvent('input', {bubbles: true}));
            });
            if (tmpSpan) tmpSpan.remove();//to avoid duplication,Facebook adds it itself!
            setTimeout(resolve,3000);
    });
}
function postImage (inputElement,imageUrl){
//finally find the resolution
//https://stackoverflow.com/questions/76478227/file-upload-event-in-the-form-of-creating-a-new-post-on-facebook
	return new Promise((resolve,reject)=>{
		fetch(imageUrl)
		.then(response => response.blob())
		.then(blob => {
			const file = new File([blob], 'myimage.jpg', { type: blob.type });
			const dataTransfer = new DataTransfer();
			dataTransfer.items.add(file);
			inputElement.files = dataTransfer.files;
			const eventNames = ['change', 'input', 'blur', 'focus'];
			eventNames.forEach(eventName => {
				const event = new Event(eventName, { bubbles: true });
				inputElement.dispatchEvent(event);
			});
			setTimeout(resolve,3000);
		});
	});
}
function observeNode(node,domcb,isonce){
    const config = { attributes: false, childList: true, subtree: true };
    let ishappened = false;
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                //console.log("A child node has been added or removed.",mutation.addedNodes);
                for(let i=0;i<mutation.addedNodes.length;i++){
                    let dom = mutation.addedNodes[i];
                    ishappened = domcb(dom,ishappened);
                    if(ishappened&&isonce){
                        observer.disconnect();
                        return; //stop looping
                    }
                }
            }
        }
    };
    const observer = new MutationObserver(callback);
    observer.observe(node, config);
}
function observeText(node,domcb,isonce){
    const config = {characterData: true, attributes: false, childList: true, subtree: true };
    let ishappened = false;
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
			//console.log(mutation)
            if (mutation.type === "characterData") {
				ishappened = domcb(mutation.target,ishappened);
				if(ishappened&&isonce){
					observer.disconnect();
					return; //stop looping
				}
            }else if(mutation.type === "childList"){
				for(let i=0;i<mutation.removedNodes.length;i++){
					ishappened = domcb(mutation.target,ishappened);
					if(ishappened&&isonce){
						observer.disconnect();
						return; //stop looping
					}
				}
			}
        }
    };
    const observer = new MutationObserver(callback);
    observer.observe(node, config);
}
//超时计时器
function TimeOutCounter(seconds) {
	let counter = {};
	counter.secs = seconds;
	counter.promise = new Promise((res, rej) => {
		counter.res = res;
		counter.rej = rej;
	});
	//启动
	counter.start = function(seconds){
		counter.secs = seconds?seconds:counter.secs;
		//start
		//console.log('counter start at',new Date().toISOString());
		counter.timer = setTimeout(()=>{
			console.log('counter end at',new Date().toISOString());
			counter.res();
		},counter.secs*1000);

		return counter.promise;
	}
	//停止
	counter.stop = function(){
		clearTimeout(counter.timer);
	}
	//重启
	counter.restart = function(seconds){
		counter.stop();
		return counter.start(seconds?seconds:counter.secs);
	}
	return counter;
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
                window.open(url.substring(0,4)!='http'?'https://'+url:url,"_blank");
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
                 return (ret)=>{//delay the send
                     directive.prev = ret; //pipe preve rets
                     return node.sendDirective(id,directive);
                 }
             }).reduce((promise, cur) => promise.then(cur), Promise.resolve({}))
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
                ctx:{params:[]}
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

    //点击事件，直接dom.click不行
    node.click = (function(){
        return function(dom){
            const clickEvent = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: unsafeWindow
            });
            dom.focus();
            dom.dispatchEvent(clickEvent);
        }
    })();

    //操作并等待
    node.actThenWait = (function(){
        return function(maxTries,actcb,waitcb){
            let countdown = maxTries;
            return new Promise((resolve,reject)=>{
                (function attempt(){
                    new Promise((resolve1,reject1)=>{
                        actcb(resolve1);
                    }).then(()=>{
                        if(waitcb()){
                            resolve(true);
                        }else if(-1==maxTries || --countdown > 0){
                            node.callMeLater(2000,attempt);
                        }else{
                            resolve(false);
                        }
                    });
                })();
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
    node.pendingrequests=[];
    node.post = (function(){
        return function(uri,data){
            return new Promise((resolve,reject)=>{
                console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} posting ?id=${node.fbid}&${uri}`);
                if(node.pendingrequests.length> 5){
                    //window.focus(); //网络事件卡主，需要激活窗口. tamper应该用了setTimeout
                    node.pendingrequests = [];
                }
                node.pendingrequests.push(1);
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
                        node.pendingrequests.shift();
                        if (response.status !== 200) {
                            console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} get res err ${response.status}`);
                            reject(uri);
                            return
                        }
                        console.log(`[--log--]:${getCurrTime()} ${node.role} id ${node.id} recv from ?id=${node.fbid}&${uri}`);
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
    const [mintime,maxtime] = time.split('-');
    const hre=/([1-9]+[0-9]*)h/;
    const mre=/([1-9]+[0-9]*)m/;
    const sre=/([1-9]+[0-9]*)s/;

    let min = (mintime.match(hre)?mintime.match(hre)[1]*1:0)*3600+ (mintime.match(mre)?mintime.match(mre)[1]*1:0)*60+(mintime.match(sre)?mintime.match(sre)[1]*1:0);
    let max = min;
    if(maxtime){
      max = (maxtime.match(hre)?maxtime.match(hre)[1]*1:0)*3600+ (maxtime.match(mre)?maxtime.match(mre)[1]*1:0)*60+(maxtime.match(sre)?maxtime.match(sre)[1]*1:0);
    }
    return Math.floor(Math.random() * (max - min)) + min;
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

function createScraper(n){
    const scraper = {};
    const node = n;
    //直播列表翻页
    scraper.showAllVideosPromise =(function(){
        return function (maxNum) {
            let counter = TimeOutCounter();
            function getMaxNumVideos (maxNum) {
                return new Promise((resolve,reject)=>{
                    //直播列表页翻到底
                    let parent = document.querySelector("a>img").parentElement.parentElement.parentElement.parentElement;
                    observeNode(parent,(dom,ishappened)=>{
                        if(Array.from(document.querySelectorAll("a>img")).length>=maxNum){
                            console.log('get max num videos',maxNum);
                            resolve();
                            return true;
                        }
                        //重计时10s
                        counter.restart(10);
                        //翻页
                        Array.from(document.querySelectorAll("a>img")).pop().scrollIntoView();
                        return ishappened;
                    },true);
                    //滚动一下
                    Array.from(document.querySelectorAll("a>img")).pop().scrollIntoView();
                })//end of promise
            }
            //whichever first
            return Promise.race([getMaxNumVideos(maxNum), counter.start(10)]).then(()=>{
                counter.stop();
                console.log(`total ${Array.from(document.querySelectorAll("a>img")).length} videos`);
            });
        }
    })();
    //获取直播列表信息
    scraper.getAllVideos = (()=>{
        return function (){
            let videos=[...document.querySelectorAll("a>img")].map((node)=>{
                //header
                let name = document.querySelector('div[role=\"main\"] h1').textContent;
                let likes = document.querySelector('div[role=\"main\"] span>a:nth-child(1)').textContent;
                let followers = document.querySelector('div[role=\"main\"] span>a:nth-child(2)').textContent;
                //image
                let href = window.location.host+node.parentElement.getAttribute('href');
                let len = node.parentElement.querySelector("span").textContent;
                //title
                let title = node.parentElement.parentElement.childNodes[1].textContent;
                //info
                let s = node.parentElement.parentElement.childNodes[2].textContent.split('·');
                let plays = s[0].trim();
                let time = s[1].trim();
                let updatedat = getCurrDate();
                return [name,likes,followers,href,len,title,plays,time,updatedat];
            });
            return videos;
        }
    })();

    //获取评论列表信息
    scraper.getAllComments = (()=>{
        return function (){
           function getAllCmts (){
                let acctname = document.querySelector("div[role=\"complementary\"] h2 strong" ).textContent;
                let posttime = document.querySelector("div[role=\"complementary\"] span>span>span>span>a[role=\"link\"]>span" ).textContent;
                let posturl = window.location.href;
                let comments=[...document.querySelectorAll("div[role=\"complementary\"] div[role='article']")]
                .map((dom)=>{

                    //帖子账号
                    let name= acctname;
                    //帖子时间
                    let time = posttime;
                    //帖子链接
                    let href = posturl;
                    //评论
                    //头像
                    let avatar = dom.querySelector("svg g image").getAttribute("xlink:href");
                    //fburl
                    let m= dom.querySelectorAll("a")[0].href.match(/(.+)[&\?]comment_id=([^&]+)&.*/);
                    let fburl = m[1];
                    let commentid=m[2];
                    //名称
                    let username = dom.querySelectorAll("a")[1].textContent;
                    //评论
                    let comment = dom.querySelector("span[dir=\"auto\"]>div" )?dom.querySelector("span[dir=\"auto\"]>div" ).textContent:'动图';
                    //评论时间,可能没有
                    let commenttime =dom.querySelector("span>span>div" )?dom.querySelector("span>span>div" ).textContent:'';
                    let updatedat = new Date().toISOString().split('.')[0].replace('T',' ');
                    return [name,time,href,avatar,username,fburl,commentid,comment,commenttime,updatedat];
                });
                return comments;
            }
            let	showlatest = ()=>{
                return new Promise((resolve,reject)=>{
                    const showbtn = document.querySelector("div[role='button']>span>div>div>i")?document.querySelector("div[role='button']>span>div>div>i").closest("span"):null;
                    if(!showbtn){
                        resolve();
                    }
                    const menudom = document.querySelector("div[role='dialog'][aria-label*='工具']").nextSibling;
                    //展开选项
                    observeNode(menudom,(dom,ishappened)=>{
                        const [lastestbtn] = Array.from(document.querySelectorAll("div[role='menu'] div[role='menuitem']")).filter(a=>a.textContent.search('最新显示所有评论')==0);
                        if(lastestbtn){
                            //选择最新
                            lastestbtn.click();
                            return true;
                        }
                        return ishappened;
                    },true);

                    //最新切换完成
                    observeText(showbtn,(dom,ishappened)=>{
                        if('最新'==dom.textContent){
                            console.log(dom.textContent);
                            resolve();
                            return true;
                        }
                        return ishappened;
                    },true);

                    //点击选项
                    showbtn .click();
                });
            }

            let showallcmts = ()=>{
                return new Promise((resolve,reject)=>{
                    const iscmt = document.querySelector("div[role='complementary'] div[role='article']");
                    if(!iscmt){
                        console.log('no comments');
                        return resolve([]);
                    }
                    const cmtcontainter = iscmt.closest("div[style*='height']");
                    const [morezone] = [...cmtcontainter.children].filter(a=>'更多评论'==a.textContent.substring(0,4));
                    if(!morezone){
                        console.log('no more comments');
                        return resolve(getAllCmts());
                    }
                    observeText(morezone,(dom,ishappened)=>{
                        const morecmt = morezone.querySelector("div>span");
                        console.log(dom.textContent);
                        if(!morecmt){
                            console.log('show all comments');
                            resolve(getAllCmts());
                            return true;
                        }else{
                            morecmt.scrollIntoView();
                            morecmt.click();
                        }
                        return ishappened;
                    },true);
                    console.log('show more comments');
                    const morecmt = morezone.querySelector("div>span");
                    morecmt.scrollIntoView();
                    setTimeout(()=>morecmt.click(),1000);//避免事件没有绑定
                });
            }
            //返回全部评论
            return showlatest().then(()=>showallcmts());
        }
    })();

    //点赞翻页
    scraper.showAllLikesPromise = (()=>{
        return function (){
            return new Promise((resolve,reject)=>{
                let showbtn = document.querySelector("div[role=\"complementary\"] span[role=\"toolbar\"]" ).parentElement.querySelector("div>span>div[role=\"button\"]");
                //点赞框未弹出
                showbtn.click();
                //点赞翻页
                let counts = 0;
                let checkN = 2;
                node.callMeLater(3000,function scroll(){
                    let delayRandom = 3+Math.random()*7;
                    //点赞区
                    let likeZone = document.querySelector("div[aria-labelledby][role=\"dialog\"] div[role=\"tablist\"]")
                    .parentElement.parentElement.parentElement.parentElement.parentElement.lastChild;
                    //点赞数
                    let likes = likeZone.querySelectorAll("div[data-visualcompletion=\"ignore-dynamic\"]");
                    //next page
                    if(likes&&likes.length>counts){
                        console.log(`new likes ${likes.length - counts}`);
                        counts = likes.length;
                        checkN = 2;//reset maxtries
                        likes[likes.length-1].scrollIntoView();
                        node.callMeLater(delayRandom*1000,scroll);
                    }else if(checkN-->0){
                        console.log(`seem max at ${counts}`);
                        node.callMeLater(delayRandom*1000,scroll);
                    }else{
                        console.log(`total likes ${counts}`);
                        resolve(counts);
                    }
                });
            });//end of promise
        }// end of function
    })();

    //获取点赞列表
    scraper.getAllLikes = (()=>{
        return function (){
            let timedom = document.querySelector("div[role=\"complementary\"] span>span>span>span>a[role=\"link\"]>span" );
            // let posttime = [...timedom.querySelectorAll("span")].filter((d)=>{
            // 	return !(d.getBoundingClientRect().top > timedom.getBoundingClientRect().bottom
            // 	|| d.getBoundingClientRect().left > timedom.getBoundingClientRect().right
            // 	|| d.getBoundingClientRect().width == timedom.getBoundingClientRect().width)
            // })
            // .sort((a,b)=> a.getBoundingClientRect().left>b.getBoundingClientRect().left?1:-1)
            // .map(n=>n.textContent).join('');
            let hiddendomId = timedom.querySelector("span[aria-labelledby]").getAttribute('aria-labelledby');
            let posttime = document.querySelector(`span[id=\"${hiddendomId}\"]`).textContent;

            let likeZone = document.querySelector("div[aria-labelledby][role=\"dialog\"] div[role=\"tablist\"]")
            .parentElement.parentElement.parentElement.parentElement.parentElement.childNodes[1];
            let likes = likeZone.querySelectorAll("div[data-visualcompletion=\"ignore-dynamic\"]");
            return [...likes].map((dom)=>{
                //帖子账号
                let name= document.querySelector("div[role=\"complementary\"] h2 strong" ).textContent;
                //帖子时间
                let time = posttime;
                //帖子链接
                let href = window.location.href;
                //评论
                //头像
                let avatar = dom.querySelector("svg g image").getAttribute("xlink:href");
                //fburl
                let m= dom.querySelectorAll("a")[0].href.match(/([^&]+)[&\?].*/);
                let fburl = m[1];
                let fbid = fburl.match(/(\d{8,})/)?fburl.match(/(\d{8,})/)[0]:fburl.split('/').pop();
                let commentid = `${fbid}@${href.split('/').pop()}`;//每个帖子的点赞不同
                //名称
                let username = dom.querySelectorAll("a")[1].textContent;
                //评论
                let comment = 'like';
                //帖子时间
                let commenttime ='';
                let updatedat = getCurrDate();
                return [name,time,href,avatar,username,fburl,commentid,comment,commenttime,updatedat];
            });
        }
    })();

    return scraper;
}


var base_url = 'https://script.google.com/macros/s/AKfycbwhc36QTlKch9KvVVHmWIMT2iP6at_RHRL4UfhGtvu1w1CpvwAgPAGjfQrPzzu1H4tO/exec';

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
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
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
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        //seconds*1000
        node.callMeLater(delay*1000,function check(){
            response.send({status:'ok',msg:`wait ${delay}s`})
        });
    });
    //日志指令（给组合指令的后续指令增加延时）
    node.onDirective('日志',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        node.post(`api=recordLog`,{msg:directive.ctx.params[0]})
            .then(function(ret){
            response.send(directive.prev); //无感插入，透传前一个结果
        });
    });

    //刷新指令
    node.onDirective('刷新',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        //刷新指令，refresh返回即页面准备就绪
        node.refreshTask(directive.taskname).then((slaveid)=>{
            console.log(`[--log--]:${getCurrTime()} reload done with new id ${slaveid}`);
            response.send({status:'ok',msg:` reload done with new id ${slaveid} `});
        });
    });

    //页面监听直播指令
    node.onDirective('监听直播',function(node,directive,response){
        const mode = directive.ctx.params[0];//即停,持续
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);

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

    //上报指令
    node.onDirective('上报',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        const sheetname = directive.ctx.params[0];
        const mode = directive.ctx.params[1]?directive.ctx.params[1]:'追加';//追加,去重
        const distinct= directive.ctx.params[2];
	node.post(`api=reportData`,{sheetname,mode,distinct,entries:directive.prev.data?directive.prev.data:[],
				varsource:directive.varsource,
				variables:directive.variables,
				atdone:directive.atdone})
	.then(function(ret){
		response.send({status:'ok',msg:``});
	});
    });

    //下一个指令
    node.onDirective('下一个',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        const delay = directive.ctx.params[0];
        const sheetname = directive.ctx.params[1];
        const filter= directive.ctx.params[2];
        const atfetch = directive.ctx.params[3];
        const atdone = directive.ctx.params[4];
        node.post(`api=nextInLoop`,{taskname:directive.taskname,delay,sheetname,filter,atfetch,atdone})
            .then(function(ret){
            console.log(ret);
            response.send({status:'ok',msg:``});
        });
    });

    //master默认指令处理逻辑,转发指令
    //可能指令包含：发现、观看直播、进入直播、评论直播、播放直播、浏览、点赞、评论、随机滚动......
    node.onDirective('默认',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）默认转发`);
        //转发执行
        node.sendDirective(node.getTaskId(directive.taskname),directive).then((ret)=>{
            response.send(ret)
        });
    });

    //重启master指令
    node.onDirective('重启',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        window.location.reload();
        //response.send({status:'ok',msg:``});
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
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）, 实际 ${window.location.href}`);
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
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        //刷新时slaveid会换，通知注销本页面
        node.sendMsgTo(ALL_ID,'fin',{});//tells others i'm killed
        response.send({status:'ok',msg:`reloaded`})
        //先回复，再刷新
        window.location.reload();
    });

    //页面监听指令
    node.onDirective('发现',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        //滚动10页
        window.scrollBy(0,window.innerHeight*10);
        //等待5s加载后,监听最新内容
        node.callMeLater(5*1000,()=>{
            let url = null;
            if(document.querySelector("div[aria-label*=\"人正在\"]")){
                url = document.querySelector("div[aria-label*=\"人正在\"]")
                    .parentElement.parentElement.querySelector("a").href;
                response.send({status:'ok',msg:`found`,url})
            }else{
                response.send({status:'ok',msg:`not found`,url})
            }
        });
    });

    //页面浏览指令
    node.onDirective('浏览',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        response.send({status:'ok',msg:``})
    });

    //页面点击观看直播
    node.onDirective('观看直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        //切入视图中间
        let headerHeight = document.querySelector("div[role=\"navigation\"]").getBoundingClientRect().height*2;
        //scroll into view then offset the header
        document.querySelector("div[aria-label*=\"人正在\"]").scrollIntoView();
        window.scrollBy(0,-headerHeight);
        //滚动有延时
        node.callMeLater(3*1000,()=>{
            response.send({status:'ok',msg:`直播视频居中播放`})
        });
    });

    //页面点击观看直播
    node.onDirective('进入直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        let islive = document.querySelector("div[aria-label*=\"人正在\"]");
        if(islive){
            let zoombtn = document.querySelector("div[aria-label*=\"人正在\"]")
            .parentElement.parentElement.querySelector("a");
            console.log(zoombtn);
            if(zoombtn){
                zoombtn.click();
            }
        }

        response.send({status:'ok',msg:`进入直播`})
    });

    //页面点击评论直播
    node.onDirective('评论直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        //缓一下重新点击
        let cmntbtn = document.querySelector("div[aria-label*=\"评论\"]");
            //document.querySelector("div[role=\"dialog\"]").querySelector("div[aria-label=\"播放\"]");
        if(cmntbtn){
            cmntbtn.click();
            response.send({status:'ok',msg:``})
        }
    });
    //监听直播观众
    node.onDirective('监听直播观众',function(node,directive,response){
            console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
            const sheetname = directive.ctx.params[0];
            const mode = directive.ctx.params[1];
            const distinct = directive.ctx.params[2];
            //observe new comments
            const targetNode = document.querySelector("div[role='complementary'] div[role='article']").parentNode.parentNode.parentNode.parentNode;
            const config = { attributes: false, childList: true, subtree: true };
            const callback = (mutationList, observer) => {
                for (const mutation of mutationList) {
                    if (mutation.type === "childList") {
                        //console.log("A child node has been added or removed.",mutation.addedNodes);
                        for(var i=0;i<mutation.addedNodes.length;i++){
                            var dom = mutation.addedNodes[i];
                            var user = dom.querySelector("a[role='link'][tabindex='0']");
                            var name = user.textContent;
                            var fburl = user.href.replace('?comment_id','&comment_id').split('&comment_id')[0];
                            var fbid = fburl.split('/')[fburl.split('/').length-1];
                            fbid = fbid.replace("profile.php?id=","");
                            var comment = dom.querySelector("span[lang]").textContent;
                            var videourl = window.location.href;
                            var pagename = document.querySelector("div[role='complementary'] h2 span span").textContent;
                            var item = [pagename,videourl,name,fburl,fbid,comment,new Date().toISOString()];
                            console.log(name,fburl,fbid,comment);
                            node.post(`api=reportData`,{sheetname,mode,distinct,entries:[item]})
                                .then(function(ret){
                                //nothing
                            });
                        }
                    }
                }
            };
            const observer = new MutationObserver(callback);
            observer.observe(targetNode, config);
            //observer.disconnect();

            //observe if live ends
            const mainNode = document.querySelector("div[role='dialog'] div[role='main']");
            const mainobserver = new MutationObserver((mutationList, observer) => {
                for (const mutation of mutationList) {
                    if (mutation.type === "childList") {
                        if(mainNode.textContent.search("結束")>0){
                            response.send({status:'ok',msg:``});
                            return;
                        }
                    }
                }
            });
            mainobserver.observe(mainNode, { attributes: false, childList: true, subtree: true });
    });

    //页面点击评论直播
    node.onDirective('播放直播',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
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
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        response.send({status:'ok',msg:``})
    });

    //页面评论指令
    node.onDirective('评论',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
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

    //个人页面私信
    node.onDirective('私信',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        let comment = directive.ctx.params[0];
        let couldFriend = document.querySelector("div[aria-label='加朋友']");
        let couldMsg = document.querySelector("div[aria-label='發送訊息']");
        if(null !=couldFriend)
        {
            couldFriend.click();
        }
        if (null == couldMsg)
        {
            return response.send({status:'ok',msg:``,data:null});
        }
        couldMsg.click();
        node.callMeLater(10000,(node)=>{
            let editArea = document.querySelector("div[aria-label='訊息'][role='textbox']");
            if(null ==editArea)
            {
                return response.send({status:'ok',msg:``,data:null});
            }
            editArea.focus();
            document.execCommand('insertText', false, `${comment}`);
            node.callMeLater(2000,(node)=>{
                let sendbtn = document.querySelector("div[aria-label*='傳送']");
                if(null !=sendbtn){
                    sendbtn.click();
                    response.send({status:'ok',msg:``,data:[]});
                }else{
                    response.send({status:'ok',msg:``,data:null});
                }
            });
        });
    });
    //分享到小組
    node.onDirective('分享小组',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        let groupname = directive.ctx.params[0];
        let groupurl = directive.ctx.params[1];
                //wait between publishs
        (function publishOneToGroup(){
                //监听小组列表框
            var isgroupfound = false;
            observeNode(document.querySelector("div[role='banner']").nextSibling.nextSibling,(dom,ishappened)=>{
                var dialog = document.querySelector("div[role='dialog'] div[aria-label='分享到小组'");
                var items = document.querySelectorAll("div[role='dialog'] div[role='list'] div[role='listitem'] div[role='button']");
                var [group] = Array.from(items).filter(item=>item.querySelector("a").href.search(groupurl)>=0);
				console.log('!!dialog&&!!group&&!isgroupfound&&!ishappened',!!dialog,!!group,!isgroupfound,!ishappened);
                //var sendbtn = document.querySelector("div[role='dialog'] form div[aria-label='发布']");
                if(!!dialog&&!!group&&!isgroupfound&&!ishappened){
                    //found
                    isgroupfound = true;
                    group.scrollIntoView();
                    group.style.backgroundColor="yellow"
                    console.log(`${groupname},${group.querySelectorAll("span")[1].textContent}`);
                    //监听可发送按钮
                    observeNode(document.querySelector("div[role='banner']").nextSibling.nextSibling,(dom,ishappened)=>{
                        var sendbtn = document.querySelector("div[role='dialog'] form div[aria-label='发布']");
                        var closebtn = document.querySelector("div[role='dialog'] form div[aria-label='关闭']");
                        if(!!sendbtn&&!ishappened){
                            sendbtn.click();
                            console.log(group.textContent);
                            //closebtn.click();
                            response.send({status:'ok',msg:``,data:[]});
                            return true;
                        }
                        return ishappened;
                    },true);
                    //点击小组
                    console.log('click group item');
                    group.click();
                    return true;
                }else if(!!dialog&&!ishappened){
                    //show more
					Array.from(items).pop().scrollIntoView();
                }
                return ishappened;
            },true);

            //监听分享小组选项
            observeNode(document.querySelector("div[role='banner']").nextSibling,(dom,ishappened)=>{
                var [morebtn] = Array.from(dom.querySelectorAll("div[aria-label='分享选项'] div[role='button']")).filter(a=>a.textContent == '更多选项');
                var [groupbtn] = Array.from(dom.querySelectorAll("div[aria-label='分享选项'] div[role='button']")).filter(a=>a.textContent == '分享到小组');
                if(!!groupbtn){
                    //分享到小组
                    console.log('click sharetogroup btn');
                    groupbtn.click();
                    return true;
                }else if(!!morebtn){//展开选项
                    console.log('click more btn');
                    morebtn.click();
                }
                return ishappened;
            },true);
            //点击分享按钮
            var sharebtn = document.querySelector("div[aria-label*='发送']");
            console.log('click sharebtn');
            sharebtn.click();
        })(groupname);
    });

    //分享到动态
    node.onDirective('分享动态',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        var menucontainer = document.querySelector("div[role='banner']").parentElement.childNodes[3];
        var isshared = false;
        const menuobserver = new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    var menu = document.querySelector("div[aria-label*='分享選項']");
                    if(!isshared&&null!=menu){
                        console.log('show menu');
                        //console.log(document.querySelector("div[aria-label*='分享選項']"));
                        if(!isshared && contains(menu,"div[data-visualcompletion] div[role='button']","立即分享").length>0){
                            console.log('show btns',menu.querySelectorAll("div[data-visualcompletion] div[role='button']").length);
                            var postbtn = contains(menu,"div[data-visualcompletion] div[role='button']","立即分享")[0];
                            postbtn.click();
                            isshared = true;
                            response.send({status:'ok',msg:``,data:[]});
                        }
                    }
                }
            }
        });
        menuobserver.observe(menucontainer, { attributes: false, childList: true, subtree: true });
        var sharebtn = document.querySelector("div[aria-label*='寄送']");
        console.log('click sharebtn');
        sharebtn.click();
    });

    //小组爬取
    node.onDirective('爬小组',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        var feeds = [];
        const feedNode = document.querySelector("div[role='feed']");
        const feedobserver = new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    for(var i=0;i<mutation.addedNodes.length;i++){
                        var feed = mutation.addedNodes[i];
                        if(null!=feed.querySelector("a[role='presentation']")){
                            var groupurl = feed.querySelector("a[role='presentation']").href;
                            var groupname = feed.querySelector("a[role='presentation']").textContent;
                            var infos = feed.querySelectorAll("div>span")[1].textContent.split('·');
                            var open = infos[0].trim();
                            var members = infos[1].match(/(\d)/g).join('');
                            var frequency = infos[2]?infos[2].trim():''; //不一定存在
                            var joined = feed.querySelectorAll("div>span")[feed.querySelectorAll("div>span").length-1].textContent;
                            //console.log(i,[groupurl,groupname,open,members,frequency,joined]);
                            feeds.push([groupurl,groupname,open,members,frequency,joined]);
                            console.log(feeds.length);
                        }else if(feed.textContent=='無其他結果'){
                            //交给下游上報內容
                            response.send({status:'ok',msg:``,data:feeds});
                            return;
                        }
                    }
                    //继续翻页
                    document.querySelector("div[role='feed']>div:last-child").scrollIntoView();
                }
            }
        });
        feedobserver.observe(feedNode, { attributes: false, childList: true, subtree: true });
        //首次翻頁
        document.querySelector("div[role='feed']>div:last-child").scrollIntoView();
    });
    //获取我的小组
    node.onDirective('获取我的小组',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        var mygrouplist = Array.from(document.querySelectorAll(" div[role='list']")).pop();
        var lastgroup = Array.from(mygrouplist.querySelectorAll("div[role='listitem'] span a")).pop()
        lastgroup.scrollIntoView();
        function getMoreGroups(){
             var newlastgroup = Array.from(mygrouplist.querySelectorAll("div[role='listitem'] span a")).pop();
             if(newlastgroup.textContent == lastgroup.textContent){
                 var groups = Array.from(mygrouplist.querySelectorAll("div[role='listitem'] span a")).map(a=>{
                     return [node.fbid,a.textContent,a.href];
                 });
                 response.send({status:'ok',msg:``,data:groups})
             }else{
                 lastgroup = newlastgroup;
                 lastgroup.scrollIntoView();
                 setTimeout(getMoreGroups,3000);
             }
        }
        setTimeout(getMoreGroups,3000);
    });

    //小组爬取
    node.onDirective('发图文',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        var text = directive.ctx.params[0]; //index from 1
        var images = directive.ctx.params[1].split('<>');
        var btn = contains(document,"div[role='button']","留個言")[0];
        btn.click();
        var status = 'before_publish';
        //text->image->publish
        var doPublish = ()=>{postText(text).then(()=>{
            const inputElement = document.querySelector("#toolbarLabel").parentElement.querySelector("input");
            return images.reduce( (lastPromise, imageUrl) => {
                return lastPromise.then(() => {
                    return postImage(inputElement,imageUrl);
                });
            }, Promise.resolve())
        }).then(()=>{
            document.querySelector("div[aria-label='發佈']").click();
            status = 'publishing';
        })};
        //wait dialog to show after click
        const bodyobserver = new MutationObserver((mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    if('before_publish'==status){
                        for(var i=0;i<mutation.addedNodes.length;i++){
                            var node = mutation.addedNodes[i];//maybe text node
                            if(node.querySelector&&node.querySelector("div[role=\"presentation\"] div[role=\"textbox\"]")){
                                doPublish();
                                return;
                            }
                        }
                    }else if('publishing'==status){
                        if(null==document.querySelector("div[role=\"presentation\"] div[role=\"textbox\"]")){
                            response.send({status:'ok',msg:``});//fiinish the job
                        }
                    }
                }
            }
        });
        bodyobserver.observe(document, { attributes: false, childList: true, subtree: true });
    });
    //页面随机滚动指令
    node.onDirective('随机滚动',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        let scrollPages = 2+Math.random()*3;
        response.send({status:'ok',msg:``})
        window.scrollBy(0,window.innerHeight*scrollPages);
        node.callMeLater(3000,(node)=>{
            response.send({status:'ok',msg:``})
        });
    });

    //进入直播列表
    node.onDirective('进入直播列表',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);

        var menuelement = document.querySelector("div[role='main']").parentElement.parentElement.parentElement.parentElement.children[1];
        observeNode(menuelement,(dom,ishappened)=>{
                        if(dom.querySelectorAll("div[role=\"menu\"] a[role=\"menuitemradio\"]").length>0){
                           const [livebtn] = Array.from(dom.querySelectorAll("div[role=\"menu\"] a[role=\"menuitemradio\"]"))
                           .filter(d=>d.textContent.search("直播")>-1);
                           if(livebtn){
                               livebtn.click();
                               node.callMeLater(3000,()=>{response.send({status:'ok',msg:``});});//等加载
                           }
                            return true;
                        }
                        return ishappened;
                    },true);
        document.querySelector("div[aria-haspopup=\"menu\"]").click();
    });

    //获取直播列表
    node.onDirective('获取直播列表',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        const maxNum = Number(directive.ctx.params[0]);
        const maxTries = Number(directive.ctx.params[1]);
        const scraper = createScraper(node);
        scraper.showAllVideosPromise(maxNum).then(()=>{
            const videos = scraper.getAllVideos();
            // console.log(videos);
            response.send({status:'ok',msg:``,data:videos})
        });
    });

    //获取评论列表(含赞)
    node.onDirective('获取评论',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        const scraper = createScraper(node);
        scraper.getAllComments().then((comments)=>{
            response.send({status:'ok',msg:``,data:comments})
        });
    });
    //获取评论者
    node.onDirective('获取评论者',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
        const scraper = createScraper(node);
        scraper.getAllComments().then((comments)=>{
            let commenters = comments.reduce((acc,cur)=>{
                //page,videotime,videourl,name,fburl
                acc[cur[5]] = [cur[0],cur[1],cur[2],cur[4],cur[5]];
                return acc;
            },{});
            console.log(commenters);
            response.send({status:'ok',msg:``,data:Object.values(commenters)})
        });
    });

    //关闭页面指令
    node.onDirective('关闭',function(node,directive,response){
        console.log(`[--dir--]:${getCurrTime()}>>${directive.name}(${directive.ctx.params.join(',')}）`);
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
    console.log(`FBWanderer version ${version}`);
}
//end of script
let env = 'dev'; //dev

(function() {
    'use strict';
    //to keep scripted update, note that github has a 5-mins cache mechanism
    if(env=='pro'){
        GM_xmlhttpRequest({
            method : "GET",
            // from other domain than the @match one (.org / .com):
            url : "https://raw.githubusercontent.com/aristoler/fb_utilities/main/main.js",
            onload : (response) =>
            {
                if (response.status !== 200) {
                    console.log('get script failed');
                    return;
                }
                var code = response.responseText;
                code = code.substring(code.indexOf("//begin of script"), code.indexOf("//end of script")+'//end of script'.length);
                eval(code+'\n main();');
                //main();
            }
        });
    }else{
        main();
    }
})();

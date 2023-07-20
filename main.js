// ==UserScript==
// @name         FBWanderer
// @namespace    http://tampermonkey.net/
// @version      0.2.0
// @description  try to take over the world!
// @author       You
// @match        *.facebook.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @connect      google.com
// @connect      googleusercontent.com
// @grant        GM_xmlhttpRequest
// @grant        GM_download
// ==/UserScript==

//channel utilies
function createChannel(name,role){
	const channel = new BroadcastChannel(name);

    function createId(name){
        const key = `channel-${name}`;
        let id = + localStorage.getItem(key);
        if (!id || id >100) {
            id = 0;
        }
        id++;
        localStorage.setItem(key,id.toString());
        return id;
    }

	channel.id = createId(name);
    channel.role = role;
    channel.status = 'init';
    console.log(`${channel.role} id ${channel.id}`);
	channel.listeners = new Set();
    //trigger syn
    console.log(`${channel.role} id ${channel.id} brocasting syn`);
	sendMsg(channel,'syn',{});

    //status ready sometime after handshake
    setTimeout(()=>{
                   channel.status = 'ready';
                   console.log(`${channel.role} id ${channel.id} status ready`);
                   window.dispatchEvent(new Event('pageready'));
                   },1000);

    //trigger fin
	window.addEventListener('unload',()=>{
        console.log(`${channel.role} id ${channel.id} brocasting fin`);
		sendMsg(channel,'fin',{});
	});
	channel.addEventListener('message',e =>{
		if(e.data.msg === 'syn'){
            console.log(`syn from ${e.data.role} id ${e.data.id}`);
            if(channel.role === 'master'){
                if(e.data.role !== 'master'){
                    channel.listeners.add(e.data.id);
                }else{
                    console.log(`syn from ${e.data.role} id ${e.data.id}, conflicted`);
                }
            }else{
     			channel.listeners.add(e.data.id);
            }
            //trigger ack
            console.log(`${channel.role} id ${channel.id} brocasting ack`);
            sendMsg(channel,'ack',{});
		}
		else if(e.data.msg === 'ack') {
            console.log(`ack from ${e.data.role} id ${e.data.id}`);
            channel.listeners.add(e.data.id);
            if(channel.role ==='master' && e.data.role === 'master'){
                //the first master is master,change itself as slave
                channel.role = 'slave';
                console.log(`id ${channel.id} change from master to slave`);
                //trigger syn
                console.log(`${channel.role} id ${channel.id} brocasting syn`);
	            sendMsg(channel,'syn',{});
            }
		}
		else if(e.data.msg === 'fin') {
            console.log(`fin from ${e.data.role} id ${e.data.id}`);
			channel.listeners.delete(e.data.id);
		}
	});
	return channel;
}
//channel utilies
function sendMsg(channel,msg,data) {
	channel.postMessage({
		id:channel.id,
        role:channel.role,
		msg,
        data
	});
}

var base_url = 'https://script.google.com/macros/s/AKfycbyjXoqKCGwWown4siH5ltJaxtIt_xCHcCCscyTLtHazvzthCPm5pV2k9Z-x8cqKWZ1e/exec';

function master(id){
	//create channel at init
    const fbid = id;
	const channel = createChannel('zyc','master');
    let intervalId = null
	window.channel = channel;
	window.sendMsg = sendMsg;
    // if(channel.listeners.size === 0){
    // //create tab
    //    window.open('https://www.google.com?abc','_blank');
    // }else{
    // 	channel.postMessage({
    // 	  id:channel.id,
    // 	  msg:'hello'
    // 	});
    // }
    let taskMapChannel = {};
    //pageready
	window.addEventListener('pageready',()=>{
        console.log(`${channel.role} id ${channel.id} running routine`);
        //timer handler
        intervalId = setInterval(routine, 5000);
        //event handler
        channel.addEventListener('message',e=>{
            switch(e.data.msg)
            {
                case "task_started":
                    taskMapChannel[e.data.data.task] = e.data.id;
                    break;
                default:
                    break;
            }
        });
    });
    //routine
    window.taskMapChannel = taskMapChannel;
    function routine(channel) {
        console.log('makeing request');
        GM_xmlhttpRequest({
            method: "GET",
            url: `${base_url}?api=fetchActions&id=${fbid}`,
            headers: {
                "Content-Type": "application/json"
            },
            onload: function(response) {
                if (response.status !== 200) {
                    console.log(`${channel.role} id ${channel} get res err ${response.status}`);
                    return
                }
                var ret = JSON.parse(response.responseText);
                console.log(ret);
                ret.actions.forEach(action=>{
                switch(action.action) {
                    case "start_watch":
                        if(!(action.task.origin in taskMapChannel))
                        {
                            var url;
                            if (action.task.url.indexOf('?')>-1)
                            {
                                url = `${action.task.url}&id=${fbid}&role=slave&task=${encodeURIComponent(action.task.origin)}`;
                            }else{
                                url = `${action.task.url}?id=${fbid}&role=slave&task=${encodeURIComponent(action.task.origin)}`;
                            }
                            console.log(url);
                            //&id=${fbid}&role=slave&task=${action.task.origin}
                            window.open(`${url}`,'_blank');
                        }
                        break;
                    default:
                        break;
                    }//end of switch
                });//end of forEach

            }//end of onload
        });


    }
}

//slave page
function slave(id,taskStr){
	//create channel at init
    const fbid = id;
	const channel = createChannel('zyc','slave');
	window.channel = channel;
	window.sendMsg = sendMsg;
    let s = taskStr.split("|");
    const task = {
     name:s[0],
     url:s[1],
     start:s[2],
     end:s[3]
    }
    window.taskStr = taskStr;
    window.task = task;
    console.log(task);
    sendMsg(channel,"task_started",{task:taskStr});
	//do routine
    (function routine() {
        //register message handler
        channel.addEventListener('message',e=>{
            switch(e.data.msg)
            {
                case "other":
                    break;
                default:
                    break;
            }
        });

    })();
}

(function() {
    'use strict';
    // /.*facebook\.com\/profile\.php\?id=(\d{15})/
    //https://www.google.com.hk/?id=100093579038987
    // const re = /.*facebook\.com\/profile\.php\?id=(?<id>\d{15}).*(?<role>role=slave)?.*/
    const reMaster = /.*facebook\.com\/profile\.php\?id=(?<id>\d{15})/;
    const reSlave = /.*facebook\.com\/profile\.php\?id=(?<id>\d{15}).*(role=(?<role>slave)).*(task=(?<task>[^&]+)).*/;
    const str = window.location.href;
    const isMaster = str.match(reMaster);
    const isSlave = str.match(reSlave);

    //master url includes slave's url, slave first
    if (null !== isSlave){
        //in slave page
        slave(isSlave.groups.id,decodeURIComponent(isSlave.groups.task));
    }else if(null !== isMaster){
        //in master page, run with facebook id
        master(isMaster.groups.id);
    }
})();

// ==UserScript==
// @name         LiveRobot
// @namespace    http://tampermonkey.net/
// @version      2024-03-02
// @description  try to take over the world!
// @author       You
// @match        *.facebook.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// @connect      google.com
// @connect      googleusercontent.com
// @connect      zhenyoucui.com
// @connect      githubusercontent.com
// @grant        GM_xmlhttpRequest
// ==/UserScript==

function getRequest(url){
    GM_xmlhttpRequest({
        method: "GET",
        url:url,
        headers: {
            "Content-Type": "application/json"
        },
        nocache: true,
        timeout:30000,
        onload: function(response) {
            if (response.status !== 200) {
                console.log(`get res err ${response.status}`);
                return
            }
            var ret = JSON.parse(response.responseText);
            console.log(ret);
        }//end of onload
    });
}
function postRequest(url,data){
    return new Promise((resolve,reject)=>{
        GM_xmlhttpRequest({
            method: "POST",
            url: url,
            headers: {
                "Content-Type": "application/json"
            },
            data: JSON.stringify(data),
            nocache: true,
            timeout:30000,
            onload: function(response) {
                if (response.status !== 200) {
                    console.log(`get res err ${response.status}`);
                    reject();
                    return
                }
                var ret = JSON.parse(response.responseText);
                console.log(url,ret);
                resolve(ret);
            },//end of onload
            onerror:function(error){
                console.log(error);
            },
            onabort:function(error){
                console.log(error);
            },
            ontimeout:function(error){
                console.log(error);
            }
        });
    });
}
function postText(text){
    const dialog = document.querySelector("div[role=\"complementary\"]");
    const editArea = dialog.querySelector("div[aria-label*=\"写评论\"][role=\"textbox\"]");
	console.log('posting text');
	return new Promise((resolve,reject)=>{
		editArea.focus();//需要聚焦，否则保留placerholder的文字
		var eleToDispEvt = editArea.querySelector("p");
		text.trim().split('\n').filter(line=>line!='').forEach(line=>{
			// simulate user's input
			eleToDispEvt.dispatchEvent(new InputEvent('input', {bubbles: true,data:line}));
			//new text insert position
			eleToDispEvt.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true,altKey:true,'keyCode': 13}));
		});
        //const sendbtn = dialog.querySelector("div[aria-label=\"评论\"]"); //sendbtn 以文字输入后为准，回复和评论不是一个
		setTimeout(()=>{
            dialog.querySelector("div[aria-label=\"评论\"]").click();
            setTimeout(resolve,3000);//发送下个之前延迟3s
        },500);
	})
}

var messagePipe = [];
var messagePromiser = Promise.resolve();
function putMsgInPipe(dom,name,message) {
    messagePipe.push({dom,name,message});
    messagePromiser = messagePromiser.then(()=>{
        return new Promise((resolve,reject)=>{
            var top = messagePipe.shift(1);
            //发送
            if(!!top){
                //不管上面有没有成功，都有延时交给下一棒，避免终止
                var sendTimer = new Promise((res, rej) => {
                    setTimeout(()=>{res('msg timeout');},10000);
                });
                //whichever first
                Promise.race([sendMsg(top.dom,top.message), sendTimer]).then(()=>resolve());
            }else{
                resolve();
            }
        });
    });
}

function sendMsg(target,message){
    return new Promise((resolve,reject)=>{
        //先挂载监听函数，再点击发消息
        const msgboxcb = (mutationList, observer) => {
            for (const mutation of mutationList) {
                if (mutation.type === "childList") {
                    for(var i=0;i<mutation.addedNodes.length;i++){
                        var dom = mutation.addedNodes[i];
                        var tmpbox = dom.querySelector("div[aria-label*='发消息给']");
                        if(!tmpbox){
                            return;
                        }
                        //一次监听仅处理一次
                        observer.disconnect();
                        //等待fb挂载处理函数
                        setTimeout(()=>{
                            var msgbox = document.querySelector("div[aria-label*='发消息给']");
                            var msgbtn = msgbox.querySelector("div[aria-label='发消息']");
                            var closebtn = msgbox.querySelector("div[aria-label='关闭']");
                            var msgcontent = msgbox.querySelector("div[contenteditable] p");
                            message.trim().split('\n').filter(line=>line!='').forEach(line=>{
                                // simulate user's input
                                msgcontent.dispatchEvent(new InputEvent('input', {bubbles: true,data:line}));
                                //new text insert position
                                msgcontent.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true,altKey:true,'keyCode': 13}));
                            });
                            //等数据写入
                            setTimeout(()=>{
                                msgbtn.click();
                                //closebtn.click();
                                //等发送成功
                                setTimeout(()=>{resolve('msg sent')},1000);
                            },1000);
                        },2000);
                    }
                }
            }
        }
        const observer = new MutationObserver(msgboxcb);
        observer.observe(document.querySelector("body"), {childList: true,subtree:true});
        //点击发消息
        Array.from(target.querySelectorAll("ul li div[role='button']")).filter(a=>'发消息'==a.textContent)[0].click();
    })
}

function sendReply(target,name,msg){
    //每个用户一个dom，不用pipe up
     observeNode(target,(dom)=>{
         if(!dom.querySelector("form")){
             return false;
         }
         const form = dom.querySelector("form");
         const editArea = form.querySelector("div[contenteditable]");
         //editArea.focus();//需要聚焦，否则保留placerholder的文字
         var eleToDispEvt = form.querySelector("div[contenteditable]");
         //需要先回车激活
         eleToDispEvt.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true,altKey:true,'keyCode': 13}));
         eleToDispEvt.dispatchEvent(new InputEvent('focus', {bubbles: true}));
         msg.trim().split('\n').filter(line=>line!='').forEach(line=>{
             // simulate user's input
             eleToDispEvt.dispatchEvent(new InputEvent('input', {bubbles: true,data:line}));
             //new text insert position
             eleToDispEvt.dispatchEvent(new KeyboardEvent('keydown', {bubbles: true,altKey:true,'keyCode': 13}));
         });
         setTimeout(()=>{form.querySelector("div[aria-label=\"评论\"]").click();},1000);
         return true;
     },true);
    //点击回复
     Array.from(target.querySelectorAll("ul li div[role='button']")).filter(a=>'回复'==a.textContent)[0].click();
}

//添加按钮
function appendRobotBtn(){
    let tmpDiv = document.createElement("div");
    tmpDiv.innerText='自动回复已开启';
    tmpDiv.setAttribute("class", "on");
    tmpDiv.setAttribute("id", "robotswitch");
    tmpDiv.setAttribute("style","height: 36px;line-height: 40px;font-weight:bold;padding: 0 0.5rem;cursor:pointer;color:red;");
    document.querySelector("div[role='complementary'] div[data-pagelet] div[aria-label*='更多']").parentElement.prepend(tmpDiv);
    tmpDiv.addEventListener('click', function(event) {
        if(document.querySelector("div[id='robotswitch']").className == 'on'){
            document.querySelector("div[id='robotswitch']").className = 'off';
            document.querySelector("div[id='robotswitch']").innerText='自动回复已关闭';
        }else{
            document.querySelector("div[id='robotswitch']").className = 'on';
            document.querySelector("div[id='robotswitch']").innerText='自动回复已开启';
        }
        console.log(document.querySelector("div[id='robotswitch']").className);
    }, false);

}

//https://www.facebook.com/100093579038987/videos/
//https://www.facebook.com/zycfc/videos/
var liveprefix = 'https://www.facebook.com/100093579038987/videos/';
var isLiving = false;
function isOnLivePage(){//div[role='dialog']
        if(0==window.location.href.search(liveprefix)
           //下面注释可调试
           && Array.from(document.querySelectorAll("div[role='main'] div[data-pagelet='TahoeVideo'] span")).filter(a=>a.innerText=='直播').length>0
          ){
            isLiving = true;
            return true;
        }else{
            isLiving = true;
            return true;
        }
}
function isRobotExist(){
    return null != document.querySelector("div[id='robotswitch']")?true:false;
}
function isRobotOn(){
    if(isRobotExist() && document.querySelector("div[id='robotswitch']").className == 'on'){
        return true;
    }else{
        return false;
    }
}
function isAdmin()
{
    var brocaster = document.querySelector("div[role=\"complementary\"]").querySelector("a[aria-label] image").href.baseVal;
    var account = document.querySelector("div[role=\"navigation\"] svg[aria-label*=\"你的个人主页\"] image").href.baseVal;
    return brocaster == account;
}
function isSelf(name){
    return name == document.querySelector("div[role='complementary'] div[data-pagelet] h2 strong").textContent;
}
var myCache = (function(){
    var cache = {};
    cache.data = {};
    cache.set = (()=>{
        return function(key,val){
            //set 同步，不保证远程缓存设置成功
            cache.data[key] = val;
            localStorage.setItem(key,val);
            postRequest("https://zhenyoucui.com/zhenserver?api=setcache",{key,val});
        }
    })();
    cache.get = (()=>{
        return function(key){
            //get多级缓存
            if(!cache.data[key]){
                //const local = localStorage.getItem(key);
                const local = null;
                if(!local){
                    return postRequest(`https://zhenyoucui.com/zhenserver?api=getcache`,{key})
                        .then((ret)=>{
                        cache.data[key] = ret.data;
                        localStorage.setItem(key,ret.data);
                        return new Promise((resolve,reject)=>{resolve({key,data:ret.data})});
                    });
                }else{
                    cache.data[key] = local;
                    localStorage.setItem(key,local);
                    return new Promise((resolve,reject)=>{resolve({key,data:local});});
                }
            }else{
                localStorage.setItem(key,cache.data[key]);
                return new Promise((resolve,reject)=>{resolve({key,data:cache.data[key]});});
            }
        }
    })();
    return cache;
})();

var freqs = {};
var reactDirectives = [];
var timers = []
var users = [];
var allcomments = [];
var allusers = [];

function getDirectives(){
    postRequest("https://zhenyoucui.com/zhenserver?api=getrobotconf",{})
    .then(ret=>{
        reactDirectives=ret.directives.map(directive=>{
            if(directive.freq){
                directive.freq = directive.freq*1000;
                freqs[directive.purpose] = 0;
            }
            return directive;
        });;
        timers=ret.timers.map(timer=>{
            var datestring = getTodayString();
            timer.dates = timer.dates?(timer.dates.split('_').length>1?timer.dates.split('_'):[timer.dates,timer.dates]):[datestring,datestring];
            timer.start = timer.start ? new Date([datestring,timer.start].join(' ')).getTime() : 0;
            timer.end = timer.end ? new Date([datestring,timer.end].join(' ')).getTime() : 0;
            timer.interval = timer.interval*1000;
            return timer;
        });
        timerTask();
        users=ret.users;
    });
}
function getUsers(){
    postRequest("https://zhenyoucui.com/zhenserver?api=getusers",{})
    .then(ret=>{
        allusers = ret;
    });
}

function timerTask(){
    var d = new Date();
    function nextTimeSchedule(key,i,scheduledtime){
        var waittime = 0;
        var currtime = new Date().getTime();
        if(!scheduledtime){
            //首次调度
            if(!timers[i].end || timers[i].end > currtime){
                waittime = (timers[i].start > currtime) ? (timers[i].start - currtime) : 0;
                setTimeout(()=>{
                    timers[i].scheduledtime = new Date().getTime();
                    myCache.set(key,d.getTime().toString());
                    putCmtInPipe(timers[i].cmt);
                    //下次调度,必须要用定时器，如果递归外面for循环无法执行
                    setTimeout(()=>{nextTimeSchedule(key,i,timers[i].scheduledtime)},1000);
                },waittime);
            }else{
                console.log('timer end',timers[i].purpose);
            }
        }else if(timers[i].interval){
            if(!timers[i].end || timers[i].end > currtime){
                //定时调度, 过时立即
                waittime = currtime - scheduledtime >timers[i].interval? 0 : timers[i].interval - (currtime - scheduledtime);
                setTimeout(()=>{
                    timers[i].scheduledtime = new Date().getTime();
                    myCache.set(key,d.getTime().toString());
                    putCmtInPipe(timers[i].cmt);
                    //下次调度,必须要用定时器，如果递归外面for循环无法执行
                    setTimeout(()=>{nextTimeSchedule(key,i,timers[i].scheduledtime)},1000);
                },waittime);
            }else{
                console.log('timer end',timers[i].purpose);
            }
        }
    }
    timers.forEach((timer,i)=>{
        //is today inbetween
        if(timer.dates.map(d=>new Date(d)-new Date().toLocaleDateString()).reduce((acc,cur)=>acc*cur,1)>0){
            return;
        }
        var key = `${getTodayString()}_${timer.purpose}`;
        ((key,i)=>{
            myCache.get(key).then((ret)=>{
                console.log(ret.key,ret.data);
                nextTimeSchedule(ret.key,i,ret.data);
            });
        })(key,i);
    });
}
function getTodayString(){
    var d = new Date();
    d.setHours(d.getHours() - 3); //可能跨12点
    return `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2,"0")}-${d.getDate().toString().padStart(2,"0")}`;
}
function isTodayInbetween(d1,d2){
    return ![d1,d2].map(d=>new Date(d)-new Date().toLocaleDateString()).reduce((acc,cur)=>acc*cur,1)>0;
}
String.prototype.populate = function(params) {
  const names = Object.keys(params);
  const vals = Object.values(params);
  var variables = {};
  var result = this.toString();
  if(result.match(/\$\{([^\}]+)\}/gm)){
      variables = result.match(/\$\{([^\}]+)\}/gm).map(m=>m.substring(2,m.length-1)).reduce((acc,cur)=>{acc[cur]='';return acc;},{})
  }
  for(let [key,value] of Object.entries(Object.assign(variables,params))){
	result = result.replaceAll('${'+key+'}',value)
  }
  return result;
}
var userRequested = {};
function userReact(dom,fbid,name){
    var promises = [];
    for(let user of users){
        var names = user.names.populate(allusers);
        var datestring = getTodayString();
        var dates = user.dates?(user.dates.split('_').length>1?user.dates.split('_'):[user.dates,user.dates]):[datestring,datestring];
        if(isTodayInbetween(dates[0],dates[1])&&(names.search('!'+name.trim()+'!')>=0||user.names=='')) //老粉/新粉
        {
            var key = `${user.purpose}_${name}_${dates.join('_')}`;
            if(!userRequested[key]){ //触发远程cache有时延，避免多次请求
                userRequested[key]=true;
                //promise to request one by one
                var promisefunc = (function(key,user,allusers,name){
                    //wrap a function to delay rrun
                    return ()=>{
                        return myCache.get(key).then((ret)=>{
                            if(!ret.data){
                                myCache.set(ret.key,new Date().getTime().toString());
                                putCmtInPipe(user.cmt.populate(Object.assign({name}, allusers.all[name])));
                            }else{
                                console.log(user.purpose,name,'already sent');
                            }
                        });
                    }
                })(key,user,allusers,name);
                if(user.names == '' && promises.length == 0){
                    promises.push(promisefunc);
                }else if(user.names != '' ){
                    promises.push(promisefunc);
                }
            }
        }
    }
    //execute all promises
    promises.reduce((acc,cur)=>acc.then(()=>cur()),Promise.resolve());
}

function commentReact(dom,fbid,name,comment){
    var time = new Date().getTime();
    allcomments.push({fbid,name,comment,time});
    for(let directive of reactDirectives){
        const re = new RegExp(directive.key,"gm");
        if(re.test(comment.trim()))
        {
            if(directive.like
              && Array.from(dom.querySelectorAll("ul li div[role='button']")).filter(a=>'赞'==a.textContent).length != 0){
                setTimeout(()=>{Array.from(dom.querySelectorAll("ul li div[role='button']")).filter(a=>'赞'==a.textContent)[0].click();},1000);
            }
            if(directive.reply
               && Array.from(dom.querySelectorAll("ul li div[role='button']")).filter(a=>'回复'==a.textContent).length != 0){
                sendReply(dom,name,directive.msg);
            }
            if(directive.cmt&&(!freqs[directive.purpose] || (time -freqs[directive.purpose] )>directive.freq)){
                freqs[directive.purpose] = time;
                putCmtInPipe(directive.cmt);
            }
            if(directive.msg
              && Array.from(dom.querySelectorAll("ul li div[role='button']")).filter(a=>'发消息'==a.textContent).length != 0){
                putMsgInPipe(dom,name,directive.msg)
            }
            break;//match then break
        }
    }
}
var commentPipe = [];
var commentPromiser = Promise.resolve();
function putCmtInPipe(cmt){
    if(false == isLiving)
    {
        return;//直播结束
    }
    commentPipe.push({'cmt':cmt,'timestamp':new Date().getTime()});
    // messagePipe.push({dom,name,message});
    commentPromiser = commentPromiser.then(()=>{
        return new Promise((resolve,reject)=>{
            var top = commentPipe.shift(1);
            //发送
            if(!!top.cmt){
                //不管上面有没有成功，都有延时交给下一棒，避免终止
                var sendTimer = new Promise((res, rej) => {
                    setTimeout(()=>{res('cmt timeout');},60000);
                });
                //whichever first
                Promise.race([postText(top.cmt), sendTimer]).then(()=>resolve());
            }else{
                resolve();
            }
        });
    });
}

function observeNode(node,domcb,isonce){
    const config = { attributes: false, childList: true, subtree: true };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                //console.log("A child node has been added or removed.",mutation.addedNodes);
                for(var i=0;i<mutation.addedNodes.length;i++){
                    var dom = mutation.addedNodes[i];
                    if(domcb(dom)&&isonce){
                        observer.disconnect();
                    }
                }
            }
        }
    };
    const observer = new MutationObserver(callback);
    observer.observe(node, config);
}
function commentCb(dom){
    //不是
    if(!dom.querySelector("div[role='article']")){
        return false;
    }
    //以下都满足条件
    var user = dom.querySelector("a[role='link'][tabindex='0']");
    var name = user.textContent;
    if(isSelf(name)){
        console.log('self msg');
        return true;
    }
    var fburl = user.href.replace('?comment_id','&comment_id').split('&comment_id')[0];
    var fbid = fburl.split('/')[fburl.split('/').length-1];
    fbid = fbid.replace("profile.php?id=","");
    var comment = Array.from(dom.querySelectorAll("span div[style*='text']")).map(s=>s.textContent).join('\n');
    var videourl = window.location.href;
    var pagename = document.querySelector("div[role='complementary'] h2 span span").textContent;
    var item = [pagename,videourl,name,fburl,fbid,comment,new Date().toISOString()];
    userReact(dom,fbid,name);
    commentReact(dom,fbid,name,comment);
    return true;
}
function liveStatusMonitor(){
    postRequest("https://zhenyoucui.com/zhenserver?api=getlivestatus",{video_id:window.location.href.split('/').pop()})
    .then(ret=>{
        if(ret.status == 'stopped'){
            postText('今日直播已结束，晚安好夢🌃❤~');
            isLiving = false;
        }else{
            setTimeout(liveStatusMonitor,1*60*1000);
        }
    });

}

function startMonitor(){
    //observe new comments
    if(document.querySelector("div[role='complementary'] div[role='article']")){
        const targetNode = document.querySelector("div[role='complementary'] div[role='article']").parentNode.parentNode.parentNode.parentNode;
        observeNode(targetNode,commentCb,false);
        //observe if live ends
        // const mainNode = document.querySelector("div[role='main'] div[data-pagelet='TahoeVideo']");
        // observeNode(mainNode,videoStatusCb,false);
        liveStatusMonitor();
    }else{
        setTimeout(startMonitor,1000);
    }
}
function startRobot(){
    appendRobotBtn();
    getUsers();
    getDirectives();
    startMonitor();

    console.log('start robot!');
}
//main
(function() {
    'use strict';
    window.navigation.addEventListener('navigate', function(){
        setTimeout(()=>{
            console.log('location changed!');
            console.log(window.location.href);
            if(isOnLivePage()&!isRobotExist()){
                startRobot();
            }
        },5000);
    });
    window.addEventListener('load',function(){
        setTimeout(()=>{
            console.log('page loaded!');
            console.log(window.location.href);
            if(isOnLivePage()&!isRobotExist()){
                startRobot();
            }
        },5000);
    });
})();

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
                console.log(ret);
                resolve(ret);
            }//end of onload
        });
    });
}
function postText(text){
    const dialog = document.querySelector("div[role=\"complementary\"]");
    const editArea = dialog.querySelector("div[aria-label*=\"写评论\"][role=\"textbox\"]");
    const sendbtn = dialog.querySelector("div[aria-label=\"评论\"]");
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
		setTimeout(()=>{resolve(sendbtn)},1000);
	});
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
function cronJob(){

    var text=`
【✨臻有翠—粉絲福利✨】
🎁 新粉首次互動贈送禮品
💸 新粉首單送100元抵用金
💰 每單完成返還3%抵用金
📅 每場簽到送10元抵用金
🎰 簽到粉絲每晚22點抽獎
✍️ 推薦主頁送20元抵用金
🎂 粉絲生日9.5折專屬優惠
🎉 節日活動/專場活動折扣
🏆 月簽到前三送100元抵用金
————————————
提示：
🔍 後臺自動登記福利，查詢使用聯繫後臺
➕ 抵用金可在活動折扣上疊加使用
💳 抵用金可抵訂單金額10%，餘額永久有效
💡 以上福利方案從2024年3月5日開始生效
    `;
    var cb = (function(){
        return function(){
            console.log('wefare introduce');
        }
    })();
    if(isOnLivePage()&&isRobotOn()&&isAdmin()){
        commentsPipe.push({'msg':text,
                           'timestamp':new Date().getTime(),
                           'cb':cb});
    }else{
        console.log('not posting text');
    }
}
//https://www.facebook.com/100093579038987/videos/
//https://www.facebook.com/zycfc/videos/
var liveprefix = 'https://www.facebook.com/100093579038987/videos/';
var interval = 10*60*1000;
function isOnLivePage(){//div[role='dialog']
        if(0==window.location.href.search(liveprefix)
           && Array.from(document.querySelectorAll("div[role='main'] span")).filter(a=>a.innerText=='直播').length>0
          ){
            return true;
        }else{
            return false;
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
            postRequest("https://zhenyoucui.com/webhooks?api=setcache",{key,val});
        }
    })();
    cache.get = (()=>{
        return function(key){
            //get多级缓存
            if(!cache.data[key]){
                const local = localStorage.getItem(key);
                if(!local){
                    return postRequest("https://zhenyoucui.com/webhooks?api=getcache",{key})
                        .then((ret)=>{
                        cache.data[key] = ret.data;
                        localStorage.setItem(key,ret.data);
                        return Promise.resolve(ret.data);
                    });
                }else{
                    cache.data[key] = local;
                    localStorage.setItem(key,local);
                    return new Promise((resolve,reject)=>{resolve(local);});
                }
            }else{
                localStorage.setItem(key,cache.data[key]);
                return new Promise((resolve,reject)=>{resolve(cache.data[key]);});
            }
        }
    })();
    return cache;
})();

function checkIn(fbid,name){
    var d = new Date();
    var key = `${d.getFullYear()}-${d.getMonth()+1}-${d.getDate()}_${name}`;
    myCache.get(key).then((log)=>{
        if(!log){
            myCache.set(key,d.getTime().toString());
            console.log(name,'check in');
            var cb = (function(){
                return function(){
                    console.log('welcome',name);
                }
            })();
            commentsPipe.push({'msg':`晚安，歡迎❤${name}❤來臻有翠直播間做客，已為您登記每日10元簽到抵用金，詳情諮詢 m.me/zycfc`,
                               'timestamp':d.getTime(),
                               'cb':cb});
        }else{
            console.log(name,'already check in');
        }
    });
}
var lastbuytime = 0;
function commentReply(comment){
    if(comment.trim()=='1'){
        var time = new Date().getTime();
        var cb = (function(){
            return function(){
                console.log('congrats to buy');
            }
        })();
        if(!lastbuytime || (time -lastbuytime)>60*1000){
            lastbuytime = time;
            commentsPipe.push({'msg':`恭喜🎉, 扣貨後聯繫後臺👉 m.me/zycfc`,
                               'timestamp':time,
                               'cb':cb});
        }
    }
}
var commentsPipe = [];
var isMonitored = false;
function pipeConsume(){
    var currTime = new Date().getTime();
    var comment = commentsPipe.shift(1);
    if(!comment){//empty
        setTimeout(pipeConsume,3000);
    }else if((currTime-comment.timestamp)>60*1000){
        console.log(`drop ${comment.msg} of ${comment.timestamp}`);
        pipeConsume(); //next one
    }else{
        //有消息3s后发
        setTimeout(()=>{
            postText(comment.msg)
                .then((sendbtn)=>{sendbtn.click();comment.cb();});
            setTimeout(()=>{
                if(!isMonitored){
                    monitorComments();
                    isMonitored = true;
                }
                //3s 后再检查
                pipeConsume();
            },2500);
        },2500);
    }
}

function monitorComments(){
    //observe new comments
    const targetNode = document.querySelector("div[role='complementary'] div[role='article']").parentNode.parentNode.parentNode.parentNode;
    const config = { attributes: false, childList: true, subtree: true };
    const callback = (mutationList, observer) => {
        for (const mutation of mutationList) {
            if (mutation.type === "childList") {
                //console.log("A child node has been added or removed.",mutation.addedNodes);
                for(var i=0;i<mutation.addedNodes.length;i++){
                    var dom = mutation.addedNodes[i];
                    if(!dom.querySelector("div[role='article']")){
                        return;
                    }
                    var user = dom.querySelector("a[role='link'][tabindex='0']");
                    var name = user.textContent;
                    if(isSelf(name)){
                        console.log('self msg');
                        return;
                    }
                    var fburl = user.href.replace('?comment_id','&comment_id').split('&comment_id')[0];
                    var fbid = fburl.split('/')[fburl.split('/').length-1];
                    fbid = fbid.replace("profile.php?id=","");
                    var comment = Array.from(dom.querySelectorAll("span div[style*='text']")).map(s=>s.textContent).join('\n');
                    var videourl = window.location.href;
                    var pagename = document.querySelector("div[role='complementary'] h2 span span").textContent;
                    var item = [pagename,videourl,name,fburl,fbid,comment,new Date().toISOString()];
                    checkIn(fbid,name);
                    commentReply(comment);
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
                    return;
                }
            }
        }
    });
    //mainobserver.observe(mainNode, { attributes: false, childList: true, subtree: true });
}
//main
(function() {
    'use strict';
    window.navigation.addEventListener('navigate', function(){
        setTimeout(()=>{
            console.log('location changed!');
            console.log(window.location.href);
            if(isOnLivePage()&!isRobotExist()){
                appendRobotBtn();
                console.log('start robot!');
                cronJob();
                pipeConsume();
                setInterval(cronJob,interval);
            }
        },5000);
    });
    window.addEventListener('load',function(){
        setTimeout(()=>{
            console.log('page loaded!');
            console.log(window.location.href);
            if(isOnLivePage()&!isRobotExist()){
                appendRobotBtn();
                console.log('start robot!');
                cronJob();
                pipeConsume();
                setInterval(cronJob,interval);
            }
        },5000);
    });
})();

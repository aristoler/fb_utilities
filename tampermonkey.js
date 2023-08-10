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
// @grant        window.close
// @grant        window.focus

// ==/UserScript==
let env = 'pro'; //dev

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

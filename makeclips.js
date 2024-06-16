
//=====================================
//https://stackoverflow.com/questions/23892547/what-is-the-best-way-to-trigger-change-or-input-event-in-react-js

function getReactProps(el) {
  const keys = Object.keys(el);
  const propKey = keys.find(key => key.includes('reactProps'));
  return el[propKey];
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

//======================

#生成直播片段
function getReactProps(el) {
  const keys = Object.keys(el);
  const propKey = keys.find(key => key.includes('reactProps'));
  return el[propKey];
}
function makeNextClip(from,to){
	let [h0,m0,s0] = from;
	let [h1,m1,s1] = to;
	
	let maxLen = document.querySelector("div[aria-label*='结束']").parentElement.parentElement.parentElement.parentElement.querySelector("span").textContent;
	let	[h_max,m_max,s_max] = new Array(3-maxLen.split(":").length).fill('0').concat(maxLen.split(":")).map(a=>parseInt(a));

	let waitTime= 5; //seconds
	
	//1 minitues for one clip
	if(h1*60+ m1 + 5 > h_max*60+m_max){			
		if(document.querySelector("div[aria-label='刷新直播视频片段']")) //more to get,5分钟缓存处理
		{
			document.querySelector("div[aria-label='刷新直播视频片段']").click();
			waitTime = 61;
		}else{
			console.log('end of all');
			return; //end of all
		}
	}else{	
		[h0,m0,s0] = [h1,m1,s1];
		[h1,m1,s1] = [Math.floor((h1*60+ m1 + 1)/60),(h1*60+ m1 + 1)%60,0];
		let cnt = h1*60+ m1;

		let fromstr = [h0,m0,s0].map(a=>a.toString().padStart(2, '0')).join(":")+".000";
		let tostr  = [h1,m1,s1].map(a=>a.toString().padStart(2, '0')).join(":")+".000";
		let maxstr  = [h_max,m_max,s_max] .map(a=>a.toString().padStart(2, '0')).join(":")+".000";

		console.log(cnt,fromstr,tostr,maxstr);
		
		function getReactProps(el) {
		  const keys = Object.keys(el);
		  const propKey = keys.find(key => key.includes('reactProps'));
		  return el[propKey];
		}
		//title
		getReactProps(document.querySelectorAll("label input")[1]).onChange({ target: { value: `#臻有翠 翡翠直播片段 ${cnt}，欢迎关注了解更多~           #翡翠 #珠宝 #玉石 #手镯 #手链 #项链 #耳环 #戒指`}});
		//to
		getReactProps(document.querySelectorAll("label input")[3]).onChange({ target: { value: tostr}});
		setTimeout(()=>{getReactProps(document.querySelectorAll("label input")[3]).onBlur()},0);
		//from
		getReactProps(document.querySelectorAll("label input")[2]).onChange({ target: { value: fromstr}});
		setTimeout(()=>{getReactProps(document.querySelectorAll("label input")[2]).onBlur()},0);
		//make
		setTimeout(()=>{document.querySelector("div[aria-label='制作片段']").click();},0);
	}
	setTimeout(()=>{
		makeNextClip([h0,m0,s0],[h1,m1,s1])
	},waitTime*1000);
}


makeNextClip([2,7,0],[2,7,0]);


//=======================
//删除片段
function deleteOneClip(clip){
	return new Promise((resolve,reject)=>{
		if(!clip){
			reject(null);
			return;
		}
		clip.scrollIntoView();
		let nextclip = clip.nextSibling;
		
		//监听菜单
		const meundialog = new Array(4).fill(0).reduce((acc,cur)=>acc.parentElement,document.querySelector("div[data-pagelet='MainView']")).nextSibling;
		observeNode(meundialog,(dom,ishappened)=>{
			let [delbtn] = Array.from(dom.querySelectorAll("div[role='menuitem']")).filter(a=>a.textContent=='删除片段');
			if(delbtn){
				//点击删除确认框
				observeNode(document.body,(dom,ishappened)=>{
					const [delConfirm] = Array.from(document.querySelectorAll("div[role='button']>span")).filter(a=>a.textContent=='删除');
					//确认删除
					if(delConfirm){
						delConfirm.click();
						resolve(nextclip);
						return true;
					}
					return ishappened;
				},true);
				//点击删除
				delbtn.click();
				return true;
			}
			return ishappened;
		},true);

		//打开菜单
		clip.querySelector("td:nth-child(2) div[role='button'] div[role]").click();
	});
}

//逐个删除
function deleteClipLoop(clip){
	deleteOneClip(clip).then((nextClip)=>deleteClipLoop(nextClip));
}


//=========================

//创建reels

function publishOneClip(clip){

	return new Promise((resolve,reject)=>{
	
		if(!clip){
			return reject(null);
		}
		clip.scrollIntoView();
	
		//监听dialog
		observeNode(document.body,(dom,ishappened)=>{
			const dialogHead = document.querySelector("div[role='dialog'] div[role='heading'");
			if(!dialogHead){
				return ishappened;
			}
			const dialog = dialogHead.closest("div[role='dialog']");
			
			//监听dialog 内容
			observeNode(dialog,(dom,ishappened)=>{
				const [nextbtn] = Array.from(dialog.querySelectorAll("div[role='button']")).filter(a=>a.textContent=='继续');
				const publishbtn = Array.from(dialog.querySelectorAll("div[role='button'][aria-busy]")).filter(a=>a.textContent.search('发布')>=0).pop();
				const textarea = dialog.querySelector("textarea[placeholder*='字幕']");
				console.log('publishbtn && textarea',!!publishbtn,!!textarea);
				if(nextbtn){
					nextbtn.click();
				}else if(publishbtn&&textarea){
					getReactProps(textarea).onChange({ target: { value: clip.querySelector("td:nth-child(2)>div>div>div:nth-child(2)>div:nth-child(2)").textContent}});
					setTimeout(()=>{
						publishbtn.click()
						setTimeout(()=>{resolve(clip.nextSibling)},3000);
					},0);
					return true;
				}
				return ishappened;
			},true);
			
			//继续
			const [nextbtn] = Array.from(dialog.querySelectorAll("div[role='button']")).filter(a=>a.textContent=='继续');
			nextbtn.click();
			
			//body监听结束
			return true;
		},true);
		
		//点击创建reels
		clip.querySelector("td:nth-child(2) div[role='button']").click();
		
	});
}

function publishClipLoop(clip){
	publishOneClip(clip).then((nextClip)=>{
		setTimeout(()=>{
			publishClipLoop(nextClip);
		},2000);
	})
}


function publishClipLoop(clip){
	publishOneClip(clip).then((clip)=>{
		deleteOneClip(clip).then((nextClip)=>{
			setTimeout(()=>{
				publishClipLoop(nextClip);
			},5000);
		})
	})
}

let clip = document.querySelector("tbody tr");

publishClipLoop(clip)

//===============


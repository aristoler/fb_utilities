let version = '0.0.3';
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

function initNode(role){

    function createId(namespace){
        const key = `node-${namespace}`;
        let id = + localStorage.getItem(key);
        if (!id || id >100) {
            id = 0;
        }
        id++;
        localStorage.setItem(key,id.toString());
        return id;
    }

    const node = {};
    node.role = role;
    node.status = 'status';
    node.channel = new BroadcastChannel('zzyycc');
    node.id = createId('zzyycc');
    node.neighbours = new Set();


    return node;
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

var base_url = 'https://script.google.com/macros/s/AKfycbygYq3dV64EBKCTn1Mbh91vXwfXQZ0WFBgv9-8E98GMBNrmSR354ktt9KrKacwMyv8N/exec';

function master(id){
	//create channel at init
    const fbid = id;
	const channel = createChannel('zyc','master');
    let intervalId = null
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
                            console.log(`open ${action.task.url}`);
                            window.open(`${action.task.url}`,JSON.stringify({
                                fbid,
                                action:action
                            }));
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
function slave(id,action){
	//create channel at init
    const fbid = id;
	const channel = createChannel('zyc','slave');

    const task = action.task;
    console.log(task);
    sendMsg(channel,"task_started",{task:task.origin});
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
//orphan page
function orphan(){


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
            slave(mission.id,mission.action);
        }else{
            orphan();
        }
    }
}

console.log(`FBWanderer version ${version}`);

main();
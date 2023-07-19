
function remoteLog(){

}

(function() {
    'use strict';
    // Your code here...
    const intervalID = setInterval(scheduler, 5000);
    let schStates = {
        "isMaster": window.location.host.indexOf("zhenyoucui.com") > -1,
        "activeTask":null
    };

    var fetchTask = function (){
        return new Promise(resolve=>{
            setTimeout(()=>{resolve({
                "name":"fb",
                "url": "https://www.baidu.com",
                "start": "18:00",
                "end": "23:59"
            });},5000);
        });
    }
    function LiveTask(task){
        this.name = task.name;
        this.url = task.url;
        this.start = task.start;
        this.end = task.end;
        this.interval = null;
        function intervalFunc(){
            console.log("i am in task page "+new Date());
        }
        this.run = function(){
            this.interval = setInterval(intervalFunc, 5000);
        }
    }
    function isNewTask(a,b){
        return a==null||b==null||!(a.name==b.name&&a.url==b.url&&a.start==b.start&&a.end==b.end);
    }
    function scheduler() {
        fetchTask().then(function(task){
            //in ther master page, start new task
            if(schStates.isMaster){
                console.log("isMaster "+ schStates.isMaster);
                if(isNewTask(schStates.activeTask,task)){
                    console.log("isMaster "+ schStates.isMaster +" isNewTask "+isNewTask(schStates.activeTask,task));
                    //only start the task page in the master
                    schStates.activeTask = task;
                    window.open(task.url,"_blank");
                }
            }else{
            //in the task page, start new task for initial or close itself
                if(isNewTask(schStates.activeTask,task)){
                    if(schStates.activeTask != null){
                        remoteLog(`Task ${0} closed at ${new Date()}`)
                        window.close();
                    }else{
                        schStates.activeTask = new LiveTask(task);
                        schStates.activeTask.run();
                    }
                }
            }
        });
    }

})();

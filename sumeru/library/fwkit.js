var fwkit = function(){
   var fwkit = fwkit || function(a,b){return fwkit.win ? fwkit.win(a,b) : null};//function(g,c){return baidu.dom ? baidu.dom(q, c) : null; }
   fwkit.version = "1.0";
   // fwkit.subwinPosition = [0,0];
   var notification = null;
   var notifications = {};
   var notifications_timer = {};
   var noticount = 0;
   fwkit.noti_show = true;//全局中设置
   fwkit.snapping = false;
   var click_quene = {};//存放点击systray事件队列
   var sysico_timer,sysico_url;
   var NEW_WINDOW_SETTING = 'scrollbars=no,status=no,innerHeight=480,innerWidth=560';
   var NEW_WINDOW_SETTING_L='scrollbars=no,status=no,innerHeight=600,innerWidth=700';
   var NEW_WINDOW_SETTING_S = 'innerHeight=300,innerWidth=400,top=150,left=300,scrollbars=no,status=no,resizable=no';
   
   var sys_init = function(ico_url){
       if (!fwkit.main.isMain || !fwkit.main.isKit) {
           return false;
       }
       //windows要闪动，mac切换
       if (fwkit.main.trayNotify && !fwkit.main.isMac){//windows下换图标效果差，改为闪动替代
           if (ico_url === '/fav.ico'){//默认图标不闪动
               fwkit.systray("noflash");
           }else{
               fwkit.systray("flash");
           }
           return;
       }
       if (sysico_timer)clearTimeout(sysico_timer);
       sysico_timer = setTimeout(function(){
           if (ico_url === sysico_url){return;}
           fwkit.main.trayNotify && fwkit.main.trayNotify.close();//如果存在先删除
           fwkit.main.trayNotify = window.webkitNotifications.createTrayNotification((ico_url),function(event){
               if (event.code === 0) {//这个click有一个默认的行为放在了systray中定义
                   fwkit.systray.click_default();
                   fwkit.systray.click && fwkit.systray.click();//初始化绑定的事件
               }else if (event.code === 1) {
                   fwkit.systray.rightclick && fwkit.systray.rightclick();
               }else if (event.code === 2) {
                   fwkit.systray.mouseover && fwkit.systray.mouseover();
               }else if (event.code === 3) {
                   fwkit.systray.dbclick && fwkit.systray.dbclick();
               }
           });
           fwkit.main.trayNotify.show();
           sysico_url = ico_url;
       },200);
   }
   
   //0.初始化之前需要定义.此函数用于系统工具栏
   fwkit.systray = function( command , callback){
       switch (command) {
           case "show":
               fwkit.main.trayNotify.show();
               break;
           case "hide":
               fwkit.main.trayNotify.close();
               break;
           case "flash":
               fwkit.main.trayNotify.updateTray(1);
               break;
           // case "stop":
           case "click":
               callback && (fwkit.systray.click = callback);
               break;
           case "addclick":
               if (arguments[2] &&click_quene[arguments[2]] ){
                   return;//同样的，不用在推送
               }
               click_quene[arguments[2]] = callback;
               break;
           case "mouseover":
               callback && (fwkit.systray.mouseover = callback);
               break;
           case "rightclick":
               callback && (fwkit.systray.rightclick = callback);
               break;
           case "noflash":
               fwkit.main.trayNotify.updateTray(0);
               break;
           default:
               
               break;
       }
   };
   var isEmpty = function( obj ) { 
       for ( var name in obj ) { 
           return false; 
       } 
       return true; 
   } 
   fwkit.systray.click_default = function() {
       if (sumeru.reachability.getStatus() != sumeru.reachability.STATUS_CONNECTED) {//如果已经断线了...
           window.exc_cmd("active");
           // var wins = fwkit.winsApp.getWins();
           // //1.关闭子窗口
           // for ( name in wins){
               // wins[name].close();
           // }
           // //2.关闭通知
           // for (name in notifications){
               // notifications[name] && notifications[name].close();
           // }
           // //3.清空数字
           // if (fwkit.main.isMac){
               // window.removeBadgeLabel();
           // }else{
//                
           // }
           // sys_init("/fav.ico");
           // //4.清空winsStack
           // fwkit.winsStack = [];
//            
           // click_quene = {};
          // alert('您已断线，请重新连接');
           // location.reload();
           //location.hash('/hi-login',{errmsg:'您已断线，请重新连接'},true);
           location.hash ='/hi-login!errmsg='+encodeURI('您已断线，请重新连接');
           location.reload();
           return ;//return;
       }
       if (fwkit.winsStack.length || !isEmpty(click_quene) ){
           
           for (var name in click_quene ){
               click_quene[name]();
               delete click_quene[name];
           }
           
           (function(winsStack){
               for (var i = 0,len  = winsStack.length;i<len;i++){
                   var item  = winsStack.shift();
                   if (item) {
                       Library.hiUtils.openDialog(item);
                       delete item;
                   }
               }
               //fwkit.winsStack = [];//清空
           })(fwkit.winsStack)
           
       }else{
           window.exc_cmd("active");//默认事件1,acive当前窗口
       }
   }
   // fwkit.systray.
   //1.此函数用于任务栏
   fwkit.taskbar = function(command, callback) {
       switch (command) {
           case "show":
               window.exc_cmd("addicontaskbar");
               break;
           case "hide":
               window.exc_cmd("delicontaskbar");
               break;
           case "flash":
               window.flashWindow();
               break;
           default:
               break;
       }
       callback && callback();
   }
   
   //1.此函数初始化执行一次，用于检测是否为主窗口
   //2.主窗口很多特性与子窗口有区别，比如systray是否显示，是否闪动，等等
   fwkit.main = fwkit.main || function(){
       var result = {
           isMain: (window.opener === null || window.opener === window),//判断是否为主窗口
           isKit:(window.webkitNotifications && typeof window.webkitNotifications.createTrayNotification !== "undefined"),
           isMac:(navigator.userAgent.indexOf("Mac") != -1),
           
       };
       result.topWindow = null;
       //绑定chrome-kit关闭方法
       if (result.isKit) {//绑定kit上的一些函数
           //绑定关闭快捷键和防关闭操作
           window.addEventListener("keydown",function(e){
               var ctrlkey = result.isMac ? e.metaKey:e.ctrlKey;
               if (e.keyCode === 87 && ctrlkey ){//command+w
                   if ( result.isMain ){
                       //最小化
                       fwkit("min")
                   }else{//关闭
                       window.close();
                   }
               }else if (e.keyCode === 116) {//f5刷新
                   e.preventDefault();
               }
           });
           window.onchromewindowclose = function() {
               fwkit("close");
           }
           
       }
       
       if ( result.isMain ) {
           if (result.isKit) {
               //绑定关闭方法
               window.addEventListener("unload", function(){
                   fwkit.main.trayNotify.close();
                   if (sysico_timer)clearTimeout(sysico_timer);
                   //关闭主窗口操作移到这儿
                   var wins = fwkit.winsApp.getWins();
                   //1.关闭子窗口
                   // for ( name in wins){
                       // wins[name].close();
                   // }
                   //2.关闭通知
                   for (name in notifications){
                       notifications[name] && notifications[name].close();
                   }
                   //3.清空数字
                   if (result.isMac){
                       window.removeBadgeLabel();
                   }
               });
               if (result.isMac) {
                   //隐藏标题栏,放在框架内判断
               }else{//关闭任务栏
                   fwkit.taskbar("hide");//windows版本
               }
           }
       }else {//即window.opener存在
           
           var tmp = window.opener;//tmp存在
           while(tmp) {
               if (tmp.opener === null || tmp.opener === tmp) {
                   break;
               }
               tmp = tmp.opener;//这个也存在
           }
           result.topWindow = tmp;
       }
       //顺便绑定mac doc事件，原则上和systray保持一致
       if (result.isMac) {
           window.addEventListener("dockclick",function(){
               fwkit.systray.click_default();
               fwkit.systray.click && fwkit.systray.click();//初始化绑定的事件
           });
       }
       return result;
   }();
   sys_init("/fav.ico");
   
   //仅限于windows，mac
   fwkit.drag = function(dom) {
       var start = {};
       function DragMove2(e) {
           DragMove(dom, e);
       }

       function DragStop2(e) {
           DragStop(dom, e);
       }
       function DragStop(dom, e) {
           start = {};
           if (dom.releaseCapture) {
               dom.releaseCapture();
           } else if (dom) {
               window.removeEventListener("mousemove", DragMove2);
               window.removeEventListener("mouseup", DragStop2);
           }
       }
       function DragMove(dom,e) {
           if (typeof start.winX === "undefined"){
               return;
           }
           window.moveTo((start.winX + (e.screenX - start.screenX)), (start.winY + (e.screenY - start.screenY)));
       }
       //记录坐标位置，drag-start
       fwkit.main.offsetTop = (window.outerHeight - window.innerHeight) + window.screen.availTop;
       fwkit.main.offsetLeft = (window.outerWidth - window.innerWidth) + window.screen.availLeft;
       
       dom.addEventListener("mousedown", function(e){
           start.pageY = e.pageY;
           start.pageX = e.pageX;
           start.screenX = e.screenX;
           start.screenY = e.screenY;
           start.winX = (e.screenX - start.pageX) - fwkit.main.offsetLeft;
           start.winY = (e.screenY - start.pageY) - fwkit.main.offsetTop;
           if (dom.setCapture){
               dom.setCapture();
           }else{
               window.addEventListener ("mousemove", DragMove2, true);
               window.addEventListener ("mouseup",   DragStop2, true);
           }
       },false);
       //操作栏，不拖拽
       if (dom.getElementsByClassName("imctrl").length) {
           dom.getElementsByClassName("imctrl")[0].addEventListener("mousedown", function(e){
               e.stopPropagation();
           },false);
       }
       //记录坐标位置，drag-start  end
       
   }
   //此函数用于操作系统窗口
   fwkit.win = function(command,params) {
       //window.innerHeight
       //window.screenX
       if(!fwkit.main.isKit && (command.substring(0,4) !== 'open' &&command!='active')){//hack open
           return false;
       }
       params = params || {}
       switch (command) {
           case "max"://最大化
               window.exc_cmd("maximize");
               break;
           case "min"://最小化
               window.exc_cmd("minimize");
               // if (fwkit.main.isMain){
                   // fwkit.taskbar("hide");
               // }
               break;
           case "active":
               if (fwkit.main.isKit){
                   window.exc_cmd("active");
               }else{
                   window.focus();
               }
               break;
           case "restore"://恢复窗口
               window.exc_cmd("restore");
               break;
           case "open"://新窗口,
               //params
               //1.判断是否打开,不需要判断是否打开了，直接window.open 用target来判断
               return window.open(params.url,(params.target||""),params.params);
               //2.打开后,active
               break;
           case "openDialog"://打开新单人会话窗口
               if (fwkit.winsApp.isActive(params)){
                   var win = fwkit.winsApp.getWin(params);
                   if (win && !win.closed){
                       win.fwkit("active");
                       return ;
                   }
               }    
               return fwkit("open",{url: location.pathname + '#/hi-solo!fid=' + params,"target":"hi-solo-"+params,"params":NEW_WINDOW_SETTING})
               break;
           case "openMulti":
               if (fwkit.winsApp.isActive(params)){
                   var win = fwkit.winsApp.getWin(params);
                   if (win && !win.closed){
                       win.fwkit("active");
                       return;
                   }
               }
               return  fwkit("open",{url: location.pathname + '#/hi-discussion!multiId='+ params,"target":"hi-multi-"+params, "params": NEW_WINDOW_SETTING}); //打开多人会话
               break;
           case "openGroup":
               if (fwkit.winsApp.isActive(params)){
                   var win = fwkit.winsApp.getWin(params);
                   if (win && !win.closed){
                       win.fwkit("active");
                       return ;
                   }
               }
               return fwkit("open",{url:location.pathname + '#/hi-group!gid='+ params,"target":"hi-group-"+params, "params": NEW_WINDOW_SETTING}); //打开群组会话
               break;
           case "openHistory"://打开新会话历史纪录,不传params代表查看全部
               if (typeof params == 'object' && params.did) {
                   return window.fwkit("open",{url: location.pathname + '#/hi-history!did=' + params.did + '&type=' + params.type,
                   "target":"hi-history","params":NEW_WINDOW_SETTING_L});
               }else{
                   return window.fwkit("open",{url: location.pathname + '#/hi-history',"target":"hi-history","params":NEW_WINDOW_SETTING_L});
               }
               break;
           case 'openAddFriend':
               return window.fwkit("open",{url: location.pathname + '#/hi-addFriend',
                   "target":"hi-addFriend","params":NEW_WINDOW_SETTING_S});
               break;
           case "close"://关闭窗口
               // if (fwkit.main.isKit) {
//                    
                   // window.exc_cmd("superclose");
               // }else{
                   // window.close();
               // }
               if ( fwkit.main.isMain ){
                   //最小化
                   fwkit("min")
                }else{//关闭
                   window.close();
                }
               break;
           case "winSize":
               window.exc_cmd("setMinSize;width:"+(params.x||0)+";height:"+(params.y||0)+";");
               break;
           case "resize":
               if (typeof params === 'object')
                   window.resizeTo(params.x,params.y);
               break;
       }
   }
   var noti_key = function(params){
       var key;
       if (params.type == 1) {
           key = "solo#"+params.from;
       }else if (params.type == 2) {
           key = "group#"+params.to;
       }else if (params.type==='sys'){
           key = "sys#"+params.smr_id;
       }
       return key
   }
   var noti_instance = function(params){
       var key = noti_key(params);
       return notifications[key] || false;
   }
   fwkit.noti_close = function(type,id){
       if (type === "all"){
           for(var name in notifications){
               notifications[name] && notifications[name].close();
           }
           return true;
       }
       var key = type+"#"+id
       if (notifications[key]) {
           notifications[key].close();
           delete notifications[key];
           return true;
       }else{
           return false;
       }
       // return notifications[key] || false;
   };
   var noti_set = function(params,result){
       var key = noti_key(params);
       if (result === null){
           delete notifications[key];
       }else{
           notifications[key]  = result;
       }
       return result;
   }
   fwkit.all_noti = function(){
       return notifications;
   }
   //此函数用于显示底栏的通知,返回可供操作的noti小窗口
   fwkit.noti = function(params,callback,onclose,onshow){
       //把params转化为url格式
       //count,from,msgBody,type,smr_id
       if (!fwkit.noti_show) return ;//关闭了桌面通知
       var result ;//result
       //1. 设定唯一标识的管理key，在notifications[key]中管理
       var instance = noti_instance(params);
       if(instance && (params.keepShow || (params.count == instance.isShowed))){
           //不打扰，keepShow的都是不变的,用于给用户处理的系统消息
           return false;
       }
       var key = noti_key(params);
       
       var paramarr = [];
       for (var name in params) {
           paramarr.push( name+"="+encodeURIComponent(params[name]) );
       }
       result = window.webkitNotifications.createHTMLNotification("/noti.html?"+paramarr.join("&"));
       result.isShowed = 0;//这是设置pendding状态
       
       result.params = params;//防止被覆盖
       
       result.addEventListener("show",function(){
           if (!this.params.keepShow){
               setTimeout(function(){result.close();},20000);
           }
           
           this.isShowed = this.params.count||1;//更新pendding状态
           noti_set(this.params,this);//显示的时候也要更新
           //这里要更新状态messagenotify的status
           onshow && onshow();
       });
       result.addEventListener("click",function(){
           callback && callback();
           if (!this.params.keepShow){
               this.close();
           }
       });
       result.addEventListener("close", function(){
           if (this.isShowed) {//已经显示了，就要删除，否则保留
               delete this;
           }
       });
       if (instance){//关闭类型1：已经存在的，先把别人关闭
           
           instance.cancel();
           noti_set(params,null);
           // delete instance;
       }else{//关闭类型2：已经自动关闭/手动关闭的，直接打开
           console.log("open type ==2 just open")
           // result.show();
       }
       if (notifications_timer[key])clearTimeout(notifications_timer[key]);
       notifications_timer[key] = setTimeout(function(){
           result.show();
       },50);
       onclose && result.addEventListener("close",onclose);
       noti_set(params,result);
       
       return true;
   }
   var activeEvents = [];
   function addEventListenerAndTrack( element, eventName, func ) {
       activeEvents.push( [ element, eventName ] );
       element.addEventListener( eventName, func, false );
   }
   //截图
   fwkit.snap = function(callback){
       //1.先移除其他的绑定
       window.removeEventListener("screensnap");
       //2.进入截图环节
       window.exc_cmd("screensnap");
       fwkit.snapping = true;
       //3.绑定截图后的事件
       window.addEventListener("screensnap",function(){
           fwkit.snapping = false;
           if (window.Screensnapdata){
               callback(window.Screensnapdata);
           }
       },false);
   }
   
   fwkit.updateNotiCnt = function(count){
       if (noticount == count) return;
       count = parseInt(count);
       if (count > 0) {
           if (fwkit.main.isMac){
               window.setBadgeLabel(count);
           }else{
               // fwkit.systray("flash");//在sys_init种控制是否闪动
           }
           if (noticount === 0){
               sys_init("/hi1.ico");
           }
       }else{
           if (fwkit.main.isMac){
               window.removeBadgeLabel();
           }else{
               // fwkit.systray("noflash");
           }
           sys_init("/fav.ico");
           //清空点击事件
           
       }
       noticount = count;
       
   }
   
   //加两个默认的点击事件
   //fwkit.systray.click 此函数可覆盖，覆盖为想要的函数
   fwkit.winsApp = function(){
        
        var winshandle = {};
        
        var getwins = function(){
            return JSON.parse(localStorage.getItem('wins'));
        }

        var setwins = function(wins){
            localStorage.setItem('wins', JSON.stringify(wins));
        }

        var init = function(){
            setwins([]);
        }

        var add = function(wid,source){
            var wins = getwins();
            wins.push(wid);
            setwins(wins);
            
            if (typeof source != 'undefined') {
                winshandle[wid] = source;
            }
        }

        var remove = function(wid){
            var wins = getwins();
            wins.splice(wins.indexOf(wid),1);
            setwins(wins);
            
            if (typeof winshandle[wid] != 'undefined') {
                delete winshandle[wid];
            }
        }

        var isActive = function(wid){
            return (typeof winshandle[wid] !== 'undefined');
            // return getwins().indexOf(wid) > -1;
        }
        
        var getWin = function(wid){
            return winshandle[wid];
        }
        var getWins = function(){
            return winshandle;
        }

        var status = function(){
            return getwins();
        }

        return {
            init : init,
            status : status,
            add : add,
            remove : remove,
            getWin : getWin,
            getWins: getWins,
            isActive : isActive
        }
    }();
    
   fwkit.winsStack = [];
   
   
   if(!fwkit.main.isKit){//没有运行在kit下，清除这些function()
       for (var name in fwkit) {
           if (typeof fwkit[name] === 'function' && name !== 'drag' && name !== 'win') {
               (function(arg){
                   fwkit[arg] = function(){
                       console.log("not in kitsuit! fwkit."+arg);
                   }
               })(name)
           }
       }
   }
   return fwkit;
}();



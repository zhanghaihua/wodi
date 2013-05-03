var fw = require(__dirname + '/../src/newPkg.js')();
var crypto = require('crypto');
var dbHandler = fw.getDbHandler();
var getDb = dbHandler.getDbCollectionHandler;
var ObjectId = dbHandler.ObjectId;
var accountCounter = 0;
var accountCountSync = 0;
//var IM_SERVER_INFO = {port: 8863, host: '10.23.248.83'};
//var IM_SERVER_INFO = {port: 1863, host: '220.181.5.70'};
var IM_SERVER_INFO = {port: 1863, host: 's.n.shifen.com'};
var IM_SAFE_TIME = 2;

var Enable_Invitation = false;        //default true
var Enable_GetPassportToken = true;  // default true

var passportBaidu = require('./driver/passport.js');
var IMProtocols = require('./driver/IMProtocol.js');
var IMConnHandler = require('./driver/IMAdap.js');

var PCONST = IMProtocols.PCONST;
var CONSTANTS = IMProtocols.CONSTANTS;

/**
 * 记录已登陆的IM帐号对像,并以clientId为key.
 * {
 *      clientId1:{
 *          imid:'',
 *          clients:[]                              // 登陆的client　id,当最后一个client退出时，IMConnection 做logout处理并依剧此数组的记录对clientToIm进行清理
 *          _isLogin : true|false,                  // 当前是否登陆
 *          _imUserINfo : {any}                     // 如果已登陆,记录iminfo
 *          IMConnHandler : IMConnHandler,          // HiServer连接对像所使用的包处理对像.
 *      },
 *      ......
 * }
 */
var IM_ACTIVE_POOL = {};
/**
 * 映射client与im_active_pool的关系
 * 
 * 由于在checkAndKeepAlive时没有办法取得password所以无法重新记算sha值.
 * 在不遍历整个im_active_pool的情况下无法取得连接对像，所以另外使用一个对像来记录 clientid 与 im 的登陆应射关系.
 * 在用户登陆时创建和改变关系，在登出时才进行清理
 */
var clientToIm = {};
var is_Init = false;

var clear_clientToIM = function(connKye){
    
    // 被kickout或cutout被执行
    accountCounter --;
    accountCountSync --;
    
    if(!IM_ACTIVE_POOL[connKye]){
        return;
    }
      
    IM_ACTIVE_POOL[connKye].clients.forEach(function(item){
        delete clientToIm[item];
     });
     try{
         // 尝试退出并关闭连接
         IM_ACTIVE_POOL[connKye].IMConnHandler.logout();
     }catch(e){
         //console.error(e);
     }
     
     delete IM_ACTIVE_POOL[connKye];
};

var getImHandleByClientId = function(clientid){
    var connKey;
    if(clientid && (connKey = clientToIm[clientid])){
        return IM_ACTIVE_POOL[connKey];
    }else{
        return null;
    }
};

/**
 * simple aop.
 */
var makeProxy = function(obj,name,beforeHandle,afterHandle){
    var base = obj[name] , proxy;
    if(base instanceof Function){
        proxy = function(){
            var arr = arguments;
            
            if(beforeHandle){
                arr = beforeHandle.apply(this,arguments) || arguments;
            }
            var rv = base.apply(this,arr);
            if(afterHandle){
                Array.prototype.push.call(arr,rv);
                afterHandle.apply(this,arr);
            };
        };
        obj[name] = proxy;
        proxy.revert = function(){
            obj[name] = base;
        };
    }else{
        // 不是方法,不处理.
        return;
    } 
};

//=========================

var msg = fw.netMessage;

/**
 * 利用netMessage的localMessage
 * 增加im控制消息处理.
 */
msg.setReceiver({
    onLocalMessage:{
        target:'Client_Disconnection',
        handle:function(data){
            
            console.log('INFO : receive client disconnection : ' + data.clientId);
            
            var connKey = clientToIm[data.clientId] , im;
            // 如果没找到connKey，则证明未登陆
            if(connKey){
                im = IM_ACTIVE_POOL[connKey];
                
                if(im){
                    var p = im.clients.indexOf(data.clientId);
                    if(p != -1){
                        im.clients.splice(p,1);
                    }
                    try{
                        // 如果引用记数已清零，有连接对像并且已登陆,则进行登出处理
                        if(im.clients.length == 0  && im.IMConnHandler){
                            
                                // 正常退出时
                                accountCounter --;
                                accountCountSync --;
                            
                                im.IMConnHandler.logout();
                                IM_ACTIVE_POOL[connKey] = null;
                                delete IM_ACTIVE_POOL[connKey];
                        }
                    }catch(e){
                        console.error(e);
                    }
                }
                
                delete clientToIm[data.clientId];
                
            }
            
            if(data.__cb instanceof Function){
                data.__cb('ok');
            }
        }
    }
});

/**
 * 利用netMessage的localMessage
 * 增加im发送消息处理.
 */
msg.setReceiver({
    onLocalMessage:{
        target:'HI_MESSAGE_SENDING_OUT',
        handle:function(data){
            console.log('INFO : receive HI_MESSAGE_SENDING_OUT : FROM ' + data.from + ", TO:" + data.to + ", TYPE: " + data.type );
            //debugger;
            var im_handle = null;
            if(im_handle = getImHandleByClientId(data.clientId)){
                im_handle = im_handle.IMConnHandler;
                im_handle.sendMsgRequest(data);
                if(data.__cb instanceof Function){
                    data.__cb('ok');
                }
            }else{
                console.log("INFO : lost im handle. may be the account was logout. [HI_MESSAGE_SENDING_OUT] ");
            };
        }
    }
});

msg.setReceiver({
    onLocalMessage:{
        target:'HI_SERVER_KICKOUT',
        handle:function(data){
            
            console.log('INFO : receive HI_SERVER_KICKOUT : ' + JSON.stringify(data));
            
            if(IM_ACTIVE_POOL[data.connKey]){
                //debugger;
                var clients = IM_ACTIVE_POOL[data.connKey].clients || [];
                fw.clientTracer.SendGlobalMessageByClientId("HI_SERVER_KICK_OUT",'HI_SERVER_MSG',clients);
                clear_clientToIM(data.connKey);
            }else{
                console.log("INFO : can not find the client list. may be the account was logout. [HI_SERVER_KICKOUT]");
            }
        }
    }
});

msg.setReceiver({
    onLocalMessage:{
        target:'HI_SERVER_CUTOFF',
        handle:function(data){
            
            console.log('INFO : receive HI_SERVER_CUTOFF : ' + JSON.stringify(data));
            
            if(IM_ACTIVE_POOL[data.connKey]){
                //debugger;
                var clients = IM_ACTIVE_POOL[data.connKey].clients || [];
                fw.clientTracer.SendGlobalMessageByClientId("HI_SERVER_CUTOFF",'HI_SERVER_MSG',clients);
                clear_clientToIM(data.connKey);
            }else{
                console.log("INFO : can not find the client list. may be the account was logout. [HI_SERVER_CUTOFF]");
            }
        }
    }
});

require(__dirname  + '/tapAdapCmd.js')(fw, getImHandleByClientId);

var sendLogin = function(clientId,account,pwd,errUserinfo,userInfo,cb){
    // 计算sha1做为key
    var sha1 = crypto.createHash('sha1');
    sha1.update(account);
    sha1.update(pwd);
    var connKey = sha1.digest('hex');
    var oldConnKey = clientToIm[clientId];
    var active_im = null;
    
    // 根据上次使用的的connKey找出连接对像,如果没有，则说明是第一次尝试登陆或已登出重新登陆
    if(oldConnKey){
        active_im = IM_ACTIVE_POOL[oldConnKey];
        
        // 如果使用旧的key找到了连接对像，并且旧key不等于新key，则证明更换了用户名和密码重试登陆
        if(active_im && oldConnKey != connKey){
            //如果当前的登陆帐号为true，但是更换了用户名密码，则认为是更换帐号。
            if(active_im._isLogin){
                // FIXME 需检测是否需要登出已登陆的帐号,如果不需要登出，则置空active_im，下文中将自动创建新的连接对像;
                active_im = null;
            }else{
                // 更换connKey为新帐号生成的key
                IM_ACTIVE_POOL[connKey]  = active_im;
                delete IM_ACTIVE_POOL[oldConnKey];
            }
        }
        
    }else{
        // 如果不存在，则直接使用帐号及密码生成的key进行判断，如果有，则证明是同一个帐号的第二个客户端登陆
        active_im = IM_ACTIVE_POOL[connKey];
    }
    
    /*
     * 如果当前IM_ACTIVE_POOL中不存在该帐号的活动对像，创建一个默认的对像结构并准备登陆
     */
    if(!active_im){
        // set default.
        IM_ACTIVE_POOL[connKey] = active_im = {
            _isLogin:false,
            clients:[clientId],
            imid:null,
            IMConnHandler:null
        };
    }
    
    // 记录应射关系.在用户名与密码正确的情况下才能找到正确的应射关系，否则将使用一个错误的关系
    clientToIm[clientId] = connKey; 
    
    
    // 已登陆连接检查.
    if(active_im._isLogin == true && active_im.imid !== null){
        /*
         * 如果已登陆,则直接返回,不再重新尝试登陆,
         * 如果是新插入IM_ACTIVE_POOL的对像，无法进入这个处理，此处正常情况下仅应处理多点登陆所产生的请求
         */
        //console.log("\n\n repeated login.... \n\n");
        if(active_im.clients.indexOf(clientId) == -1){
            // 将当前clientId插入数组，做为引用记数.
            active_im.clients.push(clientId);
        }
        cb(null,active_im._imUserInfo);
        return;
    }
    
    var handle;
    /**
     * 在没有尝试登陆过的情况下,才创建ConnHandler对像
     */
    if(!active_im.IMConnHandler){
        handle = active_im.IMConnHandler = new IMConnHandler(userInfo,connKey);
        handle.setLoginStatus(userInfo.status);
        /**
         * number :
         *      0 数据不能正常返回,
         *      1 需要验证码,
         *      2 登陆失败,
         *      3 登陆成功,
         *      4 初始化同步数据完成
         *      10 被kickout
         */
        var loginCallback = function(number){
            debugger;
            switch(number){
                case 0:
                    console.log("fail, server error " , account);
                    cb(2,errUserinfo);
                    clear_clientToIM(connKey);
                    break;
                case 1:
                    console.log("fail, need vcode " , account);
                    var verifyInfo = arguments[1];
                    active_im._login_needVcode = true;
                    cb(5,fw.utils.cpp(errUserinfo,{v_url:verifyInfo.v_url}));
                    break;
                case 2:
                    console.log("fail, account error " , account);
                    cb(2,errUserinfo);
                    break;
                case 3:
                    var successUserInfo = arguments[1];
                    
                    // 记录imid与登陆信息,在刷新页面时将直接返回记录的userInfo.
                    active_im.imid = successUserInfo.imid;
                   active_im._imUserInfo = {
                            imid:successUserInfo.imid,
                            firstuse:successUserInfo.firstuse,
                            baiduer:successUserInfo.baiduer,
                            baiduer_info:successUserInfo.baiduer_info,
                            visible_ip:successUserInfo.visible_ip,
                            debug_inner_ip:successUserInfo.debug_inner_ip,
                            userName:account,
                            v_url:'',
                            ack_code:""
                    }; 
                    accountCounter++;
                    console.log('login ok', account , accountCounter);
                    handle.syncUserData();
                    
                    break;
                case 4 :
                        active_im._isLogin = true;
                        
                        // 查询离线消息, type:0,1,2分别为，单人，群，多人
                        handle.getOfflineMsg(0,0,0);
                        handle.getOfflineMsg(1,0,0);
                        handle.getOfflineMsg(2,0,0);
                        
                        var successUserInfo = handle.m_params;
                        var successAccount = successUserInfo.account,
                            successPwd = successUserInfo.password,
                            vcodeObj = {vcodestr:null,verifycode:null};
                        
                        if(false){
                            vcodeObj.vcodestr = null;
                            vcodeObj.verifycode = null;
                        }
                        
                        if(Enable_GetPassportToken){
                            debugger;
                            passportBaidu.passportLogin(successAccount,successPwd,vcodeObj,function(error,info){
                                
                                //debugger;
                                if(error){
                                    console.log('failed, passport token ', error);
                                    cb(2,errUserinfo);
                                    return;
                                }
                                
                                active_im._imUserInfo.bduss = info.bduss;
                                active_im._imUserInfo.stoken = info.stoken;
                                cb(null,active_im._imUserInfo);
                            });
                        }else{
                            active_im._imUserInfo.bduss = "";
                            active_im._imUserInfo.stoken = "";
                            cb(null,active_im._imUserInfo);
                        }
                        accountCountSync++;
                    break;
                case 10 :
                    // 变更登陆的记录状态,在下次用户有操作时,做checkAndKeepAlive时将做登出处理.
                    // FIXME 现在的框架没有登出的通知逻辑.
                    console.log("fail, logout or socket disconnection " , account);
                    cb(2,errUserinfo);
                    active_im._isLogin = false;
                    return;
            }
        };
        handle.setServerInfo(IM_SERVER_INFO);
        handle.login(loginCallback);

    }else if(active_im._login_needVcode == true){
        // 大于重试次数,从前端取得验证码
        handle = active_im.IMConnHandler;
        handle.setLoginStatus(userInfo.status);
        handle.setUserInfo(userInfo);
        handle.setVCode(userInfo.v_code || "");
        handle.login();
    }else{
        // 普通重试
        handle = active_im.IMConnHandler;
        handle.setLoginStatus(userInfo.status);
        handle.setUserInfo(userInfo);
        handle.login();
    }
};


module.exports = function(){
   
    return {
        /**
         * 用于检测是否是正确的登陆状态,并通知远端，用户持续活动中.　部份情况下，在远端不需要保持会话时，该方法可以不实现或伪实现.
         * 
         * @param userInfo {Object} 
         *      登陆后，形成的authModel对像，包含当前登陆的一些用户信息.
         * @param cb {function}
         *      检测完成后执行的回调函数,cb(err,userInfo);err为null表示检测成功
         *      
         *      err : 'LOGIN_TIMEOUT'   超时
         *      err : 'LOGOUT'          退出
         *      err : 'UNKNOW'          未知
         *      
         * @returns
         */
        checkAndKeepAlive:function(userInfo,timeGap,cb){
            //console.log('INFO 3rd PA checkAndKeepAlive : '+ JSON.stringify(userInfo) + " : " + timeGap);
            var connKey = clientToIm[userInfo.clientId] , active_im;
            // 如果没找到connKey，则证明未登陆
            if(!connKey){
                cb('no Login',userInfo);
                return;
            }
            
            active_im = IM_ACTIVE_POOL[connKey];
            
            if(active_im._isLogin == true && active_im.imid !== null){
                cb(null,userInfo);
            }else{
                cb('no Login',userInfo);
            }
        },
        /**
         * 用于验证登陆
         * @param clientId {String}
         *  当前客户端唯一ID.除非清空cookie 否则不变化.做为短期用户追踪依据
         * @param account　{stirng}
         *  帐号名称
         * @param pwd {string}
         *  密码
         * @param argstr {string}
         * 　其它参数，jsonstr或其它格式，由前端传入，原样传入至此
         * @param cb
         *  登陆成功或失败后的回调方法.
         *  cb(err,     // 如查登陆不成功，则返回消息，否则置为null
         *     {}       // userInfo
         *  );
         * @returns
         */
        login:function(clientId,account,pwd,argstr,cb){
            console.log('INFO : 3rd PA login  : '+ JSON.stringify({account:account,pwd:"****",argstr:argstr}));
            var userInfo = {account:account, password:pwd};
            var errUserinfo = {
                    imid:'',
                    firstuse:false,
                    userName:account,
                    v_url:'',
                    ack_code:""
            };
            var args = argstr.split("&");
            args.forEach(function(str){
                var parts = str.split('=');
                if(parts[0] && parts[0] !=='account' && parts[0] !== 'password'){
                    userInfo[parts[0]] = parts[1];
                }
            });
            
            var iCode = userInfo['icode'];
            
            if(!Enable_Invitation){
                sendLogin(clientId,account,pwd,errUserinfo,userInfo,cb);
                return;
            }
            
            getDb('hiInvitationCode',function(err,collection){
                debugger;
                if(iCode){
                    collection.findOne({code:iCode},{},function(err,item){
                        
                        debugger;
                        if(item && item.bindBaiduId == ''){
                            // 邀请码存在并且未被绑定ID,则绑定帐号
                            item.bindBaiduId = account;
                            collection.save(item);
                            sendLogin(clientId,account,pwd,errUserinfo,userInfo,cb);
                        }else{
                            // 邀请码无效
                            cb(101,errUserinfo);
                        }
                    });
                }else{
                    // 未添写
                    collection.findOne({bindBaiduId:account},{},function(err,item){
                        if(!item){
                            // 未被邀请
                            cb(100,errUserinfo);
                        }else{
                            debugger;
                            sendLogin(clientId,account,pwd,errUserinfo,userInfo,cb);
                        }
                    });
                }
            });
            
        },
        /**
         * 用于登出通知
         * @param userInfo {Object}
         *      在登陆时传出的userInfo对像
         * @param cb
         *      回调函数.仅做通知，无论远端是否成功，在本地都已做登出处理.
         * @returns
         */
        logout:function(userInfo,cb){
            console.log('INFO : 3rd PA logout  : '+ JSON.stringify(userInfo));
            cb();
        }
    };
};

setInterval(function(){
    console.log("account login:" + accountCounter , "active success:" + accountCountSync);
}, 10*1000);

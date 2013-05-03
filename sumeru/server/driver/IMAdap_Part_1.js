var fw = require(__dirname + '/../../src/newPkg.js')();
var ImageLoader = require(__dirname + '/ImageLoader.js');
var htmlEncoder = require('node-html-encoder').Encoder;
var Queue = require(__dirname + '/../Queue.js').Queue;
var DelayedAction = require(__dirname + '/../Queue.js').DelayedAction;
var fs = require('fs');

var dbHandler = fw.getDbHandler();
var getDb = dbHandler.getDbCollectionHandler;
var ObjectId = dbHandler.ObjectId;
var msg = fw.netMessage;

var DOMParser = require('xmldom').DOMParser;
var IMProtocols = require('./IMProtocol.js');
var IMStreamReader = require('./IMProtocolStreamReader.js');
var OfflineMsg = IMProtocols.OfflineMsg;
var BOStream = IMStreamReader.BOStream; 
var BIStream = IMStreamReader.BIStream;
var IMPacket = IMProtocols.IMPacket;
var PCONST = IMProtocols.PCONST;
var CONSTANTS = IMProtocols.CONSTANTS;
var PTYPE = IMProtocols.PTYPE;

var IMUtils = require('./IMUtils.js');

var baseDir = process.dstDir;
var rootDir = process.baseDir;

if(process.BAE)
    baseDir += '/static';

var headDir = baseDir + "/hiUpload/head/";
var cfaceDir = baseDir + "/hiUpload/cface/";


console.log('INIT : Loaded "IMAdap_Part_1" ');
var sourceDir = "";

if(process.BAE){
    sourceDir = rootDir + '/app/hiUpload/head/';
    fs.readdir(sourceDir,function(err,flist){
        var src,dst,fname,extName = /.+\.(jpg|png|gif|bmp)/i;
        if(flist.length != 0){
            for(var i in flist){
                fname = flist[i];
                if(extName.test(fname)){
                    src = sourceDir + fname;
                    dst = headDir + fname;
                    
                    if(!fs.existsSync(dst)){
                        fs.writeFileSync(dst,fs.readFileSync(src));
                    }
                }else{
                    console.log('out of rules',fname);
                }
            }
        }
    });
}


//==========================================
//       <<START>>, PACKET STRING BODY TPL
//==========================================

// 查询用户自己的一般信息.
var TPL_USER_QUERY = '<query fields="nickname;personal_comment;head;name;info_open_level;'
                   + 'frequency_sort;friendly_level;phone;visible;tmsg_policy;email;email_fixed;'
                   + 'sex;birthday;personal_desc;psp_msg_count;vitality;wealth;sns_visible;account_type;'
                   + 'push_iknow_answer_switch;push_iknow_question_switch;push_iknow_setbestanswer_switch;'
                   + 'push_baike_goodeditor_switch;push_space_addfriend_switch;push_space_leavemessage_switch;'
                   + 'push_space_blogremark_switch;personal_comment_bind_itieba_switch;push_iknow_class1_ask_switch;'
                   + 'push_iknow_class2_promotion_switch;push_iknow_class3_team_switch;push_iknow_class4_personal_switch;'
                   + 'push_app_switch"/>';
var TPL_USER_QUERY_BAIDUID = '<query fields="baiduid;key"/>';

/* 
 * 查询联系人信息
 * $id_list$:   联系人的imid，以(;)间隔 
 * $timestamp$: 当前联系人信息的时间戳,以(;)间隔,
 *              顺序需与imid一至.0表示本地无数据
 */
var TPL_CONTACT_QUERY = '<query fields="baiduid;status;personal_comment;nickname;head;friendly_level;name;birthday;personal_desc;info_open_level;email;sex" id="$id_list$" timestamp="$timestamp$"/>';
var TPL_CONTACT_QUERY_ONLINE_STATUS = '<query fields="baiduid;status" id="$id_list$"/>';


/*
 * 群系统消息通知
 */
//var TPL_GROUP_NOTIFY = '<group gid="$gid$" fields_name="$fields_value$" />';
//var TPL_JOINGROUP_NOTIFY = '<join_notify time="$time$" gid="$gid$" application="$uid_t$" req_seq_id="$req_seq_id$" />';
//var TPL_JOINGROUPACK_NOTIFY = '<join_ack_notify auto="$auto$" time="$time$" gid="$gid$" application="$uid_t$" agree="$agree$" />';
//var TPL_TRANSFERGROUP_NOTIFY = '<transfer_notify  gid="$gid$" req_seq_id="$req_seq_id$" />';
//var TPL_GROUPINFO_NOTIFY = '<group gid="$gid$ reload="1" />';

//==========================================
//<<END>>, PACKET STRING BODY TPL
//==========================================

var getDocument = IMUtils.getDocument;
var copyAttributesToMap = IMUtils.copyAttributesToMap;
var getList = IMUtils.getList;
var getMap = IMUtils.getMap;
var stringJoin = IMUtils.stringJoin;
var replaceParams = IMUtils.replaceParams;
var getColor = IMUtils.getColor;
var colorToUint32 = IMUtils.colorToUint32;

//var hiMessageNotifyCount = 0;
//var hiMessageNotifyFindCount = 0;
//var hiMessageCount = 0;

//=========================================
//  Global Operation
//=========================================

// 保存联系人变更时间间隔, 100秒
var INTERVAL_TO_SAVE_CONTACT = 1000 * 10;

var contactNotifyQueue = new Queue();

/**
 * 对比两个contactNotify的内容是否一样，用于queue的去重操作
 * @param a {Array}
 * @param b {Array}
 * @returns {Boolean}
 */
var isSameContactNotify = function(a,b){
    
    // 如果imid不相同，则认为不相同,大部份情况下都由此返回false
    if(a[0] != b[0]){
        return false;
    }
    
    /*
     * 以下若找到相同的选项，所以可以将a的值合并入b的值中并最终返回true，
     * 在合并时，若a中的某个值在b中也存在，则以b中的值为准.
     * 因为queue的filter中总是保留更后面的那一个
     * 
     */ 
    
    // 对比并合并第二个参数，值为一个map结构
    var mapA = a[1], mapB = b[1];
    
    for(var key in mapA){
        mapB[key] = mapB[key] || mapA[key];
    }
    
    return true;
};


// 在合并保存之前，先进行去重
contactNotifyQueue.setBeforeFire(function(){
    contactNotifyQueue.filter(isSameContactNotify);
});


// 合并将保存的对像.
contactNotifyQueue.setInterval(function(imid,values){
    getDb('hiContacts',function(err,collection){
        
        var status = values.status && values.status.split(';');
        // 拆分状态及状态描述
        if(status){
            values.status = parseInt(status[0]);
            values.statusMsg = status[1];
        }
        //console.log("contact : notify : ");
        //console.dir(Object.keys(values));
        collection.update({imid:imid},{$set:values},function(){
            console.log("INFO:Contact Notify:" + imid);
        });
    });
},INTERVAL_TO_SAVE_CONTACT);

contactNotifyQueue.setAfterFire(function(){
    msg.sendLocalMessage({modelName:"hiContacts"},'trigger_push');
});

//========================================


//=================
module.exports = {
        __constructor:function(){
            
            var sendAckDone = function(packet){
                if(packet.m_mapParams.code != 200){
                    console.error('ERR : send ack err' + packet.m_mapParams.code);
                }
                //console.log("ack send done.");
            };
            
            this.ackDelayedAction = new DelayedAction();
            this.msgDelayedAction = new DelayedAction();
            
            var resendMsg = function(data,count){
                //debugger;
                this.sendMsgRequest(data, ++count);
            };
            
            /**
             * FIXME 发送ＡＣＫ
             * 发送ack的，每个toid为key，ids为将发送的消息时间戳.
             * ids为一个数组，创建会话后在将会，只需要将消息的timestamp放入数组即可.
             */
            var sendAck = function(toId,ids){
                //debugger;
                var ackIdStr = '<ack id="';
                var packet = new IMPacket();
                packet.m_strCommand = 'msg';
                packet.m_strVersion = '1.1';
                packet.m_eType = PTYPE.REQ;
                packet.m_mapParams['method'] = 'msg_ack';
                packet.m_mapParams['uid'] = this._imid;
                packet.m_mapParams['type'] = 1;
                packet.m_mapParams['from'] = this._imid;
                packet.m_mapParams['to'] = toId;
                packet.m_mapParams['from_sub'] = 0;
                packet.m_mapParams['to_sub'] = 0;
                
                ackIdStr += ids.join('"/><ack id="');
                ackIdStr += '"/>';
                
                packet.m_strBody = "<acks>" + ackIdStr + "</acks>";
                
                packet.m_ackCallback = sendAckDone;
                if(this.m_Conn){
                    // send
                    this.m_Conn.sendPacket(packet);
                }else{
                    this.ackDelayedAction.clearAll();
                }
            };
            
            this.ackDelayedAction.setAction(sendAck.bind(this));
            this.msgDelayedAction.setAction(resendMsg.bind(this));
        },
        baseDir : baseDir,
        headDir : headDir,
        cfaceDir : cfaceDir,
        onHeartbeatHeartbeat:function(){
            // do nothing....
        },
        setUserInfo:function(userInfo){
            if(this.m_params){
                for(var key in userInfo){
                    this.m_params[key] = userInfo[key]; 
                }
            }else{
                this.m_params = userInfo;
            }
        },
        setServerInfo:function(_ServInfo){
            this._serverInfo = {};
            for(var key in _ServInfo){
                this._serverInfo[key] = _ServInfo[key];
            }
        },
        setVCode : function(v_code){
            if(v_code){
                this.verifyInfo.v_code = v_code || "";
            }
        },
        setLoginStatus:function(_status){
            this._loginStatus = _status || null;
        },
        formatUserInfo:function(){
            return {
                userName   : this.m_params.account, 
                account    : this.m_params.account, 
                password   : this.m_params.password, 
                version    : CONSTANTS.IM_VERSION,
                redirCount : 0
            };
        },
        onSecurityVerify:function(packet){
            
            this.__needVerifyCode = false;
            
            // 如果验证码不能正确返回
            //debugger;
            if(packet.m_mapParams.code != 200){
                this.__loginCallback(0,null);
                packet.dump("=========");
                return;
            }
            
            if (packet.m_strBody.length > 0) {
                // Parse xml format packet body
                var root = getDocument(packet);
                var verifyInfo = this.verifyInfo = {};
                
                for (var i = 0; i < root.attributes.length; i++) {
                    var attr = root.attributes[i];
                    verifyInfo[attr.nodeName] = attr.nodeValue;
                };
                
                this.verifyInfo = verifyInfo;
                
                if(!verifyInfo.v_code){
                    this.__needVerifyCode = true;
                    // 回调，　需要手动输入验证码
                    this.__loginCallback(1,{v_url:verifyInfo.v_url});
                }else{
                    this.m_Conn.login(verifyInfo,this.formatUserInfo());
                }
                
                //return verifyInfo;
            }
        },
        /**
         * loginCallback(codenumber,params...);
         *   codenumber :
         *      0 数据不能正常返回,
         *      1 需要验证码,
         *      2 登陆失败,
         *      3 登陆成功
         *      4 初始化同步数据完成
         *      10 被kickout
         * @param loginCallback
         */
        login:function(loginCallback){
            var conn = null;
            if(this._serverInfo && this.m_params.account && this.m_params.password){
                this.__loginCallback = this.__loginCallback || loginCallback;
                
                if(!this.__loginCallback){
                    // 丢失callback，则不能继续处理;
                    throw 'missing callback';
                }
                
                // 在登陆失败的情况下，连接不能复用，将被清除.对于错误的用户名和密码重试的情况下，将走新建连接的过程;
                
                if(!(conn = this.m_Conn)){
                    // 如果是新建立的连接，则使用connect进行初次登陆.
                    
                    conn = new IMProtocols.IMConnection(this);
                    conn.connect(this._serverInfo);
                }else if(this.__needVerifyCode == true){
                    // 如果不是初次建立的连接，那么首先判断是否需要验证码进行登陆，如果是,则常试获以获取到的验证码登陆.
                    
                    if(!this.verifyInfo.v_code){
                        // 如果没有验证码，则仍然callback 1,　需要手动输入验证码
                        this.__loginCallback(1,{v_url:this.verifyInfo.v_url});
                    }else{
                        // 重新尝试登陆
                        this.m_Conn.login(this.verifyInfo,this.formatUserInfo());
                    }
                }else{
                    // 如果不是初次连接，也不是需要验证，则认为是多余的调用，不进行处理;
                    return null;
                }
            }
        },
        onLogin:function(packet){
            var retCode = Number(packet.m_mapParams['code']);
            if (retCode == PCONST.IMP_ACK_SUCCESS || retCode == PCONST.IMP_ACK_LOGIN_REDIRECT) {
                // Parse xml format packet body
                var root = getDocument(packet);
                
                var loginInfo = this.m_params;
                
                for (var i = 0; i < root.attributes.length; i++) {
                    var attr = root.attributes[i];
                    loginInfo[attr.nodeName] = attr.nodeValue;
                };
                
                // console.dir(loginInfo);
                
                switch(retCode){
                    case PCONST.IMP_ACK_SUCCESS:
                        // this.m_Conn.loginReady(loginInfo);
                        this._imid = loginInfo.imid;        // 记录imid,
                        this.islogin = true;                // 记录登陆成功,
                        
                        // 登陆成功通知
                        this.__loginCallback(3,loginInfo);
                        
                        break;
                    case PCONST.IMP_ACK_LOGIN_REDIRECT:
                        
                        this.m_Conn.redirect(loginInfo);
                        break;
                }
            } else {
                // 登陆失败，返回失改状态码，并清理连接;
                this.__loginCallback(2,retCode);
                console.log('login failed, disconnection',retCode);
                // 在登陆不成功的情况下, 总是关闭连接.
                this.disconnection();
            };
        },
        syncUserData:function(){
            // 查询用户信息并与本地时间戳对比对数据时行更新;
            this.getUserQueryBaiduId();
            this.timestamp();
        },

        /**
         * 更新好友列表
         */
        updateFriendsList:function(){
            
        },
        /**
         * 更新联系人信息
         */
        updateContacts:function(){
            var me = this;
            var refImid = me._imid;
            getDb('hiFriends',function(err,collection){
                if(err){
                    return null;
                }
                
                collection.find({refImid:refImid},{imid:1}).toArray(function(err,results){
                    var ids = [];
                    
                    results.forEach(function(item){
                        ids.push(item.imid);
                    });
                    
                    me.getContactTimestamp(ids,function(timestampList){
                        me.getContaceQuery(timestampList);
                    });
                    
//                    getDb('hiContacts',function(err,collection){
//                        if(err){
//                            cb(err,null);
//                            return null;
//                        }
//                        collection.find({imid:{$in:ids}},{imid:1,timestamp:1}).toArray(function(err,items){
//                            ids.forEach(function(imid){
//                                var finded = false;
//                                // 查找db中已有的联系人记录，并记录timestamp，然后从filterBy中删除
//                                for(var i = 0 ; i < items.length; i++){
//                                    if(items[i].imid == imid){
//                                        timestampList.push({imid:imid,timestamp:items[i].timestamp});
//                                        finded = items.splice(i,1);
//                                        break;
//                                    };
//                                }
//                                
//                                if(finded === false){
//                                    timestampList.push({imid:imid,timestamp:0});
//                                }
//                            });
//                            
//                            if(timestampList.length == 0){
//                                return;
//                            }
//                            
//                            me.getContaceQuery(timestampList);
//                        });
//                    });
                });
                
            });
        },
        getContactTimestamp:function(ids,cb){
            getDb('hiContacts',function(err,collection){
                
                if(err){
                    cb(err,null);
                    return null;
                }
                
                collection.find({imid:{$in:ids}},{imid:1,timestamp:1}).toArray(function(err,items){
                    var timestampList = [];
                    
                        ids.forEach(function(imid){
                            var finded = false;
                            // 查找db中已有的联系人记录，并记录timestamp，然后从filterBy中删除
                            if(items && items.length > 0){
                                for(var i = 0 ; i < items.length; i++){
                                    if(items[i].imid == imid){
                                        timestampList.push({imid:imid,timestamp:items[i].timestamp});
                                        finded = items.splice(i,1);
                                        break;
                                    };
                                }
                            }
                            
                            if(finded === false){
                                timestampList.push({imid:imid,timestamp:0});
                            }
                        });
                    cb(timestampList);
                });
            });
        },
        /**
         * 通知hiserver登陆成功,
         * status为显示状态,如果不提供,则默认为 STATUS_ONLINEREADY
         * 具体参见 [IMProtocol.js] Client status types
         */
        loginReady:function(status){
            // 如果存在记录的logiInfo则表示登陆成功,否则忽略不发送loginready.
            if(this.islogin){
                this.m_Conn.loginReady(this.m_params,status || this._loginStatus);
                return true;
            }
            return false;
        },
        /**
         * onLoginReady
         *  - Login ready response packet handler
         * @private
         */
        onLoginReady : function(packet){
            var retCode = Number(packet.m_mapParams['code']);
            if (retCode == PCONST.IMP_ACK_SUCCESS) {
                // Login succeed
                console.log('Login succeed!');
                this.__loginCallback(4,true);
                return true;
            } else {
                // Login failed
                console.dir('Login failed!');
                this.__loginCallback(0,true);
                return false;
            };
        },
        logout:function(){
            var me = this.m_Conn;
            if(!me || me.loginout){
                // 防止重复退出
                return;
            }
            try {
                // 退出前所有已接收到消息,但是未发送的ack的发送ack消息
                this.ackDelayedAction.fireAndClearAll();
                // 当主动退出时，也不会再接收到ack，所以直接清理超时重发
                this.msgDelayedAction.clearAll();
            } catch (e) {
                // TODO: handle exception
            }finally{
                this.islogin = false;
                console.log("INFO : logout....\n\n");
                var packet = new IMPacket();
                packet.m_strCommand = 'login ';
                packet.m_strVersion = '1.0';
                packet.m_eType = PTYPE.REQ;
                packet.m_mapParams['method'] = 'logout';
                me.sendPacket(packet);
            }
        },
        onLoginLogout:function(packet){
            this.loginout = true;
            console.log('onLogin:Logout');
            //packet.dump("\n\n================ Logout ========================\n\n");
            this.disconnection();
        },
        onLoginKickout:function(packet){
            console.log("INFO: Kickout..");
            this.__loginCallback(10,true);
            //packet.dump("\n\n================ Kickout ========================\n\n");
            
            // 当被kickout时，没有机会发重发消息，所以直接清理
            this.ackDelayedAction.clearAll();
            this.msgDelayedAction.clearAll();
            
            msg.sendLocalMessage({imid:this._imid,connKey:this.cid},"HI_SERVER_KICKOUT");
            this.disconnection();
            return "kickout";
        },
        disconnection:function(){
            //console.log("disconnection to HI SERVER");
            // 关闭心跳
            clearInterval(this.m_Conn.m_nIntervalId);
            this.m_Conn.m_socket.end();
            // 尝试手动清理，不等待socket.onEnd
            this.m_Conn.onClosed();
            this.m_Conn = null;
        },
        onClosed:function(errMsg){
            // 此处被连接对像调用，
            // 由于经常收不到hi server发出的FIN包，所以调用可能被延迟，所以在其它地方可能已经做了相同的处理
            // 当被kickout时，没有机会发重发消息，所以直接清理
            // console.log('IMAdap_Part_1, onClosed.');
            this.ackDelayedAction.clearAll();
            this.msgDelayedAction.clearAll();
            // 当onClose由到一个msg参数时，则表未连接的关闭由一个错误所引发。
            if(errMsg){
                msg.sendLocalMessage({imid:this._imid,connKey:this.cid},"HI_SERVER_CUTOFF");
            }
        },
        getFriendList:function(page){
            var me = this;
            me.friend_page = page || 0;
            
            var packet = new IMPacket();
            packet.m_strCommand = 'friend';
            packet.m_strVersion = '2.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'get_multi_friend';
            packet.m_mapParams['uid'] = this._imid;
            packet.m_mapParams['page'] = me.friend_page;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        onFriendGetMultiFriend:function(packet){
            var me = this;
            this.getFriendListCache = this.getFriendListCache || [];
            var refImid = this._imid;
            var code = packet.m_mapParams['code'];
            if(code == 210){
                this.getFriendList(this.friend_page + 1);
            };
            
            var root = getDocument(packet) , items , list , i;
            
            if(root){
                // 如果能解析出联系人内容，则加入catch否则直接忽略处理
                items = root.getElementsByTagName('friend');
                this.getFriendListCache = this.getFriendListCache.concat(getList(items));
            }else{
                packet.dump("========= cant find friends =========");
            }
            
            // 所有好友获取完成.
            if(code == 200){
                list = this.getFriendListCache;
                i = list.length;
                
                getDb('hiFriends',function(err,collection){
                    if(err){
                        console.error(err);
                        return;
                    }
                    var keepImid = [];
                    list.forEach(function(item){
                        item.smr_id = ObjectId();
                        item.refImid = refImid;
                        keepImid.push(item.imid);
                        collection.update({refImid:refImid,imid:item.imid},item,{upsert:true},function(){
                            if(--i <= 0 ){
                                // 更新好友列表好，一定更新好友详细信息.
                                me.updateContacts();
                                // 删除不在本次查询返回范围内的删除.即已删除的
                                collection.remove({refImid: refImid ,imid:{$nin:keepImid}}, {w:1},function(err,numberOfRemovedDocs){
                                    //console.log("remove Friend:",numberOfRemovedDocs,err);
                                    msg.sendLocalMessage({modelName:"hiFriends"},'trigger_push');
                                });
                            }
                        });
                    });
                });
            }
        },
        
        timestamp:function(cb){
            var packet = new IMPacket();
            packet.m_strCommand = 'timestamp';
            packet.m_strVersion = '1.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'user';
            packet.m_mapParams['uid'] = this._imid;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        
        onTimestampUser:function(packet){
            var me = this;
            var root = getDocument(packet);
            
            if(!root){
                me.__loginCallback(0,true);
                return;
            }
            
            data = copyAttributesToMap(root);
            var refImid = me._imid;
            // 检测ＤＢ中timestamp
            getDb('hiTimestamp',function(err,collection){
                if(err){
                    me.__loginCallback(0,true);
                    return;
                }
                
                collection.findOne({refImid:refImid},{},function(err,result){
                    var saveTimestamp = false;
                    if(err){
                        this.__loginCallback(0,true);
                        return;
                    }
                    
                    // 登陆查询
                    if(!result || data.friend_get_team != result.friend_get_team){
                        //debugger;
                        me.updateFriendTeams();
                        saveTimestamp = true;
                    }
                    
                    if(!result || data.group_get_list != result.group_get_list){
                        //debugger;
                        me.updateGroup();
                        saveTimestamp = true;
                    }
                    
                    // 更新好友列表及好友信息
                    // 如果好友列表无更新，则可以直接拉取好友信息.否则将由getFriendList的回调发起好友信息更新请求
                    if(!result || data.friend_get_friend != result.friend_get_friend){
                        me.getFriendList();
                        saveTimestamp = true;
                    }else{
                        // 如果好友列表无更新，则可以直接拉取好友信息.
                        me.updateContacts();
                    }
                    
                    
                    if(!result || data.user_query != result.user_query){
                        me.getUserQuery();
                        saveTimestamp = true;
                    }
                    
                    //debugger;
                    // 如果数据库无timestamp记录，则无条件保存当前的timestamp记录
                    // 如果数据库中存在记录，并且saveTimestamp == true则进行update，其它情况下，即认为timestamp未变更
                    if(!result){
                        data.smr_id = ObjectId();
                        data.refImid = refImid;
                        collection.save(data);
                    }else if(result && saveTimestamp == true){
                        collection.update({refImid:refImid},{$set:data});
                    }
                    // 发送loginReady
                    me.loginReady();
                });
            });
        },
        /**
         * 更新当前好友分组信息.
         */
        updateFriendTeams:function(){
            var packet = new IMPacket();
            packet.m_strCommand = 'friend';
            packet.m_strVersion = '1.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'get_multi_team';
            packet.m_mapParams['uid'] = this._imid;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        onFriendGetMultiTeam:function(packet){
            var imid = this._imid;
            var root = getDocument(packet);
            
            if(!root){
                return;
            }
            
            var teams = root.getElementsByTagName('team');
            var data = getList(teams);
            
            getDb('hiFriendTeam',function(err,collection){
                if(err){
                    console.error(err);
                    return;
                }
                
                var i = data.length, keepTid=[];
                console.log("find team.length:" + i , imid , data);
                data.forEach(function(item){
                    item.smr_id = ObjectId();
                    item.refImid = imid;
                    keepTid.push(item.tid);
                    collection.update({refImid:imid,tid:item.tid},item,{upsert:true},function(err,doc){
                        
                        if(err){
                            console.log('Error:save team : ', err , item);
                        }
                        
                        if(--i <= 0 ){
                            // 删除不在本次查询返回范围内的分组
                            collection.remove({refImid: imid ,tid:{$nin:keepTid}}, {w:1},function(err,numberOfRemovedDocs){
                                //console.log("remove FriendTeam:",numberOfRemovedDocs,err);
                                msg.sendLocalMessage({modelName:"hiFriendTeam"},'trigger_push');
                            });
                        }
                    });
                });
            });
        },
        getContaceQuery:function(list, cb){
            var me = this , packet = null;
            var idlist = [] , timestamp = [] , tplParam = null;;
            list.forEach(function(item){
                if(item.imid){
                    idlist.push(item.imid);
                    timestamp.push(item.timestamp || 0);
                }
            });
            
            if(idlist.length !== timestamp.length){
                consol.error('idlist.length !== timestamp.length');
                return 
            }
            
            var result = [] , err = null;
            var sendIds = null , sendOutCount = 0 , ackCb =  function(packet){
                sendOutCount--;
                //packet.dump('==== contact:query ack====');
                if(packet.m_mapParams.code == 200){
                    var root = getDocument(packet);
                    var items = root.getElementsByTagName('contact');
                    result = result.concat(getList(items));
                    console.log("INFO: query contact detail ACK, at group " + sendOutCount + ", result.length is " + result.length);
                }else{
                    err = packet.m_mapParams.code;
                    console.log("ERR: query contact detail ACK, at group " + sendOutCount + ", error code " + err);
                }
                
                // 当包都返回后,触发回调
                if(sendOutCount == 0){
                    console.log("INFO: query contact detail all return result.length is " + result.length);
                    me.saveContactQuery(err,result);
                    cb && cb(err, result);
                }
            };
            
            while(idlist.length > 0 ){
                sendIds = idlist.splice(0,50);
                tplParam = {
                        id_list:sendIds.join(";"),
                        timestamp:timestamp.join(';')
                };
                
                packet = new IMPacket();
                packet.m_strCommand = 'contact';
                packet.m_strVersion = '3.0';
                packet.m_eType = PTYPE.REQ;
                packet.m_mapParams['method'] = 'query';
                packet.m_mapParams['uid'] = this._imid;
                packet.m_strBody = replaceParams(TPL_CONTACT_QUERY, tplParam);
                packet.m_ackCallback = ackCb;
                //packet.dump('==== contact:query req====');
                this.m_Conn && this.m_Conn.sendPacket(packet);
                sendOutCount++;     // 增加记数
                console.log("INFO: query contact detail, at group " + sendOutCount + ", items.length is " + sendIds.length);
            }
        },
        saveContactQuery:function(err,data){
            if(err){
                console.error(err);
                return;
            }
            var me = this;
            /*
             * 记录所有将更新或插入数据库的imid;
             */
            var ids = [];
            
            /*
             * 将数组转成map
             */
            //var dataMaps = {};
            
            /**
             * 两个记数器，相加等于total时，表示所有数据都处理完成.
             */
            var updateCount = 0;
            //var insertCount = 0;
            
            var total = data.length;
            
            getDb('hiContacts',function(err,collection){
                if(err){
                    console.error(err);
                    return;
                }
                
                data.forEach(function(item){
                    var status = item.status && item.status.split(';');
                    var head = item.head && item.head.split(";");
                    // 拆分状态及状态描述
                    if(status){
                        item.status = parseInt(status[0]);
                        item.statusMsg = status[1];
                    }
                    
                    // 获取头像信息
                    if(head && head[0].length == 32){
                        var queryHead = {
                                dir:me.headDir,
                                md5:head[0],
                                extName:head[2] || 'png'
                        };
                        
                        me.getImage(queryHead,function(err){
                            if(err){
                                console.warn('WARN : faile to download user head : ' + err);
                            }else{
                                //console.log('INFO : download user head.' + JSON.stringify(queryHead));
                            }
                        });
                    }
                    
                    item.smr_id = ObjectId();
                    collection.update({imid:item.imid},{$set:item},{upsert:true},function(err,rsDoc){
                        if((++updateCount) >= total ){
                            msg.sendLocalMessage({modelName:"hiContacts"},'trigger_push');
                        }
                    });
                    
                    //dataMaps[item.imid] = item;
                    //ids.push(item.imid);
                });
                
            });
            
            
            /*
             * 已在上面将已下部份替换为upsert实现. 
             */
            
            //debugger;
//            getDb('hiContacts',function(err,collection){
//                if(err){
//                    console.error(err);
//                    return;
//                }
//                /**
//                 * 取得所有已在db中的进行update操作
//                 */
//                collection.find({imid:{$in:ids}}).toArray(function(err,items){
//                    if(err){
//                        console.error(err);
//                        return;
//                    }
//                    //debugger;
//                    // update
//                    items.forEach(function(item){
//                        if(dataMaps[item.imid]){
//                            collection.update({imid:item.imid},{$set:dataMaps[item.imid]},function(){
//                                if((++updateCount + insertCount) >= total ){
//                                    msg.sendLocalMessage({modelName:"hiContacts"},'trigger_push');
//                                }
//                            });
//                        }
//                        // 将更新的记录从dataMaps中删除，使dataMap中仅剩于需要insert的数据集
//                        dataMaps[item.imid] = null;
//                        delete dataMaps[item.imid];
//                    });
//                    
//                    // insert
//                    for(var key in dataMaps){
//                        dataMaps[key].smr_id = ObjectId();
//                        collection.save([dataMaps[key]],function(){
//                            if((updateCount + ++insertCount) >= total){
//                                msg.sendLocalMessage({modelName:"hiContacts"},'trigger_push');
//                            }
//                        });
//                    }
//                    
//                });
//            });
        },
        getQueryStatus:function(idlist,cb){
            var me = this , packet = null , err = null;
            var tplParam = null;;
            var result = {};
            
            var sendIds = null ,sendOutCount = 0 , ackCb = function(packet){
                sendOutCount--;
                //packet.dump('==== contact:query ack====');
                if(packet.m_mapParams.code == 200){
                    var root = getDocument(packet);
                    var items = root.getElementsByTagName('contact');
                    //debugger;
                    result = fw.utils.cpp(result, getMap(items,'imid'));
                    console.log("INFO: query contact status ACK, at group " + sendOutCount + ", result.length is " + Object.keys(result).length);
                }else{
                    err = packet.m_mapParams.code;
                    console.log("ERR: query contact status ACK, at group " + sendOutCount + ", error code " + err);
                }
                // 当包都返回后,触发回调
                if(sendOutCount == 0){
                    console.log("INFO: query contact status all return result.length is " + Object.keys(result).length);
                    cb && cb.call(me,err, result);
                }
            };
            
            while(idlist.length > 0){
                sendIds = idlist.splice(0,50);
                tplParam = {
                   id_list:sendIds.join(";"),
                };
                
                packet = new IMPacket();
                packet.m_strCommand = 'contact';
                packet.m_strVersion = '3.0';
                packet.m_eType = PTYPE.REQ;
                packet.m_mapParams['method'] = 'query';
                packet.m_mapParams['uid'] = this._imid;
                packet.m_strBody = replaceParams(TPL_CONTACT_QUERY_ONLINE_STATUS, tplParam);
                packet.m_ackCallback = ackCb;
                //packet.dump('==== contact:query req====');
                this.m_Conn && this.m_Conn.sendPacket(packet);
                sendOutCount++;     // 增加记数
                console.log("INFO: query contact status, at group " + sendOutCount + ", items.length is " + sendIds.length);
            }
            
        },
        getUserQuery :function(){
            var packet = new IMPacket();
            packet.m_strCommand = 'user';
            packet.m_strVersion = '2.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'query';
            packet.m_mapParams['uid'] = this._imid;
            packet.m_strBody = TPL_USER_QUERY;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        getUserQueryBaiduId :function(){
            var packet = new IMPacket();
            packet.m_strCommand = 'user';
            packet.m_strVersion = '2.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'query';
            packet.m_mapParams['uid'] = this._imid || this.m_params['uid'] || "";
            packet.m_strBody = TPL_USER_QUERY_BAIDUID;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        onUserQuery :function(packet){
            //packet.dump("onUserQuery");
            var root = getDocument(packet);
            
            if(!root){
                return;
            }
            
            var account = root.getElementsByTagName('account')[0];
            var imid = root.getAttribute('uid');
            var obj = {imid:imid},headInfo;
            copyAttributesToMap(account,obj);
            
            if(headInfo = obj.head){
                headInfo = headInfo.split(';');
                if(headInfo[0].length == 32){
                    var imgQueryObj = {
                            dir:headDir,
                            md5:headInfo[0], 
                            extName:headInfo[2] || 'jpg'
                            };
                    // 从远端获取图片的base64字符串
                    this.getImage(imgQueryObj,function(err){
                        if(err){
                            console.log('faile to download user head : ' + err);
                        }else{
                            //console.log('download user head.' + JSON.stringify(imgQueryObj));
                        }
                    });
                }
            }
            
            getDb('hiUserInfo',function(err,collection){
                collection.findOne({imid:imid},{},function(err,item){
                    // 如果等于0,则是第一次登陆,直接插入即可
                    //debugger;
                    if(item == null){
                        obj.smr_id = ObjectId();
                        collection.save(obj,function(){
                            msg.sendLocalMessage({modelName:"hiUserInfo"},'trigger_push');
                        });
                    }else{
                        //如果不为0,则需要变更obj为更新对像
                        collection.update({imid:imid},{$set:obj},function(){
                            console.dir(arguments);
                            msg.sendLocalMessage({modelName:"hiUserInfo"},'trigger_push');
                        });
                    }
                });
                
            });
        },
        onContactNotify:function(packet){
            var root = getDocument(packet);
            var result = copyAttributesToMap(root);
            
            // 将变化压入队列中而不是即时处理.
            contactNotifyQueue.push([result.imid,result]);
            
            // return [result];
        },
        updateGroup:function(cb){
            var packet = new IMPacket();
            packet.m_strCommand = 'group';
            packet.m_strVersion = '3.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'get_list';
            packet.m_mapParams['uid'] = this._imid;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        onGroupGetList:function(packet){
            var root = getDocument(packet);
            
            if(!root){
                return;
            }
            
            var items = root.getElementsByTagName('group');
            var groupMap = getMap(items,'gid');
            
            var me = this;
            var imid = this._imid;
            var gids = Object.keys(groupMap);
            var len = gids.length;
            
            getDb("hiUserInfo",function(err,collection){
                collection.update({imid:imid},{$set:{groups:gids}},function(){
                    msg.sendLocalMessage({modelName:"hiUserInfo"},'trigger_push');
                });
            });
            
            getDb("hiGroups",function(err,collection){
                if(err){
                    console.error(err);
                    return;
                }
                
                // 用于对引用进行记数，以此判断是否所有请求都已返回结果
                var queryCount = len * 3;
                
                var tryToSave = function(){
                    
                    if(queryCount != 0){
                        return;
                    }
                    
                    //debugger;
                    var count = len;
                    gids.forEach(function(gid){
                        var groupObj = groupMap[gid];
                        groupObj.smr_id = groupObj.smr_id  || ObjectId();
                        
                        collection.save(groupObj,function(){
                            if(--count == 0){
                                msg.sendLocalMessage({modelName:"hiGroups"},'trigger_push');
                            }
                        });
                    });
                };
                
                collection.find({gid:{$in:gids}},{}).toArray(function(err,result){
                    
                    if(err){
                        console.error(err);
                        return;
                    }
                    
                    /*
                     * 取得可更新的内容项，并进行合并更新
                     * -----
                     * 在引处的合并后，并不进行数据库save操作，只合并对像
                     * 更新从db查出的对像，将从server端查询出的结查合并进去
                     * 此操作为了保存db生成id与其它附加数据不变化
                     */
                    result.forEach(function(item){
                        var up = groupMap[item.gid];
                        if(up){
                            groupMap[item.gid] = fw.utils.cpp(item,up);
                        }
                    });
                    
                    /*
                     * 查询群信息及成员列表等并进行合并
                     */
                    gids.forEach(function(gid){
                        var groupObj = groupMap[gid];
                        me.getGroupInfo((groupObj.infoTimestamp || 0),gid,function(err,groupInfo,timestamp){
                            try{
                                //debugger;
                                queryCount--;
                                if(err && err != 220){
                                    return;
                                }
                                
                                // 两个timestamp相同，则数据没有更新，不进行操作
                                if(groupObj.infoTimestamp == timestamp){
                                    return;
                                }
                                
                                // 记录新的timestamp
                                groupObj.infoTimestamp = timestamp;
                                // 替换对像
                                groupObj.information = groupInfo;
                            }finally{
                                tryToSave();
                            }
                        });
                        
                        me.getGroupMember((groupObj.memberTimestamp || 0),gid,function(err,groupMember,timestamp){
                            try{
                                debugger;
                                queryCount--;
                                if(err){
                                    console.error(err);
                                    return;
                                }
                                
                                // check timestamp
                                if(groupObj.memberTimestamp == timestamp){
                                    return;
                                }
                                
                                // 记录新的timestamp
                                groupObj.memberTimestamp = timestamp;
                                // 替换对像
                                groupObj.groupMember = groupMember;
                            }finally{
                                tryToSave();
                            }
                        });
                        
                        me.sendGroupGetCard2(gid,(groupObj.memberCardTimestamp || 0),function(err, result) {
                            try{
                                //debugger;
                                queryCount--;
                                
                                if(err){
                                    console.error(err);
                                    return;
                                }
                                
                                // check timestamp
                                if(groupObj.memberCardTimestamp == result.timestamp){
                                    return;
                                }
                                
                                // 记录新的timestamp
                                groupObj.memberCardTimestamp = result.timestamp;
                                // 替换对像
                                groupObj.memberCards = result.cards;
                                
                            }finally{
                                tryToSave();
                            }
                        });
                    });
                    
                });
            });
            
        },
        getGroupInfo:function(timestamp,gid,cb){
            var me = this;
            var packet = new IMPacket();
            packet.m_strCommand = 'group';
            packet.m_strVersion = '3.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'get';
            packet.m_mapParams['uid'] = this._imid;
            packet.m_mapParams['gid'] = gid;
            packet.m_mapParams['timestamp'] = timestamp || 0;
            packet.m_ackCallback = function(packet){
                //packet.dump('==== group:get =====');
                var obj = {}, tmp, root, manager;
                var code = packet.m_mapParams['code'];
                // 如果无变化
                if(code == 220){
                    cb && cb.call(me, 220, obj, timestamp);
                }else if(code > 400){
                    packet.dump("===cant get group info====");
                    //console.log("@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@", timestamp , gid );
                    cb && cb.call(me, code, null);
                }else{
                    root = getDocument(packet);
                    manager = root.getElementsByTagName('manager');
                    copyAttributesToMap(root,obj);
                    tmp = getMap(manager,"imid");
                    obj.managers = Object.keys(tmp);
                    cb && cb.call(me, null,obj,packet.m_mapParams['timestamp']);
                }
                
            };
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        _getGroupMember:function(timestamp,gid,page,cb){
            var me = this;
            var packet = new IMPacket();
            packet.m_strCommand = 'group';
            packet.m_strVersion = '1.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'get_member';
            packet.m_mapParams['uid'] = this._imid;
            packet.m_mapParams['gid'] = gid;
            packet.m_mapParams['timestamp'] = timestamp;
            packet.m_mapParams['page'] = page || 0;
            packet.m_ackCallback = function(packet){
                debugger;
                //if(packet.m_mapParams['code']){}
                //packet.dump("====== group:getm_member =======");
                var root = getDocument(packet);
                if(root){
                    var items = root.getElementsByTagName('member');
                    var newTimestamp = packet.m_mapParams['timestamp'];
                    var hasNext = packet.m_mapParams['code'] == 220;
                    // 如果还有成员
                    cb && cb.call(me, null,getList(items) , hasNext , page , newTimestamp);
                }else{
                    cb && cb.call(me,  packet.m_mapParams['code'],[] , false , 0 , 0);
                }
            };
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        getGroupMember:function(timestamp,gid,cb){
            var rs = [];
            var me = this;
            var next = function(err, list, hasNext, page , newTimestamp){
                
                if(err){
                    cb(err);
                    return;
                }
                
                rs = rs.concat(list);
                
                if(hasNext){
                    me._getGroupMember(timestamp,gid, ++page, next);
                }else{
                    
                    var ids = [];
//                    var queryCb = function(err,result){
//                        if(!err){
//                            //debugger;
//                            // 如无错误，将查询回的用户状态合并回list中
//                            rs.forEach(function(item){
//                                //debugger;
//                                if(result[item.imid]){
//                                    item.status = result[item.imid].status || 0;
//                                }else{
//                                    console.log('WARNING: Query User Status empty : IMID:' + item.imid);
//                                    console.dir(item);
//                                }
//                            });
//                        }
//                        cb(null, rs, newTimestamp);
//                    };
//                    
                    rs.forEach(function(item){
                       ids.push(item.imid); 
                    });
                    
                    me.getContactTimestamp(ids,function(timestampList){
                        me.getContaceQuery(timestampList);
                    });
                    
                    cb(null, ids, newTimestamp);
                    //debugger;
                    //me.getQueryStatus(ids,queryCb);
                }
            };
            
            me._getGroupMember(timestamp, gid, 0, next);
        },        
        //============== 获取图片 ===============// 
        getImage:function(info,cb){
            var _md5 = info.md5;
            var fileName = info.dir + _md5 + "." + info.extName;
            var me = this;
            fs.exists(fileName,function(exists){
                if(exists){
                    /**
                     * 存在的文件不再次读取
                     * FIXME 此处未处理分文件夹的情况,认为所有图片都在同一个目录中.
                     */
                    //console.log("INFO : file exists : " + fileName);
                    cb.call(me);
                }else{
                    me.getImageSvr(function(err,portInfo){
                        var binBuffer = portInfo;
                        var relayInfo = ImageLoader.ParseRelayInfo(binBuffer);
                        console.dir(relayInfo);
                        var md5 = new Buffer(_md5,'hex');
                        var imageInfo = {
                                hostInfo : relayInfo,
                                serviceType : ImageLoader.CONSTANTS.DOWNLOAD_DISPLAY_IMAGE, 
                                sourceId : relayInfo.uid,
                                targetId : 0,
                                md5 : md5
                        }; 
                        //debugger;
                        ImageLoader.LoadImage(imageInfo, function(data){
                            if(!data || data.length == 0 ){
                                //cb("buffer is empty");
                                return;
                            }
                            // 获得图片数据并保存至目标路径
                            fs.writeFile(fileName, data, 0, data.length, function (err) {
                                if (err){
                                    cb.call(me,err);
                                }else{
                                    cb.call(me);
                                }
                            });
                        });
                    });
                }
            });
            
        },
        getImageSvr:function(cb){
            var me = this;
            var packet = new IMPacket();
            packet.m_strCommand = 'IMAGESVR';
            packet.m_strVersion = '1.0';
            packet.m_eType = PTYPE.REQ;
            //packet.m_mapParams['method'] = 'get';
            packet.m_mapParams['from'] = this._imid;
            //packet.m_mapParams['gid'] = gid;
            //packet.m_mapParams['timestamp'] = timestamp;
            packet.m_ackCallback = function(packet){
                //packet.dump("\r\n\r\n==============getImagerSrv===========\r\n\r\n\r\n\r\n");
                //debugger;
                if(packet.m_mapParams.code == 200){
                    cb&& cb.call(me,null,packet.m_strBody);
                }else{
                    cb&& cb.call(me,packet.m_mapParams.code,null);
                }
            };
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        // ============= 处理会话消息 ================ //
        /**
         * 消息体基本格式（请求或响通知或能会附加其它信息。但主体不变）：
         *  msg:{
         *      uid:xxxx,            // 会话归属id
         *      from:xxxxx,          // 消息来原
         *      to:xxxxxx,           // 消息目标
         *      type:0|1|2|3         // 消息类型
         *      from_sub:,           // 不知道干嘛的.仅携带
         *  　　　　msgid:xxx,           // 无用,仅兼容
         *      subid:xxxx,          // 在某一个消息序列下的消息子ID（用户消息拆包）
         *      nextsubid:xxx,       // 表示是否有下一个子消息，如果是0表示没有下一个子消息（用于消息拆包）
         *      time:timestamp       // 来源时间，1970秒数,转换时 timestamp * 1000 发送时  timestamp / 1000
         *      msgBody:{}           // 消息内容
         *  }
         */
        /**
         *离线消息查询协议解析 
         */
        getOfflineMsg:function(type,start_time,start_id,gid){
            //离线消息查询协议解析
            var packet = new IMPacket();
            packet.m_strCommand = 'query';
            packet.m_strVersion = '1.0';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'get_offline_msg';
            packet.m_mapParams['uid'] = this._imid;
            packet.m_mapParams['type'] = type;
            if( type == 1){
                packet.m_mapParams['gid'] = gid || 0;
            }
            packet.m_mapParams['start_time'] = start_time || 0;
            packet.m_mapParams['start_id'] = start_id || 0;
            this.m_Conn && this.m_Conn.sendPacket(packet);
        },
        
        dispatchOfflineMsg : function(packet){
            var me = this;
            
            if(packet){
                if(!me.packetQueue){
                    me.packetQueue = [];
                }
                me.packetQueue.push(packet);
            }
            
            if(me.offlineMsgSending != 'sending' && me.packetQueue && me.packetQueue.length > 0){
                packet = me.packetQueue.shift();
                if(packet){
                    me.offlineMsgSending = "sending";
                    me.m_Conn && me.m_Conn.onPacket(packet);
                }
            }
            
        },
        onQueryGetOfflineMsg : function(packet){
            var me = this;
            var code = packet.m_mapParams.code;
            var type, last_time , last_id, gid;
            type = packet.m_mapParams['type'];
            switch(code){
                case '210' :
                    
                    last_time = packet.m_mapParams['last_time'];
                    last_id = packet.m_mapParams['last_id'];
                    gid = packet.m_mapParams['gid'] || 0;
                    console.log("INFO : HAVE OFFLINE MESSAGE, TYPE:" + type + ",  CODE : " + code);
                    //debugger;
                    /**
                     * 解析离线消息并重新派发
                     */
                    var binData = packet.m_strBody;
                    var dataReader = new BIStream(binData, binData.length, 0);
                    var offlineMsg , dataReader1 , packet;
                    while(dataReader.remainingLength() > 0){
                        offlineMsg = new OfflineMsg();
                        offlineMsg.decode(dataReader);
                        dataReader1 = new BIStream(offlineMsg.m_body, offlineMsg.m_body.length, 0);
                        packet = new IMPacket();
                        packet.decode(dataReader1);
                        packet.m_mapParams['offline'] = 1;
                        //
                        me.dispatchOfflineMsg(packet);
                        //
                    }
                    
                    process.nextTick(function(){
                        me.getOfflineMsg(type, last_time, last_id, gid);
                    });
                    break;
                case '200' :
                case '400' :
                default  :
                    console.log("INFO :NOT OFFLINE MESSAGE, CODE :  TYPE:" + type + ", " + code);
            }
        },
        createMessageRequestBody:function(msgStr){
            var root =  new DOMParser().parseFromString(msgStr);
            // 用于生成send msg 的临时xml文档
            var sendDocument = new DOMParser().parseFromString("<msg />");
            var sendRoot = sendDocument.documentElement;

            if(root){
                root = root.documentElement;
            }else{
                return sendRoot.toString();
            }
            // 先转换字体标签
            var fontStr = root.getAttribute('style');
                fontStr = fontStr.split(";");
            var font = sendDocument.createElement("font");

            fontStr.forEach(function(item){
                item = item.trim().split(":");
                if(item.length == 2){
                    var key = item[0].trim();
                    var value = item[1].trim();
                    
                    font.setAttribute('i',0);
                    font.setAttribute('ul',0);
                    switch(key){
                        case "font-family" :
                            font.setAttribute('n',value || '宋体');
                            break;
                        case "font-size" :
                            font.setAttribute('s',value || 10);
                            break;
                        case "font-weight" :
                            font.setAttribute('b',value == 'bold' ? 1 : 0);
                            break;
                        case "color" :
                            font.setAttribute('c',colorToUint32(value));
                            break;
                    }
                    
                }
            });

            sendRoot.appendChild(font);

            // 取得子元素，并逐一转换
            var msgParts = root.childNodes ,part;

            for(var i = 0,l = msgParts.length; i < l; i++){
                part = null;
                //console.log(i + " : " + msgParts[i].toString());
                switch(msgParts[i].tagName){
                    case 'text':
                        part = sendDocument.createElement("text");
                        part.setAttribute('c',msgParts[i].textContent);
                        break;
                    case 'face':
                        part = msgParts[i].cloneNode();
                        part.textContent = "";
                        //msgParts.push(messageParts[i].toString());
                        break;
                    case 'reply':
                        //part = "<reply><name>" + encoder.htmlEncode(messageParts[i].getAttribute('n')) + "</name><content>" + encoder.htmlEncode(messageParts[i].getAttribute('c')) + "</content></reply>";
                    case 'img':
                    case 'cface':
                        // 图片与表情数据收于依赖文件上传，所以延后实现，目前直接将img与cface过滤掉不发送.
                        //part = sendDocument.createElement("img");
                        //part.setAttribute('c',msgParts[i].textContent);
                    case 'url':
                        // url在前端只来源于一个文本，所以ref与c使用同一地址.但在前端大部份情况下，统统为文本不应有url送出，这里只属于预留
                        part = sendDocument.createElement("url");
                        part.setAttribute('c',msgParts[i].textContent);
                        part.setAttribute('ref',msgParts[i].textContent);
                    default:
                        //console.log('ignore reply,img, so on..');
                        part = null;
                }
                
                if(part && part.nodeType){
                    sendRoot.appendChild(part);
                }
            }
            
            return sendRoot.toString();
        },
        onMsgRequest:function(data,count){
            //debugger;
            // 确认消息已发送至server后，再进行ack超时重发的处理.否则有可能是消息向server传递时有问题
            var timestamp = data.time ;
            if(timestamp){
                this.msgDelayedAction.create(timestamp,[data,count],120 * 1000);
            }
        },
        sendMsgRequest:function(data,_count){
            var me = this;
            
            var count = _count || 0;
            /**
             * 处理超时重发超过重试次数的情况
             */
            if(count >= 10){
                console.log('INFO : discard message , count > 10' );
                return;
            }
            
            var packet = new IMPacket();
            packet.m_strCommand = 'msg';
            packet.m_strVersion = '1.1';
            packet.m_eType = PTYPE.REQ;
            packet.m_mapParams['method'] = 'msg_request';
            packet.m_mapParams['uid'] = me._imid;
            packet.m_mapParams['type'] = data.type;
            packet.m_mapParams['from'] = data.from;
            packet.m_mapParams['to'] = data.to;
            packet.m_mapParams['time'] = data.time;
            packet.m_mapParams['subid'] = data.subid;
            packet.m_mapParams['nextsubid'] = data.nextsubid;
            packet.m_mapParams['from_sub'] = 0;
            packet.m_mapParams['to_sub'] = 0;
            packet.m_mapParams['waitack'] = 120;
            
            packet.m_strBody = me.createMessageRequestBody(data.msgBody);
            //packet.dump("\r\n\r\n=========== send message (" + packet.calcSize(packet.m_nSeqNumber) + ")==============\r\n\r\n");
            
            /**
             * FIXME 此处暂时未不处理分包
             */
            packet.m_ackCallback = function(packetAck){
                //packetAck.dump("\n\n=======send message ack===========\n\n");
                // 此处如果是拆包发送的消息,需要自己计算返回包数量,并控制重发
                if(packetAck.m_mapParams.code == 200){
                    if(data.type == 1){ // 群消息不发送ack，所以不处理重发
                        // server确认端成功接收再处理超时,否则请明服务器接收到的内容有问题,直接丢弃
                        me.onMsgRequest.call(me,data,count);
                    }
                }
            };
            me.m_Conn && me.m_Conn.sendPacket(packet);
        },
        saveMsg : function(message,imid,msgType){
            
//            hiMessageNotifyCount++;
//            hiMessageCount++;
//            hiMessageNotifyFindCount ++;
            
            var me = this;
            var msgPreview = message.msgPreview;
            
            var obj = {
                    refImid:imid || me._imid,
                    type:message.type,
                    // from:message.from //FIX 不同的from也要列入同一个通知
            };
            
            switch(obj.type){
                case '1':
                    // 单人会话，又来源为准,因为目标始终为自己
                    obj.from = message.from;
                    break;
                case '2':
                case '3':
                    // 多人及群，以目标为准，因为来源可能是任何人.
                    obj.to = message.to;
                    break;
            }
            
            var trigger = function(err,doc){
                
                //hiMessageNotifyCount--;
                
                if(err){
                    console.log("save hiMessageNotify ",err);
                    return;
                }
                msg.sendLocalMessage({modelName:"hiMessageNotify"},'trigger_push');
            };
            
            getDb('hiMessage',function(err,collection){
                // 记录hiserver的时间，用于发送ack消息
                var hiServerTimestamp = message.time;
                
                if(msgType != "ON_OFFLINE_MESSAGE"){
                    // 将time改为当前server接收消息的时间，用于防止显示的时候受pc端或hiserver时间差异所产生的消息记录混乱
                    // 当msgType标识为离线时，不重新记录时间
                    message.time = Date.now();
                }
                message.refImid = imid || me._imid;
                message.smr_id = ObjectId();
                
                // 清除多余属性
                message.msgPreview = null;
                delete message.msgPreview;
                
                collection.save(message,function(){
                    me.sendMsgAck(message.from,message.type,hiServerTimestamp);
                    msg.sendLocalMessage({modelName:"hiMessage"},'trigger_push');
                    //hiMessageCount--;
                });
            });
            
            //return;
            getDb('hiMessageNotify',function(err,collection){
                
                if(err){
                    console.log('hiMessageNotify',err);
                    return;
                }
                
                collection.findOne(obj,{},function(err,item){
                    //hiMessageNotifyFindCount--;
                    //debugger;
                    if(item == null){
                        obj.smr_id = ObjectId();
                        obj.count = 1;      // 默认值为1
                        obj.msgBody = msgPreview;
                        obj.from = message.from;
                        obj.to = message.to;
                        obj.status = 0;
                        collection.save(obj,trigger);
                    }else{
                        item.count++;
                        item.from = message.from;
                        item.to = message.to;
                        item.status = 0;
                        item.msgBody = msgPreview;
                        collection.save(item, trigger);
                    }
                    
                    //msg.sendLocalMessage({modelName:"hiMessageNotify"},'trigger_push');
                    
                    me.offlineMsgSending = 'done';
                    me.dispatchOfflineMsg();
                });
            });
        },
        
        /**
         * 方法在收到消息并成功存入ＤＢ后，自动发送MSG_ACK包通知远程server
         */
        sendMsgAck:function(toId,type,timestamp){
            var me = this;
            
            if(type != 1){
                // 仅单人会话需要发送ack，群等不需要所以直接返回
                return;
            }
            var ackDA = me.ackDelayedAction.hasKey(toId);
            //debugger;
            if(ackDA){
                ackDA.args[1].push(timestamp);
            }else{
                // 不存在时创建一个新的
                me.ackDelayedAction.create(toId,[toId,[timestamp]],100*1000);
            }
        },
        onMsgMsgAckNotify:function(packet){
            var me = this;
            var root = getDocument(packet);
            
            var items = root.getElementsByTagName('ack');
            var acks = getMap(items,'id');
            //debugger;
            for(var key in acks){
                //debugger;
                this.msgDelayedAction.clear(key);
            }
            
            //me.sendMsg[timestamp]
        },
        onMsgMsgNotify:function(packet){
            var me = this;
            var result = {};
            var root = getDocument(packet);
            var offline = packet.m_mapParams['offline'] != '1' ? "ON_MESSAGE" :"ON_OFFLINE_MESSAGE" ;
            
//            if(offline == 'ON_OFFLINE_MESSAGE'){
//                // 当收到离线消息时，由于短时间内发送的消息，时间可能为同一时间，所以将接收顺序记入db中，做为辅助的排序项.
//                result.offlineSort = packet.m_mapParams['offlineSort'] || null;
//                console.log('offline Num.: ' , result.offlineSort );
//            }
//            
            result.uid = packet.m_mapParams['uid'];
            result.from = packet.m_mapParams['from'];
            result.to = packet.m_mapParams['to'];
            result.type = packet.m_mapParams['type'];
            result.from_sub = 0;
            //result.msgid = packet.m_mapParams['msgid'];
            result.time = parseInt(packet.m_mapParams['time']);
            result.subid = packet.m_mapParams['subid'];
            result.nextsubid = packet.m_mapParams['nextsubid'];
            //result.sys_sess = packet.m_mapParams['sys_sess'];
            
            //--------
            
            //console.log("INFO : " + offline + ", FROM : " + result.from + " TO : " + result.to);
            
            result.msgBody = "";
            var messageParts = root.childNodes;
            var fonts = root.getElementsByTagName('font')[0];
            var msgParts = [],part,encoder = htmlEncoder('entity');

            if(fonts){
                var fontArgs = copyAttributesToMap(fonts,{});
                var stylesString = "font-family:" + fontArgs.n
                    + "; font-size:" + fontArgs.s
                    + "px; font-weight:" + (fontArgs.b == '1' ? 'bold' : 'normal')
                    + "; color:" + getColor(fontArgs.c)
                    + "; text-decoration:" + (fontArgs.ul == '1' ? 'underline' : 'none')
                    + "; font-style:" + (fontArgs.i == '1' ? 'italic' : 'normal');
                
                part = '<pre style="' + stylesString + '">';
            }else{
                part='<pre>';
            }

            msgParts.push(part);
            var textContent , md5;
            for(var i = 0 ;i < messageParts.length;i ++){
                part = null;
                switch(messageParts[i].tagName){
                    case 'font':
                        part = null;
                        break;
                    case 'text':
                        textContent = messageParts[i].getAttribute('c');
                        textContent = textContent.replace(/&/g,"&amp;");
                        textContent = textContent.replace(/</g,"&lt;");
                        textContent = textContent.replace(/>/g,"&gt;");
                        textContent = textContent.replace(/"/g,"&quot;");
                        part = "<text>" + textContent + "</text>";
                        break;
                    case 'reply':
                        part = "<reply><name>" + encoder.htmlEncode(messageParts[i].getAttribute('n')) 
                             + "</name><content>" + encoder.htmlEncode(messageParts[i].getAttribute('c')) 
                             + "</content></reply>";
                        break;
                    case 'img':
                        md5 = messageParts[i].getAttribute('md5');
                        part = '<img stype="img" src="/assets/loading.gif" onerror="cfaceloader(\'' 
                             + md5 +'\', this, true);" onload="cfaceloader(\'' + md5 +'\', this);"/>';
                        break;
                    case 'cface':
                        md5 = messageParts[i].getAttribute('md5');
                        part = '<img stype="cface" src="/assets/loading.gif" onerror="cfaceloader(\'' 
                             + md5 +'\', this, true);" onload="cfaceloader(\'' + md5 +'\', this);"/>';
                        break;
                    case 'face':
                        messageParts[i].textContent = root.ownerDocument.createTextNode("");
                        msgParts.push(messageParts[i].toString());
                        break;
                    case 'url':
                        part = "<url href=\"" +messageParts[i].getAttribute('ref') + "\" >" 
                             + messageParts[i].getAttribute('c') + "</url>";
                }
                
                if(part !== null){
                    msgParts.push(part);
                }
                
                //console.log(htmlEncoder('entity').htmlEncode(messageParts[i].toString()));
            }
            msgParts.push("</pre>");
            result.msgBody = msgParts.join('');
            //console.log(result.msgBody);
            //通知保存预览，added by sundong-begin
            msgParts = [];
            for(var i = 0 ;i < messageParts.length;i ++){
                switch(messageParts[i].tagName){
                    case 'font':
                        part = null;
                        break;
                    case 'text':
                        part = messageParts[i].getAttribute('c');
                        break;
                    case 'reply':
                        part = '[reply]';//"<reply><name>" + encoder.htmlEncode(messageParts[i].getAttribute('n')) + "</name><content>" + encoder.htmlEncode(messageParts[i].getAttribute('c')) + "</content></reply>";
                        break;
                    case 'img':
                        part = '[图片]';
                        break;
                    case 'cface':
                        part = '[cface]';
                        break;
                    case 'face':
                        part = '[表情]';//messageParts[i].toString();
                        break;
                    case 'url':
                        part = '[网址]';
                        break;
                    default:
                        part = '[unknow]';
                }
                if(part !== null){
                    if (part.length > 40){
                        part = part.substring(0,37)+"...";
                    }
                    msgParts.push(part);
                    break;//预览一行即可
                }
            }
            result.msgPreview = msgParts.join('');
            //通知保存预览----end
            me.saveMsg(result,me._imid,offline);
        }
};

//setInterval(function(){
//    console.log("\n\n\n START MESSAGE COUNT \n\n");
//    console.log("hiMessageCount : " + hiMessageCount);
//    console.log("hiMessageNotifyCount : " + hiMessageNotifyCount);
//    console.log("hiMessageNotifyFindCount : " + hiMessageNotifyFindCount);
//    console.log("\n\n\n END MESSAGE COUNT \n\n");
//},1000 * 10);

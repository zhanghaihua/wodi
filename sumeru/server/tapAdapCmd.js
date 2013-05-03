/**
 * 
 * 注册若干指令
 * 
 */

var path = require('path');

var adapUtils = require('./driver/adapUtils.js');

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

module.exports = function(fw, getImHandleByClientId) {

	var cmdCfg = {
		'multiCreate' : {// 创建多人会话
			handle : 'sendMultiCreate',
			args : [ 'imidList' ]
		},
		'multiAdd' : {//添加/邀请进入多人会话
			handle : 'sendMultiAdd',
			args : [ 'mid', 'imidList' ]
		},
		'multiQuit' : {//退出多人会话
			handle : 'sendMultiQuit',
			args : [ 'mid' ]
		},
		'multiQuitAll' : {//退出当前用户所处的一切多人会话
			handle : 'quitAllMulti'
		},
		'groupFind' : {//查找群, 加群前置操作
			handle : 'sendGroupFind',
			args : [ 'gid' ]
		},
		'getGroupJoinSecurityVerify' : {
			handle : 'getGroupJoinSecurityVerify'
		},
		'getFriendDeleteSecurityVerify' : {
			handle : 'getFriendDeleteSecurityVerify'
		},
		'getFriendAddSecurityVerify' : {
			handle : 'getFriendAddSecurityVerify',
			args : [ 'imid' ]
		},
		'groupJoin' : {//申请加入
			handle : 'sendGroupJoin',
			args : [ 'gid', 'note', 'verifyInfo' ]
		},
		'groupQuit' : {//退出
			handle : 'sendGroupQuit',
			args : [ 'gid', 'verifyInfo' ]
		},
		'groupJoinAck' : {//管理员批准/拒绝请求
			handle : 'sendGroupJoinAck',
			args : [ 'gid', 'imid', 'reqSeqId', 'agree', 'rejectReason' ]
		},
		'ackNotify' : {//确认通知获知, 强制quiet
			handle : 'ackNotifyQuiet',
			args : [ 'smrId' ]
		},
		'ackNotifyQuiet' : {//确认通知获知,不会trigger push
			handle : 'ackNotifyQuiet',
			args : [ 'smrId' ]
		},
		'groupAddMember' : {//管理员添加群成员
			handle : 'sendGroupAddMember',
			args : [ 'gid', 'imidList' ]
		},
		'groupDeleteMember' : {//管理员删除群成员
			handle : 'sendGroupDeleteMember',
			args : [ 'gid', 'imidList' ]
		},
		'groupAddManager' : {//群主添加群管理员
			handle : 'sendGroupAddManager',
			args : [ 'gid', 'imidList' ]
		},
		'groupDeleteManager' : {//群主删除群管理员
			handle : 'sendGroupDeleteManager',
			args : [ 'gid', 'imidList' ]
		},
		'contactsGet' : {//获取联系人信息
			handle : function(imidList, cb) {

				adapUtils.fillContactsInfo(this, imidList, cb);
			},
			args : [ 'imidList' ]
		},
		'friendAdd' : {//加好友
			handle : 'sendFriendAdd',
			args : [ 'imid', 'team', 'note', 'verifyInfo' ]
		},
		'friendDelete' : {//删除好友
			handle : 'sendFriendDelete',
			args : [ 'imid', 'verifyInfo' ]
		},
		'friendCreateMultiTeam' : {//创建分组
			handle : 'sendFriendCreateMultiTeam',
			args : [ 'name', 'parentId' ]
		},
		'friendFind' : {//查找好友
			handle : 'sendFriendFind',
			args : [ 'account' ]
		},
		'friendAddAck' : {//同意好友请求
			handle : 'sendFriendAddAck',
			args : [ 'sysSess', 'imid', 'agree', 'rejectReason' ]
		},
		'friendAddAgreeAndAdd' : {//同意好友请求,并同时加对方好友
			handle : 'sendFriendAddAgreeAndAdd',
			args : [ 'sysSess', 'imid', 'team' ]
		},
	};

	function getCmdFunc(cmdInfo) {

		function hcmd(args, userinfo, cb) {

			if (!userinfo || !userinfo.clientId) {
				mylog('Damaged userinfo', userinfo);
				return;
			}

			var im_handle = getImHandleByClientId(userinfo.clientId);
			if (!im_handle) {
				cb(401, null);
				return;
			}

			im_handle = im_handle.IMConnHandler;

			var hargs = [];
			cmdInfo.args && cmdInfo.args.forEach(function(mk) {

				hargs.push(mk in args ? args[mk] : '');
			});
			hargs.push(cb);

			var cmdFunc = (cmdInfo.handle instanceof Function) ? cmdInfo.handle : function() {

				var hfunc = im_handle[cmdInfo.handle], fargs = Array.prototype.slice.apply(arguments);

				var notiSmrId = args['ackNotifySmrId'];

				if (notiSmrId) {

					mylog('ackNoti: ' + notiSmrId);

					im_handle.ackNotifyQuiet(notiSmrId, function() {

						hfunc.apply(im_handle, fargs);
					});

				} else {
					hfunc.apply(im_handle, fargs);
				}
			};

			cmdFunc.apply(im_handle, hargs);
		}

		return hcmd;
	}

	//this will enable cmd communication
	require(__dirname + '/cmdMsgReceiver.js')(fw);
	//require(__dirname  + '/cmdReceiver.js')(fw);

	var cmdRecvr = fw.cmdMsgReceiver;

	for ( var cmd in cmdCfg) {
		cmdRecvr.regCmd(cmd, getCmdFunc(cmdCfg[cmd]));
	}

};

console.log('Loaded "tapAdapCmd" ');
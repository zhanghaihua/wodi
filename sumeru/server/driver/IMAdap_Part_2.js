/**
 * 好友相关协议解析
 * 
 * @author zhangqiang03
 */

var fw = require(__dirname + '/../../src/newPkg.js')();
var dbHandler = fw.getDbHandler();
var getDb = dbHandler.getDbCollectionHandler;
var ObjectId = dbHandler.ObjectId;
var msg = fw.netMessage;

var DOMParser = require('xmldom').DOMParser;
var IMProtocols = require('./IMProtocol.js');

var IMPacket = IMProtocols.IMPacket;
var PTYPE = IMProtocols.PTYPE;

var IMUtils = require('./IMUtils.js');

var getDocument = IMUtils.getDocument;
var copyAttributesToMap = IMUtils.copyAttributesToMap;
var getList = IMUtils.getList;
var getMap = IMUtils.getMap;

var assert = require("assert"), util = require("util");

var path = require('path');

var adapUtils = require('./adapUtils.js');

var dbNotify = adapUtils.dbNotify, getSessionUUID = adapUtils.getSessionUUID;

var htmlSpecialChars = adapUtils.htmlSpecialChars;

var getMemberNameDisplay = adapUtils.getMemberNameDisplay;

var getGroupNameIdDisplay = adapUtils.getGroupNameIdDisplay;

var FriendChangeHelper = require('./friendChangeHandler.js');

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

function isValidFriends(refImid, imid, cb) {

	var dbname = 'hiFriends';

	getDb(dbname, function(err, collection) {

		if (err) {
			mylog('db: ' + dbname, err);
			cb(err, null);
			return;
		}

		collection.findOne({
			imid : imid,
			refImid : refImid,
		//validated : '1'
		}, function(err, item) {

			//mydebug(item);

			cb(err, item != null);
		});
	});
}

dbNotify.regNotifyFilter('myFriendAddNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('%s 加您为联系人。', getMemberNameDisplay(noti.imid, noti.memberInfo, item.imid));
});

dbNotify.regNotifyFilter('friendAddNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('%s %s加您为联系人。', getMemberNameDisplay(noti.imid, noti.memberInfo, item.imid),
			noti.isFriend ? '同时' : '请求');

	if (noti.request_note) {
		noti.displayMsg += '附言: <p tag="request_note">' + htmlSpecialChars(noti.request_note) + '</p>';
	}
});

dbNotify.regNotifyFilter('friendAckNotify', function(item) {

	var noti = item.notify;

	var agree = noti.agree == '1';

	if (agree) {
		noti.displayMsg = util.format('%s 通过了您的身份验证。', getMemberNameDisplay(noti.imid, noti.memberInfo, item.imid));

		if (noti.request_note) {
			noti.displayMsg += '附言: <p tag="request_note">' + htmlSpecialChars(noti.request_note) + '</p>';
		}

	} else {
		noti.displayMsg = util.format('%s 拒绝了您的身份验证。', getMemberNameDisplay(noti.imid, noti.memberInfo, item.imid));

		if (noti.reject_reason) {
			noti.displayMsg += '拒绝理由: <p tag=" reject_reason">' + htmlSpecialChars(noti.reject_reason) + '</p>';
		}
	}

});

module.exports = {
	/**
	 * 被加为好友
	 * 
	 * @param packet
	 */
	onFriendAddNotify : function(packet) {

		mydebug('onFriendAddNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		if (packet.m_mapParams['session'])
			result.session = packet.m_mapParams['session'];

		if (packet.m_mapParams['sys_sess'])
			result.sysSess = packet.m_mapParams['sys_sess'];

		isValidFriends(me._imid, result.imid, function(err, isVf) {

			me.fillContactsInfo([ result.imid ], function(err, memberInfo) {

				result.memberInfo = memberInfo;

				result.isFriend = isVf ? 1 : 0;

				result.validTimeSpanInSecs = 7 * 24 * 3600;

				dbNotify.logNotify(me._imid, 'friend', result.imid, isVf ? 'myFriendAddNotify' : 'friendAddNotify',
						result);
			});
		});

	},
	/**
	 * 好友审核结果
	 * 
	 * @param packet
	 */
	onFriendAckNotify : function(packet) {

		mydebug('onFriendAckNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		if (packet.m_mapParams['session'])
			result.session = packet.m_mapParams['session'];

		me.fillContactsInfo([ result.imid ], function(err, memberInfo) {

			result.memberInfo = memberInfo;

			result.validTimeSpanInSecs = 7 * 24 * 3600;

			dbNotify.logNotify(me._imid, 'friend', result.imid, 'friendAckNotify', result);
		});
	},
	getFriendAddSecurityVerify : function(imid, cb) {

		var me = this;
		me.sendSecurityVerify(2, {
			friend : imid
		}, cb);
	},
	getFriendDeleteSecurityVerify : function(cb) {

		var me = this;
		me.sendSecurityVerify(3, cb);
	},
	/**
	 * 加好友
	 * 
	 * @param imid
	 * @param team
	 * @param note
	 * @param verifyInfo
	 * @param session
	 * @param cb
	 */
	sendFriendAdd : function(imid, team, note, verifyInfo, session, cb) {

		mydebug('sendFriendAdd');

		if (session instanceof Function) {
			cb = session;
			session = null;
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'friend';
		packet.m_strVersion = '1.1';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'add';

		packet.m_mapParams['uid'] = me._imid;

		for ( var vk in verifyInfo) {
			if (vk.indexOf('v_') == 0 && verifyInfo[vk]) {
				packet.m_mapParams[vk] = verifyInfo[vk];
			}
		}

		if (session) {
			packet.m_mapParams['session'] = session;
		}

		var sendDocument = new DOMParser().parseFromString("<add_friend />");
		var sendRoot = sendDocument.documentElement;

		sendRoot.setAttribute('imid', imid);

		sendRoot.setAttribute('team', team);

		sendRoot.setAttribute('time', Math.floor(Date.now() / 1000));

		if (note)
			sendRoot.setAttribute('request_note', note);

		packet.m_strBody = sendRoot.toString();

		packet.m_ackCallback = function(packet) {

			me.onFriendAdd(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onFriendAdd : function(packet, cb) {

		mydebug('onFriendAdd');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onFriendAdd err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	/**
	 * 好友列表变动
	 * 
	 * @param packet
	 */
	onFriendFriendChange : function(packet) {

		mydebug('onFriendFriendChange');

		var me = this;

		var root = getDocument(packet);

		/*
		var sendDocument = new DOMParser()
				.parseFromString('<friend_info uid="812562209"><friend_change_set> \
				<friend imid="812560051" validated="1" change="3" /> \
				</friend_change_set></friend_info>');

		var root = sendDocument.documentElement;
		*/

		var attr = copyAttributesToMap(root);

		if (attr.uid != me._imid) {
			mydebug('Error, onFriendFriendChange uid diff');
		}

		var imid = me._imid;

		FriendChangeHelper.handleRoot(me, imid, root, function(err, result) {

			mydebug('FriendChangeHelper returned');
		});
	},
	/**
	 * 删除好友
	 * 
	 * @param imid
	 * @param verifyInfo
	 * @param cb
	 */
	sendFriendDelete : function(imid, verifyInfo, cb) {

		mydebug('sendFriendDelete');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'friend';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'delete';

		packet.m_mapParams['uid'] = me._imid;

		for ( var vk in verifyInfo) {
			if (vk.indexOf('v_') == 0 && verifyInfo[vk]) {
				packet.m_mapParams[vk] = verifyInfo[vk];
			}
		}

		var sendDocument = new DOMParser().parseFromString("<delete_friend />");
		var sendRoot = sendDocument.documentElement;

		sendRoot.setAttribute('imid', imid);

		packet.m_strBody = sendRoot.toString();

		packet.m_ackCallback = function(packet) {

			me.onFriendDelete(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onFriendDelete : function(packet, cb) {

		mydebug('onFriendDelete');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onFriendDelete err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	/**
	 * 创建好友分组
	 * 
	 * @param name
	 * @param parentId
	 * @param cb
	 */
	sendFriendCreateMultiTeam : function(name, parentId, cb) {

		mydebug('sendFriendCreateMultiTeam');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'friend';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'create_multi_team';

		packet.m_mapParams['uid'] = me._imid;

		var sendDocument = new DOMParser().parseFromString("<team />");
		var sendRoot = sendDocument.documentElement;

		sendRoot.setAttribute('name', name);
		sendRoot.setAttribute('parent_team_id', parentId);

		packet.m_strBody = sendRoot.toString();

		packet.m_ackCallback = function(packet) {

			me.onFriendCreateMultiTeam(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onFriendCreateMultiTeam : function(packet, cb) {

		mydebug('onFriendCreateMultiTeam');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onFriendCreateMultiTeam err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	/**
	 * 查找好友
	 * 
	 * @param account
	 * @param cb
	 */
	sendFriendFind : function(account, cb) {

		mydebug('sendFriendFind');

		if (!account) {
			cb(404, null);
			return;
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'friend';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'find';

		packet.m_mapParams['uid'] = me._imid;

		packet.m_mapParams['account'] = account;

		var isEmail = account.indexOf('@') > 0;// too simple, but enough
		packet.m_mapParams['type'] = isEmail ? 2 : 1;

		packet.m_ackCallback = function(packet) {

			me.onFriendFind(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onFriendFind : function(packet, cb) {

		mydebug('onFriendFind');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onFriendFind err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var imid = packet.m_mapParams['imid'];

		me.fillContactsInfo([ imid ], function(err, memberInfo) {

			cb && cb.call(me, err, memberInfo ? memberInfo[imid] : null);
		});
	},
	sendFriendAddAgreeAndAdd : function(sysSess, imid, team, cb) {

		var me = this, session = getSessionUUID();

		me.sendFriendAddAck(sysSess, imid, 1, false, session, function(err) {

			if (err) {
				//well, this might because the user himself don't need ack such request
				//so go on anyway
			}

			me.getFriendAddSecurityVerify(imid, function(err, verifyInfo) {

				if (err) {
					cb && cb.call(me, err, null);
					return;
				}

				if (!verifyInfo.v_code) {
					//well, this never happen in testing, but...

					mylog('sendFriendAddAgreeAndAdd miss verify v_code!');

					cb && cb.call(me, 401, verifyInfo);

					return;
				}

				me.sendFriendAdd(imid, team, '', verifyInfo, session, function(err) {

					cb(err, null);
				});
			});
		});
	},
	sendFriendAddAck : function(sysSess, imid, agree, rejectReason, session, cb) {

		mydebug('sendFriendAddAck');

		if (session instanceof Function) {
			cb = session;
			session = null;
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'friend';
		packet.m_strVersion = '1.1';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'add_ack';

		packet.m_mapParams['uid'] = me._imid;

		packet.m_mapParams['sys_sess'] = sysSess;

		if (session) {
			packet.m_mapParams['session'] = session;
		}

		var sendDocument = new DOMParser().parseFromString("<add_ack />");
		var sendRoot = sendDocument.documentElement;

		sendRoot.setAttribute('time', Math.floor(Date.now() / 1000));

		sendRoot.setAttribute('imid', imid);
		sendRoot.setAttribute('agree', agree ? 1 : 0);

		if (rejectReason)
			sendRoot.setAttribute('reject_reason', rejectReason);

		packet.m_strBody = sendRoot.toString();

		//mydebug(packet);

		packet.m_ackCallback = function(packet) {

			me.onFriendAddAck(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onFriendAddAck : function(packet, cb) {

		mydebug('onFriendAddAck');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onFriendAddAck err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
};

console.log('Loaded "IMAdap_Part_2" ');
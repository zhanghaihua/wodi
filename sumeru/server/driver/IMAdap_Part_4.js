/**
 * 群相关协议解析
 * 
 * notify信息记录
 * 
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

var IMStreamReader = require('./IMProtocolStreamReader.js');
var BIStream = IMStreamReader.BIStream;

var IMUtils = require('./IMUtils.js');

var getDocument = IMUtils.getDocument;
var copyAttributesToMap = IMUtils.copyAttributesToMap;
var getList = IMUtils.getList;
var getMap = IMUtils.getMap;

var assert = require("assert"), util = require("util");

var path = require('path');

var adapUtils = require('./adapUtils.js');

var dbNotify = adapUtils.dbNotify, fillGroupsInfo = adapUtils.fillGroupsInfo;

var htmlSpecialChars = adapUtils.htmlSpecialChars;

var getMemberNameDisplay = adapUtils.getMemberNameDisplay;

var getGroupNameIdDisplay = adapUtils.getGroupNameIdDisplay;

var FriendChangeHelper = require('./friendChangeHandler.js');

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

function weakIndexOf(arr, ele) {

	var index = -1;

	arr.every(function(e, i) {

		if (e == ele) {
			index = i;
			return false;
		}
	});

	return index;
}

dbNotify.regNotifyFilter('groupDeleteManagerNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('%s 已被取消群 %s 的管理员身份。',
			getMemberNameDisplay(noti.imidList, noti.memberInfo, item.imid), getGroupNameIdDisplay(noti.groupInfo));
});

dbNotify.regNotifyFilter('groupAddManagerNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('%s 已成为群 %s 的管理员。', getMemberNameDisplay(noti.imidList, noti.memberInfo, item.imid),
			getGroupNameIdDisplay(noti.groupInfo));
});

dbNotify.regNotifyFilter('groupDeleteMemberNotify', function(item) {

	var noti = item.notify;

	if (weakIndexOf(noti.imidList, item.imid) >= 0) {

		noti.displayMsg = util.format('%s 已被请出群 %s 。', getMemberNameDisplay(noti.imidList, noti.memberInfo, item.imid),
				getGroupNameIdDisplay(noti.groupInfo));
	} else {

		noti.displayMsg = util.format('%s %s 将 %s 移出群 %s。', (noti.manager == noti.groupInfo.owner ? '群主' : '管理员'),
				getMemberNameDisplay(noti.manager, noti.memberInfo, item.imid), getMemberNameDisplay(noti.imidList,
						noti.memberInfo, item.imid), getGroupNameIdDisplay(noti.groupInfo));
	}
});

dbNotify.regNotifyFilter('groupAddMemberNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('%s %s 将 %s 加入群 %s。', (noti.manager == noti.groupInfo.owner ? '群主' : '管理员'),
			getMemberNameDisplay(noti.manager, noti.memberInfo, item.imid), getMemberNameDisplay(noti.imidList,
					noti.memberInfo, item.imid), getGroupNameIdDisplay(noti.groupInfo));

});

dbNotify.regNotifyFilter('groupJoinNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('用户 %s 申请加入群 %s。', getMemberNameDisplay(noti.applicant, noti.memberInfo, item.imid),
			getGroupNameIdDisplay(noti.groupInfo));

	if (noti.request_note) {
		noti.displayMsg += '附加消息: <p tag="request_note">' + htmlSpecialChars(noti.request_note) + '</p>';
	}
});

dbNotify.regNotifyFilter('groupJoinAckNotify', function(item) {

	var noti = item.notify;

	var agree = noti.agree == '1';

	if (noti.applicant == item.imid) {
		if (agree) {

			noti.displayMsg = util.format('群 %s 已通过 %s 的身份验证，您已加入该群。', getGroupNameIdDisplay(noti.groupInfo),
					getMemberNameDisplay(noti.applicant, noti.memberInfo, item.imid));

		} else {

			noti.displayMsg = util.format('%s 被拒绝加入群 %s 。', getMemberNameDisplay(noti.applicant, noti.memberInfo,
					item.imid), getGroupNameIdDisplay(noti.groupInfo));
		}

	} else {

		if (noti.manager) {

			noti.displayMsg = util.format('%s %s %s %s 加入群 %s。', (noti.manager == noti.groupInfo.owner ? '群主' : '管理员'),
					getMemberNameDisplay(noti.manager, noti.memberInfo, item.imid), agree ? '同意' : '拒绝',
					getMemberNameDisplay(noti.applicant, noti.memberInfo, item.imid),
					getGroupNameIdDisplay(noti.groupInfo));

		} else {

			noti.displayMsg = util.format('%s %s加入群 %s 。', getMemberNameDisplay(noti.applicant, noti.memberInfo,
					item.imid), agree ? '已' : '被拒绝', getGroupNameIdDisplay(noti.groupInfo));
		}
	}

	if (!agree && noti.reject_reason) {
		noti.displayMsg += '附言: <p tag="reject_reason">' + htmlSpecialChars(noti.reject_reason) + '</p>';
	}
});

dbNotify.regNotifyFilter('groupQuitNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = util.format('%s 已退出群 %s 。', getMemberNameDisplay(noti.imid, noti.memberInfo, item.imid),
			getGroupNameIdDisplay(noti.groupInfo));
});

module.exports = {

	updateGroupInfo : function(gid) {

		var me = this;

		mydebug('updateGroupInfo ' + gid);

		me.updateGroup();
	},
	updateGroupMember : function(gid) {

		var me = this;

		mydebug('updateGroupMember ' + gid);

		me.updateGroupList();
	},
	updateGroupList : function() {

		var me = this;
		mydebug('updateGroupList ' + me._imid);

		me.updateGroup();
	},
	updateGroupCardInfo : function(gid, modi) {

		var me = this;

		mydebug('updateGroupCardInfo ' + gid);

		me.updateGroup();

		return;

		mydebug(modi);

		//me.onFriendFriendChange();

		return;

		me.sendGroupGetCard2(gid, 0, function(err, cards) {

			mydebug(err);
			mydebug(cards);

			me.sendGroupGetCard2(gid, cards.timestamp, function(err, cards) {

				mydebug(err);
				mydebug(cards);

			});
		});

		/*
			
		
		me.sendGroupGetMonicker(1408890, function(err, res) {

			mydebug(err);
			mydebug(res);
		});
		
		me.sendGroupGetCard(gid, 36542350, function(err, card) {

			mydebug(err);
			mydebug(card);
		});
		
		if (gid != 1296844) {
			me.updateGroupCardInfo(1296844);
		}*/
	},
	/**
	 * 获取群组信息
	 */
	fillGroupsInfo : function(gidList, cb) {

		fillGroupsInfo(this, gidList, cb);
	},

	/**
	 * 通知记录
	 */
	logGroupNotify : function(gid, tag, noti, cb) {

		var me = this;
		me.fillGroupsInfo(gid, function(err, gInfo) {

			gInfo = gInfo[gid];

			noti.groupInfo = gInfo;

			dbNotify.logNotify(me._imid, 'group', gid, tag, noti, cb);
		});

	},
	logNotify : function(type, typeId, tag, noti, cb) {

		var me = this;
		dbNotify.logNotify(me._imid, type, typeId, tag, noti, cb);
	},
	ackNotify : function(smrId, cb) {

		var me = this;
		dbNotify.ackNotify(me._imid, smrId, cb);
	},
	ackNotifyQuiet : function(smrId, cb) {

		var me = this;
		dbNotify.ackNotifyQuiet(me._imid, smrId, cb);
	},
	regNotifyFilter : function(tag, filter) {

		dbNotify.regNotifyFilter(tag, filter);
	},

	/**
	 * 查找群,加入群前置操作
	 * 
	 * @param gid
	 * @param cb
	 */
	sendGroupFind : function(gid, cb) {

		mydebug('sendGroupFind');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'find';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		packet.m_ackCallback = function(packet) {

			me.onGroupFind(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupFind : function(packet, cb) {

		mydebug('onGroupFind');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupFind err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var root = getDocument(packet), result = copyAttributesToMap(root);

		cb && cb.call(me, null, result);
	},
	getGroupJoinSecurityVerify : function(cb) {

		var me = this;
		me.sendSecurityVerify(8, cb);
	},
	/**
	 * 获取验证码
	 * 
	 * @param type
	 *            VerifyCodeUnknown = 0, VerifyCodeLogin = 1,
	 *            VerifyCodeAddFriend = 2, VerifyCodeDeleteFriend = 3,
	 *            VerifyCodeTransferGroup = 4, VerifyCodeCreateGroup = 5,
	 *            VerifyCodeSendBaiduMsg = 6, VerifyCodeDisbandGroup = 7,
	 *            VerifyCodeJoinGroup = 8, VerifyCodeQuitGroup = 9,
	 *            VerifyCodeSendEmail = 10, VerifyCodeTmpSession = 11
	 * @param cb
	 */
	sendSecurityVerify : function(type, exOpts, cb) {

		mydebug('sendSecurityVerify');

		if (exOpts instanceof Function) {
			cb = exOpts;
			exOpts = null;
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'security';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'verify';

		packet.m_mapParams['uid'] = me._imid;

		//packet.m_mapParams['lid'] = username;

		packet.m_mapParams['type'] = type;

		if (exOpts) {
			for ( var exK in exOpts) {
				packet.m_mapParams[exK] = exOpts[exK];
			}
		}

		packet.m_ackCallback = function(packet) {

			me.onSecurityVerify2(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onSecurityVerify2 : function(packet, cb) {

		mydebug('onSecurityVerify');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onSecurityVerify err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var root = getDocument(packet), result = copyAttributesToMap(root);

		cb && cb.call(me, null, result);
	},
	/**
	 * 请求加入群
	 * 
	 * @param gid
	 * @param note
	 * @param verifyInfo
	 * @param cb
	 */
	sendGroupJoin : function(gid, note, verifyInfo, cb) {

		mydebug('sendGroupJoin');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'join';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		for ( var vk in verifyInfo) {
			if (vk.indexOf('v_') == 0 && verifyInfo[vk]) {
				packet.m_mapParams[vk] = verifyInfo[vk];
			}
		}

		var sendDocument = new DOMParser().parseFromString("<join_group />");
		var sendRoot = sendDocument.documentElement;

		sendRoot.setAttribute('gid', gid);
		sendRoot.setAttribute('time', Math.floor(Date.now() / 1000));

		if (note)
			sendRoot.setAttribute('request_note', note);

		packet.m_strBody = sendRoot.toString();

		packet.m_ackCallback = function(packet) {

			me.onGroupJoin(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupJoin : function(packet, cb) {

		mydebug('onGroupJoin');

		var me = this;

		cb && cb.call(me, packet.m_mapParams.code, null);
	},
	/**
	 * 退出群
	 * 
	 * @param gid
	 * @param verifyInfo
	 * @param cb
	 */
	sendGroupQuit : function(gid, verifyInfo, cb) {

		mydebug('sendGroupQuit');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'quit';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		for ( var vk in verifyInfo) {
			if (vk.indexOf('v_') == 0 && verifyInfo[vk]) {
				packet.m_mapParams[vk] = verifyInfo[vk];
			}
		}

		packet.m_ackCallback = function(packet) {

			me.onGroupQuit(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupQuit : function(packet, cb) {

		mydebug('onGroupQuit');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupQuit err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	/**
	 * 管理员操作,接受/拒绝 入群请求
	 * 
	 * @param gid
	 * @param imid
	 * @param reqSeqId
	 * @param agree
	 * @param rejectReason
	 */
	sendGroupJoinAck : function(gid, imid, reqSeqId, agree, rejectReason, cb) {

		mydebug('sendGroupJoinAck');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'join_ack';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		var sendDocument = new DOMParser().parseFromString("<join_ack />");
		var sendRoot = sendDocument.documentElement;

		sendRoot.setAttribute('gid', gid);
		sendRoot.setAttribute('time', Math.floor(Date.now() / 1000));

		sendRoot.setAttribute('imid', imid);
		sendRoot.setAttribute('agree', agree ? 1 : 0);
		sendRoot.setAttribute('req_seq_id', reqSeqId);

		if (rejectReason)
			sendRoot.setAttribute('reject_reason', rejectReason);

		packet.m_strBody = sendRoot.toString();

		packet.m_ackCallback = function(packet) {

			me.onGroupJoinAck(packet, cb);
		};

		me.m_Conn.sendPacket(packet);

	},
	onGroupJoinAck : function(packet, cb) {

		mydebug('onGroupJoinAck');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupJoinAck err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	sendGroupAddMember : function(gid, imidList, cb) {

		mydebug('sendGroupAddMember');

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'add_member';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		var tmpArr = [];
		tmpArr.push('<add_member gid="' + gid + '">');
		imidList.forEach(function(mid) {

			tmpArr.push('<member imid="' + mid + '"/>');
		});
		tmpArr.push('</add_member>');
		packet.m_strBody = tmpArr.join('');

		packet.m_ackCallback = function(packet) {

			me.onGroupAddMember(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupAddMember : function(packet, cb) {

		mydebug('onGroupAddMember');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupAddMember err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var root = getDocument(packet), mems = getList(root.getElementsByTagName('member'));

		var failedList = [];
		if (mems && mems.length) {
			mems.forEach(function(m) {

				failedList.push(m.imid);
			});
		}

		cb && cb.call(me, null, failedList);
	},
	sendGroupDeleteMember : function(gid, imidList, cb) {

		mydebug('sendGroupDeleteMember');

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'delete_member';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		var tmpArr = [];
		tmpArr.push('<delete_member gid="' + gid + '">');
		imidList.forEach(function(mid) {

			tmpArr.push('<member imid="' + mid + '"/>');
		});
		tmpArr.push('</delete_member>');
		packet.m_strBody = tmpArr.join('');

		packet.m_ackCallback = function(packet) {

			me.onGroupDeleteMember(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupDeleteMember : function(packet, cb) {

		mydebug('onGroupDeleteMember');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupDeleteMember err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	sendGroupAddManager : function(gid, imidList, cb) {

		mydebug('sendGroupAddManager');

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'add_manager';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		var tmpArr = [];
		tmpArr.push('<add_manager gid="' + gid + '">');
		imidList.forEach(function(mid) {

			tmpArr.push('<manager imid="' + mid + '"/>');
		});
		tmpArr.push('</add_manager>');
		packet.m_strBody = tmpArr.join('');

		packet.m_ackCallback = function(packet) {

			me.onGroupAddManager(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupAddManager : function(packet, cb) {

		mydebug('onGroupAddManager');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupAddManager err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	sendGroupDeleteManager : function(gid, imidList, cb) {

		mydebug('sendGroupDeleteManager');

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'delete_manager';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		var tmpArr = [];
		tmpArr.push('<delete_manager gid="' + gid + '">');
		imidList.forEach(function(mid) {

			tmpArr.push('<manager imid="' + mid + '"/>');
		});
		tmpArr.push('</delete_manager>');
		packet.m_strBody = tmpArr.join('');

		packet.m_ackCallback = function(packet) {

			me.onGroupDeleteManager(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupDeleteManager : function(packet, cb) {

		mydebug('onGroupDeleteManager');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupDeleteManager err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	/**
	 * 有成员退出
	 * 
	 * @param packet
	 */
	onGroupQuitNotify : function(packet) {

		mydebug('onGroupQuitNotify');

		var me = this;

		var gid = packet.m_mapParams['gid'];

		me.fillContactsInfo([ packet.m_mapParams['imid'] ], function(err, memberInfo) {

			me.logGroupNotify(gid, 'groupQuitNotify', {
				gid : gid,
				imid : packet.m_mapParams['imid'],
				memberInfo : memberInfo
			});

			me.updateGroupMember(gid);
		});

	},
	/**
	 * 有成员申请加入,管理员操作
	 * 
	 * @param packet
	 */
	onGroupJoinNotify : function(packet) {

		mydebug('onGroupJoinNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		me.fillContactsInfo([ result.applicant ], function(err, memberInfo) {

			result.memberInfo = memberInfo;

			result.validTimeSpanInSecs = 7 * 24 * 3600;

			me.logGroupNotify(result.gid, 'groupJoinNotify', result);
		});
	},
	/**
	 * 成员加入
	 * 
	 * @param packet
	 */
	onGroupJoinAckNotify : function(packet) {

		mydebug('onGroupJoinAckNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		var uIds = [ result.applicant ];
		if (result.manager)
			uIds.push(result.manager);

		me.fillContactsInfo(uIds, function(err, memberInfo) {

			result.memberInfo = memberInfo;

			me.logGroupNotify(result.gid, 'groupJoinAckNotify', result);

			me.updateGroupMember(result.gid);

		});
	},
	onGroupAddMemberNotify : function(packet) {

		mydebug('onGroupAddMemberNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		var mems = getList(root.getElementsByTagName('member'));

		var imidList = [];
		mems.forEach(function(m) {

			imidList.push(m.imid);
		});
		result.imidList = imidList;

		me.fillContactsInfo(imidList.concat(result.manager), function(err, memberInfo) {

			result.memberInfo = memberInfo;

			me.logGroupNotify(result.gid, 'groupAddMemberNotify', result);

			me.updateGroupMember(result.gid);
		});

	},
	onGroupDeleteMemberNotify : function(packet) {

		mydebug('onGroupDeleteMemberNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		var mems = getList(root.getElementsByTagName('member'));

		var imidList = [];
		mems.forEach(function(m) {

			imidList.push(m.imid);
		});
		result.imidList = imidList;

		me.fillContactsInfo(imidList.concat(result.manager), function(err, memberInfo) {

			result.memberInfo = memberInfo;

			me.logGroupNotify(result.gid, 'groupDeleteMemberNotify', result);

			me.updateGroupMember(result.gid);

		});

	},
	onGroupAddManagerNotify : function(packet) {

		mydebug('onGroupAddManagerNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		var mems = getList(root.getElementsByTagName('manager'));

		var imidList = [];
		mems.forEach(function(m) {

			imidList.push(m.imid);
		});
		result.imidList = imidList;

		me.fillContactsInfo(imidList.concat(result.owner), function(err, memberInfo) {

			result.memberInfo = memberInfo;

			me.logGroupNotify(result.gid, 'groupAddManagerNotify', result);

			me.updateGroupInfo(result.gid);
		});

	},
	onGroupDeleteManagerNotify : function(packet) {

		mydebug('onGroupDeleteManagerNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		var mems = getList(root.getElementsByTagName('manager'));

		var imidList = [];
		mems.forEach(function(m) {

			imidList.push(m.imid);
		});
		result.imidList = imidList;

		me.fillContactsInfo(imidList.concat(result.owner), function(err, memberInfo) {

			result.memberInfo = memberInfo;

			me.logGroupNotify(result.gid, 'groupDeleteManagerNotify', result);

			me.updateGroupInfo(result.gid);
		});
	},
	/**
	 * 群信息更新
	 */
	onGroupSetInfoNotify : function(packet) {

		mydebug('onGroupSetInfoNotify');

		var me = this;

		var root = getDocument(packet), result = copyAttributesToMap(root);

		me.updateGroupInfo(result.gid);
	},
	/**
	 * 群名片更新
	 */
	onGroupCardChangeNotify : function(packet) {

		mydebug('onGroupCardChangeNotify');

		var me = this, gid = packet.m_mapParams['gid'];

		var imid = packet.m_mapParams['imid'];

		var root = getDocument(packet), result = copyAttributesToMap(root);

		var cardHash = {};

		cardHash[imid] = result;

		me.updateGroupCardInfo(gid, cardHash);
	},
	/**
	 * 批量获取群名片
	 * 
	 * @param gid
	 * @param cb
	 */
	sendGroupGetCard2 : function(gid, timestamp, cb) {

		var me = this, page = -1, cardsHash = {}, ts = -100;

		function conti(code, result) {

			code = parseInt(code, 10);

			if (result) {

				if (timestamp == result.timestamp) {
					cb(220, null);
					return;
				}

				for ( var uid in result.cards) {
					cardsHash[uid] = (result.cards)[uid];
				}

				if (ts != result.timestamp) {

					ts = result.timestamp;

					mydebug('sendGroupGetCard2 timestamp: ' + result.timestamp + ' old: ' + timestamp);
				}
			}

			switch (code) {

				case 220:
					mydebug('sendGroupGetCard2 code 220 but timestamp not match');
					cb(220, null);
					break;

				case 210:
					me.sendGroupGetCard2ByPage(gid, timestamp, ++page, conti);
					break;

				case 200:
					cb(null, {
						cards : cardsHash,
						timestamp : ts
					});
					break;

				default:
					cb(code, null);
					break;
			}
		}

		conti(210, null);
	},
	/**
	 * 批量获取群名片,分页
	 * 
	 * @param gid
	 * @param page
	 * @param cb
	 */
	sendGroupGetCard2ByPage : function(gid, timestamp, page, cb) {

		mydebug('sendGroupGetCard2');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '2.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'get_card2';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		page = page || 0;

		//mydebug(page);

		packet.m_mapParams['page'] = page;

		//packet.m_mapParams['pagesize '] = 1;

		packet.m_mapParams['timestamp'] = timestamp;

		packet.m_ackCallback = function(packet) {

			me.onGroupGetCard2(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupGetCard2 : function(packet, cb) {

		mydebug('onGroupGetCard2 ' + packet.m_mapParams.code);

		var binData = packet.m_strBody;

		var dataReader = new BIStream(binData, binData.length, 0);

		var cardHash = {};

		while (dataReader.remainingLength() > 0) {
			var uid = dataReader.readUInt32BE();
			var cardLen = dataReader.readUInt32BE();
			var cardInfo = dataReader.readToString(cardLen);

			var tmpPacket = new IMPacket();
			tmpPacket.m_strBody = cardInfo;

			var root = getDocument(tmpPacket), result = copyAttributesToMap(root);

			cardHash[uid] = result;
		}

		cb && cb(packet.m_mapParams.code, {
			cards : cardHash,
			timestamp : packet.m_mapParams.timestamp
		});
	},
	sendGroupGetCard : function(gid, member, cb) {

		mydebug('sendGroupGetCard');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'get_card';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;
		packet.m_mapParams['member'] = member;

		packet.m_ackCallback = function(packet) {

			me.onGroupGetCard(packet, member, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupGetCard : function(packet, member, cb) {

		mydebug('onGroupGetCard');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onGroupGetCard err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var root = getDocument(packet), result = copyAttributesToMap(root);

		cb && cb(null, {
			member : result
		});
	},
	/**
	 * 群备注
	 * 
	 * @param gid
	 * @param cb
	 */
	sendGroupGetMonicker : function(gid, cb) {

		mydebug('sendGroupGetMonicker');

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'group';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'get_monicker';

		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['gid'] = gid;

		packet.m_ackCallback = function(packet) {

			me.onGroupGetMonicker(packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onGroupGetMonicker : function(packet, cb) {

		mydebug('onGroupGetMonicker');

		var me = this;

		if (packet.m_mapParams.code < 200 || packet.m_mapParams.code >= 300) {
			mylog('onGroupGetMonicker err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var root = getDocument(packet);

		var mems = getMap(root.getElementsByTagName('member'), 'imid');

		cb && cb.call(me, null, mems);
	}
};

console.log('Loaded "IMAdap_Part_4" ');

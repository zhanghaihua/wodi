/**
 * 处理多人会话
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

var dbNotify = adapUtils.dbNotify, fillContactsInfo = adapUtils.fillContactsInfo;

var htmlSpecialChars = adapUtils.htmlSpecialChars;

var getMemberNameDisplay = adapUtils.getMemberNameDisplay;

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

function arrayEqual(a1, a2) {

	if (!a1 || !a2)
		return false;

	if (a1.length != a2.length)
		return false;

	return a1.every(function(e, i) {

		return a2[i] == e;
	});
}

function objExtend(obj) {

	if (!obj)
		obj = {};

	var sources = Array.prototype.slice.call(arguments, 1);
	sources.forEach(function(source) {

		if (!source)
			return;

		var prop = null;
		for (prop in source) {
			if (source.hasOwnProperty(prop)) {
				obj[prop] = source[prop];
			}
		}
	});
	return obj;
};

/**
 * get a merged func from a callback array
 * 
 * @param callbacks
 * @returns {Function}
 */
function getMultiCbFunc(callbacks, contxt) {

	contxt = contxt ? contxt : null;

	return function() {

		var args = arguments;

		callbacks.forEach(function(cb) {

			cb && cb.apply(contxt, args);
		});
	};
}

/**
 * db helper handle hiMultiAction
 */
var dbMultiAct = (function() {

	var me = this, dbname = 'hiMultiAction';

	function dbchange() {

		msg.sendLocalMessage({
			modelName : dbname
		}, 'trigger_push');

	}

	function update(imid, multiId, fldVls, cb, notTiggerDb) {

		var trigger = !notTiggerDb ? getMultiCbFunc([ dbchange, cb ]) : cb;

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb(err, null);
				return;
			}

			var obj = {
				imid : imid,
				multiId : multiId,
				quitTime : 0
			};

			collection.findOne(obj, {}, function(err, item) {

				if (item == null) {

					obj = objExtend({
						imid : imid,
						multiId : multiId,
						lastActTime : 0,
						notifyTime : 0,
						operator : 0,
						ackTime : 0,
						quitTime : 0
					}, obj, fldVls);

					obj.createTime = obj.lastModifedTime = Date.now();
					obj.smr_id = ObjectId();

					var mIdArr = [ obj.imid ];

					if (obj.operator)
						mIdArr.push(obj.operator);

					fillContactsInfo(null, mIdArr, function(err, memInfo) {

						if (memInfo) {
							obj.memberInfo = memInfo;
						}
						collection.save(obj, trigger);
					});

				} else {

					objExtend(item, fldVls);

					item.lastModifedTime = Date.now();

					collection.save(item, trigger);
				}
			});
		});
	}

	me.create = function(imid, multiId, cb) {

		update(imid, multiId, {
			notifyTime : 0,
			operator : 0,
			ackTime : Date.now(),
			quitTime : 0
		}, cb);

	};

	me.upLastActTime = function(imid, multiId, cb) {

		update(imid, multiId, {
			lastActTime : Date.now(),
		}, cb);
	};

	me.upNofityTime = function(imid, multiId, operator, cb) {

		update(imid, multiId, {
			notifyTime : Date.now(),
			operator : operator,
			ackTime : 0,
			quitTime : 0
		}, cb, true);
	};

	me.upAckTime = function(imid, multiId, cb) {

		update(imid, multiId, {
			ackTime : Date.now(),
		}, cb);
	};

	me.upQuitTime = function(imid, multiId, cb) {

		update(imid, multiId, {
			quitTime : Date.now(),
		}, false, cb);
	};

	me.delayQuitNotIn = function(multiId, imidList, cb) {

		process.nextTick(function() {

			me.quitNotIn(multiId, imidList, cb);
		});
	};

	me.quitNotIn = function(multiId, imidList, cb) {

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		mydebug('quitNotIn: ' + multiId, imidList);

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb(err, null);
				return;
			}

			var time = Date.now();

			//quit all old multi first
			collection.update({
				multiId : multiId,
				quitTime : 0,
				imid : {
					$nin : imidList
				}
			}, {
				$set : {
					quitTime : time,
					lastModifedTime : time
				}

			}, {
				multi : true,
				safe : !!cb
			}, cb);
		});
	};

	me.findNotQuit = function(imid, cb) {

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb(err, null);
				return;
			}

			var obj = {
				imid : imid,
				quitTime : 0
			};

			collection.find(obj, {}).toArray(function(err, result) {

				var midArr = [];
				result.forEach(function(item) {

					midArr.push(item.multiId);
				});

				cb && cb(err, midArr);
			});
		});
	};

	return me;
})();

/**
 * db helper handle hiMultiInfo
 */
var dbMultiInfo = (function() {

	var me = this, dbname = 'hiMultiInfo';

	function dbchange() {

		msg.sendLocalMessage({
			modelName : dbname
		}, 'trigger_push');
	}

	me.doUpdateImidList = function(multiId, imidList, memInfo, cb) {

		var trigger = getMultiCbFunc([ function() {

			dbMultiAct.delayQuitNotIn(multiId, imidList);
		}, dbchange, cb ]);

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb(err, null);
				return;
			}

			var obj = {
				multiId : multiId
			};

			collection.findOne(obj, {}, function(err, item) {

				if (item == null) {
					//well, just set up this

					obj.imidList = imidList;
					obj.imidCount = imidList.length;

					obj.memberInfo = memInfo;

					obj.createTime = obj.lastModifedTime = Date.now();
					obj.smr_id = ObjectId();

					collection.save(obj, trigger);

				} else {

					if (!arrayEqual(imidList, item.imidList)) {

						item.imidList = imidList;
						item.imidCount = imidList.length;

						item.memberInfo = memInfo;

						item.lastModifedTime = Date.now();

						collection.save(item, trigger);

					} else {
						mydebug('multi list not changed: ' + multiId);
					}
				}
			});

		});

	};

	me.updateImidList = function(handler, multiId, imidList, cb) {

		fillContactsInfo(handler, imidList, function(err, memInfo) {

			me.doUpdateImidList(multiId, imidList, memInfo, cb);
		});
	};

	me.removeMember = function(multiId, imid, cb) {

		var trigger = getMultiCbFunc([ dbchange, cb ]);

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb(err, null);
				return;
			}

			var obj = {
				multiId : multiId
			};

			collection.findOne(obj, {}, function(err, item) {

				if (item == null) {
					mylog('sendMultiQuit err, can not find: ' + JSON.stringify(obj));

				} else {
					var midArr = item.imidList, qpos = midArr.indexOf(imid);

					if (qpos >= 0) {
						midArr.splice(qpos, 1);

						item.imidCount = midArr.length;
						item.imidList = midArr;

						item.lastModifedTime = Date.now();

						collection.save(item, trigger);
					}
				}
			});

		});
	};

	return me;
})();

msg.setReceiver({
	onLocalMessage : {
		target : 'HI_MESSAGE_SEND_ACK',
		handle : function(data) {

			if (!data)
				return;

			var code = parseInt(data.code, 10), msg = data.msg;

			if (!msg || msg.type != 3)
				return;

			console.log('receive HI_MULTI_MESSAGE_SEND_ACK : ' + JSON.stringify(data));

			var imid = msg.from, multiId = msg.to;

			switch (code) {
				case 200:
					dbMultiAct.upLastActTime(imid, multiId);
					break;

				default:
					mylog('multi msg ack err: ' + code);
					break;
			}

		}
	}
});

dbNotify.regNotifyFilter('multiAddNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = getMemberNameDisplay(noti.operator, noti.memberInfo, item.imid) + '把您加入多人会话。';
});

dbNotify.regNotifyFilter('multiNewMemberNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = getMemberNameDisplay(noti.new_member, noti.memberInfo, item.imid) + '已加入多人会话。';
});

dbNotify.regNotifyFilter('multiQuitNotify', function(item) {

	var noti = item.notify;

	noti.displayMsg = getMemberNameDisplay(noti.member, noti.memberInfo, item.imid) + '已退出多人会话。';
});

/**
 * A throttle for sending get_list request
 */
var sendMultiGetListHandler = {};

module.exports = {

	/**
	 * 获取用户信息
	 */
	fillContactsInfo : function(imidList, cb) {

		fillContactsInfo(this, imidList, cb);
	},
	defaultGetMultiListCallback : function(err, result) {

		mydebug('defaultGetMultiListCallback', result);

		if (err) {
			return;
		}
	},
	/**
	 * 
	 * @param imidList,
	 *            the mid list who will be in this multi talk, array | string,
	 *            comma separated
	 */
	sendMultiCreate : function(imidList, cb) {

		mydebug('sendMultiCreate');

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		if (!imidList.length) {
			mylog('sendMultiCreate', 'empty mem list');
			return;
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'multi';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'create';
		packet.m_mapParams['uid'] = me._imid;

		var tmpArr = [];
		tmpArr.push('<member_set>');
		imidList.forEach(function(mid) {

			tmpArr.push('<member imid="' + mid + '"/>');
		});
		tmpArr.push('</member_set>');
		packet.m_strBody = tmpArr.join('');

		packet.m_ackCallback = function(packet) {

			me.onMultiCreate.call(me, packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onMultiCreate : function(packet, cb) {

		mydebug('onMultiCreate');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onMultiCreate err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var multiId = packet.m_mapParams['mid'];

		dbMultiAct.create(me._imid, multiId, function() {

			me.sendMultiGetList(multiId, function(err, result) {

				if (err) {
					//well,  just return an empty list, the client should re-try
					cb && cb.call(me, null, {});
					return;
				}

				cb && cb.call(me, null, result);
			});
		});

	},
	/**
	 * add some one to an exist multi talk
	 * 
	 * @param multiId
	 * @param imidList
	 * @param cb
	 */
	sendMultiAdd : function(multiId, imidList, cb) {

		mydebug('sendMultiAdd');

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		if (!imidList.length) {
			mylog('sendMultiAdd', 'empty mem list');
			return;
		}

		var me = this, packet = new IMPacket();

		packet.m_strCommand = 'multi';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'add';
		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['mid'] = multiId;

		var tmpArr = [];
		tmpArr.push('<member_set>');
		imidList.forEach(function(mid) {

			tmpArr.push('<member imid="' + mid + '"/>');
		});
		tmpArr.push('</member_set>');
		packet.m_strBody = tmpArr.join('');

		packet.m_ackCallback = function(packet) {

			me.onMultiAdd.call(me, packet, cb);
		};

		me.m_Conn.sendPacket(packet);
	},
	onMultiAdd : function(packet, cb) {

		mydebug('onMultiAdd');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onMultiAdd err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		var multiId = packet.m_mapParams['mid'];

		me.sendMultiGetList(multiId, function(err, result) {

			if (err) {
				//well,  just return an empty list, the client should re-try
				cb && cb.call(me, null, {});
				return;
			}

			cb && cb.call(me, null, result);
		});
	},

	/**
	 * get the member list of this multi talk
	 */
	sendMultiGetList : function(multiId, cb) {

		mydebug('sendMultiGetList');

		var me = this;

		//asume that each geting multi list call has exactly the same effect, no matter who trigger this
		var mhkey = multiId;

		//this func might triggered by many events in a very short time, so just make a throttle

		if (!sendMultiGetListHandler[mhkey])
			sendMultiGetListHandler[mhkey] = {
				handler : null,
				callbacks : []
			};

		if (sendMultiGetListHandler[mhkey].handler)
			clearTimeout(sendMultiGetListHandler[mhkey].handler);

		if (cb) {
			sendMultiGetListHandler[mhkey].callbacks.forEach(function(mcb, i, arr) {

				if (mcb == cb) {
					delete arr[i];
				}
			});
			sendMultiGetListHandler[mhkey].callbacks.push(cb);
		}

		sendMultiGetListHandler[mhkey].handler = setTimeout(function() {

			mydebug('doSend', 'sendMultiGetList: ' + multiId);

			var packet = new IMPacket();

			packet.m_strCommand = 'multi';
			packet.m_strVersion = '1.0';
			packet.m_eType = PTYPE.REQ;

			packet.m_mapParams['method'] = 'get_list';
			packet.m_mapParams['uid'] = me._imid;
			packet.m_mapParams['mid'] = multiId;

			var mcb = getMultiCbFunc(sendMultiGetListHandler[mhkey].callbacks);

			packet.m_ackCallback = function(packet) {

				me.onMultiGetList.call(me, packet, mcb);
			};

			me.m_Conn.sendPacket(packet);

			sendMultiGetListHandler[mhkey].handler = null;
			sendMultiGetListHandler[mhkey].callbacks = [];

			delete sendMultiGetListHandler[mhkey];

		}, 200);

	},
	/**
	 * now you got the multi mem list
	 */
	onMultiGetList : function(packet, cb) {

		mydebug('onMultiGetList');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onMultiGetList err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);
			return;
		}

		var root = getDocument(packet);

		var mems = getList(root.getElementsByTagName('member'), "imid");
		if (!mems || !mems.length) {
			//not likely to happen
			mylog('onMultiGetList err: ' + packet.m_strBody);

			cb && cb.call(me, null, {});
			return;
		}

		var imidList = [], multiId = packet.m_mapParams['mid'];
		mems.forEach(function(m) {

			imidList.push(m.imid);
		});

		dbMultiInfo.updateImidList(me, multiId, imidList, function() {

			cb && cb.call(me, null, {
				multiId : multiId,
				imidList : imidList
			});
		});
	},
	/**
	 * tell the server you got the msg that be added to some multi talk
	 */
	sendMultiAddAck : function(multiId) {

		mydebug('sendMultiAddAck');

		var me = this;

		var packet = new IMPacket();

		packet.m_strCommand = 'multi';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'add_ack';
		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['mid'] = multiId;

		packet.m_ackCallback = this.onMultiAddAck.bind(this);

		this.m_Conn.sendPacket(packet);
	},
	/**
	 * now the server know this client is in the multi talk
	 */
	onMultiAddAck : function(packet) {

		mydebug('onMultiAddAck');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onMultiAddAck err: ' + packet.m_mapParams.code);
			return;
		}

		var multiId = packet.m_mapParams['mid'];

		dbMultiAct.upAckTime(me._imid, multiId, function() {

			//actually,the multi list is in this packet body , but we'll still get list change notify events, so
			//just use the sendMultiGetList any way

			me.sendMultiGetList(multiId, me.defaultGetMultiListCallback);
		});
	},
	logMultiNotify : function(mid, tag, noti, cb) {

		var me = this;
		dbNotify.logNotify(me._imid, 'multi', mid, tag, noti, cb);
	},
	/**
	 * when the user is pulled into this multi talk
	 */
	onMultiAddNotify : function(packet) {

		mydebug('onMultiAddNotify');

		var me = this;

		//people will send multi msg to this mid
		var multiId = packet.m_mapParams['mid'];

		var operator = packet.m_mapParams['operator'];

		me.fillContactsInfo([ operator ], function(err, memberInfo) {

			dbMultiAct.upNofityTime(me._imid, multiId, operator, function() {

				me.sendMultiAddAck(multiId);

				me.logMultiNotify(multiId, 'multiAddNotify', {
					mid : multiId,
					operator : operator,
					memberInfo : memberInfo,
					validTimeSpanInSecs : 300
				});
			});
		});
	},
	/**
	 * 
	 * @param packet
	 */
	onMultiNewMemberNotify : function(packet) {

		mydebug('onMultiNewMemberNotify');

		var me = this, multiId = packet.m_mapParams['mid'], newMid = packet.m_mapParams['new_member'];

		me.sendMultiGetList(multiId, function(err, result) {

			me.defaultGetMultiListCallback(err, objExtend({}, result, {
				newMid : newMid
			}));
		});

		me.fillContactsInfo([ newMid ], function(err, memberInfo) {

			me.logMultiNotify(multiId, 'multiNewMemberNotify', {
				mid : multiId,
				new_member : newMid,
				memberInfo : memberInfo,
				validTimeSpanInSecs : 300
			});
		});
	},
	/**
	 * 
	 * @param packet
	 */
	onMultiListChangedNotify : function(packet) {

		mydebug('onMultiListChangedNotify');

		var me = this;

		me.sendMultiGetList(packet.m_mapParams['mid'], me.defaultGetMultiListCallback);
	},
	/**
	 * 
	 * @param packet
	 */
	onMultiQuitNotify : function(packet) {

		mydebug('onMultiQuitNotify');

		var me = this, multiId = packet.m_mapParams['mid'], quitMid = packet.m_mapParams['member'];

		me.sendMultiGetList(multiId, function(err, result) {

			me.defaultGetMultiListCallback(err, objExtend({}, result, {
				quitMid : quitMid
			}));
		});

		me.fillContactsInfo([ quitMid ], function(err, memberInfo) {

			me.logMultiNotify(multiId, 'multiQuitNotify', {
				mid : multiId,
				member : quitMid,
				memberInfo : memberInfo,
				validTimeSpanInSecs : 300
			});
		});
	},
	localMultiQuit : function(multiId) {

		mydebug('localMultiQuit');

		var me = this;

		dbMultiAct.upQuitTime(me._imid, multiId, null);

		dbMultiInfo.removeMember(multiId, me._imid, null);
	},
	/**
	 * quit a multi
	 * 
	 * @param multiId
	 * @param cb
	 */
	sendMultiQuit : function(multiId, cb) {

		mydebug('sendMultiQuit');

		var me = this;

		//don't care the server receive or not, just quit the multi
		me.localMultiQuit(multiId);

		if (!me.m_Conn) {
			mydebug('conn closed');
			return;
		}

		var packet = new IMPacket();

		packet.m_strCommand = 'multi';
		packet.m_strVersion = '1.0';
		packet.m_eType = PTYPE.REQ;

		packet.m_mapParams['method'] = 'quit';
		packet.m_mapParams['uid'] = me._imid;
		packet.m_mapParams['mid'] = multiId;

		packet.m_ackCallback = function(packet) {

			me.onMultiQuit.call(me, packet, cb);
		};

		me.m_Conn.sendPacket(packet);

	},
	onMultiQuit : function(packet, cb) {

		mydebug('onMultiQuit');

		var me = this;

		if (packet.m_mapParams.code != 200) {
			mylog('onMultiQuit err: ' + packet.m_mapParams.code);

			cb && cb.call(me, packet.m_mapParams.code, null);

			return;
		}

		cb && cb.call(me, null, null);
	},
	quitAllMulti : function(cb) {

		//mydebug('quitAllMulti');

		var me = this;

		dbMultiAct.findNotQuit(me._imid, function(err, result) {

			if (err)
				return;

			var midArr = [];
			result.forEach(function(muliId) {

				midArr.push(muliId);

				me.sendMultiQuit(muliId, function() {

					mylog('mq: ' + muliId);
				});
			});

			cb && cb.call(me, null, midArr);
		});

	},
	onClosed : function() {

		//mydebug('onClosed');

		this.quitAllMulti();
	}
};

console.log('Loaded "IMAdap_Part_3" ');

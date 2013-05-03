/**
 * 集中一些公共方法
 */

var fw = require(__dirname + '/../../src/newPkg.js')();
var dbHandler = fw.getDbHandler();
var getDb = dbHandler.getDbCollectionHandler;
var ObjectId = dbHandler.ObjectId;
var msg = fw.netMessage;

var assert = require("assert"), util = require("util");

var path = require('path');

var htmlEncoder = new (require('node-html-encoder').Encoder)('entity');

var dateFormat = require('dateformat');

var LRU = require('lru-cache');

var uuid = require('node-uuid');

function getSessionUUID() {

	return util.format('{%s}', uuid.v4().toUpperCase());
}

function getDisplayDateByTs(time, format) {

	if (!format)
		format = 'yyyy-mm-dd HH:MM:ss';

	return dateFormat(new Date(parseInt(time, 10)), format);
}

function htmlSpecialChars(str) {
    //FIXME 啥也没传进来则啥也不传回去。。
    if(!str){
        return "";
    }
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g,
			'&apos;');

	//return htmlEncoder.htmlEncode(str);
}

function getLogger(defTag) {

	function log(tag, msg, level) {

		if (typeof (msg) == 'undefined') {

			msg = tag;
			tag = defTag;
		}

		if (!level) {
			level = 'log';
		}

		var logFunc = level in console ? console[level] : console.log;

		logFunc(util.format('[%s:%s] %s', tag, level.charAt(0).toUpperCase(), typeof (msg) != 'string' ? util
				.inspect(msg) : msg));
	}

	return {
		log : log,
		error : function(tag, msg, level) {

			log(tag, msg, 'error');
		},
		debug : function(tag, msg, level) {

			log(tag, msg, 'debug');
		}
	};
};

var logger = getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

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
 * html显示一组用户名
 * 
 * @param imidList
 * @param memberInfo
 * @param curImid
 * @returns
 */
function getMemberNameDisplay(imidList, memberInfo, curImid) {

	if (!imidList) {
		mydebug('got empty imidlist in getMemberNameDisplay');
		imidList = '';
	}

	if (!Array.isArray(imidList)) {
		imidList = imidList.split(',');
	}

	var nArr = [];

	imidList.forEach(function(imid) {

		var dispName = '';
		if (imid == curImid) {
			dispName = '您';

		} else {
			var mInfo = memberInfo[imid];
			if (mInfo) {
			    // FIXME 实在没名字可显的情况下，只能以uid充数..测试环境什么都可能没有。
				dispName = mInfo.nickname || mInfo.name || mInfo.baiduid || imid;
			}
		}

		if (!dispName) {
			mylog('Missing meminfo: ' + imid);
		}

		nArr.push('<span tag="member" imid="' + imid + '">' + htmlSpecialChars(dispName) + '</span>');
	});

	return nArr.join(', ');
};

/**
 * html显示群组名
 * 
 * @param gInfo
 * @returns {String}
 */
function getGroupNameIdDisplay(gInfo) {

	return '<span tag="group" gid="' + gInfo.gid + '">' + htmlSpecialChars(gInfo.name + '<' + gInfo.gid + '>')
			+ '</span>';
}

function filterObjFlds(obj, fldsArr) {

	if (!fldsArr)
		return {};

	var nObj = {};

	fldsArr.forEach(function(k) {

		if (obj.hasOwnProperty(k)) {
			nObj[k] = obj[k];
		}
	});

	return nObj;
}
/**
 * 获取联系人信息
 */
var fillContactsInfo = (function() {

	var usInfoHash = new LRU({
		max : 500
	//maxAge : 1000 * 60 * 60
	});

	var usFlds = [ 'baiduid', 'friendly_level', 'head', 'imid', 'info_open_level', 'name', 'nickname', 'sex',
			'timestamp', 'status' ];

	function filterUsInfo(imidList) {

		var uInfo = {};
		imidList.forEach(function(imid) {

			if (usInfoHash.has(imid)) {
				uInfo[imid] = filterObjFlds(usInfoHash.get(imid), usFlds);
			}
		});
		return uInfo;
	}

	function getContacts(handler, imidList, cb) {

		if (!Array.isArray(imidList)) {
			imidList = imidList.split(',');
		}

		getDb('hiContacts', function(err, collection) {

			if (err) {
				mylog('db: hiContacts', err);
				cb(err, null);
				return;
			}

			collection.find({
				imid : {
					$in : imidList
				}
			}, {}).toArray(function(err, items) {

				if (err) {
					mylog('db: hiContacts', err);
					cb(err, null);
					return;
				}

				items.forEach(function(item) {

					delete item.smr_id;
					delete item._id;

					usInfoHash.set(item.imid, item);
				});

				var missedIds = [];
				imidList.forEach(function(imid) {

					if (imid && !usInfoHash.has(imid)) {
						missedIds.push(imid);
					}
				});

				if (handler && missedIds.length) {
					//well, some body is not in the contact db

					var qList = [];
					missedIds.forEach(function(msid) {

						qList.push({
							imid : msid,
							timestamp : 0
						});
					});

					mydebug('get contacts: ' + missedIds.join(','));

					handler.getContaceQuery(qList, function(err, result) {

						if (err) {
							cb(err, filterUsInfo(imidList));
							return;
						}

						result.forEach(function(item) {

							usInfoHash.set(item.imid, item);
						});

						cb(null, filterUsInfo(imidList));
					});

				} else {

					cb(null, filterUsInfo(imidList));
				}

			});
		});
	}

	return getContacts;

})();

/**
 * 获取群组信息
 */
var fillGroupsInfo = (function() {

	var gpInfoHash = new LRU({
		max : 200
	//maxAge : 1000 * 60 * 60
	});

	var gpFlds = [ 'gid', 'name', 'owner', 'head', 'bulletin', 'desc', 'friendly_level' ];

	function filterGpInfo(gidList) {

		var uInfo = {};
		gidList.forEach(function(gid) {

			if (gpInfoHash.has(gid)) {
				uInfo[gid] = filterObjFlds(gpInfoHash.get(gid), gpFlds);
			}
		});
		return uInfo;
	}

	function getGroups(handler, gidList, cb) {

		if (!Array.isArray(gidList)) {
			gidList = gidList.split(',');
		}

		getDb('hiGroups', function(err, collection) {

			if (err) {
				mylog('db: hiGroups', err);
				cb(err, null);
				return;
			}

			collection.find({
				gid : {
					$in : gidList
				}
			}, {}).toArray(function(err, items) {

				if (err) {
					mylog('db: hiGroups', err);
					cb(err, null);
					return;
				}

				items.forEach(function(item) {

					delete item.smr_id;
					delete item._id;

					gpInfoHash.set(item.gid, item.information);
				});

				var missedIds = [];
				gidList.forEach(function(gid) {

					if (gid && !gpInfoHash.has(gid)) {
						missedIds.push(gid);
					}
				});

				if (handler && missedIds.length) {
					//well, some body is not in the contact db

					var qcr = missedIds.length;

					missedIds.forEach(function(msid) {

						handler.getGroupInfo(0, msid, function(err, gInfo) {

							qcr--;

							if (!err) {
								gpInfoHash.set(gInfo.gid, gInfo);
							}

							if (!qcr) {
								cb(null, filterGpInfo(gidList));
							}
						});
					});

				} else {

					cb(null, filterGpInfo(gidList));
				}

			});
		});
	}

	return getGroups;

})();

/**
 * 通知纪录
 */
var dbNotify = (function() {

	var me = this, dbname = 'hiNotify';

	//this is a tmp value for the ackTime, for preventing this noti item be read by pubsub
	var sessTmpAckTime = 7777;

	var delayed_dbchange_handler = null;

	var soon_dbchange_handler = null;

	function dbchange() {

		msg.sendLocalMessage({
			modelName : dbname
		}, 'trigger_push');
	}

	function soon_dbchange() {

		if (soon_dbchange_handler)
			clearTimeout(soon_dbchange_handler);

		soon_dbchange_handler = setTimeout(function() {

			soon_dbchange_handler = null;

			dbchange();

		}, 700);
	}

	/**
	 * some noti get a session field, which means some notis will be grouped
	 * together, this noti will wait some time till all session notis come
	 */
	function delayed_dbchange() {

		if (delayed_dbchange_handler)
			clearTimeout(delayed_dbchange_handler);

		function trigger() {

			mydebug('dbNotify delayed_dbchange');

			dbchange();
		}

		delayed_dbchange_handler = setTimeout(function() {

			delayed_dbchange_handler = null;

			var now = Date.now();

			getDb(dbname, function(err, collection) {

				if (err) {
					trigger();
					return;
				}

				collection.update({
					ackTime : sessTmpAckTime,
					createTime : {
						$lt : now - 1000
					}
				}, {
					$set : {
						ackTime : 0,
						lastModifedTime : now
					}

				}, {
					multi : true,
					safe : !!trigger
				}, trigger);
			});

		}, 3000);
	}

	var tagFilter = {};

	me.regNotifyFilter = function(tag, filter) {

		if (!tagFilter[tag])
			tagFilter[tag] = filter;
		else {
			mylog('notify filter exist for: ' + tag);
		}
	};

	me.removeNotifyFilter = function(tag, filter) {

		delete tagFilter[tag];
	};

	me.callNotifyFilter = function(noti) {

		tagFilter[noti.tag] && (tagFilter[noti.tag])(noti);
	};

	me.logNotify = function(imid, type, typeId, tag, noti, cb) {

		var trigger = getMultiCbFunc([ noti.session ? delayed_dbchange : soon_dbchange, cb ]);

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb && cb(err, null);
				return;
			}

			var obj = {
				imid : imid,
				type : type,
				typeId : typeId,
				tag : tag,
				notify : noti,
				ackTime : noti.session ? sessTmpAckTime : 0
			};

			obj.createTime = obj.lastModifedTime = Date.now();

			obj.notiTime = noti.time ? noti.time * 1000 : obj.createTime;

			obj.notify.displayDate = getDisplayDateByTs(obj.notiTime);

			//通知过期时间
			obj.expireTime = obj.createTime + 1000
					* (obj.notify.validTimeSpanInSecs ? obj.notify.validTimeSpanInSecs : 24 * 3600);

			me.callNotifyFilter(obj);

			obj.smr_id = ObjectId();

			collection.save(obj, trigger);
		});
	};

	me.ackNotifyQuiet = function(imid, smrId, cb) {

		me.ackNotify(imid, smrId, cb, 1);
	};

	me.ackNotify = function(imid, smrIdList, cb, notTiggerDb) {

		var trigger = !notTiggerDb ? getMultiCbFunc([ dbchange, cb ]) : cb;

		getDb(dbname, function(err, collection) {

			if (err) {
				mylog('db: ' + dbname, err);
				cb && cb(err, null);
				return;
			}

			if (!Array.isArray(smrIdList)) {
				smrIdList = smrIdList.split(',');
			}

			smrIdList.forEach(function(item, i, arr) {

				arr[i] = ObjectId(item);
			});

			var time = Date.now();

			collection.update({
				imid : imid,
				ackTime : 0,
				smr_id : {
					$in : smrIdList
				}
			}, {
				$set : {
					ackTime : time,
					lastModifedTime : time
				}

			}, {
				multi : true,
				safe : !!trigger
			}, trigger);

		});
	};

	return me;
})();

module.exports = {
	getSessionUUID : getSessionUUID,
	getLogger : getLogger,
	getMultiCbFunc : getMultiCbFunc,
	getDisplayDateByTs : getDisplayDateByTs,
	htmlSpecialChars : htmlSpecialChars,
	getMemberNameDisplay : getMemberNameDisplay,
	getGroupNameIdDisplay : getGroupNameIdDisplay,
	fillContactsInfo : fillContactsInfo,
	fillGroupsInfo : fillGroupsInfo,
	dbNotify : dbNotify
};

console.log('Loaded "adapUtils" ');
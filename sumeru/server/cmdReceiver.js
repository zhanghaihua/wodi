/**
 * 指令通信支持, 基于pubsub, hiCmd中会存在记录
 * 
 * 与client端cmdHelper.js配合工作
 * 
 * client端:
 * 
 * cmdHelper.sendCmd(cmd, args, function(err, res){ //here is the callback });
 * 
 * 服务端:
 * 
 * fw.cmdReceiver.regCmd(cmd, function(args, userinfo, cb) { //do something
 * cb(err, res); });
 * 
 * 或者用msg.setReceiver注册localmessage, target为HI_CMD_[cmd]
 * 
 * 参见下面的cmdTest1 & cmdTest2
 */

var assert = require("assert"), util = require("util");

var path = require('path');

var adapUtils = require('./driver/adapUtils.js');

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

module.exports = function(fw) {

	var dbHandler = fw.getDbHandler();
	var getDb = dbHandler.getDbCollectionHandler;
	var ObjectId = dbHandler.ObjectId;
	var msg = fw.netMessage;

	var lcMsgPre = 'HI_CMD_', cmdDbName = 'hiCmd';

	var cmdAckFinish = 'ackFinish';

	/**
	 * 更新指令反馈收到的时间
	 */
	function updateAckFinTime(imid, smr_idArr, cb) {

		if (!Array.isArray(smr_idArr)) {
			smr_idArr = smr_idArr.split(',');
		}

		mydebug('updateAckFinTime ' + imid + ': ' + smr_idArr.length);

		smr_idArr.forEach(function(e, i, arr) {

			arr[i] = ObjectId(e);
		});

		getDb(cmdDbName, function(err, collection) {

			if (err) {
				//damn
				mylog(err);
				return;
			}

			collection.update({
				imid : imid,
				smr_id : {
					$in : smr_idArr
				}
			}, {
				$set : {
					finishAckTime : Date.now()
				}

			}, {
				multi : true,
				safe : !!cb
			}, cb);
		});
	}

	var regCmdHash = {};

	function getCmdCbFunc(cmdName, args, callback) {

		return function() {

			mydebug('Call: ' + cmdName);

			callback && callback.apply(null, Array.prototype.slice.apply(arguments).concat(args));
		};
	}

	function regCmdRecvr(cmdName,/* arg1, arg2...*/callback) {

		var args = Array.prototype.slice.apply(arguments);

		var cmdName = args.shift(), callback = args.pop();

		if (regCmdHash[cmdName]) {
			mylog('Waring: ' + cmdName + ' already exists');
		}

		regCmdHash[cmdName] = getCmdCbFunc(cmdName, args, callback);

		mylog('Reg: ' + cmdName);
	}

	function hasRegCmdRecvr(cmdName) {

		return !!regCmdHash[cmdName];
	}

	function cancelRegCmdRecvr(cmdName) {

		delete regCmdHash[cmdName];
	}

	/**
	 * 前端向cmd数据库save一条记录, 用localMessage触发后端操作
	 * 
	 * 操作完成后,数据库记录其返回结果,trigger_push前端更新
	 */
	fw.securePublish(cmdDbName, 'queryCmd', function(userinfo, callback) {

		this.find({
			clientId : userinfo.clientId,
			imid : userinfo.info.imid,
			finishAckTime : 0,
			finishTime : {
				$gt : Date.now() - 60 * 1000
			}
		}, function(err, result) {

			if (err || !result) {
				callback();
				return;
			}

			callback(result);
		});

	}, {

		beforeInsert : function(collection, data, userinfo, callback) {

			mydebug('got cmd: ' + data.cmd);

			data.clientId = userinfo.clientId;

			data.imid = userinfo.info.imid;

			switch (data.cmd) {

				case cmdAckFinish:
					updateAckFinTime(data.imid, data.args);
					break;

				default: {
					data.ackTime = Date.now();

					data.finishAckTime = 0;

					data.__cb = function(err, result) {

						delete data.__cb;

						data.finishTime = Date.now();

						data.result = {
							err : err,
							result : result
						};

						//this will insert this cmd to db, and trigger push
						callback(data);
					};

					if (hasRegCmdRecvr(data.cmd)) {

						var cmdFunc = regCmdHash[data.cmd];

						cmdFunc(data.args, userinfo, data.__cb);

					} else {
						mydebug('send Local Msg: ' + lcMsgPre + data.cmd);
						msg.sendLocalMessage(data, lcMsgPre + data.cmd);
					}
				}
			}
		},

		beforeUpdate : function(collection, data, userinfo, callback) {

			//not supposed

		},
		beforeDelete : function(collection, data, userinfo, callback) {

			//not supposed
		}
	});

	regCmdRecvr('lsCmds', function(args, userinfo, cb) {

		var cmdsArr = [];
		for ( var cmd in regCmdHash) {
			cmdsArr.push({
				cmd : cmd
			});
		}

		cb(null, cmdsArr);
	});

	/**
	 * just a cmd test
	 */
	msg.setReceiver({
		onLocalMessage : {
			target : lcMsgPre + 'cmdTest1',
			handle : function(data) {

				setTimeout(function() {

					data.__cb && data.__cb(null, {

						cmd : data.cmd,
						args : data.args
					});
				}, Math.floor((Math.random() * 1500) + 1000));

			}
		}
	});

	regCmdRecvr('cmdTest2', 'targ1', function(args, userinfo, cb, ta1) {

		setTimeout(function() {

			cb && cb(null, {

				args : args,
				imid : userinfo.info.imid,
				clientId : userinfo.clientId,
				ta1 : ta1
			});
		}, Math.floor((Math.random() * 1500) + 1000));
	});

	fw.cmdReceiver = {
		regCmd : regCmdRecvr,
		cancelReg : cancelRegCmdRecvr,
		hasRegCmd : hasRegCmdRecvr
	};

	console.log('Loaded "cmdReceiver" ');
};
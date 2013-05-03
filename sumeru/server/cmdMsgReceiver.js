/**
 * 指令通信支持, 基于netMessage
 * 
 * 与client端cmdMsgHelper.js配合工作
 * 
 * client端:
 * 
 * cmdMsgHelper.sendCmd(cmd, args, function(err, res){ //here is the callback
 * });
 * 
 * 服务端:
 * 
 * fw.cmdMsgReceiver.regCmd(cmd, function(args, userinfo, cb) { //do something
 * cb(err, res); });
 * 
 */

var assert = require("assert"), util = require("util");

var path = require('path');

var adapUtils = require('./driver/adapUtils.js');

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

module.exports = function(fw) {

	var msg = fw.netMessage;

	var lcMsgPre = 'HI_MSG_CMD_';

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

	function respCmdReq(socketId, err, result, data) {

		msg.sendMessage({
			err : err,
			result : result,
			request : data
		}, 'cmd_response_from_server', socketId, function(e) {

			mylog('send cmd_response_from_server error...');
		}, function() {

			mydebug('Cmd Response: ' + data.cmd);
		});
	}

	msg.setReceiver({
		onMessage : {
			target : 'cmd_request_from_client',
			handle : function(data, type, conn) {

				function respCb(err, result) {

					respCmdReq(conn._sumeru_socket_id, err, result, data);
				}

				if (hasRegCmdRecvr(data.cmd)) {

					var cmdFunc = regCmdHash[data.cmd];
					cmdFunc(data.args, conn.userinfo, respCb);

				} else {
					mydebug('send Local Msg: ' + lcMsgPre + data.cmd);

					msg.sendLocalMessage({
						data : data,
						userinfo : conn.userinfo,
						__cb : respCb
					}, lcMsgPre + data.cmd);
				}
			}
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
			target : lcMsgPre + 'cmdTest3',
			handle : function(prms) {

				var data = prms.data, userinfo = prms.userinfo;

				setTimeout(function() {

					prms.__cb && prms.__cb(null, {

						cmd : data.cmd,
						args : data.args,
						userinfo : userinfo,
					});
				}, Math.floor((Math.random() * 1500) + 1000));

			}
		}
	});

	regCmdRecvr('cmdTest4', 'targ1', function(args, userinfo, cb, ta1) {

		setTimeout(function() {

			cb && cb(null, {

				args : args,
				userinfo : userinfo,
				ta1 : ta1
			});
		}, Math.floor((Math.random() * 1500) + 1000));
	});

	fw.cmdMsgReceiver = {
		regCmd : regCmdRecvr,
		cancelReg : cancelRegCmdRecvr,
		hasRegCmd : hasRegCmdRecvr
	};

	console.log('Loaded "cmdMsgReceiver" ');
};
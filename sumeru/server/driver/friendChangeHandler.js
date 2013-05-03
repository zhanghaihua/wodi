/**
 * 处理onFriendFriendChange
 */
var assert = require("assert"), util = require("util");

var path = require('path');

var fw = require(__dirname + '/../../src/newPkg.js')();
var dbHandler = fw.getDbHandler();
var getDb = dbHandler.getDbCollectionHandler;
var ObjectId = dbHandler.ObjectId;
var msg = fw.netMessage;

var IMUtils = require('./IMUtils.js');

var copyAttributesToMap = IMUtils.copyAttributesToMap;
var getList = IMUtils.getList;
var getMap = IMUtils.getMap;

var adapUtils = require('./adapUtils.js');

var logger = adapUtils.getLogger(path.basename(__filename, '.js'));

var mylog = logger.log, mydebug = logger.debug;

/**
 * now you got a cb, but you need to exec A, B, C, D first
 * 
 * so foreach such exec, you use this cb creator to get a callback, and when all
 * this callback returned, the original cb will be called
 * 
 * @param cb
 * @returns {Function}
 */
function getMultiCbCreator(cb) {

	var cbCt = 0, fErr = null, fRes = [];

	return function cbCreator(options) {

		cbCt++;

		options = options || {};

		return function partCb(err, result) {

			//so it's async always
			process.nextTick(function() {

				cbCt--;

				if (err && options.onError) {
					options.onError(err, null);
				}

				fErr = fErr || err;

				fRes.push(err ? false : result);

				if (!cbCt) {
					cb && cb(fErr, fRes);
				}

			});
		};
	};
}

var dbFriendsHelper = (function() {

	var dbname = 'hiFriends';

	var soon_dbchange_handler = null;

	function dbchange() {

		msg.sendLocalMessage({
			modelName : dbname
		}, 'trigger_push');

		msg.sendLocalMessage({
			modelName : 'hiContacts'
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

	return {

		add : function(obj, cb) {

			var trigger = adapUtils.getMultiCbFunc([ soon_dbchange, cb ]);

			getDb(dbname, function(err, collection) {

				if (err) {
					cb && cb(err, null);
					return;
				}

				obj.smr_id = ObjectId();

				collection.save(obj, trigger);

			});
		},
		del : function(obj, cb) {

			var trigger = adapUtils.getMultiCbFunc([ soon_dbchange, cb ]);

			getDb(dbname, function(err, collection) {

				if (err) {
					cb && cb(err, null);
					return;
				}

				collection.remove({
					imid : obj.imid,
					refImid : obj.refImid
				}, trigger);

			});
		},
		mod : function(obj, cb) {

			var trigger = adapUtils.getMultiCbFunc([ soon_dbchange, cb ]);

			getDb(dbname, function(err, collection) {

				if (err) {
					cb && cb(err, null);
					return;
				}

				collection.findOne({
					imid : obj.imid,
					refImid : obj.refImid
				}, function(err, item) {

					if (item == null) {

						cb && cb(404, null);
						return;
					}

					for ( var j in obj) {
						item[j] = obj[j];
					}

					collection.save(item, trigger);
				});
			});
		}
	};

})();

module.exports = {
	handleRoot : function(handler, refImid, root, cb) {

		var getCb = getMultiCbCreator(cb);

		var tArgs = Array.prototype.slice.call(arguments, 0, -2);

		for ( var i = 0; i < root.childNodes.length; i++) {

			var node = root.childNodes[i];

			if (node.nodeType != 1)
				continue;

			var parts = node.nodeName.split("_"), funcName = '';
			parts.forEach(function(item) {

				funcName += item.substr(0, 1).toUpperCase() + item.substr(1);
			});

			var hfunc = this['handle' + funcName];

			if (hfunc) {
				hfunc.apply(this, tArgs.concat([ node, getCb() ]));

			} else {
				mylog('Error, unknown change set: ' + node.nodeName);

			}
		}

	},
	handleTeamChangeSet : function(handler, refImid, node, cb) {

		mydebug('handleTeamChangeSet');

		var attr = copyAttributesToMap(node);

		//team list normally not very big, so refresh directly
		if (true || attr.reload == '1') {
			handler && handler.updateFriendTeams(cb);
			return;
		}
	},
	handleFriendChangeSet : function(handler, refImid, node, cb) {

		mydebug('handleFriendChangeSet');

		var attr = copyAttributesToMap(node);

		if (attr.reload == '1') {
			handler && handler.getFriendList(null, cb);
			return;
		}

		var getCb = getMultiCbCreator(cb);

		var fNodes = node.getElementsByTagName('friend'), fMap = getMap(fNodes, 'imid');

		for ( var imid in fMap) {

			attr = fMap[imid], change = parseInt(attr.change, 10);

			attr.refImid = refImid;

			delete attr.change;

			switch (change) {

				case 1:
					var tmpCb = getCb();

					//make sure this new mem in db
					adapUtils.fillContactsInfo(handler, [ imid ], function(err, allMemInfo) {

						dbFriendsHelper.add(attr, tmpCb);
					});

					break;

				case 2:
					dbFriendsHelper.del(attr, getCb());
					break;

				case 3:
					dbFriendsHelper.mod(attr, getCb({
						onError : function(err) {

							if (err == 404)
								handler && handler.getFriendList(null, cb);
						}
					}));
					break;

				default:
					mylog('Unkown change type: ' + change);
					break;
			}
		}
	},
	handleBlockChangeSet : function(handler, refImid, node, cb) {

		mydebug('handleBlockChangeSet');

		// TODO: handle block change
	},
};
// module dependencies
var http = require('http'),
url = require('url'),
fs = require('fs');
 
 
/**
* UrlReq - Wraps the http.request function making it nice for unit testing APIs.
*
* @param {string} reqUrl The required url in any form
* @param {object} options An options object (this is optional)
* @param {Function} cb This is passed the 'res' object from your request
*
*/
urlReq = function(reqUrl, options, cb){
	if(typeof options === "function"){ 
		cb = options; 
		options = {}; 
	}// incase no options passed in
	 
	// parse url to chunks
	reqUrl = url.parse(reqUrl);
	 
	// http.request settings
	var settings = {
		host: reqUrl.hostname,
		port: reqUrl.port || 80,
		path: reqUrl.pathname,
		headers: options.headers || {},
		method: options.method || 'GET'
	};
	 
	// if there are params:
	if(options.params){
		if (options.qurl) {
			options.params.req_data_source[0].source_data_len = "" + options.qurl.length;
		}
		options.params = JSON.stringify(options.params);
		if (options.qurl) {
			options.params += "&" + options.qurl;
			
			settings.headers['Tc-Json-Private-Method'] = 'true';
			settings.headers['Tc-Json-Length'] = options.params.length - options.qurl.length - 1;
		}
		
		settings.headers['Content-Type'] = 'application/json';
		settings.headers['Content-Length'] = options.params.length;
	};
	 
	// MAKE THE REQUEST
	var req = http.request(settings);
	 
	// if there are params: write them to the request
	if(options.params){ req.write(options.params); };
	 
	// when the response comes back
	req.on('response', function(res){
		res.body = '';
		//res.setEncoding('utf-8');
		res.setEncoding('binary');
		 
		// concat chunks
		res.on('data', function(chunk){ res.body += chunk;});
		 
		// when the response has finished
		res.on('end', function(){
			// fire callback
			cb(res.body, res);
		});
	});
	
	req.on('error', function(e) {
		  console.log('problem with request: ' + e.message);
	});
	 
	// end the request
	req.end();
};
 

module.exports = function(fw) {
	/*fw.publish("mygame", "queryMygame", function(hostid, gameid, callback) {
		var serverColl = this;
		
		if (hostid && gameid) {
			serverColl.find({host: hostid, gid: gameid}, {}, function(err, items) {
				callback(items);
			});
		}
		else if (hostid) {
			serverColl.find({host: hostid}, {}, function(err, items) {
				callback(items);
			});
		}
		else if (gameid) {
			serverColl.find({gid: gameid}, {}, function(err, items) {
				callback(items);
			});
		}
		else {
			serverColl.find({}, {}, function(err, items) {
				callback(items);
			});
		}
	});*/
	
	fw.publish("mygame", "queryMygame", function(hostid, callback) {
		var serverColl = this;
		
		if (hostid) {
			serverColl.find({host: hostid}, {}, function(err, items) {
				callback(items);
			});
		}
		else {
			serverColl.find({}, {}, function(err, items) {
				callback(items);
			});
		}
	},{
        beforeInsert : function(serverCollection, structData, userinfo, callback){
            //structData.clientId = clientId;
            // 删除附加的多余数据
            //delete structData.clientId;
            
        	urlReq('http://10.48.237.34:8091/timgext?', {
				method: 'POST',
				params: {
					authorid:"012345",
					authorkey:"timgextkey",
					req_data_num:"1",
					process_type:"0",
					res_data_type:"0",
					req_data_source:[{http_reqpack:{},
					                	 sourcemethod:"BODY",
					                	 source_data_len:"0",
					                	 operations:{size:"4", version:"4", level:"4",margin:"4",foreground:"000000", background:"FFFFFF", structured:"0"}
					                   }]
				},
				qurl: structData.url
			}, function(body, res){
				console.log(body.length);
				var imagepath = process.dstDir;
				var imagename =  "/hiUpload/";
				imagename += fw.utils.randomStr(6);
				imagename += ".png";
				var pathname = imagepath + imagename;
				
				fs.writeFile(pathname, body, 'binary', function(err){
				    if (err) {
				    	console.log(pathname + ':File saved. error!');
				    }
				    else {
				    	console.log(pathname + ': File saved.');
				    	structData.uri = imagename;
				    }
				    
				    callback(structData);
				});
			});
        },
        afterInsert : function(serverCollection, structData,userinfo){
        },
        beforeDelete : function(serverCollection, structData, userinfo,  callback){
            callback();
        },
        beforeUpdate : function(serverCollection, structData, userinfo, callback){
            callback();
        },
        onPubEnd : function(serverCollection){
        }
    });
	
	
	fw.publish("mypartner", "queryMypartner", function(gameid, callback) {
		var serverColl = this;
		serverColl.find({gid: gameid}, {}, function(err, items) {
			callback(items);
		});
	});
	
	fw.publish("mypartner", "queryMyself", function(gameid, partnerId, callback) {
		var serverColl = this;
		serverColl.find({gid: gameid, pid: partnerId}, {}, function(err, items) {
			callback(items);
		});
	},
	{
        beforeInsert : function(serverCollection, structData, userinfo, callback){ 
        	callback(structData);
        },
        afterInsert : function(serverCollection, structData,userinfo){
        },
        beforeDelete : function(serverCollection, structData, userinfo,  callback){
            callback();
        },
        beforeUpdate : function(serverCollection, structData, userinfo, callback){
            callback();
        },
        onPubEnd : function(serverCollection){
        	console.log("onPubEnd");
        }
	});
	
	fw.publish("myword", "queryMyword", function(callback) {
		var serverColl = this;
		serverColl.find({}, {}, function(err, items) {
			callback(items);
		});
	});
	
	
};


var globalConfig = function(fw){
    
    var socketPort = 8081;
    var mongoServer = '127.0.0.1';
    var mongoPort = 27017;//8819;
    var httpServerPort = 8080;
    var dbname = 'test';
    var whiteList = ['xdr-streaming', 'xhr-streaming', 'iframe-eventsource', 'iframe-htmlfile', 'xdr-polling', 'xhr-polling', 'iframe-xhr-polling', 'jsonp-polling'];	
    
    // BAE CONFIG    
    if (typeof process !== 'undefined' && typeof process.BAE !== 'undefined'){
        socketPort = process.env.APP_PORT;
        mongoServer = '';
        mongoPort = 0;
        httpServerPort = 0;
        whiteList = ['xhr-streaming'];
    }
   
    fw.config.defineModule('cluster');
    fw.config.cluster({
        enable : true,
        cluster_mgr : '127.0.0.1',
        cluster_mgr_port : 6379
    });
   
    fw.config({
    	soketPort: socketPort,
	    dbname : dbname,
    	mongoServer: mongoServer,
    	mongoPort: mongoPort,
	    bae_user: '',
	    bae_password: '',
    	httpServerPort: httpServerPort,
    	protocols_whitelist : whiteList,
    	view_from_cache:true
    });

    fw.config({
        clientValidation: true,
        serverValidation: true
    });
    
    if (typeof location != 'undefined') {
        var clientSocketServer = location.hostname + ':' + socketPort + '/socket/';
        
        // BAE CONFIG    
    	//if (typeof process !== 'undefined' && typeof process.BAE !== 'undefined'){
        //	clientSocketServer = location.hostname + '/socket/';//BAE CONFIG
      	//}
      	if (!location.port) {
        	clientSocketServer = location.hostname + '/socket/';//BAE CONFIG	
        }	


    	fw.config({
                clientSocketServer: clientSocketServer,
                selfGroupManagerAddr:'0.0.0.0',
                selfGroupManagerPort:'8089',
    	});
    };
    
    if (typeof exports != 'undefined' && typeof module !='undefined'){
	var configPath = process.dstDir + '/server/tmp/config';
	fw.config({
	    configPath : configPath,
	});
    }
    
    var viewConfig = fw.config.defineModule('view');
    viewConfig({path : '/'});
}
//for node
if(typeof module !='undefined' && module.exports){
    module.exports = globalConfig;
}else{
    globalConfig(sumeru);
}

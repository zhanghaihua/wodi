App.gameHost = sumeru.controller.create(function(env, session, params){
	var myview = "gamehost";
	var on = Library.touch.on;
	
	var partnerId = localStorage['_partnerId'];
    if(!partnerId){
    	localStorage['_partnerId'] = partnerId = sumeru.utils.randomStr(4);
    }
    session.setIfNull('partnerId', partnerId);
    
    var queryPartners = function(gameid){
        session.queryPartners = env.subscribe('queryMypartner', gameid,  function(collection, info){
        });
    };
    
	var queryMygames = function() {
	    
		session.queryGames = env.subscribe("queryMygame", partnerId, function(collection, info){
			var mygames = collection.find().getData();
			var owngame =  mygames.length > 0;
			
			if (owngame && !session.queryPartners) {
				queryPartners(mygames[0].gid);
			}
			session.bind("gamelist", {
				havegame: owngame,
				data: mygames 
			});
		});
	};
	    
	env.onload = function() {
		return [queryMygames];
	};

	env.onrender = function(doRender){
		doRender(myview, ['push','left']);
	};

	env.onready = function(rootBlock) {
		session.event('gamelist', function() {
			var addgameform = rootBlock.querySelector('#addMygame');
	        if (addgameform) {
	        	
	        	on(addgameform,'submit',function(e){
		            e.preventDefault();
		            
		            var partnerId = session.get('partnerId');
		            var gameid = sumeru.utils.randomStr(6);
		            
		            var gameurl = "http://" + location.host + location.pathname;
	                gameurl += '#/game';
	                gameurl += "!" + sumeru.utils.mapToUriParam({gid: gameid, host: partnerId}) + "&";
	                
	            	/*
	            	{name: "gid", type: "string"}, //游戏标识ID
					{name: "gname", type: "string"}, //游戏名字
					{name: "creator", type: "string"}, //创造者
					{name: "host", type: "string"}, //主持人
					{name: "url", type: "string"}, //游戏url
					{name: "uri", type: "string"}, //游戏二维码图url
					{name: "status", type: "string"}, //游戏状态：create,active,over
					{name: "time", type: "datetime", defaultValue: "now()"} //游戏创建时间
	            	*/
		            
	            	var myaddgame = {
	            			gid: gameid,
	            			gname : "wodi",
	            			status : "create",
	            			creator : partnerId,
	            			host : partnerId,
	            			url: gameurl,
	            			uri: "",
	            			status: "create"
	            	};
	                session.queryGames.add(myaddgame);
	                session.queryGames.save();
	                
		            return false;
	        	});
	        }
	        
			var myapplist = rootBlock.querySelector('#mygamelist');
			if (myapplist) {
		    	function doaction(e){
		    		e.preventDefault();
		    		var gameid = this.getAttribute("id");
		    		
		    		if (gameid) {
		    			var mygame = session.queryGames.find({gid: gameid});
		    			if (mygame.length > 0)
		    				env.redirect('/game', {gid: mygame[0].getData().gid, host: mygame[0].getData().host}, true);
		    		}
		            
		            return false;
		        };
		    	
		        var myalist = myapplist.querySelectorAll('a.thumbnail');
		    	for(var i = 0; i < myalist.length; i++) {
		    		myalist[i].addEventListener("click", doaction);
		    	};
		    	
		    	function dodelete(e){
		    		e.preventDefault();
		    		var gameid = this.getAttribute("id");
		    		if (gameid) {
		    			if (session.queryPartners) {
		    				session.queryPartners.destroy({gid: gameid});
		    				session.queryPartners.save();
		    			}
		    			
		    			session.queryGames.destroy({gid: gameid});
		    			session.queryGames.save();
		    		}
		            
		            return false;
		        };
		        
		        var myadellist = myapplist.querySelectorAll('a.btn');
		    	for(var i = 0; i < myadellist.length; i++) {
		    		myadellist[i].addEventListener("click", dodelete);
		    	};
			}
    	});
	};

	env.onerror = function() {
	};
});


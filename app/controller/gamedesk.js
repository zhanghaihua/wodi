App.gameDesk = sumeru.controller.create(function(env, session, params){
	var view = "gamedesk";
	var on = Library.touch.on;
	
	var partnerId = localStorage['_partnerId'];
    if(!partnerId){
    	localStorage['_partnerId'] = partnerId = sumeru.utils.randomStr(4);
    }
    session.setIfNull('partnerId', partnerId);
    
    var queryWords = function() {
		session.queryWords = env.subscribe("queryMyword", function(collection, info){
			if (collection.length < 1) {
				/*
				 * http://www.indiacn.com/zixun/nethot/592.html
				 */
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "王菲", sndword: "那英"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "端午节", sndword: "中秋节"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "节节高升", sndword: "票房大卖"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "摩托车", sndword: "电动车"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "反弹琵琶", sndword: "乱弹棉花"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "麻雀", sndword: "乌鸦"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "高跟鞋", sndword: "增高鞋"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "胖子", sndword: "肥肉"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "汉堡包", sndword: "肉夹馍"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "眉毛", sndword: "胡须"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "小矮人", sndword: "葫芦娃"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "何炅", sndword: "维嘉"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "蜘蛛侠", sndword: "蜘蛛精"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "状元", sndword: "冠军"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "饺子", sndword: "包子"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "气泡", sndword: "水泡"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "老佛爷", sndword: "老天爷"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "十面埋伏", sndword: "四面楚歌"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "纸巾", sndword: "手帕"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "魔术师", sndword: "魔法师"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "杭州", sndword: "苏州"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "谢娜张杰", sndword: "邓超孙俪"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "双胞胎", sndword: "龙凤胎"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "首尔", sndword: "东京"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "情人节", sndword: "光棍节"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "贵妃醉酒", sndword: "黛玉葬花"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "橙子", sndword: "橘子"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "富二代", sndword: "高富帅"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "神雕侠侣", sndword: "天龙八部"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "太监", sndword: "人妖"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "生活费", sndword: "零花钱"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "天天向上", sndword: "非诚勿扰"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "蝴蝶", sndword: "蜜蜂"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "麦克风", sndword: "扩音器"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "勇往直前", sndword: "全力以赴"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "小品", sndword: "话剧"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "郭德纲", sndword: "周立波"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "鱼香肉丝", sndword: "四喜丸子"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "裸婚", sndword: "闪婚"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "图书馆", sndword: "图书店"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "麻婆豆腐", sndword: "皮蛋豆腐"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "新年", sndword: "跨年"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "男朋友", sndword: "前男友"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "语无伦次", sndword: "词不达意"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "吉他", sndword: "琵琶"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "洗衣粉", sndword: "皂角粉"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "鼠目寸光", sndword: "井底之蛙"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "公交", sndword: "地铁"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "牛肉干", sndword: "猪肉脯"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "泡泡糖", sndword: "棒棒糖"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "美人心计", sndword: "倾世皇妃"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "童话", sndword: "神话"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "作家", sndword: "编剧"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "土豆粉", sndword: "酸辣粉"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "果粒橙", sndword: "鲜橙多"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "警察", sndword: "捕快"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "结婚", sndword: "订婚"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "口香糖", sndword: "木糖醇"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "洗发露", sndword: "护发素"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "奖牌", sndword: "金牌"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "酸菜鱼", sndword: "水煮鱼"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "自行车", sndword: "电动车"});
				
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "孟飞", sndword: "乐嘉"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "小笼包", sndword: "灌汤包"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "班主任", sndword: "辅导员"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "那英", sndword: "韩红"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "面包", sndword: "蛋糕"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "油条", sndword: "麻花"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "作文", sndword: "论文"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "同学", sndword: "同桌"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "甄嬛传", sndword: "红楼梦"});
				
				/*
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});
				session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: "桂圆", sndword: "荔枝"});*/
				
				session.queryWords.save();
			}
		});
	};
	
    var queryMygame = function() {
		session.queryGame = env.subscribe("queryMygame", params.host, function(collection, info){
			var mygames = collection.find({gid: params.gid});

			if (mygames.length > 0) 
			{
				if (!session.queryPartners)
					queryPartners();
				
				if (!session.queryMe)
					queryMe();
				
			}
			else {
				session.bind('userdetails', {
	            	gamename: "游戏已结束",
	            	gameexist: false,
	            	isLogin: false,
	            	isHost: false,
	            	isgaming: false,
	            	gamehost: "",
	            	gameword: "",
	            	gamestatus: "",
	            });
				/*
				session.bind('partnerdetails', {
	            	gamename: "游戏已结束",
	            	gameexist: false,
	            	isLogin: false,
	            	isHost: false,
	            	isgaming: false,
	            	gamehost: "",
	            	gameword: "",
	            	gamestatus: "",
	                data : []
	            });*/
			}
			
		});
	};
	
	var queryMe = function(){
	    
        session.queryMe = env.subscribe('queryMyself', params.gid,  partnerId, function(collection, info){
            var partners = collection.find().getData();

            var mygames = session.queryGame.find().getData();
            var mygame = mygames[0];
            var hostisme = false;//partnerId == params.host;
            var hostname = partnerId;
            
            var addme = false;
            var gword = "";
            var gstatus ="";
            
            var myuser = collection.find();
            if (myuser.length > 0) {
            	addme = true;
            	hostname = partners[0].pname;
            	
            	if (partners[0].role == "主持人") {
        			hostisme = true;
        		}
            	
            	gword = partners[0].gword;
            	gstatus = partners[0].status;
            }
            
            session.bind('userdetails', {
            	gamename: "谁是卧底",
            	gameexist: true,
            	isLogin: addme,
            	isHost: hostisme,
            	isgaming: mygame ? mygame.status == "active" : false,
            	gamehost: hostname,
            	gameword: gword,
            	gamestatus: gstatus,
            });
            
        });
    };
    
    var queryPartners = function(){
	    
        session.queryPartners = env.subscribe('queryMypartner', params.gid,  function(collection, info){
            var partners = collection.find().getData();
            var users = [];
            var users2 = [];
            
            var mygames = session.queryGame.find().getData();
            var mygame = mygames[0];
            var hostisme = false;//partnerId == params.host;
            var hostname = partnerId;
            
            var addme = false;
            var gword = "";
            var gstatus ="";
            var myuser = collection.find({pid: partnerId});
            if (myuser.length > 0) {
            	gword = myuser[0].getData().gword;
            	gstatus = myuser[0].getData().status;
            }
            
            for(var i = 0; i < partners.length; i++) {
            	var pp = partners[i];
            	if (partnerId == pp.pid) {
            		hostname = pp.pname;
            		addme = true;
            		
            		if (pp.role == "主持人") {
            			hostisme = true;
            		}
            		else {
            			users.push(pp);
            			if (!pp.kickedout) {
            				if (pp.status == "被投死") {
            					pp.dead = true;
            				}
            				else {
            					pp.dead = false;
            				}
            				users2.push(pp);
            			}
            		}
            	}
            	else {
            		users.push(pp);
            		if (!pp.kickedout) {
            			if (pp.status == "被投死") {
        					pp.dead = true;
        				}
        				else {
        					pp.dead = false;
        				}
            			
            			users2.push(pp);
            		}
            	}
            }
            
            session.bind('partnerdetails', {
            	gamename: "谁是卧底",
            	gameexist: true,
            	isLogin: addme,
            	isHost: hostisme,
            	isgaming: mygame ? mygame.status == "active" : false,
            	gamehost: hostname,
            	gameword: gword,
            	gamestatus: gstatus,
                data : users,//partners,
                follows: users2
            });
            
        });
    };
    
	env.onload = function(){
        return [queryMygame, queryWords];
    };
    
    env.onrender = function(doRender){
        doRender(view, ['push','right']);
    };

    env.onerror = function(){
    };
    
    env.onready = function(rootBlock){
    	
    	function gameover() {
    		var host = session.queryPartners.find({role: "主持人"});
            
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
            session.queryGame.update({status: "over"});
            session.queryGame.save();
            
            /*
        	{name: "gid", type: "string"}, //游戏标识ID
    		{name: "pid", type: "string"}, //partner id
    		{name: "pname", type: "string"}, //partner name
    		{name: "kickedout", type: "boolean", defaultValue: false}, //被踢
    		{name: "status", type: "string"}, //参与者状态：等待游戏,正在游戏,被投死
    		{name: "role", type: "string"}, //游戏角色: 主持人,卧底,平民,待分配
    		{name: "gword", type: "string"}, //游戏词条
    		{name: "time", type: "datetime", defaultValue: "now()"} //第一次加入的时间
        	*/
            //session.queryPartners.update({role: "平民", status: "等待游戏", gword: ""}, {pid: {$ne: host[0].pid}});
            session.queryPartners.update({role: "待分配", status: "等待游戏", gword: ""}, {kickedout: false});
            session.queryPartners.update({role: "主持人"}, {pid: host[0].pid});
            session.queryPartners.save();
    	}
        
    	session.event('userdetails', function() {
    		var adduserform = rootBlock.querySelector('#addUser');
	        if (adduserform) {
	        	var inputs = adduserform.querySelectorAll('input');
		        var usernameInput = inputs[0];
		        
	        	on(adduserform,'submit',function(e){
		            e.preventDefault();
		            var username = usernameInput.value;
		            
		            if(username){
	                	/*
	                	{name: "gid", type: "string"}, //游戏标识ID
	    				{name: "pid", type: "string"}, //partner id
	    				{name: "pname", type: "string"}, //partner name
	    				{name: "kickedout", type: "boolean", defaultValue: false}, //被踢
	    				{name: "status", type: "string"}, //参与者状态：等待游戏,正在游戏,被投死
	    				{name: "role", type: "string"}, //游戏角色:主持人,卧底,平民
	    				{name: "gword", type: "string"}, //游戏词条
	    				{name: "time", type: "datetime", defaultValue: "now()"} //第一次加入的时间
	                	*/
	                	var myself = {
	                		gid: params.gid,
	                		pid : partnerId,//sumeru.utils.randomStr(4),
	                		pname: username,
	                		kickedout: false,
	                		status: "等待游戏",
	                		role: partnerId == params.host ? "主持人" : "待分配",
	                		gword: ""
	                	};
	                    session.queryPartners.add(myself);
	                    session.queryPartners.save();
		            	
		            	usernameInput.value = "";
			            //usernameInput.style.display = "none";
		           }
		            return false;
	        	});
	        }
	        
	        //////////////////////////////////////////////////////////////////
    		var wordform = rootBlock.querySelector('#randomword');
	        if (wordform) {
	        	var inputs = wordform.querySelectorAll('input');
		        var wodiInput = inputs[0],
		            pingmiInput = inputs[1],
		            randomInput = inputs[2];
		        
	        	on(wordform,'submit',function(e){
		            e.preventDefault();
		            
		            var wordindex = sumeru.utils.randomInt(0, session.queryWords.length-1);
		            var wodiword = session.queryWords[wordindex].fstword;
		            var pingmiword = session.queryWords[wordindex].sndword;
		            
	                wodiInput.value = wodiword;
		            pingmiInput.value = pingmiword;
		            randomInput.value = "1";
		            //wordform.style.display = "none";

		            return false;
	        	});
	        }
    		
		});	//session.event
    	
    	session.event('partnerdetails', function() {
    		//var partnerId = session.get('partnerId');
    		
    		//////////////////////////////////////////////////////////////////
    		var distributeform = rootBlock.querySelector('#distribute');
	        if (distributeform) {
	        	
		        
	        	on(distributeform,'submit',function(e){
		            e.preventDefault();
		            
		            var wordform = rootBlock.querySelector('#randomword');
		            if (!wordform)
		            	return false;
		            
		            var inputs = wordform.querySelectorAll('input');
			        var wodiInput = inputs[0],
			            pingmiInput = inputs[1],
			            randomInput = inputs[2];
		            
		            var wodiword = wodiInput.value;
		            var pingmiword = pingmiInput.value;
		            var myoptions = distributeform.elements["userselect"].options;
		            
		            //var selected_index = distributeform.elements["userselect"].selectedIndex;
		            //var wodiid = distributeform.elements["userselect"].options[selected_index].value;
		            //button.disabled = true;
		            
		            if(wodiword && pingmiword && myoptions.length > 1){
		            	session.queryGame.update({status: "active"});
			            session.queryGame.save();
			            
			            var selected_index = distributeform.elements["userselect"].selectedIndex;
			            var wodiid = distributeform.elements["userselect"].options[selected_index].value;
			            
			            if (wodiid == "random") {
			            	var index = sumeru.utils.randomInt(1, myoptions.length-1);
			            	wodiid = myoptions[index].value;
			            }
			            
		            	/*
		            	{name: "gid", type: "string"}, //游戏标识ID
						{name: "pid", type: "string"}, //partner id
						{name: "pname", type: "string"}, //partner name
						{name: "kickedout", type: "boolean", defaultValue: false}, //被踢
						{name: "status", type: "string"}, //参与者状态：等待游戏,正在游戏,被投死
						{name: "role", type: "string"}, //游戏角色: 主持人,卧底,平民,待分配
						{name: "gword", type: "string"}, //游戏词条
						{name: "time", type: "datetime", defaultValue: "now()"} //第一次加入的时间
		            	*/
			            session.queryPartners.update({status: "正在游戏"}, {kickedout: false});
		                session.queryPartners.update({role: "平民", gword: pingmiword}, {kickedout: false, role: "待分配"});
		                session.queryPartners.update({role: "卧底", gword: wodiword}, {pid: wodiid});
		                session.queryPartners.save();
		                
		                if (randomInput.value == "0") {
		                	//session.queryWords.add({wid: sumeru.utils.randomStr(8), fstword: wodiword, sndword: pingmiword});
		                	//session.queryWords.save();
		                }
		                wodiInput.value = "";
			            pingmiInput.value = "";
			            randomInput.value = "0";
		                distributeform.style.display = "none";
		           }
		            return false;
	        	});
	        }
	        
	        var endgameform = rootBlock.querySelector('#endgame');
	        if (endgameform) {
	        	on(endgameform,'submit',function(e){
		            e.preventDefault();
		            
		            gameover();
		                
		            return false;
	        	});
	        }
	        
			var mypartners = rootBlock.querySelector('#mypartners');
			
			if (mypartners) {
				function douserdelete(e){
		            //e.originEvent.preventDefault();
		    		e.preventDefault();
		    		this.disabled = true;
		    		
		    		var userid = this.getAttribute("id");
		    		
		    		 var mygames = session.queryGame.find().getData();
		             var mygame = mygames[0];
		             
		             if (mygame.status == "active") {
		            	 var myuser = session.queryPartners.find({pid: userid});
		                 
	                     if (myuser.length > 0) {
	                    	 session.queryPartners.update({status: "被投死"}, {pid: userid});
	 			    		 //session.queryPartners.save();
	                    	 if (myuser[0].role == "卧底") {
								gameover();
							}
							else {
								session.queryPartners.save();
							}
	                    }
		             }
		             else {
		            	 if (this.hasAttribute("host")) {
		            		session.queryPartners.update({role: "待分配"}, {role: "主持人"});
		            		session.queryPartners.update({role: "主持人"}, {pid: userid});
							session.queryPartners.save();
		            	 }
		            	 else if (this.hasAttribute("kickedout")) {
		                    session.queryPartners.update({kickedout: true, status: "被踢出"}, {pid: userid});
							session.queryPartners.save();
		            	 }
		            	 else if (this.hasAttribute("addme")) {
		            		session.queryPartners.update({kickedout: false, status: "待分配"}, {pid: userid});
						    session.queryPartners.save();
		            	 }
		             }
		    		
		            return false;
		        }
		    	
		        
		    	//var myalist = mypartners.querySelectorAll('input');
				var myalist = mypartners.querySelectorAll('a');
		    	for(var i = 0; i < myalist.length; i++) {
		    		myalist[i].addEventListener("click", douserdelete);
		    	}
			}
		});	
    };
});


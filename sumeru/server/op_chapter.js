 var mongodb = require('mongodb');
 var server = new mongodb.Server('10.40.45.55', 8819, {});
 var db = new mongodb.Db('test', server, {});

 var fs = require('fs');

 function F_elem(fileno,coll_db){
	   var file_json = '/home/work/webapphi/hackathon/frxxz/'+fileno+'.json';    
	   console.log('file='+file_json);    
     var m_coll = coll_db;
     this.readff = function(){
     		fs.readFile(file_json, file_callback);
     	};
     function file_callback(err,data){
        if(err) throw err;
        
        var jsonObj = JSON.parse(data);
        if((typeof jsonObj['data'] != undefined) && (typeof jsonObj['data']['content'] != undefined) && (typeof jsonObj['data']['title'] != undefined)){
        	   var da = jsonObj['data']['content'];
        	   var title = jsonObj['data']['title'];
        	   m_coll.save({"book_name" : "凡人修仙传", "book_id" :4,"chapter_name" : title, "chapter_id" : fileno, "chapter_content" :da});   
        	}
        	else{
        		        	console.log('[WARNING] no data @'+fileno);
        							return;
        		}
      
     
     }
	}
	
	
	
	

	
	

db.open(function(err, db){
if (err){
    console.log('DB OPEN ERROR');
    console.log(err);
    return;
}
ObjectId = mongodb.ObjectID;
coll=collection  = new mongodb.Collection(db, 'novel');
  
for(var i=1;i<1000;i++){
	var file_elem   = new F_elem(i,coll);
	file_elem.readff();
}


//db.close(function(){console.log("close db.");});
});


	// collection.save({"book_name" : "杀神", "chapter_name" : "第4章 异世重生---", "chapter_id" : 5, "chapter_content" :da});
	 
	 
	 
//	 	 collection  = new mongodb.Collection(db, 'book');
//	 collection.save({"book_name" : "杀神", "book_author" : "逆苍天", "book_id" : 1});
//	 collection.save({"book_name" : "武动乾坤", "book_author" : "天蚕土豆", "book_id" : 2});
//	 collection.save({"book_name" : "遮天", "book_author" : "辰东", "book_id" : 3});
//	 collection.save({"book_name" : "凡人修仙传", "book_author" : "忘语", "book_id" : 4});
//	 collection.save({"book_name" : "傲气冲天", "book_author" : "蒙白", "book_id" : 5});
//	 collection.save({"book_name" : "吞噬星空", "book_author" : "我吃西红柿", "book_id" : 6});
//	 
//	 collection.find().toArray(function(err,arr){
//		console.log(arr);
//	 });


	//close



 

 var mongodb = require('mongodb');
 var server = new mongodb.Server('10.40.45.55', 8819, {});
 var db = new mongodb.Db('test', server, {});



 
// var fs = require('fs');
// var fd_content = fs.openSync('./content.txt', 'r');
// var BUF_LENGTH = 64*1024,
//    buf = new Buffer(BUF_LENGTH)
//    bytesRead = 0;
//    
//    bytesRead = fs.readSync(fd_content, buf, 0, BUF_LENGTH, 0);
//    fs.closeSync(fd_content)



 
 db.open(function(err, db){
		if (err){
		    console.log('DB OPEN ERROR');
		    console.log(err);
		    return;
		}

	 ObjectId = mongodb.ObjectID;
//	 collection  = new mongodb.Collection(db, 'novel');
//	 collection.save({"book_name" : "杀神", "chapter_name" : "第一章 异世重生", "chapter_id" : 1, "chapter_content" :'大好青春的摆在那里，却迟迟找不到目标，这种富有但没有方向的感觉，让他一直都郁郁寡欢。    直到十七岁那一年，他接触到极限运动，"\r\n"觉得人生突然有了趣味，因手中掌握着巨额的财富，他得以在这个不是寻常百姓可以参与的运动中大肆妄为。    徒手攀岩、鳄鱼蹦极、低空跳伞、火山滑板、悬崖跳水、车底溜冰等等疯狂的极限运动，成了他大的乐趣。    oveerrrr'/*buf.toString()*/});
	 
	 
	 
	 	 collection  = new mongodb.Collection(db, 'book');
	 collection.save({"smr_id" : ObjectId("514fd3cd4e12ab49a2000000"),"book_name" : "杀神", 'book_reading':1,"book_author" : "逆苍天", "book_id" : 1});
	 collection.save({"smr_id" : ObjectId("514fd3cd4e12ab49a2000001"),"book_name" : "武动乾坤",'book_reading':1, "book_author" : "天蚕土豆", "book_id" : 2});
	 collection.save({"smr_id" : ObjectId("514fd3cd4e12ab49a2000002"),"book_name" : "遮天", 'book_reading':1,"book_author" : "辰东", "book_id" : 3});
	 collection.save({"smr_id" : ObjectId("514fd3cd4e12ab49a2000003"),"book_name" : "凡人修仙传",'book_reading':1, "book_author" : "忘语", "book_id" : 4});
	 collection.save({"smr_id" : ObjectId("514fd3cd4e12ab49a2000004"),"book_name" : "傲气冲天",'book_reading':1, "book_author" : "蒙白", "book_id" : 5});
	 collection.save({"smr_id" : ObjectId("514fd3cd4e12ab49a2000005"),"book_name" : "吞噬星空", 'book_reading':1,"book_author" : "我吃西红柿", "book_id" : 6});
	 
//	 collection.find().toArray(function(err,arr){
//		console.log(arr);
//	 });


	//close
	db.close(function(){
		console.log("close db.");
	});

});


 

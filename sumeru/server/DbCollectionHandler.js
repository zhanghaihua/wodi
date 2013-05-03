var runnable = function(fw){
    //===================
    var config = fw.config;
    
    var PSS = 'pss';
    // 使用PSS
    var MONGO = 'mongodb';
    var BSS = 'bss'
    // mongodb,         
    // FIXME 可以从config对像获取.
    var useingDbDriver = MONGO;
    //
    var getDbCollectionHandler ;
    var createDB;
    var ObjectId;
    var DbCollection = {};
    var pss_newDB;
    var bss_newDB;
    /**
     * DB Driver选择
     */
    
    switch(useingDbDriver) {
    case BSS:
	var Storage = require(__dirname +'/lib/bss/com/Storage.js').Storage;
	var sumeruDB = require(__dirname + '/lib/bss/api/SumeruDB.js').sumeruDB;
	var config = require(__dirname + '/lib/bss/pss/PssConfig.js').config;
	
	sumeruDB.registerStorage('PSS', new Storage(config));
        ObjectId = require(__dirname  + '/ObjectId.js').ObjectId;
        
	getDbCollectionHandler = function(modelName, callback){
            if(!('function' === typeof callback)) 
            {
                throw new TypeError('callback must be function type!');
            }
            var collection = DbCollection[modelName];
            if(typeof  collection == 'undefined'){
		 var options = {
		     cluster : 'framework',
		     type: "app",
		     shard_key_type: "numeric",
		     shard_key: "id",
		     shard_range: {
			 "0": [0, 20000000],
			 //"1": [1000000, 2000000]
		     }
		 }
		bss_newDB.createCollection(modelName, options, function on_collection(err, newCollection){
		     if (err != null) {
                        callback(err);
                    } else{
                        DbCollection[modelName] = newCollection;
                        callback(err, newCollection);
                    };
		});
	    }else {
                process.nextTick(function myTick(){callback(null, collection);});
            }
				    
	};
    	

        createDB = function(callback){
	    sumeruDB.createDB('PSS',null, {}, function on_create_db(err,newDB){
		if (err == null && newDB != null){
                    bss_newDB = newDB;
                    callback(newDB);
		}
	    });
        }
    
	break;


    case PSS:
        var DB          = require(__dirname  + '/../../../kernel/db/src/api/DB.js').DB;
        var Collection  = require(__dirname  + '/../../../kernel/db/src/api/Collection.js').Collection;
        var Cursor      = require(__dirname  + '/../../../kernel/db/src/api/Cursor.js').Cursor;
        var Storage     = require(__dirname  + '/../../../kernel/db/src/com/Storage.js').Storage;
        var pssConfig   = require(__dirname  + '/../../../kernel/db/src/pss/PssConfig.js').config;
        var sumeruDB    = require(__dirname  + '/../../../kernel/db/src/api/sumeruDB.js').sumeruDB;
        
        sumeruDB.registerStorage('PSS', new Storage(pssConfig));
        ObjectId = require(__dirname  + '/ObjectId.js').ObjectId;
        
        getDbCollectionHandler = function(modelName, callback){
            if(!('function' === typeof callback)) 
            {
                throw new TypeError('callback must be function type!');
            }
            var collection = DbCollection[modelName];
            if(typeof  collection == 'undefined'){
                //collection = DbCollection[modelName] = new mongodb.Collection(db, modelName); 
                pss_newDB.createCollection(modelName, {'strict':false}, function onCreateCollection(err, newCollection){
                    if (err != null) {
                        callback(err);
                    } else{
                        DbCollection[modelName] = newCollection;
                        callback(err, newCollection);
                    };
                });
            } else {
                process.nextTick(function myTick(){callback(null, collection);});
            }
        };
        
        createDB = function(callback){
            var options = {'strict':false};
            sumeruDB.createDB('PSS', null, options, function on_createDB_result(err, newDB){
                //util.log('sumeruDB createDB result:');
                //util.log(err);
                if (err == null && newDB != null){
                    pss_newDB = newDB;
                    callback(newDB);
                }
            });
        };
        break;
    case MONGO:
    default:
        var mongodb = require('mongodb');
        var serverOptions = {
            'auto_reconnect': true,
            'poolSize': 100         //MAX IS 2000
          };
        
        var host = config.get('mongoServer'),
            port = config.get('mongoPort'),
            username = config.get('bae_user'),
            password = config.get('bae_password');
        
        if(process && process.BAE){
            host = "10.50.147.16";
            port = 43030;
            username = "todo"; //fw.config.get('bae_user');
            password = "123456"; //fw.config.get('bae_password');
        }
        
        var server = new mongodb.Server(host, port, serverOptions);
        var db = new mongodb.Db("tododemo", server, {});
	
        ObjectId = mongodb.ObjectID;
        
        getDbCollectionHandler = function(modelName, callback) {
            callback = callback || function(){};
            //try {
            var collection = DbCollection[modelName];
            if ( typeof collection == 'undefined') {
                collection = DbCollection[modelName] = new mongodb.Collection(db, modelName);
            }
            callback(null, collection);
            //} catch(err) {
            //    callback(err, collection);
            //}

            return collection;
        };
        
        
        createDB = function(callback){
            db.open(function(err, db){
        		if (err){
        		    console.log('DB OPEN ERROR');
        		    console.log(err);
        		    return;
        		}
        		
        		if (username !== '' || password !== ''){
        		    db.authenticate(username,password,function(err,result){
                            	if (!err){
        			    callback(db);
        			}else {
        			    console.log('DB auth failed');
        			    console.log(err);
        			}
        		    })
        		}else{
        		     callback(db);
        		}
            });
        };
    }
    
    serverCollection = require(__dirname  + '/serverCollection.js')(fw, getDbCollectionHandler,ObjectId);
    
    var handle = {
        getDbCollectionHandler : getDbCollectionHandler,
        createDB : createDB,
        ObjectId : ObjectId,
        serverCollection : serverCollection
    };
    
    fw.getDbHandler = function(){
        return {
            getDbCollectionHandler : handle.getDbCollectionHandler,
            ObjectId : handle.ObjectId
        };
    };
    
    return handle;
};

module.exports = runnable;

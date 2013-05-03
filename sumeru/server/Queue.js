/**
 * 实现一个处理队列，方便将一些实时频繁处理的内容，变为周期性处理。
 * @author wangsu01
 */

console.log("Queue.js has been loaded..");

/**
 * 触发方式
 * 周期或超时
 */
var INTERVAL = 'interval',
    TIMEOUT = 'timeout';

/**
 * 触发状态.
 * 未设定 / 被销毁 / timeout等待触发 / timeout已完成
 */
var UNSET = 'timer_unset',
    DESTROY="destroy",
    TIMEOUT_WAITING = 'timeout_waiting',
    TIMEOUT_DONE = 'timeout_done';

var Queue = function(){
    
    this.__queue = [];
    this.__before = [];
    this.__after = [];
    
    this.__do = null;
    this.__timer = null;
    this.__timerType = '';
    this.__status = UNSET;
};

Queue.prototype = {
    __run:function(){
        
        // 被destroy后，不能再次使用
        if(this.__status == DESTROY){
            console.log("INFO : this queue has been destroyed. ");
            return;
        }
        
        // 队列中无内容时直接退出处理
        if(this.__queue.length == 0 ){
            return;
        }
        
        // 处理前置过程
        if(this.__before.length > 0){
            try{
                this.__before.forEach(function(item){
                    if(item instanceof Function){
                        item.call({});
                    }
                });
            }catch(e){
                console.log("error in pre-process ," + e);
                // 将前置过程中的异常作为终止处理的条件
                return;
            }
        }
        
        // 处理队列内容
        var args = null;
        while(this.__queue.length != 0){
            args = this.__queue.shift();
            if(this.__do instanceof Function){
                this.__do.apply({},args);
            }
        }
        
        
        // 处理后置过程
        if(this.__after.length > 0){
            this.__after.forEach(function(item){
                if(item instanceof Function){
                    item.call({});
                }
            });
        }
        
        // 标记超时触发执行完成.
        if(this.__timerType = TIMEOUT){
            this.__status = TIMEOUT_DONE;
        }
    },
    /**
     * 设置触发间隔及触发方式。
     * setInterval为周期触发
     * setTimeout为超时触发一次
     */
    setInterval : function(todo,timer) {
        // 被destroy后，不能再次使用
        if(this.__status == DESTROY){
            console.log("INFO : this queue has been destroyed. ");
            return;
        }
        
        if(this.__timerType == '' || this.__timerType == INTERVAL ){
            // 清除
            clearInterval(this.__timer);
            this.__do = todo || this.__do;
            this.__timer = setInterval(this.__run.bind(this),timer);
            this.__timerType = INTERVAL;
        }
    },
    setTimeout : function(todo,timer,reset){
        // 被destroy后，不能再次使用
        if(this.__status == DESTROY){
            console.log("INFO : this queue has been destroyed. ");
            return;
        }
        
        if(this.__timerType == '' || this.__timerType == TIMEOUT){
            
            if(this.__status != TIMEOUT_WAITING || reset){
                // 清除timer
                clearInterval(this.__timer);
                
                this.__do = todo || this.__do;
                this.__timer = setInterval(this.__run.bind(this),timer);
                
                this.__timerType = TIMEOUT;
                this.__status = TIMEOUT_WAITING;
            }
            
        }
    },
    /**
     * 清理并销毁
     */
    destroy:function(){
        // 清除周期执行的timer
        switch(this.__timerType){
            case TIMEOUT:
                clearTimeout(this.__timer);
                break;
            case INTERVAL:
                clearInterval(this.__timer);
                break;
        }
        
        // 如果队列中还有内容，则最后一次处理队列中的内容 
        if(this.__queue.length != 0){
            this.__run();
        }
        // 标记已销毁
        this.__status = DESTROY;
        
        // 清空
        this.__queue.length = 0;
        this.__before.length = 0;
        this.__after.length = 0;
        
        this.__queue = null;
        this.__before = null;
        this.__after = null;
        this.__do = null;
    },
    /**
     * 在触发前执行的操作
     */
    setBeforeFire:function(func){
        this.__before.push(func);
    },
    /**
     * 在触发后执行的操作
     */
    setAfterFire:function(func){
        this.__after.push(func);
    },
    /**
     * 插入待处理的数据到队列中
     */
    push:function(args){
        if(Array.isArray(args)){
            this.__queue.push(args);
        }else{
            this.__queue.push([args]);
        }
    },
    /**
     * 过滤队列中的内容
     * @param isSame {function(a,b){return {boolean}}}
     *       一个函数.用于判断给定的两个值是否相同
     */
    filter:function(isSame){
        isSame = isSame || function(a,b){
            return  a[0] == b[0];
        };
        
        var unique  = [] , arr = this.__queue;
        var n,same = false , count = 0, len = arr.length;
        
        for(var i = 0; i < len; i++){
            same = false;
            for(n = i + 1; n < len; n++){
                if(same = isSame(arr[i],arr[n])){
                    break;
                }
            }
            
            if(!same){
                unique.push(arr[i]);
            }
        }
    
        this.__queue = unique;
        arr.length = 0;
    }
};

/**
 * 实现一个延迟触发一类固定操作的托管对像，用于管理一组setTimeout操作.
 * 由于被充setTimout操作，只能终止不能提前触发的问题，
 * 所以在单纯的setTimeout时如果在某种条件下需要提前触发，
 * 必须记录将操作的function，并在clearTimeout然后再重新触发该function。
 * 并用在代码中，同一个位置的多次setTimeout时，一般为同一个操作不需要创建多个function.
 * 此工具对像的做用即是完成一组这样的操作,并可以在适当的时候提前触发或终止触发。
 */
var DelayedAction = function(){
    this.__todo = null;
    this.__actions = {};
    this.__destroyed = false;
}; 

DelayedAction.prototype = {
     __fireOne:function(key){
         // 防止已销毁的或未指定action的情况下仍有timeout被触发
         if(this.__destroyed || !this.__todo){
             return;
         }
         
         var action = this.hasKey(key);
         if(action){
             this.__todo.apply({},action.args);
         }
         this.clear(key);
         //console.log("fire action:" + key);
     },
    /**
     * 根据一个给定的键名，创建一个延迟操作。该键名将用于取消或查询等操作.
     * @param key
     *      查询的键名，可理解为一个索引名称
     * @param args
     *      触发action时所使用的参数
     * @param timeout
     *      延迟时间长度，单位毫秒
     */
    create:function(key,args,timeout){
        // 在已经被create的key未被清理掉之前，不能得新设置一个相同的key.
        // 参数不足时，不处理任何操作
        if(key && this.__actions[key] || arguments.length != 3){
            return;
        }
        
        // 记录action的结构,timer为setTimeout的句柄,args记录操作数据
        var action;
        action = this.__actions[key] = {timer:null};
        
        // 保证args为一个数组
        if(Array.isArray(args)){
            action.args = args;
        }else{
            action.args = [args];
        }
        
        action.timer = setTimeout(this.__fireOne.bind(this,key),timeout);
        //console.log("create action:" + key);
        
    },
    /**
     * 指定当前这一组对像的action操作
     */
    setAction:function(fun){
        // 设置 过一次便不能再修改.
        this.__todo = this.__todo  || fun;
    },
    /**
     * 查询一个键名是否存在.
     *      返回true表示该键所指向的动作还未到触发时间,
     *      返回false表示未设置该键所指向的动作或忆触发完成
     * @param key
     *      查询的键名，可理解为一个索引名称
     * @returns {boolean} 
     *      true 存在, 
     *      false不存在
     */
    hasKey:function(key){
        if(this.__actions[key]){
            return this.__actions[key];
        }else{
            return false;
        }
        return false;
    },
    /**
     * 查询一个键名是否存在.
     *      返回true表示该键所指向的动作还未到触发时间,
     *      返回false表示未设置该键所指向的动作或忆触发完成
     * @param key
     *      查询的键名，可理解为一个索引名称
     * @returns {boolean} 
     *      true 存在, false不存在
     */
    clear:function(key){
        
        var action = this.hasKey(key);
        
        if(action){
            clearTimeout(action.timer);
            this.__actions[key] = null;
            delete this.__actions[key];
        }
        
        return false;
    },
    clearAll:function(){
        for(var key in this.__actions){
            this.clear(key);
        }
    },
    fireAndClearAll:function(){
        for(var key in this.__actions){
            this.__fireOne(key);
        }
    },
    destroy:function(){
        // 在销毁时，先将所以未执行完成的操作触发一次。
        this.fireAndClearAll();
        this.__destroyed = true;
        this.__todo = null;
        this.__actions = null;
    }
};


module.exports = {Queue:Queue,DelayedAction:DelayedAction};


// ==================   Unit Test  ==================//
var ut = function(){
    var q1 = new Queue();
    
    var i = 0 , t ;
    var todo = function(a){
        console.log(a);
    }
    var testSame = function(a,b){
        
    }
    q1.push(1);
    q1.push(2);
    q1.push(3);
    q1.push(4);
    q1.push(4);
    q1.push(4);
    q1.push(4);
    q1.push(4);
    
    q1.setBeforeFire(function(){
        i++;
        q1.filter();
    });
    
    
    q1.setAfterFire(function(){
        //console.log("==========" + i);
        if(i > 5){
            clearInterval(t);
            q1.destroy();
        }
        q1.setTimeout(null,1000);
    });
    
    q1.setTimeout(todo,1000);
    
    t = setInterval(function(){
        q1.push(parseInt(Math.random() * 50 + 1));
    },100);
};

var ut1 = function(){
    var da = new DelayedAction();
    var t = 1000;
    
    for(var i =0 ;i < 5;i++){
        da.create('a' + i , [i],t += 500);
    }
    
    da.create('b',[i,1,2,3],t += 500);
    
    da.setAction(function(){
        console.log(arguments);
    });
    
    da.clear('b');
    da.destroy();
    
    console.dir(da);
};

//ut1();

//ut();
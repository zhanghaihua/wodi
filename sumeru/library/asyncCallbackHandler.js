var runnable = function(sumeru){
    Library.asyncCallbackHandler = sumeru.Library.create(function(exports){
        /**
         * ���ڽ������첽���󣬹���һ��callback
         * callback �������֪�������������أ����ԣ������õ��ı���һ��Ҫ�ŵ���������ıհ��С�
         * timeout ���������timeout������enableCallback֮�����ö�ʱ�������ʱ�䵽���첽���û�û��ִ���꣬��ֱ�ӵ���callback��callbackֻ�ܱ�����һ�Ρ�
         * useage��
            cbHandel = Library.asyncCallbackHandler.create(callback);
            cbHandel.add();
            cbHandel.decrease();
            cbHandel.enableCallback();//���е����󶼷�����Ϻ����
         */
        var _asyncCallbackHandler = function(callback,timeout){
            this.counter = 0;
            this.callbacked = false;
            this.callback = function(){//��֤callbackֻ������һ��
                if(!this.callbacked){
                    callback();
                    this.callbacked = true;
                }
            };
            this._enableCallback = false;//��ʾ���������Ѿ����ͣ�����callback��
            if(timeout)this.timeout = timeout;
            this.timeoutFunc = null;
        };

        _asyncCallbackHandler.prototype = {
            add:function(){
                this.counter++;
            },
            decrease:function(){
                this.counter--;
                if(this._enableCallback&&this.counter===0){
                    this.callback();
                }
            },
            enableCallback:function(){
                this._enableCallback = true;
                if(this.timeout){
                    this.timeoutFunc = setTimeout((function(obj){
                                                        obj.callback();
                                                    })(this),this.timeout);
                };
                if(this._enableCallback&&this.counter===0){
                    this.callback();
                }
            }
        };

        exports.create = function(callback,timeout){
            return new _asyncCallbackHandler(callback,timeout);
        };
        return exports;
    });
};

if(typeof module !='undefined' && module.exports){
    module.exports = runnable;
}else{
    runnable(sumeru);
}


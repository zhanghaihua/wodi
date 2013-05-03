Handlebars.registerHelper("foreach", function(context, options) {
    var buffer = "", key;
    if(context) {
        if ( (context instanceof Array) ) {//数组的遍历
            for(var i=0, j=context.length; i<j; i++) {
                //如果是object类型，则，内容支持this，在解析的时候this会被直接被替换到到depth0上,
                //因为this本身的方法不能依赖于使用object.value调用的方法，所以直接把key附到this上
                // if ( 0 ) {
                    // context[i].key = i;
                    // buffer = buffer + options.fn(context[i]);
                // } else {
                    //解释一下，内容是字符串类型的，则不支持this，所以和object遍历一样，给它value选项
                buffer += options.fn({
                    key : i,
                    index : i,
                    value : context[i]
                });
                // }
            }
        }else if (typeof context ==='object'){//object的遍历
            for (key in context) {
                if (context.hasOwnProperty(key)) {
                    buffer += options.fn({
                        key : key,
                        value : context[key]
                    });
                }
            }
        }else {
            //did nothing。此方法只支持数组和对象，其他不支持
        }
    } else {
        buffer = options.inverse(this);
    }
    return buffer;
});


Handlebars.registerHelper('equal', function(v1, v2, options) {
  if(v1 == v2) {
	return options.fn(this);
  }
  return options.inverse(this);
});

Handlebars.registerHelper('unequal', function(v1, v2, options) {
  if(v1 != v2) {
    return options.fn(this);
  }
  return options.inverse(this);
});
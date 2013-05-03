var mylib = require("./reqUrl");
var fs = require('fs');

//{"authorid":"012345","authorkey":"timgextkey","req_data_num":"1","process_type":"0","res_data_type":"0","req_data_source":[{"http_reqpack":{},"sourcemethod":"BODY","source_data_len":"41","operations":{"size":"4", "version":"4", "level":"4","margin":"4","foreground":"000000", "background":"FFFFFF", "structured":"0"}}]}

// More complex Example 2
mylib.urlReq('http://10.48.237.34:8091/timgext?', {
		method: 'POST',
		params: {
			authorid:"012345",
			authorkey:"timgextkey",
			req_data_num:"1",
			process_type:"0",
			res_data_type:"0",
			req_data_source:[{http_reqpack:{},
			                	 sourcemethod:"BODY",
			                	 source_data_len:"41",
			                	 operations:{size:"4", version:"4", level:"4",margin:"4",foreground:"000000", background:"FFFFFF", structured:"0"}
			                   }]
		},
		qurl:"http://cq01-testing-wisetf12.vm.baidu.com:8081/index.html#/host"
		//qurl: "http://myoffice.duapp.com/index.html#/host/"
	}, function(body, res){
	// do your stuff
	console.log(body.length);
	fs.writeFile('logo.png', body, 'binary', function(err){
        if (err) throw err;
        console.log('File saved.');
    });
});


/*
//Simple Example (defaults to GET)
mylib.urlReq('http://10.48.237.34:8091/timgext?', {
	method: 'POST'}, function(body, res){
//do your stuff
});
*/


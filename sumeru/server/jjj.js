var fs = require('fs');
fs.readFile('./1.json',function(err,data){
    if(err) throw err;

var jsonObj = JSON.parse(data);
var da = jsonObj['data'][0]['content'];
console.log('data='+da);
});

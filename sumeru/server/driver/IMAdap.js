var fw = require(__dirname + '/../../src/newPkg.js')();

console.log('Loaded "IMAdap_Main_Controller" ');

var Queue = require(__dirname + '/../Queue.js').Queue;
var DelayedAction = require(__dirname + '/../Queue.js').DelayedAction;

var IMProtocols = require('./IMProtocol.js');
var part1 = require('./IMAdap_Part_1.js');
var part2 = require('./IMAdap_Part_2.js');
var part3 = require('./IMAdap_Part_3.js');
var part4 = require('./IMAdap_Part_4.js');

var IMConnHandler = function(userInfo,cid){
    this.cid = cid;                                 
    this.receiveMsg = {};                           // 记录接收后需要发送ack的消息
    this.sendMsg = {};                              // 记录发送后需要等待ack的消息
    
    IMProtocols.IMConnHandler.call(this,userInfo);
    
    part1.__constructor && part1.__constructor.call(this,userInfo);
    part2.__constructor && part2.__constructor.call(this,userInfo);
    part3.__constructor && part3.__constructor.call(this,userInfo);
    part4.__constructor && part4.__constructor.call(this,userInfo);
};

IMConnHandler.prototype = fw.utils.cpp(
    Object.create(IMProtocols.IMConnHandler.prototype),
    part1,
    part2,
    part3,
    part4
);

IMConnHandler.prototype.onClosed = function(msg){
    IMProtocols.IMConnHandler.prototype.onClosed && IMProtocols.IMConnHandler.prototype.onClosed.apply(this);
    part1.onClosed && part1.onClosed.call(this,msg);
    part2.onClosed && part2.onClosed.call(this,msg);
    part3.onClosed && part3.onClosed.call(this,msg);
    this.m_Conn = null; // 清理连接对像
    //console.log('clear connection.');
};

console.log('Assembled "IMAdapter"');

module.exports = IMConnHandler;
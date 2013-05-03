////////////////////////////////////////////////////////////////////////////////
// Project Name : HiApp 
//                - A web Hi application powered by Node.Js
// File name    : IMProtocol.js
//                - Hi protocol parser & connection implementation written by
//                - pure javascript, run on Node.Js.
// Author       : zhoukai(zhoukai@baidu.com)
// Wrote date   : 2012.12.20 - 2012.12.28
////////////////////////////////////////////////////////////////////////////////

var net = require('net');
var assert = require('assert');
var crypto = require('crypto');
var DOMParser = require('xmldom').DOMParser;
var IMStreamReader = require('./IMProtocolStreamReader.js');

var BOStream = IMStreamReader.BOStream;
var BIStream = IMStreamReader.BIStream;

// //////////////////////////////////////////////////////////////////////////////
// Constants : CONSTANTS
// - Common constants
// //////////////////////////////////////////////////////////////////////////////
var CONSTANTS = {
    RANDOM_KEY_SEED_LEN : 16,
    SIZEOF_BINARYHEADER : 40,
    SIZEOF_S1DATA : 17,
    SIZEOF_S2DATA : 18,
    SIZEOF_S3DATA : 12,
    SIZEOF_S4DATA : 32,
    PROTOCOL_VERSION : 0x00010000, // 32 bits
    PROTOCOL_TAG : 0x494d5631, // 32 bits
    LOCALE_ID : 2052,
    IM_VERSION : '4,2,2,2',
};
exports.CONSTANTS = CONSTANTS;

// //////////////////////////////////////////////////////////////////////////////
// Constants : NETSTATE
// //////////////////////////////////////////////////////////////////////////////
var NETSTATE = {
    CT_FLAG_CON_S1 : 0x0,
    CT_FLAG_CON_S2 : 0x1,
    CT_FLAG_CON_S3 : 0x2,
    CT_FLAG_CON_S4 : 0x3,
    CT_FLAG_KEEPALIVE : 0x5,
    CT_FLAG_CON_OK : 0x7
};
exports.NETSTATE = NETSTATE;

// //////////////////////////////////////////////////////////////////////////////
// Constants : SENDFLAG
// //////////////////////////////////////////////////////////////////////////////
var SENDFLAG = {
    SENDF_LOGIN : 0x00000001,
    SENDF_LOGOUT : 0x00000002
};
exports.SENDFLAG = SENDFLAG;

// //////////////////////////////////////////////////////////////////////////////
// Constants : Connection method types
// //////////////////////////////////////////////////////////////////////////////
var CONMETHOD = {
    CON_METHOD_NULL : 0,
    CON_METHOD_NONE : 1,
    CON_METHOD_A : 2,
};
exports.CONMETHOD = CONMETHOD;

// //////////////////////////////////////////////////////////////////////////////
// Constants : CLIENTTYPE
// //////////////////////////////////////////////////////////////////////////////
var CLIENTTYPE = {
    CLIENTUNKNOWN : 0,
    CLIENTNORMAL : 1,
    CLIENTWEBIM : 2,
    CLIENTBRIDGE : 3,
    CLIENTMOBILE : 4,
    CLIENTMAX : 5,
};
exports.CLIENTTYPE = CLIENTTYPE;

// //////////////////////////////////////////////////////////////////////////////
// Constants : CLIENTSTATE
// //////////////////////////////////////////////////////////////////////////////
var CLIENTSTATE = {
    CLOSED : 0,
    CONNECTED : 1,
    MAX : 2
};
exports.CLIENTSTATE = CLIENTSTATE;

// //////////////////////////////////////////////////////////////////////////////
// Constants : Command types
// //////////////////////////////////////////////////////////////////////////////
var COMMANDS = {
    SECURITY : 'security',
    SECURITY_VERSION : '1.0',
    LOGIN : 'login',
    LOGIN_VERSION : '4.2',
    USER : 'user',
    USER_VERSION : '2.0',
    QUERY : 'query',
    QUERY_VERSION : '1.0',
    CONTACT : 'contact',
    CONTACT_VERSION : '2.10',
    TIMESTAMP : 'timestamp',
    TIMESTAMP_VERSION : '1.0',
    FRIEND : 'friend',
    FRIEND_VERSION : '2.0',
};
exports.COMMANDS = COMMANDS;

// //////////////////////////////////////////////////////////////////////////////
// Constants : Method types
// //////////////////////////////////////////////////////////////////////////////
var METHODS = {
    VERIFY : 'verify',
    LOGIN : 'login',
    LOGIN_READY : 'login_ready',
    NOTIFY : 'notify',
    OFFLINE_MSG_NOTIFY : 'offline_msg_notify',
    USER : 'user',
    GET_MULTI_FRIEND : 'get_multi_friend',
};
exports.METHODS = METHODS;

// //////////////////////////////////////////////////////////////////////////////
// Constants : SENDFLAG
// //////////////////////////////////////////////////////////////////////////////
var LOGIN_PRIORITYS = {
    LOGIN_PRIORITY_UNKNOWN : 0,
    LOGIN_PRIORITY_FORCE_LOGIN_FLAG : 0x80000000,
    LOGIN_PRIORITY_WEBIM : 10,
    LOGIN_PRIORITY_CLIENT : 20
};
exports.LOGIN_PRIORITYS = LOGIN_PRIORITYS;

// //////////////////////////////////////////////////////////////////////////////
// Constants : PTYPE
// //////////////////////////////////////////////////////////////////////////////
var PTYPE = {
    UNKNOWN : 0,
    REQ : 1,
    ACK : 2,
    NOTIFY : 3
};
exports.PTYPE = PTYPE;

// //////////////////////////////////////////////////////////////////////////////
// Constants : PFLAG
// //////////////////////////////////////////////////////////////////////////////
var PFLAG = {
    SENDING : 0x01,
    SENDDONE : 0x02,
};
exports.PFLAG = PFLAG;

// //////////////////////////////////////////////////////////////////////////////
// Constants : PCONST
// //////////////////////////////////////////////////////////////////////////////
var PCONST = {
    // 下面的宏尝试统一各个包中的定义，以后程序中优先使用这些定义
    IMP_ACK_SUCCESS : 200,// 成功
    IMP_ACK_WAIT_AGREE : 201,// 等待验证
    IMP_ACK_HAVE_MOREDATA : 210,// 后面还有数据
    IMP_ACK_LOCAL_SYNC : 220,// 本地与服务器一致

    IMP_ACK_CLIENT_FAIL : 400,// 客户端失败
    IMP_ACK_NO_RIGHT : 401,// 操作者没有权限
    IMP_ACK_LIST_OVNUM : 402,// 列表超过上限(成员列表、黑名单列表、管理员列表等)
    IMP_ACK_BAD_REQID : 403,// ACK操作时req_id不存在或者验证失败
    IMP_ACK_BAD_PARAM : 404,// 错误的参数、属性值
    IMP_ACK_BAD_PACKET : 405,// 错误的包，第一行解析失败或者不认识的method
    IMP_ACK_BAD_CONTENT : 406,// 解析Content失败
    IMP_ACK_UID_NOTEXIST : 407,// uid不存在
    IMP_ACK_USERNAME_NOTEXIST : 408,// 用户名不存在
    IMP_ACK_WRONG_VERIFY_CODE : 410,// 错误的验证码
    IMP_ACK_VERIFY_CODE_OVERDUE : 411,// 验证码失效
    IMP_ACK_CLIENT_NOT_SUPPORT : 412,// 对方客户端不支持
    IMP_ACK_CLIENT_CONFILTER : 413,// 违禁词过滤
    IMP_ACK_PCCODE_BLOCKED : 414,// 机器码封禁
    IMP_ACK_ENCODE_UNSUPPORT : 415,// 编码不支持
    IMP_ACK_UID_FORGE : 417,// imp包中的uid和登陆时的uid不一样

    // 新的强制规则，分段使用错误码[公共部分]
    IMP_ACK_PUBLIC_NO_RIGHT : 449,

    // IMP_ACK_SEND_TMSG_NO_RIGHT : 451,//好友关系错误
    IMP_ACK_SUB_ACCOUNT_NO_RIGHT : 461,// cc子帐号中,不是自己添加的好友,没有权限
    IMP_ACK_SUB_ACCOUNT_BE_OCCUPY : 462,

    IMP_ACK_SERVER_FAIL : 500,// 服务器端失败
    IMP_ACK_SERVER_TIMEOUT : 506,
    IMP_ACK_SERVER_FAIL_UNSUPPORT : 507,
    IMP_ACK_SERVER_FAIL_TS : 511,
    IMP_ACK_SERVER_FAIL_CS : 512,
    IMP_ACK_SERVER_FAIL_DB : 513,
    IMP_ACK_SERVER_FAIL_TJ : 514,
    IMP_ACK_SERVER_FAIL_PSP : 515,
    IMP_ACK_SERVER_FAIL_RT : 516,
    IMP_ACK_SERVER_FAIL_MSGSTORE : 517,
    IMP_ACK_SERVER_FAIL_RELAY : 518,
    IMP_ACK_SERVER_FAIL_BAIDUMSG : 519,
    IMP_ACK_SERVER_FAIL_CSBGMGR : 520,
    IMP_ACK_SERVER_FAIL_CONFILTER : 521,
    IMP_ACK_SERVER_FAIL_CSLRT : 522,
    IMP_ACK_SERVER_FAIL_GIDGEN : 523,
    IMP_ACK_SERVER_FAIL_EMAILBIND : 524,

    // 群自己公共的错误码
    // 群各个流程自己的错误码在480以后
    IMP_ACK_GROUP_OPOVNUM : 451,// 操作次数太多
    IMP_ACK_GROUP_BLOCKED : 452,// 群被封禁
    IMP_ACK_GROUP_OVNUM : 453,// 个人所在的群数目太多
    IMP_ACK_GROUP_BADOBJ : 454,// 操作目标不符合要求
    IMP_ACK_GROUP_NOTEXIST : 455,// 群不存在
    IMP_ACK_GROUP_OBJISBLACK : 456,// 操作目标是黑名单
    IMP_ACK_GROUP_REPEATOP : 457,// 目标已经在列表中，重复操作
    IMP_ACK_GROUP_OBJISMEMBER : 458,// 操作目标是群成员
    IMP_ACK_GROUP_NOTMEMBER : 459,// 自己不是群成员

    IMP_ACK_SRV_DB_QGINFO : 551,// 发出获取群信息包失败
    IMP_ACK_SRV_DB_QGINFO_RESP : 552,// 解析获取群信息包失败
    IMP_ACK_SRV_DB_QUINFO : 553,// 发出获取用户信息包失败
    IMP_ACK_SRV_DB_QUINFO_RESP : 554,// 解析获取用户信息包失败
    IMP_ACK_SRV_DB_QGUINFO : 555,// 发出获取群用户信息包失败
    IMP_ACK_SRV_DB_QGUINFO_RESP : 556,// 解析获取群用户信息包失败
    IMP_ACK_SRV_DB_OPG : 557,// 发出操作群的包失败
    IMP_ACK_SRV_DB_OPG_RESP : 558,// 解析操作群的包失败
    IMP_ACK_SRV_DB_OPU : 559,// 发出操作用户的包失败
    IMP_ACK_SRV_DB_OPU_RESP : 560,// 解析操作用户的包失败
    IMP_ACK_SRV_DB_OPGU : 561,// 发出操作群用户信息的包失败
    IMP_ACK_SRV_DB_OPGU_RESP : 562,// 解析操作群用户信息的包失败
    IMP_ACK_SRV_DB_OPREQ : 563,// 发出操作申请的包失败
    IMP_ACK_SRV_DB_OPREQ_RESP : 564,// 解析操作申请的包失败

    IMP_METHOD_FIELD : 'method',
    IMP_UID_FIELD : 'uid',
    IMP_SUBID_FIELD : 'subid',
    IMP_GID_FIELD : 'gid',
    IMP_PAGE_FIELD : 'page',
    IMP_PAGESIZE_FIELD : 'pagesize',
    IMP_TIMESTAMP_FIELD : 'timestamp',
    IMP_LIST_FIELD : 'q',
    IMP_TYPE_FIELD : 'type',

    IMP_PCHASH_FIELD : 'pc_hash',

    CRLF : '\r\n', // Line-Feed, Carriage-Return

    // //////////////////////////////////////////////////////////////////////////////
    // Verify code types
    // //////////////////////////////////////////////////////////////////////////////
    VERIFY_CODE_UNKNOWN : 0,
    VERIFY_CODE_LOGIN : 1,
    VERIFY_CODE_ADDFRIEND : 2,
    VERIFY_CODE_DELETEFRIEND : 3,
    VERIFY_CODE_TRANSFERGROUP : 4,
    VERIFY_CODE_CREATEGROUP : 5,
    VERIFY_CODE_SENDBAIDUMSG : 6,
    VERIFY_CODE_DISBANDGROUP : 7,
    VERIFY_CODE_JOINGROUP : 8,
    VERIFY_CODE_QUITGROUP : 9,
    VERIFY_CODE_SENDEMAIL : 10,
    VERIFY_CODE_TMPSESSION : 11,

    // //////////////////////////////////////////////////////////////////////////////
    // Login prioritiy types
    // //////////////////////////////////////////////////////////////////////////////
    LOGIN_PRIORITY_UNKNOWN : 0,
    LOGIN_PRIORITY_FORCE_LOGIN_FLAG : 0x80000000,
    LOGIN_PRIORITY_WEBIM : 10,
    LOGIN_PRIORITY_CLIENT : 20,

    // //////////////////////////////////////////////////////////////////////////////
    // Login ack types
    // //////////////////////////////////////////////////////////////////////////////
    IMP_ACK_LOGIN_NO_ACCOUNT : 401,// 没有此帐号
    IMP_ACK_LOGIN_WRONG_PASSWORD : 402,// 密码错
    IMP_ACK_LOGIN_LOW_VERSION : 403,// 版本过低
    IMP_ACK_LOGIN_FORBIDDEN : 404,// 帐号被禁
    IMP_ACK_LOGIN_NEED_VERIFY_CODE : 405,// 需要验证码
    IMP_ACK_LOGIN_REDIRECT_TOO_MANY : 406,// 重定向次数过多
    IMP_ACK_LOGIN_NEED_WAIT : 420,// 需要等待系统维护
    IMP_ACK_LOGIN_NEED_ROLLBACK : 421,// 需要回滚
    IMP_ACK_LOGIN_WRONG_VERIFY_CODE : this.IMP_ACK_WRONG_VERIFY_CODE, // 验证码错
    IMP_ACK_LOGIN_VERIFY_CODE_OVERDUE : this.IMP_ACK_VERIFY_CODE_OVERDUE,// 验证码超时
    IMP_ACK_LOGIN_VERSION_NOT_RELEASED : 451,// 版本没有发布
    IMP_ACK_LOGIN_WRONG_LOCATION : 452,// 登错系统了
    IMP_ACK_LOGIN_REDIRECT : 301,// 需要重定向
    IMP_ACK_LOGIN_ONLINE : 481, // 已经在线
    IMP_ACK_LOGIN_HIGH_VERSION : 482,// 版本太高
    IMP_ACK_LOGIN_IRREGULARITY : this.IMP_ACK_CLIENT_CONFILTER,
    IMP_ACK_LOGIN_EMAIL_NOT_ACTIVE : 483,
    IMP_ACK_LOGIN_NO_USERNAME : 484,
    IMP_ACK_LOGIN_USED_USERNAME : 485,

    // //////////////////////////////////////////////////////////////////////////////
    // Peer closed reason types
    // //////////////////////////////////////////////////////////////////////////////
    PEER_CLOSE_REASON_NULL : 0, // 无效值
    PEER_CLOSE_REASON_LOGOUT : 1, // 常规Logout
    PEER_CLOSE_REASON_TIMEOUT : 2, // 连接超时TS

    PEER_CLOSE_REASON_KICKOUT_LOGIN : 3, // 多次登陆导致剔除
    PEER_CLOSE_REASON_KICKOUT_AA_FORBID : 4, // AntiAttack导致剔除
    PEER_CLOSE_REASON_KICKOUT_BG_FORBID : 5, // 后台管理导致剔除
    PEER_CLOSE_REASON_KICKOUT_PSP_FORBID : 6, // PSP方面配置导致剔除

    PEER_CLOSE_REASON_AUTH_FAIL : 7, // 认证失败
    PEER_CLOSE_ERASON_PROTOCOL_ERROR : 8,
    PEER_CLOSE_REASON_UNKNOWN : 9,

    PEER_CLOSE_REASON_TIMEOUT_RT : 10, // 从RT检测出的超时

    PEER_CLOSE_REASON_KICKOUT_CS_FORBID : 11, // CS判断用户非法
    PEER_CLOSE_REASON_KICKOUT_UPGRADE : 12, // CS判断用户升级为c2c主账号

    // The following contants are introduced in bridge 2.0
    PEER_CLOSE_REASON_BRIDGE_PRIMARY_ACCOUNT_PASSWD_CHANGED_OR_DISABLED : 13,
    PEER_CLOSE_REASON_BRIDGE_SUB_ACCOUNT_PASSWD_CHANGED : 14,
    PEER_CLOSE_REASON_BRIDGE_SUB_ACCOUNT_DISABLED : 15,
    PEER_CLOSE_REASON_BRIDGE_SITE_DELETED : 16,
    PEER_CLOSE_REASON_BRIDGE_SITE_CHANGED : 17,

    // //////////////////////////////////////////////////////////////////////////////
    // Client status types
    // //////////////////////////////////////////////////////////////////////////////
    STATUS_BEGIN : 0,
    STATUS_ONLINEREADY : 1,// 在线
    STATUS_ONLINEBUSY : 2,// 忙碌
    STATUS_ONLINELEAVE : 3,// 离开
    STATUS_HIDE : 4,// 隐身
    STATUS_OFFLINE : 5,// 离线
    STATUS_UNKNOWN : 6,// 未知
    STATUS_DEFAULT : this.STATUS_OFFLINE,
    STATUS_END : this.STATUS_UNKNOWN + 1,

};
exports.PCONST = PCONST;

function isImSuccess(errCode) {
    return (errCode >= 200 && errCode < 300);
}

function isImClientError(errCode) {
    return (errCode >= 400 && errCode < 500);
}

function isImServerError(errCode) {
    return (errCode >= 500 && errCode < 600);
}

// 最高字节为0x01的错误码保留给客户端本地使用，服务器不会返回
function isClientCustomCode(errCode) {
    return (errCode & 0x01000000) != 0;
}

function makeClientCustomCode(code) {
    return (0x01000000 | (code & 0xffffff));
}

function getClientCustomServerTimeout() {
    return makeClientCustomCode(PCONST.IMP_ACK_SERVER_TIMEOUT); // 服务器超时
}
//
// ////////////////////////////////////////////////////////////////////////////////
// // Class : BIStream
// ////////////////////////////////////////////////////////////////////////////////
// function BIStream(parser, length, offset){
// this.m_pParser = parser;
// this.m_nOffset = offset;
// this.m_nLength = length;
// }
// BIStream.prototype = {
// ////////////////////////////////////////////////////////////////////////////
// // Public method split line
// // - Public interface for invoke.
// ////////////////////////////////////////////////////////////////////////////
// /**
// * readUInt8
// * - Read a byte value from stream
// * @public
// * @return : [byte] value of read out.
// */
// readUInt8 : function(){
// var result = this.m_pParser.readUInt8(this.m_nOffset);
// this.m_nOffset++;
// return result;
// },
// /**
// * readUInt16LE
// * - Read a unsigned short value from stream in little-endian format
// * @public
// * @return : [uint16_t] value of read out.
// */
// readUInt16LE : function(){
// var result = this.m_pParser.readUInt16LE(this.m_nOffset);
// this.m_nOffset += 2;
// return result;
// },
// /**
// * readUInt32LE
// * - Read a uint32_t value from stream in little-endian format
// * @public
// * @return : [uint32_t] value of read out.
// */
// readUInt32LE : function(){
// var result = this.m_pParser.readUInt32LE(this.m_nOffset);
// this.m_nOffset += 4;
// return result;
// },
// /**
// * readUInt64LE
// * - Read a uint64_t value from stream in little-endian format
// * @public
// * @return : [uint64_t] value of read out.
// * @remark : FIXME
// */
// readUInt64LE : function(){
// var result = this.m_pParser.readDoubleLE(this.m_nOffset);
// this.m_nOffset += 8;
// return result;
// },
// /**
// * readBytes
// * - Read assigned length data from stream to an array
// * @public
// * @return : [Array]the same array as the input one.
// */
// readBytes : function(buffer, len){
// for(var i = 0; i < len; i++) {
// buffer[i] = this.m_pParser.readUInt8(this.m_nOffset);
// this.m_nOffset++;
// }
// return buffer;
// },
// /**
// * readToString
// * - Read assigned length data from stream and convert to utf8 format string
// * @public
// * @return : [string]if the length of reamining data is no less than assigned
// * to read, the result a string with assigned length, or the result
// * length is a string with remaining length of the stream.
// */
// readToString : function(len){
// len = (typeof len == 'undefined')?this.m_pParser.length:this.m_nOffset + len;
// len = Math.min(len, this.m_pParser.length);
// var result = this.m_pParser.toString('utf8', this.m_nOffset, len);
// this.m_nOffset += len - this.m_nOffset;
// return result;
// },
// /**
// * remainingLength
// * - Get the remaining data length of the stream which have not been read.
// * @public
// * @return : [uint32_t]length of remaining data in the stream have not been
// read.
// */
// remainingLength : function(){
// return this.m_pParser.length - Math.min(this.m_nOffset,
// this.m_pParser.length);
// },
// /**
// * readUntile
// * - Read data into buffer until encounter a stop mark
// * @public
// * @return : [uint32_t]length of data which have been read out from stream
// * into buffer.
// */
// readUntil : function(stopMark, buffer, offset){
// assert.ok(typeof stopMark == 'string');
// assert.ok(Buffer.isBuffer(buffer));
// if (stopMark.length == 0) {
// return 0;
// };
// var remainLen = this.remainingLength();
// if (remainLen < stopMark.length) {
// return 0;
// };
// var i = 0;
// var bFound = false;
// var len = this.m_nOffset + remainLen - stopMark.length;
// for (i = this.m_nOffset; i < len; i++) {
// bFound = true;
// for (var j = 0; j < stopMark.length; j++) {
// if (this.m_pParser[i+j] != stopMark.charCodeAt(j)) {
// bFound = false;
// break;
// };
// };
// if (bFound) {
// break;
// };
// };
// if (bFound) {
// var result = i - this.m_nOffset;
// this.m_pParser.copy(buffer, offset, this.m_nOffset, i);
// this.m_nOffset = i;
// return result;
// } else{
// return 0;
// };
// },
// /**
// * skip
// * - Skip assigned length data to be unread
// * @public
// * @return : no return value.
// */
// skip : function(length){
// var skipLen = Math.min(this.remainingLength(), length);
// this.m_nOffset += skipLen;
// return skipLen;
// },
// /**
// * dump
// * - dump data in utf8 format with assigned start & end index.
// * @public
// * @return : no return value.
// */
// dump : function(dumpInfo, start, end){
// var strDump = 'BIStream dump : ';
// if (typeof dumpInfo != 'undefined'){
// strDump += dumpInfo;
// }
// console.log(strDump);
// if (typeof start == 'undefined') {
// start = this.m_nOffset;
// };
// if (typeof end == 'undefined') {
// end = this.m_pParser.length;
// };
// var strDump = this.m_pParser.toString('utf8', start, end);
// console.dir(strDump);
// }
// };
// exports.BIStream = BIStream;
//
// ////////////////////////////////////////////////////////////////////////////////
// // Class : BOStream
// ////////////////////////////////////////////////////////////////////////////////
// function BOStream(parser, offset){
// this.m_pParser = parser;
// this.m_nOffset = offset;
// }
// BOStream.prototype = {
// ////////////////////////////////////////////////////////////////////////////
// // Public method split line
// // - Public interface for invoke.
// ////////////////////////////////////////////////////////////////////////////
// /**
// * writeUInt8
// * - Write a uint8_t value into stream.
// * @public
// * @return : [Number]length of wrote value.
// */
// writeUInt8 : function(value){
// this.m_pParser.writeUInt8(value, this.m_nOffset);
// this.m_nOffset += 1;
// return 1;
// },
// /**
// * writeUInt16LE
// * - Write a uint16_t value into stream in little-endian format.
// * @public
// * @return : [Number]length of wrote value.
// */
// writeUInt16LE : function(value){
// this.m_pParser.writeUInt16LE(value, this.m_nOffset);
// this.m_nOffset += 2;
// return 2;
// },
// /**
// * writeUInt32LE
// * - Write a uint32_t value into stream in little-endian format.
// * @public
// * @return : [Number]length of wrote value.
// */
// writeUInt32LE : function(value){
// this.m_pParser.writeUInt32LE(value, this.m_nOffset);
// this.m_nOffset += 4;
// return 4;
// },
// /**
// * writeUInt64LE
// * - Write a uint64_t value into stream in little-endian format.
// * @public
// * @return : [Number]length of wrote value.
// */
// writeUInt64LE : function(value){
// this.m_pParser.writeDoubleLE(value, this.m_nOffset);
// this.m_nOffset += 8;
// return 8;
// },
// /**
// * writeUInt16LE
// * - Write a assigned length string value into stream.
// * @public
// * @return : [Number]length of wrote value.
// */
// writeBytes : function(string, length){
// if (typeof string == 'undefined') {
// throw TypeError('first argument must be `string` type!');
// }
// length = (typeof length == 'undefined')?string.length:length;
// this.m_pParser.write(string, this.m_nOffset, length);
// this.m_nOffset += length;
// return length;
// },
// /**
// * writeUInt16LE
// * - Write a assigned length string value into stream.
// * @public
// * @return : [Number]length of wrote value.
// */
// writeString : function(string, length){
// if (typeof string == 'undefined') {
// throw TypeError('first argument must be `string` type!');
// }
//        
// var buf = new Buffer(string,'utf8');
//        
// length = (typeof length == 'undefined') ? buf.length : length;
// this.m_pParser.write(string, this.m_nOffset, length);
// this.m_nOffset += length;
// return length;
// }
// };
// exports.BOStream = BOStream;

// //////////////////////////////////////////////////////////////////////////////
// Class : CTFlag
// //////////////////////////////////////////////////////////////////////////////
function CTFlag() {
    this.m_nConFlag = 0;
    this.m_bEncrypt = 0;
    this.m_bCompress = 0;
    this.m_bHeartBeat = 0;
}
CTFlag.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - CTFlag decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        var u32flag = dataReader.readUInt32LE();
        this.m_nConFlag = u32flag & 0x07;
        this.m_bEncrypt = ((u32flag >> 3) & 0x01);
        this.m_bCompress = ((u32flag >> 4) & 0x01);
        this.m_bHeartBeat = ((u32flag >> 5) & 0x01);
    },
    /**
     * encode - CTFlag encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter) {
        var u32flag = this.m_nConFlag;
        u32flag &= ~0x08;
        if (this.m_bEncrypt) {
            u32flag ^= 0x08;
        }
        ;
        u32flag &= ~0x10;
        if (this.m_bCompress) {
            u32flag ^= 0x10;
        }
        ;
        u32flag &= ~0x20;
        if (this.m_bHeartBeat) {
            u32flag ^= 0x20;
        }
        ;
        dataWriter.writeUInt32LE(u32flag);
    }
};
exports.CTFlag = CTFlag;

// //////////////////////////////////////////////////////////////////////////////
// Class : BinaryHeader
// //////////////////////////////////////////////////////////////////////////////
function BinaryHeader() {
    this.m_nVer = 0; // 32 bits
    this.m_nTag = 0; // 32 bits
    this.m_sCTFlag = new CTFlag; // 32 bits
    this.m_nSrcDataLen = 0; // 32 bits
    this.m_nZipDataLen = 0; // 32 bits
    this.m_nDestDataLen = 0; // 32 bits
    this.m_nSendFlag = 0; // 32 bits
    this.m_nCategory = 0; // 32 bits
    this.m_nReserved1 = 0; // 32 bits
    this.m_nReserved2 = 0; // 32 bits
}
BinaryHeader.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - Binary packet header decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        this.m_nVer = dataReader.readUInt32LE();
        this.m_nTag = dataReader.readUInt32LE();
        this.m_sCTFlag.decode(dataReader);
        this.m_nSrcDataLen = dataReader.readUInt32LE();
        this.m_nZipDataLen = dataReader.readUInt32LE();
        this.m_nDestDataLen = dataReader.readUInt32LE();
        this.m_nSendFlag = dataReader.readUInt32LE();
        this.m_nCategory = dataReader.readUInt32LE();
        this.m_nReserved1 = dataReader.readUInt32LE();
        this.m_nReserved2 = dataReader.readUInt32LE();
    },
    /**
     * encode - Binary packet header encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter) {
        dataWriter.writeUInt32LE(this.m_nVer);
        dataWriter.writeUInt32LE(this.m_nTag);
        this.m_sCTFlag.encode(dataWriter);
        dataWriter.writeUInt32LE(this.m_nSrcDataLen);
        dataWriter.writeUInt32LE(this.m_nZipDataLen);
        dataWriter.writeUInt32LE(this.m_nDestDataLen);
        dataWriter.writeUInt32LE(this.m_nSendFlag);
        dataWriter.writeUInt32LE(this.m_nCategory);
        dataWriter.writeUInt32LE(this.m_nReserved1);
        dataWriter.writeUInt32LE(this.m_nReserved2);
    }
};
exports.BinaryHeader = BinaryHeader;

// //////////////////////////////////////////////////////////////////////////////
// Class : S1Data
// //////////////////////////////////////////////////////////////////////////////
function S1Data() {
    this.m_nEPVer = 0; // 8 bits
    this.m_nConMethod = 0; // 32 bits
    this.m_nReserved1 = 0; // 32 bits
    this.m_nReserved2 = 0; // 32 bits
    this.m_nDataLen = 0; // 32 bits
}
S1Data.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - S1Data decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        this.m_nEPVer = dataReader.readUInt8();
        this.m_nConMethod = dataReader.readUInt32LE();
        this.m_nReserved1 = dataReader.readUInt32LE();
        this.m_nReserved2 = dataReader.readUInt32LE();
        this.m_nDataLen = dataReader.readUInt32LE();
    },
    /**
     * encode - S1Data encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter) {
        dataWriter.writeUInt8(this.m_nEPVer);
        dataWriter.writeUInt32LE(this.m_nConMethod);
        dataWriter.writeUInt32LE(this.m_nReserved1);
        dataWriter.writeUInt32LE(this.m_nReserved2);
        dataWriter.writeUInt32LE(this.m_nDataLen);
    }
};
exports.S1Data = S1Data;

function S2Data() {
    this.m_nConMethod = 0; // 8 bits
    this.m_nRootKeyNO = 0; // 8 bits
    this.m_nRootKeyLen = 0; // 32 bits
    this.m_nReserved1 = 0; // 32 bits
    this.m_nReserved2 = 0; // 32 bits
    this.m_nDataLen = 0; // 32 bits
}
S2Data.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - S2Data decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        this.m_nConMethod = dataReader.readUInt8();
        this.m_nRootKeyNO = dataReader.readUInt8();
        this.m_nRootKeyLen = dataReader.readUInt32LE();
        this.m_nReserved1 = dataReader.readUInt32LE();
        this.m_nReserved2 = dataReader.readUInt32LE();
        this.m_nDataLen = dataReader.readUInt32LE();
    },
    /**
     * encode - S2Data encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter) {
        dataWriter.writeUInt8(this.m_nConMethod);
        dataWriter.writeUInt8(this.m_nRootKeyNO);
        dataWriter.writeUInt32LE(this.m_nRootKeyLen);
        dataWriter.writeUInt32LE(this.m_nReserved1);
        dataWriter.writeUInt32LE(this.m_nReserved2);
        dataWriter.writeUInt32LE(this.m_nDataLen);
    }
};
exports.S2Data = S2Data;

// //////////////////////////////////////////////////////////////////////////////
// Class : S3Data
// //////////////////////////////////////////////////////////////////////////////
function S3Data() {
    this.m_nReserved1 = 0; // 32 bits
    this.m_nReserved2 = 0; // 32 bits
    this.m_nDataLen = 0; // 32 bits
}
S3Data.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - S3Data decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        this.m_nReserved1 = dataReader.readUInt32LE();
        this.m_nReserved2 = dataReader.readUInt32LE();
        this.m_nDataLen = dataReader.readUInt32LE();
    },
    /**
     * encode - S3Data encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter) {
        dataWriter.writeUInt32LE(this.m_nReserved1);
        dataWriter.writeUInt32LE(this.m_nReserved2);
        dataWriter.writeUInt32LE(this.m_nDataLen);
    }
};
exports.S3Data = S3Data;

// //////////////////////////////////////////////////////////////////////////////
// Class : S4Data
// //////////////////////////////////////////////////////////////////////////////
function S4Data() {
    this.m_strSeed = ''; // 128 bits
    this.m_nKeepAliveSpace = 0; // 32 bits
    this.m_nReserved1 = 0; // 32 bits
    this.m_nReserved2 = 0; // 32 bits
    this.m_nDataLen = 0; // 32 bits
}
S4Data.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - S4Data decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        this.m_strSeed = dataReader.readToString(CONSTANTS.RANDOM_KEY_SEED_LEN);
        this.m_nKeepAliveSpace = dataReader.readUInt32LE();
        this.m_nReserved1 = dataReader.readUInt32LE();
        this.m_nReserved2 = dataReader.readUInt32LE();
        this.m_nDataLen = dataReader.readUInt32LE();
    },
    /**
     * encode - S4Data encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWrite) {
        dataWriter.writeBytes(this.m_strSeed, CONSTANTS.RANDOM_KEY_SEED_LEN);
        dataWriter.writeUInt32LE(this.m_nKeepAliveSpace);
        dataWriter.writeUInt32LE(this.m_nReserved1);
        dataWriter.writeUInt32LE(this.m_nReserved2);
        dataWriter.writeUInt32LE(this.m_nDataLen);
    }
};
exports.S4Data = S4Data;

// //////////////////////////////////////////////////////////////////////////////
// Class : IMPacket
// //////////////////////////////////////////////////////////////////////////////
function IMPacket() {
    this.m_strCommand = '';
    this.m_strVersion = '';
    this.m_eType = PTYPE.UNKNOWN;
    this.m_nSeqNumber = 0;
    this.m_mapParams = {};
    this.m_strBody = '';
    this.m_eSendState = 0;
    this.m_ackCallback = null;
}
IMPacket.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - Packet header decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : true if data is enough, false if others.
     */
    decode : function(dataReader) {
        var headerBuffer = new Buffer(dataReader.remainingLength());
        // dataReader.dump();
        var strHeader = '';
        var headerLen = dataReader.readUntil('\r\n\r\n', headerBuffer, 0);
        if (headerLen > 0) {
            strHeader = headerBuffer.toString('utf8', 0, headerLen);
        } else {
            strHeader = dataReader.readToString();
        }
        ;
        // console.log('decoded header : ');
        // console.dir(strHeader);
        if (strHeader.length > 0) {
            // Parse header
            var strLines = strHeader.split('\r\n');
            assert.ok(strLines.length > 0);
            var firstLineArray = strLines[0].split(' ');
            assert.ok(firstLineArray.length == 4);
            this.m_strCommand = firstLineArray[0];
            this.m_strVersion = firstLineArray[1];
            this.m_eType = this.parseType(firstLineArray[2]);
            this.m_nSeqNumber = Number(firstLineArray[3]);
            for ( var i = 1; i < strLines.length; i++) {
                var colonIndex = strLines[i].indexOf(':');
                if (colonIndex > 0) {
                    this.m_mapParams[strLines[i].substr(0, colonIndex)] = strLines[i]
                            .substr(colonIndex + 1);
                }
            }
            ;
            var bodyLength = 0;
            if (this.m_mapParams.hasOwnProperty('content-length')) {
                bodyLength = Number(this.m_mapParams['content-length']);
            } else if (this.m_mapParams.hasOwnProperty('Content-Length')) {
                bodyLength = Number(this.m_mapParams['Content-Length']);
            }
            var skipLength = headerLen > 0 ? 4 : 0;
            if (bodyLength + skipLength > dataReader.remainingLength()) {
                return false;
            } else {
                dataReader.skip(skipLength);
                if (this.m_mapParams.hasOwnProperty('content-type')
                        && this.m_mapParams['content-type'] == 'binary') {
                    this.m_strBody = dataReader.m_pParser.slice(
                            dataReader.m_nOffset, dataReader.m_nOffset
                                    + bodyLength);
                } else {
                    this.m_strBody = dataReader.readToString(bodyLength);
                }
                // console.log('decoded body : ');
                // console.dir(this.m_strBody);
            }
            ;
        }
        ;
        return true;
    },
    /**
     * encode - Packet header encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : encoded body string.
     */
    encode : function(dataWriter) {
        var strHeader = this.m_strCommand + ' ' + this.m_strVersion + ' '
                + this.formatType(this.m_eType) + ' ' + this.m_nSeqNumber
                + '\r\n';
        this.setContent();
        for (pairName in this.m_mapParams) {
            strHeader += pairName + ':' + this.m_mapParams[pairName] + '\r\n';
        }
        ;
        dataWriter.writeString(strHeader);
        // console.log('encoded header : ');
        // console.dir(strHeader);
        dataWriter.writeBytes('\r\n');
        if (this.m_strBody && this.m_strBody.length > 0) {
            dataWriter.writeString(this.m_strBody);
            // console.log('encoded body : ');
            // console.dir(this.m_strBody);
            // console.log('total length : ' + (strHeader.length +
            // this.m_strBody.length + 2));
        }
    },
    /**
     * calcSize - Dynamic calculate future packet size in binary format
     * 
     * @public
     * @return : packet size in binary format.
     */
    calcSize : function(num) {
        var packetSize = this.m_strCommand.length + this.m_strVersion.length
                + num.toString().length + 6;
        this.setContent();
        // console.dir(this.m_mapParams);
        for (pairName in this.m_mapParams) {
            var mbuf = new Buffer(this.m_mapParams[pairName].toString(), 'utf8');
            packetSize += pairName.length + mbuf.length + 3;
        }
        ;
        packetSize += 2;
        if (this.m_strBody && this.m_strBody.length > 0) {
            var buf = new Buffer(this.m_strBody, 'utf8');
            packetSize += buf.length;
        }
        ;
        return packetSize;
    },
    /**
     * dump - Dump packet to console for debug usage.
     * 
     * @public
     * @return : null.
     */
    dump : function(dumpInfo) {
        var strDump = 'IMPacket dump : ';
        if (typeof dumpInfo != 'undefined') {
            strDump += dumpInfo;
        }
        console.log(strDump);
        console.dir(this);
    },
    // //////////////////////////////////////////////////////////////////////////
    // Private method split line
    // - Don't invoke below methods directly!
    // //////////////////////////////////////////////////////////////////////////
    /**
     * setContent - Set content-length & content-type parameters of out going
     * packet.
     * 
     * @private
     * @return : null.
     */
    setContent : function() {
        delete this.m_mapParams['content-length'];
        delete this.m_mapParams['Content-Length'];
        delete this.m_mapParams['content-type'];
        delete this.m_mapParams['Content-Type'];
        if (this.m_strBody && this.m_strBody.length > 0) {
            var buf = new Buffer(this.m_strBody, 'utf8');
            this.m_mapParams['content-length'] = buf.length;
            this.m_mapParams['content-type'] = 'text';
        }
        ;
    },
    /**
     * parseType - Parse packet type from string format to enumerate format.
     * 
     * @private
     * @return : enumerate format packet type.
     */
    parseType : function(strType) {
        if ("R" == strType) {
            return PTYPE.REQ;
        }
        if ("A" == strType) {
            return PTYPE.ACK;
        }
        if ("N" == strType) {
            return PTYPE.NOTIFY;
        }
        return PTYPE.UNKNOWN;
    },
    /**
     * formatType - Format packet type from enumerate format to string format.
     * 
     * @private
     * @return : string format packet type.
     */
    formatType : function(type) {
        switch (type) {
            case PTYPE.ACK:
                return 'A';
            case PTYPE.NOTIFY:
                return 'N';
            case PTYPE.REQ:
                return 'R';
            default:
                throw TypeError('Unknown type');
        }
    },
};
exports.IMPacket = IMPacket;

// //////////////////////////////////////////////////////////////////////////////
// Class : OfflineMsg
// //////////////////////////////////////////////////////////////////////////////
function OfflineMsg() {
    this.m_eType = 0; // 32 bits : 0--聊天消息，1--请求类消息
    this.m_nTimestampHigh = 0; // 32 bits
    this.m_nTimestampLow = 0; // 32 bits
    this.m_nDataLen = 0; // 32 bits
    this.m_body = null; // Buffer type
}
OfflineMsg.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * decode - OfflineMsg decode interface
     * 
     * @params dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader) {
        this.m_eType = dataReader.readUInt32BE();
        this.m_nTimestampHigh = dataReader.readUInt32BE();
        this.m_nTimestampLow = dataReader.readUInt32BE();
        this.m_nDataLen = dataReader.readUInt32BE();
        this.m_body = dataReader.readToBuffer(this.m_nDataLen);
    },
    /**
     * encode - OfflineMsg encode interface
     * 
     * @params dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter) {
        dataWriter.writeUInt32BE(this.m_eType);
        dataWriter.writeUInt32BE(this.m_nTimestampHigh);
        dataWriter.writeUInt32BE(this.m_nTimestampLow);
        dataWriter.writeUInt32BE(this.m_nDataLen);
        dataWriter.writeBuffer(this.m_body);
    }
};
exports.OfflineMsg = OfflineMsg;

// //////////////////////////////////////////////////////////////////////////////
// Class : IMConnection
// //////////////////////////////////////////////////////////////////////////////
function IMConnection(handler) {
    if (typeof handler == 'undefined') {
        throw TypeError('Invalid `handler` value!');
    }
    ;
    this.m_eIoState = NETSTATE.CT_FLAG_CON_S1;
    this.m_eClientState = CLIENTSTATE.MAX;
    this.m_socket = null;
    this.m_handler = handler;
    this.m_nIntervalId = 0;
    this.m_nIntervalDelay = 40000;
    this.m_nSeqNumber = 1;
    this.m_sSendQueue = [];
    this.m_nPendingSend = 0;
    this.m_strSeed = null;
    this.m_recvBuffer = null;
    this.m_handler.m_Conn = this;
}
IMConnection.prototype = {
    // //////////////////////////////////////////////////////////////////////////
    // Public method split line
    // - Public interface for invoke.
    // //////////////////////////////////////////////////////////////////////////
    /**
     * connect - Open a tcp connection to server
     * 
     * @public
     */
    connect : function(params) {
        var conn = this;
        this.m_params = params;
        this.m_socket = net.connect(params);
        this.m_socket.on('connect', this.onConnect.bind(this));
        this.m_socket.on('data', this.onRecvData.bind(this));
        this.m_socket.on('end', this.onClosed.bind(this));
        this.m_socket.on('error', this.onError.bind(this));
        this.m_socket.on('close',
                function(err) {
                    if (err) {
                        // 监测socket的非正常关闭及关闭原因
                        console.log("\n\n socket improper shut down :");
                        // console.log(err);
                        // 防止未退出的情况下连接所产生错误.所以尝试去清理资源.
                        this.onClosed
                                && this.onClosed(undefined,
                                        'transmission error');
                    }
                });
        clearInterval(this.m_nIntervalId);
        // this.m_nIntervalId = setInterval(this.onTimer.bind(this),
        // this.m_nIntervalDelay);
    },
    /**
     * sendPacket - Send common request packet to server
     * 
     * @public
     */
    sendPacket : function(packet) {

        if (!this.m_socket || this.m_socket.destroyed) {
            console.log("call sendPacket, after the socket.end() ");
            this.onClosed(undefined, 'Connection has been closed');
            return;
        }

        if (typeof packet != 'undefined') {
            this.m_sSendQueue.push(packet);
        }
        ;
        if (this.m_nPendingSend > 0 || this.m_sSendQueue.length == 0) {
            return;
        }
        ;
        packet = null;
        for ( var i = 0; i < this.m_sSendQueue.length; i++) {
            if (this.m_sSendQueue[i].m_eSendState == PFLAG.SENDING) {
                return;
            }
            ;
            if (packet == null && this.m_sSendQueue[i].m_eSendState == 0) {
                packet = this.m_sSendQueue[i];
            }
            ;
        }
        if (packet) {
            // Queue next send request into kernel send queue
            // debugger;
            // packet.dump('Dump Before sendRaw.');
            var buffer = this.encodePacket(packet);
            this.sendRaw(buffer);
            packet.m_eSendState = PFLAG.SENDING;
            this.m_nPendingSend++;
            // this.m_nSeqNumber++;
        }
        ;
    },
    /**
     * securityVerify - Send security verify request packet to server
     * 
     * @public
     */
    securityVerify : function(userName) {
        var packet = this.makeSecurityVerifyPacket(userName);
        // packet.dump('security verify request packet before send');
        this.sendPacket(packet);
    },
    /**
     * login - Send login request packet to server
     * 
     * @public
     */
    login : function(verifyInfo, loginInfo) {
        var packet = this.makeLoginPacket(verifyInfo, loginInfo);
        // packet.dump('login request packet before send');
        this.sendPacket(packet);
    },
    /**
     * loginReady - Send login ready request packet to server
     * 
     * @public
     */
    loginReady : function(loginInfo, status) {
        this.m_params['uid'] = loginInfo['imid'];
        var packet = this.makeLoginReadyPacket(loginInfo, status);
        // packet.dump('login ready request packet before send');
        this.sendPacket(packet);
    },
    /**
     * redirect - Send login request packet to redirect server
     * 
     * @public
     */
    redirect : function(redirInfo) {
        // Update server info & redirect count
        this.m_params['host'] = redirInfo.domain;
        this.m_params['port'] = redirInfo.port;
        this.m_params['redirCount'] = redirInfo.redirect_times;
        this.m_socket.on('end', this.onClosed.bind(this, this.m_params));
        this.m_socket.end();
    },
    /**
     * timestampUser - Send timestamp::user request packet to server
     * 
     * @public
     */
    timestampUser : function(loginInfo) {
        this.m_params['uid'] = loginInfo['imid'];
        var packet = this.makeTimestampUserPacket(loginInfo);
        // packet.dump('timestamp user request packet before send');
        this.sendPacket(packet);
    },

    // //////////////////////////////////////////////////////////////////////////
    // Private method split line
    // - Don't invoke below methods directly!
    // //////////////////////////////////////////////////////////////////////////
    /**
     * sendRaw - Write raw data to kernel socket output buffer
     * 
     * @private
     */
    sendRaw : function(data) {
        var conn = this;
        this.m_socket.write(data, this.onSendDone.bind(this));
    },
    /**
     * encodeS1Packet - S1Data packet make & encode helper
     * 
     * @private
     */
    encodeS1Packet : function() {
        //
        var buffer = new Buffer(CONSTANTS.SIZEOF_BINARYHEADER
                + CONSTANTS.SIZEOF_S1DATA);
        var dataWriter = new BOStream(buffer, 0);
        var header = new BinaryHeader();
        header.m_nVer = CONSTANTS.PROTOCOL_VERSION; // 32 bits
        header.m_nTag = CONSTANTS.PROTOCOL_TAG; // 32 bits
        header.m_sCTFlag.m_nConFlag = NETSTATE.CT_FLAG_CON_S1;
        header.m_nSrcDataLen = CONSTANTS.SIZEOF_S1DATA; // 32 bits
        header.m_nZipDataLen = CONSTANTS.SIZEOF_S1DATA; // 32 bits
        header.m_nDestDataLen = CONSTANTS.SIZEOF_S1DATA; // 32 bits
        header.m_nSendFlag = 0; // 32 bits
        header.m_nCategory = 0; // 32 bits
        header.m_nReserved1 = 0; // 32 bits
        header.m_nReserved2 = 0; // 32 bits
        header.encode(dataWriter);
        var s1data = new S1Data();
        s1data.m_nEPVer = 1; // 8 bits
        s1data.m_nConMethod = CONMETHOD.CON_METHOD_NONE; // 32 bits
        s1data.m_nReserved1 = 0; // 32 bits
        s1data.m_nReserved2 = 0; // 32 bits
        s1data.m_nDataLen = 0; // 32 bits
        s1data.encode(dataWriter);
        // console.dir(buffer);
        return buffer;
    },
    /**
     * encodeS3Packet - S3Data packet make helper
     * 
     * @private
     */
    encodeS3Packet : function() {
        var buffer = new Buffer(CONSTANTS.SIZEOF_BINARYHEADER
                + CONSTANTS.SIZEOF_S3DATA);
        var dataWriter = new BOStream(buffer, 0);
        var header = new BinaryHeader();
        header.m_nVer = CONSTANTS.PROTOCOL_VERSION; // 32 bits
        header.m_nTag = CONSTANTS.PROTOCOL_TAG; // 32 bits
        header.m_sCTFlag.m_nConFlag = NETSTATE.CT_FLAG_CON_S3;
        header.m_nSrcDataLen = CONSTANTS.SIZEOF_S3DATA; // 32 bits
        header.m_nZipDataLen = CONSTANTS.SIZEOF_S3DATA; // 32 bits
        header.m_nDestDataLen = CONSTANTS.SIZEOF_S3DATA; // 32 bits
        header.m_nSendFlag = 0; // 32 bits
        header.m_nCategory = 0; // 32 bits
        header.m_nReserved1 = 0; // 32 bits
        header.m_nReserved2 = 0; // 32 bits
        header.encode(dataWriter);
        var s3data = new S3Data();
        s3data.m_nReserved1 = 0; // 32 bits
        s3data.m_nReserved2 = 0; // 32 bits
        s3data.m_nDataLen = 0; // 32 bits
        s3data.encode(dataWriter);
        // console.dir(buffer);
        return buffer;
    },
    /**
     * encodePacket - Common packet make helper
     * 
     * @private
     */
    encodePacket : function(packet) {
        var packetSize = packet.calcSize(this.m_nSeqNumber);
        var buffer = new Buffer(CONSTANTS.SIZEOF_BINARYHEADER + packetSize);
        var dataWriter = new BOStream(buffer, 0);
        var header = new BinaryHeader();
        header.m_nVer = CONSTANTS.PROTOCOL_VERSION; // 32 bits
        header.m_nTag = CONSTANTS.PROTOCOL_TAG; // 32 bits
        if (packet.m_bHeartBeat) {
            header.m_sCTFlag.m_nConFlag = NETSTATE.CT_FLAG_KEEPALIVE;
        } else {
            header.m_sCTFlag.m_nConFlag = NETSTATE.CT_FLAG_CON_OK;
        }
        ;
        header.m_sCTFlag.m_bHeartBeat = 1;
        header.m_nSrcDataLen = packetSize; // 32 bits
        header.m_nZipDataLen = packetSize; // 32 bits
        header.m_nDestDataLen = packetSize; // 32 bits
        header.m_nSendFlag = 0; // 32 bits
        header.m_nCategory = 0; // 32 bits
        header.m_nReserved1 = 0; // 32 bits
        header.m_nReserved2 = 0; // 32 bits
        header.encode(dataWriter);
        packet.m_nSeqNumber = this.m_nSeqNumber++;
        packet.encode(dataWriter);

        // var strDump = buffer.toString('utf8');
        // console.log('binary format packet before send : ');
        // console.dir(strDump);

        return buffer;
    },
    /**
     * encryptPassword - Encrypt plain text password to secret text
     * 
     * @private
     */
    encryptPassword : function(password) {
        assert.ok(this.m_strSeed.length == 16);
        var md5 = crypto.createHash('md5');
        var strPwd = md5.update(password).digest('hex');
        md5 = crypto.createHash('md5');
        var result = md5.update(strPwd + this.m_strSeed).digest('hex');
        return result;
    },
    /**
     * makeSecurityVerifyPacket - Login packet make helper
     * 
     * @private
     */
    makeSecurityVerifyPacket : function(userName) {
        var packet = new IMPacket();
        packet.m_strCommand = COMMANDS.SECURITY;
        packet.m_strVersion = COMMANDS.SECURITY_VERSION;
        packet.m_eType = PTYPE.REQ;
        // packet.m_nSeqNumber = this.m_nSeqNumber;
        packet.m_mapParams['method'] = METHODS.VERIFY;
        packet.m_mapParams['uid'] = 0;
        packet.m_mapParams['lid'] = userName;
        packet.m_mapParams['type'] = 1;
        return packet;
    },
    /**
     * makeLoginPacket - Login packet make helper
     * 
     * @private
     */
    makeLoginPacket : function(verifyInfo, loginInfo) {
        if (typeof verifyInfo == 'undefined' || typeof loginInfo == 'undefined') {
            throw TypeError('Invalid argument!');
        }
        ;
        var packet = new IMPacket();
        packet.m_strCommand = COMMANDS.LOGIN;
        packet.m_strVersion = COMMANDS.LOGIN_VERSION;
        packet.m_eType = PTYPE.REQ;
        // packet.m_nSeqNumber = this.m_nSeqNumber;
        packet.m_mapParams['method'] = METHODS.LOGIN;
        packet.m_mapParams['priority'] = LOGIN_PRIORITYS.LOGIN_PRIORITY_CLIENT;
        for (i in verifyInfo) {
            packet.m_mapParams[i] = verifyInfo[i];
        }
        ;
        packet.m_strBody = '<login><user ' + 'new_username="'
                + loginInfo.userName + '" account="' + loginInfo.account
                + '" password="' + this.encryptPassword(loginInfo.password)
                + '" imversion="' + loginInfo.version + '" localtime="'
                + new Date().getUTCMilliseconds() + '" redirect_times="'
                + loginInfo.redirCount + '" client_type="'
                + CLIENTTYPE.CLIENTNORMAL + '"/></login>';
        return packet;
    },
    /**
     * makeLoginReadyPacket - Login ready packet make helper
     * 
     * @private
     */
    makeLoginReadyPacket : function(loginInfo, status) {
        if (typeof loginInfo == 'undefined') {
            throw TypeError('Invalid argument!');
        }
        ;
        var packet = new IMPacket();
        packet.m_strCommand = COMMANDS.USER;
        packet.m_strVersion = COMMANDS.USER_VERSION;
        packet.m_eType = PTYPE.REQ;
        // packet.m_nSeqNumber = this.m_nSeqNumber;
        packet.m_mapParams['method'] = METHODS.LOGIN_READY;
        packet.m_mapParams['uid'] = loginInfo['imid'];
        packet.m_strBody = '<login><user ' + 'status="'
                + (status || PCONST.STATUS_ONLINEREADY) + '" localeid="'
                + CONSTANTS.LOCALE_ID + '" imversion="' + CONSTANTS.IM_VERSION
                + '"/></login>';
        return packet;
    },
    /**
     * makeSecurityVerifyPacket - Login packet make helper
     * 
     * @private
     */
    makeTimestampUserPacket : function(loginInfo) {
        var packet = new IMPacket();
        packet.m_strCommand = COMMANDS.SECURITY;
        packet.m_strVersion = COMMANDS.SECURITY_VERSION;
        packet.m_eType = PTYPE.REQ;
        // packet.m_nSeqNumber = this.m_nSeqNumber;
        packet.m_mapParams['method'] = METHODS.USER;
        packet.m_mapParams['uid'] = loginInfo['imid'];
        return packet;
    },
    /**
     * makeHeartBeatPacket - Heart beat packet make helper
     * 
     * @private
     */
    makeHeartBeatPacket : function() {
        var packet = new IMPacket();
        packet.m_strCommand = 'service';
        packet.m_strVersion = '1.0';
        packet.m_eType = PTYPE.REQ;
        packet.m_nSeqNumber = this.m_nSeqNumber;
        packet.m_mapParams['method'] = 'heartbeat';
        packet.m_mapParams['uid'] = this.m_params['uid'];
        packet.m_bHeartBeat = true;
        return packet;
    },

    // //////////////////////////////////////////////////////////////////////////
    // Private event handler split line
    // - Below methods are for internal usage only, Don't invoke them directly!
    // //////////////////////////////////////////////////////////////////////////
    /**
     * onConnect - Socket connect done event handler
     * 
     * @private
     */
    onConnect : function() {
        this.m_eClientState = CLIENTSTATE.CONNECTED;
        // Prepare & send S1DATA to server
        var buffer = this.encodeS1Packet();
        this.sendRaw(buffer);
        this.m_eIoState = NETSTATE.CT_FLAG_CON_S1;
    },
    /**
     * onRecvData - Data recv done event handler
     * 
     * @private
     */
    onRecvData : function(data) {
        // Decode common packet header
        if (Buffer.isBuffer(data)) {
            if (this.m_recvBuffer) {
                this.m_recvBuffer = Buffer.concat([ this.m_recvBuffer, data ]);
            } else {
                this.m_recvBuffer = data;
            }
        } else if (!this.m_recvBuffer) {
            debugger;
            console.error(this);
        }
        var dataReader = new BIStream(this.m_recvBuffer,
                this.m_recvBuffer.length, 0);
        var header = new BinaryHeader();
        header.decode(dataReader);
        // console.dir(header);
        switch (this.m_eIoState) {
            case NETSTATE.CT_FLAG_CON_S1: {
                // Decode S2Data packet from server
                assert
                        .ok(header.m_sCTFlag.m_nConFlag == NETSTATE.CT_FLAG_CON_S2);
                var s2data = new S2Data();
                s2data.decode(dataReader);
                // console.dir(s2data);
                // Prepare & send S3Data to server
                var buffer = this.encodeS3Packet();
                this.sendRaw(buffer);
                this.m_eIoState = NETSTATE.CT_FLAG_CON_S3;
                this.m_recvBuffer = null;
                break;
            }
            case NETSTATE.CT_FLAG_CON_S3: {
                // Decode S4Data packet received from server
                assert
                        .ok(header.m_sCTFlag.m_nConFlag == NETSTATE.CT_FLAG_CON_S4);
                var s4data = new S4Data();
                // dataReader.dump('S4Data before decode : ');
                s4data.decode(dataReader);
                // console.dir(s4data);
                // Save seed
                this.m_strSeed = s4data.m_strSeed;
                // Get heart beat config string
                var headerLen = CONSTANTS.SIZEOF_BINARYHEADER
                        + CONSTANTS.SIZEOF_S4DATA;
                var xmlConfig = this.m_recvBuffer.toString('utf8', headerLen,
                        this.m_recvBuffer.length);
                // console.dir(xmlConfig);
                // Change state to CT_FLAG_CON_OK
                this.m_eIoState = NETSTATE.CT_FLAG_CON_OK;
                // Make callback
                this.onConOK(xmlConfig);
                this.m_recvBuffer = null;
                break;
            }
            case NETSTATE.CT_FLAG_CON_OK: {
                // Decode common packet received from server
                // dataReader.dump('binary packet data before decode');
                if (dataReader.remainingLength() >= header.m_nSrcDataLen) {
                    var packet = new IMPacket();
                    var packetBuffer = this.m_recvBuffer.slice(
                            dataReader.m_nOffset, dataReader.m_nOffset
                                    + header.m_nSrcDataLen);
                    var packetReader = new BIStream(packetBuffer,
                            packetBuffer.length, 0);
                    // packetReader.dump('binary packet data before decode 2');
                    assert.ok(packet.decode(packetReader));
                    // debugger;
                    this.onPacket(packet);
                    dataReader.skip(header.m_nSrcDataLen);
                    if (dataReader.remainingLength() > 0) {
                        this.m_recvBuffer = this.m_recvBuffer
                                .slice(dataReader.m_nOffset);
                        if (this.m_recvBuffer.length >= CONSTANTS.SIZEOF_BINARYHEADER) {
                            this.onRecvData();
                        }
                        // process.nextTick(this.onRecvData.bind(this));
                    } else {
                        this.m_recvBuffer = null;
                    }
                }
                ;
                break;
            }
            default:
                break;
        }
    },
    /**
     * onConOK - Handshake finished event handler
     * 
     * @private
     */
    onConOK : function(xmlConfig) {
        console.log("INFO : ON CONNECTION OK. \n\n");
        // Parse xml config infomation
        var doc = new DOMParser().parseFromString(xmlConfig);
        var root = doc.documentElement;
        var heartbeat = root.firstChild;
        var heartbeatConfig = {};
        for ( var i = 0; i < heartbeat.attributes.length; i++) {
            var attr = heartbeat.attributes[i];
            heartbeatConfig[attr.nodeName] = Number(attr.nodeValue);
        }
        ;
        // Notify handler
        this.m_handler.onHeartBeatConfig(heartbeatConfig);
        this.m_nIntervalId = setInterval(this.onTimer.bind(this),
                this.m_nIntervalDelay);
    },
    /**
     * onPacket - Common packet handler
     * 
     * @private
     */
    onPacket : function(packet) {
        var bHandled = false;
        // packet.dump('received packet after decoded');
        if (packet.m_eType == PTYPE.ACK) {
            // Most of times, when we received a ack packet, there should
            // always have a request packet in the send queue, but we will
            // receive a tickout ack packet when we were kicked out by
            // server even though we didn't send a request.
            if (this.m_sSendQueue.length > 0) {
                // Remove request packet from send queue
                var reqPacket = null;
                for ( var i = 0; i < this.m_sSendQueue.length; i++) {
                    if (this.m_sSendQueue[i].m_nSeqNumber == packet.m_nSeqNumber) {
                        reqPacket = this.m_sSendQueue.splice(i, 1).shift();
                    }
                    ;
                }
                ;
                if (reqPacket != null) {
                    // assert.ok(reqPacket.m_eSendState == PFLAG.SENDDONE);
                    assert.ok(reqPacket.m_eType == PTYPE.REQ);
                    if (reqPacket.m_ackCallback) {
                        reqPacket.m_ackCallback(packet);
                        bHandled = true;
                    }
                    ;
                }
            }
        }
        if (!bHandled) {
            this.m_handler.onPacket(packet);
        }
    },
    /**
     * onSendDone - Data send done event handler
     * 
     * @private
     */
    onSendDone : function(netErr) {
        if (netErr) {
            // 监测如果发包回调是由错误产生的，则记入log；
            console.log(netErr);

            try {
                // 由于某些错误，当socket的写操作不能完成时，则关闭该socket,并手功触发关闭事件,
                // 此处由于不关注onClosed执行多次，但起码要执行一次，由于hiServer，FIN包始终收不到所以统统手动多执行一次.
                this.m_socket.destroy();
                this.onClosed(undefined, 'sendDoneFailt');
            } catch (e) {
                console.log(e);
            }
            return;
        }

        switch (this.m_eIoState) {
            case NETSTATE.CT_FLAG_CON_OK: {
                // assert.ok(this.m_sSendQueue.length > 0);
                // assert.ok(this.m_nPendingSend == 1);
                this.m_nPendingSend--;
                var packet = null;
                var i = 0;
                for (i = 0; i < this.m_sSendQueue.length; i++) {
                    if (this.m_sSendQueue[i].m_eSendState == PFLAG.SENDING) {
                        packet = this.m_sSendQueue[i];
                        break;
                    }
                }
                ;
                if (packet == null) {
                    debugger;
                    console.log("packet == null");
                    break;
                }
                // assert.ok(packet != null);
                assert.ok(packet.m_eSendState == PFLAG.SENDING);
                if (packet.m_eType != PTYPE.REQ) {
                    this.m_sSendQueue.splice(i, 1);
                } else {
                    packet.m_eSendState = PFLAG.SENDDONE;
                }
                // Try to send next packet
                this.sendPacket();
            }
                break;
        }
    },
    /**
     * onClosed - Socket close event handler
     * 
     * @private
     */
    onClosed : function(redirInfo, msg) {
        console.log('onClosed');
        // stop heartbeat.
        clearInterval(this.m_nIntervalId);

        this.m_eClientState = CLIENTSTATE.CLOSED;
        if (typeof redirInfo != 'undefined') {
            // Redirect
            this.m_eIoState = NETSTATE.CT_FLAG_CON_S1;
            this.m_eClientState = CLIENTSTATE.MAX;
            this.m_socket = null;
            this.m_nIntervalId = 0;
            this.m_nIntervalDelay = 5000;
            this.m_nSeqNumber = 1;
            this.m_sSendQueue = [];
            this.m_nPendingSend = 0;
            this.m_strSeed = null;
            this.connect(redirInfo);
        } else {
            this.m_handler.onClosed(msg);
        }
    },
    /**
     * onError - Socket error event handler
     * 
     * @private
     */
    onError : function(msg) {
        console.log('onError : ' + msg);
        this.onClosed(undefined, msg);
    },
    /**
     * onTimer - Timer event handler
     * 
     * @private
     */
    onTimer : function() {
        console.log('onHeartBeat', this.m_params['uid']);
        if (this.m_params['uid'] == undefined) {
            //FIXME 心跳失败时，则应认为登陆状态已失败.应做登出清理的处理。
            return;
        }
        var packet = this.makeHeartBeatPacket();
        this.sendPacket(packet);
    },
};
exports.IMConnection = IMConnection;

// //////////////////////////////////////////////////////////////////////////////
// Class : IMConnHandler
// //////////////////////////////////////////////////////////////////////////////
function IMConnHandler(params) {
    if (typeof params == 'undefined') {
        throw TypeError('Invalid `params` argument');
    } else {
    }
    ;
    this.m_Conn = null;
    this.m_params = {};
    for ( var key in params) {
        this.m_params[key] = params[key];
    }
}

IMConnHandler.prototype = {
    /**
     * onHeartBeatConfig - Heart beat config handler
     * 
     * @private
     */
    onHeartBeatConfig : function(heartBeatConfig) {
        // TODO : Process heart beat config
        // console.log('==================================[[Received heart beat
        // ' +
        // 'config handled by IMConnHandler]]==================');
        // console.dir(heartBeatConfig);
        // Send secure verify request to server
        this.m_Conn.securityVerify(this.m_params['account']);
    },
    /**
     * onPacket - Common packet handler
     * 
     * @private
     */
    onPacket : function(packet) {
        // packet.dump('=======================[[Received packet handled by ' +
        // 'IMConnHandler]]========================');
        var bHandled = true;
        var strMethod = packet.m_mapParams['method'];
        var getExtendHandle = (function() {
            var methodFirstName = packet.m_strCommand;
            methodFirstName = methodFirstName.substr(0, 1).toUpperCase()
                    + methodFirstName.substr(1);
            // 如果没有方法,则使用default关键字,用于生成一个处理该类所有不能处理的包的处理方法
            var methodLastName = packet.m_mapParams['method'] || "default";
            methodLastNamePart = methodLastName.split("_");
            methodLastName = '';
            methodLastNamePart.forEach(function(item) {
                methodLastName += item.substr(0, 1).toUpperCase()
                        + item.substr(1);
            });
            var methodName = 'on' + methodFirstName + methodLastName;

            if (typeof (this[methodName]) === 'function') {
                this[methodName](packet);
                return true;
            } else {
                console.log('no method : ' + methodName);
                return false;
            }
        }).bind(this);

        switch (packet.m_strCommand) {
            case COMMANDS.SECURITY:
                switch (strMethod) {
                    case METHODS.VERIFY:
                        this.onSecurityVerify(packet);
                        break;
                    default:
                        bHandled = getExtendHandle();
                        break;
                }
                break;
            case COMMANDS.LOGIN:
                switch (strMethod) {
                    case METHODS.LOGIN:
                        this.onLogin(packet);
                        break;
                    default:
                        bHandled = getExtendHandle();
                        break;
                }
                break;
            case COMMANDS.USER:
                switch (strMethod) {
                    case METHODS.LOGIN_READY:
                        this.onLoginReady(packet);
                        break;
                    case METHODS.NOTIFY:
                        this.onUserNotify(packet);
                        break;
                    default:
                        bHandled = getExtendHandle();
                        break;
                }
                break;
            case COMMANDS.CONTACT:
                switch (strMethod) {
                    case METHODS.NOTIFY:
                        this.onContactNotify(packet);
                        break;
                    default:
                        bHandled = getExtendHandle();
                        break;
                }
                break;
            case COMMANDS.QUERY:
                switch (strMethod) {
                    case METHODS.NOTIFY:
                        this.onQueryNotify(packet);
                        break;
                    case METHODS.OFFLINE_MSG_NOTIFY:
                        this.onOfflineMsgNotify(packet);
                        break;
                    default:
                        bHandled = getExtendHandle();
                        break;
                }
                break;
            default:
                bHandled = getExtendHandle();
                break;
        }
        if (!bHandled) {
            // packet.dump('Unhandled packet : [' + packet.m_strCommand +
            // '::' + strMethod + '] :');
        }
        ;
    },
    /**
     * onSecurityVerify - Security verify response packet handler
     * 
     * @private
     */
    onSecurityVerify : function(packet) {
        if (packet.m_strBody.length > 0) {
            // Parse xml format packet body
            var doc = new DOMParser().parseFromString(packet.m_strBody);
            var root = doc.documentElement;
            var verifyInfo = {};
            for ( var i = 0; i < root.attributes.length; i++) {
                var attr = root.attributes[i];
                verifyInfo[attr.nodeName] = attr.nodeValue;
            }
            ;
            console.dir(verifyInfo);
            var loginInfo = {
                userName : this.m_params.account,
                account : this.m_params.account,
                password : this.m_params.password,
                version : CONSTANTS.IM_VERSION,
                redirCount : 0
            };
            this.m_Conn.login(verifyInfo, loginInfo);
        }
    },
    /**
     * onLogin - Login response packet handler
     * 
     * @private
     */
    onLogin : function(packet) {
        var retCode = Number(packet.m_mapParams['code']);
        if (retCode == PCONST.IMP_ACK_SUCCESS
                || retCode == PCONST.IMP_ACK_LOGIN_REDIRECT) {
            assert.ok(packet.m_strBody.length > 0);
            // Parse xml format packet body
            var doc = new DOMParser().parseFromString(packet.m_strBody);
            var root = doc.documentElement;
            var loginInfo = {};
            for ( var i = 0; i < root.attributes.length; i++) {
                var attr = root.attributes[i];
                loginInfo[attr.nodeName] = attr.nodeValue;
            }
            ;
            // console.dir(loginInfo);
            this._imid = loginInfo.imid;
            switch (retCode) {
                case PCONST.IMP_ACK_SUCCESS:
                    this.m_Conn.loginReady(loginInfo);
                    this._imid = loginInfo.imid; // 记录imid,
                    break;
                case PCONST.IMP_ACK_LOGIN_REDIRECT:
                    this.m_Conn.redirect(loginInfo);
                    break;
            }
        } else { // Other status code procedure
            //
        }
        ;
    },
    /**
     * onUserNotify - User notify packet handler
     * 
     * @private
     */
    onUserNotify : function(packet) {
        assert.ok(packet.m_strBody.length > 0)
        // Parse xml format packet body
        var doc = new DOMParser().parseFromString(packet.m_strBody);
        var root = doc.documentElement;
        var notifyInfo = {};
        for ( var i = 0; i < root.attributes.length; i++) {
            var attr = root.attributes[i];
            notifyInfo[attr.nodeName] = attr.nodeValue;
        }
        ;
        console.dir(notifyInfo);
        // this.getFriendList();
    },
    /**
     * onContactNotify - Contact notify packet handler
     * 
     * @private
     */
    onContactNotify : function(packet) {
        assert.ok(packet.m_strBody.length > 0)
        // Parse xml format packet body
        var doc = new DOMParser().parseFromString(packet.m_strBody);
        var root = doc.documentElement;
        var notifyInfo = {};
        for ( var i = 0; i < root.attributes.length; i++) {
            var attr = root.attributes[i];
            notifyInfo[attr.nodeName] = attr.nodeValue;
        }
        ;
        console.dir(notifyInfo);
        // this.getFriendList();
    },
    /**
     * onQueryNotify - Query notify packet handler
     * 
     * @private
     */
    onQueryNotify : function(packet) {
        assert.ok(packet.m_strBody.length > 0)
        // Parse xml format packet body
        var doc = new DOMParser().parseFromString(packet.m_strBody);
        var root = doc.documentElement;
        var notifyInfo = {};
        for ( var i = 0; i < root.attributes.length; i++) {
            var attr = root.attributes[i];
            notifyInfo[attr.nodeName] = attr.nodeValue;
        }
        ;
        console.dir(notifyInfo);
        // this.getFriendList();
    },
    /**
     * onOfflineMsgNotify - Offline message notify packet handler
     * 
     * @private
     */
    onOfflineMsgNotify : function(packet) {
        packet.dump('OfflineMsgNotify packet : ');
        if (packet.m_strBody.length > 0) {
            // Parse xml format packet body
            var doc = new DOMParser().parseFromString(packet.m_strBody);
            var root = doc.documentElement;
            var notifyInfo = {};
            for ( var i = 0; i < root.attributes.length; i++) {
                var attr = root.attributes[i];
                notifyInfo[attr.nodeName] = attr.nodeValue;
            }
            ;
            console.dir(notifyInfo);
        }
    },
    onClosed : function() {
        // Dereference connection instance to avoid loop reference
        this.m_Conn = null;
    }
};
exports.IMConnHandler = IMConnHandler;

// //////////////////////////////////////////////////////////////////////////////
// Test utilities & functions
// //////////////////////////////////////////////////////////////////////////////

// 查询用户自己的一般信息.
var TPL_USER_QUERY = '<query fields="nickname;personal_comment;head;name;info_open_level;frequency_sort;friendly_level;phone;visible;tmsg_policy"/>';

function entryPoint() {
    var userInfo = {
        account : 'imrd_100',
        password : '123456'
    }; // 正确的
    // var userInfo = {account:'imrd_100', password:'1234567'}; // 错误的
    var hostInfo = {
        port : 8863,
        host : '10.23.248.83'
    };
    var handler = new IMConnHandler(userInfo);

    handler.getUserQuery = function() {
        var packet = new IMPacket();
        packet.m_strCommand = 'user';
        packet.m_strVersion = '2.0';
        packet.m_eType = PTYPE.REQ;
        packet.m_mapParams['method'] = 'query';
        packet.m_mapParams['uid'] = this._imid;
        packet.m_strBody = TPL_USER_QUERY;
        this.m_Conn.sendPacket(packet);
        console.log(handler.onUserQuery);
    };

    handler.onUserQuery = function(packet) {
        var data = {};
        var doc = new DOMParser().parseFromString(packet.m_strBody);
        var root = doc.documentElement;
        var userNode = root.getElementsByTagName('user');
        var account = root.getElementsByTagName('account');
        data.imid = userNode.getAttribute('imid');
        console.log(typeof (account.attributes));
    };

    handler.onLoginReady = function(packet) {
        var retCode = Number(packet.m_mapParams['code']);
        if (retCode == PCONST.IMP_ACK_SUCCESS) {
            // Login succeed
            console.log('Login succeed! \n\n\n\n\n');

            this.getUserQuery();

        } else {
            // Login failed
            console.dir('Login failed!');
        }
        ;
    };

    var conn = new IMConnection(handler);
    conn.connect(hostInfo);
}

// entryPoint();

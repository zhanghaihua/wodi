////////////////////////////////////////////////////////////////////////////////
// Project Name : HiApp 
//                - A web Hi application powered by Node.Js
// File name    : IMImageLoader.js
//                - Hi image transfer protocol parser & connection 
//                - implementation written with pure javascript, run on Node.Js.
// Author       : zhoukai(zhoukai@baidu.com)
// Wrote date   : 2013.01.07 - 2013.01.14
////////////////////////////////////////////////////////////////////////////////

var net = require('net');
var assert = require('assert');
var IMStreamReader = require('./IMProtocolStreamReader.js');

var BOStream = IMStreamReader.BOStream; 
var BIStream = IMStreamReader.BIStream;

////////////////////////////////////////////////////////////////////////////////
// Constants : CONSTANTS
//   - Common constants
////////////////////////////////////////////////////////////////////////////////
var CONSTANTS = {
    RANDOM_KEY_SEED_LEN       : 16,
    SIZEOF_BINARYHEADER       : 36,
    SIZEOF_REQIMGHEADER       : 36,
    SIZEOF_RESPIMGHEADER      : 40,
    SIZEOF_HEADERRESERVED     : 12,
    MD5HASHSIZE               : 16,

    //Result宏定义
    RESP_RESULT_SUCCESS       : 0x00000000,
    RESP_RESULT_FAIL          : 0xFFFFFFFF,
    // Result宏定义

    CURRENT_UDPRS_VERSION     :  1,       //数据包定义的版本
    CURRENT_CHECKBYTES        :  0x1000,  //一个简单的固定标志

    MEDIA_AUTH_DATA           :  0x0001,  //针对Audio和Vidio的认证；
    DISPLAY_IMAGE_AUTH        :  0x0002,  //针对头像传输的认证
    EMOTION_IMAGE_AUTH        :  0x0003,  //针对表情传输的认证（多人）
    OTHER_IMAGE_AUTH          :  0x0004,  //针对普通图片传输的认证（多人）
    FILE_AUTH                 :  0x0005,  //针对普通文件传输的认证

    DIRECT_UDP_DATA           :  0x4001,  //UDP直连数据包，收到该包表示自己是外网地址
    DIRECT_TCP_DATA           :  0x4002,  //TCP直连数据包，收到该包表示自己是外网地址

    KEEP_ALIVE_MSG            :  0x4008,  //和中转节点（客户端，服务器）的keep-alive 服务类型
    KEEP_ALIVE_RSP            :  0x4009,  //和中转节点（客户端，服务器）的keep-alive 服务类型

    REFUSE_REDIR_MSG          :  0x5000,  //中转节点发出的拒绝服务指令

    MEDIA_AUTH_DATA_RESP      :  0x8001,  //针对Audio和Vidio的认证的应答
    DISPLAY_IMAGE_AUTH_RESP   :  0x8002,  //针对头像传输的认证的应答
    EMOTION_IMAGE_AUTH_RESP   :  0x8003,  //针对表情传输的认证（多人）的应答
    OTHER_IMAGE_AUTH_RESP     :  0x8004,  //针对普通图片传输的认证（多人）的应答
    FILE_AUTH_RESP            :  0x8005,  //针对普通文件传输的认证的应答

    AUDIO_RTP_DATA            :  0x0011,  //服务直接转发
    AUDIO_RTCP_DATA           :  0x0012,  //服务直接转发
    VIDEO_RTP_DATA            :  0x0013,  //服务直接转发
    VIDEO_RTCP_DATA           :  0x0014,  //服务直接转发
    GEN_FILE_DATA             :  0x0015,  //普通文件数据
    MA_HBEAT_DATA             :  0x0017,  //音视频保持心跳的包

    //inner used 
    CLIENT_PROBE              :  0x7001,  //直连探测包
    CLIENT_PROBE_RSP          :  0x7002,  //直连探测包连通应答
    SELF_UDPINFO_QUERY        :  0x7003,  //向udp服务器询问自己的外部地址和端口
    SELF_UDPINFO_RESP         :  0x7004,  //udp服务器回应节点的外部地址和端口
    NAT_DETECT_QUERY          :  0x7005,  //从udp服务器发来的NAT探测包，客户端通过其得出自己nat的类型


    QUERY_DISPLAY_IMAGE       :  0x0020,  //查询头像是否存在？
    QUERY_EMOTION_IMAGE       :  0x0021,  //查询表情是否存在？
    QUERY_OTHER_IMAGE         :  0x0022,  //查询图片是否存在？
    UPLOAD_DISPLAY_IMAGE      :  0x0023,  //头像数据
    UPLOAD_EMOTION_IMAGE      :  0x0024,  //表情数据（多人）
    UPLOAD_OTHER_IMAGE        :  0x0025,  //普通图片数据（多人）
    DOWNLOAD_DISPLAY_IMAGE    :  0x0026,  //头像数据
    DOWNLOAD_EMOTION_IMAGE    :  0x0027,  //表情数据（多人）
    DOWNLOAD_OTHER_IMAGE      :  0x0028,  //普通图片数据（多人）


    QUERY_DISPLAY_IMAGE_RESP       : 0x8020,  //针对头像查询的应答
    QUERY_EMOTION_IMAGE_RESP       : 0x8021,  //针对表情查询的应答
    QUERY_OTHER_IMAGE_RESP         : 0x8022,  //针对表情查询的应答
    UPLOAD_DISPLAY_IMAGE_RESP      : 0x8023,  //头像数据应答
    UPLOAD_EMOTION_IMAGE_RESP      : 0x8024,  //表情数据（多人）应答
    UPLOAD_OTHER_IMAGE_RESP        : 0x8025,  //普通图片数据（多人）应答
    DOWNLOAD_DISPLAY_IMAGE_RESP    : 0x8026,  //头像数据
    DOWNLOAD_EMOTION_IMAGE_RESP    : 0x8027,  //表情数据（多人）
    DOWNLOAD_OTHER_IMAGE_RESP      : 0x8028,  //普通图片数据（多人）

    IMAGE_RESULT_SUCCESS           : 0x00000000,
    IMAGE_RESULT_FAIL              : 0xFFFFFFFF,
};
exports.CONSTANTS = CONSTANTS;

////////////////////////////////////////////////////////////////////////////////
//Constants : NETSTATE
////////////////////////////////////////////////////////////////////////////////
var NETSTATE = {
SEND_AUTH_REQ     : 0x0,
RECV_AUTH_RESP    : 0x01,
SEND_IMG_REQ      : 0x02,
RECV_IMG_HEADER   : 0x03,
RECV_IMG_DATA     : 0x04,
};
exports.NETSTATE = NETSTATE;

////////////////////////////////////////////////////////////////////////////////
// Class : BinaryHeader
////////////////////////////////////////////////////////////////////////////////
function BinaryHeader(){
    this.m_nVersion     = 0;      // 16 bits : version
    this.m_nServiceType = 0;      // 16 bits : 指定数据包的类型
    this.m_nCheckByte   = 0;      // 16 bits : 固定的标志，用来区分自己的数据包
    this.m_nReserved    = 0;      // 16 bits : 保留字段
    this.m_nSourceId    = 0;      // 32 bits : 源id   
    this.m_nBaiduId     = 0;      // 32 bits : 目标方的内部id  
    this.m_nSvcBusyFlag = 0;      // 32 bits : 0,1 默认是0，如果繁忙超过一定界限，为1
    this.m_nRedirSpeed  = 0;      // 32 bits : 中转速度,默认10K
}
BinaryHeader.prototype = {
    ////////////////////////////////////////////////////////////////////////////
    // Public method split line
    //   - Public interface for invoke.
    ////////////////////////////////////////////////////////////////////////////
    /**
     * decode
     *  - Binary packet header decode interface
     * @params
     *    dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader){
        this.m_nVersion     = dataReader.readUInt16LE();
        this.m_nServiceType = dataReader.readUInt16LE();
        this.m_nCheckByte   = dataReader.readUInt16LE();
        this.m_nReserved    = dataReader.readUInt16LE();
        this.m_nSourceId    = dataReader.readUInt32LE();
        this.m_nBaiduId     = dataReader.readUInt32LE();
        this.m_nSvcBusyFlag = dataReader.readUInt32LE();
        this.m_nRedirSpeed  = dataReader.readUInt32LE();
        // Skip reverved 12 bytes data
        dataReader.skip(CONSTANTS.SIZEOF_HEADERRESERVED);
    },
    /**
     * encode
     *  - Binary packet header encode interface
     * @params
     *    dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter){
        dataWriter.writeUInt16LE(this.m_nVersion);
        dataWriter.writeUInt16LE(this.m_nServiceType);
        dataWriter.writeUInt16LE(this.m_nCheckByte);
        dataWriter.writeUInt16LE(this.m_nReserved);
        dataWriter.writeUInt32LE(this.m_nSourceId);
        dataWriter.writeUInt32LE(this.m_nBaiduId);
        dataWriter.writeUInt32LE(this.m_nSvcBusyFlag);
        dataWriter.writeUInt32LE(this.m_nRedirSpeed);
        // Skip reverved 12 bytes data
        dataWriter.skip(CONSTANTS.SIZEOF_HEADERRESERVED);
    }
};
exports.BinaryHeader = BinaryHeader;

////////////////////////////////////////////////////////////////////////////////
// Class : ReqImgHeader
////////////////////////////////////////////////////////////////////////////////
function ReqImgHeader(){
    this.m_md5          = null;     // 128 bits : 图片的MD5值
    this.m_nOffset      = 0;        // 32 bits : 查询请求置0，上载时表示文件起始位置
    this.m_nDataLen     = 0;        // 32 bits : 查询请求置为文件长度，其余为data length in bytes
    // this.m_nReserve     = 96 bits
}
ReqImgHeader.prototype = {
    ////////////////////////////////////////////////////////////////////////////
    // Public method split line
    //   - Public interface for invoke.
    ////////////////////////////////////////////////////////////////////////////
    /**
     * decode
     *  - ReqImgHeader decode interface
     * @params
     *    dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader){
        this.m_md5          = dataReader.readToBuffer(CONSTANTS.MD5HASHSIZE);
        this.m_nOffset      = dataReader.readUInt32LE();
        this.m_nDataLen     = dataReader.readUInt32LE();
        // Skip reverved 12 bytes data
        dataReader.skip(CONSTANTS.SIZEOF_HEADERRESERVED);
    },
    /**
     * encode
     *  - ReqImgHeader encode interface
     * @params
     *    dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter){
        dataWriter.writeBuffer(this.m_md5, 0, CONSTANTS.MD5HASHSIZE);
        dataWriter.writeUInt32LE(this.m_nOffset);
        dataWriter.writeUInt32LE(this.m_nDataLen);
        // Skip reserved 12 bytes data
        dataWriter.skip(CONSTANTS.SIZEOF_HEADERRESERVED);
    }
};
exports.ReqImgHeader = ReqImgHeader;

////////////////////////////////////////////////////////////////////////////////
// Class : RespImgHeader
////////////////////////////////////////////////////////////////////////////////
function RespImgHeader(){
    this.m_md5          = '';       // 128 bits : 图片的MD5值
    this.m_nResult      = 0;        // 32 bits : 参考Result宏定义
    this.m_nOffset      = 0;        // 32 bits : 查询请求返回时指明文件上载起始位置
    this.m_nDataLen     = 0;        // 32 bits : 要求上载的长度，一般情况等于文件长度-nPos
    // this.m_nReserve     = 96 bits
}
RespImgHeader.prototype = {
    ////////////////////////////////////////////////////////////////////////////
    // Public method split line
    //   - Public interface for invoke.
    ////////////////////////////////////////////////////////////////////////////
    /**
     * decode
     *  - RespImgHeader decode interface
     * @params
     *    dataReader : [BIStream]stream reader.
     * @public
     * @return : null.
     */
    decode : function(dataReader){
        this.m_md5          = dataReader.readToBuffer(CONSTANTS.MD5HASHSIZE);
        this.m_nResult      = dataReader.readUInt32LE();
        this.m_nOffset      = dataReader.readUInt32LE();
        this.m_nDataLen     = dataReader.readUInt32LE();
        // Skip reverved 12 bytes data
        dataReader.skip(CONSTANTS.SIZEOF_HEADERRESERVED);
    },
    /**
     * encode
     *  - RespImgHeader encode interface
     * @params
     *    dataWriter : [BOStream]stream writer.
     * @public
     * @return : null.
     */
    encode : function(dataWriter){
        dataWriter.writeBuffer(this.m_md5, 0, CONSTANTS.MD5HASHSIZE);
        dataWriter.writeUInt32LE(this.m_nResult);
        dataWriter.writeUInt32LE(this.m_nOffset);
        dataWriter.writeUInt32LE(this.m_nDataLen);
        // Skip reserved 12 bytes data
        dataWriter.skip(CONSTANTS.SIZEOF_HEADERRESERVED);
    }
};
exports.RespImgHeader = RespImgHeader;

////////////////////////////////////////////////////////////////////////////////
// Class : ImageLoader
////////////////////////////////////////////////////////////////////////////////
function ImageLoader() {
    this.m_eIoState = NETSTATE.SEND_HEADER;
    this.m_socket = null;
    this.m_recvBuffer = null;
    this.m_bHandled = false;
}
ImageLoader.prototype = {
    ////////////////////////////////////////////////////////////////////////////
    // Public method split line
    //   - Public interface for invoke.
    ////////////////////////////////////////////////////////////////////////////
    /**
     * download
     *  - Open a tcp connection to server & download image file
     * @public
     */
    download : function(params, callback){
        var conn = this;
        this.m_params = params;
        this.m_callback = callback;
        this.m_socket = net.connect(params.hostInfo);
        this.m_socket.on('connect', this.onConnect.bind(this));
        this.m_socket.on('data', this.onRecvData.bind(this));
        this.m_socket.on('end', this.onClosed.bind(this));
        this.m_socket.on('error', this.onError.bind(this));
    },

    ////////////////////////////////////////////////////////////////////////////
    // Private method split line
    //   - Don't invoke below methods directly!
    ////////////////////////////////////////////////////////////////////////////
    /**
     * sendRaw
     *  - Write raw data to kernel socket output buffer
     * @private
     */
    sendRaw : function(data){
        var conn = this;
        this.m_socket.write(data, this.onSendDone.bind(this));
    },
    /**
     * makeAuthRequest
     *  - Image auth packet make & encode helper
     * @private
     */
    makeAuthRequest : function(){
        var buffer = new Buffer(CONSTANTS.SIZEOF_BINARYHEADER + 4);
        var dataWriter = new BOStream(buffer, 0);
        var binHeader = new BinaryHeader();
        binHeader.m_nVersion     = CONSTANTS.CURRENT_UDPRS_VERSION;
        binHeader.m_nServiceType = CONSTANTS.DISPLAY_IMAGE_AUTH;
        binHeader.m_nCheckByte   = CONSTANTS.CURRENT_CHECKBYTES;
        binHeader.m_nSourceId    = this.m_params.sourceId;
        binHeader.m_nBaiduId     = this.m_params.targetId;
        binHeader.encode(dataWriter);
        dataWriter.writeUInt32LE(this.m_params.sourceId);
        //console.dir(buffer);
        return buffer;
    },
    /**
     * makeDownloadRequest
     *  - ReqImgHeader packet make & encode helper
     * @private
     */
    makeDownloadRequest : function(){
        var buffer = new Buffer(CONSTANTS.SIZEOF_BINARYHEADER + 
            CONSTANTS.SIZEOF_REQIMGHEADER);
        var dataWriter = new BOStream(buffer, 0);
        var binHeader = new BinaryHeader();
        binHeader.m_nVersion     = CONSTANTS.CURRENT_UDPRS_VERSION;
        binHeader.m_nServiceType = this.m_params.serviceType;
        binHeader.m_nCheckByte   = CONSTANTS.CURRENT_CHECKBYTES;
        binHeader.m_nSourceId    = this.m_params.sourceId;
        binHeader.m_nBaiduId     = this.m_params.targetId;
        binHeader.encode(dataWriter);
        var reqImgHeader = new ReqImgHeader();
        reqImgHeader.m_md5 = this.m_params.md5;
        reqImgHeader.encode(dataWriter);
        //console.dir(buffer);
        return buffer;
    },

    ////////////////////////////////////////////////////////////////////////////
    // Private event handler split line
    //   - Below methods are for internal usage only, Don't invoke them directly!
    ////////////////////////////////////////////////////////////////////////////
    /**
     * onConnect
     *  - Socket connect done event handler
     * @private
     */
    onConnect : function(){
        // Prepare & send request to server
        //console.log('onConnect');
        var buffer = this.makeAuthRequest();
        this.sendRaw(buffer);
        this.m_eIoState = NETSTATE.RECV_AUTH_RESP;
    },
    /**
     * onRecvData
     *  - Data recv done event handler
     * @private
     */
    onRecvData : function(data){
        //console.log('onRecvData');
        // Decode common packet header
        //console.dir(data);
        if (Buffer.isBuffer(data)){
            if (this.m_recvBuffer) {
                this.m_recvBuffer = Buffer.concat([this.m_recvBuffer, data]);
            } else {
                this.m_recvBuffer = data;
            }            
        }
        var dataReader = new BIStream(this.m_recvBuffer, this.m_recvBuffer.length, 0);
        var bSkipHeader = true;
        //console.dir(header);
        switch(this.m_eIoState){
            case NETSTATE.RECV_AUTH_RESP:
                if (dataReader.remainingLength() >= CONSTANTS.SIZEOF_BINARYHEADER + 4) {
                    var header = new BinaryHeader();
                    header.decode(dataReader);
                    // Decode auth result
                    var authResult = dataReader.readUInt32LE();
                    if (authResult != CONSTANTS.IMAGE_RESULT_SUCCESS) {
                        if (this.m_callback) {
                            this.m_callback(null, 'Image auth failed.');
                        };
                        this.m_socket.end();
                        return;
                    } 
                    this.m_recvBuffer = null;
                    var buffer = this.makeDownloadRequest();
                    this.sendRaw(buffer);
                    this.m_eIoState = NETSTATE.RECV_IMG_HEADER;
                }
                break;
            case NETSTATE.RECV_IMG_HEADER:
                if (dataReader.remainingLength() >= CONSTANTS.SIZEOF_BINARYHEADER 
                    + CONSTANTS.SIZEOF_RESPIMGHEADER) {
                    var header = new BinaryHeader();
                    header.decode(dataReader);
                    // Decode RespImgHeader from server
                    this.m_respImgHeader = new RespImgHeader();
                    this.m_respImgHeader.decode(dataReader);
                    //console.dir(imgHeader);
                    this.m_eIoState = NETSTATE.RECV_IMG_DATA;
                    bSkipHeader = false;
                } else {
                    break;
                }
            case NETSTATE.RECV_IMG_DATA:
                if (bSkipHeader && this.m_respImgHeader) {
                    dataReader.skip(CONSTANTS.SIZEOF_BINARYHEADER + CONSTANTS.SIZEOF_RESPIMGHEADER);
                };
                if (dataReader.remainingLength() >= this.m_respImgHeader.m_nDataLen) {
                    var imgData = this.m_recvBuffer.slice(dataReader.m_nOffset, 
                        dataReader.m_nOffset + this.m_respImgHeader.m_nDataLen);
                    if (this.m_callback) {
                        this.m_callback(imgData);
                        this.m_bHandled = true;
                    };
                    this.m_socket.end();
                };
                break;
            default:
                break;
        }
    },
    /**
     * onSendDone
     *  - Data send done event handler
     * @private
     */
    onSendDone : function(){
        //console.log('onSendDone');
    },
    /**
     * onClosed
     *  - Socket close event handler
     * @private
     */
    onClosed : function(){
        //console.log('onClosed');
        if (!this.m_bHandled && this.m_callback) {
            this.m_callback(null, {Error : 'socket closed.'});
            this.m_bHandled = true;
        };        
    },
    /**
     * onError
     *  - Socket error event handler
     * @private
     */
    onError : function(error){
        //console.log('onError');
        if (!this.m_bHandled && this.m_callback) {
            this.m_callback(null, error);
            this.m_bHandled = true;
        };
    }
};
exports.ImageLoader = ImageLoader;

////////////////////////////////////////////////////////////////////////////////
// Interface 
////////////////////////////////////////////////////////////////////////////////

function LoadImage(params, callback){
    var imageLoader = new ImageLoader();
    imageLoader.download(params, callback);
}

exports.LoadImage = LoadImage;

function ParseRelayInfo(binData){
    //console.dir(binData);
    var dataReader = new BIStream(binData, binData.length, 0);
    var result = {};
    //console.dir(binHost);
    result.uid = dataReader.readUInt32LE();
    var binHost = [
        dataReader.readUInt8(), 
        dataReader.readUInt8(), 
        dataReader.readUInt8(), 
        dataReader.readUInt8()
    ];
    result.host = binHost[0] + '.' + binHost[1] + '.' + binHost[2] + '.' + binHost[3];
    result.port = dataReader.readUInt16BE();
    return result;
}

exports.ParseRelayInfo = ParseRelayInfo;

////////////////////////////////////////////////////////////////////////////////
// Test utilities & functions
////////////////////////////////////////////////////////////////////////////////

function entryPoint1(){
    var binBuffer = new Buffer('296fb02fb495842401bb', 'hex');
    var relayInfo = ParseRelayInfo(binBuffer);
    console.dir(relayInfo);
    var md5 = new Buffer('5BAD67A8706820C630A9C65C6B1185EE', 'hex');
    var imageInfo = {
        hostInfo : relayInfo,
        serviceType : CONSTANTS.DOWNLOAD_OTHER_IMAGE, 
        sourceId : relayInfo.uid,
        targetId : 0,
        md5 : md5
    }; 
    //console.dir(md5);
    //console.dir(imageInfo.md5);
    LoadImage(imageInfo, function onData(data){
        console.dir(data.length);
        console.dir(data);
        var fs = require('fs');
        var fd = fs.openSync('./image.jpg', 'w');
        fs.writeSync(fd, data, 0, data.length);
        fs.closeSync(fd);
    });
}

// entryPoint1();

function entryPoint2(){
    var str = '00000001000000005108b7d0000001be6d736720312e32204e203330350d0a6164646f6e3a7374617475733d310d0a626173656d736769643a323234313038393633350d0a636f6e74656e'
     +'742d6c656e6774683a39310d0a636f6e74656e742d747970653a746578740d0a66726f6d3a34303030303132300d0a66726f6d5f7375623a300d0a6d6574686f643a6d73675f6e6f746966'
     +'790d0a6d736769643a31380d0a6e65787473756269643a300d0a73756269643a300d0a7379735f736573733a30303334303130306162636430323030353130386237643030323632356137'
     +'383030303030303030306131376638353333653830303030303531303839316264303236323561363730303030303030303061313766383533336538303030303035313038393439640d0a'
     +'74696d653a313335393532353833393833350d0a746f3a34303030303130330d0a747970653a310d0a7569643a34303030303132300d0a7761697461636b3a3132300d0a0d0a3c6d73673e'
     +'3c666f6e74206e3d2256657264616e612220733d2231302220623d22302220693d22302220756c3d22302220633d223332373638222063733d2230222f3e3c7465787420633d2261733131'
     +'31222f3e3c2f6d73673e000000000001000000005108b7d4000001c06d736720312e32204e203330370d0a6164646f6e3a7374617475733d310d0a626173656d736769643a323234313038'
     +'393633350d0a636f6e74656e742d6c656e6774683a39330d0a636f6e74656e742d747970653a746578740d0a66726f6d3a34303030303132300d0a66726f6d5f7375623a300d0a6d657468'
     +'6f643a6d73675f6e6f746966790d0a6d736769643a31390d0a6e65787473756269643a300d0a73756269643a300d0a7379735f736573733a30303334303130306162636430323030353130'
     +'386237643430323632356137383030303030303030306131376638353333653830303030303531303839316264303236323561363730303030303030303061313766383533336538303030'
     +'303035313038393439640d0a74696d653a313335393532353834343134310d0a746f3a34303030303130330d0a747970653a310d0a7569643a34303030303132300d0a7761697461636b3a'
     +'3132300d0a0d0a3c6d73673e3c666f6e74206e3d2256657264616e612220733d2231302220623d22302220693d22302220756c3d22302220633d223332373638222063733d2230222f3e3c'
     +'7465787420633d2261733232320d0a222f3e3c2f6d73673e000000000001000000005108b7d7000001be6d736720312e32204e203330390d0a6164646f6e3a7374617475733d310d0a6261'
     +'73656d736769643a323234313038393633350d0a636f6e74656e742d6c656e6774683a39310d0a636f6e74656e742d747970653a746578740d0a66726f6d3a34303030303132300d0a6672'
     +'6f6d5f7375623a300d0a6d6574686f643a6d73675f6e6f746966790d0a6d736769643a32300d0a6e65787473756269643a300d0a73756269643a300d0a7379735f736573733a3030333430'
     +'313030616263643032303035313038623764373032363235613738303030303030303030613137663835333365383030303030353130383931626430323632356136373030303030303030'
     +'3061313766383533336538303030303035313038393439640d0a74696d653a313335393532353834363431380d0a746f3a34303030303130330d0a747970653a310d0a7569643a34303030'
     +'303132300d0a7761697461636b3a3132300d0a0d0a3c6d73673e3c666f6e74206e3d2256657264616e612220733d2231302220623d22302220693d22302220756c3d22302220633d223332'
     +'373638222063733d2230222f3e3c7465787420633d226173323232222f3e3c2f6d73673e0000';
    var binData = new Buffer(str, 'hex');
    var dataReader = new BIStream(binData, binData.length, 0);
    var buffer = new Buffer(binData.length);
    var dataWriter = new BOStream(buffer, 0);
    while(dataReader.remainingLength() > 0){
        var offlineMsg = new OfflineMsg();
        offlineMsg.decode(dataReader);
        //console.dir(offlineMsg);
       // console.dir(offlineMsg.m_body.toString('utf8'));
        
        var dataReader1 = new BIStream(offlineMsg.m_body, offlineMsg.m_body.length, 0);
        var packet = new improtocol.IMPacket();
        packet.decode(dataReader1);
        
        // console.dir(packet);
        
        offlineMsg.encode(dataWriter);
    }
    assert.ok(dataWriter.m_nOffset == buffer.length);
}

//entryPoint2();

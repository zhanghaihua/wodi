
var assert = require('assert');

////////////////////////////////////////////////////////////////////////////////
// Class : BIStream
////////////////////////////////////////////////////////////////////////////////
function BIStream(parser, length, offset){
    this.m_pParser = parser;
    this.m_nOffset = offset;
    this.m_nLength = length;
}
BIStream.prototype = {
    ////////////////////////////////////////////////////////////////////////////
    // Public method split line
    //   - Public interface for invoke.
    ////////////////////////////////////////////////////////////////////////////
    /**
     * readUInt8
     *  - Read a byte value from stream
     * @public
     * @return : [byte] value of read out.
     */
    readUInt8 : function(){
        var result = this.m_pParser.readUInt8(this.m_nOffset);
        this.m_nOffset++;
        return result;
    },
    /**
     * readUInt16LE
     *  - Read a unsigned short value from stream in little-endian format
     * @public
     * @return : [uint16_t] value of read out.
     */
    readUInt16LE : function(){
        var result = this.m_pParser.readUInt16LE(this.m_nOffset);
        this.m_nOffset += 2;
        return result;
    },
    /**
     * readUInt16BE
     *  - Read a unsigned short value from stream in big-endian format
     * @public
     * @return : [uint16_t] value of read out.
     */
    readUInt16BE : function(){
        var result = this.m_pParser.readUInt16BE(this.m_nOffset);
        this.m_nOffset += 2;
        return result;
    },
    /**
     * readUInt32LE
     *  - Read a uint32_t value from stream in little-endian format
     * @public
     * @return : [uint32_t] value of read out.
     */
    readUInt32LE : function(){
        var result = this.m_pParser.readUInt32LE(this.m_nOffset);
        this.m_nOffset += 4;
        return result;
    },
    /**
     * readUInt32BE
     *  - Read a uint32_t value from stream in big-endian format
     * @public
     * @return : [uint32_t] value of read out.
     */
    readUInt32BE : function(){
        var result = this.m_pParser.readUInt32BE(this.m_nOffset);
        this.m_nOffset += 4;
        return result;
    },
    /**
     * readUInt64LE
     *  - Read a uint64_t value from stream in little-endian format
     * @public
     * @return : [uint64_t] value of read out.
     * @remark : FIXME
     */
    readUInt64LE : function(){
        var result = this.m_pParser.readDoubleLE(this.m_nOffset);
        this.m_nOffset += 8;
        return result;
    },
    /**
     * readBytes
     *  - Read assigned length data from stream to an array
     * @public
     * @return : [Array]the same array as the input one.
     */
    readBytes : function(buffer, len){
        for(var i = 0; i < len; i++) {
            buffer[i] = this.m_pParser.readUInt8(this.m_nOffset);
            this.m_nOffset++;
        }
        return buffer;
    },
    /**
     * readToString
     *  - Read assigned length data from stream and convert to utf8 format string
     * @public
     * @return : [string]if the length of remaining data is no less than assigned
     *           to read, the result a string with assigned length, or the result
     *           length is a string with remaining length of the stream.
     */
    readToString : function(len){
        len = (typeof len == 'undefined')?this.m_pParser.length:this.m_nOffset + len;
        len = Math.min(len, this.m_pParser.length);
        var result = this.m_pParser.toString('utf8', this.m_nOffset, len);
        this.m_nOffset += len - this.m_nOffset;
        return result;
    },
    /**
     * readToBuffer
     *  - Read assigned length data from stream and convert to buffer
     * @public
     * @return : [buffer]if the length of remaining data is no less than assigned
     *           to read, the result a string with assigned length, or the result
     *           length is a buffer with remaining length of the stream.
     */
    readToBuffer : function(len){
        len = (typeof len == 'undefined')?this.m_pParser.length:this.m_nOffset + len;
        len = Math.min(len, this.m_pParser.length);
        var result = this.m_pParser.slice(this.m_nOffset, len);
        this.m_nOffset += len - this.m_nOffset;
        return result;
    },
    /**
     * remainingLength
     *  - Get the remaining data length of the stream which have not been read.
     * @public
     * @return : [uint32_t]length of remaining data in the stream have not been read.
     */
    remainingLength : function(){
        return this.m_pParser.length - Math.min(this.m_nOffset, this.m_pParser.length);
    },
    /**
     * readUntile
     *  - Read data into buffer until encounter a stop mark
     * @public
     * @return : [uint32_t]length of data which have been read out from stream 
     *           into buffer.
     */
    readUntil : function(stopMark, buffer, offset){
        assert.ok(typeof stopMark == 'string');
        assert.ok(Buffer.isBuffer(buffer));
        if (stopMark.length == 0) {
            return 0;
        };
        var remainLen = this.remainingLength();
        if (remainLen < stopMark.length) {
            return 0;
        };
        var i = 0;
        var bFound = false;
        var len = this.m_nOffset + remainLen - stopMark.length;
        for (i = this.m_nOffset; i < len; i++) {
            bFound = true;
            for (var j = 0; j < stopMark.length; j++) {
                if (this.m_pParser[i+j] != stopMark.charCodeAt(j)) {
                    bFound = false;
                    break;
                };
            };
            if (bFound) {
                break;
            };
        };
        if (bFound) {
            var result = i - this.m_nOffset;
            this.m_pParser.copy(buffer, offset, this.m_nOffset, i);
            this.m_nOffset = i;
            return result;            
        } else{
            return 0;
        };
    },
    /**
     * skip
     *  - Skip assigned length data to be unread
     * @public
     * @return : no return value.
     */
    skip : function(length){
        var skipLen = Math.min(this.remainingLength(), length);
        this.m_nOffset += skipLen;
        return skipLen;
    },
    /**
     * dump
     *  - dump data in utf8 format with assigned start & end index.
     * @public
     * @return : no return value.
     */
    dump : function(dumpInfo, start, end){
        var strDump = 'BIStream dump : ';
        if (typeof dumpInfo != 'undefined'){
            strDump += dumpInfo;
        }
        console.log(strDump);
        if (typeof start == 'undefined') {
            start = this.m_nOffset;
        };
        if (typeof end == 'undefined') {
            end = this.m_pParser.length;
        };
        var strDump = this.m_pParser.toString('utf8', start, end);
        console.dir(strDump);
    }
};
exports.BIStream = BIStream;

////////////////////////////////////////////////////////////////////////////////
// Class : BOStream
////////////////////////////////////////////////////////////////////////////////
function BOStream(parser, offset){
    this.m_pParser = parser;
    this.m_nOffset = offset;
}
BOStream.prototype = {
    ////////////////////////////////////////////////////////////////////////////
    // Public method split line
    //   - Public interface for invoke.
    ////////////////////////////////////////////////////////////////////////////
    /**
     * writeUInt8
     *  - Write a uint8_t value into stream.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeUInt8 : function(value){
        this.m_pParser.writeUInt8(value, this.m_nOffset);
        this.m_nOffset += 1;
        return 1;
    },
    /**
     * writeUInt16LE
     *  - Write a uint16_t value into stream in little-endian format.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeUInt16LE : function(value){
        this.m_pParser.writeUInt16LE(value, this.m_nOffset);
        this.m_nOffset += 2;
        return 2;
    },
    /**
     * writeUInt16BE
     *  - Write a uint16_t value into stream in little-endian format.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeUInt16BE : function(value){
        this.m_pParser.writeUInt16BE(value, this.m_nOffset);
        this.m_nOffset += 2;
        return 2;
    },    
    /**
     * writeUInt32LE
     *  - Write a uint32_t value into stream in little-endian format.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeUInt32LE : function(value){
        this.m_pParser.writeUInt32LE(value, this.m_nOffset);
        this.m_nOffset += 4;
        return 4;
    },
    /**
     * writeUInt32BE
     *  - Write a uint32_t value into stream in little-endian format.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeUInt32BE : function(value){
        this.m_pParser.writeUInt32BE(value, this.m_nOffset);
        this.m_nOffset += 4;
        return 4;
    },
    /**
     * writeUInt64LE
     *  - Write a uint64_t value into stream in little-endian format.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeUInt64LE : function(value){
        this.m_pParser.writeDoubleLE(value, this.m_nOffset);
        this.m_nOffset += 8;
        return 8;
    },
    /**
     * writeBytes
     *  - Write a assigned length string value into stream.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeBytes : function(string, length){
        if (typeof string == 'undefined') {
            throw TypeError('first argument must be `string` type!');
        }
        length = (typeof length == 'undefined')?string.length:length;
        this.m_pParser.write(string, this.m_nOffset, length);
        this.m_nOffset += length;
        return length;
    },
    /**
     * writeBuffer
     *  - Write a assigned length buffer value into stream.
     * @public
     * @return : [Number]length of wrote value.
     */
    writeBuffer : function(buffer, offset, length){
        if (!Buffer.isBuffer(buffer)) {
            throw TypeError('first argument must be `buffer` type!');
        }
        offset = (typeof offset == 'undefined')?0:offset;
        length = (typeof length == 'undefined')?(buffer.length - offset):(length + offset);
        length = Math.min(length, buffer.length);
        buffer.copy(this.m_pParser, this.m_nOffset, offset, length);
        this.m_nOffset += length;
        return length;
    },
    /**
     * skip
     *  - Skip assigned length buffer to be unwrite
     * @public
     * @return : no return value.
     */
    skip : function(length){
        if (typeof length != 'number') {
            throw TypeError('first argument must be `number` type!');
        };
        length = Math.min(length, this.m_pParser.length - this.m_nOffset);
        this.m_nOffset += length;
    },
      /**
      * writeUInt16LE
      *  - Write a assigned length string value into stream.
      * @public
      * @return : [Number]length of wrote value.
      */
     writeString : function(string, length){
         if (typeof string == 'undefined') {
             throw TypeError('first argument must be `string` type!');
         }
         
         var buf = new Buffer(string,'utf8');
         
         length = (typeof length == 'undefined') ? buf.length : length;
         this.m_pParser.write(string, this.m_nOffset, length);
         this.m_nOffset += length;
         return length;
     }
};
exports.BOStream = BOStream;

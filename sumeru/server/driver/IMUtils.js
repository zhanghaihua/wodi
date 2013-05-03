/**
 * New node file
 */
var DOMParser = require('xmldom').DOMParser;

var getDocument = function(packet){
    // 清理多余字符串,防止 Source code out of document root;
    var str = (packet.m_strBody || "").trim();
    if(str.length > 0){
        str = str.substr(0,str.lastIndexOf('>')+1);
    }
    var doc = new DOMParser().parseFromString(str || "");
    
    if(doc && doc.documentElement){
        return doc.documentElement;
    }else{
        packet.dump("==== can't process XML Document ====");
        return false;
    }
    
};

var copyAttributesToMap = function(node,_obj){
    var obj = _obj || {};
    var attributes = node.attributes;
    for(var i=0;i<attributes.length;i++){
        obj[attributes[i].name] = attributes[i].value;
    }
    return obj;
};

var getList = function(nodeList){
    var list = [];
    
    if(!nodeList){
        return list;
    }
    
    for(var i=0;i<nodeList.length;i++){
        copyAttributesToMap(nodeList[i], list[i] = {});
    }
    return list;
};

/**
 * 将一组结点转为map结构。
 * @param nodeList
 *      一组内容相似的node对像.　一般从getElementByTarget获到
 * @param indexKeyName
 *      一个可用做索引的不重复的键名.
 */
var getMap = function(nodeList,indexKeyName){
    var map = {};
    
    if(!nodeList || !indexKeyName){
        return map;
    }
    var item = null;
    for(var i=0;i<nodeList.length;i++){
        copyAttributesToMap(nodeList[i], item = {});
        map[item[indexKeyName]] = item;
    }
    
    return map;
};

var stringJoin = function(str1,str2,separate){
    return str1.concat((separate||""),str2);
};

/**
 * simple tpl implements
 * @param tpl {string}, 可替换的字符串模块，其中的变量为$any$格式 any为变量名称.字母数字和下划线组成
 * @param params {map},　key为变量名
 */
var replaceParams = function(tpl,params){
    var reg = /\$(\w*?)\$/igm;
    return tpl.replace(reg,function(match,key){
        //console.log(arguments);
        if(params[key]!== undefined){
            return params[key];
        }else{
            "";
        }
    });
};

/**
 * 将一个色值从一个int值转为前端可识别的 rgb(r,g,b)格式字符串
 */
var getColor = function(_intValue){
    var intValue = parseInt(_intValue);
    var r = Math.min(Math.max((intValue &     0xff) >>  0, 0), 255);
    var g = Math.min(Math.max((intValue &   0xff00) >>  8, 0), 255);
    var b = Math.min(Math.max((intValue & 0xff0000) >> 16, 0), 255);
    return "rgb("+ r + "," + g +"," + b +")";
};
/**
 * getColor的反转方法
 */
var colorToUint32 = function(colorStr){
    var reg = /[rgb\(\)]/ig;
    var color = 0;
    colorStr.replace(reg,"").split(',').forEach(function(item,i){
        switch(i){
            case 0 :
                color += parseInt(item) << 0;
                break;
            case 1 :
                color += parseInt(item) << 8;
                break;
            case 2 :
                color += parseInt(item) << 16;
                break;
        }
    });
    
    return color;
};

module.exports = {
    getDocument:getDocument,
    copyAttributesToMap:copyAttributesToMap,
    getList:getList,
    getMap:getMap,
    stringJoin:stringJoin,
    replaceParams:replaceParams,
    getColor:getColor,
    colorToUint32:colorToUint32
};
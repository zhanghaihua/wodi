Model.mygame = function(exports) {
	exports.config = {
		fields : [
			{name: "gid", type: "string"}, //游戏标识ID
			{name: "gname", type: "string"}, //游戏名字
			{name: "creator", type: "string"}, //创造者
			{name: "host", type: "string"}, //主持人
			{name: "url", type: "string"}, //游戏url
			{name: "uri", type: "string"}, //游戏二维码图url
			{name: "status", type: "string"}, //游戏状态：create,active,over
			{name: "time", type: "datetime", defaultValue: "now()"} //游戏创建时间
		]
	};
};


Model.mypartner = function(exports) {
	exports.config = {
		fields : [
			{name: "gid", type: "string"}, //游戏标识ID
			{name: "pid", type: "string"}, //partner id
			{name: "pname", type: "string"}, //partner name
			{name: "kickedout", type: "boolean", defaultValue: false}, //被踢
			{name: "status", type: "string"}, //参与者状态：等待游戏,正在游戏,被投死
			{name: "role", type: "string"}, //游戏角色: 主持人,卧底,平民,待分配
			{name: "gword", type: "string"}, //游戏词条
			{name: "time", type: "datetime", defaultValue: "now()"} //第一次加入的时间
		]
	};
};

Model.myword = function(exports) {
	exports.config = {
		fields : [
			{name: "wid", type: "string"}, //标识ID
			{name: "fstword", type: "string"}, //第一个词
			{name: "sndword", type: "string"}, //第二个词
		]
	};
};

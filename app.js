var http = require("http")
var url = require('url')
var path = require('path')
var fs = require('fs')

var conf = require('./config/system.js').configure;

var request = require("./request/request.js")

//处理请求
function RequestProcess(req,res){
  //获取参数
  var param = url.parse(req.url,true).query;
  //获取路径
  var pathname = url.parse(req.url,true).pathname;

  //检查是否为主页
  if('' === pathname || '/' === pathname)
  {
    if(!conf.defaulgPage && conf.defaultPage===''){
      pathname = '/' + conf.defaultPage;
    }else{
      pathname = '/index.html';
    }
  };
  //过滤危险路径符号
  pathname = pathname.replace(/\.\//g,'').replace(/\..\//g,'');

	request.process(req,res,{'name':pathname,'param':param,"conf":conf});
};


function GetLocalIPS(){
	var os = require('os');
	var net = os.networkInterfaces();
	var addrList = [];
	for (var value in net) {
		var obj = net[value];
		for(var index in obj){
			var addr = obj[index];
			if(addr.family=='IPv4'){
				var IPv4=addr.address;
				addrList.push(IPv4);
			}
		}
	}
	return addrList;
}

conf.host = GetLocalIPS();

//开启服务器
if(typeof conf.host === 'object'){
	for(var i = 0 ; i < conf.host.length;i++){
		http.createServer(RequestProcess).listen(conf.port,conf.host[i]);
		console.log((new Date()).toLocaleString() + ":Start Server " + conf.host[i] + " " + conf.port);
	}
}else if(typeof conf.host === 'string'){
	http.createServer(RequestProcess).listen(conf.port,conf.host);
	console.log((new Date()).toLocaleString() + ":Start Server " + conf.host + " " + conf.port);
}else{
	console.log(typeof conf.host + ' Error.');
}

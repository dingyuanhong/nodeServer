var http = require("http")
var url = require('url')
var path = require('path')
var fs = require('fs')

var conf = require('./config/system.js').configure;
var route = require('./route/route.js')

//上传配置信息
var publishDir = './'
var publishName = "publish";
var publishPath = publishDir + publishName + '/';

var multipart = require('connect-multiparty')({ uploadDir: publishPath });
//未修改
function notModified(res){
  res.writeHead(304,'Not Modified');
  res.end();
}
//未找到
function notFound(res){
  res.writeHead(404,'Not Found');
  res.end();
}
//服务器错误
function servError(res){
  res.writeHead(405,'server Error');
  res.end();
}

function _readFile(req,res,pathname,lastModified,cacheTime){
  var header = {};
  if(lastModified !== undefined){
    header["Last-Modified"] = lastModified;
  }
  if(cacheTime !== undefined){
    if(typeof cacheTime === 'number'){
      header['Cache-Control'] = 'max-age=' + cacheTime;
    }else{
      header['Cache-Control'] = cacheTime;
    }
  }else{
    header['Cache-Control'] = 'no-cache';
  }
  var states = fs.statSync(pathname);
  header['Content-length'] = states.size;
  res.writeHead(200,'Ok',header);
  //传输数据
  var raw = fs.createReadStream(pathname);
  raw.pipe(res);
}

//读取文件
function readFile(req,res,pathname,cacheTime){
	//获取文件属性
  fs.stat(pathname,function(err,stat)
  {
    //未使用缓存
    if(cacheTime === 0){
      _readFile(req,res,pathname);
      return;
    }
    //检查catch时间是否过期
    var noCheck = false;
    var lastModified = '';
    if(cacheTime > 0){
      noCheck = true;
    }else{
      lastModified = stat.mtime.toUTCString();
    }
    //检查时间是否过期
    if(req.headers["if-modified-since"] && (noCheck === true || lastModified === req.headers['if-modified-since'])){
      notModified(res);
    }else{
      _readFile(req,res,pathname,lastModified,cacheTime);
    }
  });
};
//检查是否是上传的文件
var PublishCmd = '/' + publishName + '/';
function isPublishedFile(name){
  if(name.length > PublishCmd.length){
	  var n = name.slice(0,PublishCmd.length);
	  if(n == PublishCmd)
		return true;
  }
  return false;
}
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

  //下载文件
  if(isPublishedFile(pathname) == true){
    var name = publishDir + pathname;
    fs.exists(name,function(exists){
      if(exists){
        readFile(req,res,name,0);
      }else{
        notFound(res,pathname);
      }
    });
  }
  else
  //为网页资源,则从主业地址中抓取数据
  if(conf.isResource(path.extname(pathname)) == true)
  {
    var name = conf.webroot + pathname;
    fs.exists(name,function(exists){
      if(exists){
        readFile(req,res,name,conf.getCacheTime(path.extname(name)));
      }else{
        notFound(res,pathname);
      }
    });
  }
  //路由功能,暂无
  else if(conf.isBus(path.extname(pathname)) == true){
    route.do(pathname,param,function(err,data){
      if(err){
        console.error("Error:"+"\npathname:"+pathname+"\nparam:"+param);
        servError(res);
      }else{
        res.writeHead(200,{"Content-Type":"application/json"});
        res.end(data);
      }
    });
  }
  else if(req.method.toUpperCase() == 'POST'){
    //上传文件
    if(pathname == '/upload'){
      // /**
      //  * 因为post方式的数据不太一样可能很庞大复杂，
      //  * 所以要添加监听来获取传递的数据
      //  * 也可写作 req.on("data",function(data){});
      //  */
      // var postData = "";
      // req.addListener("data", function (data) {
      //     postData += data;
      // });
      // /**
      //  * 这个是如果数据读取完毕就会执行的监听方法
      //  */
      // req.addListener("end", function () {
      //     var query = qs.parse(postData);
      //     res.write(query);
      // });

      multipart(req,res,function(err){
        //错误码
        var codeId = 0;
        //文件路径
        var fileurl = req.headers.referer;
        //检查错误码
        if(err){
        	codeId = err.status;
        }else{
          //检查是否为空路径
        	if(req.files.files.originalFilename.length == 0){
            //获取生成的临时文件删除
        		var path = publishDir + req.files.files.path;
        		if(fs.statSync(path).isFile()){
        			fs.unlinkSync(path);
        		}
        		codeId = 415;
        	}else{
            //重命名文件
        		fs.rename(publishDir + req.files.files.path,publishPath + req.files.files.originalFilename);
        		codeId = 200;
            //文件网址
        		fileurl = req.headers.origin + '/' + publishName + '/' + req.files.files.originalFilename;
        	}
        }
        //头内容
        res.writeHead(codeId,{
        	"Content-Type":"text/plain",
          "Connection": "close"
        });
        //数据体
        var jsonData = {
        	'code': 0,
        	'msg':{'url':''}
        };
        //组合数据体
        jsonData.code = codeId;
        jsonData.msg.url = fileurl;
        console.log(JSON.stringify(jsonData));
        res.write(JSON.stringify(jsonData));
        res.end();
      });
    }
    else{
      notFound(res,pathname);
	  console.log("error:" + pathname);
    }
  }
  else{
    notFound(res,pathname);
	console.log("error:" + pathname);
  }
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

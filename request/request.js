var fs = require('fs')
var path = require('path')
var MIME = require('./mime.js');

function readRangeHeader(range, totalLength) {
        /*
         * Example of the method &apos;split&apos; with regular expression.
         * 
         * Input: bytes=100-200
         * Output: [null, 100, 200, null]
         * 
         * Input: bytes=-200
         * Output: [null, null, 200, null]
         */

    if (range == null || range.length == 0)
        return null;

    var array = range.split(/bytes=([0-9]*)-([0-9]*)/);
    var start = parseInt(array[1]);
    var end = parseInt(array[2]);
    var result = {
        Start: isNaN(start) ? 0 : start,
        End: isNaN(end) ? (totalLength - 1) : end
    };
    
    if (!isNaN(start) && isNaN(end)) {
        result.Start = start;
        result.End = totalLength - 1;
    }

    if (isNaN(start) && !isNaN(end)) {
        result.Start = totalLength - end;
        result.End = totalLength - 1;
    }

    return result;
}

function sendResource(req,res,param)
{
	var filepath = param.path;

	var header = {};
	if(param.lastModifiedTime !== undefined){
		header["Last-Modified"] = param.lastModifiedTime;
	}
	if(param.cache !== undefined){
	if(typeof param.cache === 'number'){
		header['Cache-Control'] = 'max-age=' + param.cache;
	}else{
		header['Cache-Control'] = param.cache;
	}
	}else{
		header['Cache-Control'] = 'no-cache';
	}
	var states = fs.statSync(filepath);
	header["Last-Modified"] = states.mtime.toUTCString();
	
	var mime = MIME.mime(filepath);
	if(mime != null)
	{
	  header['Content-Type'] = mime + ";";
	}
	// header['Content-Type'] += "charset=utf-8";
	
	//req.headers['range'] = undefined;
	if(req.headers['range'] != undefined)
	{
		var rangeRequest = readRangeHeader(req.headers['range'],states.size);
		//console.log(req.headers['range']);
		//console.log(rangeRequest);
		if(rangeRequest == null)
		{
			header['Accept-Ranges'] = 'bytes';
			header['Content-length'] = states.size;
			res.writeHead(200,header);
		}
		else
		{
			var start = rangeRequest.Start;
			var end = rangeRequest.End;
			if (start >= states.size || end >= states.size) {
				header['Content-Range'] = 'bytes */' + states.size; // File size.
				res.writeHead(416,header);
				res.end();
				return;
			}
			else
			{
				header['Content-Range'] = 'bytes ' + start + '-' + end + '/' + states.size;
				header['Content-Length'] = start == end ? 0 : (end - start + 1);
				header['Accept-Ranges'] = 'bytes';
				res.writeHead(206,header);
				
				var readable = fs.createReadStream(filepath, { 'start': start, 'end': end });
				if(readable == null)
				{
					res.end();
				}else
				{
					readable.pipe(res);
				}
				return ;
			}
		}
	}
	else
	{
		header['Content-length'] = states.size;
		res.writeHead(200,'Ok',header);
	}
	//传输数据
	var readable = fs.createReadStream(filepath);
	if(readable == null)
	{
		res.end();
	}
	else
	{
		readable.pipe(res);
	}
}

function checkSendResource(req,res,param)
{
	var filepath = param.path;
	fs.exists(filepath,function(exists){
		if(exists){
			if(param.lastModified !== undefined && param.lastModified === true)
			{
				//获取文件属性
				fs.stat(filepath,function(err,stat)
				{
					var lastModifiedTime = stat.mtime.toUTCString();
					if(req.headers["if-modified-since"] && lastModifiedTime === req.headers['if-modified-since']){
						res.writeHead(304,'Resource Not Modified');
						res.end();
					}else{
						param.lastModifiedTime = lastModifiedTime;
						sendResource(req,res,param);
					}
				});
			}
			else 
			{
				sendResource(req,res,param);
			}
		}else{
			console.log("404 Resource not found!(" + filepath);

			res.writeHead(404,'Resource Not Found');
		  res.end();
		}
	});
}

//上传配置信息
var publishDir = '.'
var publishName = "publish";
var publishPath = publishDir + '/' + publishName + '/';

var multipart = require('connect-multiparty')({ uploadDir: publishPath });
fs.mkdir(publishPath,0x777,function(){});

//检查是否是上传的文件
var DownloadCmd = '/' + publishName + '/';
function isDownloadCMD(name){
  if(name.length > DownloadCmd.length){
	  var cmd = name.slice(0,DownloadCmd.length);
	  if(cmd == DownloadCmd)
			return true;
  }
  return false;
}

var upload = require("./upload.js")
var route = require('../route/route.js')
const querystring = require('querystring');

var process = function(req,res,param)
{
	var pathname = param.name;
	//解析urlencode编码
	var pathname = querystring.unescape(pathname);
	// console.log(querystring.escape(pathname));
	// //console.log(querystring.unescape(pathname));

	//下载文件
  if(isDownloadCMD(pathname) == true){
    var filepath = publishDir + pathname;
    checkSendResource(req,res,{"path":filepath});
  }
	//为网页资源,则从主业地址中抓取数据
  else if(param.conf.isResource(path.extname(pathname)) == true)
  {
    var filepath = param.conf.webroot + pathname;
		checkSendResource(req,res,{"path":filepath,"lastModified":true,"cache":param.conf.getCacheTime(path.extname(pathname))});
  }
  //路由功能,暂无
  else if(param.conf.isBus(path.extname(pathname)) == true){
    route.do(req,res,{"name":pathname,"param":param,"callback":function(err,data){
      if(err){
        console.error("405 Error:"+"\npathname:"+pathname+"\nparam:"+param);

				res.writeHead(405,'server Error');
			  res.end();
      }else{
        res.writeHead(200,{"Content-Type":"application/json"});
        res.end(data);
      }
    }});
  }
  else if(req.method.toUpperCase() == 'POST'){
    //上传文件
    if(pathname == '/upload'){
			console.log("req:url:");
			console.log(req.url);
			console.log("req:headers:");
			console.log(req.headers);
			console.log("req:rawHeaders:");
			console.log(req.rawHeaders);
      multipart(req,res,function(err){
				upload.process(req,res,{"name":publishName,"path":publishPath,"parent":publishDir},err);
      });
    }
    else{
			res.writeHead(404,'POST Request type is not supported');
			res.end();

			console.log("404 Error:(POST Request type is not supported)" + pathname);
    }
  }
  else{
		res.writeHead(404,'Request type is not supported');
		res.end();

		console.log("404 Error:(Request type is not supported)" + pathname);
  }
}

exports.process = process;

var fs = require('fs')

var upload=function(req,res,param,err)
{
	//错误码
	var codeId = 0;
	//文件路径
	var fileurl = req.headers.referer;
	var res_body = null;
	//检查错误码
	if(err){
		codeId = err.status;
		console.log(codeId + " upload Error! " + err);
	}else{
		var sourceFileName = req.files.files.originalFilename;
		var uploadedFileName =param.parent + "/" + req.files.files.path;
		//检查是否为空路径
		if(sourceFileName !== undefined && sourceFileName.length == 0){
			//获取生成的临时文件删除
			var tmpfilepath = uploadedFileName;
			if(fs.statSync(tmpfilepath).isFile()){
				fs.unlinkSync(tmpfilepath);
			}
			codeId = 415;
			console.log("405 upload path is empty!");
		}else{
			//重命名文件
			fs.rename(uploadedFileName,param.path + req.files.files.originalFilename);

			codeId = 200;
			//文件网址
			fileurl = req.headers.origin + '/' + param.name + '/' + req.files.files.originalFilename;
			//数据体
			var jsonData = {
				'code': 0,
				'msg':{'url':''}
			};
			//组合数据体
			jsonData.code = codeId;
			jsonData.msg.url = fileurl;
			res_body = JSON.stringify(jsonData);
			console.log("upload: " + res_body);
		}
	}
	
	//头内容
	res.writeHead(codeId,{
		"Content-Type":"text/plain;charset=utf-8",
		"Connection": "close"
	});

	if(res_body != null)
	{
		res.write(res_body );
	}

	res.end();
}

exports.process = upload;

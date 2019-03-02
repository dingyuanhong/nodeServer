var Configure = {
  'port':80,
  'host':["127.0.0.1"],
  'webroot':'',
  'defaultPage':'index.html',
  'res':{
		"ext":[
			'.html','.htm','.js','.css',
			'.json','.glsl','.vert','.frag',
			'.icns','.ico','.bmp','.jpg','.png','.ttf','.tif',
			'.woff','.swf','.xml',
			'.wma','.mp3',
			'.mp4','.rmvb','.mkv','.flv',
			".bin",".mtl",".obj",
			".txt"
			]

	},
  'cache':{
		"ext":['.mp4'],
		time:[24*60*60]
	},
  'bus':{
			"ext":['.do']
	},

  isResource: function (ext)
  {
    if(this.res.ext.indexOf(ext) >= 0) return true;
    else return false;
  },
  isBus:function(ext){
    if(this.bus.ext.indexOf(ext) >= 0) return true;
    else return false;
  },
  getCacheTime:function(ext){
    var index = this.cache.ext.indexOf(ext);
    if(index >= 0) return this.cache.time[index];
    else return 0;
  }
};



exports.configure = Configure;

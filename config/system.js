var Configure = {
  'port':80,
  'host':['192.168.0.119',"127.0.0.1"],
  'webroot':'./../3Dgl/',
  'defaultPage':'index.html',
  'res_ext':['.html','.htm','.js','.css',
			'.icns','.ico','.bmp','.jpg','.png','.ttf','.tif',
			'.woff',
			'.wma','.mp3',
			'.mp4','.rmvb','.mkv'
			],
  'cache_ext':['.mp4'],
  'cache_time':[24*60*60],
  'bus_ext':['.do'],

  isResource: function (ext)
  {
    if(this.res_ext.indexOf(ext) >= 0) return true;
    else return false;
  },
  isBus:function(ext){
    if(this.bus_ext.indexOf(ext) >= 0) return true;
    else return false;
  },
  getCacheTime:function(ext){
    var index = this.cache_ext.indexOf(ext);
    if(index >= 0) return this.cache_time[index];
    else return 0;
  }
};



exports.configure = Configure;

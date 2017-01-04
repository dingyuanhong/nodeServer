
var RouteDo = function(pathanem,param,callback)
{
  if('/getProvince.do' === pathname){
    gp.getProvince(callback);
  }else if('/getCity.do' === pathname){
    gp.getCity(callback,param);
  }
}


exports.do = RouteDo;

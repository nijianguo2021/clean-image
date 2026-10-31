(function(root){
  'use strict';
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  function constrain(view){
    const width=view.imageWidth*view.base*view.zoom,height=view.imageHeight*view.base*view.zoom;
    return {...view,x:width<=view.width?(view.width-width)/2:clamp(view.x,view.width-width,0),y:height<=view.height?(view.height-height)/2:clamp(view.y,view.height-height,0)};
  }
  function fit(width,height,imageWidth,imageHeight){
    return constrain({width,height,imageWidth,imageHeight,base:Math.min(width/imageWidth,height/imageHeight,1),zoom:1,x:0,y:0});
  }
  function point(view,x,y){return [(x-view.x)/(view.base*view.zoom),(y-view.y)/(view.base*view.zoom)];}
  function zoomAt(view,zoom,x=view.width/2,y=view.height/2){
    zoom=clamp(zoom,1,8);
    const ratio=zoom/view.zoom;
    return constrain({...view,zoom,x:x-(x-view.x)*ratio,y:y-(y-view.y)*ratio});
  }
  function gesture(view,startA,startB,a,b){
    const before=[(startA[0]+startB[0])/2,(startA[1]+startB[1])/2],after=[(a[0]+b[0])/2,(a[1]+b[1])/2];
    const distance=Math.max(1,Math.hypot(startA[0]-startB[0],startA[1]-startB[1]));
    const zoom=clamp(view.zoom*Math.hypot(a[0]-b[0],a[1]-b[1])/distance,1,8),ratio=zoom/view.zoom;
    return constrain({...view,zoom,x:after[0]-(before[0]-view.x)*ratio,y:after[1]-(before[1]-view.y)*ratio});
  }
  const api={clamp,constrain,fit,point,zoomAt,gesture};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.ImageZoom=api;
})(typeof globalThis!=='undefined'?globalThis:this);

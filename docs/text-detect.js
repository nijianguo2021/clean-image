/* PP-OCRv4 mobile detection helpers. OCR locates text; it does not decide whether text is a watermark.
 * Model: RapidAI/RapidOCR, derived from PaddleOCR, Apache-2.0.
 * Preprocessing reference: RapidOCR v3.4.0 config.yaml and ch_ppocr_det/utils.py.
 * The pure-JS candidate/mask implementation below is intentionally conservative. */
(function(root){
 'use strict';
 const MODEL={path:'models/text-det.onnx',size:4745517,sha256:'d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9',name:'PP-OCRv4 mobile text detection'};
 function validateImage(image){if(!image||!Number.isInteger(image.width)||!Number.isInteger(image.height)||image.width<1||image.height<1||image.width*image.height>12000000||!image.data||image.data.length<image.width*image.height*4)throw Error('图片尺寸不支持文字检测');}
 function prepareTextDetection(image,options={}){
  validateImage(image);const {data,width,height}=image,maxSide=Math.max(128,Math.min(1280,options.maxSide||960));
  const requested=options.crop||{x:0,y:0,width,height};if(![requested.x,requested.y,requested.width,requested.height].every(Number.isFinite)||requested.width<=0||requested.height<=0)throw Error('文字检测裁切范围无效');
  const x=Math.max(0,Math.min(width-1,Math.floor(requested.x))),y=Math.max(0,Math.min(height-1,Math.floor(requested.y)));
  const crop={x,y,width:Math.max(1,Math.min(width-x,Math.floor(requested.width))),height:Math.max(1,Math.min(height-y,Math.floor(requested.height)))};
  const ratio=Math.min(1,maxSide/Math.max(crop.width,crop.height)),tw=Math.max(32,Math.round(crop.width*ratio/32)*32),th=Math.max(32,Math.round(crop.height*ratio/32)*32),plane=tw*th,tensor=new Float32Array(plane*3);
  // RapidOCR takes OpenCV BGR, normalized from [0,255] to [-1,1], NCHW.
  for(let yy=0;yy<th;yy++)for(let xx=0;xx<tw;xx++){
   const sx=Math.max(0,Math.min(crop.width-1,(xx+.5)*crop.width/tw-.5)),sy=Math.max(0,Math.min(crop.height-1,(yy+.5)*crop.height/th-.5)),ax=Math.floor(sx),ay=Math.floor(sy),bx=Math.min(crop.width-1,ax+1),by=Math.min(crop.height-1,ay+1),fx=sx-ax,fy=sy-ay,p=yy*tw+xx;
   for(let c=0;c<3;c++){
    const channel=2-c,p00=((crop.y+ay)*width+crop.x+ax)*4,p10=((crop.y+ay)*width+crop.x+bx)*4,p01=((crop.y+by)*width+crop.x+ax)*4,p11=((crop.y+by)*width+crop.x+bx)*4;
    const value=(data[p00+channel]*(1-fx)+data[p10+channel]*fx)*(1-fy)+(data[p01+channel]*(1-fx)+data[p11+channel]*fx)*fy;
    tensor[c*plane+p]=value/127.5-1;
   }
  }
  return {data:tensor,dims:[1,3,th,tw],tensorWidth:tw,tensorHeight:th,width,height,crop};
 }
 function extractTextRegions(output,prepared,options={}){
  const dims=output.dims||output.shape,mapHeight=dims?.[dims.length-2],mapWidth=dims?.[dims.length-1],prob=output.data;
  if(!Number.isInteger(mapWidth)||!Number.isInteger(mapHeight)||mapWidth*mapHeight>2000000||!prob||prob.length!==mapWidth*mapHeight)throw Error('文字检测输出尺寸异常');
  const n=mapWidth*mapHeight,seen=new Uint8Array(n),queue=new Int32Array(n),regions=[],threshold=.3,scoreThreshold=options.scoreThreshold??.6,crop=prepared.crop;
  for(let seed=0;seed<n;seed++){
   if(seen[seed]||!(prob[seed]>=threshold))continue;let head=0,tail=1,x0=mapWidth,y0=mapHeight,x1=0,y1=0,sum=0;queue[0]=seed;seen[seed]=1;
   while(head<tail){const p=queue[head++],x=p%mapWidth,y=Math.floor(p/mapWidth);x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);sum+=prob[p];
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=mapWidth||yy>=mapHeight)continue;const q=yy*mapWidth+xx;if(!seen[q]&&prob[q]>=threshold){seen[q]=1;queue[tail++]=q;}}
   }
   const bw=x1-x0+1,bh=y1-y0+1;if(tail<8||bw<3||bh<3||sum/tail<.65)continue;
   let boxSum=0;for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)boxSum+=prob[y*mapWidth+x];const score=boxSum/(bw*bh);if(score<scoreThreshold)continue;
   const expansion=Math.min(Math.min(bw,bh)*.8,bw*bh*1.5/(2*(bw+bh))),sx=crop.width/mapWidth,sy=crop.height/mapHeight;
   const left=Math.max(crop.x,Math.floor(crop.x+(x0-expansion)*sx)),top=Math.max(crop.y,Math.floor(crop.y+(y0-expansion)*sy)),right=Math.min(crop.x+crop.width,Math.ceil(crop.x+(x1+1+expansion)*sx)),bottom=Math.min(crop.y+crop.height,Math.ceil(crop.y+(y1+1+expansion)*sy));
   const rw=right-left,rh=bottom-top,cx=(left+right)/2,cy=(top+bottom)/2,edge=cy<=prepared.height*.19||cy>=prepared.height*.75||cx<=prepared.width*.12||cx>=prepared.width*.88;
   if(options.edgesOnly!==false&&!edge)continue;if(rw*rh>prepared.width*prepared.height*.14||rh>prepared.height*.2||rw<8||rh<5)continue;
   regions.push({x:left,y:top,width:rw,height:rh,score,edge,source:'text-model'});
  }
  return regions.sort((a,b)=>b.score-a.score).slice(0,Math.min(20,options.maxCandidates||12));
 }
 function detectBadgeCandidate(image,region){
  // This is only a local silhouette check around an already confirmed model text
  // candidate. A bright rectangle, touching region or complex background is rejected.
  if(region.source!=='text-model'||region.score<.6||region.width*region.height>image.width*image.height*.025)return null;
  const {width,height,data}=image,padding=Math.max(6,Math.round(region.height*.25)),x0=Math.max(0,Math.floor(region.x-padding)),y0=Math.max(0,Math.floor(region.y-padding)),x1=Math.min(width,Math.ceil(region.x+region.width+padding)),y1=Math.min(height,Math.ceil(region.y+region.height+padding)),w=x1-x0,h=y1-y0,n=w*h;
  if(n<1||n>200000)return null;
  const lum=new Uint8Array(n),bright=new Uint8Array(n),seen=new Uint8Array(n),queue=new Int32Array(n);let largest=null;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,i=((y+y0)*width+x+x0)*4;lum[p]=(data[i]*77+data[i+1]*150+data[i+2]*29)>>8;bright[p]=lum[p]>=130&&Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2])<=65&&data[i+3]>220?1:0;}
  for(let p=0;p<n;p++)if(bright[p]&&!seen[p]){
   let head=0,tail=1,minx=w,miny=h,maxx=0,maxy=0,border=false;queue[0]=p;seen[p]=1;
   while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);minx=Math.min(minx,x);miny=Math.min(miny,y);maxx=Math.max(maxx,x);maxy=Math.max(maxy,y);if(x===0||y===0||x===w-1||y===h-1)border=true;for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const xx=x+dx,yy=y+dy,qq=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[qq]&&bright[qq]){seen[qq]=1;queue[tail++]=qq;}}}
   if(!largest||tail>largest.pixels.length)largest={pixels:queue.slice(0,tail),x:minx,y:miny,width:maxx-minx+1,height:maxy-miny+1,border};
  }
  const c=largest;if(!c||c.border||c.pixels.length<20)return null;const bw=c.width,bh=c.height,density=c.pixels.length/(bw*bh);
  const overlap=Math.max(0,Math.min(c.x+x0+bw,region.x+region.width)-Math.max(c.x+x0,region.x))*Math.max(0,Math.min(c.y+y0+bh,region.y+region.height)-Math.max(c.y+y0,region.y));
  if(overlap/Math.min(bw*bh,region.width*region.height)<.65||bw/bh<1.4||bw/bh>5||density<.4||density>.85)return null;
  const core=new Uint8Array(n);for(const p of c.pixels)core[p]=1;
  const ring=[];for(let y=Math.max(0,c.y-5);y<Math.min(h,c.y+bh+5);y++)for(let x=Math.max(0,c.x-5);x<Math.min(w,c.x+bw+5);x++)if(x<c.x||x>=c.x+bw||y<c.y||y>=c.y+bh)ring.push(lum[y*w+x]);
  if(!ring.length)return null;ring.sort((a,b)=>a-b);const foreground=Array.from(c.pixels,p=>lum[p]).sort((a,b)=>a-b),contrast=foreground[Math.floor(foreground.length*.5)]-ring[Math.floor(ring.length*.8)];
  const corner=Math.max(2,Math.floor(Math.min(bw,bh)*.15));let cornerHits=0,cornerArea=0;
  for(const [cx,cy]of [[c.x,c.y],[c.x+bw-corner,c.y],[c.x,c.y+bh-corner],[c.x+bw-corner,c.y+bh-corner]])for(let y=cy;y<cy+corner;y++)for(let x=cx;x<cx+corner;x++){cornerArea++;cornerHits+=core[y*w+x];}
  if(contrast<70||cornerHits/cornerArea>.15)return null;
  // Fill only holes enclosed by the validated bright silhouette, including the
  // badge's dark lettering. The exterior remains available as background context.
  seen.fill(0);for(let p=0;p<n;p++)if(!core[p]&&!seen[p]){let head=0,tail=1,border=false;queue[0]=p;seen[p]=1;
   while(head<tail){const q=queue[head++],x=q%w,y=Math.floor(q/w);if(x===0||y===0||x===w-1||y===h-1)border=true;for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1]]){const xx=x+dx,yy=y+dy,qq=yy*w+xx;if(xx>=0&&xx<w&&yy>=0&&yy<h&&!seen[qq]&&!core[qq]){seen[qq]=1;queue[tail++]=qq;}}}
   if(!border)for(let i=0;i<tail;i++)core[queue[i]]=1;
  }
  const expanded=new Uint8Array(n);for(let p=0;p<n;p++)if(core[p]){const x=p%w,y=Math.floor(p/w);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<w&&yy>=0&&yy<h&&data[((yy+y0)*width+xx+x0)*4+3]>220)expanded[yy*w+xx]=1;}}
  const runs=[];let pixels=0;for(let y=0;y<h;y++)for(let x=0;x<w;){if(!expanded[y*w+x]){x++;continue;}const start=x;while(x<w&&expanded[y*w+x])x++;runs.push([start+x0,y+y0,x-start,1]);pixels+=x-start;}
  return {...region,x:x0,y:y0,width:w,height:h,kind:'badge',polarity:'light',pixels,runs};
 }
 function refineTextMasks(image,detectedRegions,options={}){
  validateImage(image);const {width,height,data}=image,mask=new Uint8Array(width*height),regions=[],skipped=[],offsets=[[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];
  const gray=(x,y)=>{x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));const i=(y*width+x)*4;return (data[i]*77+data[i+1]*150+data[i+2]*29)>>8;};
  for(const candidate of detectedRegions.slice(0,12)){
   const badge=detectBadgeCandidate(image,candidate);if(badge){for(const [x,y,length]of badge.runs)mask.fill(1,y*width+x,y*width+x+length);regions.push({...badge,id:regions.length+1});continue;}
   const x0=Math.max(0,Math.floor(candidate.x)),y0=Math.max(0,Math.floor(candidate.y)),x1=Math.min(width,Math.ceil(candidate.x+candidate.width)),y1=Math.min(height,Math.ceil(candidate.y+candidate.height)),rw=x1-x0,rh=y1-y0,n=rw*rh;
   if(n<1||n>width*height*.14){skipped.push({...candidate,reason:'area'});continue;}
   const radius=Math.max(4,Math.min(16,Math.round(rh*.18))),lightSeeds=[],darkSeeds=[],values=new Uint8Array(n),chroma=new Uint8Array(n);let lightSum=0,darkSum=0;
   for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
    const q=y*rw+x,p=((y+y0)*width+x+x0)*4,v=gray(x+x0,y+y0);values[q]=v;chroma[q]=Math.max(data[p],data[p+1],data[p+2])-Math.min(data[p],data[p+1],data[p+2]);
    if(data[p+3]<220||chroma[q]>65)continue;let background=0;for(const [dx,dy]of offsets)background+=gray(x+x0+dx*radius,y+y0+dy*radius)/8;const delta=v-background;
    if(v>=130&&delta>=25){lightSeeds.push(q);lightSum+=delta;}else if(v<=100&&delta<=-25){darkSeeds.push(q);darkSum-=delta;}
   }
   const lightStrength=lightSum/Math.sqrt(Math.max(1,lightSeeds.length)),darkStrength=darkSum/Math.sqrt(Math.max(1,darkSeeds.length)),light=lightStrength>darkStrength,seeds=light?lightSeeds:darkSeeds,strong=Math.max(lightStrength,darkStrength),weak=Math.min(lightStrength,darkStrength);
   if(seeds.length<8||strong<weak*1.2){skipped.push({...candidate,reason:'uncertain-colour'});continue;}
   const seedValues=seeds.map(p=>values[p]).sort((a,b)=>a-b),median=seedValues[Math.floor(seedValues.length*.5)],cutoff=light?Math.max(125,median-35):Math.min(105,median+28),core=new Uint8Array(n),queue=new Int32Array(n);let head=0,tail=0;
   for(const p of seeds)if(light?values[p]>=cutoff:values[p]<=cutoff){core[p]=1;queue[tail++]=p;}
   while(head<tail){const p=queue[head++],x=p%rw,y=Math.floor(p/rw);for(const [dx,dy]of offsets){const xx=x+dx,yy=y+dy;if(xx<0||xx>=rw||yy<0||yy>=rh)continue;const q=yy*rw+xx,original=((yy+y0)*width+xx+x0)*4;if(core[q]||chroma[q]>80||data[original+3]<220||(light?values[q]<cutoff:values[q]>cutoff))continue;core[q]=1;queue[tail++]=q;}}
   const expanded=new Uint8Array(n),padding=Math.max(1,Math.min(3,options.padding??2));
   for(let p=0;p<n;p++)if(core[p]){const x=p%rw,y=Math.floor(p/rw);for(let dy=-padding;dy<=padding;dy++)for(let dx=-padding;dx<=padding;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<rw&&yy>=0&&yy<rh&&data[((yy+y0)*width+xx+x0)*4+3]>=220)expanded[yy*rw+xx]=1;}}
   let pixels=0;for(const value of expanded)pixels+=value;if(pixels<8||pixels/n>.85){skipped.push({...candidate,reason:'uncertain-shape'});continue;}
   const runs=[];for(let y=0;y<rh;y++)for(let x=0;x<rw;){if(!expanded[y*rw+x]){x++;continue;}const start=x;while(x<rw&&expanded[y*rw+x]){mask[(y+y0)*width+x+x0]=1;x++;}runs.push([start+x0,y+y0,x-start,1]);}
   regions.push({...candidate,id:regions.length+1,x:x0,y:y0,width:rw,height:rh,kind:'text',polarity:light?'light':'dark',pixels,runs});
  }
  const runs=[];let pixels=0;for(let y=0;y<height;y++)for(let x=0;x<width;){if(!mask[y*width+x]){x++;continue;}const start=x;while(x<width&&mask[y*width+x])x++;runs.push([start,y,x-start,1]);pixels+=x-start;}
  if(pixels>width*height*.1||runs.length>100000)return {mask:new Uint8Array(width*height),regions:[],runs:[],pixels:0,mode:'all',skipped:detectedRegions.map(r=>({...r,reason:'too-many-candidates'})),model:MODEL.name};
  return {mask,regions,runs,pixels,mode:'all',skipped,model:MODEL.name};
 }
 async function detectTextCandidates(session,ort,image,options={}){
  validateImage(image);const passes=[{}];if(options.detailPass===true&&image.height>800)passes.push({crop:{x:0,y:Math.floor(image.height*.7),width:image.width,height:Math.ceil(image.height*.3)}});
  const detected=[];for(const pass of passes){const prepared=prepareTextDetection(image,{...options,...pass}),input=new ort.Tensor('float32',prepared.data,prepared.dims);let output;
   try{output=await session.run({[session.inputNames[0]]:input});detected.push(...extractTextRegions(output[session.outputNames[0]],prepared,options));}finally{input.dispose?.();if(output)for(const value of Object.values(output))value.dispose?.();}
  }
  const merged=[];for(const region of detected.sort((a,b)=>b.score-a.score)){
   const duplicate=merged.find(a=>{const overlap=Math.max(0,Math.min(a.x+a.width,region.x+region.width)-Math.max(a.x,region.x))*Math.max(0,Math.min(a.y+a.height,region.y+region.height)-Math.max(a.y,region.y));return overlap/Math.min(a.width*a.height,region.width*region.height)>.65;});
   if(duplicate){const right=Math.max(duplicate.x+duplicate.width,region.x+region.width),bottom=Math.max(duplicate.y+duplicate.height,region.y+region.height);duplicate.x=Math.min(duplicate.x,region.x);duplicate.y=Math.min(duplicate.y,region.y);duplicate.width=right-duplicate.x;duplicate.height=bottom-duplicate.y;}else merged.push({...region});
  }
  return refineTextMasks(image,merged.slice(0,options.maxCandidates||8),options);
 }
 const api={MODEL,prepareTextDetection,extractTextRegions,detectBadgeCandidate,refineTextMasks,detectTextCandidates};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TextDetection=api;
})(typeof globalThis!=='undefined'?globalThis:this);

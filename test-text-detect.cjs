const assert=require('node:assert/strict');
const {MODEL,prepareTextDetection,extractTextRegions,detectBadgeCandidate,refineTextMasks,detectTextCandidates}=require('./public/text-detect.js');
function image(width=320,height=240,value=50){const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4)data.set([value,value,value,255],i);return {data,width,height};}
function letters(im,x,y,value){for(let k=0;k<8;k++)for(let yy=0;yy<14;yy++)for(let xx=0;xx<8;xx++)if(xx<2||yy<2||yy>11||yy>5&&yy<8){const i=((y+yy)*im.width+x+k*13+xx)*4;im.data.set([value,value,value,255],i);}}
const colour=image(32,32);for(let i=0;i<colour.data.length;i+=4)colour.data.set([255,128,0,255],i);const pp=prepareTextDetection(colour);assert.deepEqual(pp.dims,[1,3,32,32]);assert.equal(pp.data[0],-1);assert(Math.abs(pp.data[1024]-(128/127.5-1))<1e-6);assert.equal(pp.data[2048],1,'BGR channels match the official RapidOCR preprocessing');
const large=image(1500,900),resized=prepareTextDetection(large);assert.equal(Math.max(...resized.dims.slice(2)),960);assert(resized.dims.slice(2).every(x=>x%32===0));
const crop=prepareTextDetection(large,{crop:{x:100,y:500,width:800,height:300}});assert.deepEqual(crop.crop,{x:100,y:500,width:800,height:300});
const map=new Float32Array(320*240);function box(x,y,w,h){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)map[yy*320+xx]=.9;}box(195,216,90,10);box(100,110,90,10);const meta={width:320,height:240,crop:{x:0,y:0,width:320,height:240}};
const edgeRegions=extractTextRegions({data:map,dims:[1,1,240,320]},meta);assert.equal(edgeRegions.length,1,'Central normal text is excluded by default');assert(edgeRegions[0].y>190);assert.equal(extractTextRegions({data:map,dims:[1,1,240,320]},meta,{edgesOnly:false}).length,2);
assert.equal(extractTextRegions({data:new Float32Array(map.length),dims:[1,1,240,320]},meta).length,0);assert.throws(()=>extractTextRegions({data:map,dims:[1,1,2,2]},meta));
for(const light of [true,false]){const im=image(320,240,light?40:200);letters(im,194,215,light?230:20);const copy=im.data.slice(),region={x:190,y:210,width:114,height:23,score:.95},r=refineTextMasks(im,[region]);assert(r.pixels>100);assert.equal(r.regions[0].polarity,light?'light':'dark');assert.equal(r.regions[0].score,.95);assert.equal(r.regions[0].runs.reduce((n,a)=>n+a[2],0),r.regions[0].pixels);assert.equal(r.runs.reduce((n,a)=>n+a[2],0),r.pixels);assert.equal(r.mask.reduce((n,v)=>n+v,0),r.pixels);assert.deepEqual(im.data,copy,'Original image data remains exact');
 let background=0;for(let y=region.y;y<region.y+region.height;y++)for(let x=region.x;x<region.x+region.width;x++)if(!r.mask[y*im.width+x])background++;assert(background>region.width*region.height*.15,'Never fill the entire bounding rectangle');
 for(let p=0;p<r.mask.length;p++)if(r.mask[p]){const x=p%im.width,y=Math.floor(p/im.width);assert(x>=region.x&&x<region.x+region.width&&y>=region.y&&y<region.y+region.height,'Mask stays in the confirmed detection region');}
}
assert.equal(refineTextMasks(image(),[{x:190,y:210,width:114,height:23,score:.95}]).pixels,0,'Uniform background is not a text mask');
assert.throws(()=>prepareTextDetection({width:2,height:2}));
assert.equal(MODEL.path,'models/text-det.onnx');
function paintRect(im,x,y,w,h,value){for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)im.data.set([value,value,value,255],(yy*im.width+xx)*4);}
const badgeRegion={x:200,y:190,width:60,height:25,source:'text-model',score:.95};
const badgeImage=image(320,240,20);for(let y=190;y<215;y++)for(let x=200;x<260;x++){const cx=x<212.5?212.5:x>247.5?247.5:x;if((x-cx)**2+(y-202.5)**2<=12.5**2)paintRect(badgeImage,x,y,1,1,190);}
for(const x of [216,230,244])paintRect(badgeImage,x,198,5,10,20);
const badgeOriginal=badgeImage.data.slice(),badge=detectBadgeCandidate(badgeImage,badgeRegion);assert(badge&&badge.kind==='badge');assert(badge.pixels<badge.width*badge.height*.8,'Use badge silhouette rather than its enclosing rectangle');assert(badge.runs.some(([x,y,w])=>y===201&&x<=218&&x+w>218),'Include dark glyph holes inside the validated badge');assert.deepEqual(badgeImage.data,badgeOriginal);assert.equal(detectBadgeCandidate(badgeImage,{...badgeRegion,source:'manual'}),null,'Never detect a badge without model evidence');
for(const type of ['rectangle','touching','lowcontrast','blank']){const im=image(320,240,type==='lowcontrast'?150:20);if(type==='rectangle'||type==='lowcontrast')paintRect(im,200,190,60,25,190);if(type==='touching')paintRect(im,194,184,72,37,190);assert.equal(detectBadgeCandidate(im,badgeRegion),null,type+' is not a safe closed badge candidate');}
const badgeResult=refineTextMasks(badgeImage,[badgeRegion]);assert.equal(badgeResult.regions[0].kind,'badge');assert.equal(badgeResult.regions[0].pixels,badgeResult.pixels);assert.equal(badgeResult.runs.reduce((n,r)=>n+r[2],0),badgeResult.pixels);assert.equal(badgeResult.mask.reduce((n,p)=>n+p,0),badgeResult.pixels);
(async()=>{const im=image();letters(im,194,215,230);let inputDisposed=false,outputDisposed=false;class Tensor{constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}dispose(){inputDisposed=true;}}
 const session={inputNames:['x'],outputNames:['prob'],async run(feeds){assert.equal(feeds.x.type,'float32');return {prob:{data:map,dims:[1,1,240,320],dispose(){outputDisposed=true;}}};}};
 const result=await detectTextCandidates(session,{Tensor},im);assert(result.pixels>0);assert(inputDisposed&&outputDisposed,'Release input and probability tensors after inference');
 console.log('PASS: BGR normalization, bounded resize/crops, edge-only model candidates, precise masks, source preservation, per-candidate runs, tensor disposal');
})().catch(e=>{console.error(e);process.exitCode=1;});

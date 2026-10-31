const assert=require('node:assert/strict');
const {detectWatermarkCandidates:detect}=require('./public/watermark-detect.js');
function fixture(width=600,height=500,background=50){const data=new Uint8ClampedArray(width*height*4);for(let i=0;i<data.length;i+=4)data.set([background,background,background,255],i);return {data,width,height};}
function text(image,x,y,color=230){const {data,width}=image;for(let letter=0;letter<10;letter++)for(let yy=0;yy<18;yy++)for(let xx=0;xx<10;xx++){if(xx<2||yy<2||yy>15||yy>7&&yy<10){const p=((y+yy)*width+x+letter*15+xx)*4;data.set([color,color,color,255],p);}}}
const light=fixture();text(light,390,460);const found=detect(light);assert(found.pixels>150);assert(found.regions.some(r=>r.polarity==='light'));assert(found.regions.every(r=>r.y>400));assert(found.runs.length<50000);
assert(found.mask[466*light.width+389],'Cover the antialiased margin beside the ink');
assert.equal(found.mask[461*light.width+402],0,'Do not bridge a gap beyond the two-pixel margin');
for(let i=0;i<found.mask.length;i++)if(found.mask[i]){
 const x=i%light.width,y=Math.floor(i/light.width);let nearInk=false;
 for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&yy>=0&&xx<light.width&&yy<light.height&&light.data[(yy*light.width+xx)*4]>180)nearInk=true;}
 assert(nearInk,'Expansion is bounded to two original pixels on this image');
 assert(found.regions.some(r=>x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height),'Expanded selection stays inside candidate bounds');
}
const dark=fixture(600,500,190);text(dark,220,450,25);const darkResult=detect(dark);assert(darkResult.pixels>150);assert.equal(darkResult.mode,'dark');
const center=fixture();text(center,200,250);assert.equal(detect(center).pixels,0,'Central captions are not automatic watermark candidates');
assert.equal(detect(fixture()).pixels,0,'Blank image has no candidates');
const texture=fixture();for(let y=0;y<texture.height;y++)for(let x=0;x<texture.width;x++){const v=(x+y)%2?220:25;texture.data.set([v,v,v,255],(y*texture.width+x)*4);}assert.equal(detect(texture).pixels,0,'Checker texture must not be offered as watermark');
for(const kind of ['grain','stripes','bar']){
 const image=fixture();let seed=1337;
 for(let y=0;y<image.height;y++)for(let x=0;x<image.width;x++){
  seed=(Math.imul(seed,1664525)+1013904223)>>>0;
  const v=kind==='grain'?seed>>>24:kind==='stripes'?(x%8<4?230:20):(y>460&&y<480&&x>100&&x<500?230:20);
  image.data.set([v,v,v,255],(y*image.width+x)*4);
 }
 assert.equal(detect(image).pixels,0,kind+' must not produce an automatic selection');
}
const transparent=fixture();text(transparent,390,460);for(let i=3;i<transparent.data.length;i+=4)transparent.data[i]=0;assert.equal(detect(transparent).pixels,0,'Transparent pixels are not text');
const snapshot=light.data.slice();detect(light);assert.deepEqual(light.data,snapshot,'Detection never edits the original image');
assert.equal(found.runs.reduce((n,r)=>n+r[2],0),found.pixels,'Preview runs and repair mask agree');
assert.equal(found.mask.reduce((n,p)=>n+p,0),found.pixels);
assert.throws(()=>detect({data:[],width:10,height:10}));
assert(found.regions.length<=3&&found.pixels<light.width*light.height*.035);console.log('PASS: light/dark edge text, central-caption exclusion, blank/texture/transparent rejection, bounded masks');

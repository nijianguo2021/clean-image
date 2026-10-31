const assert=require('node:assert/strict');
const {planRepairRegions}=require('./public/repair-regions.js');
function fixture(width,height,rectangles){const mask=new Uint8Array(width*height);for(const [x,y,w,h] of rectangles)for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)mask[yy*width+xx]=1;return {mask,width,height};}
function verify(f,options){
 const before=f.mask.slice(),result=planRepairRegions(f.mask,f.width,f.height,options),owned=new Uint8Array(f.mask.length);
 assert(result.regions.length<=(options?.maxRegions||12));
 for(const region of result.regions){
  const r=region.rect;assert(r.x>=0&&r.y>=0&&r.width>0&&r.height>0&&r.x+r.width<=f.width&&r.y+r.height<=f.height);
  assert.equal(region.indices.length,region.pixelCount);
  for(const p of region.indices){const x=p%f.width,y=Math.floor(p/f.width);assert(f.mask[p]);assert.equal(owned[p],0,'No pixel may belong to two repairs');owned[p]=1;assert(x>=r.x&&x<r.x+r.width&&y>=r.y&&y<r.y+r.height);}
 }
 assert.deepEqual(owned,f.mask,'Every selected pixel belongs to exactly one region, with no outside pixels');
 assert.equal(result.selectedPixels,owned.reduce((a,b)=>a+b,0));assert.deepEqual(f.mask,before);
 // Model composition using these indices cannot change any unselected pixel.
 const output=new Uint8Array(f.mask.length).fill(37);for(const region of result.regions)for(const p of region.indices)output[p]=91;
 for(let p=0;p<f.mask.length;p++)assert.equal(output[p],f.mask[p]?91:37);
 return result;
}
assert.equal(verify(fixture(80,60,[])).regions.length,0);
let result=verify(fixture(1600,1200,[[30,40,20,12],[1500,1100,30,16]]));
assert.equal(result.regions.length,2);assert(result.regions.every(r=>r.rect.width<250&&r.rect.height<230));
const overlapping=fixture(700,400,[[100,180,100,20],[250,180,100,20]]);
result=verify(overlapping);assert.equal(result.regions.length,2);
for(const region of result.regions){
 // This is a write-ownership map, not the model input mask. Inference may hide
 // every global selection within context; output belongs only to this region.
 const r=region.rect,ownedOutput=new Uint8Array(r.width*r.height),owned=new Set(region.indices);
 for(const p of region.indices)ownedOutput[(Math.floor(p/overlapping.width)-r.y)*r.width+p%overlapping.width-r.x]=1;
 for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++)assert.equal(ownedOutput[y*r.width+x],owned.has((y+r.y)*overlapping.width+x+r.x)?1:0,'Overlapping context must not assign output ownership to another region');
}
result=verify(fixture(600,400,[[100,120,12,22],[130,120,12,22],[160,120,12,22]]));
assert.equal(result.regions.length,1,'Nearby letters must share one local repair');
result=verify(fixture(1800,500,Array.from({length:8},(_,i)=>[50+i*110,220,90,25])));
assert(result.regions.length>=3,'A long caption can split only at genuine word gaps');
assert(result.regions.every(r=>r.rect.width<=512));
result=verify(fixture(1600,600,[[200,180,1000,180]]));
assert.equal(result.regions.length,1,'A connected wide hole must not be mechanically tiled');
result=verify(fixture(1700,600,[[100,180,500,160],[605,180,500,160]]));
assert.equal(result.regions.length,1,'A narrow gap in a broad selection is not a safe split');
result=verify(fixture(1800,1800,Array.from({length:20},(_,i)=>[30+(i%5)*330,30+Math.floor(i/5)*400,10,10])));
assert.equal(result.regions.length,12);assert(result.groupLimitApplied);
result=verify(fixture(60,50,[[0,0,2,2],[58,48,2,2]]),{joinGap:0,maxRegions:2});
assert.equal(result.regions.length,2);
result=verify(fixture(600,600,Array.from({length:300},(_,i)=>[4+(i%20)*28,4+Math.floor(i/20)*36,1,1])));
assert.equal(result.strategy,'component-limit');assert.equal(result.regions.length,1);
assert.throws(()=>planRepairRegions(new Uint8Array(2),2,2));
console.log('PASS: separated groups, neighboring letters, safe word gaps, connected holes, region cap, image borders, noisy-mask fallback, exact ownership and untouched outside pixels');

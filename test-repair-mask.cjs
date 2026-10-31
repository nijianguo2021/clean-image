const assert=require('node:assert/strict');
const {buildInferenceMask}=require('./public/repair-mask.js');
function reference(selection,width,height,rect,guard){
 const result=new Uint8Array(rect.width*rect.height).fill(255);
 for(let y=0;y<rect.height;y++)for(let x=0;x<rect.width;x++){
  for(let yy=Math.max(0,rect.y+y-guard);yy<=Math.min(height-1,rect.y+y+guard);yy++)for(let xx=Math.max(0,rect.x+x-guard);xx<=Math.min(width-1,rect.x+x+guard);xx++)if(selection[yy*width+xx])result[y*rect.width+x]=0;
 }
 return result;
}
const width=29,height=23,selection=new Uint8Array(width*height);
for(const [x,y]of [[0,0],[28,22],[14,11],[6,11],[11,5]])selection[y*width+x]=255;
const original=selection.slice(),crop={x:8,y:8,width:13,height:10};
for(const rect of [{x:0,y:0,width,height},crop,{x:0,y:0,width:3,height:4},{x:27,y:20,width:2,height:3}])for(const guard of [0,1,3,8,100]){
 const result=buildInferenceMask(selection,width,height,rect,guard);
 assert.deepEqual(result,reference(selection,width,height,rect,guard));assert.equal(result.length,rect.width*rect.height);
}
assert.deepEqual(selection,original,'The original output selection must remain unchanged');
const guarded=buildInferenceMask(selection,width,height,crop);
assert.equal(guarded[(11-crop.y)*crop.width],0,'A selection two pixels outside the crop must protect its inside neighbors');
assert.equal(guarded[11-crop.x],0,'A selection three pixels above the crop must protect its top row');
assert.equal(buildInferenceMask(selection,width,height,crop,0)[(11-crop.y)*crop.width],255);
for(let p=0;p<selection.length;p++)if(selection[p]){
 const sx=p%width,sy=Math.floor(p/width);
 for(let y=Math.max(crop.y,sy-3);y<Math.min(crop.y+crop.height,sy+4);y++)for(let x=Math.max(crop.x,sx-3);x<Math.min(crop.x+crop.width,sx+4);x++)assert.equal(guarded[(y-crop.y)*crop.width+x-crop.x],0,'Every selected pixel has a full available 3px unknown neighborhood');
}
const empty=new Uint8Array(80);assert(buildInferenceMask(empty,10,8,{x:0,y:0,width:10,height:8}).every(v=>v===255));
assert(buildInferenceMask(new Uint8Array(80).fill(1),10,8,{x:0,y:0,width:10,height:8}).every(v=>v===0));
assert.throws(()=>buildInferenceMask(selection,width,height,{x:-1,y:0,width:2,height:2}));
assert.throws(()=>buildInferenceMask(selection,width,height,crop,-1));

// Simulate the pipeline's known-mask maxpool3 -> gaussian5 source coefficient.
// All Gaussian coefficients are positive: the radius-3 zero guarantee does not
// depend on the particular Gaussian sigma. Clamped borders preserve edge zeros.
function sourceCoefficient(known,w,h){
 const pooled=new Float64Array(w*h),result=new Float64Array(w*h),kernel=[];
 for(let k=-2;k<=2;k++)kernel.push(Math.exp(-k*k/2));const total=kernel.reduce((a,b)=>a+b,0);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)pooled[y*w+x]=Math.max(pooled[y*w+x],known[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))]/255);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)result[y*w+x]+=pooled[Math.max(0,Math.min(h-1,y+dy))*w+Math.max(0,Math.min(w-1,x+dx))]*kernel[dy+2]*kernel[dx+2]/(total*total);
 return result;
}
const w=31,h=25,thin=new Uint8Array(w*h);for(let y=4;y<21;y++)thin[y*w+15]=1;thin[0]=1;thin[w*h-1]=1;
const thinBefore=thin.slice();
const rect={x:0,y:0,width:w,height:h},oldCoefficient=sourceCoefficient(buildInferenceMask(thin,w,h,rect,0),w,h),newCoefficient=sourceCoefficient(buildInferenceMask(thin,w,h,rect,3),w,h);
for(let p=0;p<thin.length;p++)if(thin[p]){
 assert(oldCoefficient[p]>.5,'The old thin mask visibly mixes source lettering back in');
 assert.equal(newCoefficient[p],0,'The guarded input must give selected output pixels zero source mixing');
 const originalLetter=15,generatedBackground=180;
 assert(Math.abs(originalLetter*oldCoefficient[p]+generatedBackground*(1-oldCoefficient[p])-generatedBackground)>80);
 assert.equal(originalLetter*newCoefficient[p]+generatedBackground*(1-newCoefficient[p]),generatedBackground);
}
// There is deliberately no output compositor here. The caller still writes
// only its original selection/ownership indices, never this expanded input.
assert.deepEqual(thin,thinBefore,'The expanded inference mask must not change output ownership');
console.log('PASS: linear dilation matches reference, original selection unchanged, image/crop borders and external halo, guard-zero compatibility, and maxpool3+gaussian5 source coefficient zero at every selected pixel');

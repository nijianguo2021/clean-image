const assert=require('node:assert/strict');
const {refineSmoothGaps}=require('./public/repair-quality.js');
const sw=80,sh=60,sm=new Uint8Array(sw*sh),orig=new Uint8ClampedArray(sw*sh*4);
for(let y=0;y<sh;y++)for(let x=0;x<sw;x++){const p=y*sw+x;orig.set([60+y*2,70+y*2,80+y*2,255],p*4);if(x>34&&x<44&&y>12&&y<48)sm[p]=1;}
const damaged=orig.slice();for(let p=0;p<sm.length;p++)if(sm[p])damaged.set([180,180,180,255],p*4);
let before=0,after=0;for(let p=0;p<sm.length;p++)if(sm[p])before+=Math.abs(damaged[p*4]-orig[p*4]);
refineSmoothGaps(damaged,orig,sm,sw,sh);
for(let p=0;p<sm.length;p++){if(sm[p])after+=Math.abs(damaged[p*4]-orig[p*4]);else assert.deepEqual(damaged.slice(p*4,p*4+4),orig.slice(p*4,p*4+4));}
assert(after<before*.15,'Smooth-line refinement must improve rather than smear the synthetic stripe');
console.log('PASS: original smooth line/color reconstructed; untouched pixels exact');

for(let p=0;p<sm.length;p++)assert.equal(damaged[p*4+3],orig[p*4+3]);
const untouched=orig.slice();refineSmoothGaps(untouched,orig,new Uint8Array(sm.length),sw,sh);assert.deepEqual(untouched,orig);
// Large ambiguous gaps must retain the generated result rather than extrapolate across an object.
const lw=100,lh=100,lm=new Uint8Array(lw*lh),lo=new Uint8ClampedArray(lm.length*4).fill(100),lt=lo.slice();
for(let y=10;y<90;y++)for(let x=10;x<90;x++){lm[y*lw+x]=1;lt[(y*lw+x)*4]=200;}
refineSmoothGaps(lt,lo,lm,lw,lh);assert.equal(lt[(50*lw+50)*4],200);
// High-frequency texture must not be replaced by smooth interpolation.
const tw=40,th=40,tm=new Uint8Array(tw*th),to=new Uint8ClampedArray(tm.length*4),tt=new Uint8ClampedArray(to.length).fill(123);
for(let y=0;y<th;y++)for(let x=0;x<tw;x++){const p=y*tw+x;to.set([(x+y)%2?255:0,(x+y)%2?255:0,(x+y)%2?255:0,255],p*4);if(x>=15&&x<=20&&y>=15&&y<=20)tm[p]=1;}
const tb=tt.slice();refineSmoothGaps(tt,to,tm,tw,th);assert.deepEqual(tt,tb);
console.log('PASS: alpha preserved; empty selection unchanged; large gaps and rough texture retain model result');

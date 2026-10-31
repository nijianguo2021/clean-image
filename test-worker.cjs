const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const {planRepairRegions}=require('./public/repair-regions.js');
const {refineSmoothGaps}=require('./public/repair-quality.js');
const {refineTexture}=require('./public/texture-repair.js');
let messages=[],calls=[],differentOutputs=false;
class Tensor{constructor(type,data,dims){this.type=type;this.data=data;this.dims=dims;}dispose(){this.disposed=true;}}
const session={outputNames:['result'],async run({image,mask}){
 assert.equal(image.dims[2]*image.dims[3],mask.data.length);
 const n=mask.data.length,value=differentOutputs?101+calls.length:177;
 const data=new Uint8Array(n*3);data.fill(value);const output=new Tensor('uint8',data,image.dims);calls.push({image,mask,output,value});return {result:output};
}};
const fakeDetection={regions:[{x:1,y:1,width:3,height:2,runs:[[1,1,2,1]]}],runs:[[1,1,2,1]],pixels:2,skipped:[]};
const self={location:{href:'https://example.test/ai-worker.js'},postMessage:m=>messages.push(m)};
class RepairError extends Error{constructor(code,message){super(message);this.code=code;}}
const context=vm.createContext({self,importScripts(){},planRepairRegions,refineSmoothGaps,refineTexture,RepairError,explainError:e=>({error:e.message,code:e.code}),TextDetection:{detectTextCandidates:async()=>fakeDetection},ort:{Tensor},testSession:session,Uint8Array,Uint8ClampedArray,Uint32Array,Date,Math,console});
const workerSource=fs.readFileSync('./public/ai-worker.js','utf8');
vm.runInContext(workerSource,context);
vm.runInContext('initializeRepair=async()=>testSession;initializeText=async()=>testSession;',context);
(async()=>{
 const width=900,height=180,original=new Uint8ClampedArray(width*height*4),mask=new Uint8Array(width*height);
 for(let p=0;p<mask.length;p++)original.set([p%80+20,70,100,p%255],p*4);
 for(const [left,top] of [[30,40],[800,90]])for(let y=top;y<top+10;y++)for(let x=left;x<left+8;x++)mask[y*width+x]=1;
 const sourceCopy=original.slice();await self.onmessage({data:{pixels:original.buffer,mask:mask.buffer,width,height,quality:'fast'}});
 const response=messages.find(m=>m.pixels);assert(response);assert.equal(calls.length,2,'Separated selections should use two local inferences');
 const target=new Uint8ClampedArray(response.pixels);
 for(let p=0;p<mask.length;p++){
  assert.equal(target[p*4+3],original[p*4+3],'Alpha must remain unchanged');
  for(let c=0;c<3;c++)assert.equal(target[p*4+c],mask[p]?177:original[p*4+c],'Only the previewed pixels may change');
 }
 assert.deepEqual(original,sourceCopy,'Each inference must read from the original image');
 assert(calls.every(c=>c.image.disposed&&c.mask.disposed&&c.output.disposed),'Release per-region input and output tensors');
 // Padded crops overlap. All selected pixels in each crop must be unknown to
 // inference, while only that region's owned pixels receive its distinct result.
 messages=[];calls=[];differentOutputs=true;
 const ow=700,oh=400,overlapSource=new Uint8ClampedArray(ow*oh*4),overlapMask=new Uint8Array(ow*oh);
 for(let p=0;p<overlapMask.length;p++)overlapSource.set([p%91+20,80,120,p%251],p*4);
 for(const left of [100,250])for(let y=180;y<200;y++)for(let x=left;x<left+100;x++)overlapMask[y*ow+x]=1;
 const plan=planRepairRegions(overlapMask,ow,oh),owner=new Uint8Array(overlapMask.length),overlapCopy=overlapSource.slice();
 assert.equal(plan.regions.length,2);plan.regions.forEach((r,i)=>{for(const p of r.indices)owner[p]=i+1;});
 await self.onmessage({data:{pixels:overlapSource.buffer,mask:overlapMask.buffer,width:ow,height:oh,quality:'fast'}});
 assert.equal(calls.length,2);const overlapResponse=messages.find(m=>m.pixels);assert(overlapResponse);
 const overlapOutput=new Uint8ClampedArray(overlapResponse.pixels);let neighborContextPixels=0;
 for(const [index,region] of plan.regions.entries()){
  const {rect:r}=region,call=calls[index],n=r.width*r.height;
  assert.deepEqual(Array.from(call.image.dims),[1,3,r.height,r.width]);
  for(let y=0;y<r.height;y++)for(let x=0;x<r.width;x++){
   const p=y*r.width+x,q=(y+r.y)*ow+x+r.x;
   assert.equal(call.mask.data[p],overlapMask[q]?0:255,'Inference must hide every global selection in the local crop');
   if(owner[q]&&owner[q]!==index+1)neighborContextPixels++;
   for(let c=0;c<3;c++)assert.equal(call.image.data[c*n+p],overlapSource[q*4+c],'Later groups must still read the original source');
  }
 }
 assert(neighborContextPixels>0,'The fixture must actually place another selection in padded context');
 for(let p=0;p<overlapMask.length;p++){
  for(let c=0;c<3;c++)assert.equal(overlapOutput[p*4+c],owner[p]?100+owner[p]:overlapSource[p*4+c],'Different inference outputs must only land in their own region');
  assert.equal(overlapOutput[p*4+3],overlapSource[p*4+3]);
 }
 assert.deepEqual(overlapSource,overlapCopy);assert(calls.every(c=>c.image.disposed&&c.mask.disposed&&c.output.disposed));
 // A late optional refinement may fail after partially changing the image.
 // Keep the completed per-region model result, not a partial postprocess result.
 messages=[];calls=[];
 context.refineTexture=(target,source,selected)=>{for(let p=0;p<selected.length;p++)if(selected[p])target.set([9,8,7],p*4);throw Error('simulated texture refinement failure');};
 await self.onmessage({data:{pixels:overlapSource.buffer,mask:overlapMask.buffer,width:ow,height:oh,quality:'detail'}});
 const recovered=messages.find(m=>m.pixels);assert(recovered);assert(!messages.some(m=>m.error));
 assert.equal(recovered.stats.detailSkipped,true);assert.equal(recovered.stats.texturePixels,0);
 assert.deepEqual(new Uint8ClampedArray(recovered.pixels),overlapOutput,'A failed refinement must restore the complete model output including every region');
 assert.deepEqual(overlapSource,overlapCopy);assert(calls.every(c=>c.image.disposed&&c.mask.disposed&&c.output.disposed));
 context.refineTexture=refineTexture;
 differentOutputs=false;
 messages=[];await self.onmessage({data:{kind:'detect',pixels:original.buffer,width,height}});
 assert.equal(messages.at(-1).detection.pixels,2);assert(!messages.at(-1).pixels,'Detection must return candidates without editing image pixels');
 messages=[];await self.onmessage({data:{pixels:original.buffer,mask:new Uint8Array(1).buffer,width,height}});
 assert.equal(messages.at(-1).code,'selection');
 // Exercise the real initializer functions, not the inference-test stubs above.
 // Release resolves asynchronously so removing its await breaks this ordering.
 const events=[];let live=0;
 const switchORT={env:{wasm:{}},InferenceSession:{async create(model){assert.equal(live,0,'Finish releasing the previous model before creating another');const name=model[0]===1?'OCR':'MI-GAN';live++;events.push('create '+name);return {async release(){events.push('release-start '+name);await Promise.resolve();live--;events.push('release-done '+name);}};}}};
 const switchContext=vm.createContext({self:{location:{href:'https://example.test/ai-worker.js'},postMessage(){}},importScripts(){},ort:switchORT,createResourceLoader:()=>async()=>new Uint8Array([1]),loadBinary:async()=>new Uint8Array([2]),deadline:p=>p,Uint8Array});
 vm.runInContext(workerSource,switchContext);vm.runInContext('runtimeReady=true;resource=()=>{};',switchContext);
 await vm.runInContext('initializeText()',switchContext);await vm.runInContext('initializeText()',switchContext);
 await vm.runInContext('initializeRepair()',switchContext);await vm.runInContext('initializeRepair()',switchContext);
 await vm.runInContext('initializeText()',switchContext);
 assert.deepEqual(events,['create OCR','release-start OCR','release-done OCR','create MI-GAN','release-start MI-GAN','release-done MI-GAN','create OCR']);
 assert.equal(live,1);assert.equal(switchORT.env.wasm.wasmBinary,undefined);
 console.log('PASS: grouped global input masks, per-owner output/alpha/source preservation, tensor disposal, failed-refinement rollback, detection-only response, invalid input and awaited OCR/repair session switches');
})().catch(e=>{console.error(e);process.exitCode=1;});

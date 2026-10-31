// Public runtime/model files only. Image pixels never leave this worker/device.
importScripts('repair-loader.js?v=mobile1','repair-quality.js?v=detail5','repair-regions.js?v=core1','text-detect.js?v=core1','texture-repair.js?v=core1','repair-mask.js?v=edgefix1');
let session=null,textSession=null,runtimeReady=false,resource=null,phase='initialize';
const textAsset={path:'models/text-det.onnx',name:'文字识别资源',size:4745517,hash:'d2a7720d45a54257208b1e13e36a8479894cb74155a5efe29462512d42f49da9'};
const textMirror='https://gcore.jsdelivr.net/gh/nijianguo2021/clean-image@60263c21bee0dd51b550495a10282835ff120e55/public/';
const report=progress=>self.postMessage({progress});
async function initializeRuntime(){
 if(runtimeReady)return;
 phase='initialize';
 if(typeof WebAssembly!=='object')throw new RepairError('compatibility','当前浏览器不支持图片处理，请用更新后的系统浏览器打开。');
 const appleMobile=/iPhone|iPad|iPod/.test(navigator.userAgent)||(/Mac/.test(navigator.platform)&&navigator.maxTouchPoints>1);
 resource=createResourceLoader({baseURL:self.location.href,preferMirror:appleMobile,report});
 await Promise.all([resource(ASSETS.script),resource(ASSETS.module),resource(ASSETS.unpack)]);
 importScripts(resource.urlFor(ASSETS.script),resource.urlFor(ASSETS.unpack));
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
 ort.env.wasm.wasmPaths={mjs:resource.urlFor(ASSETS.module)};
 ort.env.wasm.wasmBinary=await loadBinary(resource,'wasm');
 runtimeReady=true;
}
async function initializeRepair(){
 if(session)return session;
 await initializeRuntime();phase='initialize';
 if(textSession){await textSession.release();textSession=null;}
 const model=await loadBinary(resource,'model');
 report('资源已就绪，正在启动修复组件…');
 try{return session=await deadline(ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'}),90000,'启动修复组件超过 90 秒，请重试。');}
 finally{ort.env.wasm.wasmBinary=undefined;}
}
async function initializeText(){
 if(textSession)return textSession;
 await initializeRuntime();phase='initialize';
 if(session){await session.release();session=null;}
 const loader=createResourceLoader({baseURL:self.location.href,mirrorBase:textMirror,mirrorFallback:textMirror.replace('gcore.','cdn.'),report});
 const model=await loader(textAsset,{onProgress:n=>report(`正在下载文字识别资源：${Math.floor(n/textAsset.size*100)}%`)});
 report('正在启动文字识别…');
 try{return textSession=await deadline(ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'}),90000,'启动文字识别超过 90 秒，请重试。');}
 finally{ort.env.wasm.wasmBinary=undefined;}
}
self.onmessage=async e=>{try{
 const {pixels,width,height,kind='repair',quality}=e.data;
 const source=new Uint8ClampedArray(pixels);
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>12000000||source.length!==width*height*4)throw new RepairError('selection','图片数据不完整，请重新选择图片。');
 if(kind==='detect'){
  const s=await initializeText();phase='processing';report('正在查找文字和水印位置…');
  const result=await TextDetection.detectTextCandidates(s,ort,{data:source,width,height},{maxSide:960,detailPass:false});
  self.postMessage({detection:{regions:result.regions,runs:result.runs,pixels:result.pixels,skipped:result.skipped||[]}});return;
 }
 phase='selection';
 const mask=new Uint8Array(e.data.mask);
 if(mask.length!==width*height)throw new RepairError('selection','选区数据不完整，请重新涂抹。');
 const plan=planRepairRegions(mask,width,height),count=plan.selectedPixels,detail=quality==='detail';
 if(!count)throw new RepairError('selection','请先涂抹要去掉的文字。');
 if(count>width*height*.25)throw new RepairError('selection','涂抹已超过图片面积的 25%，请分次处理，以保留更多背景参考。');
 const s=await initializeRepair();phase='processing';
 const target=source.slice();
 for(let index=0;index<plan.regions.length;index++){
  const region=plan.regions[index],{x:x0,y:y0,width:w,height:h}=region.rect,n=w*h;
  // MI-GAN's internal 3x3 max-pool + 5x5 blur blends original pixels along
  // the input hole's edge. Hide a 3px guard during inference so old lettering
  // cannot be blended back into the actual selection. Writes stay exact below.
  const image=new Uint8Array(n*3),modelMask=buildInferenceMask(mask,width,height,region.rect,3);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
   const p=y*w+x,q=(y+y0)*width+x+x0;
   for(let c=0;c<3;c++)image[c*n+p]=source[q*4+c];
  }
  report(`正在修复局部 ${index+1}/${plan.regions.length}，请保持页面打开…`);
  const inputs={image:new ort.Tensor('uint8',image,[1,3,h,w]),mask:new ort.Tensor('uint8',modelMask,[1,1,h,w])};let result;
  try{
   result=await s.run(inputs);const output=result[s.outputNames[0]];
   if(output.dims.length!==4||output.dims[1]!==3||output.dims[2]!==h||output.dims[3]!==w)throw Error('输出尺寸异常');
   for(const q of region.indices){const p=(Math.floor(q/width)-y0)*w+q%width-x0;for(let c=0;c<3;c++)target[q*4+c]=output.data[c*n+p];}
  }finally{for(const v of Object.values(inputs))v.dispose?.();for(const v of Object.values(result||{}))v.dispose?.();}
 }
 let textureStats=null,detailSkipped=false;
 if(detail){
  report('正在匹配周围纹理并检查衔接…');
  let before;
  try{
   before=new Uint8Array(count*3);let i=0;
   for(const region of plan.regions)for(const q of region.indices)for(let c=0;c<3;c++)before[i++]=target[q*4+c];
   refineSmoothGaps(target,source,mask,width,height);textureStats=refineTexture(target,source,mask,width,height);
  }catch(_){
   // Optional refinement must never discard a completed model result.
   detailSkipped=true;let i=0;
   if(before)for(const region of plan.regions)for(const q of region.indices)for(let c=0;c<3;c++)target[q*4+c]=before[i++];
  }
 }
 self.postMessage({pixels:target.buffer,stats:{regions:plan.regions.length,texturePixels:textureStats?.acceptedPixels||0,detailSkipped}},[target.buffer]);
 }catch(e){self.postMessage(explainError(e,phase));}};

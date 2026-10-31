// MI-GAN runs on this device. Only model/runtime files are downloaded.
importScripts('repair-loader.js?v=loadfix2');
let session=null,phase='initialize';
async function initialize(){
 if(session)return session;
 phase='initialize';
 if(typeof WebAssembly!=='object')throw new RepairError('compatibility','当前浏览器不支持图片修复，请用更新后的系统浏览器打开。');
 const resource=createResourceLoader({baseURL:self.location.href,report:progress=>self.postMessage({progress})});
 await resource(ASSETS.script);
 importScripts(new URL(ASSETS.script.path+'?asset='+ASSETS.script.hash.slice(0,12),self.location.href).href);
 await resource(ASSETS.module);
 const moduleURL=new URL(ASSETS.module.path+'?asset='+ASSETS.module.hash.slice(0,12),self.location.href).href;
 try{
  ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
  ort.env.wasm.wasmPaths={mjs:moduleURL};
  ort.env.wasm.wasmBinary=await loadBinary(resource,'wasm');
  const model=await loadBinary(resource,'model');
  self.postMessage({progress:'资源已就绪，正在启动修复组件…'});
  session=await ort.InferenceSession.create(model,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
  return session;
 }finally{ort.env.wasm.wasmBinary=undefined;}
}
self.onmessage=async e=>{try{
 phase='selection';
 const {pixels,mask:maskBuffer,width,height}=e.data,source=new Uint8ClampedArray(pixels),mask=new Uint8Array(maskBuffer);
 let x0=width,y0=height,x1=-1,y1=-1,count=0;
 for(let p=0;p<mask.length;p++)if(mask[p]){const x=p%width,y=Math.floor(p/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}
 if(!count)throw new RepairError('selection','请先涂抹要去掉的文字。');
 if(count>width*height*.25)throw new RepairError('selection','涂抹已超过图片面积的 25%，请分次处理，以保留更多背景参考。');
 const s=await initialize();phase='processing';
 x0=Math.max(0,x0-96);y0=Math.max(0,y0-96);x1=Math.min(width-1,x1+96);y1=Math.min(height-1,y1+96);
 const w=x1-x0+1,h=y1-y0+1,n=w*h,image=new Uint8Array(n*3),modelMask=new Uint8Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,q=(y+y0)*width+x+x0;for(let c=0;c<3;c++)image[c*n+p]=source[q*4+c];modelMask[p]=mask[q]?0:255;}
 self.postMessage({progress:'正在补全背景，请保持此页面打开…'});
 const inputs={image:new ort.Tensor('uint8',image,[1,3,h,w]),mask:new ort.Tensor('uint8',modelMask,[1,1,h,w])};let result;
 try{
 result=await s.run(inputs);
 const output=result[s.outputNames[0]];
 if(output.dims.length!==4||output.dims[1]!==3||output.dims[2]!==h||output.dims[3]!==w)throw Error('输出尺寸异常');
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,q=(y+y0)*width+x+x0;if(mask[q])for(let c=0;c<3;c++)source[q*4+c]=output.data[c*n+p];}
 }finally{for(const v of Object.values(inputs))v.dispose?.();for(const v of Object.values(result||{}))v.dispose?.();}
 self.postMessage({pixels:source.buffer},[source.buffer]);
 }catch(e){self.postMessage(explainError(e,phase));}};


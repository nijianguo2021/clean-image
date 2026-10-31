// MI-GAN runs on this device. Only model/runtime files are downloaded.
let session=null;
async function initialize(){
 if(session)return session;
 self.postMessage({progress:'首次加载免费 AI 模型（约 28 MB），图片不会上传…'});
 importScripts('ort/ort.min.js?v=wasm1');
 ort.env.wasm.wasmPaths=new URL('ort/',self.location.href).href;
 ort.env.wasm.numThreads=1;ort.env.wasm.proxy=false;
 session=await ort.InferenceSession.create(new URL('models/migan.onnx',self.location.href).href,{executionProviders:['wasm'],graphOptimizationLevel:'all'});
 return session;
}
self.onmessage=async e=>{try{
 const {pixels,mask:maskBuffer,width,height}=e.data,source=new Uint8ClampedArray(pixels),mask=new Uint8Array(maskBuffer);
 let x0=width,y0=height,x1=-1,y1=-1,count=0;
 for(let p=0;p<mask.length;p++)if(mask[p]){const x=p%width,y=Math.floor(p/width);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);count++;}
 if(!count)throw Error('请先涂抹要去掉的文字');if(count>width*height*.25)throw Error('选区太大，请分次处理，以保留更多背景参考');
 x0=Math.max(0,x0-96);y0=Math.max(0,y0-96);x1=Math.min(width-1,x1+96);y1=Math.min(height-1,y1+96);
 const w=x1-x0+1,h=y1-y0+1,n=w*h,image=new Uint8Array(n*3),modelMask=new Uint8Array(n);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,q=(y+y0)*width+x+x0;for(let c=0;c<3;c++)image[c*n+p]=source[q*4+c];modelMask[p]=mask[q]?0:255;}
 const s=await initialize();self.postMessage({progress:'AI 正在本机补全背景，首次运行可能较慢…'});
 const result=await s.run({image:new ort.Tensor('uint8',image,[1,3,h,w]),mask:new ort.Tensor('uint8',modelMask,[1,1,h,w])});
 const output=result[s.outputNames[0]];
 if(output.dims.length!==4||output.dims[1]!==3||output.dims[2]!==h||output.dims[3]!==w)throw Error('模型输出尺寸异常，请缩小选区重试');
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const p=y*w+x,q=(y+y0)*width+x+x0;if(mask[q])for(let c=0;c<3;c++)source[q*4+c]=output.data[c*n+p];}
 for(const v of Object.values(result))v.dispose?.();
 self.postMessage({pixels:source.buffer},[source.buffer]);
 }catch(e){self.postMessage({error:'AI 修复未完成：'+(e.message||String(e))+'。可重试或缩小选区。'});}};


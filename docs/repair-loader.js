'use strict';
// Only public application files are downloaded. Images stay on this device.
const ASSETS = {
  unpack: {path:'vendor/fflate.js', size:32665, name:'解压组件', hash:'c3b34f2e9f5e74d4d7d64e01cac7a0c01954c6c406414d42185c7b53d6875ddf', mirror:'https://cdn.jsdelivr.net/npm/fflate@0.8.2/umd/index.js'},
  script: {path:'ort/ort.min.js', size:48327, name:'运行组件', hash:'65e09376df69107e881b5c34d2d37aed333a366b6d941073ec518168e269b87d'},
  module: {path:'ort/ort-wasm-simd-threaded.mjs', size:20856, name:'启动组件', hash:'30dd851d9c00622940500f71ddd2ff8820c5cb65270816080175b958705385a8'},
  wasm: {path:'ort/ort-wasm-simd-threaded.wasm', size:11210254, name:'运行资源', hash:'71aef04959c5c1b6de461b6538e2058e306610034a85aad2742d0c7fd4533fe4'},
  model: {path:'models/migan.onnx', size:28079181, name:'修复资源', hash:'6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b'}
};
const COMPRESSED = {"wasm":{"size":2870739,"parts":[{"path":"resources/wasm-00.bin","size":1048576,"hash":"a46469924c67d6aafcc8218ef0dc0415870ffad4e7a64f2c576eb746affc6176","name":"运行资源 1/3"},{"path":"resources/wasm-01.bin","size":1048576,"hash":"e59da70c484f6a6780ada6e0c16e78406b5c7737907fdcf59ad6f30ef76dda33","name":"运行资源 2/3"},{"path":"resources/wasm-02.bin","size":773587,"hash":"1835ca04b85ebfb0ded2f7e1c1f4076cddbd59164217c4b0b724cc77e814d72e","name":"运行资源 3/3"}]},"model":{"size":24614267,"parts":[{"path":"resources/model-00.bin","size":1048576,"hash":"90499cd5796d1bcc7422aeab0014cf842fbab16a31f8938e9722be6be23cbf34","name":"修复资源 1/24"},{"path":"resources/model-01.bin","size":1048576,"hash":"1c24abd6df7c0c43ba9ee4081551c4161432118a104ba2d7742c920038233d08","name":"修复资源 2/24"},{"path":"resources/model-02.bin","size":1048576,"hash":"c9f5fdcd74709e540f3ac265819199b800d1da09f4fb490968ea1b677018941f","name":"修复资源 3/24"},{"path":"resources/model-03.bin","size":1048576,"hash":"7cfd0ff07e9fb7c046eca44fc5d0701ceafe7b55f744e2009c62afb04e084f8d","name":"修复资源 4/24"},{"path":"resources/model-04.bin","size":1048576,"hash":"84df090200d3980722786caa4072005f265e4b499a56dda8d8c6bf355f5b29fc","name":"修复资源 5/24"},{"path":"resources/model-05.bin","size":1048576,"hash":"767ec6a8ad490967b169d0c7820230e41ed52a0245ba04c9d4826c89c35d06aa","name":"修复资源 6/24"},{"path":"resources/model-06.bin","size":1048576,"hash":"84179c1f19347c87f23d0270cc9f3efaa3073c30f2472a89be396da5d8d514b5","name":"修复资源 7/24"},{"path":"resources/model-07.bin","size":1048576,"hash":"b1565cabdab13f9f4743f3f4690bf30fde7ae44124795c5b56dca26d41689997","name":"修复资源 8/24"},{"path":"resources/model-08.bin","size":1048576,"hash":"511010203800c329051ef1108a543aec7a11ca026630e392fcb361992eda99a8","name":"修复资源 9/24"},{"path":"resources/model-09.bin","size":1048576,"hash":"65702938ccfa93058f59db1bd70f2cee342d83a74266c7babd6651835bbd3a69","name":"修复资源 10/24"},{"path":"resources/model-10.bin","size":1048576,"hash":"e99d7d23c348bd143105c63025139ec354baa44787380d695ff56d6dd99f8375","name":"修复资源 11/24"},{"path":"resources/model-11.bin","size":1048576,"hash":"a3d1d4c1cf10b3891d8dec7ac6b9ee4c4cddbcd8abd2272ce119abeda36a04e6","name":"修复资源 12/24"},{"path":"resources/model-12.bin","size":1048576,"hash":"f9123cab799a6694c4e514398ac19f019f4cc10538dc5f421371888dc97fe0c5","name":"修复资源 13/24"},{"path":"resources/model-13.bin","size":1048576,"hash":"da0591deff4849f45a710cb373ed28a96e6b6aa945e9e52008231ce6546e297c","name":"修复资源 14/24"},{"path":"resources/model-14.bin","size":1048576,"hash":"d92c142ebb32fea72fc6934b15d402a3543376779b944c7052b0cc5e74c60565","name":"修复资源 15/24"},{"path":"resources/model-15.bin","size":1048576,"hash":"407589c204833de49947ebce3be60fb0410bdbf8259ec0bd6cdb3f3dfde457df","name":"修复资源 16/24"},{"path":"resources/model-16.bin","size":1048576,"hash":"59127b2242e964d59d800901f959eb7029897b04f0de62cdfd7032454f2ba095","name":"修复资源 17/24"},{"path":"resources/model-17.bin","size":1048576,"hash":"0545252d2ee466b8d65121ad15477580daa53353ba305eaf64adf8de6cf06d8e","name":"修复资源 18/24"},{"path":"resources/model-18.bin","size":1048576,"hash":"172a7f4dc2f3ee638b86017226aa6ab1fd2e9c2a6ab4cd0e2b2e6b05b91dce3d","name":"修复资源 19/24"},{"path":"resources/model-19.bin","size":1048576,"hash":"8d46d198c8a1538eec6c0e4ac41cd4a76b818d8298575156d50def3a431f4153","name":"修复资源 20/24"},{"path":"resources/model-20.bin","size":1048576,"hash":"a0d137a8e38b373eb38bcc9099d4f0a18aa66632dfa82eab045eee404fbf1b2f","name":"修复资源 21/24"},{"path":"resources/model-21.bin","size":1048576,"hash":"06ccd01dbc1a4e0ca105c22726d11955a3633b1a805c52af038f783db3dda9e8","name":"修复资源 22/24"},{"path":"resources/model-22.bin","size":1048576,"hash":"447aa04ea57757d5a7fc74f303b75738fd0dff3185970bdc5775fc87167544d5","name":"修复资源 23/24"},{"path":"resources/model-23.bin","size":497019,"hash":"c8c6896b7b04856ffc9f35cb92c487efaca9072a09773e6cadcb0bd6bb7df8de","name":"修复资源 24/24"}]}};
async function loadBinary(resource,key,gunzip=globalThis.fflate?.gunzipSync){
 if(!gunzip)throw new RepairError('resource','解压组件未加载，请重试加载。');
 const config=COMPRESSED[key],compressed=new Uint8Array(config.size);
 const loaded=new Uint32Array(config.parts.length),report=resource.report||(()=>{});
 let next=0,finished=0,failed=false;
 const progress=()=>report(`正在下载${ASSETS[key].name}：${Math.min(99,Math.floor(loaded.reduce((a,b)=>a+b,0)/config.size*100))}%（已完成 ${finished}/${config.parts.length} 块）`);
 async function downloadPart(){
  while(!failed&&next<config.parts.length){const i=next++,part=config.parts[i];const bytes=await resource(part,{
   onProgress:n=>{loaded[i]=n;progress();},onStatus:text=>report(text)
  });compressed.set(bytes,i*1048576);loaded[i]=bytes.length;finished++;progress();}
 }
 try{await Promise.all([downloadPart(),downloadPart(),downloadPart()]);}catch(error){failed=true;throw error;}
 report(`${ASSETS[key].name}下载完成，正在解压…`);
 // Pure JS decoding in the worker avoids depending on Safari's streaming decompressor.
 const bytes=gunzip(compressed,{out:new Uint8Array(ASSETS[key].size)});
 report(`正在校验解压后的${ASSETS[key].name}…`);
 await validateAsset(bytes,ASSETS[key]);
 return bytes;
}
class RepairError extends Error {
  constructor(code,message,detail=''){super(message);this.code=code;this.detail=detail;}
}
function explainError(error,phase){
  const detail=error.detail||error.message||String(error);
  if(error instanceof RepairError)return {error:error.message,code:error.code,detail};
  if(/out of memory|memory access|allocation|allocat.*memory|bad_alloc|array buffer|memory\.grow/i.test(detail))
    return {code:'memory',error:'设备可用内存不足。请关闭其他标签页后重试，或换电脑处理。图片和涂抹已保留。',detail};
  if(/SIMD.*not supported|WebAssembly.*not (defined|supported)|unsupported.*WebAssembly|CompileError|import.*not supported/i.test(detail))
    return {code:'compatibility',error:'当前浏览器不支持所需的处理功能。请用更新后的系统浏览器打开；微信里请从菜单选择在浏览器打开。',detail};
  if(/fetch|network|load failed|failed to load|failed to.*import|importing a module|importScripts/i.test(detail))
    return {code:'resource',error:'修复资源加载失败，与选区大小无关。请检查网络后点击“重试加载”，无需重新涂抹。',detail};
  if(phase==='initialize')return {code:'initialize',error:'修复组件未能启动。请重试；若仍失败，请打开下方错误详情。图片和涂抹已保留。',detail};
  return {code:'processing',error:'本次修复未完成，图片和涂抹已保留。可重试，并查看下方错误详情。',detail};
}
function deadline(promise,ms,message){
 let timer;return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error(message)),ms);})]).finally(()=>clearTimeout(timer));
}
async function validateAsset(bytes,asset,cryptoAPI=globalThis.crypto){
    if(bytes.byteLength!==asset.size)throw Error(`${asset.name}下载不完整：${bytes.byteLength}/${asset.size}`);
    if(!cryptoAPI?.subtle)throw new RepairError('compatibility','资源校验不可用，请在系统浏览器中用 HTTPS 链接打开。');
      const digest=await deadline(cryptoAPI.subtle.digest('SHA-256',bytes),10000,'资源校验超时');
      const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      if(hash!==asset.hash)throw Error(`${asset.name}校验失败`);
    return bytes;
}
const RESOURCE_MIRROR='https://gcore.jsdelivr.net/gh/nijianguo2021/clean-image@820cbe054957ba8a1a026c41020e049ce2ae6e97/public/';
function createResourceLoader({baseURL,fetcher=fetch,cacheStorage=globalThis.caches,cryptoAPI=globalThis.crypto,report=()=>{},stallMs=10000,totalMs=30000,cacheMs=1200,mirrorBase=RESOURCE_MIRROR,mirrorFallback=mirrorBase===RESOURCE_MIRROR?RESOURCE_MIRROR.replace('gcore.','cdn.'):null,preferMirror=false}){
  let cachePromise,preferred=preferMirror?1:0;
  const resolved=new Map();
  const cache=()=>cachePromise??=deadline(Promise.resolve().then(()=>cacheStorage?.open('clean-image-resources-v1')),cacheMs,'缓存打开超时').catch(()=>null);
  const originURL=asset=>new URL(asset.path+'?asset='+asset.hash.slice(0,12),baseURL).href;
  const sources=asset=>[originURL(asset),...[mirrorBase,mirrorFallback].filter(Boolean).map(base=>new URL(asset.mirror?new URL(asset.mirror).pathname:asset.path,base).href)];
  const resource=async (asset,{onProgress=()=>{},onStatus=report}={})=>{
    const url=originURL(asset),urls=sources(asset),store=await cache();
    try{
      const saved=await deadline(Promise.resolve().then(()=>store?.match(url)),cacheMs,'缓存读取超时');
      if(saved){const bytes=await validateAsset(new Uint8Array(await deadline(saved.arrayBuffer(),cacheMs,'缓存读取超时')),asset,cryptoAPI);const savedURL=saved.headers?.get('X-Resource-Source');if(urls.includes(savedURL)){resolved.set(asset.path,savedURL);preferred=urls.indexOf(savedURL);}onProgress(bytes.length);onStatus(`已读取${asset.name}`);return bytes;}
    }catch{Promise.resolve().then(()=>store?.delete(url)).catch(()=>{});}
    let lastError;const first=preferred,failures=[];
    for(let attempt=0;attempt<3;attempt++){
      const index=(first+attempt)%urls.length,requestURL=urls[index];
      const controller=new AbortController();let timer,totalTimer,reader,rejectTimeout;
      const timedOut=new Promise((_,reject)=>{rejectTimeout=reject;});
      const abort=()=>{rejectTimeout(Error('下载超时'));controller.abort();};
      const resetTimer=()=>{clearTimeout(timer);timer=setTimeout(abort,stallMs);};
      try{
        onProgress(0);onStatus(`${attempt?'连接较慢，切换线路重试：':'正在下载'}${asset.name}（线路 ${index+1}）…`);
        resetTimer();totalTimer=setTimeout(abort,totalMs);
        const bytes=await Promise.race([(async()=>{
        const response=await fetcher(requestURL,{signal:controller.signal,cache:attempt?'reload':'default',credentials:'omit'});
        if(!response.ok)throw Error(`HTTP ${response.status} (${asset.path})`);
        let bytes;
        if(response.body?.getReader){
          reader=response.body.getReader();bytes=new Uint8Array(asset.size);let loaded=0,lastUpdate=0;
          while(true){
            const {done,value}=await reader.read();if(done)break;
            if(controller.signal.aborted)throw Error('下载已取消');
            resetTimer();if(loaded+value.length>asset.size)throw Error(`${asset.name}文件大小异常`);
            bytes.set(value,loaded);loaded+=value.length;
            if(Date.now()-lastUpdate>250){onProgress(loaded);lastUpdate=Date.now();}
          }
          if(loaded!==asset.size)throw Error(`${asset.name}下载中断：${loaded}/${asset.size}`);
        }else bytes=new Uint8Array(await response.arrayBuffer());
        return bytes;
        })(),timedOut]);
        clearTimeout(timer);clearTimeout(totalTimer);
        onStatus(`正在校验${asset.name}…`);await validateAsset(bytes,asset,cryptoAPI);
        preferred=index;resolved.set(asset.path,requestURL);onProgress(bytes.length);
        // Cache hangs/quota errors must not hold up repair. Keep each wait bounded.
        try{if(store)await deadline(Promise.resolve().then(()=>store.put(url,new Response(bytes,{headers:{'X-Resource-Source':requestURL}}))),cacheMs,'缓存保存超时');}catch{}
        return bytes;
      }catch(error){lastError=error;failures.push(`线路 ${index+1}: ${error.message||error}`);controller.abort();Promise.resolve().then(()=>reader?.cancel()).catch(()=>{});}
      finally{clearTimeout(timer);clearTimeout(totalTimer);}
    }
    throw new RepairError('resource',`${asset.name}加载失败，已自动重试 2 次。与选区大小无关；请检查网络后点击“重试加载”，无需重新涂抹。`,`${asset.path}: ${lastError?.message||lastError}\n${failures.join('\n')}`);
  };
  resource.urlFor=asset=>resolved.get(asset.path)||sources(asset)[Math.min(preferred,sources(asset).length-1)];
  resource.report=report;
  return resource;
}
if(typeof module!=='undefined')module.exports={ASSETS,COMPRESSED,loadBinary,RepairError,explainError,createResourceLoader};

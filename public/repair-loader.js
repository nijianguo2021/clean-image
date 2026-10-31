'use strict';
// Only public application files are downloaded. Images stay on this device.
const ASSETS = {
  script: {path:'ort/ort.min.js', size:48327, name:'运行组件', hash:'65e09376df69107e881b5c34d2d37aed333a366b6d941073ec518168e269b87d'},
  module: {path:'ort/ort-wasm-simd-threaded.mjs', size:20856, name:'启动组件', hash:'30dd851d9c00622940500f71ddd2ff8820c5cb65270816080175b958705385a8'},
  wasm: {path:'ort/ort-wasm-simd-threaded.wasm', size:11210254, name:'运行资源', hash:'71aef04959c5c1b6de461b6538e2058e306610034a85aad2742d0c7fd4533fe4'},
  model: {path:'models/migan.onnx', size:28079181, name:'修复资源', hash:'6f1f3530a1a2324b19752018ce756088b07973cda8d7d890034ace5c8a48c40b'}
};
const COMPRESSED = {"wasm":{"size":2870739,"parts":[{"path":"resources/wasm-00.bin","size":1048576,"hash":"a46469924c67d6aafcc8218ef0dc0415870ffad4e7a64f2c576eb746affc6176","name":"运行资源 1/3"},{"path":"resources/wasm-01.bin","size":1048576,"hash":"e59da70c484f6a6780ada6e0c16e78406b5c7737907fdcf59ad6f30ef76dda33","name":"运行资源 2/3"},{"path":"resources/wasm-02.bin","size":773587,"hash":"1835ca04b85ebfb0ded2f7e1c1f4076cddbd59164217c4b0b724cc77e814d72e","name":"运行资源 3/3"}]},"model":{"size":24614267,"parts":[{"path":"resources/model-00.bin","size":1048576,"hash":"90499cd5796d1bcc7422aeab0014cf842fbab16a31f8938e9722be6be23cbf34","name":"修复资源 1/24"},{"path":"resources/model-01.bin","size":1048576,"hash":"1c24abd6df7c0c43ba9ee4081551c4161432118a104ba2d7742c920038233d08","name":"修复资源 2/24"},{"path":"resources/model-02.bin","size":1048576,"hash":"c9f5fdcd74709e540f3ac265819199b800d1da09f4fb490968ea1b677018941f","name":"修复资源 3/24"},{"path":"resources/model-03.bin","size":1048576,"hash":"7cfd0ff07e9fb7c046eca44fc5d0701ceafe7b55f744e2009c62afb04e084f8d","name":"修复资源 4/24"},{"path":"resources/model-04.bin","size":1048576,"hash":"84df090200d3980722786caa4072005f265e4b499a56dda8d8c6bf355f5b29fc","name":"修复资源 5/24"},{"path":"resources/model-05.bin","size":1048576,"hash":"767ec6a8ad490967b169d0c7820230e41ed52a0245ba04c9d4826c89c35d06aa","name":"修复资源 6/24"},{"path":"resources/model-06.bin","size":1048576,"hash":"84179c1f19347c87f23d0270cc9f3efaa3073c30f2472a89be396da5d8d514b5","name":"修复资源 7/24"},{"path":"resources/model-07.bin","size":1048576,"hash":"b1565cabdab13f9f4743f3f4690bf30fde7ae44124795c5b56dca26d41689997","name":"修复资源 8/24"},{"path":"resources/model-08.bin","size":1048576,"hash":"511010203800c329051ef1108a543aec7a11ca026630e392fcb361992eda99a8","name":"修复资源 9/24"},{"path":"resources/model-09.bin","size":1048576,"hash":"65702938ccfa93058f59db1bd70f2cee342d83a74266c7babd6651835bbd3a69","name":"修复资源 10/24"},{"path":"resources/model-10.bin","size":1048576,"hash":"e99d7d23c348bd143105c63025139ec354baa44787380d695ff56d6dd99f8375","name":"修复资源 11/24"},{"path":"resources/model-11.bin","size":1048576,"hash":"a3d1d4c1cf10b3891d8dec7ac6b9ee4c4cddbcd8abd2272ce119abeda36a04e6","name":"修复资源 12/24"},{"path":"resources/model-12.bin","size":1048576,"hash":"f9123cab799a6694c4e514398ac19f019f4cc10538dc5f421371888dc97fe0c5","name":"修复资源 13/24"},{"path":"resources/model-13.bin","size":1048576,"hash":"da0591deff4849f45a710cb373ed28a96e6b6aa945e9e52008231ce6546e297c","name":"修复资源 14/24"},{"path":"resources/model-14.bin","size":1048576,"hash":"d92c142ebb32fea72fc6934b15d402a3543376779b944c7052b0cc5e74c60565","name":"修复资源 15/24"},{"path":"resources/model-15.bin","size":1048576,"hash":"407589c204833de49947ebce3be60fb0410bdbf8259ec0bd6cdb3f3dfde457df","name":"修复资源 16/24"},{"path":"resources/model-16.bin","size":1048576,"hash":"59127b2242e964d59d800901f959eb7029897b04f0de62cdfd7032454f2ba095","name":"修复资源 17/24"},{"path":"resources/model-17.bin","size":1048576,"hash":"0545252d2ee466b8d65121ad15477580daa53353ba305eaf64adf8de6cf06d8e","name":"修复资源 18/24"},{"path":"resources/model-18.bin","size":1048576,"hash":"172a7f4dc2f3ee638b86017226aa6ab1fd2e9c2a6ab4cd0e2b2e6b05b91dce3d","name":"修复资源 19/24"},{"path":"resources/model-19.bin","size":1048576,"hash":"8d46d198c8a1538eec6c0e4ac41cd4a76b818d8298575156d50def3a431f4153","name":"修复资源 20/24"},{"path":"resources/model-20.bin","size":1048576,"hash":"a0d137a8e38b373eb38bcc9099d4f0a18aa66632dfa82eab045eee404fbf1b2f","name":"修复资源 21/24"},{"path":"resources/model-21.bin","size":1048576,"hash":"06ccd01dbc1a4e0ca105c22726d11955a3633b1a805c52af038f783db3dda9e8","name":"修复资源 22/24"},{"path":"resources/model-22.bin","size":1048576,"hash":"447aa04ea57757d5a7fc74f303b75738fd0dff3185970bdc5775fc87167544d5","name":"修复资源 23/24"},{"path":"resources/model-23.bin","size":497019,"hash":"c8c6896b7b04856ffc9f35cb92c487efaca9072a09773e6cadcb0bd6bb7df8de","name":"修复资源 24/24"}]}};
async function loadBinary(resource,key){
 if(typeof DecompressionStream==='undefined')return resource(ASSETS[key]);
 const config=COMPRESSED[key],compressed=new Uint8Array(config.size);
 let next=0;
 async function downloadPart(){
  while(next<config.parts.length){const i=next++,part=config.parts[i];const bytes=await resource(part);compressed.set(bytes,i*1048576);}
 }
 await Promise.all([downloadPart(),downloadPart(),downloadPart()]);
 const bytes=new Uint8Array(await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());
 if(bytes.length!==ASSETS[key].size)throw new RepairError('resource','修复资源解压不完整，请重试加载。');
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
function createResourceLoader({baseURL,fetcher=fetch,cacheStorage=globalThis.caches,cryptoAPI=globalThis.crypto,report=()=>{},stallMs=45000}){
  let cachePromise;
  const cache=()=>cachePromise??=(async()=>{try{return await cacheStorage?.open('clean-image-resources-v1');}catch{return null;}})();
  async function validate(bytes,asset){
    if(bytes.byteLength!==asset.size)throw Error(`${asset.name}下载不完整：${bytes.byteLength}/${asset.size}`);
    if(cryptoAPI?.subtle){
      const digest=await cryptoAPI.subtle.digest('SHA-256',bytes);
      const hash=Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('');
      if(hash!==asset.hash)throw Error(`${asset.name}校验失败`);
    }
    return bytes;
  }
  return async asset=>{
    const url=new URL(asset.path+'?asset='+asset.hash.slice(0,12),baseURL).href,store=await cache();
    try{const saved=await store?.match(url);if(saved){const bytes=await validate(new Uint8Array(await saved.arrayBuffer()),asset);report(`已读取${asset.name}`);return bytes;}}catch{try{await store?.delete(url);}catch{}}
    let lastError;
    for(let attempt=0;attempt<3;attempt++){
      const controller=new AbortController();let timer,reader;
      const resetTimer=()=>{clearTimeout(timer);timer=setTimeout(()=>controller.abort(),stallMs);};
      try{
        report(`${attempt?'连接中断，自动重试 '+attempt+'/2：':'正在加载'}${asset.name}…`);resetTimer();
        const response=await fetcher(url,{signal:controller.signal,cache:attempt?'reload':'default',credentials:'omit'});
        if(!response.ok)throw Error(`HTTP ${response.status} (${asset.path})`);
        let bytes;
        if(response.body?.getReader){
          reader=response.body.getReader();bytes=new Uint8Array(asset.size);let loaded=0,lastUpdate=0;
          while(true){
            const {done,value}=await reader.read();if(done)break;
            resetTimer();if(loaded+value.length>asset.size)throw Error(`${asset.name}文件大小异常`);
            bytes.set(value,loaded);loaded+=value.length;
            if(Date.now()-lastUpdate>250){report(`正在加载${asset.name}：${Math.floor(loaded/asset.size*100)}%（${(loaded/1048576).toFixed(1)} / ${(asset.size/1048576).toFixed(1)} MB）`);lastUpdate=Date.now();}
          }
          if(loaded!==asset.size)throw Error(`${asset.name}下载中断：${loaded}/${asset.size}`);
        }else bytes=new Uint8Array(await response.arrayBuffer());
        clearTimeout(timer);await validate(bytes,asset);
        try{await store?.put(url,new Response(bytes));}catch{} // Cache restrictions must not prevent processing.
        return bytes;
      }catch(error){lastError=error;controller.abort();try{await reader?.cancel();}catch{}}
      finally{clearTimeout(timer);}
    }
    throw new RepairError('resource',`${asset.name}加载失败，已自动重试 2 次。与选区大小无关；请检查网络后点击“重试加载”，无需重新涂抹。`,`${asset.path}: ${lastError?.message||lastError}`);
  };
}
if(typeof module!=='undefined')module.exports={ASSETS,COMPRESSED,loadBinary,RepairError,explainError,createResourceLoader};

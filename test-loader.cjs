const assert=require('node:assert/strict');
const {webcrypto,createHash}=require('node:crypto');
const {readFileSync}=require('node:fs');
const {ASSETS,COMPRESSED,loadBinary,RepairError,explainError,createResourceLoader}=require('./public/repair-loader.js');
const bytes=new Uint8Array([1,2,3,4]),asset={path:'test.bin',name:'测试资源',size:4,hash:createHash('sha256').update(bytes).digest('hex')};
const base={baseURL:'https://example.test/site/',cryptoAPI:webcrypto,cacheStorage:null};
(async()=>{
  let calls=0;
  const flaky=createResourceLoader({...base,fetcher:async()=>{calls++;if(calls===1)throw TypeError('Load failed');if(calls===2)return new Response(new Uint8Array([1]));return new Response(bytes);}});
  assert.deepEqual(await flaky(asset),bytes);assert.equal(calls,3);
  calls=0;const offline=createResourceLoader({...base,fetcher:async()=>{calls++;throw TypeError('Load failed');}});
  await assert.rejects(()=>offline(asset),e=>e.code==='resource'&&!e.message.includes('缩小'));assert.equal(calls,3);
  const bad=createResourceLoader({...base,fetcher:async()=>new Response(new Uint8Array([4,3,2,1]))});
  await assert.rejects(()=>bad(asset),e=>e.code==='resource'&&e.detail.includes('校验失败'));
  const data=new Map();let downloads=0;
  const cacheStorage={open:async()=>({match:async key=>data.get(key)?.clone(),put:async(key,value)=>data.set(key,value),delete:async key=>data.delete(key)})};
  const cached=createResourceLoader({...base,cacheStorage,fetcher:async()=>{downloads++;return new Response(bytes);}});
  await cached(asset);await cached(asset);assert.equal(downloads,1);
  for(const key of data.keys())data.set(key,new Response(new Uint8Array([9,9,9,9])));
  await cached(asset);assert.equal(downloads,2);
  const blockedStorage=createResourceLoader({...base,cacheStorage:{open:async()=>{throw Error('denied');}},fetcher:async()=>new Response(bytes)});
  assert.deepEqual(await blockedStorage(asset),bytes);
  const timeout=createResourceLoader({...base,stallMs:5,fetcher:(_,opts)=>new Promise((_,reject)=>opts.signal.addEventListener('abort',()=>reject(Error('Aborted'))))});
  await assert.rejects(()=>timeout(asset),e=>e.code==='resource');
  assert.equal(explainError(TypeError('Load failed'),'initialize').code,'resource');
  assert.equal(explainError(Error('WebAssembly SIMD is not supported'),'initialize').code,'compatibility');
  assert.equal(explainError(Error('memory access out of bounds'),'processing').code,'memory');
  assert.equal(explainError(new RepairError('selection','25%'),'selection').code,'selection');
  for(const item of [...Object.values(ASSETS),...Object.values(COMPRESSED).flatMap(v=>v.parts)]){const file=readFileSync(__dirname+'/public/'+item.path);assert.equal(file.length,item.size);assert.equal(createHash('sha256').update(file).digest('hex'),item.hash);}
  for(const key of ['wasm','model']){const expanded=await loadBinary(async a=>readFileSync(__dirname+'/public/'+a.path),key);assert.equal(createHash('sha256').update(expanded).digest('hex'),ASSETS[key].hash);}
  console.log('PASS: interrupted/truncated download recovery; exhausted retry; timeout; integrity; cache hit/corruption/blocked storage; error categories; real asset integrity');
})().catch(e=>{console.error(e);process.exitCode=1;});

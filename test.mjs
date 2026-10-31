import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import handler,{extractURL,parsePage} from './netlify/functions/media.mjs';
const require=createRequire(import.meta.url),{inpaint}=require('./public/inpaint-worker.js');
const w=40,h=30,pixels=new Uint8ClampedArray(w*h*4),mask=new Uint8Array(w*h);
for(let p=0;p<w*h;p++){pixels.set([80,140,180,255],p*4);if(p%w>15&&p%w<20&&Math.floor(p/w)>10&&Math.floor(p/w)<15){mask[p]=1;pixels.set([255,255,255,255],p*4);}}
const before=pixels.slice(),result=inpaint(pixels,mask,w,h);for(let p=0;p<w*h;p++){assert.deepEqual([...result.slice(p*4,p*4+4)],mask[p]?[80,140,180,255]:[...before.slice(p*4,p*4+4)]);}
assert.throws(()=>inpaint(pixels,new Uint8Array(w*h),w,h),/涂抹/);assert.throws(()=>inpaint(pixels,new Uint8Array(w*h).fill(1),w,h),/20%/);
assert.equal(extractURL('分享 https://xhslink.com/a/test，复制打开'),'https://xhslink.com/a/test');
assert.throws(()=>extractURL('https://xiaohongshu.com.evil.test/a'));
const wrap=note=>'<script>window.__INITIAL_STATE__='+JSON.stringify({note:{noteDetailMap:{abc:{note}}}})+'</script>';
const img=parsePage(wrap({type:'normal',imageList:[{infoList:[{imageScene:'WB_DFT',url:'https://sns-webpic-qc.xhscdn.com/example'}]}]}),'https://www.xiaohongshu.com/explore/abc');assert.equal(img.items[0].kind,'image');assert.equal(img.watermarkFreeVerified,false);
const video=parsePage(wrap({type:'video',video:{media:{stream:{h264:[{masterUrl:'https://sns-video-bd.xhscdn.com/example.mp4'}]}}}}),'https://www.xiaohongshu.com/explore/abc');assert.equal(video.items[0].kind,'video');
assert.throws(()=>parsePage(wrap({imageList:[{url:'https://127.0.0.1/private'}]}),'https://www.xiaohongshu.com/explore/abc'),/未找到/);
assert.throws(()=>parsePage('<h1>请登录</h1>','https://www.xiaohongshu.com/explore/abc'),/登录/);
assert.equal((await handler(new Request('https://site.test/.netlify/functions/media?health=1'))).status,200);
console.log('PASS: actual inpaint on flat area; untouched pixels exact; empty/oversize mask rejection; image/video fixtures; URL allowlists; login rejection; health. Real platform links not yet verified.');

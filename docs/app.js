'use strict';
const $=id=>document.getElementById(id),canvas=$('image'),overlay=$('mask'),ctx=canvas.getContext('2d'),mctx=overlay.getContext('2d');
let original=null,current=null,strokes=[],drawing=null,worker=null,working=false,comparing=false,downloadURL=null,fileName='图片';
function status(text){$('status').textContent=$('editStatus').textContent=text;}
function clearError(){$('retry').hidden=true;$('errorDetails').hidden=true;$('errorDetails').open=false;$('errorText').textContent='';}
function showError(data){status(data.error);$('errorDetails').hidden=false;$('errorText').textContent=(data.code||'worker')+' · core1\n'+(data.detail||data.error);$('retry').textContent=data.code==='resource'?'重试加载':'重试处理';$('retry').hidden=data.code==='selection'||data.code==='compatibility';}
let workerTimer,lastJob='repair',candidateGroups=[];
function clearCandidates(){candidateGroups=[];$('candidateList').replaceChildren();$('candidatePanel').hidden=true;}
function syncCandidates(){for(const group of candidateGroups)group.input.checked=strokes.includes(group.stroke)&&!group.stroke.disabled;}
function armWorkerTimer(){clearTimeout(workerTimer);workerTimer=setTimeout(()=>{stopWorker();lock(false);showError({code:'timeout',error:'处理长时间没有响应，图片和涂抹已保留。请重试。',detail:'最后阶段：'+$('status').textContent});},120000);}
function stopWorker(){clearTimeout(workerTimer);worker?.terminate();worker=null;}
function lock(value){working=value;for(const id of ['choose','replace','undo','clear','corner','autoDetect','repair','restore','compare','brush','target','quality','retry'])$(id).disabled=value;$('cancel').hidden=!value;overlay.style.pointerEvents=value?'none':'auto';for(const group of candidateGroups)group.input.disabled=value;}
function invalidateDownload(){if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=null;$('downloadLink').replaceChildren();$('download').disabled=true;}
function filterManualSelection(raw,pixels,width,height,mode){
 const selected=new Uint8Array(width*height),candidate=new Uint8Array(selected.length),mask=new Uint8Array(selected.length);
 for(let i=0;i<selected.length;i++)if(raw[i*4+3]){selected[i]=1;const lo=Math.min(pixels[i*4],pixels[i*4+1],pixels[i*4+2]),hi=Math.max(pixels[i*4],pixels[i*4+1],pixels[i*4+2]);if((mode==='light'&&lo>130&&hi-lo<55)||(mode==='dark'&&hi<100&&hi-lo<45))candidate[i]=1;}
 for(let i=0;i<candidate.length;i++)if(candidate[i]){const x=i%width,y=Math.floor(i/width);for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height){const q=yy*width+xx;if(selected[q])mask[q]=1;}}}
 return mask;
}
let selectionScratch=null,selectionContext=null;
function paintSelection(context,s){
 context.globalCompositeOperation=s.erase?'destination-out':'source-over';
 context.strokeStyle=context.fillStyle=s.erase?'rgba(0,0,0,1)':'rgba(235,67,73,.65)';context.lineCap='round';context.lineJoin='round';
 if(s.runs){for(const r of s.runs)context.fillRect(...r);return;}if(s.rect){context.fillRect(...s.rect);return;}
 context.lineWidth=s.size;context.beginPath();context.moveTo(...s.points[0]);for(const p of s.points.slice(1))context.lineTo(...p);if(s.points.length===1)context.lineTo(s.points[0][0]+.01,s.points[0][1]);context.stroke();
}
function filteredStroke(s,mode){
 if(s.filtered?.mode===mode&&s.filtered.pixels===current.data)return s.filtered.runs;
 if(!selectionScratch){selectionScratch=document.createElement('canvas');selectionContext=selectionScratch.getContext('2d');}
 if(selectionScratch.width!==canvas.width)selectionScratch.width=canvas.width;if(selectionScratch.height!==canvas.height)selectionScratch.height=canvas.height;
 selectionContext.clearRect(0,0,canvas.width,canvas.height);paintSelection(selectionContext,s);
 const mask=filterManualSelection(selectionContext.getImageData(0,0,canvas.width,canvas.height).data,current.data,canvas.width,canvas.height,mode),runs=[];
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;){if(!mask[y*canvas.width+x]){x++;continue;}const start=x;while(x<canvas.width&&mask[y*canvas.width+x])x++;runs.push([start,y,x-start,1]);}
 s.filtered={mode,pixels:current.data,runs};return runs;
}
function drawMask(){
 mctx.globalCompositeOperation='source-over';mctx.clearRect(0,0,overlay.width,overlay.height);const mode=$('target').value;
 // Selection operations are chronological: erasing affects old candidates and
 // strokes, while later painting can select those pixels again. Image RGB is untouched.
 for(const s of strokes){
  if(s.disabled)continue;
  if(!s.erase&&!s.automatic&&s!==drawing&&current&&(mode==='light'||mode==='dark'))paintSelection(mctx,{runs:filteredStroke(s,mode)});
  else paintSelection(mctx,s);
 }
 mctx.globalCompositeOperation='source-over';
}
async function load(file){if(!file)return;if(file.size>30*1024*1024){status('单张图片最大 30 MB');return;}if(!/^image\/(jpeg|png|webp)$/.test(file.type)){status('请选择 JPG、PNG 或 WEBP 图片');return;}let bitmap;try{clearError();lock(true);status('正在读取图片…');bitmap=await createImageBitmap(file);if(bitmap.width*bitmap.height>60000000)throw Error('图片像素过多，请先缩小');const scale=Math.min(1,2400/Math.max(bitmap.width,bitmap.height));canvas.width=overlay.width=Math.round(bitmap.width*scale);canvas.height=overlay.height=Math.round(bitmap.height*scale);ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);original=ctx.getImageData(0,0,canvas.width,canvas.height);current=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height);strokes=[];clearCandidates();drawing=null;drawMask();fileName=file.name.replace(/\.[^.]+$/,'');invalidateDownload();comparing=false;overlay.hidden=false;$('compare').textContent='查看原图';$('compare').setAttribute('aria-pressed','false');$('editor').hidden=false;resetGestures();view=null;setMode('draw');resizeView(true);$('imageInfo').textContent=`${file.name} · 输出 ${canvas.width} × ${canvas.height}${scale<1?'（已缩小）':''}`;status('请涂抹水印，再点击“开始修复”。');if(!expanded)$('editor').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){status('读取失败：'+e.message);}finally{bitmap?.close();lock(false);}}
$('choose').onclick=$('replace').onclick=()=>$('file').click();$('file').onchange=e=>{load(e.target.files[0]);e.target.value='';};
$('brush').oninput=()=>{$('brushValue').textContent=$('brush').value;};
$('target').onchange=()=>drawMask();
const viewport=$('canvasViewport'),frame=$('canvasWrap'),zoomMath=ImageZoom;
let view=null,expanded=false,editMode='draw',savedScroll=0,savedBodyStyle='',focusBeforeExpand=null;
let pointers=new Map(),pinch=null,pan=null,suppressStroke=false,drawingPointer=null;
function renderView(){if(!view)return;frame.style.width=canvas.width+'px';frame.style.height=canvas.height+'px';frame.style.transform=`translate(${view.x}px,${view.y}px) scale(${view.base*view.zoom})`;$('zoomValue').value=Math.round(view.zoom*100)+'%';$('zoomOut').disabled=view.zoom<=1;$('zoomIn').disabled=view.zoom>=8;}
function resizeView(reset=false){if(!current||!viewport.clientWidth||!viewport.clientHeight)return;const next=zoomMath.fit(viewport.clientWidth,viewport.clientHeight,canvas.width,canvas.height);if(view&&!reset){const center=zoomMath.point(view,view.width/2,view.height/2);next.zoom=view.zoom;next.x=next.width/2-center[0]*next.base*next.zoom;next.y=next.height/2-center[1]*next.base*next.zoom;}view=zoomMath.constrain(next);renderView();}
function discardDrawing(){if(drawing){const index=strokes.indexOf(drawing);if(index!==-1)strokes.splice(index,1);drawing=null;drawingPointer=null;drawMask();}}
function resetGestures(){discardDrawing();for(const id of pointers.keys())if(viewport.hasPointerCapture(id))viewport.releasePointerCapture(id);pointers.clear();pinch=null;pan=null;suppressStroke=false;}
function setMode(mode){resetGestures();editMode=mode;viewport.classList.toggle('pan-mode',mode==='pan');viewport.classList.toggle('erase-mode',mode==='erase');for(const [id,value] of [['drawMode','draw'],['eraseMode','erase'],['panMode','pan']]){$(id).classList.toggle('active',mode===value);$(id).setAttribute('aria-pressed',String(mode===value));}}
function localPoint(e){const rect=viewport.getBoundingClientRect();return [e.clientX-rect.left,e.clientY-rect.top];}
function imagePoint(p){const result=zoomMath.point(view,p[0],p[1]);return [zoomMath.clamp(result[0],0,canvas.width),zoomMath.clamp(result[1],0,canvas.height)];}
function setZoom(zoom,x,y){resetGestures();if(view){view=zoomMath.zoomAt(view,zoom,x,y);renderView();}}
function setExpanded(value){if(!current||expanded===value)return;resetGestures();expanded=value;const editor=$('editor');editor.classList.toggle('is-expanded',value);$('expand').hidden=value;$('closeZoom').hidden=!value;$('editStatus').hidden=!value;$('expand').setAttribute('aria-expanded',String(value));if(value){savedScroll=window.scrollY;savedBodyStyle=document.body.getAttribute('style')||'';focusBeforeExpand=document.activeElement;document.body.style.position='fixed';document.body.style.top=-savedScroll+'px';document.body.style.width='100%';editor.setAttribute('role','dialog');editor.setAttribute('aria-modal','true');$('closeZoom').focus();}else{document.body.setAttribute('style',savedBodyStyle);editor.removeAttribute('role');editor.removeAttribute('aria-modal');window.scrollTo(0,savedScroll);focusBeforeExpand?.focus({preventScroll:true});}resizeView(true);}
$('expand').onclick=()=>setExpanded(true);$('closeZoom').onclick=()=>setExpanded(false);
$('drawMode').onclick=()=>setMode('draw');$('eraseMode').onclick=()=>setMode('erase');$('panMode').onclick=()=>setMode('pan');
function runWorkerJob(kind,payload,transfers,done){
 lastJob=kind;clearError();lock(true);armWorkerTimer();
 try{
  worker??=new Worker('ai-worker.js?v=core1');
  worker.onmessage=e=>{
   if(e.data.progress){status(e.data.progress);armWorkerTimer();return;}
   clearTimeout(workerTimer);lock(false);
   if(e.data.error){showError(e.data);stopWorker();return;}
   try{done(e.data);}catch(error){showError({code:'processing',error:'处理结果未能显示，图片与选区已保留。',detail:error.message});}
  };
  worker.onerror=e=>{stopWorker();lock(false);showError({code:'worker',error:'处理组件意外停止，图片和选区已保留，请重试。',detail:e.message||'浏览器未提供原因'});};
  worker.postMessage({kind,...payload},transfers);
 }catch(error){stopWorker();lock(false);showError({code:'worker',error:'无法启动处理，请用系统浏览器打开后重试。',detail:error.message});}
}
function applyDetection(result){
 if(!result||!result.regions?.length){status('暂未找到能可靠选出笔画的水印。可放大后手动涂抹；浅色或深色文字可选择对应修补对象。');return;}
 comparing=false;overlay.hidden=false;ctx.putImageData(current,0,0);$('compare').textContent='查看原图';$('compare').setAttribute('aria-pressed','false');
 // Replace earlier automatic candidates, while preserving all manual selections.
 strokes=strokes.filter(s=>!s.candidate);clearCandidates();
 for(const [index,region] of result.regions.entries()){
  const stroke={runs:region.runs||result.runs,automatic:true,candidate:true};strokes.push(stroke);
  const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.checked=true;
  const position=region.y>canvas.height*.65?'下方':region.y<canvas.height*.25?'上方':region.x<canvas.width/2?'左侧':'右侧';
  const name=position+(region.kind==='badge'?'标志':'文字')+'候选 '+(index+1);
  input.setAttribute('aria-label',name);
  const text=document.createElement('span');text.textContent=name;label.append(input,text);$('candidateList').append(label);
  input.onchange=()=>{if(working)return;stroke.disabled=!input.checked;if(input.checked&&!strokes.includes(stroke))strokes.push(stroke);drawMask();};
  candidateGroups.push({stroke,input});
 }
 $('candidatePanel').hidden=false;drawMask();setMode('draw');
 if(view){const r=result.regions[0];view=zoomMath.constrain({...view,x:view.width/2-(r.x+r.width/2)*view.base*view.zoom,y:view.height/2-(r.y+r.height/2)*view.base*view.zoom});renderView();}
 const skipped=Array.isArray(result.skipped)?result.skipped.length:0;
 status('识别到 '+result.regions.length+' 处水印候选。请核对红色选区，取消不是水印的项目。'+(skipped?'另有 '+skipped+' 处边界不确定，需要手动补涂。':''));
}
$('autoDetect').onclick=()=>{
 if(!current||working)return;resetGestures();const pixels=current.data.slice();status('正在准备文字识别…');
 runWorkerJob('detect',{pixels:pixels.buffer,width:canvas.width,height:canvas.height},[pixels.buffer],data=>applyDetection(data.detection));
};
$('zoomIn').onclick=()=>setZoom(view.zoom*1.5);$('zoomOut').onclick=()=>setZoom(view.zoom/1.5);$('zoomFit').onclick=()=>{resetGestures();resizeView(true);};
new ResizeObserver(()=>resizeView()).observe(viewport);
viewport.addEventListener('wheel',e=>{if(!view||(!expanded&&!e.ctrlKey&&!e.metaKey))return;e.preventDefault();const p=localPoint(e);setZoom(view.zoom*Math.exp(-e.deltaY*.002),...p);},{passive:false});
viewport.addEventListener('pointerdown',e=>{if(!current||!view||e.button!==0)return;e.preventDefault();viewport.setPointerCapture(e.pointerId);const p=localPoint(e);pointers.set(e.pointerId,p);if(pointers.size>=2){discardDrawing();pan=null;suppressStroke=true;const pair=[...pointers.values()];pinch={view:{...view},a:pair[0],b:pair[1]};return;}if(editMode==='pan'||comparing||working){pan={point:p,view:{...view}};return;}const q=zoomMath.point(view,...p);if(q[0]<0||q[1]<0||q[0]>canvas.width||q[1]>canvas.height)return;drawing={size:Number($('brush').value)/(view.base*view.zoom),points:[q],erase:editMode==='erase'};drawingPointer=e.pointerId;strokes.push(drawing);drawMask();});
viewport.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!view)return;e.preventDefault();const p=localPoint(e);pointers.set(e.pointerId,p);if(pointers.size>=2&&pinch){const pair=[...pointers.values()];view=zoomMath.gesture(pinch.view,pinch.a,pinch.b,pair[0],pair[1]);renderView();return;}if(suppressStroke)return;if(pan){view=zoomMath.constrain({...pan.view,x:pan.view.x+p[0]-pan.point[0],y:pan.view.y+p[1]-pan.point[1]});renderView();return;}if(drawing&&drawingPointer===e.pointerId){drawing.points.push(imagePoint(p));drawMask();}});
function endPointer(e){if(!pointers.has(e.pointerId))return;if(e.type==='pointercancel')discardDrawing();else if(drawingPointer===e.pointerId){drawing=null;drawingPointer=null;drawMask();}pointers.delete(e.pointerId);if(viewport.hasPointerCapture(e.pointerId))viewport.releasePointerCapture(e.pointerId);if(pointers.size<2)pinch=null;else{const pair=[...pointers.values()];pinch={view:{...view},a:pair[0],b:pair[1]};}pan=null;if(!pointers.size)suppressStroke=false;}
viewport.addEventListener('pointerup',endPointer);viewport.addEventListener('pointercancel',endPointer);
viewport.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))endPointer({...e,pointerId:e.pointerId,type:'pointercancel'});});
document.addEventListener('keydown',e=>{if(!expanded)return;if(e.key==='Escape'){e.preventDefault();setExpanded(false);}else if(e.key==='Tab'){const controls=[...$('editor').querySelectorAll('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]')].filter(el=>el.getClientRects().length);if(!controls.length)return;const first=controls[0],last=controls[controls.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}});
$('undo').onclick=()=>{strokes.pop();syncCandidates();drawMask();};$('clear').onclick=()=>{strokes=[];syncCandidates();drawMask();};$('corner').onclick=()=>{if(!current)return;const runs=[],data=current.data;for(let y=Math.floor(canvas.height*.94);y<canvas.height;y++)for(let x=Math.floor(canvas.width*.7);x<canvas.width;x++){const i=(y*canvas.width+x)*4,lo=Math.min(data[i],data[i+1],data[i+2]),hi=Math.max(data[i],data[i+1],data[i+2]);if(lo>130&&hi-lo<45)runs.push([x-2,y-2,5,5]);}if(!runs.length){status('没有识别到右下角浅色水印，请手动涂抹。');return;}strokes.push({runs,automatic:true});drawMask();status('已选择右下角浅色文字候选，请核对红色区域；误选可撤销后手动涂抹。');};
$('compare').onclick=()=>{if(!current)return;comparing=!comparing;ctx.putImageData(comparing?original:current,0,0);overlay.hidden=comparing;$('compare').textContent=comparing?'返回修补图':'查看原图';$('compare').setAttribute('aria-pressed',String(comparing));};
$('restore').onclick=()=>{if(!original)return;current=new ImageData(new Uint8ClampedArray(original.data),canvas.width,canvas.height);ctx.putImageData(current,0,0);strokes=[];clearCandidates();drawMask();overlay.hidden=false;comparing=false;$('compare').textContent='查看原图';$('compare').setAttribute('aria-pressed','false');invalidateDownload();clearError();status('已恢复原图。');};
$('repair').onclick=()=>{
 if(working||!current)return;if(!strokes.length){status('请先识别或涂抹水印区域。');return;}
 comparing=false;overlay.hidden=false;$('compare').textContent='查看原图';$('compare').setAttribute('aria-pressed','false');drawing=null;drawingPointer=null;drawMask();
 const raw=mctx.getImageData(0,0,overlay.width,overlay.height).data,mask=new Uint8Array(canvas.width*canvas.height);let count=0;
 for(let i=0;i<mask.length;i++)if(raw[i*4+3]>0){mask[i]=1;count++;}
 if(!count){status('当前没有选中需要修复的位置，请涂抹或勾选水印。');return;}
 const pixels=current.data.slice();status('正在准备局部修复…');
 runWorkerJob('repair',{pixels:pixels.buffer,mask:mask.buffer,quality:$('quality').value,width:canvas.width,height:canvas.height},[pixels.buffer,mask.buffer],data=>{
  current=new ImageData(new Uint8ClampedArray(data.pixels),canvas.width,canvas.height);ctx.putImageData(current,0,0);strokes=[];clearCandidates();drawMask();invalidateDownload();$('download').disabled=false;
  status((data.stats?.detailSkipped?'细节处理未完成，已保留标准修复结果。':'修复完成。')+'请查看原图对比，遗漏的笔画可放大补涂后再次修复。');
 });
};
$('retry').onclick=()=>$(lastJob==='detect'?'autoDetect':'repair').click();
$('cancel').onclick=()=>{stopWorker();clearError();lock(false);status('已取消，图片和选区保留。');};
$('download').onclick=()=>{if(!current||working)return;const output=document.createElement('canvas');output.width=canvas.width;output.height=canvas.height;output.getContext('2d').putImageData(current,0,0);output.toBlob(blob=>{if(!blob){status('导出失败，请重试。');return;}if(downloadURL)URL.revokeObjectURL(downloadURL);downloadURL=URL.createObjectURL(blob);const a=document.createElement('a');a.href=downloadURL;a.download=fileName+'-修补.png';a.textContent='再次点击下载 PNG';$('downloadLink').replaceChildren(a);a.click();status('已生成 PNG。微信内不能下载时，请用系统浏览器打开。');},'image/png');};
function tab(which){$('imagePanel').hidden=which!=='image';$('linkPanel').hidden=which!=='link';for(const name of ['image','link']){$(name+'Tab').classList.toggle('active',name===which);$(name+'Tab').setAttribute('aria-pressed',String(name===which));}status('');}
$('imageTab').onclick=()=>tab('image');$('linkTab').onclick=()=>tab('link');
// Same-origin backend is activated only after it answers the health probe.
const endpoint='./.netlify/functions/media';
fetch(endpoint+'?health=1').then(r=>r.ok?r.json():null).then(data=>{if(data?.service==='public-media-extractor'){$('extract').disabled=false;$('serviceState').textContent='仅限公开可访问链接。需要登录、平台拦截或未提供原文件时，会明确提示。';}}).catch(()=>{});
$('extract').onclick=async()=>{const text=$('shareText').value.trim();if(!text){status('请先粘贴分享链接。');return;}$('extract').disabled=true;$('mediaResults').replaceChildren();status('正在读取公开页面…');try{const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text}),signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'提取失败');for(const [i,item] of data.items.entries()){const box=document.createElement('div');box.className='media-item';const media=document.createElement(item.kind==='video'?'video':'img');media.src=item.url;if(item.kind==='video'){media.controls=true;media.preload='metadata';}else{media.alt='提取图片 '+(i+1);media.loading='lazy';}const a=document.createElement('a');a.href=item.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='打开'+(item.kind==='video'?'视频':'图片')+'，保存到设备';box.append(media,a);$('mediaResults').append(box);}status(`提取到 ${data.items.length} 个文件。请查看是否含水印；含水印的图片可保存后到“图片修补”处理。`);}catch(e){status(e.name==='TimeoutError'?'读取超时，请稍后重试。':e.message);}finally{$('extract').disabled=false;}};


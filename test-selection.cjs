const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const width=20,height=12,pixels=new Uint8ClampedArray(width*height*4);
for(let i=0;i<width*height;i++)pixels.set([128,128,128,255],i*4);
pixels.set([255,255,255,255],(3*width+3)*4);
pixels.set([0,0,0,255],(3*width+15)*4);
pixels.set([255,255,255,255],(3*width+18)*4);
let submitted,instance;
class Element{
 constructor(id){this.id=id;this.width=width;this.height=height;this.value=id==='target'?'light':'';this.style={};this.attrs={};this.listeners={};this.classList={toggle(){}};this.data=new Uint8ClampedArray(width*height*4);}
 getContext(){const el=this;return {clearRect(){el.data.fill(0);},fillRect(x,y,w,h){for(let yy=Math.max(0,y);yy<Math.min(height,y+h);yy++)for(let xx=Math.max(0,x);xx<Math.min(width,x+w);xx++)el.data.set(this.globalCompositeOperation==='destination-out'?[0,0,0,0]:[235,67,73,166],(yy*width+xx)*4);},getImageData(){return {data:el.data.slice()};},putImageData(){}};}
 addEventListener(name,fn){this.listeners[name]=fn;}
 setAttribute(name,value){this.attrs[name]=value;}
 replaceChildren(){}
 append(){}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const context=vm.createContext({document:{getElementById:get,createElement:tag=>new Element(tag),addEventListener(){}},ImageZoom:require('./public/zoom-helper.js'),ResizeObserver:class{observe(){}},fetch:()=>Promise.resolve({ok:false}),setTimeout:()=>1,clearTimeout(){},console,URL,Uint8Array,Uint8ClampedArray,Map,testPixels:pixels,
 Worker:class{constructor(){instance=this;}postMessage(message){submitted=message.kind==='repair'?new Uint8Array(message.mask):message;}}});
vm.runInContext(fs.readFileSync('./public/app.js','utf8'),context);
const run=code=>vm.runInContext(code,context);
run(`current={data:testPixels,width:${width},height:${height}};strokes=[{rect:[1,1,8,7]}];drawMask();`);
const preview=()=>Uint8Array.from({length:width*height},(_,i)=>get('mask').data[i*4+3]?1:0);
assert.equal(preview()[6*width+8],0,'Unrelated background in a broad manual stroke must remain unselected');
get('autoDetect').onclick();
assert.equal(submitted.kind,'detect');
assert.equal(preview()[3*width+15],0,'Recognition must not change the selection before results arrive');
instance.onmessage({data:{detection:{runs:[[15,3,1,1],[18,3,1,1]],regions:[{x:15,y:3,width:4,height:1,runs:[[15,3,1,1],[18,3,1,1]]}],skipped:[]}}});
assert.equal(get('target').value,'light','Automatic detection must preserve the manual color filter');
assert.equal(preview()[6*width+8],0,'Automatic detection must not broaden existing manual selections');
assert.equal(preview()[3*width+15],1,'Dark automatic candidate must survive the light manual filter');
assert.equal(preview()[3*width+18],1);
assert.equal(preview()[3*width+3],1);
const sourceBeforeErase=pixels.slice();
run('strokes.push({rect:[15,3,1,1],erase:true});drawMask();');
assert.equal(preview()[3*width+15],0,'Eraser must clear an automatic candidate pixel');
assert.equal(preview()[3*width+18],1,'Eraser must preserve the rest of the candidate');
assert.equal(run('candidateGroups[0].input.checked'),true);
run('candidateGroups[0].input.checked=false;candidateGroups[0].input.onchange();');
run('candidateGroups[0].input.checked=true;candidateGroups[0].input.onchange();');
assert.equal(preview()[3*width+15],0,'Toggling a candidate must retain its local eraser correction');
assert.equal(preview()[3*width+18],1);
get('target').value='all';
run('strokes.push({rect:[15,3,1,1]});drawMask();');
assert.equal(preview()[3*width+15],1,'Painting after erasing must select the pixel again');
get('undo').onclick();assert.equal(preview()[3*width+15],0,'Undo repaint must restore the erased state');
get('undo').onclick();assert.equal(preview()[3*width+15],1,'Undo eraser must restore the candidate');
get('target').value='light';get('target').onchange();
assert.deepEqual(pixels,sourceBeforeErase,'Selection erasing must never modify the image');
const displayed=preview();
run('candidateGroups[0].input.checked=false;candidateGroups[0].input.onchange();');
assert.equal(preview()[3*width+15],0,'User can deselect a false automatic candidate');
assert.equal(preview()[3*width+3],1,'Deselecting a candidate must retain manual selections');
run('candidateGroups[0].input.checked=true;candidateGroups[0].input.onchange();');
get('repair').onclick();
assert.deepEqual(submitted,displayed,'The worker must receive exactly the red preview pixels');
run('working=false;');
get('target').value='dark';get('target').onchange();
assert.equal(preview()[3*width+3],0,'Changing manual color must redraw the preview');
assert.equal(preview()[3*width+15],1);assert.equal(preview()[3*width+18],1);
get('undo').onclick();
assert.equal(preview().reduce((a,b)=>a+b,0),0,'Undo automatic candidates must retain the original manual stroke and its filter');
get('target').value='light';get('target').onchange();
assert.equal(preview()[3*width+3],1);
assert.equal(preview()[3*width+15],0);
pixels.set([255,255,255,255],(11*width+18)*4);
get('target').value='dark';get('corner').onclick();
assert.equal(preview()[11*width+18],1,'Detected corner light pixels must bypass the manual dark filter');
console.log('PASS: manual color preserved, exact automatic masks bypass filtering, preview equals worker selection, eraser/undo/repaint and candidate toggles preserve selection order and image pixels');

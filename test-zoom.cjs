const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const zoom=require('./public/zoom-helper.js');
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} should equal ${b}`);

// Screen positions must map back to the same original pixels after zooming.
const fitted=zoom.fit(390,600,1179,1579);
const anchor=[180,270],before=zoom.point(fitted,...anchor);
const magnified=zoom.zoomAt(fitted,4,...anchor),after=zoom.point(magnified,...anchor);
close(before[0],after[0]);close(before[1],after[1]);
close(24/(magnified.base*magnified.zoom)*magnified.base*magnified.zoom,24);
assert.equal(zoom.zoomAt(fitted,99).zoom,8);
assert.equal(zoom.zoomAt(magnified,.1).zoom,1);
const moved=zoom.gesture(magnified,[120,250],[220,250],[130,260],[230,260]);
close(moved.x,magnified.x+10);close(moved.y,magnified.y+10);
const bounded=zoom.constrain({...magnified,x:100000,y:-100000});
assert.equal(bounded.x,0);close(bounded.y,bounded.height-bounded.imageHeight*bounded.base*bounded.zoom);

// Exercise the actual app pointer handlers: a second finger must remove only
// the unfinished brush stroke, never leave a red dot or resume drawing on lift.
class Element {
  constructor(id){this.id=id;this.listeners={};this.captures=new Set();this.style={};this.dataset={};this.attrs={};this.width=1179;this.height=1579;this.clientWidth=390;this.clientHeight=600;this.classList={toggle(){}};this.value=id==='brush'?'24':'';this.textContent='';}
  getContext(){return {clearRect(){},fillRect(){},beginPath(){},moveTo(){},lineTo(){},stroke(){}};}
  addEventListener(name,listener){this.listeners[name]=listener;}
  setPointerCapture(id){this.captures.add(id);}
  hasPointerCapture(id){return this.captures.has(id);}
  releasePointerCapture(id){this.captures.delete(id);}
  getBoundingClientRect(){return {left:0,top:0,width:390,height:600};}
  setAttribute(name,value){this.attrs[name]=value;}
  replaceChildren(){}
}
const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
const context=vm.createContext({document:{getElementById:get,addEventListener(){}},ImageZoom:zoom,ResizeObserver:class{observe(){}},fetch:()=>Promise.resolve({ok:false}),console,setTimeout,clearTimeout,URL,Map,Uint8Array,Uint8ClampedArray});
vm.runInContext(fs.readFileSync('./public/app.js','utf8'),context);
vm.runInContext('current={data:[]};resizeView(true);',context);
const run=code=>vm.runInContext(code,context);
const viewport=get('canvasViewport');
function pointer(type,id,x,y){viewport.listeners[type]({type,pointerId:id,clientX:x,clientY:y,button:0,preventDefault(){}});}
pointer('pointerdown',1,150,200);pointer('pointermove',1,160,205);pointer('pointerup',1,160,205);
assert.equal(run('strokes.length'),1);
pointer('pointerdown',2,140,200);assert.equal(run('strokes.length'),2);
pointer('pointerdown',3,240,200);assert.equal(run('strokes.length'),1);
pointer('pointermove',3,300,200);assert(run('view.zoom')>1);
pointer('pointerup',3,300,200);pointer('pointermove',2,160,220);
assert.equal(run('strokes.length'),1);
pointer('pointerup',2,160,220);
pointer('pointerdown',4,180,250);
close(run('drawing.size*view.base*view.zoom'),24);
pointer('pointerup',4,180,250);assert.equal(run('strokes.length'),2);
run("setMode('pan')");pointer('pointerdown',5,180,250);pointer('pointermove',5,160,230);pointer('pointerup',5,160,230);
assert.equal(run('strokes.length'),2);
run("setMode('draw')");pointer('pointerdown',6,180,250);pointer('pointercancel',6,180,250);
assert.equal(run('strokes.length'),2);
assert.equal(get('image').width,1179);assert.equal(get('image').height,1579);
assert.equal(get('mask').width,1179);assert.equal(get('mask').height,1579);
console.log('PASS: anchored zoom, coordinate mapping, brush precision, pan bounds, pinch rollback, interrupted stroke, unchanged output size');

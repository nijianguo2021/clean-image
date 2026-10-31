(function(root){
 'use strict';
 // Plan whole connected selections, never cut a hole along an arbitrary tile.
 // Each region owns original-image indices exactly once. Read its RGB context
 // from the unchanged source; use only its own indices for inference and writes.
 function planRepairRegions(mask,width,height,options={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>16777216||!mask||mask.length!==width*height)throw Error('Invalid repair mask dimensions');
  const integer=(value,fallback,min,max)=>Number.isFinite(value)?Math.max(min,Math.min(max,Math.floor(value))):fallback;
  const padding=integer(options.padding,96,0,256),maxRegions=integer(options.maxRegions,12,1,12);
  const gridSize=4,joinGap=integer(options.joinGap,24,0,64),touchGap=6,maxCore=Math.max(64,512-padding*2),componentLimit=256;
  const gw=Math.ceil(width/gridSize),gh=Math.ceil(height/gridSize),cells=gw*gh,occupied=new Uint8Array(cells);
  let count=0,minX=width,minY=height,maxX=-1,maxY=-1;
  for(let p=0;p<mask.length;p++)if(mask[p]){
   const x=p%width,y=Math.floor(p/width);occupied[Math.floor(y/gridSize)*gw+Math.floor(x/gridSize)]=1;
   count++;minX=Math.min(minX,x);minY=Math.min(minY,y);maxX=Math.max(maxX,x);maxY=Math.max(maxY,y);
  }
  if(!count)return {regions:[],selectedPixels:0,componentCount:0,groupLimitApplied:false,strategy:'empty'};
  function makeRegion(group,id){
   const x=Math.max(0,group.minX-padding),y=Math.max(0,group.minY-padding),right=Math.min(width,group.maxX+padding+1),bottom=Math.min(height,group.maxY+padding+1);
   return {id,rect:{x,y,width:right-x,height:bottom-y},bounds:{x:group.minX,y:group.minY,width:group.maxX-group.minX+1,height:group.maxY-group.minY+1},pixelCount:group.count,indices:new Uint32Array(group.count)};
  }
  function fallback(componentCount){
   const region=makeRegion({minX,minY,maxX,maxY,count},0);let cursor=0;
   for(let p=0;p<mask.length;p++)if(mask[p])region.indices[cursor++]=p;
   return {regions:[region],selectedPixels:count,componentCount,groupLimitApplied:false,strategy:'component-limit'};
  }
  const labels=new Uint16Array(cells),queue=new Int32Array(cells);let componentCount=0;
  for(let seed=0;seed<cells;seed++)if(occupied[seed]&&!labels[seed]){
   if(++componentCount>componentLimit)return fallback(componentCount);
   let head=0,tail=1;queue[0]=seed;labels[seed]=componentCount;
   while(head<tail){
    const p=queue[head++],x=p%gw,y=Math.floor(p/gw);
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
     const xx=x+dx,yy=y+dy;if(xx<0||xx>=gw||yy<0||yy>=gh)continue;const q=yy*gw+xx;
     if(occupied[q]&&!labels[q]){labels[q]=componentCount;queue[tail++]=q;}
    }
   }
  }
  const groups=Array.from({length:componentCount},(_,i)=>({root:i+1,minX:width,minY:height,maxX:-1,maxY:-1,count:0}));
  for(let p=0;p<mask.length;p++)if(mask[p]){
   const x=p%width,y=Math.floor(p/width),group=groups[labels[Math.floor(y/gridSize)*gw+Math.floor(x/gridSize)]-1];
   group.minX=Math.min(group.minX,x);group.minY=Math.min(group.minY,y);group.maxX=Math.max(group.maxX,x);group.maxY=Math.max(group.maxY,y);group.count++;
  }
  const parents=Uint16Array.from({length:componentCount+1},(_,i)=>i);
  function find(id){while(parents[id]!==id){parents[id]=parents[parents[id]];id=parents[id];}return id;}
  function distance(a,b){const dx=Math.max(0,a.minX-b.maxX-1,b.minX-a.maxX-1),dy=Math.max(0,a.minY-b.maxY-1,b.minY-a.maxY-1);return dx*dx+dy*dy;}
  function merge(i,j){const a=groups[i],b=groups[j];parents[b.root]=a.root;a.minX=Math.min(a.minX,b.minX);a.minY=Math.min(a.minY,b.minY);a.maxX=Math.max(a.maxX,b.maxX);a.maxY=Math.max(a.maxY,b.maxY);a.count+=b.count;groups.splice(j,1);}
  // Nearby marks share context, except where a real separating gap lets a long
  // caption stay at a useful model scale. A connected broad hole stays intact.
  while(true){
   let best=null,bestDistance=Infinity;
   for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){
    const a=groups[i],b=groups[j],d=distance(a,b);if(d>joinGap*joinGap||d>=bestDistance)continue;
    const w=Math.max(a.maxX,b.maxX)-Math.min(a.minX,b.minX)+1,h=Math.max(a.maxY,b.maxY)-Math.min(a.minY,b.minY)+1;
    if(d>touchGap*touchGap&&(w>maxCore||h>maxCore))continue;
    best=[i,j];bestDistance=d;
   }
   if(!best)break;merge(...best);
  }
  let groupLimitApplied=false;
  while(groups.length>maxRegions){
   let best=[0,1],bestDistance=Infinity;
   for(let i=0;i<groups.length;i++)for(let j=i+1;j<groups.length;j++){const d=distance(groups[i],groups[j]);if(d<bestDistance){bestDistance=d;best=[i,j];}}
   merge(...best);groupLimitApplied=true;
  }
  groups.sort((a,b)=>a.minY-b.minY||a.minX-b.minX);
  const regions=groups.map(makeRegion),regionForRoot=new Int16Array(componentCount+1),cursors=new Uint32Array(regions.length);regionForRoot.fill(-1);
  groups.forEach((group,i)=>{regionForRoot[group.root]=i;});
  for(let p=0;p<mask.length;p++)if(mask[p]){
   const x=p%width,y=Math.floor(p/width),id=labels[Math.floor(y/gridSize)*gw+Math.floor(x/gridSize)],region=regionForRoot[find(id)];
   regions[region].indices[cursors[region]++]=p;
  }
  return {regions,selectedPixels:count,componentCount,groupLimitApplied,strategy:regions.length>1?'local-groups':'single-group'};
 }
 if(typeof module==='object'&&module.exports)module.exports={planRepairRegions};else root.planRepairRegions=planRepairRegions;
})(typeof globalThis!=='undefined'?globalThis:this);

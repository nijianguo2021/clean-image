// Match nearby clean texture patches instead of filling a whole region with averages.
function inpaint(data,mask,width,height){
 const count=width*height,original=data.slice(),known=new Uint8Array(count),queued=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0,marked=0,filled=0;
 const neighbors=p=>{const x=p%width,y=Math.floor(p/width),out=[];if(x)out.push(p-1);if(x<width-1)out.push(p+1);if(y)out.push(p-width);if(y<height-1)out.push(p+width);return out;};
 for(let p=0;p<count;p++){known[p]=mask[p]?0:1;if(mask[p])marked++;}
 if(!marked)throw Error('请先涂抹水印区域');if(marked>count*.2)throw Error('选区超过图片的 20%，请缩小范围，分次修补');
 if(marked>180000)throw Error('选区过大，请分成几个小区域修补，避免明显痕迹');
 const stride=width+1,integral=new Uint32Array(stride*(height+1));
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){sum+=mask[y*width+x]?1:0;integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+sum;}}
 function clean(x,y){const a=x-2,b=y-2,c=x+3,d=y+3;if(a<0||b<0||c>width||d>height)return false;return integral[d*stride+c]-integral[b*stride+c]-integral[d*stride+a]+integral[b*stride+a]===0;}
 let seed=123456789;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let p=0;p<count;p++)if(mask[p]&&neighbors(p).some(n=>known[n])){queue[tail++]=p;queued[p]=1;}
 while(head<tail){const p=queue[head++];if(known[p])continue;const x=p%width,y=Math.floor(p/width),boundary=[];
  for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx>=0&&xx<width&&yy>=0&&yy<height&&known[yy*width+xx])boundary.push([dx,dy,yy*width+xx]);}
  let best=null,cost=Infinity;
  function candidate(cx,cy){if(!clean(cx,cy))return;let score=0;for(const [dx,dy,q] of boundary){const s=(cy+dy)*width+cx+dx;for(let c=0;c<3;c++){const d=data[q*4+c]-original[s*4+c];score+=d*d;}}score/=Math.max(1,boundary.length*3);score+=(Math.abs(cx-x)+Math.abs(cy-y))*.03;if(score<cost){cost=score;best=[cx,cy];}}
  for(const distance of [4,8,16,32,64,128])for(let angle=0;angle<8;angle++){const a=angle*Math.PI/4;candidate(Math.round(x+Math.cos(a)*distance),Math.round(y+Math.sin(a)*distance));}
  for(let k=0;k<72;k++){const reach=k<48?48:180;candidate(Math.round(x+(random()*2-1)*reach),Math.round(y+(random()*2-1)*reach));}
  const added=[];
  if(best){const [cx,cy]=best;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const q=yy*width+xx;if(known[q])continue;const s=(cy+dy)*width+cx+dx;for(let c=0;c<4;c++)data[q*4+c]=original[s*4+c];known[q]=1;filled++;added.push(q);}}
  else{const near=neighbors(p).filter(q=>known[q]);if(!near.length)throw Error('找不到可用纹理，请缩小选区');for(let c=0;c<4;c++)data[p*4+c]=Math.round(near.reduce((s,q)=>s+data[q*4+c],0)/near.length);known[p]=1;filled++;added.push(p);}
  for(const q of added)for(const next of neighbors(q))if(!known[next]&&!queued[next]){queued[next]=1;queue[tail++]=next;}
 }
 if(filled!==marked)throw Error('无法修补该选区，请缩小范围重试');
 const copy=data.slice();for(let p=0;p<count;p++)if(mask[p]){const near=neighbors(p);for(let c=0;c<3;c++)data[p*4+c]=Math.round((copy[p*4+c]*6+near.reduce((s,q)=>s+copy[q*4+c],0))/(6+near.length));}
 return data;
}
if(typeof self!=='undefined')self.onmessage=e=>{try{const {pixels,mask,width,height}=e.data;const result=inpaint(new Uint8ClampedArray(pixels),new Uint8Array(mask),width,height);self.postMessage({pixels:result.buffer},[result.buffer]);}catch(e){self.postMessage({error:e.message});}};
if(typeof module!=='undefined')module.exports={inpaint};

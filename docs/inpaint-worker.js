// Local boundary-guided interpolation. This reconstructs an approximation, not hidden original detail.
function inpaint(data,mask,width,height){
 const count=width*height,known=new Uint8Array(count),queued=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0,marked=0;
 const neighbors=p=>{const x=p%width,y=Math.floor(p/width),out=[];if(x)out.push(p-1);if(x<width-1)out.push(p+1);if(y)out.push(p-width);if(y<height-1)out.push(p+width);return out;};
 for(let p=0;p<count;p++){known[p]=mask[p]?0:1;if(mask[p])marked++;}
 if(!marked)throw Error('请先涂抹水印区域');if(marked>count*.2)throw Error('选区超过图片的 20%，请缩小范围，分次修补');
 for(let p=0;p<count;p++)if(mask[p]&&neighbors(p).some(n=>known[n])){queue[tail++]=p;queued[p]=1;}
 while(head<tail){const p=queue[head++],x=p%width,y=Math.floor(p/width),sum=[0,0,0,0];let weight=0;
  for(let dy=-3;dy<=3;dy++)for(let dx=-3;dx<=3;dx++){if(!dx&&!dy)continue;const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;const q=yy*width+xx;if(!known[q])continue;const w=1/(dx*dx+dy*dy);for(let c=0;c<4;c++)sum[c]+=data[q*4+c]*w;weight+=w;}
  if(!weight)continue;for(let c=0;c<4;c++)data[p*4+c]=Math.round(sum[c]/weight);known[p]=1;
  for(const n of neighbors(p))if(!known[n]&&!queued[n]){queued[n]=1;queue[tail++]=n;}
 }
 if(head!==marked)throw Error('无法修补该选区，请缩小范围重试');
 return data;
}
if(typeof self!=='undefined')self.onmessage=e=>{try{const {pixels,mask,width,height}=e.data;const result=inpaint(new Uint8ClampedArray(pixels),new Uint8Array(mask),width,height);self.postMessage({pixels:result.buffer},[result.buffer]);}catch(e){self.postMessage({error:e.message});}};
if(typeof module!=='undefined')module.exports={inpaint};

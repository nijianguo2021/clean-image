'use strict';
// In smooth, narrow gaps use nearby original color/line evidence instead of generated texture.
// Rough or ambiguous backgrounds retain the model result.
function refineSmoothGaps(target,source,mask,width,height){
 const scores=new Uint8Array(mask.length);scores.fill(255);
 const protectedDetail=254;
 // Mark contrast inside the generated region before either smoothing pass can
 // change it. Edges against known pixels alone may just be a flat wrong patch.
 for(let p=0;p<mask.length;p++)if(mask[p]){
  for(let direction=0;direction<2;direction++){
   const q=direction===0?(p%width+1<width?p+1:-1):(p+width<mask.length?p+width:-1);
   if(q<0||!mask[q])continue;
   for(let c=0;c<3;c++)if(Math.abs(target[p*4+c]-target[q*4+c])>12){scores[p]=scores[q]=protectedDetail;break;}
  }
 }
 // A smooth one-dimensional border can hide a line crossing the gap. Require
 // independent known pixels in the other directions to support the same fill.
 function supportedAcross(p,predicted,vertical){
  const x=p%width,y=Math.floor(p/width);
  const directions=vertical?[[1,0],[1,1],[1,-1]]:[[0,1],[1,1],[1,-1]];
  for(const [dx,dy] of directions){
   const sides=[];
   for(const sign of [-1,1]){
    let found=null;
    for(let distance=1;distance<=64;distance++){
     const xx=x+dx*distance*sign,yy=y+dy*distance*sign;
     if(xx<0||xx>=width||yy<0||yy>=height)break;
     const q=yy*width+xx;if(!mask[q]){found={p:q,distance};break;}
    }
    if(!found)return false;sides.push(found);
   }
   const [a,b]=sides,total=a.distance+b.distance;
   for(let c=0;c<3;c++){
    const expected=(source[a.p*4+c]*b.distance+source[b.p*4+c]*a.distance)/total;
    if(Math.abs(expected-predicted[c])>8)return false;
   }
  }
  return true;
 }
 for(const vertical of [false,true]){
  const lines=vertical?width:height,length=vertical?height:width,stride=vertical?width:1;
  for(let line=0;line<lines;line++){
   const base=vertical?line:line*width;
   for(let at=0;at<length;at++){
    if(!mask[base+at*stride])continue;
    const start=at;while(at<length&&mask[base+at*stride])at++;
    const end=at,span=end-start;if(span>64||start<4||end+3>=length)continue;
    // Retain generated detail whenever the gap already contains structure.
    // Correcting a uniformly wrong patch is safer than flattening an edge.
    const low=[255,255,255],high=[0,0,0];let structured=false;
    for(let i=start;i<end&&!structured;i++){
     if(scores[base+i*stride]===protectedDetail){structured=true;break;}
     for(let c=0;c<3;c++){
     const value=target[(base+i*stride)*4+c];low[c]=Math.min(low[c],value);high[c]=Math.max(high[c],value);
     if(high[c]-low[c]>12){structured=true;break;}
     }
    }
    if(structured)continue;
    let valid=true;const left=[0,0,0],right=[0,0,0];
    for(let k=0;k<3;k++){
     const a=base+(start-1-k)*stride,b=base+(end+k)*stride;
     if(mask[a]||mask[b]){valid=false;break;}
     for(let c=0;c<3;c++){left[c]+=source[a*4+c]/3;right[c]+=source[b*4+c]/3;}
    }
    if(!valid)continue;
    let variation=0,delta=0;
    for(let c=0;c<3;c++){
     delta=Math.max(delta,Math.abs(left[c]-right[c]));
     for(let k=0;k<3;k++){
      variation=Math.max(variation,Math.abs(source[(base+(start-1-k)*stride)*4+c]-left[c]),Math.abs(source[(base+(end+k)*stride)*4+c]-right[c]));
     }
    }
    if(variation>8||delta>35)continue;
    const score=variation+delta*.45+span*.12,confidence=Math.max(0,1-score/24);
    if(confidence<.35)continue;
    // Sample the ends and middle rather than scanning long perpendicular
    // columns for every pixel. Unknown/contradictory context keeps model output.
    let supported=true;
    for(const i of new Set([start,Math.floor((start+end-1)/2),end-1])){
     const t=(i-start+1)/(span+1),predicted=left.map((v,c)=>v*(1-t)+right[c]*t);
     if(!supportedAcross(base+i*stride,predicted,vertical)){supported=false;break;}
    }
    if(!supported)continue;
    for(let i=start;i<end;i++){
     const p=base+i*stride;if(Math.round(score*4)>=scores[p])continue;
     scores[p]=Math.round(score*4);const t=(i-start+1)/(span+1),strength=Math.min(.96,.65+confidence*.35);
     for(let c=0;c<3;c++)target[p*4+c]=Math.round(target[p*4+c]*(1-strength)+(left[c]*(1-t)+right[c]*t)*strength);
    }
   }
  }
 }
}
if(typeof module!=='undefined')module.exports={refineSmoothGaps};

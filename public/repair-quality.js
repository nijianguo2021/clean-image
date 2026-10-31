'use strict';
// In smooth, narrow gaps use nearby original color/line evidence instead of generated texture.
// Rough or ambiguous backgrounds retain the model result.
function refineSmoothGaps(target,source,mask,width,height){
 const scores=new Uint8Array(mask.length);scores.fill(255);
 for(const vertical of [false,true]){
  const lines=vertical?width:height,length=vertical?height:width,stride=vertical?width:1;
  for(let line=0;line<lines;line++){
   const base=vertical?line:line*width;
   for(let at=0;at<length;at++){
    if(!mask[base+at*stride])continue;
    const start=at;while(at<length&&mask[base+at*stride])at++;
    const end=at,span=end-start;if(span>64||start<4||end+3>=length)continue;
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

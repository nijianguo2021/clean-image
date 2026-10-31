(function(root){
 'use strict';
 // Selection is the user's output ownership. The returned mask is only model
 // input: unknown=0, known=255. Its guard prevents internal blend operations
 // from bringing source lettering back into the selected output pixels.
 function buildInferenceMask(selection,width,height,rect,guard=3){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>16777216||!selection||selection.length!==width*height)throw Error('Invalid selection dimensions');
  if(!rect||![rect.x,rect.y,rect.width,rect.height].every(Number.isInteger)||rect.x<0||rect.y<0||rect.width<1||rect.height<1||rect.x+rect.width>width||rect.y+rect.height>height)throw Error('Invalid inference crop');
  if(!Number.isSafeInteger(guard)||guard<0)throw Error('Invalid inference guard');
  guard=Math.min(guard,Math.max(width,height));
  const {x:cropX,y:cropY,width:w,height:h}=rect,yStart=Math.max(0,cropY-guard),yEnd=Math.min(height,cropY+h+guard),rows=yEnd-yStart;
  const horizontal=new Uint8Array(w*rows),known=new Uint8Array(w*h),verticalCount=new Uint32Array(w);
  const left=Math.max(0,cropX-guard),right=Math.min(width,cropX+guard+1);
  // Horizontal sliding maximum (implemented as a count of nonzero values).
  // Read the global halo, including selections just outside the crop.
  for(let y=yStart;y<yEnd;y++){
   const sourceRow=y*width,targetRow=(y-yStart)*w;let count=0;
   for(let x=left;x<right;x++)if(selection[sourceRow+x])count++;
   for(let x=0;x<w;x++){
    horizontal[targetRow+x]=count?1:0;
    const remove=cropX+x-guard,add=cropX+x+guard+1;
    if(remove>=0&&remove<width&&selection[sourceRow+remove])count--;
    if(add<width&&selection[sourceRow+add])count++;
   }
  }
  // Vertical sliding maximum. Two linear passes avoid per-selected-pixel
  // 7x7 loops and use no image data or alpha channel.
  const initialEnd=Math.min(height,cropY+guard+1)-yStart;
  for(let row=0;row<initialEnd;row++)for(let x=0;x<w;x++)verticalCount[x]+=horizontal[row*w+x];
  for(let y=0;y<h;y++){
   const remove=cropY+y-guard-yStart,add=cropY+y+guard+1-yStart;
   for(let x=0;x<w;x++){
    known[y*w+x]=verticalCount[x]?0:255;
    if(remove>=0&&remove<rows)verticalCount[x]-=horizontal[remove*w+x];
    if(add<rows)verticalCount[x]+=horizontal[add*w+x];
   }
  }
  return known;
 }
 if(typeof module==='object'&&module.exports)module.exports={buildInferenceMask};else root.buildInferenceMask=buildInferenceMask;
})(typeof globalThis!=='undefined'?globalThis:this);

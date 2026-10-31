/* Conservative edge-text candidates. This is a preview aid, not OCR or semantic recognition. */
(function(root){
  'use strict';
  function detectWatermarkCandidates(image, options={}) {
    const {data,width,height}=image;
    if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>12000000||!data||data.length<width*height*4)throw Error('图片尺寸不支持自动识别');
    const empty=()=>({mask:new Uint8Array(width*height),regions:[],runs:[],mode:'all',pixels:0});
    if(width<40||height<40)return empty();
    const step=Math.max(1,Math.ceil(Math.max(width,height)/1200)),w=Math.ceil(width/step),h=Math.ceil(height/step),n=w*h;
    const gray=new Uint8Array(n),spread=new Uint8Array(n),opaque=new Uint8Array(n);
    for(let y=0;y<h;y++)for(let x=0;x<w;x++){
      const i=(Math.min(height-1,y*step)*width+Math.min(width-1,x*step))*4,p=y*w+x;
      gray[p]=(data[i]*77+data[i+1]*150+data[i+2]*29)>>8;
      spread[p]=Math.max(data[i],data[i+1],data[i+2])-Math.min(data[i],data[i+1],data[i+2]);opaque[p]=data[i+3]>220?1:0;
    }
    const labels=new Uint8Array(n),contrast=new Uint8Array(n),radius=3;
    const offsets=[[-radius,-radius],[0,-radius],[radius,-radius],[-radius,0],[radius,0],[-radius,radius],[0,radius],[radius,radius]];
    // Only inspect the outer bands. Central captions and subject details stay manual.
    for(let y=radius;y<h-radius;y++)for(let x=radius;x<w-radius;x++){
      if(y>h*.14&&y<h*.78&&x>w*.1&&x<w*.9)continue;
      const p=y*w+x,v=gray[p];if(!opaque[p]||spread[p]>58||v>100&&v<160)continue;
      let sum=0,low=255,high=0;
      for(const [dx,dy] of offsets){const value=gray[(y+dy)*w+x+dx];sum+=value;low=Math.min(low,value);high=Math.max(high,value);}
      const d=v-sum/8;
      if(v>=160&&d>=20&&v-low>=30){labels[p]=1;contrast[p]=Math.min(255,d);}
      else if(v<=100&&d<=-20&&high-v>=30){labels[p]=2;contrast[p]=Math.min(255,-d);}
    }
    const seen=new Uint8Array(n),queue=new Int32Array(n),componentIds=new Int32Array(n),components=[];
    for(let seed=0;seed<n;seed++){
      if(!labels[seed]||seen[seed])continue;
      const polarity=labels[seed];let head=0,tail=1,minx=w,miny=h,maxx=0,maxy=0,totalContrast=0;queue[0]=seed;seen[seed]=1;
      while(head<tail){
        const p=queue[head++],x=p%w,y=Math.floor(p/w);minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);totalContrast+=contrast[p];
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          const xx=x+dx,yy=y+dy;if(xx<0||yy<0||xx>=w||yy>=h)continue;const q=yy*w+xx;
          if(!seen[q]&&labels[q]===polarity){seen[q]=1;queue[tail++]=q;}
        }
      }
      const cw=maxx-minx+1,ch=maxy-miny+1,fill=tail/(cw*ch);
      if(tail<3||tail>n*.012||ch<3||ch>h*.1||cw>w*.65||fill<.04||fill>.92||cw<2)continue;
      const id=components.length+1;for(let i=0;i<tail;i++)componentIds[queue[i]]=id;
      components.push({id,x:minx,y:miny,right:maxx+1,bottom:maxy+1,width:cw,height:ch,count:tail,polarity,contrast:totalContrast/tail});
    }
    // Unstructured grain can produce thousands of tiny components; do not turn it into a broad selection.
    if(components.length>5000)return empty();
    const groups=[];
    for(const polarity of [1,2]){
      const list=components.filter(c=>c.polarity===polarity).sort((a,b)=>a.x-b.x),parents=list.map((_,i)=>i);
      const find=i=>{while(parents[i]!==i){parents[i]=parents[parents[i]];i=parents[i];}return i;};
      for(let i=0;i<list.length;i++)for(let j=i+1;j<list.length;j++){
        const a=list[i],b=list[j];if(b.x-a.right>Math.max(a.height,h*.1)*2.2)break;
        const tall=Math.max(a.height,b.height),short=Math.min(a.height,b.height);
        if(short/tall<.28||b.x-a.right>tall*1.8||Math.abs((a.y+a.bottom-b.y-b.bottom)/2)>tall*.6)continue;
        const ra=find(i),rb=find(j);if(ra!==rb)parents[rb]=ra;
      }
      const byRoot=new Map();for(let i=0;i<list.length;i++){const id=find(i);if(!byRoot.has(id))byRoot.set(id,[]);byRoot.get(id).push(list[i]);}
      for(const group of byRoot.values()){
        const x=Math.min(...group.map(c=>c.x)),y=Math.min(...group.map(c=>c.y)),right=Math.max(...group.map(c=>c.right)),bottom=Math.max(...group.map(c=>c.bottom));
        const gw=right-x,gh=bottom-y,count=group.reduce((v,c)=>v+c.count,0),density=count/(gw*gh),aspect=gw/gh,avgContrast=group.reduce((v,c)=>v+c.contrast*c.count,0)/count;
        const nearEdge=bottom<=h*.15||y>=h*.78||right<=w*.12||x>=w*.88;
        const joinedText=group.length===1&&aspect>=3.2&&density<.4&&count>=gh*2;
        if(!nearEdge||gh<5||gh>h*.1||gw<24||aspect<2.1||gw*gh>n*.12||density<.035||density>.55||count>n*.018||avgContrast<24)continue;
        if(group.length<3&&!joinedText)continue;
        const score=Math.min(group.length,12)*2+Math.min(aspect,10)+avgContrast*.08+(y>h*.87?8:0);
        if(score<32)continue;
        groups.push({x,y,right,bottom,count,polarity,score,members:new Set(group.map(c=>c.id))});
      }
    }
    const maxRegions=Math.max(1,Math.min(4,Math.floor(Number(options.maxRegions)||3))),selected=[];
    let budget=0;
    for(const group of groups.sort((a,b)=>b.score-a.score)){
      if(selected.length>=maxRegions)break;if(budget+group.count>n*.025)continue;
      if(selected.some(a=>Math.max(a.x,group.x)<Math.min(a.right,group.right)&&Math.max(a.y,group.y)<Math.min(a.bottom,group.bottom)))continue;
      selected.push(group);budget+=group.count;
    }
    const result=empty();if(!selected.length)return result;
    const originalGray=(x,y)=>{const i=(y*width+x)*4;return (data[i]*77+data[i+1]*150+data[i+2]*29)>>8;};
    // Recheck at original resolution rather than enlarging a coarse mask over image detail.
    const r=radius*step;
    for(const group of selected){
      const x0=Math.max(r,(group.x-1)*step),y0=Math.max(r,(group.y-1)*step),x1=Math.min(width-r,(group.right+1)*step),y1=Math.min(height-r,(group.bottom+1)*step);
      let pixels=0;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const sx=Math.floor(x/step),sy=Math.floor(y/step);let nearCandidate=false;
        for(let dy=-1;dy<=1&&!nearCandidate;dy++)for(let dx=-1;dx<=1;dx++){
          const xx=sx+dx,yy=sy+dy;if(xx>=0&&yy>=0&&xx<w&&yy<h&&group.members.has(componentIds[yy*w+xx])){nearCandidate=true;break;}
        }
        if(!nearCandidate)continue;
        const p=y*width+x,i=p*4,hi=Math.max(data[i],data[i+1],data[i+2]),lo=Math.min(data[i],data[i+1],data[i+2]),v=originalGray(x,y);
        if(data[i+3]<220||hi-lo>65||(group.polarity===1?v<145:v>115))continue;
        let sum=0;for(const [dx,dy] of offsets)sum+=originalGray(x+dx*step,y+dy*step);
        const d=v-sum/8;if(group.polarity===1?d<14:d>-14)continue;
        if(!result.mask[p]){result.mask[p]=1;pixels++;}
      }
      if(pixels)result.regions.push({x:x0,y:y0,width:x1-x0,height:y1-y0,polarity:group.polarity===1?'light':'dark',pixels});
    }
    // A color threshold finds the solid ink, but leaving its antialiased fringe visible
    // makes inpainting reconstruct the lettering. Add a small original-pixel margin;
    // keep it inside the same conservative candidate boxes and never grow iteratively.
    const core=result.mask,padding=Math.min(3,step+1),expanded=new Uint8Array(core.length);
    for(const region of result.regions){
      const x0=region.x,y0=region.y,x1=x0+region.width,y1=y0+region.height;
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)if(core[y*width+x]){
        for(let dy=-padding;dy<=padding;dy++)for(let dx=-padding;dx<=padding;dx++){
          const xx=x+dx,yy=y+dy;if(xx<x0||xx>=x1||yy<y0||yy>=y1)continue;
          const q=yy*width+xx;if(data[q*4+3]>220)expanded[q]=1;
        }
      }
      region.pixels=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)region.pixels+=expanded[y*width+x];
    }
    result.mask=expanded;
    for(let y=0;y<height;y++)for(let x=0;x<width;){
      if(!result.mask[y*width+x]){x++;continue;}const start=x;while(x<width&&result.mask[y*width+x])x++;result.runs.push([start,y,x-start,1]);result.pixels+=x-start;
    }
    // Hard stop: never offer a destructive broad/fragmented automatic selection.
    if(result.runs.length>50000||result.pixels>width*height*.035)return empty();
    const polarities=new Set(result.regions.map(r=>r.polarity));result.mode=polarities.size===1?[...polarities][0]:'all';
    return result;
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={detectWatermarkCandidates};
  else root.detectWatermarkCandidates=detectWatermarkCandidates;
})(typeof globalThis!=='undefined'?globalThis:this);

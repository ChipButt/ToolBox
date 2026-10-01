/*
Sprite Fusion Pixel Snapper - browser JavaScript adaptation for Chip In ToolBox.
Original project: https://github.com/Hugo-Dz/spritefusion-pixel-snapper
Copyright (c) 2025 Hugo Duprez
MIT License. See pixel-snapper-LICENSE.txt in this repository.

This module ports the open-source processing pipeline to browser-native ImageData:
palette quantisation -> edge profiles -> grid-step estimation -> elastic/stabilised
grid cuts -> modal-cell resampling -> optional custom-palette mapping.
*/
(() => {
  'use strict';

  const DEFAULTS = {
    colors: 16,
    pixelSize: null,
    palette: null,
    maxKMeansIterations: 15,
    peakThresholdMultiplier: 0.2,
    peakDistanceFilter: 4,
    walkerSearchWindowRatio: 0.35,
    walkerMinSearchWindow: 2,
    walkerStrengthThreshold: 0.5,
    minCutsPerAxis: 4,
    fallbackTargetSegments: 64,
    maxStepRatio: 1.8
  };

  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const rgbKey = (r,g,b,a=255) => ((r<<24)|(g<<16)|(b<<8)|a) >>> 0;
  const keyRGBA = key => [(key>>>24)&255,(key>>>16)&255,(key>>>8)&255,key&255];
  const distSq = (a,b) => {
    const dr=a[0]-b[0], dg=a[1]-b[1], db=a[2]-b[2];
    return dr*dr+dg*dg+db*db;
  };
  const luma = (r,g,b) => .299*r+.587*g+.114*b;

  function seeded(seed=42){
    let s=seed>>>0;
    return () => {
      s=(Math.imul(s,1664525)+1013904223)>>>0;
      return s/4294967296;
    };
  }

  function normalizePalette(palette){
    if(!palette) return null;
    return palette.map(c=>{
      if(Array.isArray(c)) return c.slice(0,3).map(v=>clamp(Math.round(v),0,255));
      const h=String(c).replace('#','').trim();
      if(!/^[0-9a-f]{6}$/i.test(h)) throw new Error('Palette colours must be six-digit hex values.');
      return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];
    });
  }

  function quantizeImage(imageData,k=16){
    const {width,height,data}=imageData;
    const opaqueCount=(()=>{let n=0;for(let i=3;i<data.length;i+=4)if(data[i])n++;return n})();
    if(!opaqueCount) return new ImageData(new Uint8ClampedArray(data),width,height);
    const maxSamples=60000,step=Math.max(1,Math.ceil(opaqueCount/maxSamples)),pixels=[];
    let seen=0;
    for(let i=0;i<data.length;i+=4) if(data[i+3]){
      if(seen%step===0)pixels.push([data[i],data[i+1],data[i+2]]);
      seen++;
    }
    k=Math.max(1,Math.min(Math.round(k)||16,pixels.length,256));
    const rng=seeded(42);
    const centroids=[pixels[Math.floor(rng()*pixels.length)].slice()];
    const distances=new Float64Array(pixels.length); distances.fill(Infinity);

    for(let c=1;c<k;c++){
      let sum=0;
      const last=centroids[centroids.length-1];
      for(let i=0;i<pixels.length;i++){
        const d=distSq(pixels[i],last);
        if(d<distances[i]) distances[i]=d;
        sum+=distances[i];
      }
      if(sum<=0){centroids.push(pixels[Math.floor(rng()*pixels.length)].slice());continue}
      let pick=rng()*sum,chosen=pixels.length-1;
      for(let i=0;i<distances.length;i++){pick-=distances[i];if(pick<=0){chosen=i;break}}
      centroids.push(pixels[chosen].slice());
    }

    let previous=centroids.map(c=>c.slice());
    for(let iteration=0;iteration<15;iteration++){
      const sums=Array.from({length:k},()=>[0,0,0]), counts=new Uint32Array(k);
      for(const p of pixels){
        let best=0,bestD=Infinity;
        for(let c=0;c<k;c++){const d=distSq(p,centroids[c]);if(d<bestD){bestD=d;best=c}}
        sums[best][0]+=p[0];sums[best][1]+=p[1];sums[best][2]+=p[2];counts[best]++;
      }
      for(let c=0;c<k;c++) if(counts[c]) centroids[c]=sums[c].map(v=>v/counts[c]);
      if(iteration){
        let movement=0;
        for(let c=0;c<k;c++) movement=Math.max(movement,distSq(centroids[c],previous[c]));
        if(movement<.01) break;
      }
      previous=centroids.map(c=>c.slice());
    }

    const out=new Uint8ClampedArray(data.length);
    const cache=new Map();
    for(let i=0;i<data.length;i+=4){
      const a=data[i+3];
      if(!a){out[i]=data[i];out[i+1]=data[i+1];out[i+2]=data[i+2];out[i+3]=0;continue}
      const key=(data[i]<<16)|(data[i+1]<<8)|data[i+2];
      let best=cache.get(key);
      if(!best){
        const p=[data[i],data[i+1],data[i+2]];let bestD=Infinity;
        for(const c of centroids){const d=distSq(p,c);if(d<bestD){bestD=d;best=c}}
        best=best.map(v=>clamp(Math.round(v),0,255));cache.set(key,best);
      }
      out[i]=best[0];out[i+1]=best[1];out[i+2]=best[2];out[i+3]=a;
    }
    return new ImageData(out,width,height);
  }

  function computeProfiles(imageData){
    const {width:w,height:h,data}=imageData;
    if(w<3||h<3) throw new Error('Image too small (minimum 3×3).');
    const cols=new Float64Array(w),rows=new Float64Array(h);
    const gray=(x,y)=>{
      const i=(y*w+x)*4;
      return data[i+3] ? luma(data[i],data[i+1],data[i+2]) : 0;
    };
    for(let y=0;y<h;y++) for(let x=1;x<w-1;x++) cols[x]+=Math.abs(gray(x+1,y)-gray(x-1,y));
    for(let x=0;x<w;x++) for(let y=1;y<h-1;y++) rows[y]+=Math.abs(gray(x,y+1)-gray(x,y-1));
    return [Array.from(cols),Array.from(rows)];
  }

  function estimateStep(profile,cfg){
    if(!profile.length) return null;
    const max=Math.max(...profile);
    if(!max) return null;
    const threshold=max*cfg.peakThresholdMultiplier,peaks=[];
    for(let i=1;i<profile.length-1;i++) if(profile[i]>threshold&&profile[i]>profile[i-1]&&profile[i]>profile[i+1]) peaks.push(i);
    if(peaks.length<2) return null;
    const clean=[peaks[0]];
    for(let i=1;i<peaks.length;i++) if(peaks[i]-clean[clean.length-1]>(cfg.peakDistanceFilter-1)) clean.push(peaks[i]);
    if(clean.length<2) return null;
    const diffs=[];for(let i=1;i<clean.length;i++) diffs.push(clean[i]-clean[i-1]);
    diffs.sort((a,b)=>a-b);return diffs[Math.floor(diffs.length/2)];
  }

  function resolveSteps(sx,sy,w,h,cfg){
    if(cfg.pixelSize!=null) return [cfg.pixelSize,cfg.pixelSize];
    if(sx!=null&&sy!=null){
      const ratio=Math.max(sx,sy)/Math.max(.0001,Math.min(sx,sy));
      if(ratio>cfg.maxStepRatio){const s=Math.min(sx,sy);return[s,s]}
      const a=(sx+sy)/2;return[a,a];
    }
    if(sx!=null) return[sx,sx];
    if(sy!=null) return[sy,sy];
    const s=Math.max(1,Math.min(w,h)/cfg.fallbackTargetSegments);return[s,s];
  }

  function walk(profile,step,limit,cfg){
    if(!profile.length) throw new Error('Cannot detect a grid from an empty edge profile.');
    const cuts=[0],search=Math.max(step*cfg.walkerSearchWindowRatio,cfg.walkerMinSearchWindow);
    const mean=profile.reduce((a,b)=>a+b,0)/profile.length;
    let pos=0;
    while(pos<limit){
      const target=pos+step;
      if(target>=limit){cuts.push(limit);break}
      const start=Math.max(Math.floor(target-search),Math.floor(pos+1));
      const end=Math.min(Math.floor(target+search),limit);
      if(end<=start){pos=target;continue}
      let bestVal=-1,best=start;
      for(let i=start;i<end;i++) if(profile[i]>bestVal){bestVal=profile[i];best=i}
      if(bestVal>mean*cfg.walkerStrengthThreshold){cuts.push(best);pos=best}else{cuts.push(Math.floor(target));pos=target}
    }
    return cuts;
  }

  function sanitizeCuts(cuts,limit){
    const set=new Set([0,limit]);
    for(let v of cuts) set.add(clamp(Math.round(v),0,limit));
    return [...set].sort((a,b)=>a-b);
  }

  function snapUniform(profile,limit,targetStep,cfg,minRequired){
    if(limit===0) return[0]; if(limit===1) return[0,1];
    let cells=Number.isFinite(targetStep)&&targetStep>0?Math.round(limit/targetStep):0;
    cells=Math.min(limit,Math.max(1,minRequired-1,cells));
    const cellWidth=limit/cells,search=Math.max(cellWidth*cfg.walkerSearchWindowRatio,cfg.walkerMinSearchWindow);
    const mean=profile.length?profile.reduce((a,b)=>a+b,0)/profile.length:0,cuts=[0];
    for(let n=1;n<cells;n++){
      const target=cellWidth*n,prev=cuts[cuts.length-1];if(prev+1>=limit)break;
      let start=Math.max(Math.floor(target-search),prev+1,0),end=Math.min(Math.ceil(target+search),limit-1);
      if(end<start)end=start;
      let best=Math.min(start,profile.length-1),bestVal=-1;
      for(let i=start;i<=Math.min(end,profile.length-1);i++)if(profile[i]>bestVal){bestVal=profile[i];best=i}
      if(bestVal<mean*cfg.walkerStrengthThreshold) best=clamp(Math.round(target),prev+1,limit-1);
      cuts.push(best);
    }
    cuts.push(limit);return sanitizeCuts(cuts,limit);
  }

  function stabilizeCuts(profile,cuts,limit,siblingCuts,siblingLimit,cfg){
    if(!limit)return[0];
    cuts=sanitizeCuts(cuts,limit);
    const minRequired=Math.min(limit+1,Math.max(2,cfg.minCutsPerAxis));
    const cells=Math.max(0,cuts.length-1),siblingCells=Math.max(0,siblingCuts.length-1);
    const siblingHas=siblingLimit>0&&siblingCells>=minRequired-1&&siblingCells>0;
    const skew=siblingHas&&cells>0&&(()=>{
      const a=limit/cells,b=siblingLimit/siblingCells,r=a/b;return r>cfg.maxStepRatio||r<1/cfg.maxStepRatio;
    })();
    if(cuts.length>=minRequired&&!skew)return cuts;
    let target=siblingHas?siblingLimit/siblingCells:
      cfg.fallbackTargetSegments>1?limit/cfg.fallbackTargetSegments:
      cells>0?limit/cells:limit;
    if(!Number.isFinite(target)||target<=0)target=1;
    return snapUniform(profile,limit,target,cfg,minRequired);
  }

  function stabilizeBoth(px,py,cols,rows,w,h,cfg){
    let c=stabilizeCuts(px,cols,w,rows,h,cfg),r=stabilizeCuts(py,rows,h,cols,w,cfg);
    const cs=Math.max(1,c.length-1),rs=Math.max(1,r.length-1),cw=w/cs,rh=h/rs,ratio=Math.max(cw,rh)/Math.max(.001,Math.min(cw,rh));
    if(ratio>cfg.maxStepRatio){
      const target=Math.min(cw,rh);
      if(cw>target*1.2)c=snapUniform(px,w,target,cfg,cfg.minCutsPerAxis);
      if(rh>target*1.2)r=snapUniform(py,h,target,cfg,cfg.minCutsPerAxis);
    }
    return[c,r];
  }

  function resample(imageData,cols,rows){
    if(cols.length<2||rows.length<2)throw new Error('Insufficient grid cuts for resampling.');
    const w=imageData.width,data=imageData.data,outW=cols.length-1,outH=rows.length-1,out=new Uint8ClampedArray(outW*outH*4);
    for(let yy=0;yy<outH;yy++)for(let xx=0;xx<outW;xx++){
      const counts=new Map();
      for(let y=rows[yy];y<rows[yy+1];y++)for(let x=cols[xx];x<cols[xx+1];x++){
        const i=(y*w+x)*4,key=rgbKey(data[i],data[i+1],data[i+2],data[i+3]);
        counts.set(key,(counts.get(key)||0)+1);
      }
      let best=0,bestCount=-1;
      for(const [key,count] of counts) if(count>bestCount||(count===bestCount&&key<best)){best=key;bestCount=count}
      const [r,g,b,a]=keyRGBA(best),q=(yy*outW+xx)*4;
      out[q]=r;out[q+1]=g;out[q+2]=b;out[q+3]=a;
    }
    return new ImageData(out,outW,outH);
  }

  function nearestPalette(rgb,palette){
    let best=palette[0],bestD=Infinity;
    for(const c of palette){const d=distSq(rgb,c);if(d<bestD){bestD=d;best=c}}
    return best;
  }

  function applyPalette(imageData,palette){
    palette=normalizePalette(palette);if(!palette?.length)throw new Error('Custom palette is empty.');
    const out=new Uint8ClampedArray(imageData.data),cache=new Map();
    for(let i=0;i<out.length;i+=4){
      if(!out[i+3])continue;
      const key=(out[i]<<16)|(out[i+1]<<8)|out[i+2];
      let c=cache.get(key);
      if(!c){c=nearestPalette([out[i],out[i+1],out[i+2]],palette);cache.set(key,c)}
      out[i]=c[0];out[i+1]=c[1];out[i+2]=c[2];
    }
    return new ImageData(out,imageData.width,imageData.height);
  }

  function process(imageData,options={}){
    if(!(imageData instanceof ImageData)) throw new Error('Pixel Snapper expects browser ImageData.');
    const cfg={...DEFAULTS,...options};
    cfg.colors=Math.max(1,Math.min(256,Math.round(cfg.colors)||16));
    cfg.pixelSize=cfg.pixelSize==null||cfg.pixelSize===''?null:Number(cfg.pixelSize);
    if(cfg.pixelSize!=null&&(!Number.isFinite(cfg.pixelSize)||cfg.pixelSize<1||cfg.pixelSize>Math.min(imageData.width,imageData.height)/2)){
      throw new Error('Pixel size override is outside the valid image range.');
    }
    const analysis=quantizeImage(imageData,cfg.colors);
    const [px,py]=computeProfiles(analysis);
    const [sx,sy]=resolveSteps(estimateStep(px,cfg),estimateStep(py,cfg),imageData.width,imageData.height,cfg);
    const rawCols=walk(px,sx,imageData.width,cfg),rawRows=walk(py,sy,imageData.height,cfg);
    const [cols,rows]=stabilizeBoth(px,py,rawCols,rawRows,imageData.width,imageData.height,cfg);
    let output=resample(analysis,cols,rows);
    if(cfg.palette?.length)output=applyPalette(output,cfg.palette);
    return{imageData:output,pixelSize:(sx+sy)/2,cols,rows,sourceWidth:imageData.width,sourceHeight:imageData.height};
  }

  window.ToolBoxPixelSnapper={process,quantizeImage,applyPalette,normalizePalette,license:'MIT',source:'Hugo-Dz/spritefusion-pixel-snapper'};
})();

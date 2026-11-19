export const WIDTH=960, HEIGHT=1200, FPS=24, FRAMES=252;
const motion=[[-4,-3,-1.3],[2,-2,1],[3,2,-.8],[-2,3,1.1],[0,-3,-.9],[2,1,.7]];
const shifts=[[-2,0],[0,-2],[2,1],[-1,2],[1,-2],[0,1]];
export async function loadImage(url){
  const image=new Image(); image.crossOrigin='anonymous'; image.src=url;
  await image.decode(); return image;
}
// The source renderers fit the visible artwork, ignoring transparent margins.
export function visibleBounds(image){
  const canvas=document.createElement('canvas');
  canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  ctx.drawImage(image,0,0);
  const {width,height}=canvas,rgba=ctx.getImageData(0,0,width,height).data;
  let left=width,right=-1,top=height,bottom=-1;
  for(let y=0;y<height;y++){
    for(let x=0,alpha=(y*width)*4+3;x<width;x++,alpha+=4){
      if(!rgba[alpha])continue;
      if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;bottom=y;
    }
  }
  canvas.width=0;canvas.height=0;
  if(right<left)throw Error('Empty artwork');
  return [left,top,right-left+1,bottom-top+1];
}
export async function loadArt(template){
  const names=new Set([...template.frames,...template.brush,...template.panels||[],template.intro].filter(Boolean));
  const art=new Map(await Promise.all([...names].map(async name=>[name,await loadImage('art/'+name)])));
  await document.fonts.load('60px Knewave');return art;
}
function caption(ctx,copy,box,step){
  if(!copy.trim())return;
  ctx.save();ctx.translate(box.x+box.width/2,box.y+box.height/2);ctx.rotate((box.rotation||0)*Math.PI/180);
  let lines,size=box.fontSize;const words=copy.trim().split(/\s+/);
  for(;size>=6;size--){
    ctx.font=size+'px Knewave';lines=[''];
    for(const word of words){
      const last=lines.length-1,next=[lines[last],word].filter(Boolean).join(' ');
      if(lines[last]&&ctx.measureText(next).width>box.width)lines.push(word);else lines[last]=next;
    }
    if(lines.length<=(box.maxLines||1)&&lines.length*size*1.08<=box.height&&lines.every(line=>ctx.measureText(line).width<=box.width))break;
  }
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle=box.color||'#292520';
  lines.forEach((line,i)=>ctx.fillText(line,shifts[step][0],(i-(lines.length-1)/2)*size*1.08+shifts[step][1],box.width));ctx.restore();
}
export function draw(ctx,t,art,scenes,frame){
  const tick=Math.floor(frame/4),state=tick%6,phase=Math.floor(frame/84),local=frame%84;
  const poster=t.kind==='poster',forward=phase%2===0;
  function scene(index,view){
    const sheet=art.get(t.frames[index]||t.frames[0]),col=tick%Math.round(sheet.width/WIDTH);
    ctx.drawImage(sheet,col*WIDTH,0,WIDTH,HEIGHT,0,0,WIDTH,HEIGHT);
    if(index<0){if(t.intro)ctx.drawImage(art.get(t.intro),0,0);return}
    if(t.panels)ctx.drawImage(art.get(t.panels[state]),0,0);
    const data=scenes[index],image=data.images[view]||data.images[view-1]||data.images[0];
    caption(ctx,data.title,t.title_text,state);caption(ctx,data.price,t.price_text,state);
    if(!image)return;
    const box=t.mockup,[dx,dy,angle]=poster||t.kind==='brand'?motion[state]:[0,0,0];
    const bounds=image.artBounds||[0,0,image.width,image.height];
    const scale=Math.min((box.width-2*t.pad)/bounds[2],(box.height-2*t.pad)/bounds[3]);
    ctx.save();ctx.translate(box.x+box.width/2+dx,box.y+box.height/2+dy);ctx.rotate(((box.rotation||0)+angle)*Math.PI/180);
    const w=bounds[2]*scale,h=bounds[3]*scale;ctx.drawImage(image,...bounds,-w/2,-h/2,w,h);ctx.restore();
  }
  if(local>=12){scene(phase,local<36?0:local<60?1:2);return}
  scene(phase-1,2);
  const step=poster?local:Math.floor(local*9/12);
  const front=poster?-230+1430*step/11:-255+1480*step/8;
  const edge=new Path2D(),area=new Path2D();
  area.moveTo(forward?-500:1460,0);
  for(let y=0;y<=HEIGHT;y+=2){
    const wave=poster?26*Math.sin(y*.037)+10*Math.sin(y*.129+1.1):26*Math.sin(y*.045)+11*Math.sin(y*.13+2.1)+7*Math.sin(y*.25-1.2);
    const x=forward?front+wave:WIDTH-front-wave;
    if(y===0)edge.moveTo(x,y);else edge.lineTo(x,y);area.lineTo(x,y);
  }
  area.lineTo(forward?-500:1460,HEIGHT);area.closePath();ctx.save();ctx.clip(area);scene(phase,0);ctx.restore();
  if(poster){ctx.save();ctx.globalAlpha=.78;ctx.strokeStyle=['#e2ab4c','#dd6843','#3e908b'][phase];ctx.lineWidth=24;ctx.stroke(edge);ctx.restore()}
  else{const x=forward?front-315:WIDTH-front-270;ctx.drawImage(art.get(t.brush[phase]),x,0);ctx.drawImage(art.get(t.brush[(phase+1)%3]),x+[-108,92,-102][phase],0)}
}

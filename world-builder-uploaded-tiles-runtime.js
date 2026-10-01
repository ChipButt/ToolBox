/* Exact code-only conversion of the two uploaded 16px tilesheets.
   312 non-empty 16x16 assets preserving exact RGBA pixels. */
(() => {
  'use strict';
  const PACK=window.__WB_USER_TILE_PACK||'';
  try{delete window.__WB_USER_TILE_PACK}catch(_){}
  const assets=new Map(),canvases=new Map();

  function categoryForName(name){
    const m=name.match(/^(Dungeon|BigSet) r(\d+) c(\d+)$/);
    if(!m)return 'Props & Items';
    const sheet=m[1],y=Number(m[2]),x=Number(m[3]);
    if(sheet==='Dungeon'){
      if(y<=3)return x>=8?'Props & Items':'Walls & Structure';
      if(y===4){if(x===0)return'Furniture';if(x<=3)return'Walls & Structure';if(x<=7)return'Floors & Ground';return'Props & Items'}
      if(y===5){if(x<=3)return'Walls & Structure';if(x<=7)return'Floors & Ground';return'Furniture'}
      if(y===6){if(x<=3)return'Floors & Ground';if(x===4||x===5)return'Doors & Windows';if(x<=8)return'Furniture';return'Props & Items'}
      if(y===7)return x<=3?'Floors & Ground':'Furniture';
      if(y>=8){if(x<=1)return'Walls & Structure';if(x>=4&&x<=6)return'Decorations';if(x===7||x===8)return'Furniture';return'Props & Items'}
    }else{
      if(y<=20)return'Floors & Ground';
      if(y===21)return x<=5?'Floors & Ground':'Furniture';
      if(y===22||y===23)return'Furniture';
      if(y===24){if(x>=4&&x<=6)return'Nature';if(x===7)return'Decorations';return'Furniture'}
      if(y===25){if(x<=3)return'Furniture';if(x===4||x===5)return'Characters & NPCs';return'Props & Items'}
      if(y===26){if(x>=1&&x<=3)return'Floors & Ground';if(x===4)return'Doors & Windows';return'Props & Items'}
    }
    return'Props & Items'
  }

  function base64Bytes(value){const raw=atob(value),out=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)out[i]=raw.charCodeAt(i);return out}
  async function gunzip(value){const bytes=base64Bytes(value);if(typeof DecompressionStream!=='function')throw new Error('This browser does not support DecompressionStream.');const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));return new Uint8Array(await new Response(stream).arrayBuffer())}
  function readU16(b,p){return b[p]|(b[p+1]<<8)}
  function readU32(b,p){return (b[p]|(b[p+1]<<8)|(b[p+2]<<16)|(b[p+3]<<24))>>>0}
  function parse(b){
    let p=0,count=readU16(b,p);p+=2;const decoder=new TextDecoder();
    for(let a=0;a<count;a++){
      const nl=b[p++],name=decoder.decode(b.slice(p,p+nl));p+=nl;
      const width=readU16(b,p);p+=2,height=readU16(b,p);p+=2,pc=b[p++];
      const palette=b.slice(p,p+pc*4);p+=pc*4;const rc=readU32(b,p);p+=4;
      const rgba=new Uint8ClampedArray(width*height*4);let pixel=0;
      for(let r=0;r<rc;r++){const len=readU16(b,p);p+=2,ci=b[p++]*4;for(let n=0;n<len;n++,pixel++){const q=pixel*4;rgba[q]=palette[ci];rgba[q+1]=palette[ci+1];rgba[q+2]=palette[ci+2];rgba[q+3]=palette[ci+3]}}
      if(pixel!==width*height)throw new Error('Corrupt uploaded tile asset: '+name);
      assets.set(name,{name,width,height,rgba,category:categoryForName(name),pack:'uploaded-tiles'})
    }
    api.names=Object.freeze([...assets.keys()]);
    return api
  }
  function requireAsset(name){const a=assets.get(name);if(!a)throw new Error('Uploaded tile is still loading: '+name);return a}
  function canvas(name){if(canvases.has(name))return canvases.get(name);const a=requireAsset(name),c=document.createElement('canvas');c.width=a.width;c.height=a.height;const x=c.getContext('2d');x.imageSmoothingEnabled=false;x.putImageData(new ImageData(new Uint8ClampedArray(a.rgba),a.width,a.height),0,0);canvases.set(name,c);return c}
  function frame(name){return canvas(name)}
  function draw(ctx,name,x,y,options={}){const src=canvas(name),w=options.width??src.width,h=options.height??src.height;ctx.save();ctx.imageSmoothingEnabled=false;ctx.globalAlpha=options.alpha??1;if(options.flipX||options.flipY){ctx.translate(x+(options.flipX?w:0),y+(options.flipY?h:0));ctx.scale(options.flipX?-1:1,options.flipY?-1:1);ctx.drawImage(src,0,0,w,h)}else ctx.drawImage(src,x,y,w,h);ctx.restore()}
  function metadata(name){const a=assets.get(name);return a?{name:a.name,width:a.width,height:a.height,cell:null,category:a.category,pack:a.pack}:{name,width:16,height:16,cell:null,category:categoryForName(name),pack:'uploaded-tiles'}}
  const api={ready:null,names:Object.freeze([]),canvas,frame,draw,metadata,categoryForName,get(name){return requireAsset(name)}};
  api.ready=gunzip(PACK).then(parse);
  window.WorldBuilderSheetAssets=api;
})();
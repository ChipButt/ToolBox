// Index entries describe supplier photo layouts shared across printed designs.
import {poses,styles,overrides} from './cutout-data.js';
const OTHER=2;
const inspected=new Map();
function family(path){
  const folder=path.split('/')[2];
  if(folder?.startsWith('loader-'))return 'loader';
  return ['global-galleries','drinkware-five','tshirt-couples'].includes(folder)?folder:'other';
}
export function expectedTier(url,product){
  if(inspected.has(url))return inspected.get(url);
  const path=decodeURIComponent(new URL(url).pathname),type=product.standardProductTypeId;
  let layout=path.replace(product.id,'ITEM').replace(/\/loader-[0-9a-f]+\//,'/loader/');
  if(product.sourceManifest)layout=layout.replace(product.sourceManifest.replace(/\.json$/,''),'DESIGN');
  const exact=overrides[type+'|'+layout];
  if(exact!==undefined)return exact;
  const angle=path.match(/-(\d\d)\.png$/)?.[1]||'0';
  return styles[[type,family(path),angle].join('|')]??OTHER;
}
const masks=poses.map(([type,tier,encoded])=>({type,tier,bytes:Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))}));
const bitCounts=Array.from({length:256},(_,n)=>n.toString(2).replaceAll('0','').length);
export function verifiedTier(image,productType){
  if(!inspected.has(image.src))inspected.set(image.src,matchPose(image,productType));
  return inspected.get(image.src);
}
function matchPose(image,productType){
  const candidates=masks.filter(p=>p.type===productType);
  if(!candidates.length)return OTHER;
  const canvas=document.createElement('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.imageSmoothingQuality='high';
  ctx.drawImage(image,0,0,32,32);
  const {data}=ctx.getImageData(0,0,32,32),bytes=new Uint8Array(128);
  let transparent=0;
  for(let i=0;i<1024;i++){
    const alpha=data[i*4+3];
    if(alpha===0)transparent++;
    if(alpha>127)bytes[i>>3]|=128>>(i%8);
  }
  if(transparent<25)return OTHER;
  let best=27,tier=OTHER;
  for(const pose of candidates){
    let distance=0;
    for(let i=0;i<bytes.length&&distance<best;i++)distance+=bitCounts[bytes[i]^pose.bytes[i]];
    if(distance<best){best=distance;tier=pose.tier}
  }
  return tier;
}

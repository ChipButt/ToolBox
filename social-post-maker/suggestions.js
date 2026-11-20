import {expectedTier} from './cutouts.js';
const services={
  web:{title:'Website Design',price:'From £250',path:'web'},
  video:{title:'Video Creation',price:'Video content that works',path:'video'},
  events:{title:'Hospitality & Events',price:'Extra support when it matters',path:'events'},
  quizzes:{title:'Pub Quizzes',price:'A great night, sorted',path:'quizzes'},
  bingo:{title:'Bingo Nights',price:'Bring everyone together',path:'bingo'},
  voice:{title:'Voice Acting',price:'Bring your words to life',path:'voice'},
  admin:{title:'Business Admin',price:'Less paperwork. More progress.',path:'admin'},
  production:{title:'Production Support',price:'Make every shoot run smoothly',path:'production'}
};
export function serviceSuggestion(key){
  const service=services[key];
  if(!service)throw new Error('Unknown service selected.');
  const pool=Array.from({length:18},(_,i)=>{
    const id=String(i+1).padStart(2,'0');
    const url=new URL(`service-art/v5/${service.path}/${id}.png`,document.baseURI).href;
    return {url,design:id,style:`${service.path}-${id}`,tier:0};
  });
  return {title:service.title,price:service.price,views:1,pool};
}
export function typeTitle(type){
  const common={'standard-unisex-tshirt':'T-shirts','pullover-hoodie':'Hoodies','ceramic-mug':'Mugs','zip-hoodie':'Zip hoodies'};
  return common[type.id]||type.label;
}
export function merchSuggestion(type,slug,views,gallery,preferPeople=true){
  const pool=new Map();
  for(const d of type.designs){
    if(slug&&d.slug!==slug)continue;
    const prices=d.product.variants.filter(v=>v.active&&v.printfulSyncVariantId&&Number.isFinite(v.pricePence)).map(v=>v.pricePence);
    const price=prices.length?Math.min(...prices):d.fromPricePence;
    for(const [url,label] of gallery(d.product)){
      const angle=new URL(url).pathname.match(/[-_](\d{2})\.\w+$/);
      const style=angle?'angle-'+angle[1]:label==='Main image'?'hero':label.startsWith('Gallery ')?label:'colour view';
      if(!pool.has(url))pool.set(url,{url,design:d.slug,style,price,productType:type.id,tier:preferPeople?expectedTier(url,d.product):0});
    }
  }
  return {title:typeTitle(type),pool:[...pool.values()],views,preferPeople};
}
export function priceFor(items){
  const prices=items.map(item=>item?.price).filter(Number.isFinite);
  return prices.length?'From '+new Intl.NumberFormat('en-GB',{style:'currency',currency:'GBP'}).format(Math.min(...prices)/100):'';
}
export function selectImage(pool,used,excluded,swapping=false){
  const designs=new Map(),styles=new Map(),urls=new Map();
  for(const item of used.filter(Boolean)){
    for(const [counts,key] of [[designs,item.design],[styles,item.style],[urls,item.url]])counts.set(key,(counts.get(key)||0)+1);
  }
  let best=null,bestScore=null;
  for(const item of pool){
    if(excluded.has(item.url))continue;
    const repeats=urls.get(item.url)||0,tier=item.tier||0;
    const score=swapping?[tier,repeats]:[repeats,tier];
    score.push(designs.get(item.design)||0,styles.get(item.style)||0,Math.random());
    const difference=bestScore?score.findIndex((value,i)=>value!==bestScore[i]):-1;
    if(!bestScore||(difference>=0&&score[difference]<bestScore[difference])){bestScore=score;best=item}
  }
  return best;
}

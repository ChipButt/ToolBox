import {expectedTier} from './cutouts.js';
const services={
  web:{title:'Website Design',price:'From £250',art:['01','02','03']},
  video:{title:'Video Creation',price:'From £100',art:['04','05','06']},
  events:{title:'Hospitality & Events',price:'From £85',art:['07','08','09']}
};
export function serviceSuggestion(key){
  const {title,price,art}=services[key];
  return {title,price,views:1,pool:art.map(id=>({url:new URL('service-art/'+id+'.webp',document.baseURI).href,design:id,style:id}))};
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
      // Angle numbers identify equivalent mock-up styles across colours and designs.
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

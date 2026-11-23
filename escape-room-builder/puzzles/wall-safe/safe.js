/* Recessed limestone wall safe. Uses the room builder's prerequisite and completion events. */
(()=>{
  'use strict';
  const base=document.currentScript.src;
  const stone=new URL('../stone-dial/art/surround-limestone.jpg',base);
  const headEngraving=new URL('./traitors-head-engraving.svg',base);
  const style=document.createElement('style');
  style.textContent=`
  .ws-safe{position:relative;display:block;width:100%;aspect-ratio:1;padding:0;border:0;background:none;container-type:inline-size;filter:drop-shadow(.12em .18em .12em #160f0aa8)}
  .ws-safe span{position:absolute;display:block;pointer-events:none;box-sizing:border-box}
  .ws-safe:focus-visible{outline:2px solid #ecd2a5;outline-offset:3px}
  .ws-safe[aria-disabled=true]{cursor:default}
  .ws-body{inset:0;background:linear-gradient(130deg,#fff3ce28,#37291d40),url("${stone}") 61% 44%/155%;
    clip-path:polygon(3% 0,96% .5%,100% 4%,99.7% 97%,97% 100%,2% 99.6%,0 96%,.4% 3%);
    box-shadow:inset 1.2cqw 1.4cqw 1.4cqw #f4dfb790,inset -1.3cqw -1.5cqw 1.5cqw #38291fe8}
  .ws-body::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#ffe8bb66,transparent 29%,transparent 63%,#251c1699),url("${stone}") 68% 21%/128%;
    clip-path:polygon(evenodd,0 0,100% 0,100% 100%,0 100%,0 0,4% 4%,4% 96%,96% 96%,96% 4%,4% 4%)}
  .ws-body::after{content:'';position:absolute;inset:8%;border:1.7cqw solid;border-color:#4c3c2eba #b39a77 #c4ab88 #5c4935;box-shadow:0 0 .65cqw #20180ed9,inset 0 0 1cqw #1d150f}
  .ws-bead{inset:4.2%;border:.7cqw solid #59463390;box-shadow:.55cqw .65cqw .4cqw #e8d2a880,inset .38cqw .45cqw .5cqw #392b2080}
  .ws-cavity{inset:10%;overflow:hidden;background:#483c30 url("${stone}") 51% 36%/155%;background-blend-mode:multiply;
    box-shadow:inset 0 1.9cqw 2.6cqw #100d0a,inset 1.4cqw 0 2.5cqw #160f0c,inset -1cqw 0 1.6cqw #1e1914}
  .ws-back{inset:14% 10% 17%;background:linear-gradient(150deg,#17120ecf,#4533228a),url("${stone}") 10% 46%/130%;box-shadow:0 0 2cqw #19130d}
  .ws-shelf{inset:83% 0 0;background:linear-gradient(0deg,#634e32aa,#2b2017b8),url("${stone}") 10% 87%/145%;clip-path:polygon(10% 0,90% 0,100% 100%,0 100%);border-bottom:1cqw solid #8f765a}
  .ws-hinge{inset:10%;perspective:350cqw;perspective-origin:55% 42%}
  .ws-leaf{inset:0;transform-origin:0 50%;transform-style:preserve-3d}
  .ws-front,.ws-inner{inset:0;backface-visibility:hidden}
  .ws-front{background:linear-gradient(145deg,#dfcfad12,#41332328),url("${stone}") 28% 67%/183%;box-shadow:inset .5cqw .65cqw .65cqw #efd4a960,inset -.7cqw -.8cqw 1cqw #34281f,0 0 1cqw .6cqw #1b1510}
  /* Head is a material detail inside the rotating door FACE background. There
     is no world-space icon: the cut shares perspective, hinges and animation. */
  .ws-front.ws-front-head{
    background-image:url("${headEngraving}"),
      linear-gradient(145deg,#dfcfad12,#41332328),url("${stone}");
    background-position:center center,center center,28% 67%;
    background-size:100% 100%,cover,183%;
    background-repeat:no-repeat,no-repeat,repeat;
  }
  .ws-symbol{inset:24%;background:#392e2470;mask:var(--symbol) center/contain no-repeat}
  .ws-symbol-rim{inset:24%;transform:translate(.32cqw,.42cqw);background:#f0d7aa66;mask:var(--symbol) center/contain no-repeat}
  .ws-inner{transform:translateZ(-4cqw) rotateY(180deg);background:linear-gradient(100deg,#33281d70,#5e493444),url("${stone}") center/130%}
  .ws-edge{left:100%;top:0;height:100%;width:4cqw;transform-origin:0 50%;transform:rotateY(90deg);background:linear-gradient(90deg,#48352444,#352719b8),url("${stone}") center/auto 100%}
  `;
  document.head.append(style);
  function part(parent,className){
    const node=document.createElement('span');node.className=className;parent.append(node);return node;
  }
  function mount(target,p,onSolved,editing){
    const safe=document.createElement('div');safe.setAttribute('role','img');safe.className='ws-safe';target.append(safe);
    const body=part(safe,'ws-body');part(body,'ws-bead');
    const cavity=part(body,'ws-cavity');part(cavity,'ws-back');part(cavity,'ws-shelf');
    const leaf=part(part(safe,'ws-hinge'),'ws-leaf');const face=part(leaf,'ws-front');part(leaf,'ws-inner');part(leaf,'ws-edge');
    if(p.design?.symbol==='Traitors Head'){
      face.classList.add('ws-front-head');
      face.dataset.engraving='Traitors Head';
    }else if(p.design?.symbol){
      const engraving=(window.FaceSets?.get('Traitors dungeon talismans')||[]).find(f=>f.text===p.design.symbol);
      if(engraving){face.style.setProperty('--symbol','url("'+engraving.mask+'")');part(face,'ws-symbol-rim');part(face,'ws-symbol')}
    }
    let ready=false,opened=false,disposed=false,animation;
    function label(){
      safe.setAttribute('aria-label',p.name+(opened?' — open':' — locked'));
    }
    function open(){
      if(editing||!ready||opened||disposed)return;
      opened=true;label();
      const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
      const end='rotateY(-106deg)';
      animation=leaf.animate([{transform:'rotateY(0deg)'},{transform:end}],{duration:reduced?0:1300,easing:'cubic-bezier(.42,.02,.26,1)'});
      leaf.style.transform=end;
      animation.onfinish=()=>{if(!disposed)onSolved()};
    }
    label();
    return {setUnlocked(value){const newlyReady=value&&!ready;ready=value;label();
      if(newlyReady&&p.requires)open();
    },close(){},destroy(){disposed=true;animation?.cancel();safe.remove()}};
  }
  registerPuzzleType({id:'wall-safe',label:'Wall Safe',ratio:()=>1,mount,
    create(){const last=room.puzzles.filter(p=>p.type!=='escape-door'&&p.type!=='wall-safe').at(-1);
      return {id:crypto.randomUUID(),type:'wall-safe',name:'Wall Safe',x:50,y:50,size:19,requires:last?.id||'',finish:false,message:'',design:{version:1,opening:'auto'}}},
    validate(p){if(p.design?.version!==1||!['auto','tap'].includes(p.design.opening))throw Error('Invalid wall safe design')},
    inspect(p){
      const masks=window.FaceSets?.get('Traitors dungeon talismans')||[];
      field('Engraved silhouette',list([['','None'],['Traitors Head','Traitors Head (recessed)'],...masks.map(f=>[f.text,f.text])],p.design.symbol||'',v=>{p.design.symbol=v;render()}))
    }
  });
})();

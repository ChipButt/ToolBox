'use strict';
const StoneLogic = (() => {
  const relations = {
    at: ['is in chamber', (a,b)=>a===b], away: ['is outside chamber', (a,b)=>a!==b],
    with: ['shares a chamber with', (a,b)=>a===b], apart: ['is in a different chamber from', (a,b)=>a!==b],
    before: ['is somewhere left of', (a,b)=>a<b], after: ['is somewhere right of', (a,b)=>a>b],
    left: ['is immediately left of', (a,b)=>a+1===b], right: ['is immediately right of', (a,b)=>a===b+1],
    next: ['is beside', (a,b)=>Math.abs(a-b)===1]
  };
  const positional = op => op==='at'||op==='away';
  const seq = n=>Array.from({length:n},(_,i)=>i);
  const items = d=>d.categories.flatMap(c=>c.items);
  /* Optional V3 fixed cells; V1/V2 JSON remains readable. A locked stone always shows the solution tile. */
  const fixedPositions=d=>d.categories.map((c,r)=>Array.from({length:d.n},(_,i)=>d.fixed?.[r]?.[i]===true));
  const themes={
    Egyptian:{
      place:'Tomb',title:'The last procession',
      opening:'At dusk I followed the embalmers from door to door. Before the valley gates closed, I cut this account into the stone.',
      sites:['Painted Sky','Lotus Gate','Silent Reed','Sun Vault','West Wind','Star Well'],
      groups:[
        ['Pharaoh','Khufu','Hatshepsut','Djoser','Ramesses','Sneferu','Seti'],
        ['Animal','Ibis','Cat','Jackal','Falcon','Cobra','Crocodile'],
        ['Drink','Barley beer','Date wine','Milk','Grape wine','Water','Fig wine'],
        ['Food','Dates','Figs','Bread','Grapes','Honey','Lentils'],
        ['Precious stone','Carnelian','Turquoise','Lapis lazuli','Amethyst','Jasper','Garnet'],
        ['Headdress','Ochre','Blue','White','Red','Green','Gold'],
        ['God idol','Horus','Isis','Osiris','Anubis','Thoth','Bastet']
      ],
      entry:(p,s)=>'We laid '+p+' to rest at '+s+'.',
      intro:p=>'For '+p+' we ',
      verbs:['carved the likeness of the $','poured $','set out $','laid down a piece of $','folded the $ headdress','raised an idol of $'],
      neighbour:(ref,phrase)=>'At the very next tomb to the right of '+ref+'’s we '+phrase+'.'
    },
    Traitor:{
      place:'Dungeon',title:'The gaoler’s confession',
      opening:'When the council broke up, I led the traitors below the keep. I had one lantern and a ledger with half its leaves torn out.',
      sites:['The Oubliette','Crow Tower','Ash Vault','Iron Deep','Bell Pit','Frost Cell'],
      groups:[
        ['Traitor','Mara','Silas','Agnes','Edric','Blythe','Rowan'],
        ['Alias','Wren','Fox','Moth','Wolf','Adder','Magpie'],
        ['Cloak','Russet','Indigo','Grey','Black','Violet','Ivory'],
        ['Signet','Rose','Thorn','Hare','Spider','Stag','Owl'],
        ['Keepsake','Locket','Thimble','Flute','Spindle','Comb','Die'],
        ['Cipher word','Dawn','Ember','Hush','Mist','Fable','Hollow'],
        ['Betrayal','Sold the map','Hid the seal','Forged a writ','Cut the rope','Stole the keys','Burned the pact']
      ],
      entry:(p,s)=>'I locked '+p+' in '+s+'.',
      intro:p=>'Beside '+p+'’s name I ',
      verbs:['recorded the alias “$”','noted the $ cloak','pressed the $ signet into wax','sketched the $','copied the cipher word “$”','wrote the confession “I $”'],
      neighbour:(ref,phrase)=>'At the next door immediately right of '+ref+'’s I '+phrase+'.'
    },
    Pirate:{
      place:'Ship',title:'The last tide',
      opening:'The harbour chain was due to rise at dawn. I went down the quay by lantern light to sign the captains out before the tide turned.',
      sites:['Black Gull','Sea Wraith','Mercy','North Star','Crimson Wake','Fortune'],
      groups:[
        ['Captain','Anne Vale','Kit Rook','Mina Salt','Ned Pike','Joss Flint','Inez Grey'],
        ['Flag','Skull','Hourglass','Serpent','Spear','Anchor','Crescent'],
        ['Cargo','Silk','Pepper','Tea','Indigo','Salt','Cloves'],
        ['Port','Nassau','Havana','Tortuga','Port Royal','Bridgetown','Kingston'],
        ['Mascot','Parrot','Monkey','Cat','Goat','Raven','Hound'],
        ['Treasure','Silver cup','Pearl','Gold chain','Ruby','Coral brooch','Ivory fan'],
        ['Figurehead','Mermaid','Griffin','Dolphin','Lion','Dragon','Siren']
      ],
      entry:(p,s)=>'I found Captain '+p+' aboard the '+s+'.',
      intro:p=>'Aboard '+p+'’s ship I ',
      verbs:['unfurled the $ flag','tallied the $ cargo','entered $ as the next port','fed the $','wrapped the treasure marked “$”','retouched the $ figurehead'],
      neighbour:(ref,phrase)=>'On the ship immediately to the right of '+ref+'’s I '+phrase+'.'
    }
  };
  function shuffle(row){
    const result=row.slice();
    for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]]}
    return result;
  }
  const location=(d,i)=>d.locations?.[i]||'Chamber '+(i+1);
  function generate(d){
    const clues=[],people=d.solution[0];
    // The character order remains deducible, but it is never narrated as a
    // complete ordered list. The story scatters these relations among other evidence.
    clues.push({a:people[0],op:'at',b:0});
    for(let i=1;i<d.n-1;i++)clues.push({a:people[i],op:'right',b:people[i-1]});
    for(let col=0;col<d.n;col++)for(let row=1;row<d.solution.length;row++){
      // Exactly one item per category follows by elimination. Mix relations
      // between belongings from DIFFERENT categories rather than listing
      // every possession against the same person.
      if(col===(row-1)%d.n)continue;
      const neighbour=col>0&&(row+col)%4===0;
      const referenceRow=row===1||((row+col)%3===0)?0:row-1;
      clues.push({
        a:d.solution[row][col],
        op:neighbour?'right':'with',
        b:d.solution[referenceRow][col-(neighbour?1:0)]
      });
    }
    d.clues=clues;
  }
  function themed(set='Egyptian',n=4){
    const theme=themes[set],categories=theme.groups.map(([name,...names],r)=>({name,items:names.slice(0,n).map((name,j)=>({id:r+'-'+j,name}))}));
    const solution=categories.map(c=>shuffle(c.items.map(t=>t.id)));
    const start=solution.map(row=>{const shift=1+Math.floor(Math.random()*(n-1));return row.slice(shift).concat(row.slice(0,shift))});
    const fixed=categories.map(()=>Array(n).fill(false));
    for(const [r,c] of [[0,0],[1,Math.min(2,n-1)],[2,1],[3,n-1]])if(r<fixed.length)fixed[r][c]=true;
    const d={version:1,set,n,locations:theme.sites.slice(0,n),categories,solution,start,fixed,clues:[],markers:false,target:''};
    generate(d);return d;
  }
  /* A story, not an answer key: every clue appears once, but related facts
     are deliberately distributed across different fragments of the journal.
     A stable content hash holds the order steady when the board redraws. */
  function storyHash(value){
    let h=2166136261;
    for(const ch of String(value))h=Math.imul(h^ch.charCodeAt(0),16777619)>>>0;
    return h>>>0;
  }
  const diaryBeats={
    Egyptian:[
      'I had to brush sand from the next lines before I could read them.',
      'The priest had left another scattered set of marks in the dust.',
      'A little farther along the wall, the stone remembered what the scroll had lost.',
      'Several signs survived where the torch smoke had blackened the carving.',
      'I copied the fragments in the order I uncovered them, not the order of the burials.',
      'Near the sealed entrance, I could still make out another few details.'
    ],
    Traitor:[
      'The next page was damaged, but I could still follow the scratched entries.',
      'The gaoler had written these details in the margin, away from the names.',
      'Beneath the soot on the wall, I found a few more marks.',
      'The ledger skipped between cells rather than keeping each prisoner together.',
      'A torn leaf revealed another handful of the council’s secrets.',
      'I remembered the corridor by the sounds behind its doors.'
    ],
    Pirate:[
      'Salt had blurred the ink, leaving only these scattered entries.',
      'The next marks were written on the back of a damp cargo tally.',
      'By lantern light I copied a few lines from the harbour ledger.',
      'The account jumped from ship to ship as the tide changed.',
      'Another torn page lay beneath the rope and canvas.',
      'Before dawn I found one more fragment of the manifest.'
    ]
  };
  function story(d){
    const theme=themes[d.set];
    if(!theme)return {title:'Inscriptions',paragraphs:d.clues.map(c=>clueText(d,c))};
    const lookup=new Map(items(d).map(t=>[t.id,t.name]));
    const name=id=>lookup.get(id)||String(id);
    const place=theme.place.toLowerCase();
    const variants=(a,b,op,i)=>{
      const choice=storyHash(d.set+'|'+a+'|'+op+'|'+b+'|'+i)%3;
      const options={
        with:[
          'The '+place+' associated with '+b+' also bore '+a+'.',
          'I found '+a+' recorded in the same '+place+' as '+b+'.',
          'A broken line joined '+a+' and '+b+' within one '+place+'.'
        ],
        apart:[
          'The marks '+a+' and '+b+' belonged to different '+place+'s.',
          'I was certain that '+a+' was not in the same '+place+' as '+b+'.',
          'No single '+place+' held both '+a+' and '+b+'.'
        ],
        right:[
          'The '+place+' marked '+a+' stood immediately to the right of the one marked '+b+'.',
          'The next '+place+' directly right of '+b+' held '+a+'.',
          'I passed the mark '+b+'; on the very next door to its right was '+a+'.'
        ],
        left:[
          'The '+place+' marked '+a+' stood immediately to the left of the one marked '+b+'.',
          'The next '+place+' directly left of '+b+' held '+a+'.',
          'On the door just left of '+b+', I found '+a+'.'
        ],
        next:[
          'The '+place+' bearing '+a+' was immediately beside the one bearing '+b+'.',
          'There was no door between the '+place+' of '+a+' and that of '+b+'.',
          'The marks '+a+' and '+b+' belonged to neighbouring '+place+'s.'
        ],
        before:[
          'Reading left to right, '+a+' appeared somewhere before '+b+'.',
          'The '+place+' associated with '+a+' lay to the left of the one marked '+b+'.',
          'I encountered '+a+' earlier along the row than '+b+'.'
        ],
        after:[
          'Reading left to right, '+a+' appeared somewhere after '+b+'.',
          'The '+place+' associated with '+a+' lay to the right of the one marked '+b+'.',
          'I reached '+a+' later along the row than '+b+'.'
        ]
      };
      return (options[op]||[clueText(d,{a,op,b})])[choice%((options[op]||[0]).length)];
    };
    const clueSentence=(c,i)=>{
      const a=name(c.a);
      if(c.op==='at'){
        const loc=location(d,c.b);
        return [
          'At '+loc+', the record named '+a+'.',
          'The mark '+a+' belonged to '+loc+'.',
          'It was at '+loc+' that I found the sign '+a+'.'
        ][storyHash(a+'|'+loc+'|'+i)%3];
      }
      if(c.op==='away'){
        return 'I found no trace of '+a+' at '+location(d,c.b)+'.';
      }
      return variants(a,name(c.b),c.op,i);
    };
    const source=d.clues.map((c,i)=>({
      c,i,
      anchor:c.op==='at'||c.op==='away'?c.a:c.b,
      group:d.categories.findIndex(row=>row.items.some(t=>t.id===c.a)),
      hash:storyHash(d.set+'|'+c.a+'|'+c.op+'|'+c.b)
    })).sort((a,b)=>a.hash-b.hash||a.i-b.i);
    const paragraphs=[
      theme.opening+' I counted the '+place+'s from left to right, but the surviving fragments were not written in that order.'
    ];
    const beats=diaryBeats[d.set]||[];
    const recent=[];
    let section=0;
    while(source.length){
      const chosen=[],anchors=new Set(),groups=new Set();
      for(let i=0;i<4&&source.length;i++){
        let winner=0,best=Infinity;
        for(let j=0;j<source.length;j++){
          const item=source[j],score=
            (anchors.has(item.anchor)?14:0)+
            (groups.has(item.group)?6:0)+
            (recent.includes(item.anchor)?4:0)+
            (chosen.length&&chosen.at(-1).c.op===item.c.op?1.5:0)+
            // Stable tie-breaking; no new randomness on each redraw.
            item.hash/4294967296;
          if(score<best){winner=j;best=score}
        }
        const item=source.splice(winner,1)[0];
        chosen.push(item);anchors.add(item.anchor);groups.add(item.group);
        recent.push(item.anchor);if(recent.length>3)recent.shift();
      }
      const beat=beats[section%beats.length]||'I copied the next fragments.';
      paragraphs.push(beat+' '+chosen.map(item=>clueSentence(item.c,item.i)).join(' '));
      section++;
    }
    return {title:theme.title,paragraphs};
  }
  function structure(d){
    const fail=()=>{throw Error('Check the rows, tile assignments and clue references.')};
    if(d?.version!==1||![3,4,5,6].includes(d.n)||!Array.isArray(d.categories)||d.categories.length<2||d.categories.length>7||typeof d.markers!=='boolean')fail();
    if(d.set&&(!Object.hasOwn(themes,d.set)||d.categories.length!==7||!Array.isArray(d.locations)||d.locations.length!==d.n||d.locations.some(s=>typeof s!=='string'||!s.trim())||new Set(d.locations.map(s=>s.trim().toLowerCase())).size!==d.n))fail();
    const ids=new Set();
    for(const [i,c] of d.categories.entries()){
      if(!c.name?.trim()||c.items.length!==d.n)fail();
      for(const t of c.items){
        if(typeof t.id!=='string'||!t.id||ids.has(t.id)||!t.name?.trim()||(t.mask&&!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(t.mask)))fail();
        ids.add(t.id);
      }
      for(const grid of [d.start,d.solution]){
        const row=grid?.[i];
        if(grid?.length!==d.categories.length||row?.length!==d.n||!c.items.every(t=>row.includes(t.id)))fail();
      }
    }
    if(d.fixed!==undefined){
      if(!Array.isArray(d.fixed)||d.fixed.length!==d.categories.length||d.fixed.some(row=>!Array.isArray(row)||row.length!==d.n||row.some(value=>typeof value!=='boolean')))fail();
    }
    if(d.target!==''&&!ids.has(d.target)||!Array.isArray(d.clues)||d.clues.length>100)fail();
    for(const {a,op,b} of d.clues)if(!Object.hasOwn(relations,op)||!ids.has(a)||(positional(op)?!seq(d.n).includes(b):!ids.has(b)))fail();
  }
  function clueText(d,c){
    const name=id=>items(d).find(t=>t.id===id).name;
    return name(c.a)+' '+relations[c.op][0]+' '+(positional(c.op)?c.b+1:name(c.b))+'.';
  }
  // Domains contain the possible chambers for each tile. Propagate pair constraints,
  // then branch on the smallest remaining domain until a witness is found.
  function validate(d){
    structure(d);
    const tiles=items(d), index=new Map(tiles.map((t,i)=>[t.id,i]));
    const domains=tiles.map(()=>seq(d.n)), edges=[];
    const expected=[];
    for(const [i,t] of tiles.entries())expected[i]=d.solution[Math.floor(i/d.n)].indexOf(t.id);
    const fixed=fixedPositions(d);
    for(const [r,row] of fixed.entries())for(const [c,yes] of row.entries())if(yes){
      const id=d.solution[r][c],tileIndex=index.get(id);domains[tileIndex]=[c];
      if(d.target===id)return 'The required target is already immovably placed. Choose another target or unlock this tile.';
    }
    for(const row of d.categories)for(const [i,t] of row.items.entries())for(const u of row.items.slice(i+1))edges.push([index.get(t.id),index.get(u.id),relations.apart[1]]);
    let matches=true;
    for(const c of d.clues){
      const a=index.get(c.a), test=relations[c.op][1];
      if(positional(c.op)){domains[a]=domains[a].filter(v=>test(v,c.b));matches&&=test(expected[a],c.b)}
      else{const b=index.get(c.b);matches&&=test(expected[a],expected[b]);if(a===b)domains[a]=domains[a].filter(v=>test(v,v));else edges.push([a,b,test])}
    }
    function witness(ds){
      let changed=true;
      while(changed){
        changed=false;
        for(const [a,b,test] of edges){
          const left=ds[a].filter(x=>ds[b].some(y=>test(x,y)));
          const right=ds[b].filter(y=>left.some(x=>test(x,y)));
          if(!left.length||!right.length)return false;
          changed ||= left.length!==ds[a].length||right.length!==ds[b].length;
          ds[a]=left;ds[b]=right;
        }
      }
      let k=-1;
      for(let i=0;i<ds.length;i++)if(ds[i].length>1&&(k<0||ds[i].length<ds[k].length))k=i;
      if(k<0)return ds.every(v=>v.length===1);
      return ds[k].some(v=>{const branch=ds.slice();branch[k]=[v];return witness(branch)});
    }
    if(!matches)return witness(domains.slice())?'Configured solution disagrees with the clues.':'Contradictory clues. No solution exists.';
    for(const i of d.target?[index.get(d.target)]:seq(tiles.length)){
      const alternative=domains.slice();alternative[i]=alternative[i].filter(v=>v!==expected[i]);
      if(alternative[i].length&&witness(alternative))return d.target?'The target tile can occupy several chambers.':'Multiple solutions. Add a clue.';
    }
    return '';
  }
  function complete(d,rows){
    return d.target?rows.some((r,i)=>r.includes(d.target)&&r.indexOf(d.target)===d.solution[i].indexOf(d.target)):rows.every((r,i)=>r.every((id,j)=>id===d.solution[i][j]));
  }
  return {sample:themed,themed,themes,generate,story,location,validate,structure,clueText,relations,positional,items,fixedPositions,complete};
})();

const S = { "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", "X-Content-Type-Options":"nosniff", "Referrer-Policy":"no-referrer" };
function reply(data,status=200){return new Response(JSON.stringify(data),{status,headers:S})}
const now=()=>new Date().toISOString();
const idOK=x=>/^[a-f0-9-]{36}$/.test(x||"");
function cleanData(x){const fields=['name','website','contact','email','phone','address','area','services','priorities','competitors','notes','package','status','googleSearchConsole','googleBusinessProfile','analytics','startDate'];let r={};for(const f of fields)r[f]=String(x?.[f]??'').trim().slice(0,f==='notes'?4000:1200);return r}
function num(v,max=1000000000){return v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=max?Number(v):null)}
function safeUrl(input){let u;try{u=new URL(input.startsWith('http')?input:'https://'+input)}catch{throw Error('Enter a valid website URL')};if(u.protocol!=='https:'&&u.protocol!=='http:')throw Error('Only HTTP or HTTPS websites can be audited');if(u.username||u.password||u.port)throw Error('Custom ports or credentials are not allowed');let h=u.hostname.toLowerCase();if(h==='localhost'||h.endsWith('.local')||h.endsWith('.internal')||h.endsWith('.test')||h.endsWith('.localhost')||h.includes(':')||/^\d+(\.\d+){3}$/.test(h))throw Error('Enter a public website domain');return u.origin}
const take=(html,re)=>{const m=html.match(re);return m?m[1].replace(/<[^>]*>/g,'').replace(/\s+/g,' ').trim().slice(0,500):''};
function attr(tag,key){const re=new RegExp('(?:^|\\s)'+key+'\\s*=\\s*["\\x27]([^"\\x27]*)["\\x27]','i');return tag.match(re)?.[1]||''}
function metaTag(html,key,value){for(const m of html.matchAll(/<meta\b[^>]*>/gi)){if(attr(m[0],key).toLowerCase()===value)return attr(m[0],'content')}return ''}
async function scan(website){
 const base=safeUrl(website),checks=[],notes=[];
 const f=async(path)=>{const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),9000);try{return await fetch(base+path,{redirect:'follow',signal:controller.signal,headers:{'User-Agent':'ChipInSEOAudit/1.0'},cf:{cacheTtl:0}})}finally{clearTimeout(timer)}};
 const r=await f('/');const html=(await r.text()).slice(0,700000);
 const title=take(html,/<title\b[^>]*>([\s\S]*?)<\/title>/i);
 const desc=metaTag(html,'name','description');
 const robots=metaTag(html,'name','robots');
 const h1s=[...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>m[1].replace(/<[^>]+>/g,'').trim()).slice(0,8);
 let canonical='';for(const m of html.matchAll(/<link\b[^>]*>/gi)){if(/\bcanonical\b/i.test(attr(m[0],'rel'))){canonical=attr(m[0],'href');break}}
 const xrobots=r.headers.get('x-robots-tag')||'';
 checks.push({label:'Homepage responds successfully',ok:r.status>=200&&r.status<300,detail:'HTTP '+r.status});
 checks.push({label:'HTTPS enabled',ok:new URL(r.url).protocol==='https:',detail:r.url});
 checks.push({label:'Descriptive page title exists',ok:!!title,detail:title||'No <title> found'});
 checks.push({label:'Meta description exists',ok:!!desc,detail:desc||'No description found'});
 checks.push({label:'One main H1 heading',ok:h1s.length===1,detail:h1s.length+' H1 headings: '+h1s.join(' / ')});
 checks.push({label:'Canonical URL declared',ok:!!canonical,detail:canonical||'No canonical link found'});
 checks.push({label:'Homepage not marked noindex',ok:!/noindex/i.test(robots+' '+xrobots),detail:(robots+' '+xrobots).trim()||'No noindex directive observed'});
 let robotStatus='Not checked',sitemapStatus='Not checked';
 try{const x=await f('/robots.txt');robotStatus='HTTP '+x.status;checks.push({label:'robots.txt accessible',ok:x.ok,detail:robotStatus})}catch(e){checks.push({label:'robots.txt accessible',ok:false,detail:e.message})}
 try{const x=await f('/sitemap.xml');sitemapStatus='HTTP '+x.status;checks.push({label:'sitemap.xml accessible',ok:x.ok,detail:sitemapStatus})}catch(e){checks.push({label:'sitemap.xml accessible',ok:false,detail:e.message})}
 notes.push('This is a homepage/technical spot-check, not a full site crawl or Google ranking audit.');
 notes.push('A missing standard /sitemap.xml path does not prove there is no sitemap; check robots.txt and Search Console.');
 notes.push('Passing these checks does not guarantee indexing or rankings.');
 return {website:base,checkedAt:now(),finalUrl:r.url,checks,title,description:desc,canonical,h1s,robots,xrobots,notes};
}
async function body(request){const s=await request.text();if(s.length>20000)throw Error('Request too large');return JSON.parse(s||'{}')}
async function client(env,id){return await env.DB.prepare('SELECT id,data,created_at,updated_at FROM clients WHERE id=?').bind(id).first()}
const html=String.raw`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#0c2b5e"><title>Chip In SEO Manager</title><link rel="stylesheet" href="https://chipbutt.github.io/ToolBox/seo-manager/app.css?v=1"></head><body><div id="app"><main style="padding:3rem;font-family:sans-serif">Loading SEO Manager…</main></div><script src="https://chipbutt.github.io/ToolBox/seo-manager/app.js?v=1" defer></script></body></html>`;
export default {async fetch(req,env){
 const u=new URL(req.url);
 if(u.hostname!=='seo.chipinworks.co.uk')return new Response('Not found',{status:404});
 if(u.pathname==='/favicon.ico')return new Response(null,{status:204});
 if(u.pathname==='/'&&req.method==='GET')return new Response(html,{headers:{"Content-Type":"text/html; charset=utf-8","Content-Security-Policy":"default-src 'none'; script-src https://chipbutt.github.io; style-src https://chipbutt.github.io 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'; font-src https://fonts.gstatic.com; base-uri 'none'; form-action 'self'; frame-ancestors 'none';","X-Content-Type-Options":"nosniff","Cache-Control":"no-store"}});
 if(!u.pathname.startsWith('/api/'))return new Response('Not found',{status:404});
 if(req.method!=='GET'&&req.headers.get('Origin')!==u.origin)return reply({error:'Invalid request origin'},403);
 try{
  if(u.pathname==='/api/health'&&req.method==='GET'){await env.DB.prepare('SELECT 1 AS ok').first();return reply({ok:true,version:'1.0.0'})}
  if(u.pathname==='/api/clients'&&req.method==='GET'){let x=await env.DB.prepare('SELECT id,data,created_at,updated_at FROM clients ORDER BY updated_at DESC LIMIT 300').all();return reply({clients:x.results.map(r=>({id:r.id,...JSON.parse(r.data),createdAt:r.created_at,updatedAt:r.updated_at}))})}
  if(u.pathname==='/api/clients'&&req.method==='POST'){const d=cleanData(await body(req));if(!d.name||!d.website)throw Error('Business name and website are required');safeUrl(d.website);let id=crypto.randomUUID(),time=now();await env.DB.prepare('INSERT INTO clients (id,created_at,updated_at,data) VALUES (?,?,?,?)').bind(id,time,time,JSON.stringify(d)).run();return reply({id,client:d},201)}
  if(u.pathname==='/api/export'&&req.method==='GET'){const [c,t,m,a]=await Promise.all(['clients','tasks','metrics','audits'].map(table=>env.DB.prepare('SELECT * FROM '+table).all()));return reply({format:'chipin-seo-backup',version:1,exportedAt:now(),clients:c.results,tasks:t.results,metrics:m.results,audits:a.results})}
  const p=u.pathname.match(/^\/api\/clients\/([a-f0-9-]{36})(?:\/(tasks|metrics|audit))?$/);if(!p)return reply({error:'Not found'},404);
  const id=p[1],section=p[2]||'',c=await client(env,id);if(!c)return reply({error:'Client not found'},404);
  if(!section&&req.method==='GET'){
    const [tasks,metrics,audits]=await Promise.all([
      env.DB.prepare('SELECT task_key,status,notes,updated_at FROM tasks WHERE client_id=?').bind(id).all(),
      env.DB.prepare('SELECT * FROM metrics WHERE client_id=? ORDER BY month ASC').bind(id).all(),
      env.DB.prepare('SELECT id,run_at,data FROM audits WHERE client_id=? ORDER BY id DESC LIMIT 8').bind(id).all()
    ]);
    return reply({id,client:JSON.parse(c.data),createdAt:c.created_at,updatedAt:c.updated_at,tasks:tasks.results,metrics:metrics.results,audits:audits.results.map(x=>({id:x.id,runAt:x.run_at,...JSON.parse(x.data)}))});
  }
  if(!section&&req.method==='PUT'){const d=cleanData(await body(req));if(!d.name||!d.website)throw Error('Business name and website are required');safeUrl(d.website);await env.DB.prepare('UPDATE clients SET data=?,updated_at=? WHERE id=?').bind(JSON.stringify(d),now(),id).run();return reply({ok:true})}
  if(section==='tasks'&&req.method==='PUT'){const x=await body(req);if(!/^[a-z0-9-]{2,80}$/.test(x.key||'')||!['todo','doing','done','na'].includes(x.status))throw Error('Invalid task');await env.DB.prepare('INSERT INTO tasks(client_id,task_key,status,notes,updated_at) VALUES(?,?,?,?,?) ON CONFLICT(client_id,task_key) DO UPDATE SET status=excluded.status,notes=excluded.notes,updated_at=excluded.updated_at').bind(id,x.key,x.status,String(x.notes||'').slice(0,1500),now()).run();return reply({ok:true})}
  if(section==='metrics'&&req.method==='PUT'){const x=await body(req);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(x.month||''))throw Error('Select a month');const vals=[num(x.clicks),num(x.impressions),num(x.position,100),num(x.gbp_website),num(x.gbp_calls),num(x.gbp_directions),num(x.enquiries)];if(vals.some((n,i)=>n!==null&&((i===2&&n>100)||n<0)))throw Error('Invalid metrics');await env.DB.prepare('INSERT INTO metrics(client_id,month,clicks,impressions,position,gbp_website,gbp_calls,gbp_directions,enquiries,notes,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(client_id,month) DO UPDATE SET clicks=excluded.clicks,impressions=excluded.impressions,position=excluded.position,gbp_website=excluded.gbp_website,gbp_calls=excluded.gbp_calls,gbp_directions=excluded.gbp_directions,enquiries=excluded.enquiries,notes=excluded.notes,updated_at=excluded.updated_at').bind(id,x.month,...vals,String(x.notes||'').slice(0,2000),now()).run();return reply({ok:true})}
  if(section==='audit'&&req.method==='POST'){const d=JSON.parse(c.data),r=await scan(d.website);await env.DB.prepare('INSERT INTO audits(client_id,run_at,data) VALUES (?,?,?)').bind(id,now(),JSON.stringify(r)).run();return reply({audit:r})}
  return reply({error:'Method not allowed'},405);
 }catch(err){return reply({error:String(err.message||err).slice(0,300)},400)}
}};

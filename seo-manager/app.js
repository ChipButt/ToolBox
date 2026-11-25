(function(){
'use strict';
const app=document.getElementById('app'),today=new Date().toISOString().slice(0,7);
let clients=[],detail=null,page='clients',tab='guide',message='',busy=false,workMonth=today;
const groups=[
['Research & baseline',[['intake','Confirm business details and permissions'],['baseline','Record baseline search/enquiry measurements'],['competitors','Research three local competitors'],['keywords','Map ten relevant search themes']]],
['Technical SEO',[['indexing','Check indexation and Search Console'],['robots','Review robots and XML sitemap'],['canonical','Check canonical URLs and redirects'],['crawl','Check crawlability and broken links'],['mobile','Check mobile experience and performance'],['schema','Validate structured data']]],
['On-page SEO',[['titles','Optimise titles and descriptions'],['headings','Review headings and content structure'],['pages','Optimise up to five pages'],['images','Review images and alt text'],['links','Improve internal links'],['accurate','Client confirms all factual changes']]],
['Local SEO',[['gbp','Optimise Google Business Profile'],['categories','Check categories, services and opening hours'],['listings','Check business directory consistency'],['reviews','Plan legitimate review improvements']]],
['Measurement & handover',[['gsc','Obtain Search Console access'],['analytics','Configure compliant analytics'],['enquiries','Agree meaningful enquiry tracking'],['verification','Verify technical changes'],['delivery','Deliver completion/baseline report'],['followup','30-day follow-up']]],
['Ongoing monthly work',[['m-search','Review search and indexing changes'],['m-competitors','Review competitors and priority searches'],['m-pages','Improve up to two priority pages'],['m-content','Make an accurate content update'],['m-gbp','Maintain Google Business Profile'],['m-report','Deliver monthly evidence and recommendations']]]
];
const tasks=groups.flatMap(g=>g[1]);
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function show(v){return v===null||v===undefined||v===''?'—':esc(v)}
function n(v){return v===null||v===undefined||v===''?'—':Number(v).toLocaleString('en-GB')}
function pct(a,b){return a!=null&&b>0?((a-b)/b>=0?'+':'')+Math.round(100*(a-b)/b)+'%':'—'}
function date(v){return v?new Date(v).toLocaleDateString('en-GB'):'—'}
function safeUrl(s){try{const u=new URL(/^https?:\/\//.test(s)?s:'https://'+s);return /^https?:$/.test(u.protocol)?u.href:'#'}catch{return '#'}}
function btn(t,a,c='alt'){return '<button class="button '+c+'" data-action="'+a+'">'+t+'</button>'}
function alertMsg(s,kind='success'){message='<div class="'+kind+'">'+esc(s)+'</div>';render()}
async function api(path,method='GET',payload){const r=await fetch(path,{method,credentials:'same-origin',headers:payload===undefined?{}:{'Content-Type':'application/json'},body:payload===undefined?undefined:JSON.stringify(payload)});let j;try{j=await r.json()}catch{throw Error('Server returned an unexpected response. Your login may have expired.')}if(!r.ok)throw Error(j.error||'Request failed');return j}
async function refresh(){clients=(await api('/api/clients')).clients||[]}
async function open(id,newtab='results'){detail=await api('/api/clients/'+id);const [g,i,w,invite]=await Promise.allSettled([api('/api/clients/'+id+'/gsc'),api('/api/clients/'+id+'/insights'),api('/api/clients/'+id+'/work'),api('/api/clients/'+id+'/intake')]);detail.gsc=g.status==='fulfilled'?g.value:{configured:false};detail.insights=i.status==='fulfilled'?i.value:{data:null,error:'Could not load Google results.'};detail.work=w.status==='fulfilled'?w.value.work:[];detail.intake=invite.status==='fulfilled'?invite.value:{link:null,submission:null};detail.intakeLinkUrl=detail.intake?.link?.url||null;page='client';tab=newtab;render()}
function status(key){const k=key.startsWith('m-')?'monthly-'+workMonth+'-'+key.slice(2):key;return detail.tasks.find(t=>t.task_key===k)||{status:'todo',notes:''}}
function progress(monthly=false){const t=tasks.filter(x=>x[0].startsWith('m-')===monthly),done=t.filter(x=>['done','na'].includes(status(x[0]).status)).length;return {done,total:t.length,pc:Math.round(100*done/t.length)}}
function field(key,label,value='',type='text',full=false){return '<div class="field '+(full?'full':'')+'"><label>'+label+'</label><input name="'+key+'" type="'+type+'" value="'+esc(value)+'"></div>'}
function textarea(key,label,value=''){return '<div class="field full"><label>'+label+'</label><textarea name="'+key+'">'+esc(value)+'</textarea></div>'}
function form(edit){const c=edit?detail.client:{},v=k=>c[k]||'';return '<form id="clientForm" data-edit="'+(edit?'yes':'no')+'"><div class="formgrid">'+field('name','Business name *',v('name'))+field('website','Website URL *',v('website'))+'<div class="field"><label>Website platform</label><select name="platform">'+[['unknown','Not sure / other'],['chipin','Built by Chip In'],['wix','Wix'],['wordpress','WordPress'],['squarespace','Squarespace'],['shopify','Shopify'],['other','Other external website']].map(([id,label])=>'<option value="'+id+'" '+((v('platform')||'unknown')===id?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+'<div class="field"><label>Permission to edit website</label><select name="siteAccess">'+[['not_requested','Not requested yet'],['requested','Awaiting client invitation'],['granted','Client has granted access'],['read_only','Read-only permission'],['declined','Client has declined permission']].map(([id,label])=>'<option value="'+id+'" '+((v('siteAccess')||'not_requested')===id?'selected':'')+'>'+label+'</option>').join('')+'</select></div>'+field('contact','Main contact',v('contact'))+field('email','Contact email',v('email'),'email')+field('phone','Phone',v('phone'))+field('address','Trading address',v('address'))+field('area','Towns and service areas',v('area'))+field('package','Package',v('package'))+field('status','Project status',v('status'))+field('startDate','Start date',v('startDate'),'date')+textarea('services','Products, services and offers',v('services'))+textarea('seoExcludeTerms','Searches for things the business does NOT currently offer (separate with commas)',v('seoExcludeTerms'))+textarea('priorities','Three main business objectives',v('priorities'))+textarea('competitors','Competitors',v('competitors'))+textarea('googleSearchConsole','Search Console access status',v('googleSearchConsole'))+textarea('googleBusinessProfile','Google Business Profile access status',v('googleBusinessProfile'))+textarea('analytics','Analytics / enquiries tracking status',v('analytics'))+textarea('notes','Internal notes',v('notes'))+'</div><p class="hint">Never enter Google passwords, access tokens or recovery codes here. Ask clients to grant role-based access instead.</p><button type="submit" class="button gold">'+(edit?'Save changes':'Create client project')+'</button></form>'}

const AUDIT_HELP={
'Homepage responds successfully':'The website responded to our request. A failed check can mean the site is unavailable, blocking the checker or has a server problem.',
'HTTPS enabled':'HTTPS protects information sent between visitors and the website. Most public business websites should use it.',
'Descriptive page title exists':'The page title is the name Google may display for a page in search. Its existence does not prove it is well written.',
'Meta description exists':'This is a suggested short description for search results. Google can choose different text, and missing it does not guarantee a ranking penalty.',
'One main H1 heading':'An H1 is the main heading visible in the page content. We check the number, not whether the wording is commercially useful.',
'Canonical URL declared':'A canonical tag suggests which version of a page search engines should treat as the preferred version. Having a tag does not prove it points to the right address.',
'Homepage not marked noindex':'A noindex instruction requests that search engines not show the page in results. This check only checks the homepage response.',
'robots.txt accessible':'Robots.txt provides crawling instructions. It can be valid even when the usual path is absent, depending on the site. We have not evaluated every rule.',
'sitemap.xml accessible':'A sitemap lists pages for search engines. Some websites use a different path, so a failed check here does not prove no sitemap exists.'
};
const TASK_HELP={
'intake':'Ask the client what they sell, where they operate and what they want more customers to do. Ask for account invitations, not passwords.',
'baseline':'Open the website Search Console performance report and record real monthly Google search clicks and impressions. Note the date range and source.',
'competitors':'Choose three real businesses offering similar services in the same area. I can help research them; do not mark this completed from an automated homepage check.',
'keywords':'Research relevant phrases potential customers use and match them to actual services and website pages. I can do this research when given the client website.',
'indexing':'Search Console shows whether Google has indexed pages. This cannot be verified from the homepage checker alone.',
'robots':'Review the actual instructions in robots.txt and locate any sitemap URLs. A successful HTTP response alone does not establish correctness.',
'canonical':'Ensure pages point to the intended canonical URL. Incorrect canonical choices can obscure the right page in search.',
'crawl':'Check navigation, broken links and whether key pages are reachable by search engines. Requires a broader site crawl.',
'mobile':'Check real mobile usability and website speed; this basic homepage check does not measure Core Web Vitals.',
'schema':'Structured data is code that describes the business or content to search engines. It must describe accurate visible content.',
'titles':'Write unique, truthful titles and descriptions for the most important pages. These must describe what the business really offers.',
'headings':'Review the main headings to make pages easy for visitors and search engines to understand.',
'pages':'Improve up to five pages for clarity, relevant searches and genuinely helpful information, after the client approves the changes.',
'images':'Check important photos, descriptive image text and suitability. Not every decorative image requires an alt description.',
'links':'Connect relevant pages so visitors and search engines can navigate between them.',
'accurate':'Get the customer to confirm factual claims such as menus, offers, prices and opening hours before publication.',
'gbp':'Google Business Profile is the listing shown in Google Search and Maps. Its details must be accurate, and the owner must grant appropriate access.',
'categories':'Check Google listing categories, contact information, opening hours and available services with the business owner.',
'listings':'Check major trustworthy directory listings for accurate business name, address and phone. Avoid spam listings.',
'reviews':'Give the client ethical ways to invite genuine reviews. Never buy, fabricate or selectively gate reviews.',
'gsc':'The customer should grant the appropriate Search Console role. It is different from their Google Business Profile.',
'analytics':'Plan website measurements with the correct privacy and consent configuration where needed.',
'enquiries':'Agree what counts as a customer enquiry, booking or sale. A Google click does not equal a booking.',
'verification':'After publishing changes, confirm the website still works and the agreed fixes are actually present.',
'delivery':'Show a client a record of work completed and separately show measured outcomes, without claiming guaranteed rankings.',
'followup':'Recheck the site and search reports around 30 days after setup; some indexing changes take longer.',
'm-search':'Review genuine monthly Search Console trends and any new indexing problems.',
'm-competitors':'Check competitor changes relevant to actual target customers and offerings.',
'm-pages':'Apply deliberate updates to up to two priority pages, based on evidence and business approval.',
'm-content':'Publish a useful, accurate update when the business has something worthwhile to share.',
'm-gbp':'Review the business listing for hours, accuracy, new images and legitimate updates.',
'm-report':'Send a monthly report with source figures, completed work and next actions.'
};

function clientPlatformSetup(){
 const c=detail?.client||{};
 const platform=c.platform||'unknown';
 if(platform==='chipin'||platform==='unknown')return '';
 const access=c.siteAccess||'not_requested';
 const accessText={not_requested:'Permission has not been requested',requested:'Waiting for the client to grant access',granted:'Access reported as granted (not independently tested)',read_only:'Read-only access recorded',declined:'Client declined access'};
 const wix=platform==='wix';
 const title=wix?'Wix website — client-owned':'External website — client-owned';
 const platformName=wix?'Wix':'the existing website platform';
 return '<section class="card external-access"><div class="eyebrow">CLIENT WEBSITE ACCESS — NOT A CHANGE TO THEIR SITE</div><h2>'+title+'</h2>'+
 '<p>SEO Manager can check the public website without an account, but <strong>cannot publish SEO changes inside '+esc(platformName)+'</strong> unless the owner grants the right access and the connected editing method is verified. Never ask for a password.</p>'+
 '<div class="verdict-row"><strong>Website editing permission</strong><span>'+esc(accessText[access]||'Not confirmed')+'</span></div>'+
 '<div class="verdict-row"><strong>Google search measurement</strong><span>'+(detail.gsc?.connection?.status==='connected'?'Connected to Google Search Console':'Requires the client to authorise Google Search Console access')+'</span></div>'+
 '<div class="guide-steps"><p><strong>1. Owner authorisation:</strong> '+(wix?'Ask the website owner to open the Wix site dashboard, choose <b>Roles &amp; Permissions → Invite Collaborators</b> and invite you to the relevant site. Choose a restricted role with page SEO/settings permissions, and publishing rights only if approved.':'Ask the owner to invite you as a collaborator with the minimum SEO permissions supported by their website.')+'</p>'+
 '<p><strong>2. Google results:</strong> Ask the owner to grant read access to the site in Google Search Console. The <b>Google connection</b> tab explains which email to add. Public audits can run before this, but traffic and results cannot be verified without the connection.</p>'+
 '<p><strong>3. Approvals:</strong> Record whether the owner allows hidden SEO metadata updates only, or explicitly approves visible text/design changes. Do not silently change live site content.</p>'+
 '<p><strong>4. Delivery:</strong> Verify actual platform access and how to publish before claiming work is automatic. Only mark work complete after evidence is collected, then compare Google performance over time.</p></div>'+
 '<p class="hint">A site being listed here is not proof of editing access, successful SEO or connection to Wix. Existing services and client claims must be verified with the owner.</p>'+
 '<div class="row">'+btn('Copy the client access request','copy-external-access','gold')+' '+btn('Edit client access status','edit','alt')+'</div></section>';
}

function guide(){
 const a=detail.audits[0],hasAudit=!!a,hasMetrics=detail.metrics.length>0,p=progress();
 const next=!hasAudit?{
  label:'First task · automatic',
  title:'Run a first check of the website',
  text:'I will check the public homepage for basic technical problems. This does not change the website, require a Google login or automatically fix anything.',
  action:'audit',button:'Run the website check'
 }:!hasMetrics?{
  label:'Next task · needs Google access',
  title:'Connect Google search data once',
  text:'Google Search Console data can be retrieved for free. The connection requires a one-time Google service account setup and website owner permission, not manual monthly copying.',
  action:'metrics',button:'View Google connection'
 }:{
  label:'Next task · guided work',
  title:'Review and work through the SEO improvements',
  text:'The checklist tells us which jobs need doing. I can analyse the site and write or implement many fixes in a ChatGPT conversation. You approve factual changes and provide account permissions when needed.',
  action:'checklist',button:'Open the work checklist'
 };
 const steps=[
  ['1','Check the website',hasAudit,'Automatic spot-check','Automatically check the homepage and up to three important linked pages. Scheduled reviews run without manual clicks.','audit'],
  ['2','Connect the free Google data source',hasMetrics,'One-time owner authorisation','Use Search Console to pull actual search data automatically. The client must approve access once.','metrics'],
  ['3','Research and improve the SEO',p.done>0,'Guided human + AI work','Review the checklist; only mark things complete when the work is actually finished and verified.','checklist'],
  ['4','Show the customer real results',hasMetrics&&p.done>0,'Report from saved facts','See a draft report with genuine figures and evidence of delivered work.','report']
 ];
 return clientPlatformSetup()+'<section class="card beginner-hero"><div class="eyebrow">START HERE · NO SEO KNOWLEDGE REQUIRED</div><h2>One job at a time</h2><p>This workspace keeps everything organised. It is <strong>not</strong> a magic SEO button. I will handle analysis and technical work with you through ChatGPT; the dashboard records the findings, actions and genuine results.</p><div class="next-action"><div class="eyebrow">'+next.label+'</div><h3>'+next.title+'</h3><p>'+next.text+'</p>'+btn(next.button,next.action,'gold')+'</div></section><div class="card"><h2>The four steps</h2><div class="steps">'+steps.map(x=>'<div class="guide-step"><span class="guide-number">'+x[0]+'</span><div><strong>'+x[1]+'</strong><p>'+x[4]+'</p><span class="pill '+(x[2]?'done':'')+'">'+(x[2]?'Started / recorded':x[3])+'</span></div>'+btn('Open',x[5])+'</div>').join('')+'</div></div><div class="card"><h2>What works now, and what still needs doing</h2><div class="grid2"><div><h3>Available today</h3><p>Saving client details, automatically checking up to four website pages, scheduled rechecks, recording work and printing a client report.</p></div><div><h3>Other work still needed</h3><p>Google Business Profile, external competitor rankings and website code changes require separate integration or work. Search Console is available for authorised website properties.</p></div></div><div class="row">'+btn('Copy a request for ChatGPT to work on this site','copy-work')+btn('See detailed dashboard','overview')+'</div></div>';
}
function home(){
 return '<div class="top"><div><div class="eyebrow">CHIP IN · SEO MANAGER V3.1</div><h1>Your SEO workspace</h1><p class="muted">Choose a business. You will then see one recommended next action, with explanations of what it does and why.</p></div><div class="toolbar">'+btn('Download private backup','backup')+btn('Add a customer','new','gold')+'</div></div>'+
 '<div class="card starter"><div class="eyebrow">HOW TO BEGIN</div><h2>Start with a business you already know</h2><p>You do not need to fill in lots of information before trying the system. Open The Bulls Head or Chip In below, then follow the prominent <strong>Next task</strong> button. We will use real websites, but no search performance figures are assumed.</p><p class="hint">A public website check can run automatically. Google data still requires account access, and SEO fixes require proper review and implementation.</p></div>'+
 '<div class="card"><div class="row"><h2>Your businesses</h2>'+btn('Add a new client','new')+'</div>'+
 (clients.length?'<div class="list">'+clients.map(c=>'<button class="client" data-open="'+c.id+'"><span><strong>'+esc(c.name)+'</strong><small>'+esc(c.website)+' · '+(c.status==='pilot'?'Internal practice project':'Client project')+'</small></span><span class="pill">Open guided setup</span></button>').join('')+'</div>':'<div class="empty">No client records yet. Create a project to begin.</div>')+
 '</div><div class="card"><h3>What does SEO mean?</h3><p><strong>SEO (Search Engine Optimisation)</strong> means helping search engines understand a website and helping relevant people find it. The work includes useful content, fixing technical obstacles, improving local listings and measuring what actually changes.</p><p>The dashboard is here to <strong>organise and evidence that work</strong> — it does not claim that all of it is automated.</p></div>';
}

function summary(){const p=progress(),m=detail.metrics.at(-1),a=detail.audits[0];return '<div class="cards"><div class="card"><div class="eyebrow">Foundations completed</div><div class="metric">'+p.done+'/'+p.total+'</div><div class="progress"><i style="width:'+p.pc+'%"></i></div></div><div class="card"><div class="eyebrow">Latest search clicks</div><div class="metric">'+n(m?.clicks)+'</div><small>'+show(m?.month)+'</small></div><div class="card"><div class="eyebrow">Technical checks to review</div><div class="metric">'+(a?a.checks.filter(x=>!x.ok).length:'—')+'</div><small>'+date(a?.runAt)+'</small></div></div><div class="grid2"><div class="card"><h2>Next actions</h2><p>Complete the onboarding and delivery checklist, check the public website, then record actual baseline measurements.</p>'+btn('Open checklist','tasks')+' '+btn('Run technical check','audit','gold')+'</div><div class="card"><h2>Client priorities</h2><p><strong>Website:</strong> <a href="'+safeUrl(detail.client.website)+'" target="_blank" rel="noopener noreferrer">'+esc(detail.client.website)+'</a></p><p><strong>Services:</strong> '+show(detail.client.services)+'</p><p><strong>Business objectives:</strong> '+show(detail.client.priorities)+'</p></div></div>'}
function checklist(){const p=progress();return '<div class="card"><h2>SEO delivery checklist</h2><p class="hint">Select a status and record evidence or next steps. Monthly tasks are tracked separately for each selected month.</p><div class="field" style="max-width:220px"><label>Monthly work period</label><input id="workMonth" type="month" value="'+workMonth+'"></div><div class="progress"><i style="width:'+p.pc+'%"></i></div><p>'+p.done+' of '+p.total+' foundation tasks completed or marked not applicable</p></div>'+groups.map(g=>'<div class="card"><h3>'+esc(g[0])+'</h3>'+g[1].map(t=>{const st=status(t[0]);return '<div class="task" data-key="'+t[0]+'"><label>'+esc(t[1])+'</label><select class="task-change">'+[['todo','Not started'],['doing','In progress'],['done','Completed'],['na','Not applicable']].map(v=>'<option value="'+v[0]+'" '+(st.status===v[0]?'selected':'')+'>'+v[1]+'</option>').join('')+'</select><input class="task-note" placeholder="Evidence or action notes" aria-label="Notes" value="'+esc(st.notes)+'"><details class="task-explain"><summary>What does this job mean?</summary><p>'+esc(TASK_HELP[t[0]]||"Review and verify this item.")+'</p><button class="button small alt" data-action="copy-task" data-task-key="'+esc(t[0])+'" type="button">Copy instructions for ChatGPT</button></details></div>'}).join('')+'</div>').join('')}
function audit(){const a=detail.audits[0];const pages=a?.pages||[],review=pages.reduce((n,p)=>n+(p.issues?.length||0),0);return '<div class="card"><div class="row"><div><h2>Automatic website review</h2><p class="hint">Reviews the homepage and up to three linked pages. Checks technical SEO clues automatically without changing the site. It does not check Google rankings or prove Google indexing.</p></div><button class="button gold" data-action="audit" '+(busy?'disabled':'')+'>'+(busy?'Checking website…':'Run automatic check')+'</button></div></div>'+(!a?'<div class="empty">No website check recorded yet. The checker also runs on an automatic Cloudflare schedule once enabled. You can trigger an immediate review here without editing the website.</div>':'<div class="card"><div class="row"><div><h3>What the check found</h3><p class="hint">Pass means the basic item was present; Review means it needs investigation. A green result does not prove the website SEO is fully correct.</p></div>'+btn('Copy findings for ChatGPT','copy-audit')+'</div><div class="check-summary"><strong>'+a.checks.filter(z=>z.ok).length+' of '+a.checks.length+' basic checks passed</strong><p>'+ (a.checks.every(z=>z.ok)?'The basic homepage elements we checked are present. This does not prove good rankings or real enquiries.':'Some items need investigation; they are not automatically confirmed SEO errors.') +'</p><p><strong>Next:</strong> Gather actual Google search figures to see whether people are finding this business.</p>'+btn('Show how to get Google results','metrics','gold')+'</div><div class="card" style="background:#f8fbff"><h3>Additional pages reviewed automatically</h3><p class="hint">The checker follows up to three internal homepage links and looks for missing titles, descriptions, main headings, canonical addresses and duplicate titles. These are clues for review, not definitive ranking problems.</p>'+(pages.length?'<p><strong>'+pages.length+' pages checked · '+review+' items to review</strong></p>'+pages.map(p=>'<div class="audit-item"><div class="row"><strong>'+esc(p.path)+'</strong><span class="pill '+(p.issues?.length?'issue':'done')+'">'+(p.issues?.length?p.issues.length+' review':'No basic issues')+'</span></div><p class="hint">Title: '+esc(p.title||'Missing')+' · HTTP '+esc(p.status==null?'unknown':p.status)+'</p>'+(p.issues?.length?'<ul>'+p.issues.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>':'')+'</div>').join(''):'<p>No additional pages were available for this audit.</p>')+'</div><div class="row"><h3>'+esc(a.website)+'</h3><span class="pill">'+date(a.checkedAt)+'</span></div>'+a.checks.map(c=>'<div class="audit-item"><div class="row"><strong>'+esc(c.label)+'</strong><span class="pill '+(c.ok?'done':'issue')+'">'+(c.ok?'Pass':'Review')+'</span></div><small>'+esc(c.detail)+'</small><details class="audit-help"><summary>What does that mean?</summary><p>'+esc(AUDIT_HELP[c.label]||'This check needs interpretation; we should verify it against the live website and Google data.')+'</p></details></div>').join('')+'<p class="hint">'+a.notes.map(esc).join(' ')+'</p></div>')}

function googleConnectionCard(){
 const configured=!!detail.gsc?.configured;
 const email=detail.gsc?.serviceAccountEmail||'';
 const state=detail.gsc?.connection||{status:'not_tested'};
 const imported=(detail.metrics||[]).filter(m=>m.clicks!=null||m.impressions!=null).slice(-8).reverse();
 const performance=imported.length?'<div class="card"><h3>Google results imported automatically</h3><p class="hint">Current-month figures are incomplete and will increase as Google publishes more data. They must not be compared directly with a complete month or the rolling 28-day Search Console view.</p><div class="tablewrap"><table><thead><tr><th>Period</th><th>Clicks</th><th>Impressions</th><th>Average position</th></tr></thead><tbody>'+imported.map(x=>'<tr><td>'+esc(x.month)+(String(x.notes||'').includes('PARTIAL CURRENT MONTH')?' <strong>(partial)</strong>':'')+'</td><td>'+n(x.clicks)+'</td><td>'+n(x.impressions)+'</td><td>'+show(x.position)+'</td></tr>').join('')+'</tbody></table></div></div>':'<div class="card"><h3>Google results</h3><p class="hint">No search figures imported yet. A successful Google connection only confirms permission; it does not prove that historical months contain results.</p></div>'; 
 const verified=state.status==='connected',failed=state.status==='error';
 const resultLabel=verified?'Verified — Google Search Console connected':failed?'Google import failed — see details below':configured?'Private key installed — Google access not yet verified':'Not connected';
 const resultInfo=verified?'Verified '+esc(state.last_attempt||'')+'. Authorised property: '+esc(state.property||'')+'. Latest sync: '+Number(state.imported_months||0)+' monthly periods with data.':failed?'Last test '+esc(state.last_attempt||'')+': '+esc(state.last_error||'Unspecified error'):'No successful Google Search Console data import has yet been verified.';
 const step=(number,title,content,opened=false)=>'<details class="google-step"'+(opened?' open':'')+'><summary><span class="google-step-number">'+number+'</span><strong>'+title+'</strong></summary><div class="google-step-content">'+content+'</div></details>';
 const newProject='<a href="https://console.cloud.google.com/projectcreate" target="_blank" rel="noopener noreferrer">Open Google Cloud — create a project</a>';
 const apiLibrary='<a href="https://console.cloud.google.com/apis/library" target="_blank" rel="noopener noreferrer">Open the Google API Library</a>';
 const accounts='<a href="https://console.cloud.google.com/iam-admin/serviceaccounts" target="_blank" rel="noopener noreferrer">Open Service Accounts</a>';
 const worker='<a href="https://dash.cloudflare.com/" target="_blank" rel="noopener noreferrer">Open Cloudflare Dashboard</a>';
 const searchConsole='<a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Open Google Search Console</a>';
 const emailText=email?'<code>'+esc(email)+'</code> '+btn('Copy email address','copy-service-email'):'the <strong>service account email address</strong> displayed in Google Cloud (ends in <code>.iam.gserviceaccount.com</code>)';
 const steps=[
  step('1','Create the free Google project','<p>Click '+newProject+'. Sign in with the Google account you want to use for Chip In. Name the project <strong>Chip In SEO</strong> and choose <strong>Create</strong>. Select that project at the top of Google Cloud before continuing.</p><p class="hint">This only creates a project. The Search Console API has no usage charge, although Google Cloud may advertise other paid services. Do not activate unrelated products.</p>',!configured),
  step('2','Switch on the Search Console API','<p>Open '+apiLibrary+'. Ensure the <strong>Chip In SEO</strong> project is selected. Search for <strong>Google Search Console API</strong>, open it and choose <strong>Enable</strong> (or leave it enabled if it already is).</p>'),
  step('3','Create a read-only service identity','<p>Open '+accounts+'. Make sure the Chip In SEO project is selected. Choose <strong>Create service account</strong>, name it <strong>chipin-seo-reader</strong>, then continue without adding project roles (none are needed for reading a separately authorised Search Console property). Finish creation.</p><p>Click the newly created account, open <strong>Keys → Add key → Create new key → JSON</strong>. Keep the downloaded JSON file on your own computer, securely.</p><p class="hint">Never send that JSON file in ChatGPT or commit it to GitHub. It contains a private authentication key.</p>'),
  step('4','Store the private key in Cloudflare','<p>Open '+worker+'. Navigate to <strong>Workers & Pages → chipin-seo-manager → Settings → Variables and Secrets → Add</strong>. Choose type <strong>Secret</strong>.</p><p>Set the name exactly to <code>GSC_SERVICE_ACCOUNT_JSON</code> '+btn('Copy secret name','copy-secret-name')+'</p><p>Open the downloaded JSON key file in a text editor, copy its <strong>complete contents</strong> into the Secret value field, then select <strong>Deploy</strong>.</p><p class="hint">Cloudflare stores the key as a protected secret. It must not be placed in a normal plaintext variable, the SEO client notes, GitHub or this conversation.</p>'),
  step('5','Give the service account access to the website','<p>Open '+searchConsole+'. Select <strong>'+esc(detail.client.website)+'</strong> (or its matching domain property) using the property selector.</p><p>Go to <strong>Settings → Users and permissions → Add user</strong>. Enter '+emailText+'. Set permission to <strong>Restricted</strong> for read-only performance data and save. This must be done by an owner of the Search Console property.</p><p class="hint">Repeat only this website-permission step for each additional client. Clients stay in control of their properties and can revoke access.</p>'),
  step('6','Test the connection','<p>Return here and select <strong>Refresh connection status</strong>. After Cloudflare confirms the key is installed, choose <strong>Import Google results</strong>. A successful import verifies that the service account can read this website. The dashboard can then use real Search Console performance statistics.</p><p class="hint">If the property is not authorised yet, the import will explain that it cannot see the site. You do not need to enter monthly figures manually.</p>')
 ];
 return '<div class="card google-connection"><div class="eyebrow">STEP 2 — CONNECT GOOGLE ONCE</div><h2>Get Google Search Console data automatically</h2><p>This is the one-time connection that lets the SEO Manager collect real Google search clicks, impressions and average position without you copying numbers every month.</p><div class="google-connection-status"><strong>Google connection:</strong> '+(configured?'<span class="pill '+(verified?'done':failed?'issue':'warn')+'">'+resultLabel+'</span>':'<span class="pill issue">'+resultLabel+'</span>')+'<p class="hint">'+(configured?resultInfo:'No private Google key has been installed in the Worker yet. Start at step 1 below.')+'</p></div><h3>Follow these setup steps</h3>'+steps.join('')+'<div class="google-actions">'+btn('Refresh connection status','refresh-gsc','alt')+' '+(configured?btn('Import Google results','sync-gsc','gold'):'')+'</div><p class="hint">The Google Cloud project and service account are a one-time Chip In setup. Granting access is a separate, owner-approved action for each client. This connection is free subject to Google API and hosting limits.</p></div>'+performance;
}


function measuredCard(label,current,previous,what,format){
 const hasCurrent=current!==null&&current!==undefined&&Number.isFinite(Number(current));
 const value=hasCurrent?(format==='position'?Number(current).toFixed(1):format==='ctr'?(Number(current)*100).toFixed(1)+'%':n(current)):'Not yet measured';
 const hasPrev=previous!==null&&previous!==undefined&&Number.isFinite(Number(previous));
 let change='Comparison not available yet';
 if(hasCurrent&&hasPrev){
  if(format==='ctr')change=((Number(current)-Number(previous))*100>=0?'+':'')+((Number(current)-Number(previous))*100).toFixed(1)+' percentage points versus earlier period';
  else if(Number(previous)>0){
   const diff=(Number(current)-Number(previous))/Number(previous)*100;
   change=(diff>0?'+':'')+diff.toFixed(0)+'% versus previous 28 days';
  }else if(Number(current)>0)change='Previous period had zero recorded';
  else change='No change from previous period';
 }
 return '<div class="result-kpi"><div class="eyebrow">'+esc(label)+'</div><strong class="result-number">'+value+'</strong><div class="result-change">'+esc(change)+'</div><p>'+esc(what)+'</p></div>';
}
function searchTable(rows,label){
 if(!rows?.length)return '<p class="hint">Google has not provided search terms in this category for this period.</p>';
 return '<div class="tablewrap"><table class="search-term-table"><thead><tr><th>'+label+'</th><th>Clicks</th><th>Appearances</th><th>Typical position</th></tr></thead><tbody>'+
 rows.map(t=>'<tr><td>'+esc(t.term)+'</td><td>'+n(t.clicks)+'</td><td>'+n(t.impressions)+'</td><td>'+Number(t.position||0).toFixed(1)+'</td></tr>').join('')+'</tbody></table></div>';
}
function evidenceList(max=99){
 const work=(detail.work||[]).slice(0,max);
 if(!work.length)return '<p class="hint">No completed work has been documented yet. A green technical check is not proof of an improvement.</p>';
 return '<div class="evidence-list">'+work.map(w=>'<div class="evidence-entry"><div><strong>'+esc(w.title)+'</strong><small>'+esc(date(w.completed_at))+' · '+(w.evidence_status==='verified'?'Published and deployment verified':w.source_url?'Evidence link recorded':'Completion recorded, not independently verified')+'</small><p>'+esc(w.detail)+'</p></div>'+(w.source_url?'<a href="'+safeUrl(w.source_url)+'" target="_blank" rel="noopener noreferrer">View evidence</a>':'')+'</div>').join('')+'</div>';
}

function proofOfValue(){
 const d=detail.insights?.data;
 const verified=(detail.work||[]).filter(w=>w.evidence_status==='verified');
 const first=verified.map(w=>w.completed_at).filter(Boolean).sort()[0];
 const before=!!(first&&d?.period?.to&&d.period.to<first);
 const workStatus=verified.length?verified.length+' website improvements published with evidence':'No verified improvements recorded';
 const trafficStatus=!d?.current?'Google search measurements not yet available':before?'Not yet measurable: the Google figures are from before the SEO changes':!d.previous?'Not yet measurable: there is no earlier period with data':'A comparison is available, but it does not prove that SEO caused the difference';
 return '<section class="card seo-verdict"><div class="eyebrow">CUSTOMER VERDICT — PLAIN ENGLISH</div><h2>Is the SEO actually working?</h2><p><strong>We cannot yet show that the SEO has brought in extra customers.</strong> Here is what the evidence supports:</p>'+
 '<div class="verdict-row"><strong>Was work completed?</strong><span>'+esc(workStatus)+'</span></div>'+
 '<div class="verdict-row"><strong>Are more people finding the business?</strong><span>'+esc(trafficStatus)+'</span></div>'+
 '<div class="verdict-row"><strong>Has it produced extra customers or sales?</strong><span>Not measured or proven. Google website clicks are not confirmed customers.</span></div>'+
 (before?'<p class="verdict-context">The website changes were published on '+esc(date(first))+', but this Google report ends on '+esc(date(d.period.to))+'. <strong>The numbers below are a starting point, not results from our changes.</strong></p>':'')+
 '<p class="hint">A completed website improvement is work delivered. It is not automatically a successful SEO outcome. This report will only show progress once there are comparable search periods and real business measurements.</p></section>';
}
function figuresExplained(){
 const r=detail.insights?.data?.current;
 if(!r)return '';
 return '<section class="card figures-explained"><h2>What do the numbers actually mean?</h2><p>These figures come from Google searches over the 28 days shown above.</p>'+
 '<div class="figure-definition"><strong>'+n(r.clicks)+' website clicks</strong><p>People clicked Google search results linking to the website '+n(r.clicks)+' times. It does not mean '+n(r.clicks)+' different customers.</p></div>'+
 '<div class="figure-definition"><strong>'+n(r.impressions)+' Google appearances</strong><p>The website appeared in Google search results '+n(r.impressions)+' times. The same person may have seen it more than once.</p></div>'+
 '<div class="figure-definition"><strong>Position '+Number(r.position||0).toFixed(1)+' on average</strong><p>An average across different searches. It does not mean the business is seventh for “pubs near me”. Look at individual searches below.</p></div>'+
 '<div class="figure-definition"><strong>'+(Number(r.ctr||0)*100).toFixed(1)+'% clicked</strong><p>For roughly every 100 Google appearances, '+Math.round(Number(r.ctr||0)*100)+' resulted in a click to the website.</p></div></section>';
}

function resultsOverview(){
 const d=detail.insights?.data,period=d?.period,old=d?.previous,nowResults=d?.current;
 const ongoing=(detail.tasks||[]).filter(t=>t.status==='doing').slice(0,5);
 const local=(detail.metrics||[]).slice().reverse().find(x=>x.gbp_calls!=null||x.gbp_directions!=null||x.gbp_website!=null||x.enquiries!=null);
 const localEvidence=local?'<div class="result-grid">'+measuredCard('Google listing call clicks',local.gbp_calls,null,'Reported by Google Business Profile for '+local.month)+measuredCard('Google direction requests',local.gbp_directions,null,'Interest in directions, not proven visits')+measuredCard('Tracked enquiries',local.enquiries,null,'Confirmed tracked enquiries or bookings, if supplied')+'</div><p class="hint">These local/enquiry fields were manually recorded for '+esc(local.month)+'. They have not been independently imported or validated by the Manager.</p>':'<p><strong>No Google Maps, calls or enquiry measurements recorded yet.</strong> Business Profile interactions need their own authorised source. We do not pretend calls, visits or sales have happened.</p>';
 const detailDate=period?'Google results '+esc(period.from)+' to '+esc(period.to)+' (28 days)'+(old?' compared with '+esc(d.previousPeriod.from)+' to '+esc(d.previousPeriod.to):' · No earlier data for comparison'):'Waiting for Google search results';
 return '<div class="results-main">'+clientPlatformSetup()+proofOfValue()+'<section class="card results-hero"><div class="eyebrow">REAL PERFORMANCE · NOT SEO CHECKLIST TICKS</div><h2>Are more people finding '+esc(detail.client.name)+'?</h2><p>These are real Google figures, not estimates or guarantees of more customers.</p><p class="results-period">'+detailDate+'</p><div class="row">'+btn('Update Google figures','refresh-insights','gold')+' '+btn('Customer report','report','alt')+'</div>'+
 (detail.insights?.error?'<p class="result-error">Google data update: '+esc(detail.insights.error)+'</p>':'')+'</section>'+
 (d?'<div class="result-grid">'+measuredCard('Google website clicks',nowResults?.clicks,old?.clicks,'People who clicked the business website from search results.')+measuredCard('Google appearances',nowResults?.impressions,old?.impressions,'Times a website result appeared in Google searches.')+measuredCard('Average search position',nowResults?.position,old?.position,'Lower is generally better. This averages all searches; not a specific keyword.','position')+measuredCard('Click-through rate',nowResults?.ctr,old?.ctr,'Percentage of search appearances that led to a website click.','ctr')+'</div>':
 '<section class="card"><h2>No comparison collected yet</h2><p>Google search performance will appear when authorised historical data is available. Until then we will not pretend improvement has occurred.</p></section>')+
 figuresExplained()+'<div class="grid2"><section class="card"><h2>Searches from potential new customers</h2><p class="hint">People used these searches without typing the business name. That suggests discovery, not a confirmed new customer.</p>'+searchTable(d?.discoveryQueries?.slice(0,10),'Non-brand searches')+'</section><section class="card"><h2>People searching for the business</h2><p class="hint">People who searched for the business by name. Useful, but different from winning new searches.</p>'+searchTable(d?.brandedQueries?.slice(0,10),'Business-name searches')+'</section></div>'+
 '<section class="card"><h2>Search opportunities worth investigating</h2><p>Google searches where the website appeared but was not in the top three on average. These are leads for investigation, not guaranteed rankings.</p>'+searchTable(d?.opportunities,'Search terms')+'</section>'+(d?.unsuitableQueries?.length?'<section class="card"><h2>Searches we should NOT target</h2><p>These searches refer to things the business has said it does not currently offer. They are excluded from our SEO opportunities.</p>'+searchTable(d.unsuitableQueries,'Unsuitable searches')+'</section>':'')+
 '<section class="card"><h2>What have we actually delivered?</h2><p class="hint">Real changes, with evidence. This is separate from the technical check results.</p>'+evidenceList(6)+'<div class="row" style="margin-top:14px">'+btn('See work record','work','alt')+'</div></section>'+
 '<section class="card"><h2>Calls, direction requests and enquiries</h2>'+localEvidence+'</section><section class="card"><h2>What still needs work?</h2>'+(ongoing.length?'<ul>'+ongoing.map(t=>'<li>'+esc((tasks.find(x=>x[0]===t.task_key)||[])[1]||t.task_key)+'</li>').join('')+'</ul>':'<p>There are no in-progress jobs recorded yet. This does not mean SEO is finished.</p>')+'<p class="hint">Search performance can improve or decline for reasons outside the work delivered, including seasonality and Google changes.</p></section>'+
 '<p class="hint">Source: Google Search Console website search results. '+(d?.updatedAt?'Last retrieved '+esc(date(d.updatedAt))+'. ':'')+'Search terms may exclude anonymised searches. Website clicks are not confirmed sales.</p></div>';
}
function workRecord(){
 return '<section class="card"><div class="eyebrow">DELIVERY EVIDENCE</div><h2>Work actually completed</h2><p>Each record describes a real change. For a client, show what changed, the date and an evidence link. Recording a change does not mean Google rankings improved.</p>'+evidenceList()+'</section><section class="card"><h2>Record a completed improvement</h2><p class="hint">This adds a documented work record, not an independently verified success. Only record finished work.</p><form id="workForm"><div class="formgrid">'+field('completed_at','Date completed',new Date().toISOString().slice(0,10),'date')+field('title','What was done?','')+field('source_url','Link to proof (optional)','')+textarea('detail','What changed, in plain English?')+'</div><button class="button gold" type="submit">Record completed work</button></form></section>';
}
function clientReport(){
 const d=detail.insights?.data,m=d?.current,p=d?.previous,range=d?.period;
 const compare=(v,old)=>v==null?'Not measured':old==null?'No earlier comparison':old>0?((v-old)/old*100>=0?'+':'')+Math.round((v-old)/old*100)+'% versus earlier period':old===0&&v>0?'Earlier period had zero recorded':'No change';
 const tasksDoing=(detail.tasks||[]).filter(x=>x.status==='doing').slice(0,5);
 return '<div class="report results-report"><section class="card"><div class="reportheader"><div class="eyebrow">CHIP IN · SEO WORK & RESULTS REPORT</div><h2>'+esc(detail.client.name)+'</h2><p>'+esc(detail.client.website)+'</p></div><p class="results-period">'+(range?esc(range.from)+' to '+esc(range.to)+(p?' · compared with '+esc(d.previousPeriod.from)+' to '+esc(d.previousPeriod.to):' · No earlier data to compare'):'Google trend data not yet available')+'</p><p>This report shows what was done and what Google measured. It does not claim unproven customers, sales or rankings.</p>'+proofOfValue()+'<div class="result-grid">'+measuredCard('Google website clicks',m?.clicks,p?.clicks,'People clicking through from Google')+measuredCard('Google appearances',m?.impressions,p?.impressions,'Times the website appeared in search')+measuredCard('Typical position',m?.position,p?.position,'Average search position across queries','position')+measuredCard('Click-through rate',m?.ctr,p?.ctr,'Share of search appearances that became website clicks','ctr')+'</div><h3>What did we actually change?</h3>'+evidenceList(20)+'</section>'+figuresExplained()+'<section class="card"><h2>Searches from people who might not know the business</h2><p>Searches here do not mention the business name and match the services it offers. Clicks are not proven customers.</p>'+searchTable(d?.discoveryQueries?.slice(0,12),'Discovery search')+'</section><section class="card"><h2>Calls, directions and actual customers</h2><p><strong>Not tracked from Google Business Profile yet.</strong> Website search clicks alone cannot establish a booking, phone call, sale or a visit. No ROI claim is made.</p><h3>What still needs doing?</h3>'+(tasksDoing.length?'<ul>'+tasksDoing.map(t=>'<li>'+esc((tasks.find(a=>a[0]===t.task_key)||[])[1]||t.task_key)+'</li>').join('')+'</ul>':'<p>Further prioritisation needed.</p>')+'<p class="hint">Source: Google Search Console API, fetched '+esc(d?.updatedAt?date(d.updatedAt):'not yet')+'. Latest complete day is deliberately excluded to reduce data delays. Changes in search results are not necessarily caused solely by SEO.</p></section></div>';
}

function metrics(){const m=detail.metrics;return googleConnectionCard()+'<details class="card"><summary><strong>Optional fallback: enter monthly results manually</strong></summary><p>Use this only when a client has not yet granted an authorised Google connection.</p><div class="eyebrow">MANUAL FALLBACK</div><h2>Where do these numbers come from?</h2><p>Use these fields only as a fallback while a Google Search Console API import is not available. Do not invent figures or enter zeros for missing information.</p><div class="guide-steps"><p><strong>1.</strong> Open <a href="https://search.google.com/search-console" target="_blank" rel="noopener noreferrer">Google Search Console</a>, choose the website, and open <strong>Performance → Search results</strong>. If it is not listed, account access or verification is needed.</p><p><strong>2.</strong> Choose one completed calendar month. Copy Total clicks, Total impressions and Average position into the matching boxes below.</p><p><strong>3.</strong> Open <a href="https://business.google.com/" target="_blank" rel="noopener noreferrer">Google Business Profile</a>, if you have permission. Its performance area shows interactions on the Google Maps and Search listing, such as call and direction clicks.</p><p><strong>4.</strong> Only record actual enquiries or bookings if proper tracking exists. Then press Save measurements.</p></div><p class="note">Clicks = visits from Google search; impressions = occasions the site appeared in results; average position = an approximate average, not a guaranteed ranking. Google profile interactions are not proven bookings.</p></div><div class="card"><h2>Record monthly results</h2><p class="hint">Only enter measurements from real reports. Leave unmeasured boxes blank and record the date range and source in notes.</p><form id="metricsForm"><div class="formgrid">'+field('month','Month',today,'month')+field('clicks','Google search clicks','','number')+field('impressions','Search impressions','','number')+field('position','Average search position','','number')+field('gbp_website','Business Profile website clicks','','number')+field('gbp_calls','Business Profile call clicks','','number')+field('gbp_directions','Business Profile direction requests','','number')+field('enquiries','Tracked enquiries/bookings','','number')+textarea('notes','Source, context and seasonality notes')+'</div><button class="button gold" type="submit">Save measurements</button></form></div><div class="card"><h2>Measurement history</h2>'+(!m.length?'<p class="muted">No real monthly metrics recorded yet.</p>':'<div class="tablewrap"><table><thead><tr><th>Month</th><th>Clicks</th><th>Impressions</th><th>Position</th><th>GBP website</th><th>Calls</th><th>Directions</th><th>Enquiries</th></tr></thead><tbody>'+m.map(x=>'<tr><td>'+x.month+'</td><td>'+n(x.clicks)+'</td><td>'+n(x.impressions)+'</td><td>'+show(x.position)+'</td><td>'+n(x.gbp_website)+'</td><td>'+n(x.gbp_calls)+'</td><td>'+n(x.gbp_directions)+'</td><td>'+n(x.enquiries)+'</td></tr>').join('')+'</tbody></table></div>')+'</div></details>'}
function report(){const m=detail.metrics,first=m[0],last=m.at(-1),a=detail.audits[0],p=progress(),max=Math.max(1,...m.map(x=>x.clicks||0)),done=tasks.filter(t=>!t[0].startsWith('m-')&&status(t[0]).status==='done');return '<div class="report"><div class="card"><div class="reportheader"><div class="eyebrow">CHIP IN · SEO PERFORMANCE</div><h2>'+esc(detail.client.name)+'</h2><p>'+esc(detail.client.website)+' · '+date(new Date().toISOString())+'</p></div><p class="note">Results are observed measurements, not necessarily changes caused solely by SEO. Work completed is reported separately. No rankings or business outcomes are guaranteed. '+(last&&String(last.notes||'').includes('PARTIAL CURRENT MONTH')?'The latest Google search month is incomplete, so no growth comparisons are shown.':'')+'</p><div class="cards"><div class="card"><div class="eyebrow">Search clicks</div><div class="metric">'+n(last?.clicks)+'</div><small>Since first recorded complete month: '+(last&&first&&!String(last.notes||'').includes('PARTIAL CURRENT MONTH')?pct(last.clicks,first.clicks):'Not comparable yet')+'</small></div><div class="card"><div class="eyebrow">Search impressions</div><div class="metric">'+n(last?.impressions)+'</div><small>Since first recorded complete month: '+(last&&first&&!String(last.notes||'').includes('PARTIAL CURRENT MONTH')?pct(last.impressions,first.impressions):'Not comparable yet')+'</small></div><div class="card"><div class="eyebrow">Enquiries</div><div class="metric">'+n(last?.enquiries)+'</div><small>Since first recorded month: '+(last&&first?pct(last.enquiries,first.enquiries):'—')+'</small></div></div><div class="cards"><div class="card"><div class="eyebrow">Business Profile website clicks</div><div class="metric">'+n(last?.gbp_website)+'</div><small>Latest recorded month</small></div><div class="card"><div class="eyebrow">Business Profile call clicks</div><div class="metric">'+n(last?.gbp_calls)+'</div><small>Not confirmed telephone enquiries</small></div><div class="card"><div class="eyebrow">Direction requests</div><div class="metric">'+n(last?.gbp_directions)+'</div><small>Not confirmed visits</small></div></div><h3>Monthly Google search clicks</h3>'+(!m.length?'<p class="muted">Waiting for actual performance data.</p>':'<div class="bars">'+m.slice(-12).map(x=>'<div title="'+x.month+': '+n(x.clicks)+'" class="bar" style="height:'+Math.max(2,Math.round(100*(x.clicks||0)/max))+'%"><small>'+x.month.slice(5)+'</small></div>').join('')+'</div><p class="hint">Only months supplied are displayed; missing measurements are not estimated.</p>')+'</div><div class="card"><h2>Verified delivery</h2><p>'+p.done+'/'+p.total+' foundation tasks completed or marked not applicable.</p><div class="progress"><i style="width:'+p.pc+'%"></i></div><h3 style="margin-top:20px">Completed actions</h3>'+(done.length?'<ul>'+done.map(t=>'<li>'+esc(t[1])+(status(t[0]).notes?' — '+esc(status(t[0]).notes):'')+'</li>').join('')+'</ul>':'<p class="muted">No completed tasks yet.</p>')+'</div><div class="card"><h2>Technical evidence</h2>'+(!a?'<p class="muted">No technical check yet.</p>':'<p>'+a.checks.filter(x=>x.ok).length+' checks passed and '+a.checks.filter(x=>!x.ok).length+' flagged for review on '+date(a.checkedAt)+'.</p><ul>'+a.checks.filter(x=>!x.ok).map(x=>'<li>'+esc(x.label)+': '+esc(x.detail)+'</li>').join('')+'</ul>')+'<p class="hint">Sources: public site technical spot-check, Search Console API imported or manually entered statistics, Google Business Profile measurements entered when available, and client-agreed enquiry tracking. Check tracking changes, seasonality and brand searches when interpreting results.</p></div></div>'}
const intakeText=['CHIP IN — SEO CLIENT ONBOARDING','Business name and website:','Trading address and phone:','Main contact and email:','Opening hours:','Main services/products:','Areas served:','Top three commercial priorities:','Known local competitors:','Website booking or enquiry process:','Seasonal services, menus and photographs:','Who manages website/hosting/domain:','Who owns Google Business Profile:','Who can invite us to Search Console and analytics:','Approval to perform an audit and agreed technical changes:','','ACCESS: Grant appropriate roles through official tools. Never share passwords, tokens or recovery codes.'].join('\n');
function intake(){return '<div class="card"><h2>Client onboarding questionnaire</h2><p>Copy the questions to your existing Client Project Hub or send them to the business contact.</p><textarea readonly id="questionnaire" style="min-height:360px">'+esc(intakeText)+'</textarea><p>'+btn('Copy questionnaire','copy','gold')+'</p><p class="hint">This is a private admin system, not a public client submission form.</p></div>'}


function onboardingEmailDetails(link){
 const c=detail.client||{},submitted=detail.intake?.submission?.data||{};
 const recipient=String(c.email||submitted.contact_email||'').trim();
 const company=String(c.name||'your business').trim();
 const fullName=String(c.contact||submitted.contact_name||'').trim();
 const firstName=fullName.split(/\s+/)[0]||'';
 const greeting='Hello'+(firstName?' '+firstName:'')+',';
 const subject='Your SEO onboarding with Chip In';
 const intro="Thank you for choosing Chip In to help more customers find "+company+" online.";
 const task="Before we begin, please complete the short, secure setup form below. It explains what we'll do, asks a few questions about your business and helps us arrange access to your existing website and Google search reports.";
 const reassurance="You don't need to be technical, and you should never share your passwords. If you're unsure about anything, just choose 'Not sure - please help me' and we'll guide you.";
 const signoff="Kind regards,\nJames Butt\nChip In";
 const label='Click to Begin SEO Onboarding';
 const plaintext=greeting+"\n\n"+intro+"\n\n"+task+"\n\n"+label+":\n"+link+"\n\n"+reassurance+"\n\n"+signoff;
 const html='<div style="font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.65;color:#26384b">'+
 '<p>'+esc(greeting)+'</p><p>'+esc(intro)+'</p><p>'+esc(task)+'</p>'+
 '<p><a href="'+esc(link)+'" style="color:#115ea8;text-decoration:underline;font-weight:700">'+esc(label)+'</a></p>'+
 '<p>'+esc(reassurance)+'</p><p>Kind regards,<br>James Butt<br>Chip In</p></div>';
 return {recipient,subject,plaintext,html,label,firstName};
}
async function ensureOnboardingEmailLink(){
 if(detail.intakeLinkUrl)return detail.intakeLinkUrl;
 if(detail.intake?.link?.url){
  detail.intakeLinkUrl=detail.intake.link.url;
  return detail.intakeLinkUrl;
 }
 // The caller checks for old, non-recoverable invitations before opening Gmail.
 const issued=await api('/api/clients/'+detail.id+'/intake','POST',{});
 if(!issued.url||!/^https:\/\/onboard\.chipinworks\.co\.uk\/i\/[0-9a-f]{64}$/.test(issued.url))throw Error('Could not create a valid onboarding link.');
 detail.intakeLinkUrl=issued.url;
 detail.intake=await api('/api/clients/'+detail.id+'/intake');
 return issued.url;
}

function clientIntake(){
 const c=detail.client||{},x=detail.intake||{},sent=x.submission,link=x.link;
 const access={invited:'Invitation reported as sent',will_invite:'Not invited yet',need_help:'Needs help',no_access:'Client cannot access the site',exists:'Account exists, not yet shared',not_set_up:'Not yet configured',not_applicable:'Not applicable',unknown:'Client is unsure',access:'Access reported',no:'No'};
 const platform={wix:'Wix',wordpress:'WordPress',squarespace:'Squarespace',shopify:'Shopify',custom:'Custom-built',other:'Other',unknown:'Unknown'};
 const result=sent?.data||{},list=[
 ['Business',result.business_name],['Website',result.website_url],['Contact',result.contact_name],['Contact email',result.contact_email],['Contact telephone',result.contact_phone],['Contact role',result.contact_role],
 ['Business address',result.business_address],['Areas served',result.service_areas],['Services and products',result.services],['Ideal customers',result.audience],['Main objectives',result.goals],['Competitors',result.competitors],
 ['Website platform',platform[result.platform]||result.platform],['Other provider',result.other_platform],
 ['Website editor access',access[result.website_access]||result.website_access],['Google Search Console access',access[result.search_console]||result.search_console],
 ['Search Console property',result.search_console_property],['Google Business Profile access',access[result.business_profile]||result.business_profile],
 ['Google Analytics',access[result.analytics]||result.analytics],['Website account email (not password)',result.access_email],
 ['Access or approval notes',result.access_notes],['Website change permission',result.permission_level==='non_visible'?'Non-visible SEO changes allowed after access is verified; visible changes require approval':result.permission_level==='ask_each'?'Ask the client before ANY changes':'Not provided']
 ];
 return '<section class="card intake-admin"><div class="eyebrow">CLIENT ONBOARDING · PRIVATE INVITATION</div><h2>Invite '+esc(c.name)+' to complete their SEO setup</h2><p>Send a unique link explaining the service and asking for business details, website platform, Google access and approval boundaries. No account passwords are requested or stored.</p>'+
 '<div class="grid2"><div class="card"><h3>1. Email the invitation</h3><p>Open a ready-written Gmail message in a new tab, with this customer’s email address, subject and full message already filled in. Review it and press Send yourself.</p>'+ 
 '<div class="intake-email-actions">'+btn('Open Gmail draft','gmail-intake','gold')+'</div>'+
 '<p class="hint">The email includes <strong>Click to Begin SEO Onboarding</strong> followed by the customer’s clickable private website link. No copying or pasting is needed.</p>'+
 (!c.email&&!result.contact_email?'<p class="hint"><strong>Customer email missing.</strong> Add their email address in Client details before opening the Gmail draft.</p>':'')+
 '<h3>Private onboarding link</h3><p>Each invitation expires after 30 days. Creating a new link replaces the earlier one.</p>'+
 btn(link?'Generate a replacement link':'Create a secure client link','issue-intake','gold')+
 (detail.intakeLinkUrl?'<div class="intake-link"><label>Copy and send this private link</label><input readonly id="intakeInviteLink" value="'+esc(detail.intakeLinkUrl)+'"><div class="row">'+btn('Copy client link','copy-intake','gold')+' <a href="'+esc(detail.intakeLinkUrl)+'" target="_blank" rel="noopener noreferrer">Open client form</a></div></div>':'<p class="hint">Links are shown only when generated. If you have lost a link, create a new one; the previous link will stop working.</p>')+
 (link?'<p class="hint">Most recent invitation created '+date(link.createdAt)+'. Expiry '+date(link.expiresAt)+'.</p>':'')+(link&&!link.recoverable&&!link.revoked&&Date.parse(link.expiresAt)>Date.now()?'<p class="hint"><strong>This is an earlier invitation created before links could be securely recovered.</strong> To email it from here, you will need to generate one replacement link once. If you have already sent the old link, it will stop working after replacement.</p>':'')+'</div>'+
 '<div class="card"><h3>2. Have they completed it?</h3>'+
 (sent?'<p class="intake-received"><strong>Form received</strong><br>Submitted '+esc(date(sent.submittedAt))+'</p><p>Review the answers below. Access reported by a client must still be independently confirmed.</p>':'<p><strong>No form submitted yet.</strong></p><p>Send the personal link to the business owner or someone authorised to arrange website and Google access.</p>')+
 '<p class="hint">Google and Wix access use collaborator invitations, not shared passwords. The client remains the owner of their accounts.</p></div></div>'+
 (sent?'<section class="card"><h3>3. Information received from the client</h3><p>These are the actual submitted answers. They have not automatically modified the website or existing client details.</p><div class="intake-responses">'+list.filter(([,value])=>value).map(([label,value])=>'<div><strong>'+esc(label)+'</strong><p>'+esc(value)+'</p></div>').join('')+'</div></section>':'')+
 '<div class="card"><h3>What the client will be asked to do</h3><p>Explain their business and goals; identify their website platform; invite Chip In to the site with SEO permissions; grant Google Search Console read-only access; give optional Business Profile manager access; choose what kind of changes they approve.</p><p class="hint"><strong>Not yet automatic:</strong> The form records answers, but it cannot grant Wix or Google access on the owner’s behalf. After submission, verify each invitation before making changes.</p></div></section>';
}

function clientScreen(){const c=detail.client,links=[['intake','Client onboarding'],['results','Results & progress'],['work','Work done'],['report','Customer report'],['guide','Setup'],['audit','Website check'],['metrics','Google connection'],['checklist','Work checklist'],['overview','Technical detail'],['edit','Client details']];return '<div class="top"><div><div class="eyebrow">Client project</div><h1>'+esc(c.name)+'</h1><p class="muted">'+esc(c.website)+'</p></div><div class="toolbar">'+btn('All clients','back')+btn('Print report','print','gold')+'</div></div><div class="tabs">'+links.map(x=>'<button data-tab="'+x[0]+'" class="'+(tab===x[0]?'active':'')+'">'+x[1]+'</button>').join('')+'</div>'+(tab==='intake'?clientIntake():tab==='results'?resultsOverview():tab==='work'?workRecord():tab==='guide'?guide():tab==='overview'?summary():tab==='checklist'?checklist():tab==='audit'?audit():tab==='metrics'?metrics():tab==='report'?clientReport():'<div class="card"><h2>Client details</h2>'+form(true)+'<div style="margin-top:25px;padding-top:20px;border-top:1px solid #eee"><h3>Remove client data</h3><p class="hint">Permanently deletes the client record, metrics, checklists and audit history. Download a private backup first if you need one.</p>'+btn('Permanently delete this client','delete-client','alt')+'</div></div>')}
function render(){let content=page==='client'&&detail?clientScreen():page==='new'?'<div class="top"><h1>New SEO client</h1></div><div class="card">'+form(false)+'</div>':page==='intake'?'<div class="top"><h1>Client onboarding</h1></div>'+intake():home();
app.innerHTML='<div class="layout"><aside class="sidebar"><div class="brand">CHIP <em>IN</em><small>SEO MANAGER V4.3</small></div><nav class="nav"><button data-nav="clients" class="'+(page==='clients'?'active':'')+'">Clients</button><button data-nav="new" class="'+(page==='new'?'active':'')+'">New client</button><button data-nav="intake" class="'+(page==='intake'?'active':'')+'">Onboarding</button>'+(detail?'<button data-nav="client" class="'+(page==='client'?'active':'')+'">Current client</button>':'')+'</nav><div class="aside">Cloudflare Access · EU-region storage<br>Chip In SEO Manager</div></aside><main class="main">'+message+content+'</main></div>';message=''}
app.addEventListener('click',async ev=>{const x=ev.target.closest('[data-nav],[data-tab],[data-open],[data-action]');if(!x)return;try{
if(x.dataset.nav){page=x.dataset.nav;render();return}
if(x.dataset.tab){tab=x.dataset.tab;render();return}
if(x.dataset.open){await open(x.dataset.open);return}
const a=x.dataset.action;
if(a==='new'){page='new';render()}else if(['overview','checklist','metrics','report','work','results','edit','intake'].includes(a)){tab=a;render()}else if(a==='refresh-insights'){if(busy)return;busy=true;render();try{detail.insights=await api('/api/clients/'+detail.id+'/insights/sync','POST',{});alertMsg(detail.insights.error?'Google update needs attention: '+detail.insights.error:'Real Google performance figures updated.')}finally{busy=false;render()}}else if(a==='back'){detail=null;page='clients';await refresh();render()}
else if(a==='tasks'){tab='checklist';render()}
else if(a==='copy'){await navigator.clipboard.writeText(intakeText);alertMsg('Onboarding questionnaire copied.')}else if(a==='copy-work'){const prompt='Please help me carry out a proper SEO audit and improvement plan for '+detail.client.name+' ('+detail.client.website+'). I am a complete SEO beginner. Use my connected GitHub/Cloudflare if relevant, research the website and local competitors carefully, and give me ONE action at a time when my involvement is needed. Never invent Search Console figures, claim rankings without evidence, or change a customer website without clear approval.';await navigator.clipboard.writeText(prompt);alertMsg('A detailed ChatGPT instruction has been copied. Paste it into our conversation.')}
else if(a==='issue-intake'){
 if(busy)return;
 const prior=detail.intake?.link;
 if(prior&&!prior.revoked&&Date.parse(prior.expiresAt)>Date.now()&&!window.confirm('This will REPLACE the existing invitation link. Any previous link you emailed will stop working. Create a replacement?'))return;
 busy=true;render();
 try{
   const issued=await api('/api/clients/'+detail.id+'/intake','POST',{});
   detail.intakeLinkUrl=issued.url;
   detail.intake=await api('/api/clients/'+detail.id+'/intake');
   tab='intake';alertMsg('Private client link created. You can now open the prefilled Gmail draft.');
 }finally{busy=false;render()}
}

else if(a==='gmail-intake'){
 if(busy)return;
 const recipient=String(detail.client?.email||detail.intake?.submission?.data?.contact_email||'').trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient))throw Error('Add a valid customer email address in Client details before opening the Gmail draft.');
 const current=detail.intake?.link;
 // Existing legacy links cannot be reconstructed from their stored hash. Warn BEFORE opening any tab.
 if(current&&!current.revoked&&Date.parse(current.expiresAt)>Date.now()&&!current.url&&!detail.intakeLinkUrl){
  if(!window.confirm('This customer already has an older invitation link, but it cannot be retrieved after a reload. To open the Gmail email, create a NEW link. The old link will stop working. Continue?'))return;
 }
 // For securely saved links, navigate straight to Gmail in the click handler (no blank-tab flash).
 const prepared=detail.intakeLinkUrl||detail.intake?.link?.url;
 if(prepared){
  const draft=onboardingEmailDetails(prepared);
  const url='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(recipient)+
   '&su='+encodeURIComponent(draft.subject)+'&body='+encodeURIComponent(draft.plaintext);
  const tab=window.open(url,'_blank');
  if(!tab)throw Error('Your browser blocked the Gmail tab. Allow pop-ups for SEO Manager and try again.');
  try{tab.opener=null}catch{}
  alertMsg('Gmail draft opened in a new tab. Review it and press Send.');
  return;
 }
 // For brand-new clients (or a one-time legacy replacement), reserve the tab synchronously.
 const tab=window.open('about:blank','_blank');
 if(!tab)throw Error('Your browser blocked the Gmail tab. Allow pop-ups for SEO Manager and try again.');
 busy=true;render();
 try{
  const link=await ensureOnboardingEmailLink();
  const draft=onboardingEmailDetails(link);
  const url='https://mail.google.com/mail/?view=cm&fs=1&to='+encodeURIComponent(recipient)+
   '&su='+encodeURIComponent(draft.subject)+'&body='+encodeURIComponent(draft.plaintext);
  tab.location.replace(url);
  try{tab.opener=null}catch{}
  alertMsg('Gmail draft opened with the customer, subject and full message prefilled. Review and press Send.');
 }catch(err){
  // Don't close a tab immediately after opening it: that causes the reported "flash".
  try{tab.document.body.textContent='Could not prepare your onboarding email. Return to SEO Manager to see the error. No email was sent.'}catch{}
  throw err;
 }finally{busy=false;render()}
}
else if(a==='copy-intake'){
 if(!detail.intakeLinkUrl)throw Error('Generate a private client link first.');
 await navigator.clipboard.writeText(detail.intakeLinkUrl);alertMsg('Private client onboarding link copied.');
}
else if(a==='copy-external-access'){
 const c=detail.client;
 const msg='Please invite Chip In to work on the SEO of your existing website '+c.website+'. On Wix, open your site Dashboard > Roles & Permissions > Invite Collaborators. Use a suitable restricted role with SEO settings access; editing/publishing only with your approval. Do not send passwords. Please also arrange read-only access to your Google Search Console property, so we can measure search performance. We will not make visible website changes without your written agreement.';
 await navigator.clipboard.writeText(msg);
 alertMsg('A client access request was copied. You can send it when ready.');
}else if(a==='copy-audit'){const audit=detail.audits[0];if(!audit)throw Error('Run a check first');const prompt='Review the limited Chip In SEO homepage spot-check for '+detail.client.name+' ('+detail.client.website+'). I have no SEO knowledge. These are the items to review: '+audit.checks.filter(x=>!x.ok).map(x=>x.label+': '+x.detail).join('; ')+'. Research before making claims. Explain exactly what to fix and implement safely where you have approved access; do not treat missing /sitemap.xml as proof there is no sitemap.';await navigator.clipboard.writeText(prompt);alertMsg('Audit findings copied as a request for ChatGPT. Paste them into our conversation.')}
else if(a==='copy-task'){
 const task=tasks.find(t=>t[0]===x.dataset.taskKey);
 if(!task)throw Error('Could not identify the task');
 const prompt='Help me with this SEO task for '+detail.client.name+' at '+detail.client.website+'. Task: '+task[1]+'. Description: '+(TASK_HELP[task[0]]||'Investigate and complete the task.')+'. I have no SEO experience. Research the website and facts, propose what to do, and use connected tools for permitted code changes. Where I must take action, give me one small exact step at a time. Do not claim completion unless verified.';
 await navigator.clipboard.writeText(prompt);
 alertMsg('Instructions copied. Paste them into our ChatGPT conversation.');
}else if(a==='copy-audit'){
 const audit=detail.audits[0];
 if(!audit)throw Error('Run an automatic website check first.');
 const flags=audit.checks.filter(z=>!z.ok);
 const findings=flags.length?flags.map(z=>z.label+': '+z.detail).join('; '):'No issues flagged by the limited automated check.';
 const prompt='Please investigate these SEO homepage spot-check results for '+detail.client.name+' at '+detail.client.website+': '+findings+'. I am an SEO beginner. Research carefully before making changes; distinguish potential issues from real errors. Do not assume a missing /sitemap.xml means no sitemap exists. Help fix verified problems using available tools with suitable approval and explain required manual steps one at a time.';
 await navigator.clipboard.writeText(prompt);
 alertMsg('Website findings copied. Paste into ChatGPT for analysis and help.');
}else if(a==='delete-client'){if(!window.confirm('Permanently delete '+detail.client.name+' and ALL SEO records? This cannot be undone.'))return;await api('/api/clients/'+detail.id,'DELETE');detail=null;await refresh();page='clients';alertMsg('Client and associated data permanently removed.')}else if(a==='print'){tab='report';render();window.print()}
else if(a==='refresh-gsc'){detail.gsc=await api('/api/clients/'+detail.id+'/gsc');alertMsg(detail.gsc.configured?'Cloudflare key detected. Grant this website permission and run the import to verify access.':'Not connected yet. Complete the Google Cloud and Cloudflare steps shown on this page.')}
else if(a==='copy-secret-name'){await navigator.clipboard.writeText('GSC_SERVICE_ACCOUNT_JSON');alertMsg('Exact Cloudflare secret name copied.')}
else if(a==='copy-service-email'){if(!detail.gsc?.serviceAccountEmail)throw Error('The Google service account email is not yet available.');await navigator.clipboard.writeText(detail.gsc.serviceAccountEmail);alertMsg('Service account email address copied.')}
else if(a==='sync-gsc'){if(busy)return;busy=true;render();try{const res=await api('/api/clients/'+detail.id+'/gsc/sync','POST',{});await open(detail.id,'metrics');alertMsg('Google Search Console connection verified. Imported '+res.result.months.filter(x=>x.status==='imported'||x.status==='partial-imported').length+' months of data.')}catch(err){try{detail.gsc=await api('/api/clients/'+detail.id+'/gsc')}catch{}alertMsg('Google import failed: '+String(err.message),'error')}finally{busy=false;render()}}
else if(a==='audit'){if(busy)return;busy=true;render();try{await api('/api/clients/'+detail.id+'/audit','POST',{});await open(detail.id,'audit');}finally{busy=false;render()}alertMsg('Website check completed and saved.')}
else if(a==='backup'){const data=await api('/api/export');const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='chipin-seo-backup-'+today+'.json';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),5000);alertMsg('Private JSON backup downloaded.')}
}catch(e){busy=false;alertMsg(e.message,'error')}});
app.addEventListener('change',async ev=>{const x=ev.target;if(x.id==='workMonth'){workMonth=x.value;render();return}if(!x.matches('.task-change,.task-note'))return;const row=x.closest('.task');try{await api('/api/clients/'+detail.id+'/tasks','PUT',{key:row.dataset.key.startsWith('m-')?'monthly-'+workMonth+'-'+row.dataset.key.slice(2):row.dataset.key,status:row.querySelector('select').value,notes:row.querySelector('input').value});detail=await api('/api/clients/'+detail.id);alertMsg('Task saved.')}catch(e){alertMsg(e.message,'error')}});
app.addEventListener('submit',async ev=>{const f=ev.target;if(!['clientForm','metricsForm','workForm'].includes(f.id))return;ev.preventDefault();const data=Object.fromEntries(new FormData(f));try{
if(f.id==='clientForm'){if(!data.name||!data.website)throw Error('Business name and URL are required');if(f.dataset.edit==='yes'){await api('/api/clients/'+detail.id,'PUT',data);await open(detail.id);alertMsg('Client updated.')}else{const r=await api('/api/clients','POST',data);await refresh();await open(r.id,'intake');alertMsg('Client added. Generate their private onboarding link below and send it to the business owner.')}}
else if(f.id==='workForm'){await api('/api/clients/'+detail.id+'/work','POST',data);await open(detail.id,'work');alertMsg('Completed work recorded, with evidence if supplied.')}else{await api('/api/clients/'+detail.id+'/metrics','PUT',data);await open(detail.id,'metrics');alertMsg('Monthly figures saved.')}
}catch(e){alertMsg(e.message,'error')}});
(async()=>{try{await refresh();render()}catch(e){app.innerHTML='<main style="padding:25px"><h1>SEO Manager</h1><p class="error">'+esc(e.message)+'</p><button onclick="location.reload()">Try again</button></main>'}})();
})();
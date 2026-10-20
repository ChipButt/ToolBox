(function () {
  "use strict";
  const KEY = "toolbox.tom-daily.v2";
  const OLD_KEY = "toolbox.tom-daily-checklist.v1";
  const WEEKDAYS = [{n:1,s:"Mon"},{n:2,s:"Tue"},{n:3,s:"Wed"},{n:4,s:"Thu"},{n:5,s:"Fri"},{n:6,s:"Sat"},{n:0,s:"Sun"}];
  const ALL_DAYS = [0,1,2,3,4,5,6];
  const $ = id => document.getElementById(id);
  let state, currentDay = "", monthCursor, selectedDay, addDays = new Set(ALL_DAYS);
  let undo = null, deferredInstall = null;
  const valMax = 1000000000;
  const clone = obj => JSON.parse(JSON.stringify(obj));
  function keyOf(date) {
    return date.getFullYear() + "-" + String(date.getMonth()+1).padStart(2,"0") + "-" + String(date.getDate()).padStart(2,"0");
  }
  function dateFromKey(key) {
    const parts = key.split("-").map(Number);
    return new Date(parts[0],parts[1]-1,parts[2]);
  }
  function todayKey() { return keyOf(new Date()); }
  function validKey(str) { return typeof str === "string" && /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12]\d|3[01])$/.test(str) && keyOf(dateFromKey(str))===str; }
  function makeId() { return "goal_"+Date.now().toString(36)+"_"+Math.random().toString(36).slice(2,9); }
  function goal(id,label,type,target,unit,days) { return {id,label,type,target: type==="number"?target:1,unit:type==="number"?unit:"",days:days.slice()}; }
  function initialState() {
    return {version:2,created:todayKey(),name:"Tom",accent:"green",reminders:{enabled:false,time:"20:00",notified:""},
      items:[
        goal("gym","Gym","check",1,"",ALL_DAYS),
        goal("calories","3,000 calories","number",3000,"kcal",ALL_DAYS),
        goal("creatine","Creatine","check",1,"",ALL_DAYS),
        goal("water","Drink water","number",2,"litres",ALL_DAYS)
      ],days:{}};
  }
  function numberOr(value,defaultValue) {
    const n=Number(value);
    return Number.isFinite(n)&&n>=0&&n<=valMax?n:defaultValue;
  }
  function safeGoal(raw,used) {
    if (!raw || typeof raw!=="object" || typeof raw.label!=="string" || !raw.label.trim() || raw.label.length>80 ||
      typeof raw.id!=="string" || !/^[A-Za-z0-9_-]{1,80}$/.test(raw.id) || used.has(raw.id)) throw Error("Invalid or duplicate goal.");
    used.add(raw.id);
    let type=raw.type==="number"?"number":"check";
    let days=Array.isArray(raw.days)?[...new Set(raw.days.filter(n=>Number.isInteger(n)&&n>=0&&n<=6))]:ALL_DAYS.slice();
    let unit=typeof raw.unit==="string"?raw.unit.slice(0,18):"";
    let target=numberOr(raw.target,1);
    if(type==="number" && target<=0)target=1;
    return goal(raw.id,raw.label.trim(),type,target,unit,days);
  }
  function normalise(raw) {
    if(!raw||typeof raw!=="object"||!Array.isArray(raw.items)||!raw.days||typeof raw.days!=="object"||Array.isArray(raw.days))
      throw Error("Not a Tom's Daily backup.");
    if(raw.items.length>250||Object.keys(raw.days).length>20000)throw Error("Backup too large.");
    const used=new Set(),items=raw.items.map(item=>safeGoal(item,used));
    const days=Object.create(null);
    Object.keys(raw.days).forEach(key=>{
      if(!validKey(key))throw Error("Invalid date in backup.");
      const day=raw.days[key];
      if(!day||typeof day!=="object"||!Array.isArray(day.items)||day.items.length>250)throw Error("Invalid day in backup.");
      const ids=new Set(),snapshot=day.items.map(item=>safeGoal(item,ids));
      const values=Object.create(null);
      const source=day.values && typeof day.values==="object" && !Array.isArray(day.values)?day.values:{};
      snapshot.forEach(item=>{
        if(Object.prototype.hasOwnProperty.call(source,item.id))
          values[item.id]=item.type==="number"?numberOr(source[item.id],0):source[item.id]===true;
      });
      days[key]={items:snapshot,values};
    });
    const time=raw.reminders&&typeof raw.reminders.time==="string"&&/^([01]\d|2[0-3]):[0-5]\d$/.test(raw.reminders.time)
      ?raw.reminders.time:"20:00";
    return {version:2,created:validKey(raw.created)?raw.created:todayKey(),
      name:typeof raw.name==="string"&&raw.name.trim()?raw.name.trim().slice(0,30):"Tom",
      accent:["green","blue","coral"].includes(raw.accent)?raw.accent:"green",
      reminders:{enabled:!!(raw.reminders&&raw.reminders.enabled),time,notified:validKey(raw.reminders&&raw.reminders.notified)?raw.reminders.notified:""},
      items,days};
  }
  function migrateV1(old) {
    if(!old||!Array.isArray(old.items)||!old.days||typeof old.days!=="object")throw Error("Old checklist not valid.");
    const result=initialState();
    result.items=old.items.map(item=>{
      const match=typeof item.label==="string" && item.label.match(/([\d,]+)\s*(?:calories|kcal)/i);
      if(match)return goal(item.id,item.label,"number",Number(match[1].replace(/,/g,"")),"kcal",ALL_DAYS);
      return goal(item.id,item.label,"check",1,"",ALL_DAYS);
    });
    result.created=validKey(old.created)?old.created:todayKey();
    Object.keys(old.days).forEach(key=>{
      if(!validKey(key))return;
      const prior=old.days[key];
      if(!prior||!Array.isArray(prior.items)||!Array.isArray(prior.done))return;
      const snapshot=prior.items.map(item=>{
        const current=result.items.find(x=>x.id===item.id);
        return current?goal(item.id,item.label,current.type,current.target,current.unit,ALL_DAYS):goal(item.id,item.label,"check",1,"",ALL_DAYS);
      });
      const values=Object.create(null);
      prior.done.forEach(id=>{
        const item=snapshot.find(x=>x.id===id);
        if(item)values[id]=item.type==="number"?item.target:true;
      });
      result.days[key]={items:snapshot,values};
    });
    return normalise(result);
  }
  function errorMessage(text) { $("errorNotice").textContent=text; $("errorNotice").hidden=false; }
  function save() {
    try { localStorage.setItem(KEY,JSON.stringify(state));return true; }
    catch(e) {errorMessage("Your changes could not be saved on this device. Check private browsing or storage settings, and download a backup.");return false;}
  }
  function load() {
    try {
      const newer=localStorage.getItem(KEY),older=localStorage.getItem(OLD_KEY);
      state=newer?normalise(JSON.parse(newer)):older?migrateV1(JSON.parse(older)):initialState();
      if(!newer)save();
    } catch(e) {
      state=initialState();
      errorMessage("Saved data could not be read. A fresh routine is shown. Restore a backup from Settings if you have one. Your old data has not been deleted.");
    }
  }
  function isScheduled(item,key) {return item.days.includes(dateFromKey(key).getDay());}
  function dueItems(key) {return state.items.filter(item=>isScheduled(item,key)).map(clone);}
  function ensureToday() {
    const key=todayKey();currentDay=key;
    if(!Object.prototype.hasOwnProperty.call(state.days,key)) {
      state.days[key]={items:dueItems(key),values:{}};
      save();
    }
    return state.days[key];
  }
  function syncToday() {
    ensureToday();
    const snapshot=dueItems(currentDay),values=state.days[currentDay].values;
    const ids=new Set(snapshot.map(item=>item.id));
    Object.keys(values).forEach(id=>{if(!ids.has(id))delete values[id];});
    state.days[currentDay].items=snapshot;
    save();render();
  }
  function complete(item,value) {return item.type==="check"?value===true:numberOr(value,0)>=item.target;}
  function dayStats(key) {
    const day=state.days[key];
    if(!day)return null;
    return {total:day.items.length,done:day.items.filter(item=>complete(item,day.values[item.id])).length};
  }
  function percent(done,total) {return total?Math.round(done/total*100):0;}
  function elem(tag,className,text) {
    const node=document.createElement(tag);if(className)node.className=className;
    if(text!==undefined)node.textContent=String(text);
    return node;
  }
  function button(label,className,action) {
    const el=elem("button",className,label);el.type="button";el.addEventListener("click",action);return el;
  }
  function pretty(value) {
    return Number(value).toLocaleString("en-GB",{maximumFractionDigits:2});
  }
  function showToast(message) {
    $("toastText").textContent=message;$("toast").hidden=false;
    $("undoBtn").hidden=!undo;
  }
  function setValue(id,value) {
    ensureToday();
    const item=state.days[currentDay].items.find(item=>item.id===id);
    if(!item)return;
    const values=state.days[currentDay].values;
    const had=Object.prototype.hasOwnProperty.call(values,id),previous=values[id];
    values[id]=item.type==="number"?numberOr(value,0):!!value;
    undo={day:currentDay,id,had,previous};
    save();render();
    showToast("Goal updated.");
  }
  function undoLast() {
    if(!undo)return;
    const change=undo;undo=null;
    if(change.day!==currentDay || !state.days[currentDay])return;
    if(change.had)state.days[currentDay].values[change.id]=change.previous;
    else delete state.days[currentDay].values[change.id];
    save();render();$("toast").hidden=true;
  }
  function progressStreak() {
    let date=new Date(),found=0,count=0,limit=365;
    const today=keyOf(date),stat=dayStats(today);
    if(!stat||stat.total===0||stat.done!==stat.total)date.setDate(date.getDate()-1);
    while(limit-->0) {
      const key=keyOf(date);
      if(key<state.created)break;
      const rec=state.days[key];
      const scheduled=rec?rec.items:dueItems(key);
      if(scheduled.length) {
        const stats=dayStats(key);
        if(!stats||stats.done!==stats.total)break;
        count++;found++;
      }
      date.setDate(date.getDate()-1);
    }
    return count;
  }
  function renderHero() {
    const date=new Date(),day=ensureToday(),stats=dayStats(currentDay),p=percent(stats.done,stats.total);
    document.body.dataset.accent=state.accent;
    $("dateLabel").textContent=date.toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long"});
    $("appHeading").textContent=state.name+"'s Daily";
    document.title=state.name+"'s Daily · ToolBox";
    $("ring").style.setProperty("--pct",p);
    $("ring").setAttribute("aria-valuenow",String(p));
    $("percent").textContent=p+"%";$("doneCount").textContent=stats.done+" / "+stats.total;
    $("statusHeading").textContent=!stats.total?"A well-earned rest":stats.done===stats.total?"Today's goals complete!":stats.done===0?"Ready to start?":stats.done+" down, "+(stats.total-stats.done)+" to go";
    $("statusDetail").textContent=!stats.total?"Nothing scheduled for today.":stats.done===stats.total?"Great work. Your next list starts tomorrow.":"Check off goals as you complete them.";
    $("allDone").hidden=!stats.total||stats.done!==stats.total;
    const streak=progressStreak();
    $("streakLabel").textContent=streak+"-session streak · Rest days skipped";
  }
  function renderToday() {
    const root=$("taskList");root.replaceChildren();
    const rec=ensureToday();
    if(!rec.items.length)root.appendChild(elem("div","empty","Nothing scheduled today. Adjust your routine to add goals."));
    const items=rec.items.slice().sort((a,b)=>Number(complete(a,rec.values[a.id]))-Number(complete(b,rec.values[b.id])));
    items.forEach(item=>{
      const value=rec.values[item.id],isDone=complete(item,value);
      const card=elem("div","task"+(isDone?" complete":""));
      const head=elem("div","task-head");
      const check=button(isDone?"✓":"", "task-check"+(isDone?" checked":""),()=>{
        setValue(item.id,!complete(item,state.days[currentDay].values[item.id]));
      });
      if(item.type==="number"){check.disabled=true;check.setAttribute("aria-label",isDone?"Target reached":"Not yet at target");}
      else{check.setAttribute("aria-pressed",String(isDone));check.setAttribute("aria-label",item.label+(isDone?", completed":", incomplete"));}
      head.appendChild(check);
      const labels=elem("div","task-label",item.label);
      const meta=elem("span","task-meta",item.type==="number"?pretty(numberOr(value,0))+" / "+pretty(item.target)+" "+item.unit:(isDone?"Completed":"Tap to complete"));
      labels.appendChild(meta);head.appendChild(labels);
      if(item.type==="check") {
        head.style.cursor="pointer";
        labels.addEventListener("click",()=>setValue(item.id,!complete(item,state.days[currentDay].values[item.id])));
      }
      card.appendChild(head);
      if(item.type==="number") {
        const controls=elem("div","numeric-row");
        const stepSize=item.unit.toLowerCase().includes("kcal")?250:item.target>=100?Math.max(1,Math.round(item.target/12)):item.target>=10?1:item.target>=1?0.25:0.1;
        const decrement=button("−","step",()=>setValue(item.id,Math.max(0,numberOr(state.days[currentDay].values[item.id],0)-stepSize)));
        decrement.setAttribute("aria-label","Decrease "+item.label);
        const input=elem("input","number-input");input.type="number";input.min="0";input.max=String(valMax);input.step="any";input.inputMode="decimal";
        input.value=String(numberOr(value,0));input.setAttribute("aria-label",item.label+" progress");
        input.addEventListener("change",()=>setValue(item.id,input.value));
        const increment=button("+","step",()=>setValue(item.id,Math.min(valMax,numberOr(state.days[currentDay].values[item.id],0)+stepSize)));
        increment.setAttribute("aria-label","Increase "+item.label);
        controls.append(decrement,input,increment,elem("span","unit",item.unit));
        card.appendChild(controls);
        const meter=elem("div","meter");
        const fill=elem("div","meter-fill");
        fill.style.width=Math.min(100,percent(numberOr(value,0),item.target))+"%";
        meter.appendChild(fill);card.appendChild(meter);
      }
      root.appendChild(card);
    });
  }
  function calendarDate(key) {return dateFromKey(key).toLocaleDateString("en-GB",{weekday:"long",day:"numeric",month:"long",year:"numeric"});}
  function renderWeek() {
    const start=new Date();start.setHours(12,0,0,0);
    start.setDate(start.getDate() - ((start.getDay()+6)%7));
    let done=0,total=0,logged=0;
    for(let i=0;i<7;i++){
      const date=new Date(start);date.setDate(date.getDate()+i);
      const key=keyOf(date);if(key>todayKey())break;
      const stats=dayStats(key);
      if(!stats)continue;
      logged++;done+=stats.done;total+=stats.total;
    }
    const end=new Date(start);end.setDate(end.getDate()+6);
    $("weekRange").textContent=start.toLocaleDateString("en-GB",{day:"numeric",month:"short"})+" – "+end.toLocaleDateString("en-GB",{day:"numeric",month:"short"});
    $("weekDone").textContent=String(done);
    $("weekRate").textContent=percent(done,total)+"%";
    $("weekLogged").textContent=String(logged);
  }
  function renderHistoryDetail() {
    const root=$("historyDetail");root.replaceChildren();
    const heading=elem("h3","",calendarDate(selectedDay));root.appendChild(heading);
    const record=state.days[selectedDay];
    if(!record) {
      root.appendChild(elem("p","muted","Not logged. There is no saved checklist for this date."));
      return;
    }
    const stats=dayStats(selectedDay);
    root.appendChild(elem("p","muted",stats.done+" of "+stats.total+" goals completed."));
    if(!record.items.length){root.appendChild(elem("p","muted","Rest day — no goals scheduled."));return;}
    const list=elem("ul");
    record.items.forEach(item=>{
      const value=record.values[item.id],yes=complete(item,value);
      const li=elem("li");li.appendChild(elem("span","",item.label));
      li.appendChild(elem("span",yes?"yes":"",item.type==="number"?pretty(numberOr(value,0))+" / "+pretty(item.target)+" "+item.unit:yes?"✓ Done":"○ Not done"));
      list.appendChild(li);
    });
    root.appendChild(list);
  }
  function renderCalendar() {
    const root=$("calendar");root.replaceChildren();
    const year=monthCursor.getFullYear(),month=monthCursor.getMonth();
    $("monthHeading").textContent=monthCursor.toLocaleDateString("en-GB",{month:"long",year:"numeric"});
    $("nextMonth").disabled=year>new Date().getFullYear()||(year===new Date().getFullYear()&&month>=new Date().getMonth());
    WEEKDAYS.forEach(day=>root.appendChild(elem("div","calendar-weekday",day.s)));
    const start=(new Date(year,month,1).getDay()+6)%7;
    const length=new Date(year,month+1,0).getDate();
    for(let i=0;i<start;i++)root.appendChild(elem("div","calendar-cell blank"));
    for(let number=1;number<=length;number++){
      const key=keyOf(new Date(year,month,number)),future=key>todayKey(),stats=dayStats(key);
      let klass="calendar-cell";
      if(future)klass+=" future";
      else if(stats&&stats.total>0)klass+=stats.done===stats.total?" full":stats.done>0?" partial":"";
      if(key===todayKey())klass+=" today";
      if(key===selectedDay)klass+=" selected";
      const cell=button(String(number),klass,()=>{
        if(future)return;
        selectedDay=key;renderCalendar();renderHistoryDetail();
      });
      cell.disabled=future;cell.setAttribute("aria-label",calendarDate(key)+", "+(!stats?"not logged":stats.done+" of "+stats.total+" done"));
      if(stats)cell.appendChild(elem("small","",stats.total===0?"Rest":stats.done+"/"+stats.total));
      root.appendChild(cell);
    }
    renderHistoryDetail();
  }
  function dayButtons(container,selected,onChange) {
    container.replaceChildren();
    WEEKDAYS.forEach(({n,s})=>{
      const on=selected.includes(n);
      const btn=button(s,"day-toggle"+(on?" on":""),()=>onChange(n));
      btn.setAttribute("aria-pressed",String(on));
      btn.setAttribute("aria-label",s+" scheduled");
      container.appendChild(btn);
    });
  }
  function editGoal(id,mutate) {
    const item=state.items.find(item=>item.id===id);if(!item)return;
    mutate(item);save();syncToday();
  }
  function renderRoutine() {
    const root=$("routineList");root.replaceChildren();
    if(!state.items.length)root.appendChild(elem("p","muted","No goals yet. Add your first goal below."));
    state.items.forEach((item,index)=>{
      const card=elem("div","task-editor");
      const edit=elem("div","edit-row");
      const field=elem("div","field"),nameLabel=elem("label","", "Goal name");
      const name=elem("input");name.type="text";name.maxLength=80;name.value=item.label;
      nameLabel.appendChild(name);field.appendChild(nameLabel);
      name.addEventListener("change",()=>{
        const label=name.value.trim();if(!label){name.value=item.label;return;}
        editGoal(item.id,x=>x.label=label);
      });
      const typeField=elem("div","field"),typeLabel=elem("label","","Track as"),type=elem("select");
      [["check","Tick when done"],["number","Numeric target"]].forEach(([v,l])=>{
        const op=elem("option","",l);op.value=v;type.appendChild(op);
      });
      type.value=item.type;
      type.addEventListener("change",()=>editGoal(item.id,x=>{x.type=type.value;x.target=x.type==="number"?x.target||1:1;}));
      typeLabel.appendChild(type);typeField.appendChild(typeLabel);edit.append(field,typeField);card.appendChild(edit);
      if(item.type==="number"){
        const row=elem("div","edit-row"),targetField=elem("div","field"),unitField=elem("div","field");
        const targetLabel=elem("label","","Daily target"),target=elem("input");
        target.type="number";target.min="0.01";target.step="any";target.value=String(item.target);
        target.addEventListener("change",()=>{
          const n=Number(target.value);
          if(!Number.isFinite(n)||n<=0||n>valMax){target.value=String(item.target);return;}
          editGoal(item.id,x=>x.target=n);
        });
        targetLabel.appendChild(target);targetField.appendChild(targetLabel);
        const unitLabel=elem("label","","Unit"),unit=elem("input");unit.maxLength=18;unit.value=item.unit;
        unit.addEventListener("change",()=>editGoal(item.id,x=>x.unit=unit.value.trim().slice(0,18)));
        unitLabel.appendChild(unit);unitField.appendChild(unitLabel);row.append(targetField,unitField);card.appendChild(row);
      }
      card.appendChild(elem("p","muted small","Scheduled days"));
      const days=elem("div","day-select");
      dayButtons(days,item.days,n=>editGoal(item.id,x=>{
        x.days=x.days.includes(n)?x.days.filter(v=>v!==n):[...x.days,n].sort();
      }));
      card.appendChild(days);
      const buttons=elem("div","editor-actions");
      const up=button("↑ Up","btn",()=>move(index,-1));up.disabled=index===0;
      const down=button("↓ Down","btn",()=>move(index,1));down.disabled=index===state.items.length-1;
      const remove=button("Remove","btn danger",()=>{
        if(!confirm("Remove "+item.label+" from your routine? Previous day records will be preserved."))return;
        state.items.splice(index,1);syncToday();
      });
      buttons.append(up,down,remove);card.appendChild(buttons);root.appendChild(card);
    });
  }
  function move(i,delta) {
    const at=i+delta;if(at<0||at>=state.items.length)return;
    [state.items[i],state.items[at]]=[state.items[at],state.items[i]];
    syncToday();
  }
  function showSettings() {
    $("personName").value=state.name;
    document.querySelectorAll("[data-accent]").forEach(btn=>{
      btn.classList.toggle("selected",btn.dataset.accent===state.accent);
      btn.setAttribute("aria-pressed",String(btn.dataset.accent===state.accent));
    });
    $("remindersEnabled").checked=state.reminders.enabled;
    $("reminderTime").value=state.reminders.time;
  }
  function render() {
    renderHero();renderToday();renderWeek();renderCalendar();renderRoutine();showSettings();checkReminder();
  }
  function activeTab(name) {
    ["today","history","routine"].forEach(tab=>{
      $("view-"+tab).hidden=tab!==name;
      const button=document.querySelector('[data-tab="'+tab+'"]');
      button.classList.toggle("active",tab===name);
      if(tab===name)button.setAttribute("aria-current","page");
      else button.removeAttribute("aria-current");
    });
    $("toast").hidden=true;undo=null;
    if(name==="history"){renderWeek();renderCalendar();}
    if(name==="routine")renderRoutine();
  }
  function checkDate() {
    if(todayKey()!==currentDay) {
      undo=null;$("toast").hidden=true;ensureToday();
      monthCursor=new Date();monthCursor.setDate(1);selectedDay=todayKey();
      render();
    } else checkReminder();
  }
  function checkReminder() {
    const notice=$("reminderMessage");
    if(!state.reminders.enabled){notice.hidden=true;return;}
    const stats=dayStats(currentDay),time=new Date();
    const hhmm=String(time.getHours()).padStart(2,"0")+":"+String(time.getMinutes()).padStart(2,"0");
    const pending=stats&&stats.done<stats.total&&stats.total>0&&hhmm>=state.reminders.time;
    notice.hidden=!pending;
    if(pending)notice.textContent="Reminder: "+(stats.total-stats.done)+" goal(s) left on today's list.";
    if(pending&&state.reminders.notified!==currentDay){
      state.reminders.notified=currentDay;save();
      if("Notification" in window&&Notification.permission==="granted") {
        try {new Notification(state.name+"'s Daily",{body:(stats.total-stats.done)+" goals still to finish.",icon:"tom-daily-icon.svg",tag:"tom-daily-"+currentDay});}catch(e) {/* in-app reminder remains */}
      }
    }
  }
  function addGoal(event) {
    event.preventDefault();
    const label=$("newName").value.trim();if(!label)return;
    if(state.items.length>=250){errorMessage("You can have up to 250 goals.");return;}
    if(state.items.some(item=>item.label.toLowerCase()===label.toLowerCase())){errorMessage("That goal already exists.");return;}
    const type=$("newType").value,n=Number($("newTarget").value),target=type==="number"?n:1;
    if(type==="number"&&(!Number.isFinite(target)||target<=0||target>valMax)){errorMessage("Enter a valid target greater than zero.");return;}
    if(!addDays.size){errorMessage("Select at least one scheduled day.");return;}
    state.items.push(goal(makeId(),label,type,target,$("newUnit").value.trim().slice(0,18),[...addDays].sort()));
    $("newName").value="";$("newType").value="check";$("newTargetWrap").hidden=true;$("newUnitWrap").hidden=true;
    $("errorNotice").hidden=true;
    syncToday();$("newName").focus();
  }
  function downloadBackup() {
    const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob),link=document.createElement("a");
    link.href=url;link.download="tom-daily-backup-"+todayKey()+".json";
    document.body.appendChild(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  async function restoreBackup(event) {
    const file=event.target.files&&event.target.files[0];event.target.value="";
    if(!file)return;
    if(file.size>5000000){errorMessage("Backup too large.");return;}
    try{
      const raw=JSON.parse(await file.text());
      const restored=raw.version===2?normalise(raw):migrateV1(raw);
      if(!confirm("Restore this backup and replace the checklist/history on this device?"))return;
      state=restored;undo=null;$("toast").hidden=true;ensureToday();save();render();
      $("errorNotice").hidden=true;showToast("Backup restored.");
    }catch(e){errorMessage("Could not restore backup: "+e.message);}
  }
  function registerHandlers() {
    document.querySelectorAll(".tab").forEach(btn=>btn.addEventListener("click",()=>activeTab(btn.dataset.tab)));
    $("prevMonth").addEventListener("click",()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()-1,1);renderCalendar();});
    $("nextMonth").addEventListener("click",()=>{monthCursor=new Date(monthCursor.getFullYear(),monthCursor.getMonth()+1,1);renderCalendar();});
    $("undoBtn").addEventListener("click",undoLast);
    $("newType").addEventListener("change",()=>{
      const numeric=$("newType").value==="number";$("newTargetWrap").hidden=!numeric;$("newUnitWrap").hidden=!numeric;
    });
    function toggleNewDay(n) {
      if(addDays.has(n))addDays.delete(n);else addDays.add(n);
      dayButtons($("newDays"),[...addDays],toggleNewDay);
    }
    dayButtons($("newDays"),[...addDays],toggleNewDay);
    $("addForm").addEventListener("submit",addGoal);
    $("personName").addEventListener("change",()=>{
      state.name=$("personName").value.trim().slice(0,30)||"Tom";save();renderHero();showSettings();
    });
    document.querySelectorAll("[data-accent]").forEach(btn=>btn.addEventListener("click",()=>{
      state.accent=btn.dataset.accent;save();renderHero();showSettings();
    }));
    $("remindersEnabled").addEventListener("change",()=>{
      state.reminders.enabled=$("remindersEnabled").checked;save();checkReminder();
    });
    $("reminderTime").addEventListener("change",()=>{
      state.reminders.time=$("reminderTime").value;state.reminders.notified="";save();checkReminder();
    });
    $("notificationPermission").addEventListener("click",async()=>{
      if(!("Notification" in window)){errorMessage("This browser does not support notifications here. In-app reminders still work.");return;}
      try{const permission=await Notification.requestPermission();showToast(permission==="granted"?"Browser notifications enabled while the app is running.":"Browser notifications were not enabled.");}
      catch(e){errorMessage("Notification permission isn't available in this browser.");}
    });
    $("exportBtn").addEventListener("click",downloadBackup);
    $("importBtn").addEventListener("click",()=>$("importFile").click());
    $("importFile").addEventListener("change",restoreBackup);
    window.addEventListener("storage",event=>{
      if(event.key!==KEY)return;
      try{state=event.newValue?normalise(JSON.parse(event.newValue)):initialState();ensureToday();render();}
      catch(e){errorMessage("Changes from another tab could not be loaded.");}
    });
    document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkDate();});
    window.addEventListener("focus",checkDate);
    setInterval(checkDate,15000);
    window.addEventListener("beforeinstallprompt",event=>{
      event.preventDefault();deferredInstall=event;$("installBtn").hidden=false;
    });
    $("installBtn").addEventListener("click",async()=>{
      if(!deferredInstall)return;
      deferredInstall.prompt();await deferredInstall.userChoice;
      deferredInstall=null;$("installBtn").hidden=true;
    });
    if("serviceWorker" in navigator&&location.protocol==="https:") {
      navigator.serviceWorker.register("./tom-daily-sw.js").catch(()=>{/* offline install optional */});
    }
  }
  load();ensureToday();
  const now=new Date();monthCursor=new Date(now.getFullYear(),now.getMonth(),1);selectedDay=todayKey();
  registerHandlers();render();activeTab("today");
})();
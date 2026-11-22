/* Health and Calorie Tracker — frontend.
   Data now comes from the API (GET /api/days). The render functions
   (overview, dayView, plan) keep the original design. */

// Plan / profile defaults (from the Health and Calorie Plan sheet). The DB
// stores overrides; anything missing falls back to these.
var DEFAULTS={
  age:33,weightLow:66,weightHigh:70,height:163,job:"Software engineer (desk work)",
  startWeight:68,goalWeight:63,healthyLow:59,healthyHigh:64,
  bmr:1540,activity:310,rides:40,femaleAdj:170,
  calorieTarget:1550,calorieMin:1500,calorieMax:1600,
  proteinLow:90,proteinHigh:100,waterL:2.5,glassMl:250,
  sleepLow:7,sleepHigh:8,walkKm:2,
  planBreakfast:450,planLunch:550,planSnack:150,planDinner:400,
  deficit:340,lossPerWeek:0.31,energyPerKg:7700
};
var P=Object.assign({},DEFAULTS);
// Derived globals the render code uses; refreshed by applyProfile().
var PLAN={},T,MIN,MAX,PT,PTH,WT,GL;
function applyProfile(){
  T=P.calorieTarget;MIN=P.calorieMin;MAX=P.calorieMax;
  PT=P.proteinLow;PTH=P.proteinHigh;
  WT=P.waterL*1000;GL=P.glassMl;
  PLAN={Breakfast:P.planBreakfast,Lunch:P.planLunch,Snack:P.planSnack,Dinner:P.planDinner};
}
applyProfile();
var DAYS=[];

var $=function(s){return document.querySelector(s)},
    N=function(n){return Math.round(n).toLocaleString("en-US")},
    F=function(n){return String(Math.round(n*10)/10)};

/* ---------- time / date in Asia/Colombo (from the browser) ---------- */
function todayId(){
  // en-CA formats as YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Colombo",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
}
function nowLabel(){
  return new Intl.DateTimeFormat("en-US",{timeZone:"Asia/Colombo",hour:"numeric",minute:"2-digit",hour12:true}).format(new Date()).toLowerCase();
}
function nowHM(){
  return new Intl.DateTimeFormat("en-GB",{timeZone:"Asia/Colombo",hour:"2-digit",minute:"2-digit",hour12:false}).format(new Date());
}
function hmLabel(hm){ // "22:15" -> "10:15 pm"
  if(!hm||hm.indexOf(":")<0)return hm||"";
  var p=hm.split(":"),h=parseInt(p[0],10),m=p[1];
  var ap=h<12?"am":"pm",h12=h%12;if(h12===0)h12=12;
  return h12+":"+m+" "+ap;
}

/* ---------- API ---------- */
function esc(s){return String(s==null?"":s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
async function load(){
  try{ DAYS=await (await fetch("/api/days")).json(); if(!Array.isArray(DAYS))DAYS=[]; }
  catch(e){ console.error("Failed to load days",e); DAYS=[]; }
}
async function loadProfile(){
  try{
    var d=await (await fetch("/api/profile")).json();
    if(d&&typeof d==="object"&&!Array.isArray(d))P=Object.assign({},DEFAULTS,d);
    applyProfile();
  }catch(e){ console.error("Failed to load profile",e); }
}
async function send(path,method,bodyObj){
  var r=await fetch("/api/"+path,{method:method,headers:{"content-type":"application/json"},body:JSON.stringify(bodyObj)});
  var j={}; try{j=await r.json()}catch(_){}
  if(!r.ok||j.ok===false)throw new Error((j&&j.error)||(path+" "+r.status));
  return j;
}
async function refresh(){ await load(); render(); }

/* ---------- small numeric helpers (unchanged) ---------- */
function kc(d){return d.meals.reduce(function(a,m){return a+m.items.reduce(function(b,i){return b+i[2]},0)},0)}
function pr(d){return d.meals.reduce(function(a,m){return a+(m.p||0)},0)}
function ml(d){return d.ev.reduce(function(a,e){return a+(e[1]==="w"?e[2]:0)},0)}
function slotKc(d,s){return d.meals.filter(function(m){return m.slot===s}).reduce(function(a,m){return a+m.items.reduce(function(b,i){return b+i[2]},0)},0)}
function st(d,k){if(!d.done)return["In progress",""];return k>MAX?["Over range","bad"]:k<MIN?["Under range","bad"]:["In range","ok"]}
function bar(v,mx,col,mk,zone){var h='<div class="bx">';if(zone)h+='<em style="left:'+zone[0]/mx*100+'%;width:'+(zone[1]-zone[0])/mx*100+'%"></em>';h+='<i style="width:'+Math.min(100,v/mx*100)+'%;background:'+col+'"></i>';if(mk!=null)h+='<u style="left:'+Math.min(99.5,mk/mx*100)+'%"></u>';return h+'</div>'}
function row(l,v,mx,col,mk,txt,zone){return'<div class="row"><span>'+l+'</span>'+bar(v,mx,col,mk,zone)+'<span>'+txt+'</span></div>'}
function tile(l,b,s,c){return'<div class="card"><div class="lab">'+l+'</div><div class="big"'+(c?' style="color:var(--'+c+')"':'')+'>'+b+'</div><div class="lab">'+s+'</div></div>'}
function glasses(m){var n=m/GL,full=Math.floor(n),half=(m%GL>=125)?1:0,tot=Math.min(24,Math.max(10,full+half)),h='';for(var i=0;i<tot;i++)h+='<span class="'+(i<full?'on':(i===full&&half?'half':''))+'"></span>';return'<div class="glasses" role="img" aria-label="'+F(n)+' glasses">'+h+'</div>'}
function ring(k){var c=k>MAX?"var(--warn)":"var(--leaf)",d=Math.min(1,k/T)*502.65;return'<svg class="ring" viewBox="0 0 200 200" role="img" aria-label="'+N(k)+' of '+N(T)+' kcal eaten"><circle class="t" cx="100" cy="100" r="80" fill="none" stroke-width="16"/><circle class="p" cx="100" cy="100" r="80" fill="none" stroke-width="16" stroke="'+c+'" style="--d:'+d+'" transform="rotate(-90 100 100)"/><text x="100" y="104" text-anchor="middle" font-size="38" font-weight="800">'+N(k)+'</text><text x="100" y="126" text-anchor="middle" font-size="13" style="fill:var(--mute)">of '+N(T)+' kcal</text></svg>'}

/* ---------- entry forms (new) ---------- */
function addBar(d){
  var id=d.id;
  var h='<div class="card" style="margin:14px 0"><div class="hd"><h3>Add to this day</h3>'
    + '<span class="lab">'+esc(d.full)+'</span></div>';
  // Water quick buttons
  h+='<div class="lab" style="margin-top:6px">Water</div><div class="btnrow">'
    + '<button class="btn sky sm" onclick="addWater(\''+id+'\',125)">+125 ml</button>'
    + '<button class="btn sky sm" onclick="addWater(\''+id+'\',250)">+250 ml</button>'
    + '<button class="btn sky sm" onclick="addWater(\''+id+'\',500)">+500 ml</button></div>';
  // Drinks quick buttons (count as calories, not water). One tap logs with an
  // estimate; delete and re-add via "+ Meal" if the value is off.
  h+='<div class="lab" style="margin-top:10px">Drinks (count as calories, not water)</div><div class="btnrow">'
    + '<button class="btn sm ghost" onclick="addDrink(\''+id+'\',\'Tea\',\'1 cup, milk & sugar\',40)">+ Tea</button>'
    + '<button class="btn sm ghost" onclick="addDrink(\''+id+'\',\'Plain tea\',\'1 cup, no sugar\',5)">+ Plain tea</button>'
    + '<button class="btn sm ghost" onclick="addDrink(\''+id+'\',\'Coffee\',\'1 cup, milk & sugar\',40)">+ Coffee</button>'
    + '<button class="btn sm ghost" onclick="addDrink(\''+id+'\',\'Soft drink\',\'1 can, 330 ml\',140)">+ Soft drink</button></div>';
  // Toggle buttons
  h+='<div class="btnrow" style="margin-top:12px">'
    + '<button class="btn ghost sm" onclick="newMeal(\''+id+'\')">+ Meal</button>'
    + '<button class="btn ghost sm" onclick="toggle(\'f-sleep\')">+ Sleep</button>'
    + '<button class="btn ghost sm" onclick="toggle(\'f-walk\')">+ Walk</button>'
    + '<button class="btn ghost sm" onclick="toggle(\'f-note\')">+ Note</button>'
    + (d.done
        ? '<button class="btn ghost sm" onclick="markDone(\''+id+'\',false)">Reopen day</button>'
        : '<button class="btn sm" onclick="markDone(\''+id+'\',true)">Mark day done</button>')
    + '</div>';

  // Meal form
  h+='<div id="f-meal" class="hidden" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">'
    + '<div class="formgrid">'
    + '<div class="field"><label>Slot</label><select id="mealSlot">'
      + '<option>Breakfast</option><option>Lunch</option><option selected>Snack</option><option>Dinner</option><option>Drink</option></select></div>'
    + '<div class="field"><label>Time</label><input id="mealTime" value="'+nowLabel()+'"></div>'
    + '<div class="field"><label>Meal name (optional)</label><input id="mealName" placeholder="e.g. Lunch"></div>'
    + '</div>'
    + '<div class="lab" id="mealEditNote" style="margin-top:4px;color:var(--sun)"></div>'
    + '<div class="lab" style="margin-top:10px">Items (protein, carbs and fat are added up from the items below)</div><div id="mealItems"></div>'
    + '<div class="btnrow"><button class="btn ghost sm" onclick="addItemRow()">+ Add item</button>'
    + '<button class="btn sm" id="mealSaveBtn" onclick="saveMeal(\''+id+'\')">Save meal</button></div></div>';

  // Sleep form
  h+='<div id="f-sleep" class="hidden" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">'
    + '<div class="formgrid">'
    + '<div class="field"><label>Bed time</label><input id="sleepBed" type="time"></div>'
    + '<div class="field"><label>Wake time</label><input id="sleepWake" type="time" value="'+nowHM()+'"></div>'
    + '</div><div class="lab" id="sleepCalc">Hours are worked out from bed and wake time.</div>'
    + '<div class="btnrow"><button class="btn sm" onclick="saveSleep(\''+id+'\')">Save sleep</button></div></div>';

  // Walk form
  h+='<div id="f-walk" class="hidden" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">'
    + '<div class="formgrid">'
    + '<div class="field"><label>Distance (km)</label><input id="walkKm" type="number" inputmode="decimal" step="any" value="'+(d.walk?d.walk.km:2)+'"></div>'
    + '<div class="field"><label>kcal burned</label><input id="walkKcal" type="number" inputmode="numeric" value="'+(d.walk?d.walk.kcal:70)+'"></div>'
    + '</div><div class="btnrow"><button class="btn sm" onclick="saveWalk(\''+id+'\')">Save walk</button></div></div>';

  // Note form
  h+='<div id="f-note" class="hidden" style="margin-top:12px;border-top:1px solid var(--line);padding-top:12px">'
    + '<div class="field"><label>Note</label><input id="noteText" placeholder="Anything worth remembering about today"></div>'
    + '<div class="btnrow"><button class="btn sm" onclick="addNote(\''+id+'\')">Add note</button></div></div>';

  h+='</div>';
  return h;
}
function itemRowHTML(it){
  it=it||[];
  function v(x){return x==null?"":String(x).replace(/"/g,"&quot;")}
  return '<div class="itemrow">'
    + '<div class="field"><label>Item</label><input class="it-name" placeholder="Red rice" value="'+v(it[0])+'"></div>'
    + '<div class="field"><label>Portion</label><input class="it-portion" placeholder="1 cup" value="'+v(it[1])+'"></div>'
    + '<div class="field"><label>kcal</label><input class="it-kcal" type="number" inputmode="numeric" value="'+v(it[2])+'"></div>'
    + '<div class="field"><label>Protein g</label><input class="it-protein" type="number" inputmode="decimal" step="any" value="'+v(it[3])+'"></div>'
    + '<div class="field"><label>Carbs g</label><input class="it-carbs" type="number" inputmode="decimal" step="any" value="'+v(it[4])+'"></div>'
    + '<div class="field"><label>Fat g</label><input class="it-fat" type="number" inputmode="decimal" step="any" value="'+v(it[5])+'"></div>'
    + '<button class="del" title="Remove item" onclick="this.closest(\'.itemrow\').remove()">×</button>'
    + '</div>';
}

/* ---------- mutations (global, called from inline onclick) ---------- */
window.toggle=function(fid){
  var el=document.getElementById(fid);if(!el)return;
  el.classList.toggle("hidden");
  if(fid==="f-meal"&&!el.classList.contains("hidden")&&!document.querySelector("#mealItems .itemrow"))addItemRow();
};
window.addItemRow=function(){
  var c=document.getElementById("mealItems");if(!c)return;
  c.insertAdjacentHTML("beforeend",itemRowHTML());
};
function resetMealForm(id){
  var el=document.getElementById("f-meal");if(!el)return;
  el.dataset.editId="";
  var s=document.getElementById("mealSlot");if(s)s.value="Snack";
  var t=document.getElementById("mealTime");if(t)t.value=nowLabel();
  var n=document.getElementById("mealName");if(n)n.value="";
  var c=document.getElementById("mealItems");if(c)c.innerHTML="";
  addItemRow();
  var btn=document.getElementById("mealSaveBtn");if(btn)btn.textContent="Save meal";
  var note=document.getElementById("mealEditNote");if(note)note.textContent="";
}
window.newMeal=function(id){
  var el=document.getElementById("f-meal");if(!el)return;
  var willOpen=el.classList.contains("hidden");
  el.classList.toggle("hidden");
  if(willOpen)resetMealForm(id);
};
window.editMeal=function(mealId){
  var meal=null;
  for(var i=0;i<DAYS.length&&!meal;i++){
    var mm=DAYS[i].meals.filter(function(m){return m.id===mealId});
    if(mm.length)meal=mm[0];
  }
  if(!meal){alert("Could not find that meal.");return;}
  var el=document.getElementById("f-meal");if(!el)return;
  el.classList.remove("hidden");
  el.dataset.editId=String(mealId);
  var s=document.getElementById("mealSlot");if(s)s.value=meal.slot;
  document.getElementById("mealTime").value=meal.t||nowLabel();
  document.getElementById("mealName").value=(meal.name&&meal.name!==meal.slot)?meal.name:"";
  var c=document.getElementById("mealItems");c.innerHTML="";
  (meal.items||[]).forEach(function(it){c.insertAdjacentHTML("beforeend",itemRowHTML(it))});
  if(!c.querySelector(".itemrow"))addItemRow();
  var btn=document.getElementById("mealSaveBtn");if(btn)btn.textContent="Update meal";
  var note=document.getElementById("mealEditNote");if(note)note.textContent="Editing “"+(meal.name||meal.slot)+"” — change anything and tap Update meal.";
  el.scrollIntoView({behavior:"smooth",block:"center"});
};
window.editWater=function(eid,cur){act(async function(){
  var v=prompt("Water amount in ml",cur);
  if(v===null)return;
  v=parseInt(v,10);
  if(!v||v<=0){alert("Enter a positive number of ml.");return;}
  await send("water","POST",{id:eid,ml:v});
  await refresh();
})};
async function act(fn){
  try{ await fn(); }
  catch(e){ console.error(e); alert("Could not save: "+e.message); }
}
window.addWater=function(id,amount){act(async function(){
  await send("water","POST",{day_id:id,time:nowLabel(),ml:amount});
  await refresh();
})};
window.addDrink=function(id,name,portion,kcal){act(async function(){
  await send("meal","POST",{
    day_id:id,
    slot:"Drink",
    time:nowLabel(),
    name:name,
    items:[{name:name,portion:portion,kcal:kcal,protein:0}]
  });
  await refresh();
})};
window.saveMeal=function(id){act(async function(){
  var rows=document.querySelectorAll("#mealItems .itemrow"),items=[];
  rows.forEach(function(r){
    var name=r.querySelector(".it-name").value.trim();
    var kcal=r.querySelector(".it-kcal").value;
    if(!name&&!kcal)return;
    items.push({
      name:name,
      portion:r.querySelector(".it-portion").value.trim(),
      kcal:kcal,
      protein:r.querySelector(".it-protein").value,
      carbs:r.querySelector(".it-carbs").value,
      fat:r.querySelector(".it-fat").value
    });
  });
  if(!items.length){alert("Add at least one item (name and kcal).");return;}
  var editId=document.getElementById("f-meal").dataset.editId;
  var payload={
    day_id:id,
    slot:document.getElementById("mealSlot").value,
    time:document.getElementById("mealTime").value.trim()||nowLabel(),
    name:document.getElementById("mealName").value.trim(),
    items:items
  };
  if(editId)payload.meal_id=parseInt(editId,10);
  await send("meal","POST",payload);
  await refresh();
})};
window.saveSleep=function(id){act(async function(){
  var bed=document.getElementById("sleepBed").value,wake=document.getElementById("sleepWake").value;
  if(!bed||!wake){alert("Enter both bed and wake time.");return;}
  var bm=toMin(bed),wm=toMin(wake),diff=((wm-bm)+1440)%1440;
  var hours=Math.round(diff/60*100)/100,H=Math.floor(diff/60),Mm=diff%60;
  var note="Bed "+hmLabel(bed)+", up "+hmLabel(wake)+". "+H+" h "+Mm+" min.";
  await send("sleep","POST",{day_id:id,hours:hours,note:note});
  await refresh();
})};
function toMin(hm){var p=hm.split(":");return parseInt(p[0],10)*60+parseInt(p[1],10)}
window.saveWalk=function(id){act(async function(){
  var km=document.getElementById("walkKm").value,kcal=document.getElementById("walkKcal").value;
  if(km===""){alert("Enter the distance.");return;}
  await send("walk","POST",{day_id:id,km:km,kcal:kcal});
  await refresh();
})};
window.addNote=function(id){act(async function(){
  var t=document.getElementById("noteText").value.trim();
  if(!t)return;
  await send("day","POST",{day_id:id,note:t});
  await refresh();
})};
window.markDone=function(id,done){act(async function(){
  await send("day","POST",{day_id:id,done:done});
  await refresh();
})};
window.delEvent=function(eid){act(async function(){
  if(!confirm("Delete this entry?"))return;
  await send("event","DELETE",{id:eid});
  await refresh();
})};
window.delMeal=function(mealId){act(async function(){
  if(!confirm("Delete this meal and all its items?"))return;
  await send("event","DELETE",{meal_id:mealId});
  await refresh();
})};
window.delNote=function(id,idx){act(async function(){
  if(!confirm("Delete this note?"))return;
  await send("event","DELETE",{day_id:id,note_index:idx});
  await refresh();
})};
window.newDay=function(){act(async function(){
  var el=document.getElementById("newDayDate");
  var id=(el&&el.value)?el.value:todayId();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(id)){alert("Pick a valid date.");return;}
  if(id>todayId()){alert("That date is in the future.");return;}
  var existed=DAYS.some(function(d){return d.id===id});
  await send("day","POST",{day_id:id});
  await load();
  location.hash="#day-"+id;
  render();
  if(existed)alert("That day already exists — opened it.");
})};

/* ---------- day page ---------- */
function dayView(d){
  var k=kc(d),p=pr(d),w=ml(d),s=st(d,k),diff=k-T,h='';
  h+='<div class="hd"><h2>'+esc(d.full)+'</h2><span class="pill '+s[1]+'">'+s[0]+'</span></div>';
  // Step between days in date order (older ‹ › newer).
  var ds=DAYS.slice().sort(function(a,b){return a.id<b.id?-1:1}),idx=0;
  for(var i=0;i<ds.length;i++){if(ds[i].id===d.id){idx=i;break;}}
  var prev=idx>0?ds[idx-1]:null,next=idx<ds.length-1?ds[idx+1]:null;
  h+='<div class="dayswitch">'
    + (prev?'<a class="btn ghost sm" href="#day-'+prev.id+'" title="'+esc(prev.full)+'">‹ '+esc(prev.label)+'</a>':'<span class="btn ghost sm disabled">‹ Earliest</span>')
    + '<span class="lab">Day '+(idx+1)+' of '+ds.length+'</span>'
    + (next?'<a class="btn ghost sm" href="#day-'+next.id+'" title="'+esc(next.full)+'">'+esc(next.label)+' ›</a>':'<span class="btn ghost sm disabled">Latest ›</span>')
    + '</div>';
  h+=addBar(d);
  h+='<div class="grid">'+tile("Calories eaten",N(k),d.meals.length?(diff>0?N(diff)+" over the "+N(T)+" target":N(-diff)+" left to "+N(T)):"Nothing logged yet",k>MAX?"warn":"")+tile("Protein",F(p)+" g",p>=PT?"Target of "+F(PT)+"-"+F(PTH)+" g reached":F(PT-p)+" g to reach "+F(PT)+" g")+tile("Water",F(w/GL),F(w/1000)+" litres of "+F(P.waterL)+", in glasses of "+N(GL)+" ml","sky")+tile("Sleep before",F(d.sleep.h)+" h","Goal "+F(P.sleepLow)+"-"+F(P.sleepHigh)+" h",d.sleep.h<P.sleepLow?"warn":"leaf")+tile("Walk",d.walk?d.walk.km+" km":"None yet",d.walk?"About "+d.walk.kcal+" kcal burned":"Goal: "+F(P.walkKm)+" km a day")+'</div>';
  h+='<div class="g2" style="margin-top:14px"><div class="card"><h3>Calories</h3>'+ring(k)+'<div class="lab" style="text-align:center;margin-top:8px">Range '+N(MIN)+'-'+N(MAX)+' kcal</div></div>';
  h+='<div class="card"><h3>Meals vs plan</h3><div class="lab">Planned kcal. Line = plan for that meal.</div>';
  Object.keys(PLAN).forEach(function(s2){var a=slotKc(d,s2);h+=row(s2,a,700,a>PLAN[s2]?"var(--warn)":"var(--leaf)",PLAN[s2],N(a)+" / "+PLAN[s2])});
  h+='<div class="lab" style="margin-top:10px">Protein '+F(p)+' g of '+F(PT)+'-'+F(PTH)+' g</div>'+bar(p,PTH+10,"var(--sun)",PT)+'</div></div>';
  h+='<div class="g2" style="margin-top:14px"><div class="card"><h3>Water</h3><div class="lab">'+F(w/GL)+' glasses, '+N(w)+' ml. Target '+N(Math.round(WT/GL))+' glasses.</div>'+glasses(w)+'</div><div class="card"><h3>Sleep before this day</h3><div class="lab">'+esc(d.sleep.txt)+'</div>'+row("Hours",d.sleep.h,10,d.sleep.h<P.sleepLow?"var(--warn)":"var(--leaf)",null,F(d.sleep.h)+" h",[P.sleepLow,P.sleepHigh])+'<div class="lab">Shaded zone is the '+F(P.sleepLow)+'-'+F(P.sleepHigh)+' hour goal.</div></div></div>';
  h+='<h2>Meals in detail</h2>';
  if(!d.meals.length)h+='<div class="card lab">No meals logged yet. Use "+ Meal" above.</div>';
  d.meals.forEach(function(m){var t=m.items.reduce(function(a,i){return a+i[2]},0);
    h+='<div class="card" style="margin-bottom:12px"><div class="hd"><h3>'+esc(m.name)+'</h3><span class="lab">'+esc(m.t)+'</span>'+(m.id!=null?'<button class="btn ghost sm" title="Edit meal" onclick="editMeal('+m.id+')">Edit</button><button class="del meal-del" title="Delete meal" onclick="delMeal('+m.id+')">×</button>':'')+'</div><div class="chips"><span class="pill">'+N(t)+' kcal</span><span class="pill">'+F(m.p||0)+' g protein</span>'+(m.c!=null?'<span class="pill">'+F(m.c)+' g carbs</span>':'')+(m.f!=null?'<span class="pill">'+F(m.f)+' g fat</span>':'')+'</div><div class="tb"><table><tr><th>Item</th><th>Portion</th><th>kcal</th><th>Protein</th><th>Carbs</th><th>Fat</th></tr>';
    m.items.forEach(function(i){h+='<tr><td>'+esc(i[0])+'</td><td>'+esc(i[1])+'</td><td>'+i[2]+'</td><td>'+(i[3]!=null?i[3]+' g':'')+'</td><td>'+(i[4]!=null?i[4]+' g':'')+'</td><td>'+(i[5]!=null?i[5]+' g':'')+'</td></tr>'});
    h+='</table></div></div>'});
  h+='<h2>Timeline</h2>';
  if(!d.ev.length)h+='<div class="card lab">Nothing logged yet today.</div>';
  else{
    h+='<ul class="tl">';
    d.ev.forEach(function(e){var c=e[1],eid=e[3],x;
      if(c==="w"){x="Water, "+e[2]+" ml"}
      else if(c==="m"){var m=d.meals[e[2]];x=(m?esc(m.name)+": about "+N(m.items.reduce(function(a,i){return a+i[2]},0))+" kcal, "+F(m.p||0)+" g protein":"Meal")}
      else x=esc(e[2]);
      h+='<li class="'+(c==="w"?"water":c==="m"?"meal":c==="a"?"act":"")+'"><div class="hd"><div><b>'+esc(e[0])+'</b>'+x+'</div>'+(eid!=null?(c==="w"?'<button class="del" title="Edit amount" onclick="editWater('+eid+','+e[2]+')">✎</button>':'')+'<button class="del" title="Delete entry" onclick="delEvent('+eid+')">×</button>':'')+'</div></li>'});
    h+='</ul>';
  }
  h+='<h2>Notes</h2>';
  if(!d.notes.length)h+='<div class="card lab">No notes yet.</div>';
  else h+='<div class="note"><ul class="c">'+d.notes.map(function(n,i){return'<li><div class="hd"><span>'+esc(n)+'</span><button class="del" title="Delete note" onclick="delNote(\''+d.id+'\','+i+')">×</button></div></li>'}).join('')+'</ul></div>';
  return h;
}

/* ---------- super dashboard ---------- */
function overview(){
  if(!DAYS.length){
    return '<h2>Super dashboard</h2><p class="sub">No days logged yet.</p>'
      + '<div class="card"><h3>Start tracking</h3><div class="lab">Create today’s page, then add water, meals, sleep and your walk.</div>'
      + '<div class="btnrow" style="margin-top:10px"><input type="date" id="newDayDate" class="dateinput" value="'+todayId()+'" max="'+todayId()+'"><button class="btn" onclick="newDay()">+ New day</button></div></div>';
  }
  var dn=DAYS.filter(function(d){return d.done}),av=function(f){return dn.length?dn.reduce(function(a,d){return a+f(d)},0)/dn.length:0},h='';
  var sl=DAYS.length?DAYS.reduce(function(a,d){return a+d.sleep.h},0)/DAYS.length:0,inr=dn.filter(function(d){var k=kc(d);return k>=MIN&&k<=MAX}).length;
  h+='<div class="hd"><h2>Super dashboard</h2><div class="btnrow"><input type="date" id="newDayDate" class="dateinput" value="'+todayId()+'" max="'+todayId()+'"><button class="btn sm" onclick="newDay()">+ New day</button></div></div><p class="sub">Every logged day side by side. Averages use finished days only; sleep uses every night logged.</p><div class="grid">'+tile("Days logged",DAYS.length,dn.length+" finished, "+(DAYS.length-dn.length)+" in progress")+tile("Average calories",N(av(kc)),"kcal a day against "+N(T),av(kc)>MAX?"warn":"leaf")+tile("Average protein",F(av(pr))+" g","Goal "+F(PT)+"-"+F(PTH)+" g")+tile("Average water",F(av(ml)/1000)+" L","Goal "+F(P.waterL)+" L","sky")+tile("Average sleep",F(sl)+" h","Goal "+F(P.sleepLow)+"-"+F(P.sleepHigh)+" h")+tile("Days in calorie range",inr+" of "+dn.length,N(MIN)+"-"+N(MAX)+" kcal")+'</div>';
  h+='<div class="g2" style="margin-top:14px"><div class="card"><h3>Calories a day</h3><div class="lab">Line = '+N(T)+' target</div>';
  DAYS.forEach(function(d){var k=kc(d);h+=row(d.label,k,2600,k>MAX?"var(--warn)":"var(--leaf)",T,d.meals.length?N(k):"-")});
  h+='</div><div class="card"><h3>Protein a day</h3><div class="lab">Line = '+F(PT)+' g</div>';
  DAYS.forEach(function(d){var p=pr(d);h+=row(d.label,p,120,"var(--sun)",PT,d.meals.length?F(p)+" g":"-")});
  h+='</div><div class="card"><h3>Water a day</h3><div class="lab">Line = '+F(P.waterL)+' L</div>';
  DAYS.forEach(function(d){var w=ml(d);h+=row(d.label,w,4000,"var(--sky)",WT,F(w/1000)+" L")});
  h+='</div><div class="card"><h3>Sleep before each day</h3><div class="lab">Shaded = '+F(P.sleepLow)+'-'+F(P.sleepHigh)+' h</div>';
  DAYS.forEach(function(d){h+=row(d.label,d.sleep.h,10,d.sleep.h<P.sleepLow?"var(--warn)":"var(--leaf)",null,F(d.sleep.h)+" h",[P.sleepLow,P.sleepHigh])});
  h+='</div></div><h2>All days at a glance</h2><div class="card tb"><table><tr><th>Day</th><th>kcal</th><th>vs target</th><th>Protein</th><th>Water</th><th>Sleep</th><th>Walk</th><th>Status</th></tr>';
  DAYS.forEach(function(d){var k=kc(d),s=st(d,k);h+='<tr><td><a href="#day-'+d.id+'" style="color:var(--leaf);font-weight:700">'+d.label+'</a></td><td>'+(d.meals.length?N(k):"-")+'</td><td>'+(d.meals.length?(k-T>0?"+":"")+N(k-T):"-")+'</td><td>'+(d.meals.length?F(pr(d))+" g":"-")+'</td><td>'+F(ml(d)/1000)+' L</td><td>'+F(d.sleep.h)+' h</td><td>'+(d.walk?d.walk.km+" km":"-")+'</td><td><span class="pill '+s[1]+'">'+s[0]+'</span></td></tr>'});
  h+='</table></div>';
  // Weight goal + dynamic insights
  var avK=av(kc),avP=av(pr),avW=av(ml)/1000;
  var toLose=P.startWeight-P.goalWeight,weeks=P.lossPerWeek>0?Math.round(toLose/P.lossPerWeek):0;
  h+='<h2>Weight goal</h2><div class="g2"><div class="card"><h3>'+F(P.startWeight)+' kg to about '+F(P.goalWeight)+' kg</h3><div class="lab">Healthy range '+F(P.healthyLow)+'-'+F(P.healthyHigh)+' kg. About '+F(toLose)+' kg to lose at the expected '+F(P.lossPerWeek)+' kg a week (about '+weeks+' weeks). No weigh-ins logged yet, so '+F(P.startWeight)+' kg is the average of your '+F(P.weightLow)+'-'+F(P.weightHigh)+' kg range.</div>'+bar(2,100,"var(--leaf)",null,[80,100])+'</div><div class="card"><h3>What the logged days show</h3><ul class="c">';
  if(dn.length){
    h+='<li>Average calories '+N(avK)+' kcal, '+(avK>T?N(avK-T)+' over':N(T-avK)+' under')+' the '+N(T)+' target.</li>';
    h+='<li>Average protein '+F(avP)+' g ('+(avP>=PT?'meeting':'below')+' the '+F(PT)+' g goal).</li>';
    h+='<li>Average water '+F(avW)+' L ('+(avW>=P.waterL?'at or above':'below')+' the '+F(P.waterL)+' L goal).</li>';
    h+='<li>'+inr+' of '+dn.length+' finished days landed in the '+N(MIN)+'-'+N(MAX)+' kcal range.</li>';
  }else{
    h+='<li>No finished days yet. Mark a day done once it is complete to see averages here.</li>';
  }
  h+='</ul></div></div>';
  return h;
}

/* ---------- plan + profile (editable, from the DB) ---------- */
function pin(key,label,step){
  var isNum=typeof DEFAULTS[key]==="number";
  return '<div class="field"><label>'+label+'</label><input id="p-'+key+'"'
    + (isNum?' type="number" inputmode="decimal"'+(step?' step="'+step+'"':''):' type="text"')
    + ' value="'+esc(P[key])+'"></div>';
}
function profileForm(){
  var h='<div id="f-profile" class="hidden card" style="margin:12px 0">';
  h+='<h3>Profile</h3><div class="formgrid">'+pin("age","Age")+pin("height","Height (cm)")+pin("weightLow","Weight low (kg)","any")+pin("weightHigh","Weight high (kg)","any")+pin("startWeight","Start weight (kg)","any")+pin("goalWeight","Goal weight (kg)","any")+pin("healthyLow","Healthy low (kg)","any")+pin("healthyHigh","Healthy high (kg)","any")+'</div>';
  h+='<div class="field"><label>Job</label><input id="p-job" type="text" value="'+esc(P.job)+'"></div>';
  h+='<h3 style="margin-top:14px">Calories burned</h3><div class="formgrid">'+pin("bmr","Resting BMR")+pin("activity","Daily activity")+pin("rides","Rides")+pin("femaleAdj","Female adjustment")+'</div>';
  h+='<h3 style="margin-top:14px">Daily targets</h3><div class="formgrid">'+pin("calorieTarget","Calorie target")+pin("calorieMin","Calorie min")+pin("calorieMax","Calorie max")+pin("proteinLow","Protein low (g)","any")+pin("proteinHigh","Protein high (g)","any")+pin("waterL","Water (L)","any")+pin("glassMl","Glass (ml)")+pin("sleepLow","Sleep low (h)","any")+pin("sleepHigh","Sleep high (h)","any")+pin("walkKm","Walk (km)","any")+'</div>';
  h+='<h3 style="margin-top:14px">Meal plan (kcal)</h3><div class="formgrid">'+pin("planBreakfast","Breakfast")+pin("planLunch","Lunch")+pin("planSnack","Snack")+pin("planDinner","Dinner")+'</div>';
  h+='<h3 style="margin-top:14px">Weight loss</h3><div class="formgrid">'+pin("deficit","Deficit (kcal)")+pin("lossPerWeek","Loss per week (kg)","any")+pin("energyPerKg","kcal per kg")+'</div>';
  h+='<div class="btnrow" style="margin-top:14px"><button class="btn" onclick="saveProfile()">Save plan</button><button class="btn ghost" onclick="toggle(\'f-profile\')">Cancel</button></div></div>';
  return h;
}
window.saveProfile=function(){act(async function(){
  var obj={};
  Object.keys(DEFAULTS).forEach(function(k){
    var el=document.getElementById("p-"+k); if(!el)return;
    if(typeof DEFAULTS[k]==="number"){var n=Number(el.value);obj[k]=isNaN(n)?DEFAULTS[k]:n;}
    else obj[k]=el.value;
  });
  await send("profile","POST",obj);
  P=Object.assign({},DEFAULTS,obj);applyProfile();
  render();
})};
function plan(){
  var avgW=(P.weightLow+P.weightHigh)/2,maint=P.bmr+P.activity+P.rides,maintF=maint-P.femaleAdj;
  var bPct=maint?P.bmr/maint*100:0,aPct=maint?P.activity/maint*100:0,rPct=maint?P.rides/maint*100:0;
  var mealTotal=P.planBreakfast+P.planLunch+P.planSnack+P.planDinner;
  var h='<div class="hd"><h2>Profile and plan</h2><button class="btn sm" onclick="toggle(\'f-profile\')">Edit plan</button></div>';
  h+=profileForm();
  h+='<div class="grid"><div class="card"><div class="lab">Age</div><div class="big">'+N(P.age)+'</div></div><div class="card"><div class="lab">Weight</div><div class="big">'+F(P.weightLow)+'-'+F(P.weightHigh)+' kg</div><div class="lab">Average '+F(avgW)+' kg</div></div><div class="card"><div class="lab">Height</div><div class="big">'+N(P.height)+' cm</div></div><div class="card"><div class="lab">Job</div><div class="big" style="font-size:20px">'+esc(P.job)+'</div></div><div class="card"><div class="lab">Goal</div><div class="big">About '+F(P.goalWeight)+' kg</div><div class="lab">Healthy range '+F(P.healthyLow)+'-'+F(P.healthyHigh)+' kg</div></div></div>';
  h+='<h2>Calories burned</h2><div class="stack" role="img" aria-label="Resting '+N(P.bmr)+', activity '+N(P.activity)+', rides '+N(P.rides)+'"><div style="width:'+bPct+'%;background:var(--leaf)">Resting '+N(P.bmr)+'</div><div style="width:'+aPct+'%;background:var(--sky)">'+N(P.activity)+'</div><div style="width:'+rPct+'%;background:var(--sun)"></div></div><p class="sub">Maintenance is about '+N(maint)+' kcal (resting BMR '+N(P.bmr)+', daily activity '+N(P.activity)+', rides '+N(P.rides)+'). That assumes a male body. For a female body, subtract about '+N(P.femaleAdj)+' kcal, which gives about '+N(maintF)+'.</p>';
  h+='<h2>The plan</h2><div class="grid"><div class="card"><div class="lab">Calories</div><div class="big">'+N(T)+'</div><div class="lab">Range '+N(MIN)+'-'+N(MAX)+'. Never below '+N(MIN)+'.</div></div><div class="card"><div class="lab">Deficit</div><div class="big">About '+N(P.deficit)+'</div><div class="lab">kcal a day</div></div><div class="card"><div class="lab">Loss a week</div><div class="big">'+F(P.lossPerWeek)+' kg</div></div><div class="card"><div class="lab">Protein</div><div class="big">'+F(PT)+'-'+F(PTH)+' g</div></div><div class="card"><div class="lab">Water</div><div class="big">'+F(P.waterL)+' L</div><div class="lab">'+N(Math.round(WT/GL))+' glasses of '+N(GL)+' ml</div></div><div class="card"><div class="lab">Sleep</div><div class="big">'+F(P.sleepLow)+'-'+F(P.sleepHigh)+' h</div></div></div>';
  h+='<h2>Meal plan</h2><div class="card">'+row("Breakfast",P.planBreakfast,600,"var(--leaf)",null,N(P.planBreakfast))+row("Lunch",P.planLunch,600,"var(--leaf)",null,N(P.planLunch))+row("Snack",P.planSnack,600,"var(--leaf)",null,N(P.planSnack))+row("Dinner",P.planDinner,600,"var(--leaf)",null,N(P.planDinner))+'<div class="lab" style="margin-top:8px">Total '+N(mealTotal)+' kcal</div></div>';
  h+='<h2>Habits</h2><div class="card"><ul class="c"><li>Smaller rice portions</li><li>Less coconut sambol and less coconut oil</li><li>A daily '+F(P.walkKm)+' km walk, and more walking after work</li><li>Sleep '+F(P.sleepLow)+'-'+F(P.sleepHigh)+' hours</li></ul></div>';
  h+='<h2>Daily routine</h2><div class="card tb"><table><tr><th>Time</th><th>What happens</th></tr><tr><td>6-7 am</td><td>Wake up</td></tr><tr><td>7-8 am</td><td>Wash, eat, dress, bike 1.5 km to the office</td></tr><tr><td>8 am-1 pm</td><td>Office work (sitting)</td></tr><tr><td>1-2 pm</td><td>Home for lunch (bike)</td></tr><tr><td>2-5/6 pm</td><td>Office work</td></tr><tr><td>6-9 pm</td><td>Wash, rest</td></tr><tr><td>9-10 pm</td><td>Sleep</td></tr></table></div>';
  return h;
}

/* ---------- router ---------- */
function render(){
  var hs=(location.hash||"#overview").slice(1),h="";
  var curDay=hs.indexOf("day-")===0?hs.slice(4):"";
  // Days are navigated through a single dropdown (newest first) so the nav bar
  // stays the same size no matter how many days are logged.
  var sorted=DAYS.slice().sort(function(a,b){return a.id<b.id?1:-1});
  var sel='<select id="daySelect" class="navsel'+(curDay?" on":"")+'" aria-label="Jump to a logged day" onchange="if(this.value)location.hash=this.value">';
  sel+='<option value="">'+(sorted.length?"Days ("+sorted.length+") ▾":"No days yet")+'</option>';
  sorted.forEach(function(d){sel+='<option value="#day-'+d.id+'"'+(d.id===curDay?' selected':'')+'>'+d.label+(d.done?"":" • in progress")+'</option>'});
  sel+='</select>';
  var tabs='<a href="#overview" class="'+(hs==="overview"?"on":"")+'">Super dashboard</a>'+sel+'<a href="#plan" class="'+(hs==="plan"?"on":"")+'">Plan and profile</a>';
  $("#tabs").innerHTML=tabs;
  var d=DAYS.filter(function(x){return"day-"+x.id===hs})[0];
  $("#main").innerHTML=hs==="plan"?plan():d?dayView(d):overview();
  window.scrollTo(0,0);
}
window.addEventListener("hashchange",render);
Promise.all([load(),loadProfile()]).then(render);

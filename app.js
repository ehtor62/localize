const $=s=>document.querySelector(s);
const PR={walk:{R:200,D:250,p:10},bike:{R:500,D:600,p:10},car:{R:1500,D:2000,p:10}};
const S={mode:'idle',pos:null,hist:[],head:null,v:null,prof:'walk',lock:false,fx:null,shown:new Set(),nF:0,det:new Map(),dbusy:new Set(),dfail:new Map(),busy:false,err:null,gen:0,cand:null,demo:null,wid:null,open:null,sel:null};
// Wikipedia edition follows the browser language (e.g. de-CH -> de.wikipedia.org), falling back to English.
const LANG=(l=>/^[a-z]{2,3}$/.test(l)?l:'en')((navigator.language||'en').split('-')[0].toLowerCase());
const MAXR=10000,MAXN=500; // geosearch limits: radius in metres, results per request
const rad=x=>x*Math.PI/180;
const cfg=()=>PR[S.prof];
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function dist(a,b){const R=6371000,dl=rad(b.lat-a.lat),dn=rad(b.lon-a.lon),x=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function bear(a,b){const y=Math.sin(rad(b.lon-a.lon))*Math.cos(rad(b.lat)),x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon));return(Math.atan2(y,x)*180/Math.PI+360)%360}
async function wiki(q){const ac=new AbortController(),to=setTimeout(()=>ac.abort(),15000);
try{const r=await fetch('https://'+LANG+'.wikipedia.org/w/api.php?'+new URLSearchParams({format:'json',formatversion:'2',origin:'*',...q}),{signal:ac.signal});
if(!r.ok)throw new Error('HTTP '+r.status);const j=await r.json();if(j.error)throw new Error(j.error.info||j.error.code);return j}
catch(e){throw e.name==='AbortError'?new Error('timed out'):e}finally{clearTimeout(to)}}
function margin(c){return c.D*c.p/100}
function covered(){const c=cfg();return S.fx&&dist(S.pos,S.fx.c)+c.R+margin(c)<=S.fx.r}
async function doFetch(){const c=cfg(),want=c.R+margin(c)+c.D,r=Math.min(want,MAXR),g=S.gen,at={lat:S.pos.lat,lon:S.pos.lon};S.busy=true;S.err=null;render();
try{const j=await wiki({action:'query',list:'geosearch',gsprop:'type',gslimit:MAXN,gsradius:Math.round(r),gscoord:at.lat.toFixed(6)+'|'+at.lon.toFixed(6)});
if(g!==S.gen)return;const gs=(j.query&&j.query.geosearch)||[],capped=gs.length>=MAXN;
// When capped, only the area up to the farthest returned place is complete. "full" means the area is as large as requested.
S.fx={c:at,r:capped?Math.max(...gs.map(p=>p.dist)):r,full:!capped&&r>=want,capped,t:new Date(),items:gs.map(p=>({id:p.pageid,name:p.title,cat:p.type||'',lat:p.lat,lon:p.lon}))};
S.nF++;if(S.mode==='idle')S.mode='closed'}
catch(e){if(g!==S.gen)return;S.err='List download failed ('+e.message+'). Tap Show to retry.';if(S.mode==='online')S.mode=S.fx?'closed':'idle'}
finally{if(g===S.gen)S.busy=false}
update()}
async function loadDetail(id){const g=S.gen;S.dbusy.add(id);S.dfail.delete(id);render();let txt=null,err=null;
try{const j=await wiki({action:'query',prop:'extracts',exintro:'1',explaintext:'1',pageids:id}),p=j.query&&j.query.pages&&j.query.pages[0];txt=(p&&p.extract||'').trim()||'No summary available.'}
catch(e){err=e.message}
if(g!==S.gen)return;S.dbusy.delete(id);if(txt!=null)S.det.set(id,txt);else S.dfail.set(id,err);render()}
function track(p){S.hist.push(p);const cut=p.t-45000;while(S.hist.length>1&&S.hist[0].t<cut)S.hist.shift();
const a=S.hist[0],dt=(p.t-a.t)/1000;if(dt>=8){const d=dist(a,p);S.v=d/dt*3.6;if(d>8)S.head=bear(a,p)}
if(S.v!=null&&!S.lock){const t=S.v<7?'walk':S.v<30?'bike':'car',k={walk:0,bike:1,car:2};
if(t===S.prof)S.cand=null;else{if(!S.cand||S.cand.t!==t)S.cand={t,s:p.t};if(p.t-S.cand.s>=(k[t]>k[S.prof]?30000:180000)){S.prof=t;S.cand=null;sync()}}}}
function update(){if(!S.pos)return;
if(S.mode==='online'&&!S.busy&&(!S.fx||dist(S.pos,S.fx.c)>=cfg().D||(S.fx.full&&!covered())))doFetch();render()}
function rows(){const c=cfg(),m=margin(c),out=[];if(!S.fx)return out;
for(const it of S.fx.items){const d=dist(S.pos,it);if(S.shown.has(it.id)?d<=c.R+m:d<=c.R){S.shown.add(it.id);out.push({...it,d,b:bear(S.pos,it)})}else S.shown.delete(it.id)}
return out.sort((a,b)=>a.d-b.d).slice(0,40)}
function detail(id){const t=S.det.get(id);let h;
if(t!=null)h=esc(t);else if(S.dbusy.has(id))h='Loading…';else if(S.dfail.has(id))h='Could not load details ('+esc(S.dfail.get(id))+'). Tap the place twice to retry.';else h='Details not downloaded. Tap Show to go online, then open this place again.';
return h+'<br><a href="https://'+LANG+'.wikipedia.org/?curid='+id+'" target="_blank" rel="noopener">Open in Wikipedia</a>'}
function render(){
const c=cfg(),m=margin(c),rs=S.pos?rows():[];
const st=$('#st');st.className=S.mode==='online'?'online':'';
st.textContent=S.mode==='online'?'Online':S.mode==='closed'?'Offline · list from '+S.fx.t.toTimeString().slice(0,5):'Offline · idle';
let n='';if(S.err)n=S.err;else if(!S.pos)n='Start GPS or the demo walk first.';else if(S.busy&&!S.fx)n='Loading places…';else if(S.fx&&!covered()&&S.mode!=='online')n='Outside the downloaded area. Press Show to update.';else if(!S.fx&&S.pos)n='Press Show to load places around you.';
$('#note').textContent=n;
$('#info').textContent='Profile '+S.prof+(S.lock?' (locked)':' (auto)')+' · speed '+(S.v==null?'–':S.v.toFixed(1)+' km/h')+' · list downloads '+S.nF+' · detail downloads '+S.det.size+(S.head==null?' · north up':'')+' · '+LANG+'.wikipedia'+(S.fx&&S.fx.capped?' · list capped at '+MAXN+' places':'')+(S.busy?' · loading…':'');
document.querySelectorAll('#profs button').forEach(b=>b.classList.toggle('on',b.dataset.p==='auto'?!S.lock:S.lock&&b.dataset.p===S.prof));
const hd=S.head==null?0:S.head,ul=$('#list');
ul.innerHTML=rs.map(r=>`<li data-id="${r.id}" class="${S.sel===r.id?'hl':''}"><button class="it" data-id="${r.id}"><span class="ar" style="transform:rotate(${Math.round(r.b-hd)}deg)">↑</span><span class="nm">${esc(r.name)}${r.cat?`<br><span class="mut">${esc(r.cat)}</span>`:''}</span><span class="ds">${r.d<1000?Math.round(r.d)+' m':(r.d/1000).toFixed(1)+' km'}</span></button>${S.open===r.id?`<div class="dt">${detail(r.id)}</div>`:''}</li>`).join('')||(S.pos&&S.fx?'<li class="dt">Nothing within the radius.</li>':'');
radar(rs,c,m)}
function radar(rs,c,m){const cv=$('#cv'),x=cv.getContext('2d'),W=cv.width,C=W/2,cs=getComputedStyle(document.documentElement);
x.clearRect(0,0,W,W);const rot=$('#hu').checked&&S.head!=null?S.head:0,O=C-14,sc=O/(c.R+m);
x.lineWidth=2;x.strokeStyle=cs.getPropertyValue('--line');
[1/3,2/3,1].forEach(f=>{x.beginPath();x.arc(C,C,c.R*f*sc,0,7);x.stroke()});
x.setLineDash([6,8]);x.beginPath();x.arc(C,C,O,0,7);x.stroke();x.setLineDash([]);
x.fillStyle=cs.getPropertyValue('--mut');x.font='22px system-ui';x.textAlign='center';
const nA=rad(-rot);x.fillText('N',C+Math.sin(nA)*(O-4)*0.93,C-Math.cos(nA)*(O-4)*0.93+8);
x.fillText(c.R>=1000?(c.R/1000)+' km':c.R+' m',C,C-c.R*sc-6);
rs.forEach(r=>{const a=rad(r.b-rot),px=C+Math.sin(a)*r.d*sc,py=C-Math.cos(a)*r.d*sc;
x.fillStyle=cs.getPropertyValue('--acc');x.beginPath();x.arc(px,py,S.sel===r.id?13:8,0,7);x.fill()});
x.fillStyle=cs.getPropertyValue('--warn');x.beginPath();x.moveTo(C,C-16);x.lineTo(C+11,C+12);x.lineTo(C-11,C+12);x.closePath();x.fill()}
function sync(){const c=cfg();$('#iR').value=c.R;$('#iD').value=c.D;$('#iP').value=c.p}
function msg(t){$('#note').textContent=t}
function reset(){S.gen++;S.pos=null;S.hist=[];S.fx=null;S.shown.clear();S.head=null;S.v=null;S.mode='idle';S.nF=0;S.det.clear();S.dbusy.clear();S.dfail.clear();S.busy=false;S.err=null}
function stopAll(){if(S.wid!=null){navigator.geolocation.clearWatch(S.wid);S.wid=null}if(S.demo){clearInterval(S.demo.t);S.demo=null}$('#dctl').hidden=true}
$('#gps').onclick=()=>{stopAll();reset();if(!navigator.geolocation){msg('GPS is not available here. Use the demo walk.');return}
S.wid=navigator.geolocation.watchPosition(g=>{const p={lat:g.coords.latitude,lon:g.coords.longitude,t:Date.now()};S.pos=p;track(p);update()},e=>msg('GPS failed: '+e.message+'. Use the demo walk instead.'),{enableHighAccuracy:true,maximumAge:2000});render()};
$('#demo').onclick=()=>{stopAll();reset();const d={lat:47.5596,lon:7.5886,h:0,v:5};S.pos={lat:d.lat,lon:d.lon,t:Date.now()};S.demo=d;$('#dctl').hidden=false;
d.t=setInterval(()=>{const s=d.v/3.6;d.lat+=s*Math.cos(rad(d.h))/111320;d.lon+=s*Math.sin(rad(d.h))/(111320*Math.cos(rad(d.lat)));const p={lat:d.lat,lon:d.lon,t:Date.now()};S.pos=p;track(p);update()},1000);update()};
$('#dl').onclick=()=>{if(S.demo)S.demo.h=(S.demo.h+330)%360};
$('#dr').onclick=()=>{if(S.demo)S.demo.h=(S.demo.h+30)%360};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{if(S.demo)S.demo.v=+b.dataset.v});
$('#show').onclick=()=>{if(!S.pos){msg('Start GPS or the demo walk first.');return}S.err=null;S.mode='online';update()};
$('#close').onclick=()=>{if(S.mode==='online'){S.mode=S.fx?'closed':'idle';render()}};
$('#profs').onclick=e=>{const p=e.target.dataset&&e.target.dataset.p;if(!p)return;if(p==='auto'){S.lock=false}else{S.prof=p;S.lock=true;S.cand=null}sync();update();render()};
['iR','iD','iP'].forEach((id,i)=>$('#'+id).onchange=e=>{const k=['R','D','p'][i],v=+e.target.value;if(v>=0){cfg()[k]=v;update();render()}});
$('#hu').onchange=render;
$('#list').onclick=e=>{const b=e.target.closest('.it');if(!b)return;const id=+b.dataset.id;S.open=S.open===id?null:id;S.sel=S.open;
if(S.open!=null&&S.mode==='online'&&!S.det.has(id)&&!S.dbusy.has(id))loadDetail(id);render()};
sync();render();

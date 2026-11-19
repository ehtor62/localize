const $=s=>document.querySelector(s);
const PR={walk:{R:200,D:250,p:10},bike:{R:500,D:600,p:10},car:{R:1500,D:2000,p:10}};
const S={mode:'idle',pos:null,hist:[],head:null,v:null,prof:'walk',lock:false,fx:null,shown:new Set(),nF:0,det:new Set(),pool:null,cand:null,demo:null,wid:null,open:null,sel:null};
const rad=x=>x*Math.PI/180;
const cfg=()=>PR[S.prof];
function dist(a,b){const R=6371000,dl=rad(b.lat-a.lat),dn=rad(b.lon-a.lon),x=Math.sin(dl/2)**2+Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dn/2)**2;return 2*R*Math.asin(Math.sqrt(x))}
function bear(a,b){const y=Math.sin(rad(b.lon-a.lon))*Math.cos(rad(b.lat)),x=Math.cos(rad(a.lat))*Math.sin(rad(b.lat))-Math.sin(rad(a.lat))*Math.cos(rad(b.lat))*Math.cos(rad(b.lon-a.lon));return(Math.atan2(y,x)*180/Math.PI+360)%360}
function mkPool(o){let s=7;const r=()=>(s=(s*16807)%2147483647)/2147483647;
const N=['Old tannery','Stone bridge','Chapel','Viewpoint','Fountain','Castle ruin','Market hall','Mill','Memorial','Gate tower'],C=['heritage','viewpoint','church','nature'];
return Array.from({length:600},(_,i)=>{const d=Math.sqrt(r())*2500,b=r()*2*Math.PI;return{id:i,name:N[i%10]+' '+(i+1),cat:C[i%4],lat:o.lat+d*Math.cos(b)/111320,lon:o.lon+d*Math.sin(b)/(111320*Math.cos(rad(o.lat)))}})}
function margin(c){return c.D*c.p/100}
function covered(){const c=cfg();return S.fx&&dist(S.pos,S.fx.c)+c.R+margin(c)<=S.fx.r}
function doFetch(){const c=cfg(),r=c.R+margin(c)+c.D;S.fx={c:{lat:S.pos.lat,lon:S.pos.lon},r,t:new Date(),items:S.pool.filter(x=>dist(S.pos,x)<=r)};S.nF++}
function track(p){S.hist.push(p);const cut=p.t-45000;while(S.hist.length>1&&S.hist[0].t<cut)S.hist.shift();
const a=S.hist[0],dt=(p.t-a.t)/1000;if(dt>=8){const d=dist(a,p);S.v=d/dt*3.6;if(d>8)S.head=bear(a,p)}
if(S.v!=null&&!S.lock){const t=S.v<7?'walk':S.v<30?'bike':'car',k={walk:0,bike:1,car:2};
if(t===S.prof)S.cand=null;else{if(!S.cand||S.cand.t!==t)S.cand={t,s:p.t};if(p.t-S.cand.s>=(k[t]>k[S.prof]?30000:180000)){S.prof=t;S.cand=null;sync()}}}}
function update(){if(!S.pos)return;if(!S.pool)S.pool=mkPool(S.pos);
if(S.mode==='online'&&(!S.fx||dist(S.pos,S.fx.c)>=cfg().D||!covered()))doFetch();render()}
function rows(){const c=cfg(),m=margin(c),out=[];if(!S.fx)return out;
for(const it of S.fx.items){const d=dist(S.pos,it);if(S.shown.has(it.id)?d<=c.R+m:d<=c.R){S.shown.add(it.id);out.push({...it,d,b:bear(S.pos,it)})}else S.shown.delete(it.id)}
return out.sort((a,b)=>a.d-b.d).slice(0,40)}
function render(){
const c=cfg(),m=margin(c),rs=S.pos?rows():[];
const st=$('#st');st.className=S.mode==='online'?'online':'';
st.textContent=S.mode==='online'?'Online':S.mode==='closed'?'Offline · list from '+S.fx.t.toTimeString().slice(0,5):'Offline · idle';
let n='';if(!S.pos)n='Start GPS or the demo walk first.';else if(S.fx&&!covered()&&S.mode!=='online')n='Outside the downloaded area. Press Show to update.';else if(!S.fx&&S.pos)n='Press Show to load places around you.';
$('#note').textContent=n;
$('#info').textContent='Profile '+S.prof+(S.lock?' (locked)':' (auto)')+' · speed '+(S.v==null?'–':S.v.toFixed(1)+' km/h')+' · list downloads '+S.nF+' · detail downloads '+S.det.size+(S.head==null?' · north up':'');
document.querySelectorAll('#profs button').forEach(b=>b.classList.toggle('on',b.dataset.p==='auto'?!S.lock:S.lock&&b.dataset.p===S.prof));
const hd=S.head==null?0:S.head,ul=$('#list');
ul.innerHTML=rs.map(r=>`<li data-id="${r.id}" class="${S.sel===r.id?'hl':''}"><button class="it" data-id="${r.id}"><span class="ar" style="transform:rotate(${Math.round(r.b-hd)}deg)">↑</span><span class="nm">${r.name}<br><span class="mut">${r.cat}</span></span><span class="ds">${r.d<1000?Math.round(r.d)+' m':(r.d/1000).toFixed(1)+' km'}</span></button>${S.open===r.id?`<div class="dt">${S.det.has(r.id)?'Explanation loaded once and cached (prototype placeholder; the real app would show the Wikipedia text here).':''}</div>`:''}</li>`).join('')||(S.pos&&S.fx?'<li class="dt">Nothing within the radius.</li>':'');
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
function reset(){S.pos=null;S.hist=[];S.pool=null;S.fx=null;S.shown.clear();S.head=null;S.v=null;S.mode='idle';S.nF=0;S.det.clear()}
function stopAll(){if(S.wid!=null){navigator.geolocation.clearWatch(S.wid);S.wid=null}if(S.demo){clearInterval(S.demo.t);S.demo=null}$('#dctl').hidden=true}
$('#gps').onclick=()=>{stopAll();reset();if(!navigator.geolocation){msg('GPS is not available here. Use the demo walk.');return}
S.wid=navigator.geolocation.watchPosition(g=>{const p={lat:g.coords.latitude,lon:g.coords.longitude,t:Date.now()};S.pos=p;track(p);update()},e=>msg('GPS failed: '+e.message+'. Use the demo walk instead.'),{enableHighAccuracy:true,maximumAge:2000});render()};
$('#demo').onclick=()=>{stopAll();reset();const d={lat:47.5596,lon:7.5886,h:0,v:5};S.pos={lat:d.lat,lon:d.lon,t:Date.now()};S.demo=d;$('#dctl').hidden=false;
d.t=setInterval(()=>{const s=d.v/3.6;d.lat+=s*Math.cos(rad(d.h))/111320;d.lon+=s*Math.sin(rad(d.h))/(111320*Math.cos(rad(d.lat)));const p={lat:d.lat,lon:d.lon,t:Date.now()};S.pos=p;track(p);update()},1000);update()};
$('#dl').onclick=()=>{if(S.demo)S.demo.h=(S.demo.h+330)%360};
$('#dr').onclick=()=>{if(S.demo)S.demo.h=(S.demo.h+30)%360};
document.querySelectorAll('[data-v]').forEach(b=>b.onclick=()=>{if(S.demo)S.demo.v=+b.dataset.v});
$('#show').onclick=()=>{if(!S.pos){msg('Start GPS or the demo walk first.');return}S.mode='online';update()};
$('#close').onclick=()=>{if(S.mode==='online'){S.mode='closed';render()}};
$('#profs').onclick=e=>{const p=e.target.dataset&&e.target.dataset.p;if(!p)return;if(p==='auto'){S.lock=false}else{S.prof=p;S.lock=true;S.cand=null}sync();update();render()};
['iR','iD','iP'].forEach((id,i)=>$('#'+id).onchange=e=>{const k=['R','D','p'][i],v=+e.target.value;if(v>=0){cfg()[k]=v;update();render()}});
$('#hu').onchange=render;
$('#list').onclick=e=>{const b=e.target.closest('.it');if(!b)return;const id=+b.dataset.id;S.open=S.open===id?null:id;S.sel=S.open;if(S.open!=null&&S.mode==='online')S.det.add(id);else if(S.open!=null&&!S.det.has(id)){S.open=id}render()};
sync();render();

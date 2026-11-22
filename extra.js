/* Onglets du bas + Tests d'anglais + Mes cours + Sport.
   Données sur le téléphone (localStorage), clés séparées du planning :
   marleneAnglais.v1, marleneSport.v1, marleneOnglet.v1 ; PDF des cours dans IndexedDB « marleneCours ». */
(function(){
"use strict";
const $=s=>document.querySelector(s);
const esc=s=>String(s==null?"":s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const ymd=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=()=>ymd(new Date());
const parse=s=>{const[a,b,c]=s.split("-").map(Number);return new Date(a,b-1,c,12);};
const addD=(s,n)=>{const d=parse(s);d.setDate(d.getDate()+n);return ymd(d);};
const diff=(a,b)=>Math.round((parse(b)-parse(a))/864e5);
const JOURS=["dim.","lun.","mar.","mer.","jeu.","ven.","sam."],MOIS=["janv.","févr.","mars","avr.","mai","juin","juil.","août","sept.","oct.","nov.","déc."];
const fmt=s=>{const d=parse(s);return JOURS[d.getDay()]+" "+d.getDate()+" "+MOIS[d.getMonth()];};
const fmtS=s=>{const d=parse(s);return d.getDate()+"/"+pad(d.getMonth()+1);};
const load=(k,def)=>{try{const j=localStorage.getItem(k);if(j)return JSON.parse(j);}catch(e){}return def;};
const save=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}};
const num=v=>{const n=parseFloat(String(v).replace(",","."));return isFinite(n)?n:null;};
const r1=n=>Math.round(n*10)/10;
function toast(msg){document.querySelectorAll(".toast.xt").forEach(x=>x.remove());const b=document.createElement("div");b.className="toast xt";b.textContent=msg;document.body.appendChild(b);setTimeout(()=>b.remove(),2600);}

/* ===================== Graphique en ligne (SVG) ===================== */
function lineChart(pts,o){
  o=o||{};const W=340,H=o.h||150,L=38,R=12,T=16,B=22;
  if(!pts.length)return'<p class="muted small">Pas encore de données.</p>';
  let ys=pts.map(p=>p.y);if(o.goal!=null)ys.push(o.goal);
  let mn=o.min!=null?o.min:Math.min(...ys),mx=o.max!=null?o.max:Math.max(...ys);
  if(mx-mn<1e-9){mn-=1;mx+=1;}const padY=(mx-mn)*.12;if(o.min==null)mn-=padY;if(o.max==null)mx+=padY;
  const X=i=>pts.length===1?(L+W-R)/2:L+i*(W-L-R)/(pts.length-1),Y=v=>T+(H-T-B)*(1-(v-mn)/(mx-mn));
  let g="";for(let k=0;k<=3;k++){const v=mn+(mx-mn)*k/3;g+='<line class="gl" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'"/><text x="'+(L-4)+'" y="'+(Y(v)+3)+'" text-anchor="end">'+(o.fy?o.fy(v):Math.round(v))+'</text>';}
  if(o.goal!=null)g+='<line class="goal" x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(o.goal)+'" y2="'+Y(o.goal)+'"/><text x="'+(W-R)+'" y="'+(Y(o.goal)-4)+'" text-anchor="end" style="fill:var(--good)">'+esc(o.goalLbl||"objectif")+'</text>';
  const d=pts.map((p,i)=>(i?"L":"M")+X(i).toFixed(1)+" "+Y(p.y).toFixed(1)).join(" ");
  const area=pts.length>1?'<path class="ar" d="'+d+" L"+X(pts.length-1)+" "+(H-B)+" L"+X(0)+" "+(H-B)+' Z"/>':"";
  const step=Math.ceil(pts.length/6);
  const lab=pts.map((p,i)=>(i%step===0||i===pts.length-1)?'<text x="'+X(i)+'" y="'+(H-6)+'" text-anchor="middle">'+esc(p.x)+'</text>':"").join("");
  const dots=pts.map((p,i)=>'<circle class="pt" cx="'+X(i)+'" cy="'+Y(p.y)+'" r="3.5"/>'+(i===pts.length-1||pts.length<=8?'<text class="v" x="'+X(i)+'" y="'+(Y(p.y)-8)+'" text-anchor="middle">'+esc(o.fv?o.fv(p.y):p.y)+'</text>':"")).join("");
  return'<svg class="chart" viewBox="0 0 '+W+" "+H+'" role="img" aria-label="'+esc(o.label||"graphique")+'">'+g+area+'<path class="ln" d="'+d+'"/>'+dots+lab+"</svg>";
}
function trendBadge(vals,unit){
  if(vals.length<2)return'<span class="trend eq"><span class="arr">→</span>premier résultat</span>';
  const last=vals[vals.length-1],prev=vals.slice(-4,-1),avg=prev.reduce((a,b)=>a+b,0)/prev.length,dv=r1(last-avg);
  const cls=dv>0.5?"up":dv<-0.5?"down":"eq",arr=dv>0.5?"↗":dv<-0.5?"↘":"→";
  return'<span class="trend '+cls+'"><span class="arr">'+arr+'</span>'+(dv>0?"+":"")+String(dv).replace(".",",")+" "+unit+' vs tes derniers tests</span>';
}

/* ===================== Onglets du bas ===================== */
const PANES=["planning","anglais","cours","sport"];
const planningEls=()=>[document.querySelector("header.top:not(.x)"),$("#app"),$("#fab")];
let pane=load("marleneOnglet.v1","planning");if(!PANES.includes(pane))pane="planning";
function showPane(p){
  pane=p;save("marleneOnglet.v1",p);
  planningEls().forEach(el=>{if(el)el.hidden=p!=="planning";});
  PANES.slice(1).forEach(id=>{$("#pane-"+id).hidden=id!==p;});
  document.querySelectorAll(".bnav button").forEach(b=>b.setAttribute("aria-selected",b.dataset.pane===p?"true":"false"));
  if(window.speechSynthesis)speechSynthesis.cancel();
  if(p==="anglais")renderEN();if(p==="cours")renderCours();if(p==="sport")renderSport();
  window.scrollTo(0,0);
}
document.querySelector(".bnav").addEventListener("click",e=>{const b=e.target.closest("button[data-pane]");if(b)showPane(b.dataset.pane);});

/* ===================== TESTS D'ANGLAIS ===================== */
const BANK=window.TOEIC_BANK;
const EPOCH="2026-11-22",CYCLE=12,PER={P1:2,P2:5,P3:1,P4:1,P5:10};
const PNAME={P1:"Photos",P2:"Questions-réponses",P3:"Conversations",P4:"Exposés",P5:"Phrases à compléter"};
const KEY_EN="marleneAnglais.v1";
let EN=load(KEY_EN,null);
if(!EN||!EN.results){EN={results:[],tests:{},rate:0.92};}
if(!EN.seeded){EN.results.unshift({d:"2026-11-22",label:"Examen blanc",sc:71,tot:80,parts:{"Écoute (P1 à 4)":[53,60],"Partie 5 (20 premières)":[18,20]}});EN.seeded=true;save(KEY_EN,EN);}
function rng(seed){let s=0;for(const c of String(seed))s=(s*31+c.charCodeAt(0))>>>0;return()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function shuffled(n,seed){const a=[...Array(n).keys()],r=rng(seed);for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function relabel(x,perm){/* les explications citent des lettres : on les adapte au mélange */
  const L="ABCD";return String(x).replace(/(^|[^\wÀ-ÿ'])([A-D])(?![\wÀ-ÿ'])/g,(m,pre,l)=>{const oi=L.indexOf(l);const ni=perm.indexOf(oi);return pre+(ni>=0?L[ni]:l);});}
function buildTest(date){
  const di=Math.max(0,diff(EPOCH,date)),cyc=Math.floor(di/CYCLE),pos=di%CYCLE;const items=[];let n=0;
  ["P1","P2","P3","P4","P5"].forEach(P=>{
    const arr=BANK[P],ord=shuffled(arr.length,P+"c"+cyc);
    for(let k=0;k<PER[P];k++){const bi=ord[(pos*PER[P]+k)%arr.length],it=arr[bi];
      if(P==="P3"||P==="P4"){it.q.forEach((q,qi)=>{const perm=shuffled(q[1].length,date+P+bi+"-"+qi);items.push({P,id:P+"-"+bi+"-"+qi,grp:P+"-"+bi,first:qi===0,ctx:it,q:q[0],opts:perm.map(i=>q[1][i]),orig:perm,a:q[2],x:q[3],n:++n});});}
      else{const perm=shuffled(it[1].length,date+P+bi);const o={P,id:P+"-"+bi,q:P==="P5"?it[0]:P==="P2"?it[0]:"",scene:P==="P1"?it[0]:"",opts:perm.map(i=>it[1][i]),orig:perm,a:it[2],x:P==="P5"?it[3]:relabel(it[3],perm),n:++n};items.push(o);}
    }});
  return items;
}
let enDate=today(),enPart="P1",enConfirm=false,showText={};
const testOf=d=>{EN.tests[d]=EN.tests[d]||{ans:{},done:false};return EN.tests[d];};
function scoreTest(items,t){const parts={};let sc=0;items.forEach(it=>{parts[it.P]=parts[it.P]||[0,0];parts[it.P][1]++;if(t.ans[it.id]===it.a){parts[it.P][0]++;sc++;}});return{sc,tot:items.length,parts};}

/* ---- Audio : synthèse vocale du téléphone, voix anglaises variées ---- */
let voices=[];
function loadVoices(){if(!window.speechSynthesis)return;voices=speechSynthesis.getVoices().filter(v=>/^en[-_]/i.test(v.lang));}
if(window.speechSynthesis){loadVoices();speechSynthesis.onvoiceschanged=loadVoices;}
const MALE=/daniel|fred|alex\b|aaron|arthur|rishi|tom\b|oliver|gordon|ralph|thomas|george|lee\b|male|guy|james|david|mark/i;
const FEMALE=/samantha|karen|moira|tessa|victoria|allison|ava|susan|serena|kate|martha|catherine|nicky|female|zira|hazel|libby|sonia|natasha|jenny|aria|fiona|veena/i;
function pickVoice(g,k){const pool=voices.filter(v=>g==="M"?MALE.test(v.name):g==="W"?FEMALE.test(v.name):true);const p=pool.length?pool:voices;return p.length?p[Math.abs(k)%p.length]:null;}
let playing=null;
function speak(parts,btnId){
  if(!window.speechSynthesis){toast("La voix n'est pas disponible ici : utilise « Afficher le texte ».");return;}
  speechSynthesis.cancel();
  if(playing===btnId){playing=null;markPlay();return;}
  playing=btnId;markPlay();
  parts.forEach((p,i)=>{const u=new SpeechSynthesisUtterance(p.t);const v=pickVoice(p.g,p.k||0);if(v){u.voice=v;u.lang=v.lang;}else u.lang="en-US";u.rate=EN.rate||0.92;if(!v&&p.g==="M")u.pitch=.8;if(i===parts.length-1)u.onend=()=>{if(playing===btnId){playing=null;markPlay();}};speechSynthesis.speak(u);});
}
function markPlay(){document.querySelectorAll(".play").forEach(b=>{const on=b.dataset.play===playing;b.classList.toggle("on",on);b.innerHTML=on?"⏹ Stop":"▶ Écouter";});}
function audioFor(it){
  const L="ABCD",k=it.n;
  if(it.P==="P1")return it.opts.map((o,i)=>({t:L[i]+". "+o+".",g:k%2?"M":"W",k}));
  if(it.P==="P2")return[{t:it.q,g:k%2?"W":"M",k},...it.opts.map((o,i)=>({t:L[i]+". "+o,g:k%2?"M":"W",k:k+1}))];
  if(it.P==="P3")return it.ctx.t.map(([g,t])=>({t,g,k}));
  if(it.P==="P4")return[{t:it.ctx.t,g:k%2?"W":"M",k}];
  return[];
}
function renderEN(){
  const t0=today(),items=buildTest(enDate),t=testOf(enDate),isToday=enDate===t0;
  const answered=items.filter(it=>t.ans[it.id]!=null).length;
  const res=EN.results.slice().sort((a,b)=>a.d<b.d?-1:a.d>b.d?1:0);
  const pts=res.map(r=>({x:fmtS(r.d),y:Math.round(r.sc/r.tot*100)}));
  const days=new Set(EN.results.map(r=>r.d));let streak=0;for(let d=days.has(t0)?t0:addD(t0,-1);days.has(d);d=addD(d,-1))streak++;
  let h='<section class="hero" style="grid-template-columns:1fr auto"><div><p class="hello">'+(isToday?"Test du jour":"Test du "+esc(fmt(enDate)))+'</p><div class="date">'+esc(fmt(enDate))+" · "+items.length+' questions, parties 1 à 5</div><div class="stats"><span><b>'+answered+"/"+items.length+'</b> répondues</span><span><b>'+streak+'</b> jour'+(streak>1?"s":"")+' de suite</span></div></div>'+ring(answered/items.length,t.done?Math.round(scoreTest(items,t).sc/items.length*100)+"%":answered+"")+"</section>";
  if(!isToday)h+='<button class="xbtn alt" data-en="today">← Revenir au test du jour</button>';
  // Résultat
  if(t.done){const s=scoreTest(items,t);h+='<section class="card"><h2>Ton résultat</h2><div class="scorebox"><div class="big">'+s.sc+"/"+s.tot+'</div><div><b>'+Math.round(s.sc/s.tot*100)+' % de bonnes réponses</b><div class="bars5">'+Object.keys(s.parts).map(P=>{const[c,n]=s.parts[P];return'<div class="r"><span>'+P+'</span><span class="t"><i style="width:'+(c/n*100)+'%"></i></span><span>'+c+"/"+n+"</span></div>";}).join("")+'</div></div></div><p class="small muted" style="margin:10px 0 0">Les corrections sont affichées sous chaque question. Touche une partie pour les revoir.</p></section>';}
  // Parties
  h+='<section class="card"><div class="parts">'+["P1","P2","P3","P4","P5"].map(P=>{const its=items.filter(i=>i.P===P),a=its.filter(i=>t.ans[i.id]!=null).length;return'<button class="'+(enPart===P?"on ":"")+(a===its.length?"full":"")+'" data-en="part" data-p="'+P+'">'+P.replace("P","P")+'<small>'+a+"/"+its.length+"</small></button>";}).join("")+'</div><h2 style="margin:12px 0 4px">Partie '+enPart.slice(1)+" · "+PNAME[enPart]+'</h2><p class="small muted" style="margin:0 0 12px">'+partHint(enPart)+'</p><div class="list">';
  const its=items.filter(i=>i.P===enPart);let lastGrp="";
  its.forEach(it=>{
    if((it.P==="P3"||it.P==="P4")&&it.grp!==lastGrp){lastGrp=it.grp;const pid="g-"+enDate+"-"+it.grp;
      h+='<div class="q" style="background:var(--surface2)"><div class="xrow"><button class="play" data-play="'+pid+'" data-en="play" data-id="'+it.id+'">▶ Écouter</button>'+(it.P==="P4"?'<span class="small muted">'+esc(it.ctx.k)+"</span>":'<span class="small muted">Conversation · 3 questions</span>')+'</div>'+((t.done||showText[it.grp])?'<div class="script">'+(it.P==="P3"?it.ctx.t.map(([g,x])=>"<p><b>"+(g==="M"?"Homme":"Femme")+" :</b> "+esc(x)+"</p>").join(""):"<p>"+esc(it.ctx.t)+"</p>")+"</div>":'<button class="lnk" data-en="txt" data-g="'+it.grp+'">Pas de son ? Afficher le texte</button>')+"</div>";}
    h+=qHTML(it,t);
  });
  h+="</div>";
  const nx=["P1","P2","P3","P4","P5"].indexOf(enPart);
  h+='<div class="xrow" style="margin-top:14px;justify-content:space-between">'+(nx>0?'<button class="xbtn alt sm" data-en="part" data-p="P'+nx+'">← Partie '+nx+"</button>":"<span></span>")+(nx<4?'<button class="xbtn sm" data-en="part" data-p="P'+(nx+2)+'">Partie '+(nx+2)+" →</button>":"")+"</div></section>";
  if(!t.done){const left=items.length-answered;
    h+='<section class="card"><h2>Fini ?</h2>'+(enConfirm&&left?'<p class="small" style="margin:0 0 10px">Il te reste <b>'+left+'</b> question'+(left>1?"s":"")+' sans réponse. Elles compteront comme fausses.</p><div class="xrow"><button class="xbtn" data-en="valid" data-force="1">Valider quand même</button><button class="xbtn alt" data-en="nocf">Continuer le test</button></div>':'<p class="small muted" style="margin:0 0 10px">Tu peux changer tes réponses autant que tu veux avant de valider. Ensuite tu verras la correction et ton score sera ajouté à ta courbe.</p><button class="xbtn" data-en="valid">Valider mon test</button>')+"</section>";}
  else h+='<section class="card"><button class="xbtn alt" data-en="redo">Refaire ce test pour m\'entraîner</button><p class="small muted" style="margin:8px 0 0">Ton premier score reste enregistré.</p></section>';
  // Progression
  const vals=pts.map(p=>p.y);
  h+='<section class="card"><h2>Ma progression</h2><div style="margin-bottom:8px">'+trendBadge(vals,"pts")+'</div>'+lineChart(pts.slice(-20),{min:0,max:100,goal:85,goalLbl:"objectif 85 %",fv:v=>v+"%",fy:v=>Math.round(v)+"%",label:"Scores en pourcentage"})+weakHTML()+"</section>";
  // Historique
  h+='<section class="card"><h2>Tous mes résultats</h2><div class="list">'+res.slice().reverse().map(r=>{const i=EN.results.indexOf(r);return'<div class="li"><div class="grow"><b>'+esc(r.label||"Test du jour")+'</b><span class="small muted">'+esc(fmt(r.d))+(r.parts?" · "+Object.keys(r.parts).map(k=>esc(k)+" "+r.parts[k][0]+"/"+r.parts[k][1]).join(", "):"")+'</span></div><span class="n">'+r.sc+"/"+r.tot+'</span>'+(r.label?'<button class="x" data-en="delres" data-i="'+i+'" aria-label="Supprimer">✕</button>':'<button class="x" data-en="open" data-d="'+r.d+'" aria-label="Revoir">›</button>')+"</div>";}).join("")+'</div><details style="margin-top:12px"><summary class="lnk" style="display:inline">+ Ajouter un score (examen blanc, test d\'école, TOEIC…)</summary><div class="xgrid2" style="margin-top:10px"><label class="fld">Nom<input id="en-lbl" value="Test d\'école"></label><label class="fld">Date<input id="en-d" type="date" value="'+t0+'"></label><label class="fld">Score<input id="en-sc" inputmode="numeric" placeholder="ex. 65"></label><label class="fld">Sur<input id="en-tot" inputmode="numeric" value="80"></label></div><button class="xbtn sm" style="margin-top:10px" data-en="addres">Ajouter</button></details></section>';
  // Audios officiels + réglages
  h+='<section class="card"><h2>Vrais audios TOEIC en ligne</h2><p class="small muted" style="margin:0 0 10px">Les questions ci-dessus sont lues par la voix anglaise de ton téléphone. Pour t\'habituer au vrai son de l\'examen, entraîne-toi aussi avec les extraits officiels :</p><div class="list"><a class="li" href="https://www.iibc-global.org/toeic/test/lr/about/format.html" target="_blank" rel="noopener"><span>🎧</span><div class="grow"><b>Exemples officiels, parties 1 à 7</b><span class="small muted">iibc-global.org (organisme officiel au Japon), audio de chaque partie</span></div>›</a><a class="li" href="https://www.ets.org/toeic/test-takers/sample-questions.html" target="_blank" rel="noopener"><span>🎧</span><div class="grow"><b>Questions d\'exemple ETS</b><span class="small muted">ets.org, le créateur du TOEIC</span></div>›</a></div><h3 class="small muted" style="margin:14px 0 6px">Vitesse de la voix</h3><div class="segx">'+[[0.8,"Lente"],[0.92,"Normale"],[1.05,"Rapide"]].map(([v,l])=>'<button class="'+(Math.abs((EN.rate||0.92)-v)<.01?"on":"")+'" data-en="rate" data-v="'+v+'">'+l+"</button>").join("")+'</div><p class="small muted" style="margin:8px 0 0">Si aucun son ne sort : vérifie que le bouton silencieux de l\'iPhone est désactivé et monte le volume.</p></section>';
  $("#en-main").innerHTML=h;markPlay();
}
function partHint(P){return{P1:"Lis la description de la photo, écoute les 4 phrases, choisis celle qui décrit le mieux la photo. Les phrases ne sont pas écrites, comme le jour du test.",P2:"Écoute la question puis les 3 réponses, et choisis la plus logique. Attention aux mots répétés : c'est souvent un piège.",P3:"Écoute la conversation puis réponds aux 3 questions. Lis les questions avant d'écouter.",P4:"Écoute l'exposé puis réponds aux 3 questions. Repère les chiffres, les jours et le mot « first ».",P5:"Choisis le mot qui complète la phrase. Lis toute la phrase jusqu'au bout avant de répondre !"}[P];}
function qHTML(it,t){
  const L="ABCD",sel=t.ans[it.id],done=t.done,hideOpts=(it.P==="P1"||it.P==="P2")&&!done&&!showText[it.id];
  let h='<div class="q"><div class="qh"><span class="num">'+it.n+'</span><div class="grow">';
  if(it.P==="P1")h+='<div class="scene">'+esc(it.scene)+"</div>";
  if(it.P==="P2")h+=(done||showText[it.id])?'<div class="qt">'+esc(it.q)+"</div>":'<div class="qt muted">Question et réponses à l\'écoute</div>';
  if(it.P==="P3"||it.P==="P4"||it.P==="P5")h+='<div class="qt">'+esc(it.q).replace("___","<b>_____</b>")+"</div>";
  h+="</div></div>";
  if(it.P==="P1"||it.P==="P2")h+='<div class="xrow"><button class="play" data-play="'+enDate+it.id+'" data-en="play" data-id="'+it.id+'">▶ Écouter</button>'+(hideOpts?'<button class="lnk" data-en="txt" data-g="'+it.id+'">Pas de son ? Afficher le texte</button>':"")+"</div>";
  h+='<div class="opts'+(hideOpts?" letters":"")+'">'+it.opts.map((o,i)=>{const oi=it.orig[i];let c="";if(done){if(oi===it.a)c="ok";else if(sel===oi)c="ko";}else if(sel===oi)c="sel";return'<button class="op '+c+'" data-en="ans" data-id="'+it.id+'" data-o="'+oi+'"'+(done?" disabled":"")+'><span class="l">'+L[i]+"</span>"+(hideOpts?"":"<span>"+esc(o)+"</span>")+"</button>";}).join("")+"</div>";
  if(done){const ok=sel===it.a;h+='<div class="expl '+(ok?"ok":"ko")+'"><b>'+(ok?"✓ Bonne réponse. ":sel==null?"Pas de réponse. ":"✗ La bonne réponse était "+L[it.orig.indexOf(it.a)]+". ")+"</b>"+esc(it.x)+"</div>";}
  return h+"</div>";
}
function weakHTML(){
  const recent=Object.keys(EN.tests).filter(d=>EN.tests[d].done).sort().slice(-7);const agg={};
  recent.forEach(d=>{const s=scoreTest(buildTest(d),EN.tests[d]);Object.keys(s.parts).forEach(P=>{agg[P]=agg[P]||[0,0];agg[P][0]+=s.parts[P][0];agg[P][1]+=s.parts[P][1];});});
  let h='<h3 class="small muted" style="margin:14px 0 6px">Mes points à surveiller</h3>';
  const ps=Object.keys(agg);
  if(ps.length){ps.sort((a,b)=>agg[a][0]/agg[a][1]-agg[b][0]/agg[b][1]);h+='<p class="small" style="margin:0 0 6px">Sur tes '+recent.length+' derniers tests, ta partie la plus fragile est la <b>partie '+ps[0].slice(1)+"</b> ("+Math.round(agg[ps[0]][0]/agg[ps[0]][1]*100)+" %).</p>";}
  h+='<div>'+["for / since + present perfect","who / whose / whom","adverbe après le verbe","be used to + -ing","mots répétés (P2)","chiffres et dates (P3-4)","complimentary / complementary"].map(x=>'<span class="tag warn">'+x+"</span>").join("")+["by / until / in / on","to + -ing","familles de mots","réponses indirectes (P2)"].map(x=>'<span class="tag ok">✓ '+x+"</span>").join("")+"</div>";
  return h;
}
function ring(r,txt){const C=2*Math.PI*40;return'<div class="ring"><svg width="96" height="96" viewBox="0 0 96 96"><circle cx="48" cy="48" r="40" fill="none" stroke="var(--line)" stroke-width="9"/><circle cx="48" cy="48" r="40" fill="none" stroke="var(--accent)" stroke-width="9" stroke-linecap="round" stroke-dasharray="'+(C*Math.min(1,r)).toFixed(1)+" "+C.toFixed(1)+'"/></svg><div class="pct">'+txt+"</div></div>";}
$("#pane-anglais").addEventListener("click",e=>{
  const b=e.target.closest("[data-en]");if(!b)return;const a=b.dataset.en;
  if(a==="ans"){const t=testOf(enDate);if(t.done)return;const o=+b.dataset.o;t.ans[b.dataset.id]=o;save(KEY_EN,EN);
    b.parentElement.querySelectorAll(".op").forEach(x=>x.classList.toggle("sel",+x.dataset.o===o));
    const items=buildTest(enDate),its=items.filter(i=>i.P===enPart),n=its.filter(i=>t.ans[i.id]!=null).length;const pb=document.querySelector('.parts button[data-p="'+enPart+'"]');if(pb){pb.querySelector("small").textContent=n+"/"+its.length;pb.classList.toggle("full",n===its.length);}
    const all=items.filter(i=>t.ans[i.id]!=null).length;const st=document.querySelector("#pane-anglais .stats b");if(st)st.textContent=all+"/"+items.length;const rg=document.querySelector("#pane-anglais .ring");if(rg)rg.outerHTML=ring(all/items.length,all+"");return;}
  if(a==="part"){enPart=b.dataset.p;renderEN();const c=document.querySelector("#pane-anglais .parts");if(c)c.scrollIntoView({block:"start",behavior:"smooth"});return;}
  if(a==="play"){const it=buildTest(enDate).find(i=>i.id===b.dataset.id);if(it)speak(audioFor(it),b.dataset.play);return;}
  if(a==="txt"){showText[b.dataset.g]=true;renderEN();return;}
  if(a==="valid"){const items=buildTest(enDate),t=testOf(enDate),left=items.filter(i=>t.ans[i.id]==null).length;if(left&&!b.dataset.force){enConfirm=true;renderEN();return;}
    enConfirm=false;t.done=true;const s=scoreTest(items,t);t.sc=s.sc;t.tot=s.tot;
    if(!EN.results.some(r=>r.d===enDate&&!r.label))EN.results.push({d:enDate,sc:s.sc,tot:s.tot,parts:s.parts});
    save(KEY_EN,EN);if(window.speechSynthesis)speechSynthesis.cancel();renderEN();window.scrollTo({top:0,behavior:"smooth"});toast("Test validé : "+s.sc+"/"+s.tot+" 🎉");return;}
  if(a==="nocf"){enConfirm=false;renderEN();return;}
  if(a==="redo"){const t=testOf(enDate);t.ans={};t.done=false;showText={};enPart="P1";save(KEY_EN,EN);renderEN();window.scrollTo(0,0);return;}
  if(a==="today"){enDate=today();enPart="P1";renderEN();window.scrollTo(0,0);return;}
  if(a==="open"){enDate=b.dataset.d;enPart="P1";renderEN();window.scrollTo(0,0);return;}
  if(a==="rate"){EN.rate=+b.dataset.v;save(KEY_EN,EN);renderEN();return;}
  if(a==="delres"){const i=+b.dataset.i;if(b.dataset.sure){EN.results.splice(i,1);save(KEY_EN,EN);renderEN();}else{b.dataset.sure="1";b.textContent="Supprimer ?";b.style.color="var(--bad)";b.style.fontSize=".75rem";}return;}
  if(a==="addres"){const sc=num($("#en-sc").value),tot=num($("#en-tot").value),d=$("#en-d").value||today();if(sc==null||!tot||sc>tot){toast("Indique un score valide (ex. 65 sur 80).");return;}
    EN.results.push({d,label:$("#en-lbl").value.trim()||"Score",sc,tot});save(KEY_EN,EN);renderEN();toast("Score ajouté à ta courbe");return;}
});

/* ===================== MES COURS ===================== */
const F="fiches/";
const SUBJ=[
{id:"ga",n:"General Accounting and International Business",s:"CM + TD · en anglais",e:"🧾",c:"#E2457E",f:[["L'essentiel examen",F+"general-accounting/fiche-essentiel-general-accounting.html"]]},
{id:"fin",n:"Finances d'entreprise",s:"CM",e:"💶",c:"#C2410C",f:[["Fiche complète",F+"finances-entreprise/fiche-finances-entreprise.html"],["L'essentiel examen",F+"finances-entreprise/fiche-essentiel-finances-entreprise.html"]]},
{id:"it",n:"International Trade",s:"CM · en anglais",e:"🌎",c:"#2563EB",f:[["Fiche complète",F+"international-trade/fiche-international-trade.html"],["L'essentiel examen",F+"international-trade/fiche-essentiel-international-trade.html"]]},
{id:"exp",n:"Export Techniques",s:"CM · en anglais",e:"📦",c:"#0F766E",f:[["Fiche complète",F+"export-techniques/fiche-export-techniques.html"],["L'essentiel examen",F+"export-techniques/fiche-essentiel-export-techniques.html"]]},
{id:"log",n:"Logistique et transport",s:"CM",e:"🚢",c:"#0E7490",f:[["Fiche complète",F+"logistique-transport/fiche-logistique-transport.html"],["L'essentiel examen",F+"logistique-transport/fiche-essentiel-logistique-transport.html"]]},
{id:"im",n:"International Management",s:"CM · en anglais",e:"🤝",c:"#7C3AED",f:[["Fiche complète",F+"international-management/fiche-international-management.html"],["L'essentiel examen",F+"international-management/fiche-essentiel-international-management.html"]]},
{id:"law",n:"Business Law",s:"CM · en anglais",e:"⚖️",c:"#9F1239",f:[["Fiche complète (contrats)",F+"business-law/fiche-business-law.html"],["L'essentiel examen",F+"business-law/fiche-essentiel-business-law.html"]]},
{id:"dm",n:"Digital Marketing",s:"CM · en anglais",e:"📱",c:"#DB2777",f:[["Marques, positionnement et désir",F+"digital-marketing/fiche-marques-desir.html"],["L'essentiel examen",F+"digital-marketing/fiche-essentiel-digital-marketing.html"]]},
{id:"md",n:"Management digital",s:"Fiche déjà faite",e:"💻",c:"#4F46E5",f:[["Fiche complète",F+"management-digital/fiche-management-digital.html"]]},
{id:"so",n:"Smart Office : bureautique et IA",s:"TD",e:"🤖",c:"#65A30D",f:[]},
{id:"esp",n:"Communication and Contemporary Issues",s:"TD · espagnol",e:"🇪🇸",c:"#D97706",f:[]},
{id:"toeic",n:"TOEIC Training",s:"TD · en anglais",e:"🎧",c:"#E11D48",f:[],toeic:true}
];
/* Cours en PDF ajoutés par Claude dans l'appli (dossier cours/ du site) : {id matière: [[titre, chemin], ...]} */
const COURS_PDF=window.COURS_PDF||{};
let db=null;
function idb(){return new Promise((res,rej)=>{if(db)return res(db);if(!window.indexedDB)return rej(new Error("no idb"));const r=indexedDB.open("marleneCours",1);r.onupgradeneeded=()=>{r.result.createObjectStore("pdfs",{keyPath:"id"});};r.onsuccess=()=>{db=r.result;res(db);};r.onerror=()=>rej(r.error);});}
async function pdfList(){try{const d=await idb();return await new Promise(res=>{const out=[];const c=d.transaction("pdfs").objectStore("pdfs").openCursor();c.onsuccess=()=>{const x=c.result;if(x){const v=x.value;out.push({id:v.id,s:v.s,name:v.name,size:v.size,at:v.at});x.continue();}else res(out);};c.onerror=()=>res(out);});}catch(e){return null;}}
async function pdfPut(o){const d=await idb();return new Promise((res,rej)=>{const tx=d.transaction("pdfs","readwrite");tx.objectStore("pdfs").put(o);tx.oncomplete=res;tx.onerror=()=>rej(tx.error);});}
async function pdfGet(id){const d=await idb();return new Promise(res=>{const r=d.transaction("pdfs").objectStore("pdfs").get(id);r.onsuccess=()=>res(r.result);r.onerror=()=>res(null);});}
async function pdfDel(id){const d=await idb();return new Promise(res=>{const tx=d.transaction("pdfs","readwrite");tx.objectStore("pdfs").delete(id);tx.oncomplete=res;});}
let openSubj=null;
async function renderCours(){
  const list=await pdfList();const by={};(list||[]).forEach(p=>{(by[p.s]=by[p.s]||[]).push(p);});
  let h='<section class="hero" style="grid-template-columns:1fr"><div><p class="hello">Mes cours du S5</p><div class="date">'+SUBJ.length+' matières · fiches de révision et PDF de tes cours</div></div></section>';
  h+='<p class="note" style="margin:0">Touche une matière pour l\'ouvrir. « Ajouter un PDF » garde le fichier <b>sur ton téléphone</b>, dans l\'appli. Tu peux aussi m\'envoyer tes PDF : je ferai les fiches et je les ajouterai ici.</p>';
  SUBJ.forEach(s=>{const mine=by[s.id]||[],cl=COURS_PDF[s.id]||[],n=s.f.length+mine.length+cl.length;
    h+='<details class="subj" style="--c:'+s.c+'"'+(openSubj===s.id?" open":"")+' data-s="'+s.id+'"><summary><span class="em">'+s.e+'</span><span class="nm">'+esc(s.n)+"<small>"+esc(s.s)+'</small></span><span class="cnt">'+n+" doc"+(n>1?"s":"")+'</span></summary><div class="in">';
    if(s.toeic)h+='<button class="li" style="border:0;text-align:left;width:100%" data-c="toeic"><span>🎧</span><div class="grow"><b>Mes tests d\'anglais</b><span class="small muted">Un nouveau test chaque jour, parties 1 à 5</span></div>›</button>';
    if(s.f.length)h+='<h3>Mes fiches de révision</h3><div class="list">'+s.f.map(([t,u])=>'<a class="li" href="'+u+'" target="_blank" rel="noopener"><span>📝</span><div class="grow"><b>'+esc(t)+'</b><span class="small muted">Fiche illustrée avec quiz corrigé</span></div>›</a>').join("")+"</div>";
    if(cl.length)h+='<h3>Cours (PDF)</h3><div class="list">'+cl.map(([t,u])=>'<a class="li" href="'+u+'" target="_blank" rel="noopener"><span>📄</span><div class="grow"><b>'+esc(t)+'</b></div>›</a>').join("")+"</div>";
    h+='<h3>Mes PDF sur ce téléphone</h3>'+(list===null?'<p class="small muted">Le stockage de fichiers n\'est pas disponible dans ce navigateur.</p>':(mine.length?'<div class="list">'+mine.sort((a,b)=>b.at-a.at).map(p=>'<div class="li"><span>📄</span><button class="grow" style="border:0;background:none;text-align:left;padding:0" data-c="view" data-id="'+p.id+'"><b>'+esc(p.name)+'</b><span class="small muted">'+(p.size/1048576).toFixed(1).replace(".",",")+" Mo · ajouté le "+esc(fmtS(ymd(new Date(p.at))))+'</span></button><button class="x" data-c="del" data-id="'+p.id+'" aria-label="Supprimer">✕</button></div>').join("")+"</div>":'<p class="small muted" style="margin:0">Aucun PDF pour l\'instant.</p>')+'<label class="xbtn alt sm filebtn" style="align-self:flex-start">＋ Ajouter un PDF<input type="file" accept="application/pdf,.pdf" multiple data-up="'+s.id+'"></label>');
    h+="</div></details>";});
  $("#cours-main").innerHTML=h;
}
$("#pane-cours").addEventListener("toggle",e=>{const d=e.target;if(d.matches&&d.matches("details.subj")&&d.open){openSubj=d.dataset.s;document.querySelectorAll("details.subj").forEach(x=>{if(x!==d)x.open=false;});}},true);
$("#pane-cours").addEventListener("change",async e=>{const inp=e.target.closest("input[data-up]");if(!inp)return;const files=[...inp.files];if(!files.length)return;
  try{for(const f of files){await pdfPut({id:Date.now()+"-"+Math.random().toString(36).slice(2,7),s:inp.dataset.up,name:f.name.replace(/\.pdf$/i,""),size:f.size,at:Date.now(),blob:f});}
    openSubj=inp.dataset.up;toast(files.length>1?files.length+" PDF ajoutés":"PDF ajouté");}catch(err){toast("Impossible d'enregistrer ce PDF (espace plein ?)");}
  renderCours();});
$("#pane-cours").addEventListener("click",async e=>{const b=e.target.closest("[data-c]");if(!b)return;const a=b.dataset.c;
  if(a==="toeic"){showPane("anglais");return;}
  if(a==="del"){if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Supprimer ?";b.style.color="var(--bad)";b.style.fontSize=".75rem";return;}await pdfDel(b.dataset.id);renderCours();return;}
  if(a==="view"){const p=await pdfGet(b.dataset.id);if(!p)return;openViewer(p);}
});
function openViewer(p){
  const url=URL.createObjectURL(p.blob);const v=document.createElement("div");v.className="viewer";
  v.innerHTML='<div class="vb"><button class="xbtn alt sm" data-v="close">← Retour</button><b>'+esc(p.name)+'</b><button class="xbtn sm" data-v="share">Ouvrir / partager</button></div><iframe src="'+url+'" title="'+esc(p.name)+'"></iframe>';
  document.body.appendChild(v);
  v.addEventListener("click",async e=>{const b=e.target.closest("[data-v]");if(!b)return;
    if(b.dataset.v==="close"){v.remove();URL.revokeObjectURL(url);}
    else{const file=new File([p.blob],p.name+".pdf",{type:"application/pdf"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:p.name});}catch(err){}}
      else{const a=document.createElement("a");a.href=url;a.download=p.name+".pdf";a.target="_blank";document.body.appendChild(a);a.click();a.remove();}}});
}

/* ===================== SPORT ===================== */
const KEY_SP="marleneSport.v1";
let SP=load(KEY_SP,null);if(!SP||typeof SP!=="object")SP={};
SP.p=SP.p||{sex:"",age:null,h:null,muscu:3,course:2,surplus:400,goal:null};SP.w=SP.w||[];SP.food=SP.food||{};SP.ses=SP.ses||[];
const saveSP=()=>save(KEY_SP,SP);
let spEdit=false,spType="muscu";
const PRESETS=[["Shake maison",650,30,"lait entier + flocons d'avoine + banane + beurre de cacahuète"],["2 œufs",150,12],["Poulet 150 g",250,45],["Riz cuit 200 g",260,5],["Pâtes cuites 250 g",390,14],["Banane",105,1],["Skyr 150 g",90,15],["Amandes 30 g",175,6],["Avocat",240,3],["Tartine beurre de cacahuète",280,9],["Fromage 30 g",120,7],["Verre de lait",130,7]];
function curW(){const w=SP.w.slice().sort((a,b)=>a.d<b.d?-1:1);return w.length?w[w.length-1].kg:null;}
function calc(){const p=SP.p,kg=curW();if(!p.sex||!p.age||!p.h||!kg)return null;
  const bmr=10*kg+6.25*p.h-5*p.age+(p.sex==="H"?5:-161);const n=(p.muscu||0)+(p.course||0);
  const f=n===0?1.2:n<=2?1.375:n<=4?1.55:n<=6?1.725:1.9;const tdee=bmr*f,target=tdee+(p.surplus||400);
  const prot=Math.round(kg*1.8),fat=Math.round(kg*1),carb=Math.max(0,Math.round((target-prot*4-fat*9)/4));
  return{bmr:Math.round(bmr),tdee:Math.round(tdee/10)*10,target:Math.round(target/10)*10,prot,fat,carb,run:Math.round(kg*5),kg,f};}
function rate(){/* kg par semaine sur les 28 derniers jours (régression) */
  const w=SP.w.slice().sort((a,b)=>a.d<b.d?-1:1);if(w.length<2)return null;const last=w[w.length-1].d;const pts=w.filter(x=>diff(x.d,last)<=28);if(pts.length<2||diff(pts[0].d,last)<6)return null;
  const xs=pts.map(x=>diff(pts[0].d,x.d)),ys=pts.map(x=>x.kg),mx=xs.reduce((a,b)=>a+b)/xs.length,my=ys.reduce((a,b)=>a+b)/ys.length;let nu=0,de=0;xs.forEach((x,i)=>{nu+=(x-mx)*(ys[i]-my);de+=(x-mx)**2;});return de?nu/de*7:null;}
function renderSport(){
  const c=calc(),t0=today(),food=SP.food[t0]||[],eatK=food.reduce((a,x)=>a+x.k,0),eatP=food.reduce((a,x)=>a+x.p,0),p=SP.p;
  let h='<section class="hero" style="grid-template-columns:1fr auto"><div><p class="hello">Prise de poids</p><div class="date">'+esc(fmt(t0))+'</div><div class="stats">'+(curW()?'<span><b>'+String(curW()).replace(".",",")+' kg</b> aujourd\'hui</span>':"")+(c?'<span><b>'+c.target+'</b> kcal / jour</span>':"")+"</div></div>"+(c?ring2(eatK/c.target,eatK,"kcal mangées"):"")+"</section>";
  // Profil
  if(!c||spEdit){
    h+='<section class="card"><h2>'+(c?"Modifier mes infos":"Pour calculer tes calories")+'</h2><p class="small muted" style="margin:0 0 12px">Juste l\'essentiel. Tout reste sur ton téléphone.</p><div class="fld" style="margin-bottom:10px">Calcul pour<div class="segx">'+[["F","Femme"],["H","Homme"]].map(([v,l])=>'<button class="'+(p.sex===v?"on":"")+'" data-sp="sex" data-v="'+v+'">'+l+"</button>").join("")+'</div></div><div class="xgrid3"><label class="fld">Âge<input id="sp-age" inputmode="numeric" value="'+(p.age||"")+'" placeholder="ans"></label><label class="fld">Taille<input id="sp-h" inputmode="numeric" value="'+(p.h||"")+'" placeholder="cm"></label><label class="fld">Poids<input id="sp-kg" inputmode="decimal" value="'+(curW()?String(curW()).replace(".",","):"")+'" placeholder="kg"></label></div>'+
    '<div class="xgrid2" style="margin-top:12px"><div class="fld">Muscu / semaine<div class="stepper"><button data-sp="st" data-k="muscu" data-v="-1">−</button><b>'+p.muscu+'</b><button data-sp="st" data-k="muscu" data-v="1">+</button></div></div><div class="fld">Courses / semaine<div class="stepper"><button data-sp="st" data-k="course" data-v="-1">−</button><b>'+p.course+'</b><button data-sp="st" data-k="course" data-v="1">+</button></div></div></div>'+
    '<div class="fld" style="margin-top:12px">Rythme de prise de poids<div class="segx">'+[[250,"Doux +250"],[400,"Conseillé +400"],[550,"Rapide +550"]].map(([v,l])=>'<button class="'+(p.surplus===v?"on":"")+'" data-sp="sur" data-v="'+v+'">'+l+"</button>").join("")+'</div></div><label class="fld" style="margin-top:12px">Poids visé (facultatif)<input id="sp-goal" inputmode="decimal" value="'+(p.goal?String(p.goal).replace(".",","):"")+'" placeholder="kg"></label><button class="xbtn" style="margin-top:14px" data-sp="saveprof">Calculer</button></section>';
  }
  if(c&&!spEdit){
    h+='<section class="card"><h2>Mes calories du jour</h2><div class="xgrid2"><div class="kpi big" style="grid-column:1/-1"><b>'+c.target+' kcal</b><span>à manger chaque jour pour prendre du poids</span></div><div class="kpi"><b>'+c.tdee+'</b><span>kcal pour garder ton poids</span></div><div class="kpi"><b>+'+p.surplus+'</b><span>kcal en plus (surplus)</span></div></div><h3 class="small muted" style="margin:14px 0 6px">Répartition conseillée</h3><div class="xgrid3"><div class="kpi"><b>'+c.prot+' g</b><span>protéines</span></div><div class="kpi"><b>'+c.carb+' g</b><span>glucides</span></div><div class="kpi"><b>'+c.fat+' g</b><span>lipides</span></div></div><p class="advice small" style="margin:12px 0 0">🏃‍♀️ Les soirs de course, ajoute environ <b>'+c.run+' kcal</b> (≈ 1 kcal par kg et par km, ici pour 5 km).</p><button class="lnk" style="margin-top:10px" data-sp="edit">Modifier mes infos</button></section>';
    // Repas du jour
    h+='<section class="card"><h2>Ce que j\'ai mangé aujourd\'hui</h2><div class="xrow" style="gap:14px;flex-wrap:nowrap">'+ring2(eatK/c.target,eatK,"/ "+c.target)+'<div class="grow"><div class="small">Protéines : <b>'+eatP+" / "+c.prot+' g</b></div><div class="small muted" style="margin-top:4px">'+(eatK>=c.target?"Objectif atteint, bravo 🎉":"Il te reste <b>"+(c.target-eatK)+" kcal</b>")+'</div></div></div><h3 class="small muted" style="margin:14px 0 6px">Ajout rapide</h3><div class="presets">'+PRESETS.map((x,i)=>'<button data-sp="pre" data-i="'+i+'"'+(x[3]?' title="'+esc(x[3])+'"':"")+'>'+esc(x[0])+" <small>"+x[1]+"</small></button>").join("")+'</div><div class="xgrid3" style="margin-top:10px;grid-template-columns:1.4fr 1fr 1fr"><label class="fld">Aliment<input id="sp-fn" placeholder="ex. sandwich"></label><label class="fld">kcal<input id="sp-fk" inputmode="numeric"></label><label class="fld">Protéines g<input id="sp-fp" inputmode="numeric"></label></div><button class="xbtn alt sm" style="margin-top:8px" data-sp="addfood">Ajouter</button>'+(food.length?'<div class="list" style="margin-top:12px">'+food.map((x,i)=>'<div class="li"><div class="grow"><b>'+esc(x.n)+'</b><span class="small muted">'+x.p+' g de protéines</span></div><span class="n">'+x.k+' kcal</span><button class="x" data-sp="delfood" data-i="'+i+'" aria-label="Retirer">✕</button></div>').join("")+"</div>":"")+"</section>";
  }
  // Poids
  const ws=SP.w.slice().sort((a,b)=>a.d<b.d?-1:1),rt=rate();
  h+='<section class="card"><h2>Mon poids</h2>';
  if(ws.length){const gain=r1(ws[ws.length-1].kg-ws[0].kg);h+='<div class="xgrid3" style="margin-bottom:10px"><div class="kpi"><b>'+String(ws[0].kg).replace(".",",")+'</b><span>départ ('+fmtS(ws[0].d)+')</span></div><div class="kpi"><b>'+String(ws[ws.length-1].kg).replace(".",",")+'</b><span>actuel</span></div><div class="kpi"><b style="color:'+(gain>0?"var(--good)":gain<0?"var(--bad)":"inherit")+'">'+(gain>0?"+":"")+String(gain).replace(".",",")+'</b><span>kg gagnés</span></div></div>'+lineChart(ws.slice(-30).map(x=>({x:fmtS(x.d),y:x.kg})),{goal:p.goal||null,goalLbl:"objectif "+(p.goal||""),fv:v=>String(r1(v)).replace(".",","),fy:v=>r1(v),label:"Courbe de poids"});
    h+=adviceW(rt,c,ws);}
  else h+='<p class="small muted" style="margin:0 0 10px">Pèse-toi 1 à 2 fois par semaine, le matin à jeun, et note-le ici.</p>';
  h+='<div class="xgrid2" style="margin-top:12px"><label class="fld">Date<input id="sp-wd" type="date" value="'+t0+'"></label><label class="fld">Poids (kg)<input id="sp-wk" inputmode="decimal" placeholder="ex. 52,4"></label></div><button class="xbtn sm" style="margin-top:8px" data-sp="addw">Enregistrer mon poids</button>'+(ws.length?'<details style="margin-top:12px"><summary class="lnk" style="display:inline">Voir toutes mes pesées</summary><div class="list" style="margin-top:8px">'+ws.slice().reverse().map(x=>'<div class="li"><div class="grow">'+esc(fmt(x.d))+'</div><span class="n">'+String(x.kg).replace(".",",")+' kg</span><button class="x" data-sp="delw" data-d="'+x.d+'" aria-label="Supprimer">✕</button></div>').join("")+"</div></details>":"")+"</section>";
  // Séances
  const wk0=addD(t0,-((parse(t0).getDay()+6)%7)),wk=SP.ses.filter(s=>s.d>=wk0&&s.d<=addD(wk0,6));
  const km=wk.filter(s=>s.t==="course").reduce((a,s)=>a+(s.km||0),0);
  h+='<section class="card"><h2>Mes séances</h2><div class="xgrid3" style="margin-bottom:12px"><div class="kpi"><b>'+wk.filter(s=>s.t==="muscu").length+(p.muscu?"/"+p.muscu:"")+'</b><span>muscu cette semaine</span></div><div class="kpi"><b>'+wk.filter(s=>s.t==="course").length+(p.course?"/"+p.course:"")+'</b><span>courses cette semaine</span></div><div class="kpi"><b>'+String(r1(km)).replace(".",",")+'</b><span>km cette semaine</span></div></div>'+
  '<div class="segx">'+[["muscu","🏋️‍♀️ Muscu"],["course","🏃‍♀️ Course"]].map(([v,l])=>'<button class="'+(spType===v?"on":"")+'" data-sp="type" data-v="'+v+'">'+l+"</button>").join("")+'</div><div class="xgrid2" style="margin-top:10px"><label class="fld">Date<input id="sp-sd" type="date" value="'+t0+'"></label><label class="fld">Durée (min)<input id="sp-smin" inputmode="numeric" placeholder="ex. 60"></label>'+(spType==="course"?'<label class="fld">Distance (km)<input id="sp-skm" inputmode="decimal" placeholder="ex. 5"></label>':'<label class="fld">Séance<select id="sp-sz"><option>Haut du corps</option><option>Bas du corps</option><option>Fessiers / jambes</option><option>Full body</option><option>Dos / bras</option><option>Pecs / épaules</option></select></label>')+'</div><label class="fld" style="margin-top:8px">Notes (exercices, charges, ressenti)<textarea id="sp-sn" placeholder="'+(spType==="muscu"?"ex. Squat 4×10 à 30 kg, hip thrust 4×12 à 40 kg":"ex. tranquille, bonnes sensations")+'"></textarea></label><button class="xbtn sm" style="margin-top:8px" data-sp="addses">Ajouter la séance</button>';
  const ss=SP.ses.slice().sort((a,b)=>a.d<b.d?1:a.d>b.d?-1:b.id-a.id).slice(0,30);
  if(ss.length)h+='<div class="list" style="margin-top:14px">'+ss.map(s=>{const pace=s.t==="course"&&s.km&&s.min?s.min/s.km:null;return'<div class="li" style="align-items:flex-start"><span style="font-size:1.2rem">'+(s.t==="muscu"?"🏋️‍♀️":"🏃‍♀️")+'</span><div class="grow"><b>'+(s.t==="muscu"?esc(s.z||"Muscu"):"Course"+(s.km?" · "+String(s.km).replace(".",",")+" km":""))+'</b><span class="small muted">'+esc(fmt(s.d))+(s.min?" · "+s.min+" min":"")+(pace?" · "+Math.floor(pace)+"'"+pad(Math.round((pace%1)*60))+" /km":"")+"</span>"+(s.n?'<div class="small" style="margin-top:3px;white-space:pre-wrap">'+esc(s.n)+"</div>":"")+'</div><button class="x" data-sp="delses" data-id="'+s.id+'" aria-label="Supprimer">✕</button></div>';}).join("")+"</div>";
  h+="</section>";
  h+='<section class="card"><h2>Mes repères prise de poids</h2><div class="list"><div class="li">🍽️<div class="grow">3 repas + 2 collations par jour, même sans grande faim.</div></div><div class="li">🥜<div class="grow">Aliments denses : beurre de cacahuète, oléagineux, huile d\'olive, avocat, fromage, flocons d\'avoine.</div></div><div class="li">🥚<div class="grow">Des protéines à chaque repas (œufs, viande, poisson, skyr, légumineuses).</div></div><div class="li">🏋️‍♀️<div class="grow">Muscu : augmente un peu la charge ou les répétitions chaque semaine.</div></div><div class="li">🏃‍♀️<div class="grow">Course : garde des sorties courtes et tranquilles, et mange plus ces jours-là.</div></div><div class="li">😴<div class="grow">7 à 9 h de sommeil : c\'est là que le muscle se construit.</div></div></div><p class="small muted" style="margin:10px 0 0">Ces chiffres sont des estimations (formule de Mifflin-St Jeor). Ajuste selon ta courbe de poids, et demande l\'avis d\'un médecin ou d\'un diététicien si besoin.</p></section>';
  $("#sport-main").innerHTML=h;
}
function adviceW(rt,c,ws){
  if(rt==null)return'<p class="advice small" style="margin:10px 0 0">Continue à te peser : après 1 à 2 semaines, je te dirai si ton rythme est bon (idéal : +0,25 à +0,5 kg par semaine).</p>';
  const r=String(r1(rt)).replace(".",",");
  if(rt<0.15)return'<p class="advice small" style="--c:var(--warn);margin:10px 0 0">Rythme actuel : <b>'+(rt>0?"+":"")+r+' kg / semaine</b>. C\'est un peu lent : ajoute environ <b>150 à 200 kcal</b> par jour (une collation de plus).</p>';
  if(rt>0.6)return'<p class="advice small" style="--c:var(--warn);margin:10px 0 0">Rythme actuel : <b>+'+r+' kg / semaine</b>. C\'est rapide : tu peux enlever environ <b>150 kcal</b> par jour pour prendre surtout du muscle.</p>';
  let eta="";if(SP.p.goal&&ws.length&&SP.p.goal>ws[ws.length-1].kg){const wks=Math.ceil((SP.p.goal-ws[ws.length-1].kg)/rt);eta=" À ce rythme, tu atteins "+String(SP.p.goal).replace(".",",")+" kg vers le <b>"+esc(fmt(addD(today(),wks*7)))+"</b>.";}
  return'<p class="advice small" style="--c:var(--good);margin:10px 0 0">Rythme actuel : <b>+'+r+' kg / semaine</b>. Parfait, continue comme ça !'+eta+"</p>";
}
function ring2(r,v,lbl){const C=2*Math.PI*46;return'<div class="ring2"><svg width="110" height="110" viewBox="0 0 110 110"><circle cx="55" cy="55" r="46" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="55" cy="55" r="46" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="'+(C*Math.min(1,Math.max(0,r))).toFixed(1)+" "+C.toFixed(1)+'"/></svg><div class="c"><div><b>'+v+"</b><br><span>"+esc(lbl)+"</span></div></div></div>";}
$("#pane-sport").addEventListener("click",e=>{
  const b=e.target.closest("[data-sp]");if(!b)return;const a=b.dataset.sp,p=SP.p,t0=today();
  const keepForm=()=>{const g=id=>{const el=$(id);return el?el.value:null;};return{age:g("#sp-age"),h:g("#sp-h"),kg:g("#sp-kg"),goal:g("#sp-goal")};};
  const restore=f=>{if(!f)return;[["#sp-age","age"],["#sp-h","h"],["#sp-kg","kg"],["#sp-goal","goal"]].forEach(([id,k])=>{const el=$(id);if(el&&f[k]!=null)el.value=f[k];});};
  if(a==="sex"||a==="st"||a==="sur"){const f=keepForm();if(a==="sex")p.sex=b.dataset.v;if(a==="sur")p.surplus=+b.dataset.v;if(a==="st")p[b.dataset.k]=Math.max(0,Math.min(7,(p[b.dataset.k]||0)+ +b.dataset.v));saveSP();renderSport();restore(f);return;}
  if(a==="saveprof"){const age=num($("#sp-age").value),hh=num($("#sp-h").value),kg=num($("#sp-kg").value),goal=num($("#sp-goal").value);
    if(!p.sex){toast("Choisis Femme ou Homme pour la formule.");return;}
    if(!age||age<12||age>90||!hh||hh<120||hh>220||!kg||kg<30||kg>200){toast("Vérifie ton âge, ta taille (cm) et ton poids (kg).");return;}
    p.age=age;p.h=hh;p.goal=goal&&goal>30?goal:null;if(curW()!==kg){SP.w=SP.w.filter(x=>x.d!==t0);SP.w.push({d:t0,kg:r1(kg)});}
    spEdit=false;saveSP();renderSport();window.scrollTo({top:0,behavior:"smooth"});return;}
  if(a==="edit"){spEdit=true;renderSport();return;}
  if(a==="pre"){const x=PRESETS[+b.dataset.i];(SP.food[t0]=SP.food[t0]||[]).push({n:x[0],k:x[1],p:x[2]});saveSP();renderSport();toast("+"+x[1]+" kcal");return;}
  if(a==="addfood"){const k=num($("#sp-fk").value);if(!k){toast("Indique les kcal.");return;}(SP.food[t0]=SP.food[t0]||[]).push({n:$("#sp-fn").value.trim()||"Aliment",k:Math.round(k),p:Math.round(num($("#sp-fp").value)||0)});saveSP();renderSport();return;}
  if(a==="delfood"){(SP.food[t0]||[]).splice(+b.dataset.i,1);saveSP();renderSport();return;}
  if(a==="addw"){const kg=num($("#sp-wk").value),d=$("#sp-wd").value||t0;if(!kg||kg<30||kg>200){toast("Indique ton poids en kg (ex. 52,4).");return;}SP.w=SP.w.filter(x=>x.d!==d);SP.w.push({d,kg:r1(kg)});saveSP();renderSport();toast("Poids enregistré");return;}
  if(a==="delw"){if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Supprimer ?";b.style.color="var(--bad)";b.style.fontSize=".75rem";return;}SP.w=SP.w.filter(x=>x.d!==b.dataset.d);saveSP();renderSport();return;}
  if(a==="type"){spType=b.dataset.v;renderSport();return;}
  if(a==="addses"){const s={id:Date.now(),t:spType,d:$("#sp-sd").value||t0,min:Math.round(num($("#sp-smin").value)||0)||null,n:$("#sp-sn").value.trim()};
    if(spType==="course"){s.km=num($("#sp-skm").value);if(s.km)s.km=r1(s.km);}else s.z=$("#sp-sz").value;
    SP.ses.push(s);saveSP();renderSport();toast("Séance ajoutée 💪");return;}
  if(a==="delses"){if(!b.dataset.sure){b.dataset.sure="1";b.textContent="Supprimer ?";b.style.color="var(--bad)";b.style.fontSize=".75rem";return;}SP.ses=SP.ses.filter(s=>String(s.id)!==b.dataset.id);saveSP();renderSport();return;}
});

/* Un nouveau jour pendant que l'appli est ouverte : on passe au test du jour */
let lastDay=today();
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"&&today()!==lastDay){if(enDate===lastDay)enDate=today();lastDay=today();if(pane!=="planning")showPane(pane);}});
showPane(pane);
})();

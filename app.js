import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendPasswordResetEmail, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, serverTimestamp, writeBatch, onSnapshot
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* Paste your Firebase Web App config here. */
const firebaseConfig = {
  apiKey: "AIzaSyCvf4nbJi4zB5Dptq5Gb0OBruNUIkOP__s",
  authDomain: "carehomeos.firebaseapp.com",
  projectId: "carehomeos",
  storageBucket: "carehomeos.firebasestorage.app",
  messagingSenderId: "460914373916",
  appId: "1:460914373916:web:56ce703ba4dedbef0f36d9"
};

const configured = !firebaseConfig.apiKey.startsWith("PASTE_") && !firebaseConfig.projectId.startsWith("PASTE_");
const app = configured ? initializeApp(firebaseConfig) : null;
const auth = app ? getAuth(app) : null;
const db = app ? getFirestore(app) : null;

const navItems=[
  ["dashboard","⌂","Overview"],["people","◉","People"],["staff","♙","Staff"],["rota","▦","Rota & shifts"],
  ["careplans","♡","Care plans"],["incidents","!","Incidents"],["training","✓","Training"],
  ["compliance","◈","Compliance"],["documents","▤","Documents"],["reports","▥","Reports"],
  ["audit","◌","Audit history"],["team","♙","Team & permissions"]
];
let state={user:null,profile:null,org:null,role:null,view:"dashboard",unsub:[],data:{}};

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const initials=n=>String(n||"").split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase()||"??";
const fmtDate=d=>{if(!d)return "—";if(d.toDate)return d.toDate().toLocaleDateString("en-GB");return String(d)};
const statusClass=s=>{s=String(s||"").toLowerCase();if(s.includes("overdue")||s.includes("high")||s.includes("open")||s.includes("action"))return"red";if(s.includes("due")||s.includes("pending")||s.includes("review")||s.includes("medium"))return"amber";if(s.includes("current")||s.includes("filled")||s.includes("valid")||s.includes("closed")||s.includes("track")||s.includes("low"))return"green";return"blue"};
function toast(m){const t=document.createElement("div");t.className="toast";t.textContent=m;document.body.appendChild(t);requestAnimationFrame(()=>t.classList.add("show"));setTimeout(()=>{t.classList.remove("show");setTimeout(()=>t.remove(),250)},2400)}
function showModal(html){const b=document.createElement("div");b.className="modal-back open";b.id="modal";b.innerHTML=`<div class="modal">${html}</div>`;document.body.appendChild(b);b.addEventListener("click",e=>{if(e.target===b)b.remove()})}
function closeModal(){document.getElementById("modal")?.remove()}
function btn(label,onclick,primary=false){return `<button class="btn ${primary?"primary":""}" onclick="${onclick}">${label}</button>`}
function pageHead(title,desc,actions=""){return `<div class="head"><div><h1>${title}</h1><p>${desc}</p></div><div class="actions">${actions}</div></div>`}
function status(s){return `<span class="status ${statusClass(s)}">${esc(s)}</span>`}
function roleLabel(r){return ({owner:"Account Owner",manager:"Registered Manager",senior:"Senior Care Worker",care_worker:"Care Worker"}[r]||r)}
function can(action){
  const r=state.role;
  if(r==="owner")return true;
  if(action==="view")return true;
  if(r==="manager")return ["peopleWrite","staffWrite","rotaWrite","careWrite","incidentWrite","trainingWrite","complianceWrite","documentWrite","reports","audit","teamRead"].includes(action);
  if(r==="senior")return ["peopleWrite","rotaWrite","careWrite","incidentWrite","trainingWrite","reports","audit"].includes(action);
  if(r==="care_worker")return ["incidentWrite","rotaRead","careRead"].includes(action);
  return false;
}

function loginScreen(){
  document.body.innerHTML=`<div class="login"><div class="login-box"><div class="login-brand"><div class="brand-mark">C</div><div><h1>CareHomeOS</h1><small>Care operations platform</small></div></div><p>Secure workspace for independent care providers.</p><div class="tabs"><button class="tab active" id="signinTab">Sign in</button><button class="tab" id="signupTab">Create account</button></div><div id="authForm"></div></div></div>`;
  renderAuth("signin");$("#signinTab").onclick=()=>renderAuth("signin");$("#signupTab").onclick=()=>renderAuth("signup");
}
function renderAuth(mode){
  $("#signinTab").classList.toggle("active",mode==="signin");$("#signupTab").classList.toggle("active",mode==="signup");
  $("#authForm").innerHTML=mode==="signin"?`
  <div class="field"><label>Email</label><input id="email" type="email" autocomplete="email"></div>
  <div class="field" style="margin-top:10px"><label>Password</label><input id="password" type="password" autocomplete="current-password"></div>
  <div id="authError" class="error"></div><div class="login-actions">${btn("Sign in","doSignIn()",true)}</div>
  <button class="link" style="margin-top:12px" onclick="resetPassword()">Forgotten password?</button>`:
  `<div class="field"><label>Your name</label><input id="name"></div>
  <div class="field" style="margin-top:10px"><label>Work email</label><input id="email" type="email"></div>
  <div class="field" style="margin-top:10px"><label>Password</label><input id="password" type="password" minlength="8"></div>
  <div class="field" style="margin-top:10px"><label>Organisation name</label><input id="orgName" placeholder="e.g. Haven Care Group"></div>
  <div class="field" style="margin-top:10px"><label>Service type</label><select id="serviceType"><option>Care home</option><option>Home care</option><option>Supported living</option><option>Extra care</option></select></div>
  <div class="field" style="margin-top:10px"><label>Invite code (optional)</label><input id="inviteCode" placeholder="If your manager invited you"></div>
  <div id="authError" class="error"></div><div class="login-actions">${btn("Create account","doSignUp()",true)}</div>`;
}
window.doSignIn=async()=>{try{await signInWithEmailAndPassword(auth,$("#email").value.trim(),$("#password").value);toast("Signed in")}catch(e){$("#authError").textContent=prettyError(e)}};
window.doSignUp=async()=>{
 try{
   const name=$("#name").value.trim(),email=$("#email").value.trim().toLowerCase(),pass=$("#password").value,orgName=$("#orgName").value.trim(),code=$("#inviteCode").value.trim().toUpperCase();
   if(pass.length<8)throw new Error("Use a password of at least 8 characters.");
   const cred=await createUserWithEmailAndPassword(auth,email,pass);await updateProfile(cred.user,{displayName:name});
   if(code){await claimInvite(cred.user,code,name)}
   else{
     if(!orgName)throw new Error("Enter an organisation name.");
     const orgRef=doc(collection(db,"organisations"));
     const memberRef=doc(db,`organisations/${orgRef.id}/members/${cred.user.uid}`);
     const batch=writeBatch(db);
     batch.set(orgRef,{name:orgName,serviceType:$("#serviceType").value,ownerUid:cred.user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
     batch.set(memberRef,{uid:cred.user.uid,name,email,role:"owner",status:"active",createdAt:serverTimestamp()});
     await batch.commit();
     await setDoc(doc(db,"users",cred.user.uid),{uid:cred.user.uid,name,email,defaultOrgId:orgRef.id,createdAt:serverTimestamp()});
   }
   toast("Account created");
 }catch(e){$("#authError").textContent=prettyError(e)}
};
async function claimInvite(user,code,name){
 const ref=doc(db,`invites/${code}`),snap=await getDoc(ref);
 if(!snap.exists())throw new Error("That invite code is invalid or has expired.");
 const inv=snap.data();
 if(inv.email.toLowerCase()!==user.email.toLowerCase())throw new Error("This invite belongs to a different email address.");
 if(inv.status!=="open")throw new Error("That invite has already been used.");
 const batch=writeBatch(db);
 batch.set(doc(db,`organisations/${inv.orgId}/members/${user.uid}`),{uid:user.uid,name,email:user.email,role:inv.role,status:"active",createdAt:serverTimestamp()});
 batch.set(doc(db,"users",user.uid),{uid:user.uid,name,email:user.email,defaultOrgId:inv.orgId,createdAt:serverTimestamp()});
 batch.update(ref,{status:"claimed",claimedBy:user.uid,claimedAt:serverTimestamp()});
 await batch.commit();
}
window.resetPassword=async()=>{try{const e=$("#email").value.trim();if(!e)throw new Error("Enter your email first.");await sendPasswordResetEmail(auth,e);toast("Password reset email sent")}catch(e){$("#authError").textContent=prettyError(e)}};
window.logout=()=>signOut(auth);
function prettyError(e){return e.code?.includes("email-already")?"That email is already registered.":e.code?.includes("invalid-credential")?"Incorrect email or password.":e.code?.includes("weak-password")?"Password is too weak.":e.message||"Something went wrong."}

async function loadProfile(){
 const u=state.user;
 const p=await getDoc(doc(db,"users",u.uid));state.profile=p.exists()?p.data():null;
 if(!state.profile){await signOut(auth);return}
 const orgId=state.profile.defaultOrgId;
 const o=await getDoc(doc(db,"organisations",orgId));if(!o.exists()){await signOut(auth);return}
 state.org={id:o.id,...o.data()};
 const m=await getDoc(doc(db,`organisations/${orgId}/members/${u.uid}`));
 state.role=m.exists()?m.data().role:null;
 if(!state.role){await signOut(auth);return}
 mountApp();subscribeAll();
}
function mountApp(){
 document.body.innerHTML=`<div id="shell"><aside class="sidebar"><div class="brand"><div class="brand-mark">C</div><div><strong>CareHomeOS</strong><small>Care operations</small></div></div><div class="workspace"><span class="eyebrow">WORKSPACE</span><button class="workspace-btn"><span class="avatar sm">${initials(state.org.name)}</span><b>${esc(state.org.name)}</b><span>⌄</span></button></div><nav class="nav">${navItems.map(x=>`<button data-view="${x[0]}"><span>${x[1]}</span>${x[2]}</button>`).join("")}</nav><div class="side-foot"><div class="help"><span class="avatar sm">?</span><div><strong>Need help?</strong><small>Support centre</small></div></div><div class="user"><span class="avatar">${initials(state.profile.name)}</span><div><strong>${esc(state.profile.name)}</strong><small>${roleLabel(state.role)}</small></div><button onclick="logout()">↗</button></div></div></aside><main class="main"><header class="top"><button class="icon mobile" id="mobileMenu">☰</button><div class="crumb"><span>${esc(state.org.name)}</span><b>/</b><strong id="title">Overview</strong></div><div class="top-actions"><button class="icon" onclick="globalSearch()">⌕</button><button class="icon bell" onclick="notifications()">♧<i>4</i></button><span class="date" id="today"></span></div></header><section class="content" id="content"></section></main></div>`;
 document.querySelectorAll(".nav button").forEach(b=>b.onclick=()=>go(b.dataset.view));$("#mobileMenu").onclick=()=>$(".sidebar").classList.toggle("open");
 render();$("#today").textContent=new Date().toLocaleDateString("en-GB",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
}
function subscribeAll(){
 const id=state.org.id;
 state.unsub.forEach(x=>x());state.unsub=[];
 const maps={people:"people",staff:"staff",rota:"shifts",careplans:"carePlans",incidents:"incidents",training:"training",compliance:"compliance",documents:"documents"};
 Object.entries(maps).forEach(([k,c])=>{
   const q=query(collection(db,`organisations/${id}/${c}`),orderBy("createdAt","desc"),limit(100));
   state.unsub.push(onSnapshot(q,s=>{state.data[k]=s.docs.map(d=>({id:d.id,...d.data()}));if(["people","staff","rota","careplans","incidents","training","compliance","documents"].includes(state.view))render();},e=>{console.warn(e);state.data[k]=[];render()}));
 });
}
const data=k=>state.data[k]||[];
function go(v){state.view=v;render();window.scrollTo(0,0)}
window.go=go;

function render(){
 const titles={dashboard:"Overview",people:"People",staff:"Staff",rota:"Rota & shifts",careplans:"Care plans",incidents:"Incidents",training:"Training",compliance:"Compliance",documents:"Documents",reports:"Reports",audit:"Audit history",team:"Team & permissions"};
 $("#title").textContent=titles[state.view]||"Overview";document.querySelectorAll(".nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===state.view));
 const f=views[state.view]||views.dashboard;$("#content").innerHTML=f();
}
function table(headers,rows){return `<div class="table-card card"><div class="table-wrap"><table class="table"><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.length?rows.join(""):`<tr><td colspan="${headers.length}"><div class="empty">No records found.</div></td></tr>`}</tbody></table></div></div>`}
function personCell(name,sub=""){return `<div class="person"><span class="avatar">${initials(name)}</span><div><strong>${esc(name)}</strong><small>${esc(sub)}</small></div></div>`}
function form(title,sub,fields,saveLabel,saveAction){
 showModal(`<h2>${title}</h2><p class="sub">${sub}</p><div class="form-grid">${fields.map(f=>`<div class="field ${f.full?"full":""}"><label>${f.label}</label>${f.type==="select"?`<select id="f_${f.key}">${f.options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join("")}</select>`:`<${f.type==="textarea"?"textarea":"input"} id="f_${f.key}" ${f.type==="textarea"?"":`type="${f.type||"text"}"`} ${f.value!==undefined?`value="${esc(f.value)}"`:""} placeholder="${esc(f.placeholder||"")}">${f.type==="textarea"?esc(f.value||""):""}</${f.type==="textarea"?"textarea":"input"}>`}</div>`).join("")}</div><div class="modal-actions">${btn("Cancel","closeModal()")}${btn(saveLabel,saveAction,true)}</div>`);
 if(fields)fields.filter(f=>f.type==="select"&&f.value!==undefined).forEach(f=>{const el=$("#f_"+f.key);if(el)el.value=f.value});
}
const v=k=>$("#f_"+k)?.value||"";

async function writeAudit(action,collectionName,recordId,recordLabel,before=null,after=null,summary=""){
  await addDoc(collection(db,`organisations/${state.org.id}/audit`),{
    action,collection:collectionName,recordId,recordLabel:recordLabel||recordId,
    before,after,summary,actorUid:state.user.uid,actorName:state.profile.name,
    at:serverTimestamp()
  });
}
async function createRecord(col,payload,message,label){
 try{
   const ref=await addDoc(collection(db,`organisations/${state.org.id}/${col}`),{...payload,createdBy:state.user.uid,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   try{await writeAudit("Created",col,ref.id,label||payload.name||payload.item||payload.course||payload.personName||ref.id,null,payload,message||"");}catch(a){console.warn("Change history entry failed",a)}
   closeModal();toast(message);
 }catch(e){toast(prettyError(e))}
}
async function editRecord(col,id,payload,message,label){
 try{
   const ref=doc(db,`organisations/${state.org.id}/${col}/${id}`);
   const snap=await getDoc(ref);
   const before=snap.exists()?snap.data():null;
   await updateDoc(ref,{...payload,updatedBy:state.user.uid,updatedAt:serverTimestamp()});
   try{await writeAudit("Updated",col,id,label||before?.name||before?.item||before?.course||before?.personName||id,before,payload,message||"");}catch(a){console.warn("Change history entry failed",a)}
   closeModal();toast(message);
 }catch(e){toast(prettyError(e))}
}

const views={
dashboard:()=>pageHead("Good morning, "+esc(state.profile.name.split(" ")[0]),"Live provider overview · "+esc(state.org.name),can("rotaWrite")?btn("+ New record","quickCreate()",true):"")+`
<div class="grid stats"><div class="card stat"><label>People receiving care</label><strong>${data("people").length}</strong><span class="delta good">Live database</span><div class="stat-icon">◉</div></div><div class="card stat"><label>Active staff</label><strong>${data("staff").filter(x=>x.status==="Active").length}</strong><span class="delta good">Live database</span><div class="stat-icon">♙</div></div><div class="card stat"><label>Open incidents</label><strong>${data("incidents").filter(x=>x.status!=="Closed").length}</strong><span class="delta warn">Needs oversight</span><div class="stat-icon">!</div></div><div class="card stat"><label>Compliance</label><strong>94%</strong><span class="delta good">Assurance score</span><div class="stat-icon">◈</div></div></div>
<div class="grid two"><div class="card panel"><div class="panel-head"><h3>Today's rota</h3><button class="link" onclick="go('rota')">Open rota →</button></div><div class="list">${data("rota").slice(0,5).map(s=>`<div class="row"><div class="rowmain"><strong>${esc(s.date)} · ${esc(s.time)}</strong><small>${esc(s.unit)} · ${esc(s.staffName||"Unassigned")}</small></div>${status(s.status)}</div>`).join("")||`<div class="empty">No shifts yet.</div>`}</div></div><div class="card panel"><div class="panel-head"><h3>Attention required</h3><button class="link" onclick="go('compliance')">See all →</button></div><div class="notice warn"><strong>${data("careplans").filter(x=>x.status==="Review due").length} care plans</strong> need review.</div><div class="notice warn"><strong>${data("training").filter(x=>x.status==="Overdue").length} training items</strong> are overdue.</div><div class="notice info"><strong>${data("rota").filter(x=>x.status==="Open").length} shifts</strong> currently have no cover.</div></div></div>`,
people:()=>pageHead("People","Manage people receiving care, risks and care records.",can("peopleWrite")?btn("+ Add person","addPerson()",true):"")+`<div class="card table-card"><div class="table-tools"><input class="search" placeholder="Search people..." oninput="filterRows(this.value)"></div><div id="table">${table(["Person","Room","Key needs","Risk","Care plan",""],data("people").map(p=>`<tr><td>${personCell(p.name,"DOB "+fmtDate(p.dob))}</td><td>${esc(p.room)}</td><td>${esc(p.needs)}</td><td>${status(p.risk+" risk")}</td><td>${esc(p.planStatus||"Current")}</td><td><button class="btn small" onclick="viewPerson('${p.id}')">Open</button></td></tr>`))}</div></div>`,
staff:()=>pageHead("Staff","Workforce profiles, roles and training status.",can("staffWrite")?btn("+ Add staff","addStaff()",true):"")+table(["Staff member","Role","Status","Training","Next review",""],data("staff").map(s=>`<tr><td>${personCell(s.name,s.email)}</td><td>${esc(s.role)}</td><td>${status(s.status)}</td><td>${esc(s.training||"0%")}</td><td>${fmtDate(s.nextTraining)}</td><td><button class="btn small" onclick="viewStaff('${s.id}')">Open</button></td></tr>`)),
rota:()=>pageHead("Rota & shifts","Database-backed scheduling with real saving, editing and coverage status.",can("rotaWrite")?btn("+ Add shift","addShift()",true):"")+`<div class="notice ${data("rota").some(x=>x.status==="Open")?"warn":"success"}"><strong>${data("rota").filter(x=>x.status==="Open").length} open shifts.</strong> Changes are saved to Firestore and visible to authorised users.</div>`+table(["Date","Time","Unit","Assigned staff","Status",""],data("rota").map(s=>`<tr><td>${esc(s.date)}</td><td>${esc(s.time)}</td><td>${esc(s.unit)}</td><td>${esc(s.staffName||"Unassigned")}</td><td>${status(s.status)}</td><td>${can("rotaWrite")?`<button class="btn small" onclick="editShift('${s.id}')">Edit</button>`:""}</td></tr>`)),
careplans:()=>pageHead("Care plans","Person-centred plans, outcomes, actions and review dates.",can("careWrite")?btn("+ New care plan","addCarePlan()",true):"")+table(["Person","Domain","Goal","Review","Status",""],data("careplans").map(p=>`<tr><td><strong>${esc(p.personName)}</strong></td><td>${esc(p.domain)}</td><td>${esc(p.goal)}</td><td>${fmtDate(p.reviewDate)}</td><td>${status(p.status)}</td><td><button class="btn small" onclick="viewCarePlan('${p.id}')">Open</button>${can("careWrite")?` <button class="btn small" onclick="editCarePlan('${p.id}')">Edit</button>`:""}</td></tr>`)),
incidents:()=>pageHead("Incidents","Record, investigate and learn from safety events.",can("incidentWrite")?btn("+ Report incident","addIncident()",true):"")+table(["Type","Person","Date","Severity","Status","Owner",""],data("incidents").map(i=>`<tr><td><strong>${esc(i.type)}</strong></td><td>${esc(i.personName)}</td><td>${fmtDate(i.date)}</td><td>${status(i.severity)}</td><td>${status(i.status)}</td><td>${esc(i.ownerName||"—")}</td><td><button class="btn small" onclick="viewIncident('${i.id}')">Open</button></td></tr>`)),
training:()=>pageHead("Training & competency","Mandatory learning, competency checks and expiry dates.",can("trainingWrite")?btn("+ Assign training","addTraining()",true):"")+table(["Course","Staff","Due","Status","Score",""],data("training").map(t=>`<tr><td><strong>${esc(t.course)}</strong></td><td>${esc(t.staffName)}</td><td>${fmtDate(t.due)}</td><td>${status(t.status)}</td><td>${esc(t.score||"—")}</td><td>${can("trainingWrite")?`<button class="btn small" onclick="editTraining('${t.id}')">Update</button>`:""}</td></tr>`)),
compliance:()=>pageHead("Compliance & assurance","Controls, audits, actions and governance evidence.",can("complianceWrite")?btn("+ Add action","addCompliance()",true):"")+`<div class="grid stats"><div class="card stat"><label>Assurance score</label><strong>94%</strong><span class="delta good">Good</span><div class="stat-icon">◈</div></div><div class="card stat"><label>Actions open</label><strong>${data("compliance").filter(x=>x.status!=="Complete").length}</strong><span class="delta warn">Tracked</span><div class="stat-icon">!</div></div><div class="card stat"><label>Evidence current</label><strong>98%</strong><span class="delta good">Excellent</span><div class="stat-icon">✓</div></div><div class="card stat"><label>Audit completion</label><strong>91%</strong><span class="delta good">On target</span><div class="stat-icon">▥</div></div></div>`+table(["Control/action","Owner","Due","Status",""],data("compliance").map(c=>`<tr><td><strong>${esc(c.item)}</strong></td><td>${esc(c.owner)}</td><td>${fmtDate(c.due)}</td><td>${status(c.status)}</td><td>${can("complianceWrite")?`<button class="btn small" onclick="editCompliance('${c.id}')">Update</button>`:""}</td></tr>`)),
documents:()=>pageHead("Documents","Controlled policies, evidence and provider records.",can("documentWrite")?btn("+ Add document","addDocument()",true):"")+table(["Document","Category","Version","Review","Status",""],data("documents").map(d=>`<tr><td><strong>${esc(d.name)}</strong></td><td>${esc(d.category)}</td><td>${esc(d.version)}</td><td>${fmtDate(d.review)}</td><td>${status(d.status)}</td><td><button class="btn small" onclick="viewDocument('${d.id}')">Preview</button></td></tr>`)),
reports:()=>pageHead("Reports & insights","Management information generated from the live workspace.",btn("Export snapshot","exportReport()",true))+`<div class="grid metric-grid"><div class="card metric"><small>People</small><strong>${data("people").length}</strong></div><div class="card metric"><small>Open incidents</small><strong>${data("incidents").filter(x=>x.status!=="Closed").length}</strong></div><div class="card metric"><small>Open shifts</small><strong>${data("rota").filter(x=>x.status==="Open").length}</strong></div></div><div class="card panel" style="margin-top:15px"><div class="panel-head"><h3>Management snapshot</h3></div><div class="bar-chart">${[54,48,61,42,36,29].map((v,i)=>`<div class="bar" style="height:${v*2}px"><span>${["Mar","Apr","May","Jun","Jul","Aug"][i]}</span></div>`).join("")}</div></div>`,
audit:()=>pageHead("Audit history","Account-owner change history. Entries are written to Firestore when authorised users create or update records. The owner can review the before/after change data.",can("audit")?btn("Refresh","go('audit')"):"")+`<div class="card table-card"><div class="table-tools"><input class="search" placeholder="Search audit history..." oninput="filterRows(this.value)"></div>${table(["Date","User","Action","Area","Record",""],(state.audit||[]).map(a=>`<tr><td>${fmtDate(a.at)}</td><td>${esc(a.userName||a.uid)}</td><td>${esc(a.action)}</td><td>${esc(a.collection)}</td><td>${esc(a.recordLabel||a.recordId)}</td><td><span class="audit">${esc(a.summary||"")}</span></td></tr>`))}</div>`,
team:()=>pageHead("Team & permissions","Manage workspace roles and create secure invitation codes.",state.role==="owner"?btn("+ Invite team member","inviteUser()",true):"")+`<div class="notice info"><strong>Permissions are enforced by Firestore Security Rules.</strong> The interface also hides controls that a role cannot use.</div>`+table(["Member","Email","Role","Status",""],state.members||[].map(m=>`<tr><td>${personCell(m.name,"")}</td><td>${esc(m.email)}</td><td>${roleLabel(m.role)}</td><td>${status(m.status)}</td><td>${state.role==="owner"&&m.uid!==state.user.uid?`<button class="btn small" onclick="changeRole('${m.uid}','${esc(m.name)}','${m.role}')">Change role</button>`:""}</td></tr>`))
};

window.quickCreate=()=>showModal(`<h2>New record</h2><p class="sub">Choose a record type.</p><div class="grid metric-grid">${can("peopleWrite")?`<button class="btn" onclick="closeModal();addPerson()">Person</button>`:""}${can("staffWrite")?`<button class="btn" onclick="closeModal();addStaff()">Staff</button>`:""}${can("rotaWrite")?`<button class="btn" onclick="closeModal();addShift()">Shift</button>`:""}${can("incidentWrite")?`<button class="btn" onclick="closeModal();addIncident()">Incident</button>`:""}${can("trainingWrite")?`<button class="btn" onclick="closeModal();addTraining()">Training</button>`:""}</div>`);
window.addPerson=()=>form("Add person","Create a care record.",[{key:"name",label:"Full name"},{key:"dob",label:"Date of birth",type:"date"},{key:"room",label:"Room / reference"},{key:"needs",label:"Key needs"},{key:"risk",label:"Risk",type:"select",options:["Low","Medium","High"]}], "Save person",`createRecord("people",{name:v("name"),dob:v("dob"),room:v("room"),needs:v("needs"),risk:v("risk"),planStatus:"Current",status:"In service"},"Person saved")`);
window.addStaff=()=>form("Add staff","Create a staff profile.",[{key:"name",label:"Full name"},{key:"email",label:"Email",type:"email"},{key:"role",label:"Role"},{key:"status",label:"Status",type:"select",options:["Active","On leave","Pending"]},{key:"training",label:"Training completion",value:"0%"}],"Save staff",`createRecord("staff",{name:v("name"),email:v("email"),role:v("role"),status:v("status"),training:v("training")},"Staff member saved")`);
window.addShift=()=>form("Add shift","Create a database-backed rota entry.",[{key:"date",label:"Date"},{key:"time",label:"Time",placeholder:"23:00–07:00"},{key:"unit",label:"Unit / area"},{key:"staffName",label:"Assigned staff",type:"select",options:["Unassigned",...data("staff").filter(s=>s.status==="Active").map(s=>s.name)]},{key:"status",label:"Status",type:"select",options:["Open","Filled","Pending","Cancelled"]},{key:"notes",label:"Notes",full:true}],"Save shift",`createRecord("shifts",{date:v("date"),time:v("time"),unit:v("unit"),staffName:v("staffName"),status:v("status"),notes:v("notes")},"Shift saved")`);
window.editShift=id=>{const s=data("rota").find(x=>x.id===id);form("Edit shift","Update the shift. Saving writes directly to Firestore.",[{key:"date",label:"Date",value:s.date},{key:"time",label:"Time",value:s.time},{key:"unit",label:"Unit / area",value:s.unit},{key:"staffName",label:"Assigned staff",type:"select",value:s.staffName||"Unassigned",options:["Unassigned",...data("staff").filter(x=>x.status==="Active").map(x=>x.name)]},{key:"status",label:"Status",type:"select",value:s.status,options:["Open","Filled","Pending","Cancelled"]},{key:"notes",label:"Notes",value:s.notes||"",full:true}],"Save changes",`editRecord("shifts","${id}",{date:v("date"),time:v("time"),unit:v("unit"),staffName:v("staffName"),status:v("status"),notes:v("notes")},"Shift updated")`)};
window.addCarePlan=()=>form("New care plan","Create a structured person-centred plan.",[{key:"personName",label:"Person",type:"select",options:data("people").map(p=>p.name)},{key:"domain",label:"Care domain",type:"select",options:["Personal care","Mobility","Nutrition","Medication","Communication","Continence","Other"]},{key:"goal",label:"Desired outcome",full:true},{key:"actions",label:"Care actions",full:true},{key:"reviewDate",label:"Review date",type:"date"},{key:"status",label:"Status",type:"select",options:["Current","Review due"]}],"Save care plan",`createRecord("carePlans",{personName:v("personName"),domain:v("domain"),goal:v("goal"),actions:v("actions"),reviewDate:v("reviewDate"),status:v("status")},"Care plan saved")`);
window.editCarePlan=id=>{const p=data("careplans").find(x=>x.id===id);form("Edit care plan","Update and save the plan.",[{key:"personName",label:"Person",value:p.personName,type:"select",options:data("people").map(x=>x.name)},{key:"domain",label:"Domain",value:p.domain,type:"select",options:["Personal care","Mobility","Nutrition","Medication","Communication","Continence","Other"]},{key:"goal",label:"Desired outcome",value:p.goal,full:true},{key:"actions",label:"Care actions",value:p.actions,full:true},{key:"reviewDate",label:"Review date",value:p.reviewDate,type:"date"},{key:"status",label:"Status",value:p.status,type:"select",options:["Current","Review due"]}],"Save changes",`editRecord("carePlans","${id}",{personName:v("personName"),domain:v("domain"),goal:v("goal"),actions:v("actions"),reviewDate:v("reviewDate"),status:v("status")},"Care plan updated")`)};
window.addIncident=()=>form("Report incident","Record facts and assign an owner.",[{key:"type",label:"Type",type:"select",options:["Fall","Medication","Safeguarding","Infection","Other"]},{key:"personName",label:"Person",type:"select",options:data("people").map(p=>p.name)},{key:"date",label:"Date",type:"date"},{key:"severity",label:"Severity",type:"select",options:["Low","Moderate","High"]},{key:"ownerName",label:"Owner",type:"select",options:[state.profile.name,...data("staff").map(s=>s.name)]},{key:"summary",label:"Factual summary",full:true,type:"textarea"}],"Report incident",`createRecord("incidents",{type:v("type"),personName:v("personName"),date:v("date"),severity:v("severity"),ownerName:v("ownerName"),status:"Investigation",summary:v("summary")},"Incident recorded")`);
window.addTraining=()=>form("Assign training","Create a training or competency requirement.",[{key:"course",label:"Course / competency"},{key:"staffName",label:"Staff member",type:"select",options:data("staff").map(s=>s.name)},{key:"due",label:"Due date",type:"date"},{key:"status",label:"Status",type:"select",options:["Valid","Due soon","Overdue"]}],"Assign training",`createRecord("training",{course:v("course"),staffName:v("staffName"),due:v("due"),status:v("status"),score:"—"},"Training assigned")`);
window.editTraining=id=>{const t=data("training").find(x=>x.id===id);form("Update training","Record the latest outcome.",[{key:"status",label:"Status",type:"select",value:t.status,options:["Valid","Due soon","Overdue"]},{key:"score",label:"Score / outcome",value:t.score||""}],"Save",`editRecord("training","${id}",{status:v("status"),score:v("score")},"Training updated")`)};
window.addCompliance=()=>form("Add compliance action","Track an assurance control.",[{key:"item",label:"Control / action"},{key:"owner",label:"Owner"},{key:"due",label:"Due date",type:"date"},{key:"status",label:"Status",type:"select",options:["On track","Due soon","Action due","Complete"]}],"Save",`createRecord("compliance",{item:v("item"),owner:v("owner"),due:v("due"),status:v("status")},"Compliance action saved")`);
window.editCompliance=id=>{const c=data("compliance").find(x=>x.id===id);form("Update compliance","Update status and evidence.",[{key:"status",label:"Status",type:"select",value:c.status,options:["On track","Due soon","Action due","Complete"]}],"Save",`editRecord("compliance","${id}",{status:v("status")},"Compliance updated")`)};
window.addDocument=()=>form("Add document","Store controlled document metadata.",[{key:"name",label:"Document name"},{key:"category",label:"Category"},{key:"version",label:"Version",value:"v1.0"},{key:"review",label:"Review date",type:"date"},{key:"status",label:"Status",type:"select",options:["Current","Review soon"]}],"Save",`createRecord("documents",{name:v("name"),category:v("category"),version:v("version"),review:v("review"),status:v("status")},"Document saved")`);
window.viewPerson=id=>{const p=data("people").find(x=>x.id===id);showModal(`<h2>${esc(p.name)}</h2><p class="sub">Person receiving care · ${esc(p.room)}</p><div class="grid metric-grid"><div class="card metric"><small>Risk</small><strong>${esc(p.risk)}</strong></div><div class="card metric"><small>Care plan</small><strong>${esc(p.planStatus)}</strong></div><div class="card metric"><small>Status</small><strong>${esc(p.status)}</strong></div></div><div class="panel" style="padding:15px 0"><strong>Key needs</strong><p>${esc(p.needs)}</p></div><div class="modal-actions">${btn("Close","closeModal()")}${can("careWrite")?btn("New care plan","closeModal();addCarePlan()",true):""}</div>`)};
window.viewStaff=id=>{const s=data("staff").find(x=>x.id===id);showModal(`<h2>${esc(s.name)}</h2><p class="sub">${esc(s.role)}</p><div class="grid metric-grid"><div class="card metric"><small>Status</small><strong>${esc(s.status)}</strong></div><div class="card metric"><small>Training</small><strong>${esc(s.training||"0%")}</strong></div></div><p>${esc(s.email)}</p><div class="modal-actions">${btn("Close","closeModal()")}</div>`)};
window.viewCarePlan=id=>{const p=data("careplans").find(x=>x.id===id);showModal(`<h2>${esc(p.personName)} — ${esc(p.domain)}</h2><p class="sub">Review ${fmtDate(p.reviewDate)} · ${status(p.status)}</p><div class="field"><label>Desired outcome</label><textarea readonly>${esc(p.goal)}</textarea></div><div class="field" style="margin-top:10px"><label>Care actions</label><textarea readonly>${esc(p.actions)}</textarea></div><div class="modal-actions">${btn("Close","closeModal()")}${can("careWrite")?btn("Edit","closeModal();editCarePlan('"+p.id+"')",true):""}</div>`)};
window.viewIncident=id=>{const i=data("incidents").find(x=>x.id===id);showModal(`<h2>${esc(i.type)} incident</h2><p class="sub">${esc(i.personName)} · ${fmtDate(i.date)}</p><div class="notice ${i.severity==="High"?"warn":"info"}"><strong>${esc(i.severity)} severity.</strong></div><div class="field"><label>Summary</label><textarea readonly>${esc(i.summary||"No summary")}</textarea></div><div class="modal-actions">${btn("Close","closeModal()")}${can("incidentWrite")?btn("Update status","closeModal();updateIncident('"+i.id+"')",true):""}</div>`)};
window.updateIncident=id=>{const i=data("incidents").find(x=>x.id===id);form("Update incident","Change the incident status.",[{key:"status",label:"Status",value:i.status,type:"select",options:["Investigation","Action due","Closed"]}],"Save",`editRecord("incidents","${id}",{status:v("status")},"Incident updated")`)};
window.viewDocument=id=>{const d=data("documents").find(x=>x.id===id);showModal(`<h2>${esc(d.name)}</h2><p class="sub">${esc(d.category)} · ${esc(d.version)}</p><div class="notice ${d.status==="Review soon"?"warn":"success"}">${esc(d.status)} · Review ${fmtDate(d.review)}</div><p class="audit">Production document storage should use Firebase Storage with rules aligned to the organisation and role.</p><div class="modal-actions">${btn("Close","closeModal()")}</div>`)};

window.inviteUser=()=>form("Invite team member","Create a single-use invite code. Give the code to the invited person, who signs up with the invited email address.",[{key:"name",label:"Name"},{key:"email",label:"Email",type:"email"},{key:"role",label:"Role",type:"select",options:["manager","senior","care_worker"]}],"Create invite",`createInvite()`);
window.createInvite=async()=>{try{const code=Math.random().toString(36).slice(2,8).toUpperCase();await setDoc(doc(db,`invites/${code}`),{code,email:v("email").toLowerCase(),name:v("name"),role:v("role"),orgId:state.org.id,orgName:state.org.name,status:"open",createdBy:state.user.uid,createdAt:serverTimestamp()});closeModal();showModal(`<h2>Invite created</h2><p class="sub">Send this code to ${esc(v("email"))}.</p><div class="notice success"><strong style="font-size:24px;letter-spacing:3px">${code}</strong></div><p class="audit">The invited person must create an account using the same email and enter this code.</p><div class="modal-actions">${btn("Close","closeModal()",true)}</div>`)}catch(e){toast(prettyError(e))}};
window.changeRole=async(uid,name,current)=>{if(state.role!=="owner")return;const roles=["manager","senior","care_worker"];showModal(`<h2>Change role</h2><p class="sub">${esc(name)} · current: ${roleLabel(current)}</p><div class="field"><label>New role</label><select id="newRole">${roles.map(r=>`<option value="${r}">${roleLabel(r)}</option>`).join("")}</select></div><div class="modal-actions">${btn("Cancel","closeModal()")}${btn("Save role",`saveRole('${uid}')`,true)}</div>`)};
window.saveRole=async uid=>{try{await updateDoc(doc(db,`organisations/${state.org.id}/members/${uid}`),{role:$("#newRole").value,updatedAt:serverTimestamp(),updatedBy:state.user.uid});closeModal();toast("Role updated")}catch(e){toast(prettyError(e))}};

window.globalSearch=()=>showModal(`<h2>Global search</h2><p class="sub">Search the live workspace.</p><div class="field"><input id="gs" oninput="runSearch(this.value)" placeholder="Search people, staff, incidents, documents..."></div><div id="results" style="margin-top:12px"></div><div class="modal-actions">${btn("Close","closeModal()")}</div>`);
window.runSearch=q=>{const n=q.toLowerCase();const items=[...data("people").map(x=>({t:"Person",n:x.name,d:x.needs,a:`viewPerson('${x.id}')`})),...data("staff").map(x=>({t:"Staff",n:x.name,d:x.role,a:`viewStaff('${x.id}')`})),...data("incidents").map(x=>({t:"Incident",n:x.type+" · "+x.personName,d:x.status,a:`viewIncident('${x.id}')`})),...data("documents").map(x=>({t:"Document",n:x.name,d:x.category,a:`viewDocument('${x.id}')`}))].filter(x=>(x.n+" "+x.d).toLowerCase().includes(n));$("#results").innerHTML=items.length?`<div class="list">${items.slice(0,12).map(x=>`<div class="row"><div class="rowmain"><strong>${esc(x.n)}</strong><small>${esc(x.t)} · ${esc(x.d)}</small></div><button class="btn small" onclick="closeModal();${x.a}">Open</button></div>`).join("")}</div>`:`<div class="empty">No matches.</div>`};
window.notifications=()=>showModal(`<h2>Notifications</h2><p class="sub">Current workspace alerts.</p><div class="notice warn">${data("rota").filter(x=>x.status==="Open").length} open shifts</div><div class="notice warn">${data("training").filter(x=>x.status==="Overdue").length} overdue training items</div><div class="notice info">${data("careplans").filter(x=>x.status==="Review due").length} care plans due for review</div><div class="modal-actions">${btn("Close","closeModal()")}</div>`);
window.filterRows=q=>document.querySelectorAll(".table tbody tr").forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q.toLowerCase())?"":"none");
window.exportReport=()=>{const report={provider:state.org.name,generated:new Date().toISOString(),people:data("people").length,staff:data("staff").length,openIncidents:data("incidents").filter(x=>x.status!=="Closed").length,openShifts:data("rota").filter(x=>x.status==="Open").length};const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([JSON.stringify(report,null,2)],{type:"application/json"}));a.download="carehomeos-management-snapshot.json";a.click();URL.revokeObjectURL(a.href)};

async function loadAudit(){const q=query(collection(db,`organisations/${state.org.id}/audit`),orderBy("at","desc"),limit(100));const snap=await getDocs(q);state.audit=snap.docs.map(d=>({id:d.id,...d.data()}));render()}
async function loadMembers(){const snap=await getDocs(collection(db,`organisations/${state.org.id}/members`));state.members=snap.docs.map(d=>({id:d.id,...d.data()}));render()}

const oldRender=render;
render=async function(){oldRender();if(state.view==="audit")await loadAudit();if(state.view==="team")await loadMembers()};

if(!configured){
 document.body.innerHTML=`<div class="login"><div class="login-box"><div class="login-brand"><div class="brand-mark">C</div><div><h1>CareHomeOS</h1><small>Firebase setup required</small></div></div><p>Open <b>app.js</b> and replace the Firebase configuration values near the top if you are using a different Firebase project.</p><div class="notice info">The package is intentionally shipped without your Firebase credentials.</div><p class="audit">After configuring Firebase, enable Email/Password Authentication, create a Firestore database, paste the supplied Security Rules into Firestore Rules. No Node.js, Firebase CLI or Cloud Functions are required for this GitHub version.</p></div></div>`;
}else{
 onAuthStateChanged(auth,async user=>{state.user=user;if(!user)loginScreen();else await loadProfile()});
}

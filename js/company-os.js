/* company-os.js — Phase 20: Golapi Company OS */
const CompanyOS = {
  staff:null, permissions:null, notices:[], notifications:[], activities:[], apps:[], recent:[],
  legacyRoleAliases:{hr:['people_officer'],procurement:['procurement_officer'],customer_care_manager:['support_manager']},
  appCatalog:[
    {id:'admin-dash',icon:'⌘',name:'Executive Command Center',description:'কোম্পানি নেতৃত্ব, সিদ্ধান্ত ও executive brief',roles:['admin','chief_executive_officer']},
    {id:'company-os',icon:'◈',name:'Company OS Home',description:'কেন্দ্রীয় অফিস ডেস্ক ও command center',roles:['*']},
    {id:'attendance-dash',icon:'◷',name:'Attendance & Time Office',description:'Attendance, leave, overtime ও workforce time',roles:['admin','hr','attendance_officer','people_officer']},
    {id:'payroll-dash',icon:'৳',name:'Payroll Office',description:'Salary, allowance, deduction ও payslip',roles:['admin','finance','payroll_officer','hr']},
    {id:'documents-dash',icon:'▤',name:'Document Management Office',description:'Employee documents, letters ও records',roles:['admin','hr','document_officer','people_officer']},
    {id:'inventory-dash',icon:'▦',name:'Inventory Control Room',description:'Stock, low inventory ও restock control',roles:['admin','inventory_manager','zone_manager','warehouse_manager']},
    {id:'procurement-dash',icon:'◫',name:'Procurement & Vendor Office',description:'RFQ, PO, suppliers, contracts ও vendor due',roles:['admin','procurement','procurement_officer','chief_procurement_officer','vendor_relationship_officer']},
    {id:'warehouse-dash',icon:'▣',name:'Warehouse Control Room',description:'Receiving, picking, packing ও cycle count',roles:['admin','warehouse_manager','inventory_manager']},
    {id:'support-dash',icon:'☏',name:'Customer Care Center',description:'Ticket, SLA, refund ও escalation',roles:['admin','support','customer_care_manager','support_manager','zone_manager']},
    {id:'finance-dash',icon:'₿',name:'Finance Office',description:'Revenue, COD, refunds ও finance ledger',roles:['admin','finance','zone_manager']},
    {id:'analytics-dash',icon:'◩',name:'Analytics & Reports Center',description:'Business intelligence ও performance reports',roles:['admin','analytics_manager','finance','zone_manager']},
    {id:'branch-dash',icon:'⌂',name:'Branch Management Office',description:'Branch manager, capacity ও performance',roles:['admin','branch_manager','zone_manager']},
    {id:'crm-dash',icon:'♡',name:'Customer Relationship Office',description:'Customer 360, VIP, loyalty ও campaigns',roles:['admin','crm_manager','support','zone_manager']},
    {id:'company-settings',icon:'⚙',name:'Company Settings & Access',description:'Company policy, permission ও governance',roles:['admin','governance_officer','security_officer','legal_compliance_officer']},
    {id:'ai-control',icon:'✦',name:'AI Control Center',description:'Forecast, recommendations ও automation rules',roles:['admin','ai_operations_manager','analytics_manager','zone_manager']},
    {id:'hr-erp',icon:'👥',name:'Human Resources ERP',description:'Recruitment, onboarding, performance, training ও employee lifecycle',roles:['admin','hr','people_officer','talent_development_manager']},
    {id:'finance-erp',icon:'📒',name:'Finance ERP',description:'Accounts, journals, budgets, reconciliation ও statements',roles:['admin','finance','financial_controller']},
    {id:'warehouse-erp',icon:'🏬',name:'Advanced Warehouse ERP',description:'Locations, bin inventory, transfers, damage ও cycle counts',roles:['admin','warehouse_manager','inventory_manager','warehouse_systems_manager','logistics_manager','fleet_operations_manager']},
    {id:'marketing-erp',icon:'📣',name:'Marketing Automation Center',description:'Campaigns, segments, coupons, loyalty, referral ও automation',roles:['admin','marketing','crm_manager','growth_automation_manager']},
    {id:'workflow-erp',icon:'🔄',name:'Workflow Automation Engine',description:'Workflow builder, approvals, tasks, SLA ও execution logs',roles:['admin','workflow_automation_manager','governance_officer']},
    {id:'bi-erp',icon:'📊',name:'Business Intelligence Center',description:'KPI, forecast, funnel, profitability ও branch scorecard',roles:['admin','analytics_manager','business_intelligence_manager','financial_controller']},
    {id:'asset-erp',icon:'💼',name:'Company Asset Management',description:'Asset register, custody, maintenance, depreciation, audit ও disposal',roles:['admin','asset_officer','asset_manager','asset_lifecycle_manager','governance_officer','financial_controller']},
    {id:'crm-erp',icon:'🎧',name:'Customer Service CRM',description:'Tickets, customer 360, inbox, refunds, knowledge base ও service analytics',roles:['admin','support','support_manager','crm_manager','customer_experience_manager']},
    {id:'procurement-erp',icon:'🧾',name:'Procurement & Vendor ERP',description:'Requests, vendors, quotations, purchase orders, receipts ও invoice matching',roles:['admin','procurement','procurement_vendor_manager','financial_controller','warehouse_manager']},
    {id:'facilities-erp',icon:'🏢',name:'Facilities & Branch Operations ERP',description:'Branches, facility requests, rent, utilities, inspections ও daily checklists',roles:['admin','branch_manager','facilities_operations_manager','governance_officer','financial_controller']},
    {id:'zone-manager',icon:'◎',name:'Zone Operations Center',description:'Zone order, delivery ও branch operations',roles:['admin','zone_manager']},
    {id:'driver',icon:'♢',name:'Rider Workspace',description:'Assigned orders ও delivery activity',roles:['driver']}
  ],
  esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));},
  uid(){return FB?.auth?.currentUser?.uid||OwnerAuth?.currentUid||'';},
  bn(v){return typeof bn==='function'?bn(v):String(v);},
  date(v){if(!v)return '—';const d=v.toDate?v.toDate():new Date(v);return isNaN(d)?'—':d.toLocaleString('bn-BD',{dateStyle:'medium',timeStyle:'short'});},
  async render(){
    const gate=document.getElementById('companyOsAccessGate'),desktop=document.getElementById('companyOsDesktop');
    if(!window.FB){if(gate)gate.querySelector('p').textContent='Firebase connection পাওয়া যায়নি।';return;}
    const user=FB.auth.currentUser;
    if(!user){if(gate){gate.querySelector('h1').textContent='Staff Login প্রয়োজন';gate.querySelector('p').textContent='আপনার অফিস account দিয়ে প্রথমে কোনো staff workspace-এ login করুন।';}return;}
    try{
      const [staffSnap,permissionSnap]=await Promise.all([
        FB.getDoc(FB.doc(FB.db,'staff',user.uid)),
        FB.getDoc(FB.doc(FB.db,'company_settings','permissions')).catch(()=>null)
      ]);
      if(!staffSnap.exists()){gate.querySelector('h1').textContent='Staff Profile পাওয়া যায়নি';gate.querySelector('p').textContent='People Operations Office থেকে employee profile ও workspace assign করুন।';return;}
      this.staff={uid:user.uid,...staffSnap.data()};this.permissions=permissionSnap?.exists()?permissionSnap.data():null;
      this.apps=this.allowedApps();this.recent=this.loadRecent();
      await Promise.all([this.loadNotices(),this.loadNotifications(),this.loadActivities()]);
      gate.hidden=true;desktop.hidden=false;this.renderIdentity();this.renderWorkspaceGrid();this.renderAllApps();this.renderRecent();this.renderNotices();this.renderNotifications();this.renderActivities();this.renderBrief();this.renderPinned();this.renderStartApps();this.updateClock();clearInterval(this.clockTimer);this.clockTimer=setInterval(()=>this.updateClock(),1000);this.bindKeys();this.logActivity('company_os_opened','Company OS opened');
    }catch(e){gate.querySelector('h1').textContent='Company OS চালু হয়নি';gate.querySelector('p').textContent=e.message;}
  },
  permissionList(role){
    const matrix=this.permissions?.matrix||this.permissions?.rolePermissions||this.permissions||{};
    if(Array.isArray(matrix?.[role]))return matrix[role];
    for(const alias of this.legacyRoleAliases[role]||[]){if(Array.isArray(matrix?.[alias]))return matrix[alias];}
    return null;
  },
  permissionAllows(list,appId){
    return Array.isArray(list)&&(list.includes('*')||list.includes(appId));
  },
  hasWorkspacePermissions(list){
    if(!Array.isArray(list))return false;
    const ids=new Set(this.appCatalog.map(app=>app.id));
    return list.some(key=>key==='*'||ids.has(key));
  },
  usesWorkspacePermissionSchema(){
    if(Number(this.permissions?.schemaVersion)>=2)return true;
    const matrix=this.permissions?.matrix||this.permissions?.rolePermissions||this.permissions||{};
    return Object.values(matrix).some(list=>this.hasWorkspacePermissions(list));
  },
  allowedApps(){
    const role=this.staff?.role||'staff',custom=this.staff?.allowedWorkspaces||this.staff?.permissions?.workspaces||[],permissionList=this.permissionList(role),usesMatrix=this.usesWorkspacePermissionSchema();
    return this.appCatalog.filter(a=>{
      if(a.roles.includes('*')||role==='admin')return true;
      if(custom.includes(a.id)||custom.includes(a.name))return true;
      if(usesMatrix&&Array.isArray(permissionList))return this.permissionAllows(permissionList,a.id);
      return a.roles.includes(role);
    });
  },
  renderIdentity(){
    const photo=this.staff.photoURL||this.staff.photo||this.staff.avatar||'icons/head_logo.webp',name=this.staff.name||'Staff',designation=this.staff.designation||this.staff.role||'Employee',id=this.staff.employeeId||`GS-${this.staff.uid.slice(0,6).toUpperCase()}`,branch=this.staff.branchName||this.staff.branch||'Head Office';
    document.getElementById('companyOsTopPhoto').src=photo;document.getElementById('companyOsTopName').textContent=name;document.getElementById('companyOsWelcomeName').textContent=name;document.getElementById('companyOsWelcomeMeta').textContent=`${designation} · ${branch} · ${id}`;
    document.getElementById('companyOsIdentity').innerHTML=`<img src="${this.esc(photo)}" alt=""><strong>${this.esc(name)}</strong><span>${this.esc(designation)}</span><small>${this.esc(id)} · ${this.esc(branch)}</small>`;
    document.getElementById('companyOsProfileCard').innerHTML=`<img src="${this.esc(photo)}" alt=""><strong>${this.esc(name)}</strong><span>${this.esc(designation)}</span><small>${this.esc(id)}<br>${this.esc(branch)}</small>`;
  },
  appCard(a){return `<button class="company-os-workspace-card" onclick="CompanyOS.openApp('${a.id}')"><span class="company-os-app-icon">${a.icon}</span><div><strong>${this.esc(a.name)}</strong><small>${this.esc(a.description)}</small></div><i>Open →</i></button>`;},
  renderWorkspaceGrid(){document.getElementById('companyOsWorkspaceGrid').innerHTML=this.apps.filter(a=>a.id!=='company-os').slice(0,8).map(a=>this.appCard(a)).join('')||'<p>কোনো Workspace assign করা হয়নি।</p>';},
  renderAllApps(){
    const grouped={Executive:[],Operations:[],People:[],Finance:[],Growth:[],Governance:[]};
    this.apps.forEach(a=>{
      let g='Operations';if(['admin-dash','analytics-dash','bi-erp','company-os'].includes(a.id))g='Executive';else if(['attendance-dash','payroll-dash','documents-dash','hr-erp'].includes(a.id))g='People';else if(['finance-dash','finance-erp','procurement-dash','procurement-erp'].includes(a.id))g='Finance';else if(['crm-dash','crm-erp','support-dash','marketing-erp'].includes(a.id))g='Growth';else if(['company-settings','asset-erp','workflow-erp'].includes(a.id))g='Governance';grouped[g].push(a);
    });
    document.getElementById('companyOsAllApps').innerHTML=Object.entries(grouped).filter(([,v])=>v.length).map(([g,v])=>`<section><h3>${g}</h3><div>${v.map(a=>this.appCard(a)).join('')}</div></section>`).join('');
  },
  openApp(id){if(id==='company-os')return;this.pushRecent(id);this.logActivity('workspace_opened',`Opened ${this.appCatalog.find(a=>a.id===id)?.name||id}`);Router.go(id);},
  loadRecent(){try{return JSON.parse(localStorage.getItem(`golapi_os_recent_${this.uid()}`)||'[]');}catch{return[];}},
  pushRecent(id){this.recent=[id,...this.recent.filter(x=>x!==id)].slice(0,8);localStorage.setItem(`golapi_os_recent_${this.uid()}`,JSON.stringify(this.recent));},
  clearRecent(){this.recent=[];localStorage.removeItem(`golapi_os_recent_${this.uid()}`);this.renderRecent();},
  renderRecent(){const host=document.getElementById('companyOsRecentList');if(!host)return;host.innerHTML=this.recent.map(id=>{const a=this.appCatalog.find(x=>x.id===id);return a?`<button onclick="CompanyOS.openApp('${a.id}')"><span>${a.icon}</span><div><strong>${this.esc(a.name)}</strong><small>${this.esc(a.description)}</small></div></button>`:'';}).join('')||'<p>এখনও কোনো recent workspace নেই।</p>';},
  async loadNotices(){try{const s=await FB.getDocs(FB.collection(FB.db,'company_notices'));this.notices=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,20);}catch{this.notices=[];}},
  renderNotices(){const host=document.getElementById('companyOsNoticeList');if(!host)return;const role=this.staff.role;const list=this.notices.filter(n=>n.audience==='all'||n.audience===role||role==='admin'||(n.audience==='management'&&/manager|admin|finance|analytics/.test(role)));host.innerHTML=list.slice(0,8).map(n=>`<article class="${this.esc(n.priority||'normal')}"><div><strong>${this.esc(n.title||'Company Notice')}</strong><span>${this.esc(n.body||'')}</span></div><small>${this.date(n.createdAt)}</small></article>`).join('')||'<p>কোনো company notice নেই।</p>';},
  openNoticeForm(){if(!['admin','hr','people_officer','governance_officer'].includes(this.staff.role)){toast('Notice প্রকাশের অনুমতি নেই','error');return;}const m=document.getElementById('companyOsNoticeModal');m.classList.add('open');m.setAttribute('aria-hidden','false');},
  closeNoticeForm(){const m=document.getElementById('companyOsNoticeModal');m.classList.remove('open');m.setAttribute('aria-hidden','true');},
  async saveNotice(){const title=document.getElementById('companyOsNoticeTitle').value.trim(),body=document.getElementById('companyOsNoticeBody').value.trim();if(!title||!body){toast('শিরোনাম ও notice লিখুন','error');return;}try{await FB.setDoc(FB.doc(FB.db,'company_notices',`notice_${Date.now()}`),{title,body,audience:document.getElementById('companyOsNoticeAudience').value,priority:document.getElementById('companyOsNoticePriority').value,createdBy:this.uid(),createdByName:this.staff.name||'',createdAt:FB.serverTimestamp(),status:'published'});this.closeNoticeForm();await this.loadNotices();this.renderNotices();toast('Company notice প্রকাশ হয়েছে','success');}catch(e){toast(e.message,'error');}},
  async loadNotifications(){
    try{const s=await FB.getDocs(FB.collection(FB.db,'company_notifications'));this.notifications=s.docs.map(d=>({id:d.id,...d.data()})).filter(n=>!n.userId||n.userId===this.uid()||n.role===this.staff.role||n.audience==='all').sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,50);}catch{this.notifications=[];}
    this.createLocalRiskNotifications();
  },
  createLocalRiskNotifications(){
    const local=[];if(this.staff.status&&['suspended','inactive'].includes(this.staff.status))local.push({id:'profile_status',title:'Employment status attention',message:`আপনার staff status: ${this.staff.status}`,priority:'urgent',read:false,local:true});
    if(!this.staff.photoURL&&!this.staff.photo)local.push({id:'missing_photo',title:'Company profile অসম্পূর্ণ',message:'Official staff photo upload করুন।',priority:'normal',read:false,local:true});
    if(!this.staff.employeeId)local.push({id:'missing_id',title:'Employee ID প্রয়োজন',message:'People Operations থেকে Employee ID assign করুন।',priority:'important',read:false,local:true});
    this.notifications=[...local,...this.notifications];
  },
  unread(){const read=this.readIds();return this.notifications.filter(n=>!read.includes(n.id)&&n.read!==true).length;},
  readIds(){try{return JSON.parse(localStorage.getItem(`golapi_os_read_${this.uid()}`)||'[]');}catch{return[];}},
  renderNotifications(){
    const read=this.readIds(),rows=this.notifications.map(n=>`<article class="${read.includes(n.id)||n.read?'read':''} ${this.esc(n.priority||'normal')}"><span>${n.priority==='urgent'?'!':'●'}</span><div><strong>${this.esc(n.title||'Notification')}</strong><p>${this.esc(n.message||n.body||'')}</p><small>${n.local?'System':this.date(n.createdAt)}</small></div></article>`).join('')||'<p>কোনো notification নেই।</p>';
    ['companyOsNotificationList','companyOsDrawerNotifications'].forEach(id=>{const e=document.getElementById(id);if(e)e.innerHTML=rows;});document.getElementById('companyOsNotificationCount').textContent=this.unread();
  },
  markAllRead(){localStorage.setItem(`golapi_os_read_${this.uid()}`,JSON.stringify(this.notifications.map(n=>n.id)));this.renderNotifications();},
  async loadActivities(){try{const s=await FB.getDocs(FB.collection(FB.db,'company_os_activity'));this.activities=s.docs.map(d=>({id:d.id,...d.data()})).filter(a=>a.userId===this.uid()).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0)).slice(0,50);}catch{this.activities=[];}},
  renderActivities(){const host=document.getElementById('companyOsActivityList');if(!host)return;host.innerHTML=this.activities.map(a=>`<article><span>${a.type==='workspace_opened'?'↗':'●'}</span><div><strong>${this.esc(a.details||a.type)}</strong><small>${this.date(a.createdAt)}</small></div></article>`).join('')||'<p>কোনো activity নেই।</p>';},
  async logActivity(type,details){try{await FB.setDoc(FB.doc(FB.db,'company_os_activity',`activity_${Date.now()}_${Math.random().toString(36).slice(2,6)}`),{userId:this.uid(),employeeId:this.staff?.employeeId||'',userName:this.staff?.name||'',role:this.staff?.role||'',type,details,createdAt:FB.serverTimestamp()});}catch{}},
  renderBrief(){
    const host=document.getElementById('companyOsExecutiveBrief');if(!host)return;const role=this.staff.role;
    const text=role==='admin'?'আজকের Company OS থেকে Executive, Finance, Inventory, Procurement ও People Operations office দ্রুত খুলুন।':role==='driver'?'Assigned delivery ও rider activity দেখতে Rider Workspace খুলুন।':`${this.staff.workspaceName||this.staff.workspace||'আপনার প্রধান Workspace'} আপনার পদের জন্য primary office হিসেবে নির্ধারিত।`;
    host.innerHTML=`<div><span class="office-kicker">TODAY'S DESK</span><h2>${this.esc(this.staff.workspaceName||this.staff.workspace||'আপনার ডিজিটাল অফিস')}</h2><p>${this.esc(text)}</p></div><button onclick="CompanyOS.openPrimaryWorkspace()">Primary Workspace খুলুন</button>`;
  },
  openPrimaryWorkspace(){
    const target=this.apps.find(a=>a.name===this.staff.workspaceName||a.name===this.staff.workspace)||this.apps.find(a=>a.id!=='company-os');if(target)this.openApp(target.id);else toast('Primary workspace assign করা হয়নি','error');
  },
  renderPinned(){const pins=this.apps.filter(a=>a.id!=='company-os').slice(0,5);document.getElementById('companyOsPinnedApps').innerHTML=pins.map(a=>`<button title="${this.esc(a.name)}" onclick="CompanyOS.openApp('${a.id}')">${a.icon}</button>`).join('');},
  renderStartApps(){const q=(document.getElementById('companyOsStartSearch')?.value||'').toLowerCase(),list=this.apps.filter(a=>a.id!=='company-os'&&(!q||a.name.toLowerCase().includes(q)||a.description.toLowerCase().includes(q)));document.getElementById('companyOsStartApps').innerHTML=list.map(a=>`<button onclick="CompanyOS.openApp('${a.id}')"><span>${a.icon}</span><div><strong>${this.esc(a.name)}</strong><small>${this.esc(a.description)}</small></div></button>`).join('');},
  toggleStart(force){const m=document.getElementById('companyOsStartMenu');m.hidden=typeof force==='boolean'?!force:!m.hidden;if(!m.hidden)setTimeout(()=>document.getElementById('companyOsStartSearch')?.focus(),20);},
  toggleNotifications(force){const d=document.getElementById('companyOsNotificationDrawer');d.hidden=typeof force==='boolean'?!force:!d.hidden;if(!d.hidden)this.markAllRead();},
  toggleProfile(force){const m=document.getElementById('companyOsProfileMenu');m.hidden=typeof force==='boolean'?!force:!m.hidden;},
  showSection(name,btn){
    ['home','workspaces','activity','notifications','help'].forEach(n=>{const e=document.getElementById(`companyOs${n.charAt(0).toUpperCase()+n.slice(1)}Section`);if(e)e.hidden=n!==name;});
    document.querySelectorAll('.company-os-sidebar nav button').forEach(b=>b.classList.remove('active'));(btn||document.querySelector(`.company-os-sidebar nav button[data-section="${name}"]`))?.classList.add('active');
  },
  openCommand(){document.getElementById('companyOsCommand').hidden=false;document.getElementById('companyOsCommandInput').value='';this.renderCommandResults();setTimeout(()=>document.getElementById('companyOsCommandInput').focus(),20);},
  closeCommand(){document.getElementById('companyOsCommand').hidden=true;},
  commandItems(){return [...this.apps.filter(a=>a.id!=='company-os').map(a=>({...a,type:'workspace'})),{id:'notifications',icon:'🔔',name:'Notifications খুলুন',description:'Notification Center',type:'action'},{id:'store',icon:'↗',name:'Customer Store খুলুন',description:'Public e-commerce storefront',type:'action'},{id:'signout',icon:'⇥',name:'Sign Out',description:'Company account থেকে বের হন',type:'action'}];},
  renderCommandResults(){
    const q=(document.getElementById('companyOsCommandInput')?.value||'').toLowerCase(),items=this.commandItems().filter(a=>!q||a.name.toLowerCase().includes(q)||a.description.toLowerCase().includes(q));
    document.getElementById('companyOsCommandResults').innerHTML=items.slice(0,12).map((a,i)=>`<button class="${i===0?'selected':''}" onclick="CompanyOS.runCommand('${a.id}','${a.type}')"><span>${a.icon}</span><div><strong>${this.esc(a.name)}</strong><small>${this.esc(a.description)}</small></div><kbd>↵</kbd></button>`).join('');
  },
  runCommand(id,type){this.closeCommand();if(type==='workspace')this.openApp(id);else if(id==='notifications')this.showSection('notifications');else if(id==='store')Router.go('home');else if(id==='signout')this.signOut();},
  bindKeys(){if(this.keysBound)return;this.keysBound=true;document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();this.openCommand();}else if(e.key==='Escape'){this.closeCommand();this.toggleStart(false);this.toggleNotifications(false);this.toggleProfile(false);}else if(e.key==='Enter'&&!document.getElementById('companyOsCommand').hidden){document.querySelector('#companyOsCommandResults button')?.click();}});},
  updateClock(){const d=new Date(),time=d.toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'}),date=d.toLocaleDateString('bn-BD',{weekday:'long',day:'numeric',month:'long',year:'numeric'});['companyOsClock','companyOsTaskClock'].forEach(id=>{const e=document.getElementById(id);if(e)e.textContent=time;});document.getElementById('companyOsDate').textContent=date;const h=d.getHours();document.getElementById('companyOsGreeting').textContent=h<12?'GOOD MORNING':h<17?'GOOD AFTERNOON':'GOOD EVENING';document.getElementById('companyOsConnection').textContent=navigator.onLine?'● Online':'● Offline';},
  async signOut(){try{await FB.signOut(FB.auth);}catch{}location.reload();}
};
window.CompanyOS=CompanyOS;

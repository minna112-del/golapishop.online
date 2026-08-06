/* company-settings.js — Phase 12: Company Settings & Access Control */
const CompanySettings = {
  uid:null, staff:null, branches:[], config:{}, permissions:{},
  modules:[
    ['admin-dash','Executive Office'],['attendance-dash','Attendance'],['payroll-dash','Payroll'],
    ['documents-dash','Documents'],['inventory-dash','Inventory'],['procurement-dash','Procurement'],
    ['warehouse-dash','Warehouse'],['support-dash','Customer Care'],
    ['finance-dash','Finance'],['analytics-dash','Analytics'],
    ['branch-dash','Branches'],['crm-dash','CRM'],['company-settings','Settings'],
    ['ai-control','AI Control'],['finance-erp','Finance ERP'],['zone-manager','Zone Office'],['driver','Rider Office']
  ],
  roles:{
    admin:'CEO / Executive',zone_manager:'Zone Operations Manager',inventory_manager:'Inventory Manager',
    warehouse_manager:'Warehouse Manager',attendance_officer:'Attendance & Time Officer',
    payroll_officer:'Payroll Officer',procurement:'Procurement Officer',chief_procurement_officer:'Chief Procurement Officer',
    vendor_relationship_officer:'Vendor Relationship Officer',branch_manager:'Branch Manager',
    crm_manager:'CRM Manager',company_systems_officer:'Company Systems Officer',ai_operations_manager:'AI Operations Manager',
    financial_controller:'Financial Controller',document_officer:'Document & Records Officer',governance_officer:'Governance & Compliance Officer',
    analytics_manager:'BI & Analytics Manager',finance:'Finance Officer',support:'Customer Care Executive',
    customer_care_manager:'Customer Care Manager',driver:'Delivery Rider',hr:'People & Culture Officer',
    marketing:'Growth & Marketing',designer:'Creative Designer',developer:'Software Engineer'
  },
  legacyModules:{
    executive:['admin-dash'],people:['attendance-dash','payroll-dash','documents-dash'],
    finance:['finance-dash','finance-erp'],inventory:['inventory-dash'],procurement:['procurement-dash'],
    warehouse:['warehouse-dash'],delivery:['zone-manager','driver'],support:['support-dash'],
    analytics:['analytics-dash'],settings:['company-settings']
  },
  legacyRoleAliases:{hr:['people_officer'],procurement:['procurement_officer'],customer_care_manager:['support_manager']},
  defaultMatrix(){
    const all=this.modules.map(([key])=>key);
    return {
      admin:all,zone_manager:['zone-manager','inventory-dash','procurement-dash','warehouse-dash','support-dash','finance-dash','analytics-dash','branch-dash','crm-dash','ai-control'],
      inventory_manager:['inventory-dash','warehouse-dash'],warehouse_manager:['warehouse-dash','inventory-dash'],
      attendance_officer:['attendance-dash'],payroll_officer:['payroll-dash'],procurement:['procurement-dash','inventory-dash'],
      chief_procurement_officer:['procurement-dash','inventory-dash','finance-dash'],vendor_relationship_officer:['procurement-dash'],
      branch_manager:['branch-dash','inventory-dash'],crm_manager:['crm-dash','support-dash'],
      company_systems_officer:['analytics-dash','ai-control'],ai_operations_manager:['ai-control','analytics-dash'],
      financial_controller:['finance-erp','finance-dash'],
      document_officer:['documents-dash'],governance_officer:['company-settings'],analytics_manager:['analytics-dash','ai-control'],
      finance:['finance-dash','finance-erp','payroll-dash','analytics-dash'],support:['support-dash','crm-dash'],
      customer_care_manager:['support-dash','crm-dash','analytics-dash'],driver:['driver'],hr:['attendance-dash','payroll-dash','documents-dash'],
      marketing:['crm-dash','analytics-dash'],designer:[],developer:[]
    };
  },
  normalizePermissions(saved={}){
    const defaults=this.defaultMatrix(),known=new Set(this.modules.map(([key])=>key)),out={};
    Object.entries(saved||{}).forEach(([role,list])=>{if(Array.isArray(list))out[role]=[...list];});
    Object.keys(this.roles).forEach(role=>{
      const aliases=this.legacyRoleAliases[role]||[];
      const source=Array.isArray(out[role])?out[role]:aliases.map(alias=>out[alias]).find(Array.isArray);
      if(!source){out[role]=[...(defaults[role]||[])];return;}
      const direct=source.filter(key=>known.has(key));
      const expanded=source.flatMap(key=>this.legacyModules[key]||[]).filter(key=>(defaults[role]||[]).includes(key));
      out[role]=[...new Set([...direct,...expanded])];
    });
    return out;
  },
  esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));},
  ts(v){if(!v)return 0;if(typeof v.toMillis==='function')return v.toMillis();if(v.seconds)return v.seconds*1000;return new Date(v).getTime()||0;},
  async authorize(){
    if(!window.FB)throw new Error('Firebase সংযোগ পাওয়া যায়নি');
    const u=FB.auth.currentUser;if(!u)throw new Error('অনুমোদিত Executive account দিয়ে লগইন করুন');
    const s=await FB.getDoc(FB.doc(FB.db,'staff',u.uid));if(!s.exists())throw new Error('স্টাফ প্রোফাইল পাওয়া যায়নি');
    const d=s.data();if(d.role!=='admin')throw new Error('শুধু CEO / Executive এই নিয়ন্ত্রণকক্ষ ব্যবহার করতে পারবেন');
    if(d.active===false||['inactive','suspended','resigned'].includes(d.status))throw new Error('এই অফিস ডেস্ক বর্তমানে সক্রিয় নয়');
    this.uid=u.uid;this.staff=d;
  },
  async render(){
    const m=document.getElementById('companySettingsAuthMessage');
    try{await this.authorize();if(m){m.textContent='';m.className='form-msg';}
      if(typeof EmployeeWorkspace!=='undefined')await EmployeeWorkspace.mountCurrent('companySettingsEmployeeWorkspace');
      await this.refresh();
    }catch(e){if(m){m.textContent=e.message;m.className='form-msg err';}}
  },
  async refresh(){
    try{
      const [cfg,perm,branchSnap]=await Promise.all([
        FB.getDoc(FB.doc(FB.db,'company_settings','general')),
        FB.getDoc(FB.doc(FB.db,'company_settings','permissions')),
        FB.getDocs(FB.collection(FB.db,'branches')).catch(()=>null)
      ]);
      this.config=cfg.exists()?cfg.data():{};
      this.permissions=this.normalizePermissions(perm.exists()?(perm.data().matrix||perm.data().rolePermissions||{}):{});
      this.branches=[];if(branchSnap)branchSnap.forEach(d=>this.branches.push({id:d.id,...d.data()}));
      this.fillForms();this.renderPermissions();this.renderSummary();await this.loadAudit();
      const u=document.getElementById('companySettingsUpdated');if(u)u.textContent='আপডেট: '+new Date().toLocaleTimeString('bn-BD',{hour:'2-digit',minute:'2-digit'});
    }catch(e){toast('Company Settings লোড হয়নি: '+e.message,'error');}
  },
  fillForms(){
    const c=this.config.company||{},o=this.config.operations||{};
    const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v??''};
    set('csCompanyName',c.name||'Golapi Shop Online');set('csShortName',c.shortName||'Golapi Shop');
    set('csEmail',c.email);set('csPhone',c.phone);set('csWebsite',c.website||'https://golapishop.online');
    set('csHeadOffice',c.headOffice);set('csAddress',c.address);set('csEmployeePrefix',c.employeePrefix||'GS');set('csCurrency',c.currency||'BDT');
    const b=document.getElementById('csDefaultBranch');if(b){b.innerHTML='<option value="">নির্বাচন করুন</option>'+this.branches.map(x=>`<option value="${this.esc(x.id)}">${this.esc(x.name||x.branchName||x.id)}</option>`).join('');b.value=o.defaultBranch||'';}
    set('csLanguage',o.language||'bn');set('csTimezone',o.timezone||'Asia/Dhaka');set('csOrderPrefix',o.orderPrefix||'GSO');
    set('csLowStock',o.lowStockThreshold??5);set('csProbationDays',o.probationDays??90);set('csSupportSla',o.supportSlaHours??4);set('csDeliverySla',o.deliverySlaMinutes??120);
    const id=document.getElementById('csRequireId'),ph=document.getElementById('csRequirePhoto');if(id)id.checked=o.requireEmployeeId!==false;if(ph)ph.checked=!!o.requireStaffPhoto;
  },
  values(ids){const out={};ids.forEach(([key,id,type])=>{const e=document.getElementById(id);out[key]=type==='check'?!!e?.checked:(type==='num'?Number(e?.value||0):(e?.value||'').trim());});return out;},
  async saveCompany(ev){ev?.preventDefault();const company=this.values([
    ['name','csCompanyName'],['shortName','csShortName'],['email','csEmail'],['phone','csPhone'],['website','csWebsite'],['headOffice','csHeadOffice'],['address','csAddress'],['employeePrefix','csEmployeePrefix'],['currency','csCurrency']
  ]);await this.saveGeneral({company},'company_identity');},
  async saveOperations(ev){ev?.preventDefault();const operations=this.values([
    ['defaultBranch','csDefaultBranch'],['language','csLanguage'],['timezone','csTimezone'],['orderPrefix','csOrderPrefix'],['lowStockThreshold','csLowStock','num'],['probationDays','csProbationDays','num'],['supportSlaHours','csSupportSla','num'],['deliverySlaMinutes','csDeliverySla','num'],['requireEmployeeId','csRequireId','check'],['requireStaffPhoto','csRequirePhoto','check']
  ]);await this.saveGeneral({operations},'operations_defaults');},
  async saveGeneral(patch,action){
    try{const ref=FB.doc(FB.db,'company_settings','general');await FB.setDoc(ref,{...patch,updatedAt:FB.serverTimestamp(),updatedByUid:this.uid,updatedByName:this.staff.name||this.staff.fullName||'Executive'},{merge:true});await this.audit(action,patch);toast('সেটিংস সংরক্ষণ হয়েছে','success');await this.refresh();}catch(e){toast('সংরক্ষণ হয়নি: '+e.message,'error');}
  },
  renderPermissions(){
    const h=document.getElementById('permissionHead'),b=document.getElementById('permissionBody');if(!h||!b)return;
    h.innerHTML='<tr><th>পদ / Role</th>'+this.modules.map(m=>`<th title="${this.esc(m[1])}">${this.esc(m[1])}</th>`).join('')+'</tr>';
    b.innerHTML=Object.entries(this.roles).map(([role,label])=>`<tr><td><strong>${this.esc(label)}</strong><small>${this.esc(role)}</small></td>${this.modules.map(([key])=>`<td><label class="permission-switch"><input type="checkbox" data-role="${role}" data-module="${key}" ${(this.permissions[role]||[]).includes(key)?'checked':''} ${role==='admin'&&key==='company-settings'?'disabled':''}><span></span></label></td>`).join('')}</tr>`).join('');
  },
  async savePermissions(){
    const matrix={};Object.entries(this.permissions).forEach(([role,list])=>{if(Array.isArray(list)&&!this.roles[role])matrix[role]=[...list];});Object.keys(this.roles).forEach(r=>matrix[r]=[]);
    document.querySelectorAll('#permissionBody input[data-role]').forEach(i=>{if(i.checked)matrix[i.dataset.role].push(i.dataset.module);});
    if(!matrix.admin.includes('company-settings'))matrix.admin.push('company-settings');
    try{await FB.setDoc(FB.doc(FB.db,'company_settings','permissions'),{schemaVersion:2,matrix,updatedAt:FB.serverTimestamp(),updatedByUid:this.uid,updatedByName:this.staff.name||'Executive'},{merge:true});await this.audit('permission_matrix',{roles:Object.keys(matrix).length,schemaVersion:2});this.permissions=matrix;toast('Permission Matrix সংরক্ষণ হয়েছে','success');this.renderSummary();}catch(e){toast('Permission সংরক্ষণ হয়নি: '+e.message,'error');}
  },
  resetPermissions(){if(!confirm('সব Permission ডিফল্ট নীতিতে ফিরিয়ে দেবেন?'))return;this.permissions=this.defaultMatrix();this.renderPermissions();},
  async audit(action,details){try{await FB.addDoc(FB.collection(FB.db,'settings_audit_logs'),{action,details,actorUid:this.uid,actorName:this.staff.name||this.staff.fullName||'Executive',createdAt:FB.serverTimestamp()});}catch(e){}},
  async loadAudit(){
    const host=document.getElementById('settingsAuditList');if(!host)return;host.innerHTML='<div class="settings-empty">লোড হচ্ছে...</div>';
    try{const s=await FB.getDocs(FB.collection(FB.db,'settings_audit_logs'));const rows=[];s.forEach(d=>rows.push({id:d.id,...d.data()}));rows.sort((a,b)=>this.ts(b.createdAt)-this.ts(a.createdAt));host.innerHTML=rows.slice(0,50).map(x=>`<article><div><strong>${this.esc(x.action||'settings_update')}</strong><span>${this.esc(x.actorName||'Executive')}</span></div><time>${this.ts(x.createdAt)?new Date(this.ts(x.createdAt)).toLocaleString('bn-BD'):'—'}</time></article>`).join('')||'<div class="settings-empty">এখনো কোনো পরিবর্তনের ইতিহাস নেই।</div>';const last=rows[0];const e=document.getElementById('settingsLastChange');if(e)e.textContent=last&&this.ts(last.createdAt)?new Date(this.ts(last.createdAt)).toLocaleDateString('bn-BD'):'—';}catch(e){host.innerHTML='<div class="settings-empty">Audit log পড়া যায়নি।</div>';}
  },
  renderSummary(){
    const activeRoles=Object.values(this.permissions).filter(x=>Array.isArray(x)&&x.length).length;
    const permissionCount=Object.values(this.permissions).reduce((s,x)=>s+(Array.isArray(x)?x.length:0),0);
    const put=(id,v)=>{const e=document.getElementById(id);if(e)e.textContent=typeof bn==='function'?bn(v):v};put('settingsRoleCount',activeRoles);put('settingsPermissionCount',permissionCount);put('settingsBranchCount',this.branches.filter(b=>b.active!==false&&b.status!=='inactive').length);
    const c=this.config.company||{},o=this.config.operations||{};let missing=0;['name','phone','website','employeePrefix'].forEach(k=>{if(!c[k])missing++;});['timezone','orderPrefix'].forEach(k=>{if(!o[k])missing++;});const score=Math.max(0,100-missing*12-((this.permissions.admin||[]).includes('company-settings')?0:20));const s=document.getElementById('settingsHealthScore'),t=document.getElementById('settingsHealthText');if(s)s.textContent=typeof bn==='function'?bn(score):score;if(t)t.textContent=score>=90?'কেন্দ্রীয় কনফিগারেশন প্রস্তুত':score>=70?'কিছু তথ্য পূরণ করা বাকি':'গুরুত্বপূর্ণ সেটিং অসম্পূর্ণ';
  },
  openTab(name,btn){document.querySelectorAll('.settings-pane').forEach(x=>x.hidden=true);const p=document.getElementById('settings'+name.charAt(0).toUpperCase()+name.slice(1)+'Pane');if(p)p.hidden=false;document.querySelectorAll('.settings-nav button').forEach(x=>x.classList.remove('active'));if(btn)btn.classList.add('active');if(name==='audit')this.loadAudit();}
};
window.CompanySettings=CompanySettings;

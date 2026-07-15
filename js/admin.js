/* admin.js — AdminDash, ProductForm, OrderDetail, CouponManage (complete) */

const AdminDash = {
  _orders: [], _allOrders: [],

  async render(){
    const timeEl=document.getElementById('adminLastUpdated');
    if(timeEl) timeEl.textContent = '🕐 ' + new Date().toLocaleTimeString('bn-BD');
    const orders = await OrdersService.loadAll();
    this._orders = orders; this._allOrders = orders;
    await DriverManage.loadDrivers();

    const now = new Date();
    const todayStr = now.toDateString();
    const active = orders.filter(o=>o.status!=='cancelled');
    const sales = active.reduce((s,o)=>s+(o.subtotal||0),0);
    const todaySales = active.filter(o=>new Date(o.createdAt?.seconds*1000||0).toDateString()===todayStr).reduce((s,o)=>s+(o.subtotal||0),0);
    const pending = orders.filter(o=>['pending','confirmed'].includes(o.status)).length;
    const customers = [...new Set(orders.map(o=>o.customerPhone).filter(Boolean))];

    const st1=document.getElementById('aStatToday'); if(st1) st1.textContent = money(todaySales);
    const st2=document.getElementById('aStatGmv'); if(st2) st2.textContent = money(sales);
    const st3=document.getElementById('aStatOrders'); if(st3) st3.textContent = bn(orders.length);
    const st4=document.getElementById('aStatPending'); if(st4) st4.textContent = bn(pending);
    const st5=document.getElementById('aStatProducts'); if(st5) st5.textContent = bn(ALL_PRODUCTS.length);
    const st6=document.getElementById('aStatCustomers'); if(st6) st6.textContent = bn(customers.length);

    const cod = orders.filter(o=>o.paymentMethod==='cod'&&!['delivered','cancelled'].includes(o.status)).reduce((s,o)=>s+(o.subtotal||0),0);
    const online = orders.filter(o=>o.paymentMethod!=='cod').reduce((s,o)=>s+(o.subtotal||0),0);
    const fm=document.getElementById('fMonth'); if(fm) fm.textContent = money(sales);
    const fc=document.getElementById('fCod'); if(fc) fc.textContent = money(cod);
    const fo=document.getElementById('fOnline'); if(fo) fo.textContent = money(online);

    this.renderInventoryAlerts();
    this.renderRevenueChart(orders);
    this.renderRecentOrders(orders.slice(0,8));
    this.renderProducts();
    this.renderOrdersTable(orders);
    this.renderAnalytics(orders);
    this.renderCustomers(orders);
    DriverManage.renderTable();
    this.loadZmPins();
    this.renderDriverPerformance(orders);
    this.loadStoreSettings();
    this.startRealtimeListener();
  },

  async refresh(){ await this.render(); toast('✓ আপডেট হয়েছে','success'); },

  renderInventoryAlerts(){
    const low = ALL_PRODUCTS.filter(p=>p.stock >= 0 && p.stock <= 5);
    const alertEl = document.getElementById('inventoryAlerts');
    const listEl = document.getElementById('inventoryAlertList');
    const bannerEl = document.getElementById('lowStockBanner');
    if(!low.length){ if(alertEl) alertEl.style.display='none'; if(bannerEl) bannerEl.style.display='none'; return; }
    if(alertEl) alertEl.style.display='block';
    if(listEl) listEl.innerHTML = low.map(p=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid rgba(251,191,36,.1);font-size:12.5px">
        <span style="color:#fff">${p.name}</span>
        <span style="${p.stock===0?'color:#f87171':'color:#fbbf24'};font-weight:600">${p.stock===0?'স্টক আউট':p.stock+' টি বাকি'}
          <a href="#" onclick="event.preventDefault();ProductForm.openEdit('${p.id}')" style="margin-left:8px;font-size:11px;color:var(--gold)">আপডেট করুন</a>
        </span>
      </div>`).join('');
    if(bannerEl){ bannerEl.style.display='block'; bannerEl.textContent = `⚠️ ${low.length}টি পণ্যের স্টক কম — স্টক আপডেট করুন`; }
  },

  renderRevenueChart(orders){
    const chartEl = document.getElementById('aRevenueChart');
    const labelsEl = document.getElementById('aRevenueChartLabels');
    if(!chartEl) return;
    const days = [];
    const now = new Date();
    for(let i=6;i>=0;i--){
      const d = new Date(now); d.setDate(d.getDate()-i);
      const ds = d.toDateString();
      const dayOrders = orders.filter(o=>new Date(o.createdAt?.seconds*1000||0).toDateString()===ds && o.status!=='cancelled');
      const revenue = dayOrders.reduce((s,o)=>s+(o.subtotal||0),0);
      const label = ['রবি','সোম','মঙ্গ','বুধ','বৃহ','শুক্র','শনি'][d.getDay()];
      days.push({revenue, label, isToday: i===0});
    }
    const max = Math.max(...days.map(d=>d.revenue), 1);
    const total = days.reduce((s,d)=>s+d.revenue,0);
    const tt=document.getElementById('aChart7Total'); if(tt) tt.textContent = 'মোট: '+money(total);
    chartEl.innerHTML = days.map(d=>{
      const pct = Math.max((d.revenue/max)*100, d.revenue>0?8:2);
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:3px">
        <span style="font-size:9px;color:var(--ink-muted)">${d.revenue>0?money(d.revenue):''}</span>
        <div style="width:100%;height:${pct}%;border-radius:4px 4px 0 0;background:${d.isToday?'var(--gold)':'rgba(212,175,55,.35)'};min-height:4px;transition:.3s"></div>
      </div>`;
    }).join('');
    if(labelsEl) labelsEl.innerHTML = days.map(d=>`<div style="flex:1;text-align:center;font-size:9.5px;color:${d.isToday?'var(--gold)':'var(--ink-muted)'}">${d.label}</div>`).join('');
  },

  renderRecentOrders(orders){
    const tbody = document.getElementById('aRecentOrders');
    if(!tbody) return;
    if(!orders.length){ tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;color:var(--ink-muted);padding:20px">কোনো অর্ডার নেই</td></tr>`; return; }
    tbody.innerHTML = orders.map(o=>{
      const s = ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      return `<tr>
        <td style="font-size:11px">${o.orderNumber||o.id.slice(-6)}</td>
        <td>${o.customerName||'—'}<br><span style="font-size:10.5px;color:var(--ink-muted)">${o.customerPhone||''}</span></td>
        <td style="color:var(--gold)">${money(o.subtotal||0)}</td>
        <td><span class="status-pill ${s.cls}">${s.label}</span></td>
        <td><a href="#" onclick="event.preventDefault();AdminDash.openOrderDetail('${o.id}')" style="color:var(--gold);font-size:11px;display:block;margin-bottom:4px">বিস্তারিত</a>
          <select onchange="AdminDash.quickStatus('${o.id}',this.value)" style="padding:3px 6px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);color:#fff;font-size:11px">
            ${Object.entries(ORDER_STATUS).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');
  },

  renderProducts(){
    const tbody = document.getElementById('aProductsTable');
    if(!tbody) return;
    const search = document.getElementById('productSearch')?.value.toLowerCase()||'';
    const list = search ? ALL_PRODUCTS.filter(p=>p.name.toLowerCase().includes(search)) : ALL_PRODUCTS;
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:20px">কোনো প্রোডাক্ট নেই</td></tr>`; return; }
    tbody.innerHTML = list.map(p=>`<tr style="${p.stock===0?'opacity:.6':''}">
      <td><div style="width:38px;height:38px;border-radius:8px;overflow:hidden;background:var(--elevated)"><img src="${p.imageUrl||p.img||''}" style="width:100%;height:100%;object-fit:cover" loading="lazy"></div></td>
      <td><div style="font-size:12.5px;color:#fff;max-width:160px">${p.name}</div><div style="font-size:10.5px;color:var(--ink-muted)">${CATEGORIES.find(c=>c.id===p.category)?.label||''}</div></td>
      <td>${AREA_LABELS[p.zone]||'—'}</td>
      <td><div style="color:var(--gold);font-weight:600">${money(p.salePrice)}</div>${p.price>p.salePrice?`<div style="font-size:10px;color:var(--ink-dim);text-decoration:line-through">${money(p.price)}</div>`:''}</td>
      <td><input type="number" value="${p.stock}" min="0" onchange="AdminDash.quickStockUpdate('${p.id}',this.value)" style="width:60px;padding:4px 6px;border-radius:6px;background:var(--bg2);border:1px solid ${p.stock<=5?'rgba(239,68,68,.4)':'var(--line)'};color:${p.stock===0?'#f87171':p.stock<=5?'#fbbf24':'#fff'};font-size:12px;text-align:center"></td>
      <td><span class="status-pill ${p.stock>0?'delivered':'cancelled'}">${p.stock>0?'লাইভ':'স্টক আউট'}</span></td>
      <td style="display:flex;gap:6px">
        <a href="#" onclick="event.preventDefault();ProductForm.openEdit('${p.id}')" style="color:var(--gold);font-size:12px">এডিট</a>
        <a href="#" onclick="event.preventDefault();AdminDash.toggleProductStatus('${p.id}')" style="color:${p.status==='inactive'?'#22c55e':'#f87171'};font-size:12px">${p.status==='inactive'?'চালু':'বন্ধ'}</a>
      </td>
    </tr>`).join('');
  },

  filterProducts(){ this.renderProducts(); },

  async quickStockUpdate(id, val){
    if(!FB) return;
    try{
      await FB.updateDoc(FB.doc(FB.db,'products',id), {stock: Number(val), updatedAt: FB.serverTimestamp()});
      const p = ALL_PRODUCTS.find(x=>x.id===id);
      if(p){ p.stock = Number(val); }
      this.renderInventoryAlerts();
      toast('✓ স্টক আপডেট হয়েছে','success');
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  async toggleProductStatus(id){
    if(!FB) return;
    const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p) return;
    const newStatus = p.status==='inactive' ? 'active' : 'inactive';
    try{
      await FB.updateDoc(FB.doc(FB.db,'products',id), {status:newStatus, updatedAt:FB.serverTimestamp()});
      p.status = newStatus;
      this.renderProducts();
      toast(`✓ প্রোডাক্ট ${newStatus==='active'?'সক্রিয়':'নিষ্ক্রিয়'} করা হয়েছে`,'success');
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  renderOrdersTable(orders){
    const tbody = document.getElementById('aOrdersTable');
    if(!tbody) return;
    const statusFilter = document.getElementById('orderStatusFilter')?.value||'';
    const zoneFilter = document.getElementById('orderZoneFilter')?.value||'';
    let list = orders;
    if(statusFilter) list = list.filter(o=>o.status===statusFilter);
    if(zoneFilter) list = list.filter(o=>o.branchZone===zoneFilter);
    if(!list.length){ tbody.innerHTML=`<tr><td colspan="9" style="text-align:center;color:var(--ink-muted);padding:20px">কোনো অর্ডার নেই</td></tr>`; return; }
    tbody.innerHTML = list.map(o=>{
      const s = ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      const zoneDrivers = DriverManage.drivers.filter(d=>d.branchZone===o.branchZone);
      const opts = zoneDrivers.map(d=>`<option value="${d.id}" ${o.driverId===d.id?'selected':''}>${d.name}</option>`).join('');
      const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('bn-BD') : '—';
      return `<tr>
        <td><input type="checkbox" class="orderCheck" value="${o.id}" onchange="AdminDash.onCheckChange()"></td>
        <td style="font-size:11px;white-space:normal">${o.orderNumber||o.id.slice(-6)}</td>
        <td style="font-size:11px">${date}</td>
        <td>${o.customerName||'—'}</td>
        <td>${o.customerPhone||'—'}</td>
        <td style="color:var(--gold)">${money(o.subtotal||0)}</td>
        <td><select onchange="AdminDash.assignDriver('${o.id}',this.value)" style="padding:3px 6px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);color:#fff;font-size:11px;max-width:120px"><option value="">বেছে নিন</option>${opts}</select></td>
        <td><span class="status-pill ${s.cls}">${s.label}</span></td>
        <td><a href="#" onclick="event.preventDefault();AdminDash.openOrderDetail('${o.id}')" style="color:var(--gold);font-size:11px;display:block;margin-bottom:4px">বিস্তারিত</a>
          <select onchange="AdminDash.quickStatus('${o.id}',this.value)" style="padding:3px 6px;border-radius:6px;background:var(--bg2);border:1px solid var(--line);color:#fff;font-size:11px">
            ${Object.entries(ORDER_STATUS).map(([k,v])=>`<option value="${k}" ${o.status===k?'selected':''}>${v.label}</option>`).join('')}
          </select>
        </td>
      </tr>`;
    }).join('');
    const sa=document.getElementById('selectAllOrders'); if(sa) sa.checked = false;
  },

  filterOrders(){
    const search = document.getElementById('orderSearch')?.value.toLowerCase()||'';
    let list = this._allOrders;
    if(search) list = list.filter(o=>
      (o.orderNumber||'').toLowerCase().includes(search) ||
      (o.customerName||'').toLowerCase().includes(search) ||
      (o.customerPhone||'').includes(search)
    );
    this.renderOrdersTable(list);
  },

  onCheckChange(){
    const checked = document.querySelectorAll('.orderCheck:checked');
    const bar = document.getElementById('bulkActionsBar');
    if(checked.length > 0){
      if(bar) bar.style.display='flex';
      const bc=document.getElementById('bulkCount'); if(bc) bc.textContent = `${checked.length}টি অর্ডার সিলেক্ট করা হয়েছে`;
    } else { if(bar) bar.style.display='none'; }
  },

  toggleSelectAll(cb){
    document.querySelectorAll('.orderCheck').forEach(c=>c.checked=cb.checked);
    this.onCheckChange();
  },

  async bulkUpdateStatus(){
    const status = document.getElementById('bulkStatusSelect').value;
    if(!status){ toast('স্ট্যাটাস বেছে নিন','error'); return; }
    const ids = [...document.querySelectorAll('.orderCheck:checked')].map(c=>c.value);
    if(!ids.length){ toast('কোনো অর্ডার সিলেক্ট নেই','error'); return; }
    let done = 0;
    for(const id of ids){
      const ok = await OrdersService.updateStatus(id, status);
      if(ok) done++;
    }
    toast(`✓ ${done}টি অর্ডার আপডেট হয়েছে`,'success');
    await this.render();
  },

  exportOrders(){
    const ids = [...document.querySelectorAll('.orderCheck:checked')].map(c=>c.value);
    const list = ids.length > 0 ? this._allOrders.filter(o=>ids.includes(o.id)) : this._allOrders;
    const rows = [['অর্ডার ID','কাস্টমার','ফোন','NID','ঠিকানা','মোট','স্ট্যাটাস','তারিখ']];
    list.forEach(o=>{
      const date = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000).toLocaleDateString('bn-BD') : '';
      rows.push([o.orderNumber||o.id,o.customerName||'',o.customerPhone||'',o.customerNid||'',o.address||'',o.subtotal||0,ORDER_STATUS[o.status]?.label||'',date]);
    });
    const csv = rows.map(r=>r.map(c=>`"${c}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `golapi-orders-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    toast(`✓ ${list.length}টি অর্ডার export হয়েছে`,'success');
  },

  async quickStatus(orderId, status){
    if(!status) return;
    const ok = await OrdersService.updateStatus(orderId, status);
    if(ok){ toast(`✓ স্ট্যাটাস আপডেট হয়েছে`,'success'); await this.render(); }
  },

  async assignDriver(orderId,driverId){
    if(!driverId) return;
    const d = DriverManage.drivers.find(x=>x.id===driverId); if(!d) return;
    const ok = await OrdersService.assignDriver(orderId,driverId,d.name);
    if(ok){ toast(`✓ ${d.name}-কে অ্যাসাইন করা হয়েছে`,'success'); await this.render(); }
  },

  renderAnalytics(orders){
    const active = orders.filter(o=>o.status!=='cancelled');
    const now = new Date();
    const todayStr = now.toDateString();
    const weekAgo = new Date(now-7*24*60*60*1000);
    const monthStart = new Date(now.getFullYear(),now.getMonth(),1);

    const todayRev = active.filter(o=>new Date(o.createdAt?.seconds*1000||0).toDateString()===todayStr).reduce((s,o)=>s+(o.subtotal||0),0);
    const weekRev = active.filter(o=>new Date(o.createdAt?.seconds*1000||0)>=weekAgo).reduce((s,o)=>s+(o.subtotal||0),0);
    const monthRev = active.filter(o=>new Date(o.createdAt?.seconds*1000||0)>=monthStart).reduce((s,o)=>s+(o.subtotal||0),0);
    const total = active.reduce((s,o)=>s+(o.subtotal||0),0);

    ['anToday','anWeek','anMonth','anTotal'].forEach((id,i)=>{
      const el=document.getElementById(id);
      if(el) el.textContent=money([todayRev,weekRev,monthRev,total][i]);
    });

    const pbEl = document.getElementById('paymentBreakdown');
    if(pbEl){
      const methods = {};
      active.forEach(o=>{ const m=o.paymentMethod||'cod'; methods[m]=(methods[m]||0)+(o.subtotal||0); });
      const labels = {cod:'💰 COD',bkash:'📱 bKash',nagad:'📱 Nagad'};
      pbEl.innerHTML = Object.entries(methods).map(([m,v])=>{
        const pct = total>0?Math.round(v/total*100):0;
        return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>${labels[m]||m}</span><span style="color:var(--gold)">${money(v)} (${pct}%)</span></div><div style="height:6px;border-radius:3px;background:rgba(255,255,255,.06)"><div style="height:100%;width:${pct}%;border-radius:3px;background:var(--gold);transition:.5s"></div></div></div>`;
      }).join('');
    }

    const zbEl = document.getElementById('zoneBreakdown');
    if(zbEl){
      const zones = {};
      active.forEach(o=>{ const z=o.branchZone||'unknown'; zones[z]=(zones[z]||0)+(o.subtotal||0); });
      zbEl.innerHTML = Object.entries(zones).map(([z,v])=>{
        const pct = total>0?Math.round(v/total*100):0;
        return `<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;font-size:12.5px;margin-bottom:4px"><span>${AREA_LABELS[z]||z}</span><span style="color:var(--rose)">${money(v)} (${pct}%)</span></div><div style="height:6px;border-radius:3px;background:rgba(255,255,255,.06)"><div style="height:100%;width:${pct}%;border-radius:3px;background:var(--rose);transition:.5s"></div></div></div>`;
      }).join('');
    }

    const tpEl = document.getElementById('topProducts');
    if(tpEl){
      const productSales = {};
      active.forEach(o=>(o.items||[]).forEach(item=>{
        productSales[item.productId]=(productSales[item.productId]||0)+item.qty;
      }));
      const sorted = Object.entries(productSales).sort((a,b)=>b[1]-a[1]).slice(0,5);
      tpEl.innerHTML = sorted.length ? sorted.map(([id,qty],i)=>{
        const p = ALL_PRODUCTS.find(x=>x.id===id);
        return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)"><span style="width:20px;text-align:center;font-weight:700;color:var(--gold);font-size:13px">${i+1}</span><div style="width:32px;height:32px;border-radius:6px;overflow:hidden"><img src="${p?.imageUrl||p?.img||''}" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1;min-width:0"><div style="font-size:12.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.name||id}</div></div><span style="font-size:12px;color:var(--ink-muted)">${qty} বিক্রি</span></div>`;
      }).join('') : '<p style="color:var(--ink-muted);font-size:13px">তথ্য নেই</p>';
    }
  },

  renderCustomers(orders){
    const tbody = document.getElementById('aCustomersTable');
    if(!tbody) return;
    const customers = {};
    orders.forEach(o=>{
      const phone = o.customerPhone||'';
      if(!phone) return;
      if(!customers[phone]){
        customers[phone] = {name:o.customerName||'—', phone, nid:o.customerNid||'—', orders:[], total:0, lastDate:null};
      }
      customers[phone].orders.push(o);
      customers[phone].total += (o.subtotal||0);
      const d = o.createdAt?.seconds ? new Date(o.createdAt.seconds*1000) : null;
      if(d && (!customers[phone].lastDate || d > customers[phone].lastDate)) customers[phone].lastDate = d;
    });

    const search = document.getElementById('customerSearch')?.value.toLowerCase()||'';
    let list = Object.values(customers);
    if(search) list = list.filter(c=>c.name.toLowerCase().includes(search)||c.phone.includes(search));
    list.sort((a,b)=>b.total-a.total);

    if(!list.length){ tbody.innerHTML=`<tr><td colspan="7" style="text-align:center;color:var(--ink-muted);padding:20px">কোনো কাস্টমার নেই</td></tr>`; return; }
    tbody.innerHTML = list.map(c=>`<tr>
      <td>${c.name}</td>
      <td>${c.phone}</td>
      <td style="font-size:11.5px">${c.nid}</td>
      <td style="text-align:center">${c.orders.length}</td>
      <td style="color:var(--gold)">${money(c.total)}</td>
      <td style="font-size:11px">${c.lastDate?c.lastDate.toLocaleDateString('bn-BD'):'—'}</td>
      <td><a href="#" onclick="event.preventDefault();AdminDash.showCustomerOrders('${c.phone}')" style="color:var(--gold);font-size:12px">অর্ডার দেখুন</a></td>
    </tr>`).join('');
  },

  filterCustomers(){ this.renderCustomers(this._allOrders); },

  showCustomerOrders(phone){
    const orders = this._allOrders.filter(o=>o.customerPhone===phone);
    if(!orders.length) return;
    const c = orders[0];
    const cn=document.getElementById('coCustomerName'); if(cn) cn.textContent = c.customerName||'—';
    const cp=document.getElementById('coCustomerPhone');
    if(cp) cp.textContent = `📞 ${phone} | NID: ${c.customerNid||'—'} | মোট: ${money(orders.reduce((s,o)=>s+(o.subtotal||0),0))}`;
    const listEl = document.getElementById('coOrdersList');
    if(listEl) listEl.innerHTML = orders.map(o=>{
      const s=ORDER_STATUS[o.status]||ORDER_STATUS.pending;
      const date=o.createdAt?.seconds?new Date(o.createdAt.seconds*1000).toLocaleDateString('bn-BD'):'—';
      return `<div style="padding:12px;border:1px solid var(--line);border-radius:10px;margin-bottom:8px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:12px;font-weight:600;color:var(--gold)">${o.orderNumber||o.id.slice(-6)}</span><span class="status-pill ${s.cls}">${s.label}</span></div><div style="display:flex;justify-content:space-between;font-size:12px;color:var(--ink-muted)"><span>${date}</span><span style="color:var(--gold);font-weight:600">${money(o.subtotal||0)}</span></div><div style="margin-top:6px"><a href="#" onclick="event.preventDefault();document.getElementById('customerOrdersModal').classList.remove('show');OrderDetail.open(${JSON.stringify(o).replace(/"/g,'&quot;')})" style="font-size:12px;color:var(--gold)">বিস্তারিত দেখুন →</a></div></div>`;
    }).join('');
    document.getElementById('customerOrdersModal').classList.add('show');
  },

  openOrderDetail(orderId){
    const o = this._allOrders.find(x=>x.id===orderId); if(o) OrderDetail.open(o);
  },

  _listener:null,
  startRealtimeListener(){
    if(!FB || this._listener) return;
    let initialized = false;
    this._listener = FB.onSnapshot(
      FB.query(FB.collection(FB.db,'orders'), FB.orderBy('createdAt','desc'), FB.limit(1)),
      (snap) => {
        if(!initialized){ initialized=true; return; }
        snap.docChanges().forEach(change=>{
          if(change.type==='added'){
            const o = {id:change.doc.id,...change.doc.data()};
            AdminDash.showNewOrderAlert(o);
            AdminDash.render();
          }
        });
      }
    );
  },

  showNewOrderAlert(order){
    const bell = document.getElementById('adminNotifBell');
    if(bell){
      const count = parseInt(bell.dataset.count||0)+1;
      bell.dataset.count = count;
      bell.textContent = `🔔 ${count}`;
      bell.style.display='inline-block';
    }
    toast(`🚨 নতুন অর্ডার! ${order.customerName||'কাস্টমার'} — ${money(order.subtotal||0)}`,'success');
    try{
      const ctx = new(window.AudioContext||window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880,ctx.currentTime);
      osc.frequency.setValueAtTime(660,ctx.currentTime+0.1);
      gain.gain.setValueAtTime(0.3,ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001,ctx.currentTime+0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime+0.3);
    }catch(e){}
  },

  renderDriverPerformance(orders){
    const el = document.getElementById('driverPerformanceTable');
    if(!el) return;
    const stats = {};
    orders.forEach(o=>{
      if(!o.driverId) return;
      if(!stats[o.driverId]) stats[o.driverId] = {name:o.driverName||'—',total:0,delivered:0,cancelled:0,revenue:0};
      stats[o.driverId].total++;
      if(o.status==='delivered'){ stats[o.driverId].delivered++; stats[o.driverId].revenue+=(o.subtotal||0); }
      if(o.status==='cancelled') stats[o.driverId].cancelled++;
    });
    const list = Object.values(stats).sort((a,b)=>b.delivered-a.delivered);
    if(!list.length){ el.innerHTML='<tr><td colspan="5" style="text-align:center;color:var(--ink-muted);padding:16px">তথ্য নেই</td></tr>'; return; }
    el.innerHTML = list.map(d=>{
      const rate = d.total>0?Math.round(d.delivered/d.total*100):0;
      return `<tr><td style="color:#fff;font-weight:600">${d.name}</td><td style="text-align:center">${d.total}</td><td style="text-align:center;color:#22c55e">${d.delivered}</td><td style="text-align:center"><div style="display:flex;align-items:center;gap:6px"><div style="flex:1;height:5px;border-radius:3px;background:rgba(255,255,255,.06)"><div style="height:100%;width:${rate}%;border-radius:3px;background:${rate>=80?'#22c55e':rate>=50?'#fbbf24':'#f87171'}"></div></div><span style="font-size:11px;color:var(--ink-muted)">${rate}%</span></div></td><td style="color:var(--gold)">${money(d.revenue)}</td></tr>`;
    }).join('');
  },

  selectedProducts: new Set(),

  toggleProductSelect(id, checked){
    checked ? this.selectedProducts.add(id) : this.selectedProducts.delete(id);
    const bar = document.getElementById('productBulkBar');
    const count = document.getElementById('productBulkCount');
    if(this.selectedProducts.size > 0){ if(bar) bar.style.display='flex'; if(count) count.textContent = `${this.selectedProducts.size}টি প্রোডাক্ট সিলেক্ট`; }
    else { if(bar) bar.style.display='none'; }
  },

  async bulkDeleteProducts(){
    if(!this.selectedProducts.size){ toast('কোনো প্রোডাক্ট সিলেক্ট নেই','error'); return; }
    if(!confirm(`${this.selectedProducts.size}টি প্রোডাক্ট মুছে ফেলবেন?`)) return;
    if(!FB) return;
    let done=0;
    for(const id of this.selectedProducts){
      try{ await FB.deleteDoc(FB.doc(FB.db,'products',id)); done++; }catch(e){ devWarn(e.message); }
    }
    this.selectedProducts.clear();
    await ProductStore.refreshAndRerender();
    this.renderProducts();
    const bar=document.getElementById('productBulkBar'); if(bar) bar.style.display='none';
    toast(`✓ ${done}টি প্রোডাক্ট মুছে ফেলা হয়েছে`,'success');
  },

  async bulkUpdatePrice(){
    const pct = parseFloat(prompt('মূল্য কত % পরিবর্তন করবেন? (+ বাড়াতে, - কমাতে, যেমন: 10 বা -5)'));
    if(isNaN(pct)) return;
    if(!FB) return;
    let done=0;
    for(const id of this.selectedProducts){
      const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p) continue;
      const newPrice = Math.round(p.salePrice*(1+pct/100));
      try{
        await FB.updateDoc(FB.doc(FB.db,'products',id),{salePrice:newPrice,updatedAt:FB.serverTimestamp()});
        p.salePrice=newPrice; done++;
      }catch(e){ devWarn(e.message); }
    }
    this.selectedProducts.clear();
    this.renderProducts();
    const bar=document.getElementById('productBulkBar'); if(bar) bar.style.display='none';
    toast(`✓ ${done}টি প্রোডাক্টের মূল্য ${pct>0?'+':''}${pct}% আপডেট হয়েছে`,'success');
  },

  renderAnalyticsWithDateRange(){
    const from = document.getElementById('anDateFrom')?.value;
    const to = document.getElementById('anDateTo')?.value;
    let orders = this._allOrders;
    if(from) orders = orders.filter(o=>new Date(o.createdAt?.seconds*1000||0)>=new Date(from));
    if(to) orders = orders.filter(o=>new Date(o.createdAt?.seconds*1000||0)<=new Date(to+'T23:59:59'));
    this.renderAnalytics(orders);
    if(from && to){
      const fromD=new Date(from), toD=new Date(to+'T23:59:59');
      const diff=toD-fromD;
      const prevFrom=new Date(fromD-diff), prevTo=new Date(fromD-1);
      const prevOrders=this._allOrders.filter(o=>{
        const d=new Date(o.createdAt?.seconds*1000||0);
        return d>=prevFrom && d<=prevTo && o.status!=='cancelled';
      });
      const currRev=orders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.subtotal||0),0);
      const prevRev=prevOrders.reduce((s,o)=>s+(o.subtotal||0),0);
      const trendEl=document.getElementById('anTrend');
      if(trendEl && prevRev>0){
        const pct=Math.round((currRev-prevRev)/prevRev*100);
        trendEl.innerHTML=`আগের সময়ের তুলনায়: <strong style="color:${pct>=0?'#22c55e':'#f87171'}">${pct>=0?'↑':'↓'} ${Math.abs(pct)}%</strong>`;
      }
    }
  },

  async saveOrderNote(orderId){
    const note = document.getElementById('odNoteInput')?.value.trim();
    if(!note||!FB) return;
    try{
      await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{adminNote:note,noteUpdatedAt:FB.serverTimestamp()});
      toast('✓ নোট সংরক্ষণ হয়েছে','success');
      const ns=document.getElementById('odNoteStatus'); if(ns) ns.textContent='✓ সংরক্ষিত';
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  async loadStoreSettings(){
    if(!FB) return;
    try{
      const snap=await FB.getDoc(FB.doc(FB.db,'setting','store'));
      const d=snap.exists()?snap.data():{};
      const fields=['storeAnnouncement','storeHours','deliveryMin','deliveryMax','expressCharge'];
      fields.forEach(f=>{ const el=document.getElementById('ss_'+f); if(el) el.value=d[f]||''; });
    }catch(e){ devWarn(e.message); }
  },

  async saveStoreSettings(){
    if(!FB){ toast('সংযোগ সমস্যা','error'); return; }
    try{
      const data={};
      ['storeAnnouncement','storeHours','deliveryMin','deliveryMax','expressCharge'].forEach(f=>{
        const el=document.getElementById('ss_'+f); if(el) data[f]=el.value.trim();
      });
      await FB.setDoc(FB.doc(FB.db,'setting','store'),{...data,updatedAt:FB.serverTimestamp()});
      toast('✓ স্টোর সেটিংস সংরক্ষণ হয়েছে','success');
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  async loadZmPins(){
    if(!FB) return;
    try{
      const snap = await FB.getDoc(FB.doc(FB.db,'setting','zone_manager_pins'));
      const pins = snap.exists()? snap.data() : {};
      const s = document.getElementById('zmPinSadar'); if(s) s.value=pins.noakhali_sadar||'';
      const b = document.getElementById('zmPinBegumganj'); if(b) b.value=pins.begumganj||'';
    }catch(e){ devWarn(e.message); }
  },

  async saveZmPins(){
    if(!FB){ toast('সংযোগ সমস্যা','error'); return; }
    try{
      await FB.setDoc(FB.doc(FB.db,'setting','zone_manager_pins'),{
        noakhali_sadar: document.getElementById('zmPinSadar').value.trim(),
        begumganj: document.getElementById('zmPinBegumganj').value.trim()
      });
      toast('✓ পিন সংরক্ষণ করা হয়েছে','success');
    }catch(e){ toast('সমস্যা: '+e.message,'error'); }
  },

  tab(btn,name){
    ['overview','products','orders','analytics','customers','coupons','settings','finance'].forEach(t=>{
      const el = document.getElementById('admin'+t.charAt(0).toUpperCase()+t.slice(1)+'Pane');
      if(el) el.style.display = t===name?'block':'none';
    });
    document.querySelectorAll('#page-admin-dash .dash-side a').forEach(a=>a.classList.remove('active'));
    if(btn) btn.classList.add('active');
    if(name==='products') this.renderProducts();
    if(name==='analytics') this.renderAnalytics(this._allOrders);
    if(name==='customers') this.renderCustomers(this._allOrders);
    if(name==='coupons') CouponManage.render();
  }
};

/* ---------- Product Form ---------- */
const ProductForm = {
  mode:'add', editId:null, imgBase64:null,
  onImageSelect(input){
    const file = input.files[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      this.imgBase64 = e.target.result;
      const thumb=document.getElementById('pfImgThumb'); if(thumb) thumb.src = e.target.result;
      const prev=document.getElementById('pfImgPreview'); if(prev) prev.style.display = 'block';
      const ai=document.getElementById('pfDescAiBtn'); if(ai) ai.style.display = 'inline-block';
      const name = document.getElementById('pfName')?.value.trim();
      if(name) this.generateDesc();
    };
    reader.readAsDataURL(file);
  },
  maybeAutoGenerate(){
    const name = document.getElementById('pfName')?.value.trim();
    const hasImg = document.getElementById('pfImgFile')?.files.length > 0;
    const descEmpty = !document.getElementById('pfDescription')?.value.trim();
    if(name && hasImg && descEmpty) this.generateDesc();
  },
  async generateDesc(){
    const name = document.getElementById('pfName').value.trim();
    const cat = document.getElementById('pfCategory').value;
    const loadEl = document.getElementById('pfDescLoading');
    const descEl = document.getElementById('pfDescription');
    if(loadEl) loadEl.style.display = 'block';
    const aiBtn=document.getElementById('pfDescAiBtn'); if(aiBtn) aiBtn.style.display = 'none';
    try{
      const messages = [{role:'user', content:[
        {type:'text', text:`তুমি একটি বাংলাদেশি ই-কমার্স দোকানের জন্য পণ্যের বিবরণ লিখবে। পণ্যের নাম: "${name || 'পণ্য'}", ক্যাটাগরি: "${cat}". সংক্ষিপ্ত, আকর্ষণীয় বাংলা বিবরণ লিখো (৩-৫ লাইন)।`}
      ]}];
      const res = await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({model:'claude-sonnet-4-6', max_tokens:300, messages})
      });
      const data = await res.json();
      const text = (data.content||[]).filter(b=>b.type==='text').map(b=>b.text).join('');
      if(text && descEl) descEl.value = text;
      else toast('বিবরণ তৈরি হয়নি','error');
    }catch(e){ toast('AI সংযোগ সমস্যা','error'); }
    finally{ if(loadEl) loadEl.style.display='none'; if(aiBtn) aiBtn.style.display='inline-block'; }
  },
  openAdd(){
    this.mode='add'; this.editId=null; this.imgBase64=null;
    const t=document.getElementById('pfTitle'); if(t) t.textContent='নতুন প্রোডাক্ট যুক্ত করুন';
    const b=document.getElementById('pfSubmitBtn'); if(b) b.textContent='প্রোডাক্ট সংরক্ষণ করুন';
    ['pfName','pfPrice','pfSalePrice','pfStock','pfDescription','pfCostPrice'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    const f=document.getElementById('pfImgFile'); if(f) f.value='';
    const p=document.getElementById('pfImgPreview'); if(p) p.style.display='none';
    const ai=document.getElementById('pfDescAiBtn'); if(ai) ai.style.display='none';
    const ec=document.getElementById('pfExtraCost'); if(ec) ec.value='0';
    const dp=document.getElementById('pfDeliveryPercent'); if(dp) dp.value='0';
    const pp=document.getElementById('pfProfitPercent'); if(pp) pp.value='20';
    const bd=document.getElementById('pfBreakdown'); if(bd) bd.textContent='৳0';
    const zs=document.getElementById('pfZoneSadar'); if(zs){ zs.disabled=false; zs.checked=true; }
    const zb=document.getElementById('pfZoneBegumganj'); if(zb){ zb.disabled=false; zb.checked=false; }
    const c=document.getElementById('pfCategory'); if(c) c.value='grocery';
    const u=document.getElementById('pfUnit'); if(u) u.value='পিস';
    const cd=document.getElementById('pfCod'); if(cd) cd.checked=true;
    const fl=document.getElementById('pfFlash'); if(fl) fl.checked=false;
    const ft=document.getElementById('pfFeatured'); if(ft) ft.checked=false;
    const m=document.getElementById('pfMsg'); if(m) m.className='form-msg';
    document.getElementById('productModal').classList.add('show');
  },
  recalc(){
    const cost=Number(document.getElementById('pfCostPrice')?.value)||0;
    const extra=Number(document.getElementById('pfExtraCost')?.value)||0;
    const delp=Number(document.getElementById('pfDeliveryPercent')?.value)||0;
    const profp=Number(document.getElementById('pfProfitPercent')?.value)||0;
    const base=cost+extra;
    const afterDel = base + base*delp/100;
    const final = Math.round(afterDel + afterDel*profp/100);
    const bd=document.getElementById('pfBreakdown'); if(bd) bd.textContent = `৳${cost}+৳${extra} → +${delp}% → +${profp}% = ৳${final}`;
    if(cost>0){
      const sp=document.getElementById('pfSalePrice'); if(sp) sp.value = final;
      const pf=document.getElementById('pfPrice'); if(pf && !pf.value) pf.value = Math.round(final*1.1);
    }
  },
  openEdit(id){
    const p = ALL_PRODUCTS.find(x=>x.id===id); if(!p){ toast('প্রোডাক্ট পাওয়া যায়নি','error'); return; }
    this.mode='edit'; this.editId=id;
    const t=document.getElementById('pfTitle'); if(t) t.textContent='প্রোডাক্ট সম্পাদনা করুন';
    const b=document.getElementById('pfSubmitBtn'); if(b) b.textContent='পরিবর্তন সংরক্ষণ করুন';
    const n=document.getElementById('pfName'); if(n) n.value=p.name;
    const zs=document.getElementById('pfZoneSadar'); if(zs){ zs.checked = p.zone==='noakhali_sadar'; zs.disabled=true; }
    const zb=document.getElementById('pfZoneBegumganj'); if(zb){ zb.checked = p.zone==='begumganj'; zb.disabled=true; }
    const c=document.getElementById('pfCategory'); if(c) c.value=p.category;
    const u=document.getElementById('pfUnit'); if(u) u.value=p.unit;
    const pr=document.getElementById('pfPrice'); if(pr) pr.value=p.price;
    const sp=document.getElementById('pfSalePrice'); if(sp) sp.value=p.salePrice;
    const s=document.getElementById('pfStock'); if(s) s.value=p.stock;
    const cp=document.getElementById('pfCostPrice'); if(cp) cp.value=p.costPrice||'';
    const ec=document.getElementById('pfExtraCost'); if(ec) ec.value=p.extraCost||0;
    const dp=document.getElementById('pfDeliveryPercent'); if(dp) dp.value=p.deliveryPercent||0;
    const pp=document.getElementById('pfProfitPercent'); if(pp) pp.value=p.profitPercent||20;
    const bd=document.getElementById('pfBreakdown');
    if(bd) bd.textContent = p.costPrice ? `৳${p.costPrice}+৳${p.extraCost||0} → +${p.deliveryPercent||0}% → +${p.profitPercent||20}% = ৳${p.salePrice}` : '৳0';
    const d=document.getElementById('pfDescription'); if(d) d.value=p.description||'';
    const cd=document.getElementById('pfCod'); if(cd) cd.checked=!!p.cod;
    const fl=document.getElementById('pfFlash'); if(fl) fl.checked=!!p.isFlash;
    const ft=document.getElementById('pfFeatured'); if(ft) ft.checked=!!p.isFeatured;
    const m=document.getElementById('pfMsg'); if(m) m.className='form-msg';
    document.getElementById('productModal').classList.add('show');
  },
  close(){ document.getElementById('productModal').classList.remove('show'); },
  async submit(){
    const msgEl=document.getElementById('pfMsg');
    const name=document.getElementById('pfName').value.trim();
    const selZones=[]; if(document.getElementById('pfZoneSadar')?.checked) selZones.push('noakhali_sadar'); if(document.getElementById('pfZoneBegumganj')?.checked) selZones.push('begumganj');
    const category=document.getElementById('pfCategory').value, unit=document.getElementById('pfUnit').value;
    const price=Number(document.getElementById('pfPrice').value), salePrice=Number(document.getElementById('pfSalePrice').value), stock=Number(document.getElementById('pfStock').value);
    const description=document.getElementById('pfDescription').value.trim();
    const cod=document.getElementById('pfCod').checked, isFlash=document.getElementById('pfFlash').checked, isFeatured=document.getElementById('pfFeatured').checked;
    const costPrice=Number(document.getElementById('pfCostPrice').value)||0, extraCost=Number(document.getElementById('pfExtraCost').value)||0;
    const deliveryPercent=Number(document.getElementById('pfDeliveryPercent').value)||0, profitPercent=Number(document.getElementById('pfProfitPercent').value)||0;
    if(!name||!salePrice||stock===''){ msgEl.textContent='সব প্রয়োজনীয় তথ্য পূরণ করুন'; msgEl.className='form-msg err'; return; }
    if(!selZones.length){ msgEl.textContent='অন্তত একটা শাখা বেছে নিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা — Firebase কনফিগার নেই'; msgEl.className='form-msg err'; return; }
    const btn=document.getElementById('pfSubmitBtn'); const orig=btn.textContent; btn.textContent='সংরক্ষণ হচ্ছে...'; btn.disabled=true;
    try{
      let imageUrl = null;
      const imgFile = document.getElementById('pfImgFile').files[0];
      if(imgFile){
        const fileRef = FB.storageRef(FB.storage, `products/${Date.now()}_${imgFile.name}`);
        await FB.uploadBytes(fileRef, imgFile);
        imageUrl = await FB.getDownloadURL(fileRef);
      }
      const base = {name,category,unit,price:price||salePrice,salePrice,stock,description,costPrice,extraCost,deliveryPercent,profitPercent,cod,isFlash,isFeatured,status:'active',updatedAt:FB.serverTimestamp()};
      if(imageUrl) base.imageUrl = imageUrl;
      if(this.mode==='add'){
        const groupId = selZones.length>1 ? `${Date.now()}` : null;
        for(const zone of selZones){
          const data = {...base, zone, createdAt:FB.serverTimestamp(), rating:'৫.০', reviews:0, sold:0, fastDelivery:true};
          if(groupId) data.groupId = groupId;
          await FB.addDoc(FB.collection(FB.db,'products'), data);
        }
        msgEl.textContent = selZones.length>1 ? '✓ দুই শাখাতেই যুক্ত হয়েছে' : '✓ প্রোডাক্ট যুক্ত হয়েছে'; msgEl.className='form-msg ok';
      }else{
        await FB.updateDoc(FB.doc(FB.db,'products',this.editId), {...base, zone:selZones[0]});
        msgEl.textContent='✓ প্রোডাক্ট আপডেট হয়েছে'; msgEl.className='form-msg ok';
      }
      await ProductStore.refreshAndRerender();
      if(ZoneManagerDash.currentZone) ZoneManagerDash.render(); else { AdminDash.renderProducts(); const sp=document.getElementById('aStatProducts'); if(sp) sp.textContent=bn(ALL_PRODUCTS.length); }
      setTimeout(()=>this.close(),900);
    }catch(e){ msgEl.textContent='সমস্যা হয়েছে: '+e.message; msgEl.className='form-msg err'; }
    finally{ btn.textContent=orig; btn.disabled=false; }
  }
};

/* ---------- Order Detail ---------- */
const OrderDetail = {
  current: null,
  open(order){
    this.current = order;
    const s = ORDER_STATUS[order.status]||ORDER_STATUS.pending;
    document.getElementById('odOrderNum').textContent = order.orderNumber||order.id;
    document.getElementById('odDate').textContent = order.createdAt?.seconds ? new Date(order.createdAt.seconds*1000).toLocaleString('bn-BD') : '—';
    const statusEl = document.getElementById('odStatus');
    statusEl.textContent = s.label; statusEl.className = 'status-pill '+s.cls;
    document.getElementById('odName').textContent = order.customerName||'—';
    document.getElementById('odPhone').textContent = order.customerPhone||'—';
    document.getElementById('odNid').textContent = order.customerNid||'প্রয়োজন নয়';
    document.getElementById('odPayment').textContent = {cod:'💰 COD',bkash:'📱 bKash',nagad:'📱 Nagad'}[order.paymentMethod]||order.paymentMethod||'COD';
    document.getElementById('odAddress').innerHTML = `<strong style="color:#fff">${order.village||''}</strong>${order.village?', ':''}<br>${AREA_LABELS[order.branchZone]||''} — ${order.address||''}`;
    document.getElementById('odInstructions').textContent = '💬 ' + (order.instructions||'কোনো বিশেষ নির্দেশনা নেই');
    const itemsEl = document.getElementById('odItems');
    const items = order.items||[];
    itemsEl.innerHTML = items.map(item=>{
      const p = ALL_PRODUCTS.find(x=>x.id===item.productId);
      return `<div style="display:flex;align-items:center;gap:10px;padding:7px 0;border-bottom:1px solid var(--line)"><div style="width:36px;height:36px;border-radius:7px;overflow:hidden;background:var(--elevated);flex-shrink:0"><img src="${p?.imageUrl||p?.img||''}" style="width:100%;height:100%;object-fit:cover"></div><div style="flex:1;min-width:0"><div style="font-size:12.5px;color:#fff;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p?.name||item.productId}</div><div style="font-size:11px;color:var(--ink-muted)">${money(p?.salePrice||0)} × ${item.qty}</div></div><span style="color:var(--gold);font-weight:600;font-size:13px">${money((p?.salePrice||0)*item.qty)}</span></div>`;
    }).join('') || '<p style="color:var(--ink-muted);font-size:13px">আইটেম তথ্য নেই</p>';
    const ship = order.shippingCost||0;
    const sub = (order.subtotal||0) - ship;
    document.getElementById('odSubtotal').textContent = money(sub>0?sub:order.subtotal||0);
    document.getElementById('odShipping').textContent = ship>0?money(ship):'ফ্রি';
    document.getElementById('odTotal').textContent = money(order.subtotal||0);
    const dbox = document.getElementById('odDriverBox');
    const dEl = document.getElementById('odDriver');
    if(order.driverName){ dbox.style.display='block'; dEl.textContent = `${order.driverName} — ${order.customerPhone||''}`; }
    else { dbox.style.display='none'; }

    const rbox = document.getElementById('odRefundBox');
    if(order.refundRequested){
      rbox.style.display='block';
      document.getElementById('odRefundReason').textContent = '📝 কারণ: ' + (order.refundReason||'উল্লেখ নেই');
      const statusEl = document.getElementById('odRefundStatus');
      const actionsEl = document.getElementById('odRefundActions');
      const rs = order.refundStatus || 'pending';
      const rsMap = { pending:{label:'⏳ পেন্ডিং',cls:'pending'}, approved:{label:'✓ অনুমোদিত',cls:'delivered'}, rejected:{label:'✕ বাতিল',cls:'cancelled'} };
      const rInfo = rsMap[rs] || rsMap.pending;
      statusEl.textContent = rInfo.label; statusEl.className = 'status-pill ' + rInfo.cls;
      actionsEl.style.display = rs==='pending' ? 'flex' : 'none';
    } else {
      rbox.style.display='none';
    }
    const noteInput = document.getElementById('odNoteInput');
    const noteStatus = document.getElementById('odNoteStatus');
    if(noteInput) noteInput.value = order.adminNote||'';
    if(noteStatus) noteStatus.textContent = order.adminNote?'✓ নোট আছে':'';
    document.getElementById('orderDetailModal').classList.add('show');
  },
  close(){ document.getElementById('orderDetailModal').classList.remove('show'); },
  async handleRefund(status){
    if(!this.current) return;
    const ok = await RefundService.approveRefund(this.current.id, status);
    if(ok){
      this.current.refundStatus = status;
      this.open(this.current);
      await AdminDash.render();
    }
  },
  print(){
    const o = this.current; if(!o) return;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${o.orderNumber||o.id}</title><style>body{font-family:sans-serif;padding:30px;max-width:600px;margin:0 auto}h1{color:#C2185B}.row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #eee}table{width:100%;margin-top:14px}.tot{font-size:18px;font-weight:700;margin-top:14px}</style></head><body><h1>Golapi Shop Online</h1><p>অর্ডার: ${o.orderNumber||o.id}</p><p>তারিখ: ${o.createdAt?.seconds?new Date(o.createdAt.seconds*1000).toLocaleString('bn-BD'):'—'}</p><hr><h3>কাস্টমার</h3><p>${o.customerName||''}<br>${o.customerPhone||''}<br>${o.village||''}, ${AREA_LABELS[o.branchZone]||''}<br>${o.address||''}</p><h3>আইটেম</h3><table><tr><th>পণ্য</th><th>মোট</th></tr>${(o.items||[]).map(it=>{const p=ALL_PRODUCTS.find(x=>x.id===it.productId);return `<tr><td>${p?.name||it.productId} × ${it.qty}</td><td>${money((p?.salePrice||0)*it.qty)}</td></tr>`}).join('')}</table><div class="tot"><div class="row"><span>মোট</span><span>${money(o.subtotal||0)}</span></div></div><p style="margin-top:20px;font-size:12px;color:#888">Golapi Shop Online — নোয়াখালী</p></body></html>`);
    w.document.close(); w.print();
  }
};

/* ---------- Coupon Management ---------- */
const CouponManage = {
  coupons:[], mode:'add', editId:null,
  async load(){
    if(!FB) return [];
    try{
      const snap = await FB.getDocs(FB.collection(FB.db,'coupons'));
      const list=[]; snap.forEach(d=>list.push({id:d.id,...d.data()}));
      list.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      this.coupons = list;
      return list;
    }catch(e){ devWarn('coupon load failed', e.message); return []; }
  },
  async render(){
    await this.load();
    const tbody = document.getElementById('aCouponsTable');
    if(!tbody) return;
    if(!this.coupons.length){ tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--ink-muted);padding:20px">কোনো কুপন নেই</td></tr>`; return; }
    const today = new Date();
    tbody.innerHTML = this.coupons.map(c=>{
      const expired = c.expiresAt && new Date(c.expiresAt) < today;
      const usedUp = c.usageLimit && (c.usedCount||0) >= c.usageLimit;
      const isLive = c.active!==false && !expired && !usedUp;
      return `<tr>
        <td style="font-weight:700;color:var(--gold)">${c.code}</td>
        <td>${c.type==='percent'?'শতাংশ':'ফ্ল্যাট'}</td>
        <td>${c.type==='percent'?c.value+'%':money(c.value)}</td>
        <td>${money(c.minOrder||0)}</td>
        <td>${bn(c.usedCount||0)}${c.usageLimit?' / '+bn(c.usageLimit):''}</td>
        <td style="font-size:11px">${c.expiresAt||'সীমাহীন'}</td>
        <td><span class="status-pill ${isLive?'delivered':'cancelled'}">${isLive?'সক্রিয়':expired?'মেয়াদ শেষ':usedUp?'শেষ':'বন্ধ'}</span></td>
        <td style="display:flex;gap:6px">
          <a href="#" onclick="event.preventDefault();CouponManage.openEdit('${c.id}')" style="color:var(--gold);font-size:12px">এডিট</a>
          <a href="#" onclick="event.preventDefault();CouponManage.toggleActive('${c.id}')" style="color:${c.active===false?'#22c55e':'#f87171'};font-size:12px">${c.active===false?'চালু':'বন্ধ'}</a>
        </td>
      </tr>`;
    }).join('');
  },
  openAdd(){
    this.mode='add'; this.editId=null;
    document.getElementById('cpTitle').textContent='নতুন কুপন তৈরি করুন';
    document.getElementById('cpSubmitBtn').textContent='কুপন তৈরি করুন';
    ['cpCode','cpValue','cpMaxDiscount','cpUsageLimit','cpExpiry'].forEach(id=>{const el=document.getElementById(id); if(el) el.value='';});
    document.getElementById('cpType').value='percent';
    document.getElementById('cpMinOrder').value='0';
    document.getElementById('cpMsg').className='form-msg';
    document.getElementById('couponModal').classList.add('show');
  },
  openEdit(id){
    const c = this.coupons.find(x=>x.id===id); if(!c) return;
    this.mode='edit'; this.editId=id;
    document.getElementById('cpTitle').textContent='কুপন সম্পাদনা করুন';
    document.getElementById('cpSubmitBtn').textContent='পরিবর্তন সংরক্ষণ করুন';
    document.getElementById('cpCode').value=c.code;
    document.getElementById('cpType').value=c.type;
    document.getElementById('cpValue').value=c.value;
    document.getElementById('cpMaxDiscount').value=c.maxDiscount||'';
    document.getElementById('cpMinOrder').value=c.minOrder||0;
    document.getElementById('cpUsageLimit').value=c.usageLimit||'';
    document.getElementById('cpExpiry').value=c.expiresAt||'';
    document.getElementById('cpMsg').className='form-msg';
    document.getElementById('couponModal').classList.add('show');
  },
  close(){ document.getElementById('couponModal').classList.remove('show'); },
  async submit(){
    const msgEl=document.getElementById('cpMsg');
    const code = document.getElementById('cpCode').value.trim().toUpperCase();
    const type = document.getElementById('cpType').value;
    const value = Number(document.getElementById('cpValue').value);
    const maxDiscount = Number(document.getElementById('cpMaxDiscount').value)||null;
    const minOrder = Number(document.getElementById('cpMinOrder').value)||0;
    const usageLimit = Number(document.getElementById('cpUsageLimit').value)||null;
    const expiresAt = document.getElementById('cpExpiry').value||null;
    if(!code || !value){ msgEl.textContent='কোড ও ছাড়ের পরিমাণ দিন'; msgEl.className='form-msg err'; return; }
    if(!FB){ msgEl.textContent='সংযোগ সমস্যা'; msgEl.className='form-msg err'; return; }
    try{
      if(this.mode==='add'){
        const dupe = this.coupons.find(c=>c.code===code);
        if(dupe){ msgEl.textContent='এই কোড ইতিমধ্যে আছে'; msgEl.className='form-msg err'; return; }
        await FB.addDoc(FB.collection(FB.db,'coupons'), {code,type,value,maxDiscount,minOrder,usageLimit,expiresAt,usedCount:0,active:true,createdAt:FB.serverTimestamp()});
        msgEl.textContent='✓ কুপন তৈরি হয়েছে'; msgEl.className='form-msg ok';
      } else {
        await FB.updateDoc(FB.doc(FB.db,'coupons',this.editId), {code,type,value,maxDiscount,minOrder,usageLimit,expiresAt});
        msgEl.textContent='✓ কুপন আপডেট হয়েছে'; msgEl.className='form-msg ok';
      }
      await this.render();
      setTimeout(()=>this.close(),800);
    }catch(e){ msgEl.textContent='সমস্যা: '+e.message; msgEl.className='form-msg err'; }
  },
  async toggleActive(id){
    const c = this.coupons.find(x=>x.id===id); if(!c || !FB) return;
    try{ await FB.updateDoc(FB.doc(FB.db,'coupons',id), {active: c.active===false}); this.render(); }
    catch(e){ toast('সমস্যা: '+e.message,'error'); }
  }
};
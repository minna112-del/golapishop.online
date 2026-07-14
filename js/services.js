/* services.js — OrdersService, DriverManage, ReviewService, RefundService */
const OrdersService = {
  cache:[],
  async loadAll(){
    if(!FB) return [];
    try{
      const snap = await FB.getDocs(FB.collection(FB.db,'orders'));
      const orders=[]; snap.forEach(d=>orders.push({id:d.id,...d.data()}));
      orders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
      this.cache=orders; return orders;
    }catch(e){ devWarn(e.message); return []; }
  },
  async assignDriver(orderId, driverId, driverName) {
    if (!FB) return false;
    try {
      await FB.updateDoc(FB.doc(FB.db, 'orders', orderId), {
        driverId, driverName, status: 'assigned', assignedAt: FB.serverTimestamp()
      });
      /* SMS trigger */
      const order = this.cache.find(o => o.id === orderId) || { id: orderId };
      const driver = await FB.getDoc(FB.doc(FB.db, 'drivers', driverId)).catch(() => null);
      const dPhone = driver?.data()?.phone || '';
      SMSGateway.onDriverAssigned(order, driverName, dPhone);
      return true;
    } catch (e) { toast('ড্রাইভর অ্যাসাইন ব্যর্থ: ' + e.message, 'error'); return false; }
  },
  async updateStatus(orderId, status) {
    if (!FB) return false;
    try {
      await FB.updateDoc(FB.doc(FB.db, 'orders', orderId), { status });
      /* SMS trigger */
      const order = this.cache.find(o => o.id === orderId) || { id: orderId };
      if (status === 'delivered') SMSGateway.onDelivered(order);
      if (status === 'cancelled') SMSGateway.onCancelled(order);
      return true;
    } catch (e) { toast('স্ট্যাটাস আপডেট ব্যর্থ', 'error'); return false; }
  },
  async cancelOrder(orderId){
    if(!FB) return false;
    try{ await FB.updateDoc(FB.doc(FB.db,'orders',orderId),{status:'cancelled',cancelledAt:FB.serverTimestamp()}); return true; }
    catch(e){ toast('অর্ডার বাতিল ব্যর্থ','error'); return false; }
  }
};

const DriverManage = {
  drivers:[], presetZone:null,
  async loadDrivers(){
    if(!FB) return [];
    try{ const snap=await FB.getDocs(FB.collection(FB.db,'drivers')); const list=[]; snap.forEach(d=>list.push({id:d.id,...d.data()})); this.drivers=list; return list; }
    catch(e){ devWarn(e.message); return []; }
  },
  async renderTable(zoneFilter=null){
    await this.loadDrivers();
    const tbody = document.getElementById(zoneFilter?'zmDriverManageTable':'driverManageTable');
    if(!tbody) return;
    const list = zoneFilter? this.drivers.filter(d=>d.branchZone===zoneFilter) : this.drivers;
    if(!list.length){ tbody.innerHTML=`<tr>
import React, { useState, useEffect, useRef } from 'react';
import { 
  Lock, LogOut, Wallet, Calendar, Users, Bell, 
  Trash2, Check, Ban, Utensils, PlusCircle, Edit, Download, Tags, Eye, ShieldCheck, Upload,
  TrendingUp, TrendingDown, DollarSign, MapPin, Ticket, Star, MessageSquare, Receipt, Printer, Power, Filter
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, set, push, update, remove, query, limitToLast } from "firebase/database";
import Papa from 'papaparse';

const AdminLogin = ({ onLogin }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-300 selection:bg-orange-500/30">
      <div className="bg-zinc-900/40 backdrop-blur-2xl border border-zinc-800/50 p-8 sm:p-10 rounded-[2.5rem] max-w-sm w-full shadow-[0_0_50px_-12px_rgba(0,0,0,0.8)] animate-in zoom-in-95 duration-500 ease-out">
        <div className="bg-gradient-to-br from-orange-500/20 to-orange-600/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner border border-orange-500/20">
          <Lock className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-white mb-2 text-center tracking-tight">Admin Access</h2>
        <p className="text-zinc-500 text-sm text-center mb-8 font-medium">Please enter the master password</p>
        <input 
          type="password" 
          value={pwd} 
          onChange={e => setPwd(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && onLogin(pwd)} 
          className="w-full bg-zinc-950/50 border border-zinc-800/80 p-4 rounded-2xl text-white mb-6 outline-none focus:border-orange-500 focus:bg-zinc-900 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 text-center tracking-[0.3em] font-black" 
          placeholder="••••••••" 
        />
        <button onClick={() => onLogin(pwd)} className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-4 rounded-2xl hover:shadow-lg hover:shadow-orange-600/20 active:scale-[0.98] transition-all duration-300">
          Unlock Dashboard
        </button>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [tab, setTab] = useState('overview');
  
  // ALL DATABASES
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [mealPassSubscribers, setMealPassSubscribers] = useState([]);
  const [mealPassPlans, setMealPassPlans] = useState([]); 
  const [financeData, setFinanceData] = useState([]);
  const [promoCodes, setPromoCodes] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [visitors, setVisitors] = useState(0);
  
  // SETTINGS
  const [contactDetails, setContactDetails] = useState({ 
    phone: '', landline: '', email: '', logo: '/logo.png', address: '', instagram: '',
    deliveryCharge: 30, freeDeliveryThreshold: 299, isDeliveryActive: true,
    storeName: 'Dadi Maa Ke Parathe', gstNumber: '', fssaiNumber: '', billFooterMessage: 'Thank You! Visit Again',
    lastBillNumber: 1000 
  });

  // FORMS
  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [adminCategoryFilter, setAdminCategoryFilter] = useState('All');
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  const [newFinance, setNewFinance] = useState({ amount: '', type: 'Online', note: '', category: 'Income' });
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newPromo, setNewPromo] = useState({ code: '', type: 'FLAT', value: '', maxDiscount: '', minOrder: '', isActive: true });
  const [editId, setEditId] = useState(null);
  const [editPromoId, setEditPromoId] = useState(null);
  
  const [editPassId, setEditPassId] = useState(null);
  const [editPassData, setEditPassData] = useState({ name: '', phone: '', plan: '' });
  const [editPlanId, setEditPlanId] = useState(null);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', duration: '30 Days', features: '' });

  // BILLING & NOTIFICATION
  const [newOrderAlert, setNewOrderAlert] = useState(false);
  const [billingCart, setBillingCart] = useState([]);
  const [customerInfo, setCustomerInfo] = useState({ name: 'Guest Customer', phone: 'Offline', paymentMode: 'Cash' });

  // TABS CONFIGURATION
  const adminTabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'billing', label: 'POS Billing' },
    { id: 'orders', label: 'Recent Orders' },
    { id: 'feedbacks', label: 'Feedbacks' },
    { id: 'menu', label: 'Manage Menu' },
    { id: 'categories', label: 'Categories' },
    { id: 'finance', label: 'Finance' },
    { id: 'discounts', label: 'Discounts' },
    { id: 'passes', label: 'Meal Passes' },
    { id: 'users', label: 'Users' },
    { id: 'bulk', label: 'Bulk Update' },
    { id: 'settings', label: 'Settings' }
  ];

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'users'), snap => setRegisteredUsers(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'meal_passes'), snap => setMealPassSubscribers(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'meal_pass_plans'), snap => setMealPassPlans(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'finance'), snap => setFinanceData(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'promo_codes'), snap => setPromoCodes(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'feedbacks'), snap => setFeedbacks(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'stats/visitors'), snap => setVisitors(snap.val() || 0));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });

    const orderQuery = query(ref(db, 'orders'), limitToLast(1));
    let initialLoad = true;
    onValue(orderQuery, (snap) => {
      if (initialLoad) {
        initialLoad = false;
        onValue(ref(db, 'orders'), allSnap => setOrders(allSnap.val() ? Object.entries(allSnap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
        return;
      }
      if (snap.exists()) {
        const lastOrder = Object.values(snap.val())[0];
        if (lastOrder.type !== 'Offline Billing') {
          setNewOrderAlert(true);
          try { new Audio('https://assets.mixkit.co/active_storage/sfx/1000/1000-preview.mp3').play(); } catch(e) {}
          onValue(ref(db, 'orders'), allSnap => setOrders(allSnap.val() ? Object.entries(allSnap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
        }
      }
    });
  }, [isAdminAuthenticated]);

  // ✅ FINANCE CALCULATIONS
  const filteredFinance = financeData.filter(f => {
    if (!dateFilter.from || !dateFilter.to) return true;
    const entryDate = new Date(f.date);
    return entryDate >= new Date(dateFilter.from) && entryDate <= new Date(dateFilter.to);
  });

  let totalIncome = 0; let totalExpense = 0;
  filteredFinance.forEach(f => {
    const amt = Number(f.amount) || 0;
    if (f.category === 'Expense') totalExpense += amt;
    else totalIncome += amt;
  });
  const netBalance = totalIncome - totalExpense;

  // ✅ BULK UPLOAD & EXPORT LOGIC
  const downloadCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const downloadBulkTemplate = () => {
    const template = [{ name: 'Aloo Paratha', price: 60, category: 'Paratha', description: 'Fresh and hot', image: 'Drive Link here' }];
    downloadCSV(template, "menu_template");
  };

  const convertDriveLink = (url) => {
    if (!url) return '';
    const match = url.match(/(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([\w-]+)/);
    if (match && match[1]) return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    return url; 
  };

  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        let count = 0;
        const existingCategoryNames = categories.map(c => c.name.toLowerCase());
        const newlyAddedCategories = [];
        results.data.forEach(item => {
          if (item.name && item.price) {
            const catName = item.category ? item.category.trim() : 'Uncategorized';
            push(ref(db, 'menu'), { 
              name: item.name.trim(), price: Number(item.price) || 0, category: catName, 
              description: item.description ? item.description.trim() : '', 
              image: convertDriveLink(item.image ? item.image.trim() : ''), 
              inStock: true, createdAt: new Date().toISOString() 
            });
            count++;
            if (!existingCategoryNames.includes(catName.toLowerCase()) && !newlyAddedCategories.includes(catName.toLowerCase())) {
               push(ref(db, 'categories'), { name: catName }); newlyAddedCategories.push(catName.toLowerCase()); 
            }
          }
        });
        if (count > 0) alert(`Success! ${count} Items uploaded.`); else alert("Format error in CSV.");
        e.target.value = null; 
      }
    });
  };

  // ✅ BILLING & PRINT LOGIC
  const addToBilling = (item) => {
    const existing = billingCart.find(i => i.id === item.id);
    if (existing) setBillingCart(billingCart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i));
    else setBillingCart([...billingCart, { ...item, quantity: 1 }]);
  };

  const printReceipt = (orderData) => {
    const printWindow = window.open('', '', 'height=600,width=400');
    const htmlContent = `
      <html>
        <head>
          <title>Bill - ${contactDetails.storeName || 'Dadi Maa Ke Parathe'}</title>
          <style>
            @page { margin: 0; }
            body { font-family: 'Courier New', Courier, monospace; padding: 10px; width: 80mm; margin: 0 auto; color: #000; font-size: 12px; }
            h2 { text-align: center; margin: 0 0 5px 0; font-size: 20px; font-weight: bold; text-transform: uppercase; }
            p { margin: 2px 0; text-align: center; }
            .divider { border-bottom: 1px dashed #000; margin: 8px 0; }
            .flex { display: flex; justify-content: space-between; }
            table { width: 100%; border-collapse: collapse; margin-top: 5px; }
            th, td { text-align: left; padding: 3px 0; }
            th.right, td.right { text-align: right; }
            th.center, td.center { text-align: center; }
            .bold { font-weight: bold; }
          </style>
        </head>
        <body>
          <h2>${contactDetails.storeName || 'Dadi Maa Ke Parathe'}</h2>
          <p>${contactDetails.address || 'Indore, MP'}</p>
          <p>Ph: ${contactDetails.phone || 'N/A'} ${contactDetails.landline ? `| Alt: ${contactDetails.landline}` : ''}</p>
          ${contactDetails.gstNumber ? `<p>GSTIN: ${contactDetails.gstNumber}</p>` : ''}
          ${contactDetails.fssaiNumber ? `<p>FSSAI: ${contactDetails.fssaiNumber}</p>` : ''}
          
          <div class="divider"></div>
          <div class="flex"><span>Bill No:</span> <span class="bold">${orderData.billNumber}</span></div>
          <div class="flex"><span>Date:</span> <span>${orderData.date} ${orderData.time}</span></div>
          <div class="flex"><span>Customer:</span> <span>${orderData.customerName}</span></div>
          <div class="flex"><span>Mode:</span> <span>${orderData.paymentMode}</span></div>
          <div class="divider"></div>
          
          <table>
            <tr style="border-bottom: 1px dashed #000;">
              <th style="width: 45%;">Item</th>
              <th class="center" style="width: 15%;">Qty</th>
              <th class="right" style="width: 20%;">Rate</th>
              <th class="right" style="width: 20%;">Amt</th>
            </tr>
            ${orderData.items.map(i => `
              <tr>
                <td>${i.name}</td>
                <td class="center">${i.quantity}</td>
                <td class="right">${i.price}</td>
                <td class="right">${i.price * i.quantity}</td>
              </tr>
            `).join('')}
          </table>
          
          <div class="divider"></div>
          <div class="flex bold" style="font-size:16px;">
            <span>TOTAL AMOUNT:</span>
            <span>Rs. ${orderData.total}</span>
          </div>
          <div class="divider"></div>
          
          <p class="bold" style="margin-top:10px;">${contactDetails.billFooterMessage || 'Thank You! Visit Again'}</p>
          <script>
            window.onload = () => { window.print(); setTimeout(() => window.close(), 500); }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const finalizeBill = () => {
    if (billingCart.length === 0) return alert("Cart khali hai!");
    const nextBillNo = Number(contactDetails.lastBillNumber || 1000) + 1;
    const finalBillString = `INV-${nextBillNo}`;
    const total = billingCart.reduce((sum, i) => sum + (i.price * i.quantity), 0);
    
    const orderData = {
      billNumber: finalBillString, customerName: customerInfo.name, customerPhone: customerInfo.phone,
      items: billingCart, total: total, status: 'Delivered', type: 'Offline Billing', paymentMode: customerInfo.paymentMode,
      date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString()
    };

    push(ref(db, 'orders'), orderData);
    push(ref(db, 'finance'), { amount: total, category: 'Income', type: customerInfo.paymentMode, note: `Bill #${finalBillString}: ${customerInfo.name}`, date: new Date().toISOString() });
    update(ref(db, 'settings'), { lastBillNumber: nextBillNo });
    
    printReceipt(orderData); 
    setBillingCart([]); setCustomerInfo({ name: 'Guest Customer', phone: 'Offline', paymentMode: 'Cash' });
  };

  // ✅ PROMO, MENU & SETTINGS SAVES
  const togglePromoStatus = (id, currentStatus) => { update(ref(db, `promo_codes/${id}`), { isActive: !currentStatus }); };
  const handleEditPromo = (p) => { setEditPromoId(p.id); setNewPromo({ code: p.code, type: p.type || 'FLAT', value: p.value, maxDiscount: p.maxDiscount || '', minOrder: p.minOrder, isActive: p.isActive !== undefined ? p.isActive : true }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  const saveItem = (e) => {
    e.preventDefault();
    if (!newItem.category) return alert('Category select karo!');
    const data = { ...newItem, price: Number(newItem.price), image: convertDriveLink(newItem.image), inStock: true, createdAt: newItem.createdAt ? newItem.createdAt : new Date().toISOString() };
    if (editId) { update(ref(db, `menu/${editId}`), data); setEditId(null); } else push(ref(db, 'menu'), data);
    setNewItem({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  };

  const savePromo = (e) => {
    e.preventDefault();
    const promoData = { code: newPromo.code.toUpperCase().trim(), type: newPromo.type, value: Number(newPromo.value), maxDiscount: newPromo.type === 'PERCENT' ? Number(newPromo.maxDiscount || 0) : 0, minOrder: Number(newPromo.minOrder), isActive: newPromo.isActive !== undefined ? newPromo.isActive : true };
    if (editPromoId) { update(ref(db, `promo_codes/${editPromoId}`), promoData).then(() => setEditPromoId(null)); } else push(ref(db, 'promo_codes'), promoData);
    setNewPromo({ code: '', type: 'FLAT', value: '', maxDiscount: '', minOrder: '', isActive: true });
  };

  const savePlan = (e) => {
    e.preventDefault();
    const data = { ...newPlan, price: Number(newPlan.price) };
    if (editPlanId) { update(ref(db, `meal_pass_plans/${editPlanId}`), data); setEditPlanId(null); } else push(ref(db, 'meal_pass_plans'), data);
    setNewPlan({ name: '', price: '', duration: '30 Days', features: '' });
  };

  const saveSettings = () => {
    const updatedSettings = { ...contactDetails, deliveryCharge: Number(contactDetails.deliveryCharge), freeDeliveryThreshold: Number(contactDetails.freeDeliveryThreshold), lastBillNumber: Number(contactDetails.lastBillNumber || 1000) };
    set(ref(db, 'settings'), updatedSettings).then(() => alert("Settings Updated!"));
  };

  if (!isAdminAuthenticated) return <AdminLogin onLogin={(p) => p === 'admin123' ? setIsAdminAuthenticated(true) : alert("Wrong Password")} />;

  const cardStyle = "bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-6 shadow-xl hover:shadow-2xl hover:border-zinc-700/50 transition-all duration-300";
  const inputStyle = "w-full bg-zinc-950/60 border border-zinc-800 p-3.5 rounded-xl text-white outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium text-sm";
  const btnPrimary = "bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3.5 rounded-xl active:scale-[0.98] transition-all shadow-lg hover:shadow-orange-500/30";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 p-4 sm:p-6 pb-24 font-sans selection:bg-orange-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* NEW ORDER ALERT */}
        {newOrderAlert && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-md animate-bounce">
            <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between border border-orange-400/50">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2 rounded-full"><Bell className="animate-ping" size={20}/></div>
                <div><div className="font-black uppercase tracking-widest text-sm">New Order Received!</div><div className="text-xs font-medium opacity-90">Please check Recent Orders</div></div>
              </div>
              <button onClick={() => setNewOrderAlert(false)} className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all">Dismiss</button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-zinc-800/50 pb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 p-2.5 rounded-xl border border-orange-500/20"><ShieldCheck className="w-6 h-6 text-orange-500"/></div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Console</h2>
          </div>
          <button onClick={() => setIsAdminAuthenticated(false)} className="bg-zinc-900/50 border border-zinc-800/80 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:bg-zinc-800 hover:text-white flex items-center w-full sm:w-auto justify-center"><LogOut className="inline w-4 h-4 mr-2"/>Logout</button>
        </div>

        {/* BULLETPROOF TABS NAVIGATION */}
        <div className="flex space-x-2 border-b border-zinc-800/50 mb-8 overflow-x-auto pb-4 scrollbar-hide w-full">
          {adminTabs.map(t => (
            <button 
              key={t.id} 
              onClick={() => { setTab(t.id); if(t.id === 'orders') setNewOrderAlert(false); }} 
              className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 ${tab === t.id ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 animate-in fade-in duration-500">
            <div className={`${cardStyle} p-5 border-t-4 border-t-purple-500`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500">Visitors</div><div className="text-2xl font-extrabold text-white">{visitors}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-orange-500`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500">Orders</div><div className="text-2xl font-extrabold text-white">{orders.length}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-blue-500`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500">Users</div><div className="text-2xl font-extrabold text-white">{registeredUsers.length}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-pink-500`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500">Active Passes</div><div className="text-2xl font-extrabold text-white">{mealPassSubscribers.length}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-green-500 col-span-2 sm:col-span-1`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500">Revenue</div><div className="text-2xl font-extrabold text-white">₹{totalIncome}</div></div>
          </div>
        )}

        {/* TAB 2: BILLING SYSTEM */}
        {tab === 'billing' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in duration-500">
            <div className="lg:col-span-2 space-y-6">
              <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80">
                 <h3 className="font-black text-white uppercase italic tracking-tighter text-xl">Quick Menu</h3>
                 <div className="text-xs font-bold text-orange-500 bg-orange-500/10 px-3 py-1 rounded-lg">Tap to add</div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {menuItems.map(item => (
                  <button key={item.id} onClick={() => addToBilling(item)} className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-3xl text-left hover:border-orange-500 transition-all active:scale-95 shadow-sm group">
                    <div className="font-bold text-white group-hover:text-orange-500 transition-colors truncate">{item.name}</div>
                    <div className="text-orange-600 font-black mt-1">₹{item.price}</div>
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-6">
               <div className={cardStyle + " sticky top-4 shadow-orange-900/10 border-orange-500/30"}>
                 <div className="flex items-center justify-between mb-6 border-b border-zinc-800 pb-4">
                   <div className="flex items-center gap-2 text-orange-500"><Receipt size={24} /><h3 className="font-black uppercase italic tracking-tighter text-xl">Receipt</h3></div>
                   <div className="text-xs font-bold bg-zinc-800 text-white px-2 py-1 rounded">Items: {billingCart.reduce((s, i)=>s+i.quantity, 0)}</div>
                 </div>
                 <div className="space-y-4 mb-6 max-h-60 overflow-y-auto pr-2 scrollbar-hide">
                    {billingCart.map(item => (
                      <div key={item.id} className="flex justify-between items-center text-sm border-b border-zinc-800/50 pb-3">
                        <div className="flex-1 font-bold text-zinc-300">{item.name} <span className="text-orange-500 text-xs ml-1">x{item.quantity}</span></div>
                        <div className="font-black text-white">₹{item.price * item.quantity}</div>
                        <button onClick={() => setBillingCart(billingCart.filter(i => i.id !== item.id))} className="ml-3 text-zinc-600 hover:text-rose-500 transition-colors"><Trash2 size={16}/></button>
                      </div>
                    ))}
                    {billingCart.length === 0 && <div className="text-center py-10 text-zinc-600 font-bold uppercase text-[10px] tracking-widest">Cart is empty</div>}
                 </div>
                 <div className="space-y-3 mb-6 bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/80">
                    <input placeholder="Customer Name" className={inputStyle} value={customerInfo.name} onChange={e => setCustomerInfo({...customerInfo, name: e.target.value})} />
                    <select className={inputStyle} value={customerInfo.paymentMode} onChange={e => setCustomerInfo({...customerInfo, paymentMode: e.target.value})}>
                      <option value="Cash">💵 Cash</option><option value="Online">📱 Online / UPI</option><option value="Udhar">📓 Udhar (Credit)</option>
                    </select>
                 </div>
                 <div className="pt-4 border-t border-zinc-800 mb-6">
                    <div className="flex justify-between text-3xl font-black text-white italic tracking-tighter">
                      <span>Total</span><span className="text-green-500">₹{billingCart.reduce((sum, i) => sum + (i.price * i.quantity), 0)}</span>
                    </div>
                 </div>
                 <button onClick={finalizeBill} className="w-full bg-orange-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest active:scale-95 transition-all shadow-xl flex justify-center items-center gap-2">
                   <Printer size={18}/> Print & Save Bill
                 </button>
               </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECENT ORDERS */}
        {tab === 'orders' && (
          <div className={`${cardStyle} overflow-hidden animate-in fade-in duration-500 divide-y divide-zinc-800/50`}>
             {orders.map(o => {
               const statusColors = { 'Pending': 'bg-orange-500/10 text-orange-500 border-orange-500/30', 'Preparing': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30', 'Dispatched': 'bg-blue-500/10 text-blue-500 border-blue-500/30', 'Delivered': 'bg-green-500/10 text-green-500 border-green-500/30' };
               return (
                 <div key={o.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-zinc-800/30 transition-colors duration-300">
                   <div>
                     <div className="text-white font-bold text-lg mb-1">{o.customerName} <span className={`text-[10px] px-2 py-0.5 rounded ml-2 uppercase font-black ${o.type === 'Offline Billing' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>{o.type || 'Online Website'}</span></div>
                     <div className="text-xs text-zinc-500 font-medium font-mono bg-zinc-950/50 inline-block px-3 py-1 rounded-lg border border-zinc-800/50">{o.billNumber ? `${o.billNumber} | ` : ''}{o.customerPhone} | {o.date} • {o.time} | Mode: {o.paymentMode || 'Online Check'}</div>
                     {o.promoCode && o.promoCode !== 'None' && <div className="mt-2 text-[10px] text-green-400 font-bold">COUPON: {o.promoCode} (-₹{o.discount})</div>}
                   </div>
                   <div className="flex flex-col sm:items-end gap-3">
                     <div className="text-orange-500 font-black text-2xl">₹{o.total}</div>
                     <div className="flex gap-2">
                       <select value={o.status || 'Pending'} onChange={(e) => update(ref(db, `orders/${o.id}`), { status: e.target.value })} className={`outline-none appearance-none cursor-pointer px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest border transition-all ${statusColors[o.status || 'Pending']}`}>
                         <option value="Pending">⏳ Pending</option><option value="Preparing">🍳 Preparing</option><option value="Dispatched">🛵 Dispatched</option><option value="Delivered">✅ Delivered</option>
                       </select>
                       {o.type === 'Offline Billing' && <button onClick={() => printReceipt(o)} className="text-blue-400 hover:text-white bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl transition-all"><Printer size={16}/></button>}
                       <button onClick={() => remove(ref(db, `orders/${o.id}`))} className="text-zinc-600 hover:text-rose-500 bg-zinc-900 border border-zinc-800 p-2.5 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                     </div>
                   </div>
                 </div>
               );
             })}
             {orders.length === 0 && <div className="p-16 text-center text-zinc-600 font-bold uppercase tracking-widest text-sm">No Recent Orders</div>}
          </div>
        )}

        {/* TAB 4: DISCOUNTS */}
        {tab === 'discounts' && (
          <div className="space-y-6 max-w-5xl animate-in fade-in duration-500">
            <form onSubmit={savePromo} className={`${cardStyle} p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4`}>
              <h3 className="sm:col-span-full text-xl font-extrabold text-white mb-2 flex items-center gap-2"><Ticket className="text-orange-500"/> {editPromoId ? 'Edit Coupon' : 'Create New Coupon'}</h3>
              <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Coupon Code</label><input placeholder="e.g. PARTY20" required className={inputStyle} value={newPromo.code} onChange={e => setNewPromo({...newPromo, code: e.target.value.toUpperCase()})} /></div>
              <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Discount Type</label><select className={inputStyle} value={newPromo.type} onChange={e => setNewPromo({...newPromo, type: e.target.value})}><option value="FLAT">Flat Discount (₹)</option><option value="PERCENT">Percentage (%)</option></select></div>
              <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Value (₹ or %)</label><input type="number" placeholder="50" required className={inputStyle} value={newPromo.value} onChange={e => setNewPromo({...newPromo, value: e.target.value})} /></div>
              {newPromo.type === 'PERCENT' ? (<div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Max Discount (₹)</label><input type="number" placeholder="100" required className={inputStyle} value={newPromo.maxDiscount} onChange={e => setNewPromo({...newPromo, maxDiscount: e.target.value})} /></div>) : (<div className="hidden md:block"></div>)}
              <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Min Order Value (₹)</label><input type="number" placeholder="299" required className={inputStyle} value={newPromo.minOrder} onChange={e => setNewPromo({...newPromo, minOrder: e.target.value})} /></div>
              <div className="sm:col-span-full flex gap-3 mt-2">
                <button type="submit" className={`flex-1 ${btnPrimary}`}>{editPromoId ? 'Update Coupon' : 'Launch Coupon'}</button>
                {editPromoId && <button type="button" onClick={() => {setEditPromoId(null); setNewPromo({ code: '', type: 'FLAT', value: '', maxDiscount: '', minOrder: '', isActive: true });}} className="bg-zinc-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-zinc-700 transition-all">Cancel</button>}
              </div>
            </form>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {promoCodes.map(p => (
                <div key={p.id} className={`${cardStyle} p-5 flex flex-col justify-between transition-all duration-300 ${p.isActive === false ? 'border-l-4 border-l-zinc-700 opacity-60 grayscale' : 'border-l-4 border-l-green-500'}`}>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className={`text-xl font-black tracking-widest ${p.isActive === false ? 'text-zinc-500 line-through' : 'text-white'}`}>{p.code}</div>
                      <div className={`text-sm font-bold mt-1 ${p.isActive === false ? 'text-zinc-500' : 'text-green-400'}`}>{p.type === 'PERCENT' ? `${p.value}% OFF (Upto ₹${p.maxDiscount})` : `Flat ₹${p.value} OFF`}</div>
                      <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-2 bg-zinc-950 inline-block px-2 py-1 rounded border border-zinc-800">Min Order: ₹{p.minOrder}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditPromo(p)} className="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 p-2.5 rounded-xl transition-all"><Edit className="w-4 h-4"/></button>
                      <button onClick={() => remove(ref(db, `promo_codes/${p.id}`))} className="text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2.5 rounded-xl transition-all"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                  <button onClick={() => togglePromoStatus(p.id, p.isActive === false ? false : true)} className={`w-full py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${p.isActive === false ? 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700' : 'bg-green-500/10 text-green-500 hover:bg-green-500/20'}`}>
                    <Power className="w-3.5 h-3.5"/> {p.isActive === false ? 'Turn ON Coupon' : 'Turn OFF Coupon'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 5: FINANCE TRACKER */}
        {tab === 'finance' && (
           <div className="space-y-6 animate-in fade-in duration-500">
             <div className={`${cardStyle} p-5 sm:p-6 flex flex-col md:flex-row gap-4 items-start md:items-end`}>
                <div className="w-full md:flex-1"><label className="text-[10px] font-bold uppercase mb-2 block text-zinc-500 tracking-wider">From Date</label><input type="date" className={inputStyle} onChange={e => setDateFilter({...dateFilter, from: e.target.value})}/></div>
                <div className="w-full md:flex-1"><label className="text-[10px] font-bold uppercase mb-2 block text-zinc-500 tracking-wider">To Date</label><input type="date" className={inputStyle} onChange={e => setDateFilter({...dateFilter, to: e.target.value})}/></div>
                <button onClick={() => downloadCSV(filteredFinance, "finance_report")} className="w-full md:w-auto bg-zinc-800/80 border border-zinc-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all text-sm"><Download className="w-4 h-4"/> Export</button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
               <div className={`${cardStyle} p-6 border-b-4 border-b-green-500 relative overflow-hidden`}><TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-green-500/10"/><div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Total Income</div><div className="text-3xl font-extrabold text-green-500">₹{totalIncome}</div></div>
               <div className={`${cardStyle} p-6 border-b-4 border-b-rose-500 relative overflow-hidden`}><TrendingDown className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-500/10"/><div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Total Expenses</div><div className="text-3xl font-extrabold text-rose-500">₹{totalExpense}</div></div>
               <div className={`${cardStyle} p-6 border-b-4 border-b-blue-500 relative overflow-hidden`}><DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-500/10"/><div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Net Balance</div><div className={`text-3xl font-extrabold ${netBalance >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>₹{netBalance}</div></div>
             </div>

             <form onSubmit={(e) => { e.preventDefault(); push(ref(db, 'finance'), {...newFinance, amount: Number(newFinance.amount), date: new Date().toISOString()}); setNewFinance({...newFinance, amount:'', note:''}); }} className={`${cardStyle} p-6 sm:p-8`}>
               <h3 className="text-lg font-bold text-white mb-6">Add Entry</h3>
               <div className="flex gap-2 p-1.5 bg-zinc-950/80 rounded-xl mb-6 w-fit border border-zinc-800/80 shadow-inner">
                 <button type="button" onClick={()=>setNewFinance({...newFinance, category: 'Income'})} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${newFinance.category === 'Income' ? 'bg-green-500/20 text-green-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Income</button>
                 <button type="button" onClick={()=>setNewFinance({...newFinance, category: 'Expense'})} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${newFinance.category === 'Expense' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Expense</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                 <input type="number" placeholder="Amount" required className={inputStyle} value={newFinance.amount} onChange={e => setNewFinance({...newFinance, amount: e.target.value})} />
                 <select className={inputStyle} value={newFinance.type} onChange={e => setNewFinance({...newFinance, type: e.target.value})}><option value="Online">Online</option><option value="Cash">Cash</option><option value="Udhar">Udhar</option></select>
                 <input placeholder="Details" required={newFinance.category === 'Expense'} className={inputStyle} value={newFinance.note} onChange={e => setNewFinance({...newFinance, note: e.target.value})} />
                 <button type="submit" className={btnPrimary}>Save Entry</button>
               </div>
             </form>

             <div className={`${cardStyle} overflow-x-auto`}>
               <table className="w-full text-left text-sm min-w-[700px]">
                 <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-black border-b border-zinc-800/50 tracking-wider">
                   <tr><th className="p-5">Date</th><th className="p-5">Type</th><th className="p-5">Note</th><th className="p-5">Mode</th><th className="p-5">Amount</th><th className="p-5 text-center">Action</th></tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800/30">
                   {filteredFinance.map(f => (
                     <tr key={f.id} className="hover:bg-zinc-800/20 transition-colors duration-200 group">
                       <td className="p-5 text-xs font-mono text-zinc-400">{new Date(f.date).toLocaleDateString()}</td>
                       <td className="p-5"><span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${f.category === 'Expense' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>{f.category || 'Income'}</span></td>
                       <td className="p-5 text-white font-medium">{f.note || '---'}</td>
                       <td className="p-5 font-bold text-zinc-500 text-xs uppercase">{f.type}</td>
                       <td className={`p-5 font-black text-base ${f.category === 'Expense' ? 'text-rose-500' : 'text-green-400'}`}>{f.category === 'Expense' ? '-' : '+'}₹{f.amount}</td>
                       <td className="p-5 text-center"><button onClick={() => remove(ref(db, `finance/${f.id}`))} className="text-zinc-600 hover:text-rose-500 p-2"><Trash2 className="w-4 h-4"/></button></td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}

        {/* TAB 6: MEAL PASSES */}
        {tab === 'passes' && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div>
              <h3 className="text-white font-extrabold text-xl mb-6 border-b border-zinc-800/50 pb-3 flex items-center gap-2"><Users className="text-blue-500"/> Active Subscribers</h3>
              {editPassId && (
                <form onSubmit={(e) => { e.preventDefault(); update(ref(db, `meal_passes/${editPassId}`), editPassData); setEditPassId(null); }} className={`${cardStyle} p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 border-blue-500/30 shadow-blue-900/10`}>
                   <div className="sm:col-span-3 text-white font-bold flex items-center gap-2 mb-2"><Edit className="w-4 h-4 text-blue-400"/> Edit Subscriber Details</div>
                   <input placeholder="Name" required className={inputStyle} value={editPassData.name} onChange={e => setEditPassData({...editPassData, name: e.target.value})} />
                   <input placeholder="Phone" required className={inputStyle} value={editPassData.phone} onChange={e => setEditPassData({...editPassData, phone: e.target.value})} />
                   <input placeholder="Plan Name" required className={inputStyle} value={editPassData.plan} onChange={e => setEditPassData({...editPassData, plan: e.target.value})} />
                   <div className="sm:col-span-3 flex flex-col sm:flex-row gap-3 mt-4">
                     <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 transition-all active:scale-[0.98]">Update Sub</button>
                     <button type="button" onClick={() => setEditPassId(null)} className="flex-1 bg-zinc-800 text-white py-3.5 rounded-xl font-bold hover:bg-zinc-700 transition-all">Cancel</button>
                   </div>
                </form>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mealPassSubscribers.map(s => (
                  <div key={s.id} className={`${cardStyle} p-6 flex justify-between items-center hover:-translate-y-1 transition-all border-l-4 border-l-pink-500`}>
                    <div className="truncate pr-4">
                      <div className="text-white font-bold text-lg truncate mb-1">{s.name}</div>
                      <div className="text-xs text-zinc-400 font-mono">{s.phone}</div>
                      <div className="text-pink-400 font-black text-[10px] uppercase tracking-widest mt-3 bg-pink-500/10 inline-block px-3 py-1 rounded-lg border border-pink-500/20">{s.plan}</div>
                    </div>
                    <div className="flex flex-col gap-3 border-l border-zinc-800/80 pl-4">
                      <button onClick={() => { setEditPassId(s.id); setEditPassData({ name: s.name, phone: s.phone, plan: s.plan }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 p-2 rounded-lg transition-all"><Edit className="w-4 h-4"/></button>
                      <button onClick={() => remove(ref(db, `meal_passes/${s.id}`))} className="text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2 rounded-lg transition-all"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-white font-extrabold text-xl mb-6 border-b border-zinc-800/50 pb-3 flex items-center gap-2"><ShieldCheck className="text-orange-500"/> Manage Meal Pass Packages</h3>
              <form onSubmit={savePlan} className={`${cardStyle} p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-5 mb-8`}>
                 <input placeholder="Plan Name (e.g. Standard Pass)" required className={inputStyle} value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} />
                 <input placeholder="Price (₹)" type="number" required className={inputStyle} value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} />
                 <input placeholder="Duration (e.g. 30 Days)" required className={inputStyle} value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: e.target.value})} />
                 <input placeholder="Features (comma separated)" required className={inputStyle} value={newPlan.features} onChange={e => setNewPlan({...newPlan, features: e.target.value})} />
                 <button type="submit" className={`w-full md:col-span-2 ${btnPrimary}`}>{editPlanId ? 'Update Package' : 'Create New Package'}</button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {mealPassPlans.map(p => (
                  <div key={p.id} className={`${cardStyle} p-6 flex flex-col justify-between hover:shadow-orange-500/10 transition-shadow`}>
                    <div>
                      <div className="flex justify-between items-start mb-3"><div className="text-white font-bold text-xl">{p.name}</div><div className="text-orange-500 font-black text-xl">₹{p.price}</div></div>
                      <div className="text-xs text-zinc-400 mb-5 font-medium bg-zinc-900 inline-block px-3 py-1 rounded-md border border-zinc-800">{p.duration}</div>
                      <ul className="text-sm text-zinc-400 space-y-2 mb-6 font-medium">{p.features.split(',').map((f, i) => <li key={i} className="flex gap-2"><CheckCircle className="w-4 h-4 text-zinc-600 shrink-0"/> {f.trim()}</li>)}</ul>
                    </div>
                    <div className="flex gap-3 pt-5 border-t border-zinc-800/60 mt-auto">
                      <button onClick={() => { setEditPlanId(p.id); setNewPlan({ name: p.name, price: p.price, duration: p.duration, features: p.features }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 bg-zinc-800/50 hover:bg-blue-500/20 py-2.5 rounded-xl text-blue-400 font-bold transition-all text-xs">Edit</button>
                      <button onClick={() => remove(ref(db, `meal_pass_plans/${p.id}`))} className="flex-1 bg-zinc-800/50 hover:bg-rose-500/20 py-2.5 rounded-xl text-rose-500 font-bold transition-all text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 7: USER LOGINS */}
        {tab === 'users' && (
          <div className={`${cardStyle} overflow-x-auto animate-in fade-in duration-500`}>
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-black border-b border-zinc-800/50 tracking-wider">
                <tr><th className="p-5">Name</th><th className="p-5">Phone</th><th className="p-5">Password</th><th className="p-5 text-center">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {registeredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors group">
                    <td className="p-5 text-white font-bold">{u.name}</td>
                    <td className="p-5 font-mono text-zinc-400">{u.phone}</td>
                    <td className="p-5 text-orange-400/80 font-mono font-semibold tracking-widest">{u.password}</td>
                    <td className="p-5 text-center"><button onClick={() => remove(ref(db, `users/${u.id}`))} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* TAB 8: CATEGORIES */}
        {tab === 'categories' && (
          <div className="space-y-6 max-w-xl animate-in fade-in duration-500">
             <form onSubmit={(e) => { e.preventDefault(); if(!newCategoryName) return; push(ref(db, 'categories'), { name: newCategoryName }); setNewCategoryName(''); }} className="flex gap-3">
                <input placeholder="Enter New Category Name" className={`flex-1 ${inputStyle}`} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 rounded-xl font-bold hover:shadow-lg transition-all active:scale-[0.98]"><PlusCircle className="w-5 h-5"/></button>
             </form>
             <div className="grid grid-cols-1 gap-3">
               {categories.map(c => (
                 <div key={c.id} className={`${cardStyle} p-4 px-5 flex justify-between items-center hover:border-orange-500/30 transition-all group`}>
                   <div className="flex items-center gap-3"><Tags className="w-4 h-4 text-orange-500"/> <span className="text-white font-bold">{c.name}</span></div>
                   <button onClick={() => remove(ref(db, `categories/${c.id}`))} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* TAB 9: MANAGE MENU */}
        {tab === 'menu' && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <form onSubmit={saveItem} className={`${cardStyle} p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-5`}>
                <h3 className="md:col-span-2 text-xl font-extrabold text-white mb-2">{editId ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
                <input placeholder="Item Name" required className={inputStyle} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <input placeholder="Price (₹)" type="number" required className={inputStyle} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                <select required className={inputStyle} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  <option value="">Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <input placeholder="Drive Link or Image URL" className={inputStyle} value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                <textarea placeholder="Description (Optional)" className={`md:col-span-2 resize-none h-24 ${inputStyle}`} value={newItem.description || ''} onChange={e => setNewItem({...newItem, description: e.target.value})} />
                <button type="submit" className={`w-full md:col-span-2 mt-2 ${btnPrimary}`}>{editId ? 'Update Item' : 'Add to Menu'}</button>
             </form>
             
             {/* Category Filter Dropdown */}
             <div className="flex justify-between items-center bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/80">
               <div className="text-white font-bold flex items-center gap-2"><Utensils className="w-5 h-5 text-orange-500"/> Total Items: {menuItems.length}</div>
               <div className="flex items-center gap-3">
                 <Filter className="w-4 h-4 text-zinc-500"/>
                 <select className="bg-zinc-950 border border-zinc-800 text-white p-2.5 rounded-xl text-sm font-medium outline-none focus:border-orange-500 transition-colors cursor-pointer" value={adminCategoryFilter} onChange={(e) => setAdminCategoryFilter(e.target.value)}>
                   <option value="All">All Categories</option>
                   {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
               {menuItems.filter(m => adminCategoryFilter === 'All' || m.category === adminCategoryFilter).map(m => (
                 <div key={m.id} className={`${cardStyle} p-4 pr-5 flex justify-between items-center transition-all group hover:-translate-y-1 ${!m.inStock && 'opacity-60 border-red-500/20'}`}>
                   <div className="flex items-center gap-4 truncate pr-4">
                     <div className="relative flex-shrink-0 bg-zinc-950 rounded-2xl overflow-hidden flex items-center justify-center w-14 h-14 border border-zinc-800">
                       {m.image ? <img src={m.image} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!m.inStock && 'grayscale'}`} alt="" onError={(e) => e.target.src = '/logo.png'} /> : <span className="text-[10px] text-zinc-600 font-bold">NO IMG</span>}
                       {!m.inStock && <Ban className="absolute inset-0 m-auto text-red-500 w-6 h-6 drop-shadow-lg"/>}
                     </div>
                     <div className="truncate">
                       <div className={`font-bold text-base truncate mb-1 transition-colors ${m.inStock ? 'text-white group-hover:text-orange-400' : 'text-zinc-500 line-through'}`}>{m.name}</div>
                       <div className="text-[11px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 inline-block px-2 py-0.5 rounded border border-orange-500/20">₹{m.price} <span className="text-zinc-500 font-medium px-1">|</span> {m.category}</div>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => update(ref(db, `menu/${m.id}`), { inStock: !m.inStock })} className={`p-2.5 rounded-xl transition-all ${m.inStock ? 'bg-zinc-800/50 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`}>{m.inStock ? <Check className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}</button>
                     <button onClick={() => { setNewItem(m); setEditId(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2.5 bg-zinc-800/50 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><Edit className="w-4 h-4"/></button>
                     <button onClick={() => remove(ref(db, `menu/${m.id}`))} className="p-2.5 bg-zinc-800/50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* TAB 10: BULK UPDATE */}
        {tab === 'bulk' && (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-8 animate-in fade-in duration-500">
            <div className={`${cardStyle} p-10 sm:p-14 border-2 border-dashed border-zinc-700 hover:border-orange-500/50 flex flex-col items-center transition-all group cursor-pointer relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Upload className="w-14 h-14 text-orange-500 mb-6 group-hover:-translate-y-2 transition-transform duration-500" />
              <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" id="csvInput" />
              <label htmlFor="csvInput" className={`relative z-10 ${btnPrimary} px-10 cursor-pointer text-base inline-block`}>Upload CSV Menu</label>
              <p className="mt-6 text-xs text-zinc-500 font-bold uppercase tracking-widest relative z-10">Select your Menu Sheet</p>
            </div>
            <div className={`${cardStyle} p-8 sm:p-10 text-left`}>
               <h4 className="text-white font-extrabold mb-5 flex items-center gap-3 text-lg"><Download className="w-5 h-5 text-orange-500"/> Instructions</h4>
               <ul className="space-y-3 text-zinc-400 font-medium text-sm pl-8 list-decimal">
                 <li>Download the template below first.</li>
                 <li>Do not change column names (name, price, category, description).</li>
                 <li>Paste direct Google Drive link in image column.</li>
                 <li>New Categories will be auto-created if they don't exist.</li>
               </ul>
               <button onClick={downloadBulkTemplate} className="w-full mt-8 bg-zinc-800/80 border border-zinc-700 text-white py-4 rounded-xl font-bold hover:bg-zinc-700 hover:shadow-lg transition-all">Download Template</button>
            </div>
          </div>
        )}

        {/* TAB 11: FEEDBACKS */}
        {tab === 'feedbacks' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
            {feedbacks.map(f => (
              <div key={f.id} className={cardStyle}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="font-bold text-white text-lg">{f.userName}</h4>
                    <div className="flex gap-1 text-orange-500 mt-1">
                      {[...Array(5)].map((_, i) => <Star key={i} size={14} fill={i < f.rating ? "currentColor" : "none"} />)}
                    </div>
                  </div>
                  <button onClick={() => remove(ref(db, `feedbacks/${f.id}`))} className="text-zinc-600 hover:text-rose-500 transition-colors p-2 bg-zinc-950 rounded-xl"><Trash2 size={16}/></button>
                </div>
                <div className="text-xs text-orange-600 font-bold uppercase tracking-widest mb-2 bg-orange-500/10 inline-block px-2 py-0.5 rounded italic">Review for: {f.itemName}</div>
                <p className="text-sm text-zinc-400 font-medium leading-relaxed italic">"{f.comment}"</p>
                <div className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-4 text-right">{new Date(f.timestamp).toLocaleDateString()}</div>
              </div>
            ))}
            {feedbacks.length === 0 && <div className="col-span-full text-center py-20 text-zinc-600 font-bold uppercase tracking-widest">No feedbacks yet</div>}
          </div>
        )}

        {/* TAB 12: SETTINGS (With POS Details) */}
        {tab === 'settings' && (
          <div className={`max-w-2xl mx-auto ${cardStyle} p-8 sm:p-12 space-y-6 animate-in fade-in duration-500`}>
             <div className="flex items-center gap-3 mb-8 border-b border-zinc-800/50 pb-6">
               <div className="bg-orange-500/10 p-2.5 rounded-xl"><MapPin className="w-5 h-5 text-orange-500"/></div>
               <h3 className="text-white font-extrabold text-2xl tracking-tight">Store Settings</h3>
             </div>
             
             {/* Delivery Toggle */}
             <div className="flex items-center justify-between bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/80 mb-6">
                <div>
                  <h4 className="font-bold text-white">Delivery Service</h4>
                  <p className="text-xs text-zinc-500">Toggle delivery availability</p>
                </div>
                <button onClick={() => setContactDetails({...contactDetails, isDeliveryActive: !contactDetails.isDeliveryActive})} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${contactDetails.isDeliveryActive ? 'bg-green-500/20 text-green-500 border border-green-500/50' : 'bg-rose-500/20 text-rose-500 border border-rose-500/50'}`}>
                  {contactDetails.isDeliveryActive ? 'ON' : 'OFF'}
                </button>
             </div>

             <div className="grid grid-cols-2 gap-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/80 mb-6">
               <h4 className="col-span-2 text-sm font-bold text-white uppercase tracking-widest border-b border-zinc-800 pb-3 mb-2">Delivery Logic</h4>
               <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Base Charge (₹)</label>
               <input type="number" className={inputStyle} value={contactDetails.deliveryCharge !== undefined ? contactDetails.deliveryCharge : 30} onChange={e => setContactDetails({...contactDetails, deliveryCharge: e.target.value})} /></div>
               <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Free Above (₹)</label>
               <input type="number" className={inputStyle} value={contactDetails.freeDeliveryThreshold !== undefined ? contactDetails.freeDeliveryThreshold : 299} onChange={e => setContactDetails({...contactDetails, freeDeliveryThreshold: e.target.value})} /></div>
             </div>

             <div className="bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/80 mb-6 space-y-4">
                <h4 className="text-sm font-bold text-white uppercase tracking-widest border-b border-zinc-800 pb-3 mb-2">POS & Print Details</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Store Name (For Bill)</label><input className={inputStyle} value={contactDetails.storeName || ''} onChange={e => setContactDetails({...contactDetails, storeName: e.target.value})} /></div>
                  <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Next Bill No. (Auto)</label><input type="number" className={inputStyle} value={contactDetails.lastBillNumber || 1000} onChange={e => setContactDetails({...contactDetails, lastBillNumber: e.target.value})} /></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">GSTIN (Optional)</label><input className={inputStyle} value={contactDetails.gstNumber || ''} onChange={e => setContactDetails({...contactDetails, gstNumber: e.target.value})} /></div>
                  <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">FSSAI No (Optional)</label><input className={inputStyle} value={contactDetails.fssaiNumber || ''} onChange={e => setContactDetails({...contactDetails, fssaiNumber: e.target.value})} /></div>
                </div>
                <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Bill Footer Message</label><input className={inputStyle} value={contactDetails.billFooterMessage || ''} onChange={e => setContactDetails({...contactDetails, billFooterMessage: e.target.value})} /></div>
             </div>

             <div className="space-y-4 bg-zinc-950/50 p-6 rounded-2xl border border-zinc-800/80">
               <h4 className="text-sm font-bold text-white uppercase tracking-widest border-b border-zinc-800 pb-3 mb-2">Contact Info</h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">WhatsApp Number</label><input className={inputStyle} value={contactDetails?.phone || ''} onChange={e => setContactDetails({...contactDetails, phone: e.target.value})} /></div>
                 <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Landline / Alt Number</label><input className={inputStyle} value={contactDetails?.landline || ''} onChange={e => setContactDetails({...contactDetails, landline: e.target.value})} /></div>
               </div>
               <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Email ID</label><input className={inputStyle} value={contactDetails?.email || ''} onChange={e => setContactDetails({...contactDetails, email: e.target.value})} /></div>
               <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Instagram Username</label><input className={inputStyle} value={contactDetails?.instagram || ''} onChange={e => setContactDetails({...contactDetails, instagram: e.target.value})} /></div>
               <div><label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Full Address</label><input className={inputStyle} value={contactDetails?.address || ''} onChange={e => setContactDetails({...contactDetails, address: e.target.value})} /></div>
             </div>
             
             <button onClick={saveSettings} className={`w-full mt-8 ${btnPrimary} py-4 text-lg`}>Save Changes</button>
          </div>
        )}

      </div>
    </div>
  );
}

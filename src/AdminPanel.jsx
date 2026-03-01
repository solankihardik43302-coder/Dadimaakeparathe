import React, { useState, useEffect } from 'react';
import { 
  Lock, LogOut, Wallet, Calendar, Users, 
  Trash2, Check, Ban, Utensils, PlusCircle, Edit, Download, Tags, Eye, ShieldCheck, Upload
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, set, push, update, remove } from "firebase/database";
import Papa from 'papaparse';

const AdminLogin = ({ onLogin }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-300">
      <div className="bg-zinc-900 border border-zinc-800 p-6 sm:p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <div className="bg-orange-500/10 w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 sm:w-10 sm:h-10 text-orange-500" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2 text-center">Admin Access</h2>
        <input 
          type="password" 
          value={pwd} 
          onChange={e => setPwd(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && onLogin(pwd)} 
          className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white mb-6 outline-none focus:border-orange-500 text-center tracking-widest" 
          placeholder="••••••••" 
        />
        <button onClick={() => onLogin(pwd)} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl hover:bg-orange-500 transition-all">
          Unlock Dashboard
        </button>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [tab, setTab] = useState('overview');
  
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [mealPassSubscribers, setMealPassSubscribers] = useState([]);
  const [mealPassPlans, setMealPassPlans] = useState([]); 
  const [financeData, setFinanceData] = useState([]);
  const [visitors, setVisitors] = useState(0);
  const [contactDetails, setContactDetails] = useState({ phone: '', email: '', logo: '/logo.png', address: '', instagram: '' });

  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  const [newFinance, setNewFinance] = useState({ amount: '', type: 'Online', note: '' });
  const [newCategory, setNewCategory] = useState('');
  
  const [editId, setEditId] = useState(null);
  const [editPassId, setEditPassId] = useState(null);
  const [editPassData, setEditPassData] = useState({ name: '', phone: '', plan: '' });
  const [editPlanId, setEditPlanId] = useState(null);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', duration: '30 Days', features: '' });

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'orders'), snap => setOrders(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'users'), snap => setRegisteredUsers(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'meal_passes'), snap => setMealPassSubscribers(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'meal_pass_plans'), snap => setMealPassPlans(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'finance'), snap => setFinanceData(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })).reverse() : []));
    onValue(ref(db, 'stats/visitors'), snap => setVisitors(snap.val() || 0));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });
  }, [isAdminAuthenticated]);

  const filteredFinance = financeData.filter(f => {
    if (!dateFilter.from || !dateFilter.to) return true;
    const entryDate = new Date(f.date);
    return entryDate >= new Date(dateFilter.from) && entryDate <= new Date(dateFilter.to);
  });

  const totals = filteredFinance.reduce((acc, curr) => { 
    acc[curr.type] = (acc[curr.type] || 0) + curr.amount; 
    return acc; 
  }, { Online: 0, Cash: 0, Udhar: 0 });

  const downloadCSV = (data, filename) => {
    const csv = Papa.unparse(data);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a"); 
    link.href = URL.createObjectURL(blob); 
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link); 
    link.click(); 
    document.body.removeChild(link);
  };

  const downloadBulkTemplate = () => {
    const template = [{ name: 'Aloo Paratha', price: 60, category: 'Paratha', description: 'Fresh and hot', image: 'https://drive.google.com/file/d/XXXXX/view', allowAddons: true }];
    downloadCSV(template, "bulk_menu_template");
  };

  const convertDriveLink = (url) => {
    if (!url) return '';
    const driveRegex = /(?:drive\.google\.com\/file\/d\/|drive\.google\.com\/open\?id=)([\w-]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/$${match[1]}`;
    }
    return url; 
  };

  // =========================================================
  // AUTO CATEGORY CREATOR LOGIC INCLUDED HERE
  // =========================================================
  const handleBulkUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results) => {
        let count = 0;
        
        // Pehle se bani hui categories ke naam ka array (case-insensitive comparison ke liye)
        const existingCategoryNames = categories.map(c => c.name.toLowerCase());
        // Ek temporary array taaki same upload mein 2 baar ek hi category push na ho
        const newlyAddedCategories = [];

        results.data.forEach(item => {
          if (item.name && item.price) {
            
            // 1. Menu Item Upload karna
            const catName = item.category ? item.category.trim() : 'Uncategorized';
            push(ref(db, 'menu'), { 
              name: item.name.trim(), 
              price: Number(item.price) || 0, 
              category: catName, 
              description: item.description ? item.description.trim() : '', 
              image: convertDriveLink(item.image ? item.image.trim() : ''), 
              inStock: true, 
              allowAddons: String(item.allowAddons).toLowerCase() === 'true' 
            });
            count++;

            // 2. Category ko Auto-Create karna (agar wo missing hai)
            const catNameLower = catName.toLowerCase();
            if (!existingCategoryNames.includes(catNameLower) && !newlyAddedCategories.includes(catNameLower)) {
               push(ref(db, 'categories'), { name: catName });
               newlyAddedCategories.push(catNameLower); // Mark as added in this session
            }
            
          }
        });
        
        if (count > 0) {
          alert(`Success! ${count} Items Menu mein add ho gaye. \nSath hi nayi categories bhi auto-create ho gayi hain!`);
        } else {
          alert("Format error. Kripya template check karein.");
        }
        e.target.value = null; 
      }
    });
  };

  const saveItem = (e) => {
    e.preventDefault();
    if (!newItem.category) return alert('Category select karo!');
    const processedImage = convertDriveLink(newItem.image);
    const data = { ...newItem, price: Number(newItem.price), image: processedImage, inStock: true };
    
    if (editId) { 
      update(ref(db, `menu/${editId}`), data); 
      setEditId(null); 
    } else { 
      push(ref(db, 'menu'), data); 
    }
    setNewItem({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  };

  const savePlan = (e) => {
    e.preventDefault();
    const data = { ...newPlan, price: Number(newPlan.price) };
    if (editPlanId) { update(ref(db, `meal_pass_plans/${editPlanId}`), data); setEditPlanId(null); } 
    else { push(ref(db, 'meal_pass_plans'), data); }
    setNewPlan({ name: '', price: '', duration: '30 Days', features: '' });
  };

  if (!isAdminAuthenticated) return <AdminLogin onLogin={(p) => p === 'admin123' ? setIsAdminAuthenticated(true) : alert("Wrong Password")} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 p-2 sm:p-4 md:p-8 font-sans pb-24 overflow-x-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 border-b border-zinc-800 pb-4 sm:pb-6 gap-4">
          <h2 className="text-xl sm:text-2xl font-bold text-white">Dadi Maa Admin</h2>
          <button onClick={() => setIsAdminAuthenticated(false)} className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm transition-all hover:text-white flex items-center w-full sm:w-auto justify-center"><LogOut className="inline w-4 h-4 mr-2"/>Logout</button>
        </div>

        <div className="flex space-x-4 sm:space-x-6 border-b border-zinc-800 mb-6 sm:mb-8 overflow-x-auto pb-2 scrollbar-hide font-bold w-full">
          {['Overview', 'Finance Tracker', 'Recent Orders', 'Meal Passes', 'User Logins', 'Manage Categories', 'Manage Menu', 'Bulk Update', 'Settings'].map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase().replace(/ /g, ''))} className={`pb-2 sm:pb-4 text-xs sm:text-sm whitespace-nowrap transition-all ${tab === t.toLowerCase().replace(/ /g, '') ? 'text-orange-500 border-b-2 border-orange-500' : 'hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 animate-in fade-in">
            <div className="bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-purple-500"><div className="text-[10px] font-black mb-1 uppercase text-zinc-500">Visitors</div><div className="text-xl sm:text-2xl font-bold text-white">{visitors}</div></div>
            <div className="bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-orange-500"><div className="text-[10px] font-black mb-1 uppercase text-zinc-500">Orders</div><div className="text-xl sm:text-2xl font-bold text-white">{orders.length}</div></div>
            <div className="bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-blue-500"><div className="text-[10px] font-black mb-1 uppercase text-zinc-500">Users</div><div className="text-xl sm:text-2xl font-bold text-white">{registeredUsers.length}</div></div>
            <div className="bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-pink-500"><div className="text-[10px] font-black mb-1 uppercase text-zinc-500">Meal Pass</div><div className="text-xl sm:text-2xl font-bold text-white">{mealPassSubscribers.length}</div></div>
            <div className="bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-green-500 col-span-2 sm:col-span-1"><div className="text-[10px] font-black mb-1 uppercase text-zinc-500">Revenue</div><div className="text-xl sm:text-2xl font-bold text-white">₹{orders.reduce((sum, o) => sum + (o.total || 0), 0)}</div></div>
          </div>
        )}

        {tab === 'financetracker' && (
           <div className="space-y-6 animate-in fade-in">
             <div className="bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-zinc-800 flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="w-full md:flex-1"><label className="text-[10px] font-black uppercase mb-1 block">From Date</label><input type="date" className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-zinc-300" onChange={e => setDateFilter({...dateFilter, from: e.target.value})}/></div>
                <div className="w-full md:flex-1"><label className="text-[10px] font-black uppercase mb-1 block">To Date</label><input type="date" className="w-full bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none text-sm text-zinc-300" onChange={e => setDateFilter({...dateFilter, to: e.target.value})}/></div>
                <button onClick={() => downloadCSV(filteredFinance, "finance_report")} className="w-full md:w-auto bg-zinc-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 transition-all text-sm"><Download className="w-4 h-4"/> Download CSV</button>
             </div>
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
               <div className="bg-zinc-900 p-5 rounded-2xl border-l-4 border-l-green-500 border-zinc-800 font-bold">Online: ₹{totals.Online}</div>
               <div className="bg-zinc-900 p-5 rounded-2xl border-l-4 border-l-blue-500 border-zinc-800 font-bold">Cash: ₹{totals.Cash}</div>
               <div className="bg-zinc-900 p-5 rounded-2xl border-l-4 border-l-rose-500 border-zinc-800 font-bold">Udhar: ₹{totals.Udhar}</div>
             </div>
             <form onSubmit={(e) => { e.preventDefault(); push(ref(db, 'finance'), {...newFinance, amount: Number(newFinance.amount), date: new Date().toISOString()}); setNewFinance({amount:'', type:'Online', note:''}); }} className="bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-zinc-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
               <input type="number" placeholder="₹ Amount" required className="w-full bg-zinc-950 p-3 rounded-xl outline-none text-white" value={newFinance.amount} onChange={e => setNewFinance({...newFinance, amount: e.target.value})} />
               <select className="w-full bg-zinc-950 p-3 rounded-xl text-white outline-none" value={newFinance.type} onChange={e => setNewFinance({...newFinance, type: e.target.value})}><option value="Online">Online</option><option value="Cash">Cash</option><option value="Udhar">Udhar</option></select>
               <input placeholder="Note Details" className="w-full bg-zinc-950 p-3 rounded-xl outline-none text-white" value={newFinance.note} onChange={e => setNewFinance({...newFinance, note: e.target.value})} />
               <button type="submit" className="w-full bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-500 transition-all">Add Entry</button>
             </form>
             <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-x-auto">
               <table className="w-full text-left text-sm min-w-[600px]"><thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] font-black border-b border-zinc-800"><tr><th className="p-4">Date</th><th className="p-4">Note</th><th className="p-4">Type</th><th className="p-4">Amount</th><th className="p-4">Delete</th></tr></thead><tbody>{filteredFinance.map(f => (<tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/10"><td className="p-4 text-xs font-mono">{new Date(f.date).toLocaleDateString()}</td><td className="p-4 text-white font-bold">{f.note || '---'}</td><td className="p-4 font-black uppercase text-[10px]">{f.type}</td><td className="p-4 font-black text-white">₹{f.amount}</td><td className="p-4"><button onClick={() => remove(ref(db, `finance/${f.id}`))} className="text-zinc-700 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table>
             </div>
           </div>
        )}

        {tab === 'recentorders' && (
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden animate-in fade-in">
             {orders.map(o => (
               <div key={o.id} className="p-4 border-b border-zinc-800/50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-zinc-800/20 transition-all">
                 <div><div className="text-white font-bold text-sm sm:text-base">{o.customerName}</div><div className="text-xs text-zinc-500">{o.customerPhone} | {o.date}</div></div>
                 <div className="text-orange-400 font-black text-lg">₹{o.total}</div>
                 <div className="flex w-full sm:w-auto gap-2 justify-between sm:justify-end">
                   <button onClick={() => update(ref(db, `orders/${o.id}`), { status: o.status === 'Pending' ? 'Completed' : 'Pending' })} className={`px-4 py-2 sm:py-1 w-full sm:w-auto rounded-full text-[10px] font-black uppercase ${o.status === 'Pending' ? 'bg-orange-500/10 text-orange-500' : 'bg-green-500/10 text-green-500'}`}>{o.status}</button>
                   <button onClick={() => remove(ref(db, `orders/${o.id}`))} className="text-zinc-700 hover:text-red-500 p-2"><Trash2 className="w-4 h-4"/></button>
                 </div>
               </div>
             ))}
             {orders.length === 0 && <div className="p-10 text-center text-zinc-600 font-bold uppercase text-xs tracking-widest">No Recent Orders</div>}
          </div>
        )}

        {tab === 'mealpasses' && (
          <div className="space-y-12 animate-in fade-in">
            <div>
              <h3 className="text-white font-bold text-xl mb-4 border-b border-zinc-800 pb-2">Active Subscribers</h3>
              {editPassId && (
                <form onSubmit={(e) => { e.preventDefault(); update(ref(db, `meal_passes/${editPassId}`), editPassData); setEditPassId(null); }} className="bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-orange-500/50 grid grid-cols-1 sm:grid-cols-3 gap-4 shadow-xl mb-6">
                   <div className="sm:col-span-3 text-white font-bold flex items-center gap-2"><Edit className="w-4 h-4 text-orange-500"/> Edit Subscriber Details</div>
                   <input placeholder="Name" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={editPassData.name} onChange={e => setEditPassData({...editPassData, name: e.target.value})} />
                   <input placeholder="Phone" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={editPassData.phone} onChange={e => setEditPassData({...editPassData, phone: e.target.value})} />
                   <input placeholder="Plan Name" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={editPassData.plan} onChange={e => setEditPassData({...editPassData, plan: e.target.value})} />
                   <div className="sm:col-span-3 flex flex-col sm:flex-row gap-2 mt-2">
                     <button type="submit" className="flex-1 bg-orange-600 text-white py-3 rounded-xl font-bold hover:bg-orange-500">Update Sub</button>
                     <button type="button" onClick={() => setEditPassId(null)} className="flex-1 bg-zinc-800 text-white py-3 rounded-xl font-bold hover:bg-zinc-700">Cancel</button>
                   </div>
                </form>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealPassSubscribers.map(s => (
                  <div key={s.id} className="bg-zinc-900 p-5 sm:p-6 rounded-3xl border border-zinc-800 flex justify-between items-center shadow-lg border-l-4 border-l-pink-500">
                    <div className="truncate pr-4">
                      <div className="text-white font-bold truncate">{s.name}</div>
                      <div className="text-xs text-zinc-500">{s.phone}</div>
                      <div className="text-orange-500 font-black text-[10px] uppercase mt-2">{s.plan}</div>
                    </div>
                    <div className="flex flex-col gap-4 border-l border-zinc-800 pl-4">
                      <button onClick={() => { setEditPassId(s.id); setEditPassData({ name: s.name, phone: s.phone, plan: s.plan }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-blue-500 hover:text-white transition-colors"><Edit className="w-5 h-5"/></button>
                      <button onClick={() => remove(ref(db, `meal_passes/${s.id}`))} className="text-zinc-700 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5"/></button>
                    </div>
                  </div>
                ))}
                {mealPassSubscribers.length === 0 && <div className="col-span-full text-center p-6 text-zinc-600 font-bold uppercase tracking-widest">No Active Subs</div>}
              </div>
            </div>

            <div className="bg-zinc-900/50 p-4 sm:p-6 rounded-3xl border border-zinc-800">
              <h3 className="text-white font-bold text-xl mb-4 border-b border-zinc-800 pb-2 flex items-center gap-2"><ShieldCheck className="text-orange-500"/> Manage Meal Pass Packages</h3>
              <form onSubmit={savePlan} className="bg-zinc-900 p-4 sm:p-6 rounded-2xl border border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl mb-6">
                 <input placeholder="Plan Name (e.g. Standard Pass)" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} />
                 <input placeholder="Price (₹)" type="number" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} />
                 <input placeholder="Duration (e.g. 30 Days)" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newPlan.duration} onChange={e => setNewPlan({...newPlan, duration: e.target.value})} />
                 <input placeholder="Features (comma separated, e.g. 1 Meal, Free Delivery)" required className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newPlan.features} onChange={e => setNewPlan({...newPlan, features: e.target.value})} />
                 <button type="submit" className="w-full md:col-span-2 bg-orange-600 text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-orange-500 transition-all">{editPlanId ? 'Update Plan' : 'Create New Plan'}</button>
              </form>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {mealPassPlans.map(p => (
                  <div key={p.id} className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2"><div className="text-white font-bold text-lg">{p.name}</div><div className="text-orange-500 font-black">₹{p.price}</div></div>
                      <div className="text-xs text-zinc-500 mb-4">{p.duration}</div>
                      <ul className="text-xs text-zinc-400 space-y-1 mb-4">{p.features.split(',').map((f, i) => <li key={i}>✓ {f.trim()}</li>)}</ul>
                    </div>
                    <div className="flex gap-2 pt-4 border-t border-zinc-800">
                      <button onClick={() => { setEditPlanId(p.id); setNewPlan({ name: p.name, price: p.price, duration: p.duration, features: p.features }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 bg-zinc-900 py-2 rounded-lg text-blue-500 font-bold hover:text-white transition-all text-xs">Edit Plan</button>
                      <button onClick={() => remove(ref(db, `meal_pass_plans/${p.id}`))} className="flex-1 bg-zinc-900 py-2 rounded-lg text-rose-500 font-bold hover:text-white transition-all text-xs">Delete</button>
                    </div>
                  </div>
                ))}
                {mealPassPlans.length === 0 && <div className="col-span-full text-zinc-500 text-sm">No plans created yet.</div>}
              </div>
            </div>
          </div>
        )}

        {tab === 'userlogins' && (
          <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-x-auto animate-in fade-in">
            <table className="w-full text-left text-sm min-w-[500px]"><thead className="bg-zinc-950 text-zinc-500 uppercase text-[10px] font-black border-b border-zinc-800"><tr><th className="p-4">Name</th><th className="p-4">Phone</th><th className="p-4">Password</th><th className="p-4 text-center">Action</th></tr></thead><tbody>{registeredUsers.map(u => (<tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/10"><td className="p-4 text-white font-bold">{u.name}</td><td className="p-4 font-mono">{u.phone}</td><td className="p-4 text-orange-400 font-mono font-bold tracking-tighter">{u.password}</td><td className="p-4 text-center"><button onClick={() => remove(ref(db, `users/${u.id}`))} className="text-zinc-700 hover:text-red-500 transition-all"><Trash2 className="w-4 h-4"/></button></td></tr>))}</tbody></table>
          </div>
        )}

        {tab === 'managecategories' && (
          <div className="space-y-6 max-w-xl animate-in fade-in">
             <form onSubmit={(e) => { e.preventDefault(); if(!newCategory) return; push(ref(db, 'categories'), { name: newCategory }); setNewCategory(''); }} className="flex gap-2">
                <input placeholder="New Category Name" className="flex-1 w-full bg-zinc-900 border border-zinc-800 p-3 sm:p-4 rounded-2xl text-white outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
                <button type="submit" className="bg-orange-600 text-white px-6 rounded-2xl font-bold hover:bg-orange-500 transition-all"><PlusCircle/></button>
             </form>
             <div className="grid grid-cols-1 gap-2">
               {categories.map(c => <div key={c.id} className="bg-zinc-900 p-4 rounded-2xl border border-zinc-800 flex justify-between items-center hover:bg-zinc-800/50 transition-all"><div><Tags className="inline w-4 h-4 text-orange-500 mr-2"/> <span className="text-white font-medium">{c.name}</span></div><button onClick={() => remove(ref(db, `categories/${c.id}`))} className="text-zinc-700 hover:text-red-500"><Trash2 className="w-4 h-4"/></button></div>)}
             </div>
          </div>
        )}

        {tab === 'managemenu' && (
          <div className="space-y-8 animate-in fade-in">
             <form onSubmit={saveItem} className="bg-zinc-900 p-4 sm:p-6 rounded-3xl border border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4 shadow-xl">
                <input placeholder="Item Name" required className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <input placeholder="Price" type="number" required className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl text-white outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                <select required className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  <option value="">Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <input placeholder="Google Drive Link or Image URL" className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl text-white outline-none" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                <button type="submit" className="w-full md:col-span-2 bg-orange-600 text-white py-3 sm:py-4 rounded-xl font-black uppercase tracking-widest hover:bg-orange-500 transition-all">{editId ? 'Update Item' : 'Add to Menu'}</button>
             </form>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               {menuItems.map(m => (
                 <div key={m.id} className={`p-4 rounded-3xl border flex justify-between items-center transition-all ${m.inStock ? 'bg-zinc-900 border-zinc-800 hover:shadow-lg' : 'bg-red-900/10 border-red-900/50'}`}>
                   <div className="flex items-center gap-3 sm:gap-4 truncate pr-2">
                     <div className="relative flex-shrink-0 bg-zinc-950 rounded-xl overflow-hidden flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 border border-zinc-800">
                       {m.image ? <img src={m.image} className={`w-full h-full object-cover ${!m.inStock && 'grayscale opacity-50'}`} alt="" onError={(e) => e.target.src = '/logo.png'} /> : <span className="text-[10px] text-zinc-600">No Img</span>}
                       {!m.inStock && <Ban className="absolute inset-0 m-auto text-red-600 w-5 h-5 sm:w-6 sm:h-6"/>}
                     </div>
                     <div className="truncate"><div className={`font-bold text-sm sm:text-base truncate ${m.inStock ? 'text-white' : 'text-zinc-600 line-through'}`}>{m.name}</div><div className="text-[10px] sm:text-xs text-orange-500 font-bold uppercase tracking-tighter">₹{m.price} | {m.category}</div></div>
                   </div>
                   <div className="flex gap-1 sm:gap-2">
                     <button onClick={() => update(ref(db, `menu/${m.id}`), { inStock: !m.inStock })} className={`p-2 rounded-xl transition-all ${m.inStock ? 'bg-zinc-950 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-600 text-white'}`}>{m.inStock ? <Check className="w-3 h-3 sm:w-4 sm:h-4"/> : <Ban className="w-3 h-3 sm:w-4 sm:h-4"/>}</button>
                     <button onClick={() => { setNewItem(m); setEditId(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2 text-blue-500 hover:text-white transition-colors"><Edit className="w-4 h-4"/></button>
                     <button onClick={() => remove(ref(db, `menu/${m.id}`))} className="p-2 text-zinc-700 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4"/></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {tab === 'bulkupdate' && (
          <div className="max-w-xl mx-auto py-6 sm:py-10 text-center space-y-6 animate-in fade-in">
            <div className="bg-zinc-900 p-6 sm:p-10 rounded-[3rem] border-2 border-dashed border-zinc-800 flex flex-col items-center">
              <Upload className="w-10 h-10 sm:w-12 sm:h-12 text-orange-500 mb-4" />
              <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" id="csvInput" />
              <label htmlFor="csvInput" className="bg-orange-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold cursor-pointer hover:bg-orange-500 transition-all text-sm sm:text-base">Upload CSV Menu</label>
              <p className="mt-4 text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">Select your Menu Sheet</p>
            </div>
            <div className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 text-left">
               <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Download className="w-4 h-4 text-orange-500"/> Instructions</h4>
               <ul className="text-xs space-y-2 text-zinc-500 list-disc pl-4">
                 <li>Pehle niche button se template download karein.</li>
                 <li>Columns ko bilkul mat badlein (name, price, category).</li>
                 <li>Nayi Category auto-create ho jayegi agar wo exist nahi karti.</li>
               </ul>
               <button onClick={downloadBulkTemplate} className="w-full mt-6 bg-zinc-800 text-white py-3 rounded-xl font-bold hover:bg-zinc-700 transition-all text-sm">Download Template</button>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-xl mx-auto bg-zinc-900 p-6 sm:p-8 rounded-[2.5rem] border border-zinc-800 space-y-4 animate-in fade-in">
             <h3 className="text-white font-bold text-lg border-b border-zinc-800 pb-4 text-center">Store Settings</h3>
             <div><label className="text-[10px] uppercase font-black text-zinc-500 mb-1 block">WhatsApp No</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white outline-none" value={contactDetails.phone || ''} onChange={e => setContactDetails({...contactDetails, phone: e.target.value})} /></div>
             <div><label className="text-[10px] uppercase font-black text-zinc-500 mb-1 block">Email ID</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white outline-none" value={contactDetails.email || ''} onChange={e => setContactDetails({...contactDetails, email: e.target.value})} placeholder="hello@dadimaa.com"/></div>
             <div><label className="text-[10px] uppercase font-black text-zinc-500 mb-1 block">Instagram Username</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white outline-none" value={contactDetails.instagram || ''} onChange={e => setContactDetails({...contactDetails, instagram: e.target.value})} /></div>
             <div><label className="text-[10px] uppercase font-black text-zinc-500 mb-1 block">Address</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 sm:p-4 rounded-xl sm:rounded-2xl text-white outline-none" value={contactDetails.address || ''} onChange={e => setContactDetails({...contactDetails, address: e.target.value})} /></div>
             <button onClick={() => { set(ref(db, 'settings'), contactDetails); alert("Updates Saved!"); }} className="w-full bg-green-600 text-white py-3 sm:py-4 rounded-xl sm:rounded-2xl font-bold mt-4 shadow-lg active:scale-95 transition-all text-sm sm:text-base">Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

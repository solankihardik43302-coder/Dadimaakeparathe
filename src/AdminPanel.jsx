import React, { useState, useEffect } from 'react';
import { 
  Lock, LogOut, Wallet, Calendar, Users, 
  Trash2, Check, Ban, Utensils, PlusCircle, Edit, Download, Tags, Eye, ShieldCheck, Upload,
  TrendingUp, TrendingDown, DollarSign, MapPin // MapPin is required for Settings tab
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, set, push, update, remove } from "firebase/database";
import Papa from 'papaparse';

const AdminLogin = ({ onLogin }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-300 selection:bg-orange-500/30">
      <div className="bg-zinc-900/60 backdrop-blur-xl border border-zinc-800/60 p-8 sm:p-10 rounded-[2.5rem] max-w-sm w-full shadow-2xl shadow-black/50 animate-in zoom-in-95 duration-500 ease-out">
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
          className="w-full bg-zinc-950/50 border border-zinc-800/80 p-4 rounded-2xl text-white mb-6 outline-none focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 text-center tracking-[0.3em] font-black" 
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
  
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [mealPassSubscribers, setMealPassSubscribers] = useState([]);
  const [mealPassPlans, setMealPassPlans] = useState([]); 
  const [financeData, setFinanceData] = useState([]);
  const [visitors, setVisitors] = useState(0);
  
  // Default values to prevent undefined errors
  const [contactDetails, setContactDetails] = useState({ phone: '', email: '', logo: '/logo.png', address: '', instagram: '' });

  const [dateFilter, setDateFilter] = useState({ from: '', to: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  
  const [newFinance, setNewFinance] = useState({ amount: '', type: 'Online', note: '', category: 'Income' });
  const [newCategoryName, setNewCategoryName] = useState('');
  
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
    
    // SAFELY LOAD SETTINGS
    onValue(ref(db, 'settings'), snap => { 
      if (snap.exists()) {
        // Prevents overwriting the whole object if some fields are missing
        setContactDetails(prev => ({ ...prev, ...(snap.val() || {}) })); 
      }
    });
  }, [isAdminAuthenticated]);

  const filteredFinance = financeData.filter(f => {
    if (!dateFilter.from || !dateFilter.to) return true;
    const entryDate = new Date(f.date);
    return entryDate >= new Date(dateFilter.from) && entryDate <= new Date(dateFilter.to);
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let modeTotals = { Online: 0, Cash: 0, Udhar: 0 };

  filteredFinance.forEach(f => {
    const amt = Number(f.amount) || 0;
    if (f.category === 'Expense') {
      totalExpense += amt;
    } else {
      totalIncome += amt;
      if(f.type) modeTotals[f.type] = (modeTotals[f.type] || 0) + amt;
    }
  });

  const netBalance = totalIncome - totalExpense;

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
    if (match && match[1]) return `http://googleusercontent.com/profile/picture/5{match[1]}`;
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
              inStock: true, allowAddons: String(item.allowAddons).toLowerCase() === 'true' 
            });
            count++;
            const catNameLower = catName.toLowerCase();
            if (!existingCategoryNames.includes(catNameLower) && !newlyAddedCategories.includes(catNameLower)) {
               push(ref(db, 'categories'), { name: catName });
               newlyAddedCategories.push(catNameLower); 
            }
          }
        });
        if (count > 0) alert(`Success! ${count} Items uploaded & Categories synced.`); else alert("Format error."); 
        e.target.value = null; 
      }
    });
  };

  const saveItem = (e) => {
    e.preventDefault();
    if (!newItem.category) return alert('Category select karo!');
    const processedImage = convertDriveLink(newItem.image);
    const data = { ...newItem, price: Number(newItem.price), image: processedImage, inStock: true };
    if (editId) { update(ref(db, `menu/${editId}`), data); setEditId(null); } 
    else { push(ref(db, 'menu'), data); }
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

  const cardStyle = "bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/50 rounded-3xl shadow-lg";
  const inputStyle = "w-full bg-zinc-950/50 border border-zinc-800/80 p-3 sm:p-4 rounded-xl text-white outline-none focus:border-orange-500/50 focus:ring-2 focus:ring-orange-500/10 transition-all duration-300 font-medium text-sm";
  const btnPrimary = "bg-gradient-to-r from-orange-600 to-orange-500 text-white font-bold py-3 sm:py-4 rounded-xl shadow-lg shadow-orange-900/20 hover:shadow-orange-500/30 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-300 p-2 sm:p-4 md:p-8 font-sans pb-24 overflow-x-hidden selection:bg-orange-500/30">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-zinc-800/50 pb-6 gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500/10 p-2 rounded-xl border border-orange-500/20"><ShieldCheck className="w-6 h-6 text-orange-500"/></div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Console</h2>
          </div>
          <button onClick={() => setIsAdminAuthenticated(false)} className="bg-zinc-900/50 border border-zinc-800/80 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:bg-zinc-800 hover:text-white flex items-center w-full sm:w-auto justify-center group"><LogOut className="inline w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform"/>Logout</button>
        </div>

        {/* TABS */}
        <div className="flex space-x-2 border-b border-zinc-800/50 mb-8 overflow-x-auto pb-4 scrollbar-hide w-full animate-in fade-in duration-700">
          {['Overview', 'Finance Tracker', 'Recent Orders', 'Meal Passes', 'User Logins', 'Manage Categories', 'Manage Menu', 'Bulk Update', 'Settings'].map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase().replace(/ /g, ''))} className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 ${tab === t.toLowerCase().replace(/ /g, '') ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-inner' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50'}`}>{t}</button>
          ))}
        </div>

        {/* 1. OVERVIEW */}
        {tab === 'overview' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className={`${cardStyle} p-5 border-t-4 border-t-purple-500 hover:-translate-y-1 transition-transform duration-300`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500 tracking-wider">Visitors</div><div className="text-2xl sm:text-3xl font-extrabold text-white">{visitors}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-orange-500 hover:-translate-y-1 transition-transform duration-300`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500 tracking-wider">Total Orders</div><div className="text-2xl sm:text-3xl font-extrabold text-white">{orders.length}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-blue-500 hover:-translate-y-1 transition-transform duration-300`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500 tracking-wider">Registered Users</div><div className="text-2xl sm:text-3xl font-extrabold text-white">{registeredUsers.length}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-pink-500 hover:-translate-y-1 transition-transform duration-300`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500 tracking-wider">Active Passes</div><div className="text-2xl sm:text-3xl font-extrabold text-white">{mealPassSubscribers.length}</div></div>
            <div className={`${cardStyle} p-5 border-t-4 border-t-green-500 col-span-2 sm:col-span-1 hover:-translate-y-1 transition-transform duration-300`}><div className="text-[10px] font-bold mb-1 uppercase text-zinc-500 tracking-wider">Total Revenue</div><div className="text-2xl sm:text-3xl font-extrabold text-white">₹{orders.reduce((sum, o) => sum + (o.total || 0), 0)}</div></div>
          </div>
        )}

        {/* 2. FINANCE & EXPENSE TRACKER */}
        {tab === 'financetracker' && (
           <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
             <div className={`${cardStyle} p-5 sm:p-6 flex flex-col md:flex-row gap-4 items-start md:items-end`}>
                <div className="w-full md:flex-1"><label className="text-[10px] font-bold uppercase mb-2 block text-zinc-500 tracking-wider">From Date</label><input type="date" className={inputStyle} onChange={e => setDateFilter({...dateFilter, from: e.target.value})}/></div>
                <div className="w-full md:flex-1"><label className="text-[10px] font-bold uppercase mb-2 block text-zinc-500 tracking-wider">To Date</label><input type="date" className={inputStyle} onChange={e => setDateFilter({...dateFilter, to: e.target.value})}/></div>
                <button onClick={() => downloadCSV(filteredFinance, "finance_report")} className="w-full md:w-auto bg-zinc-800/80 border border-zinc-700 text-white px-6 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-zinc-700 hover:shadow-lg transition-all duration-300 text-sm"><Download className="w-4 h-4"/> Export CSV</button>
             </div>
             
             <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
               <div className={`${cardStyle} p-6 border-b-4 border-b-green-500 relative overflow-hidden`}>
                 <TrendingUp className="absolute -right-4 -bottom-4 w-24 h-24 text-green-500/10"/>
                 <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Total Income</div>
                 <div className="text-3xl font-extrabold text-green-500">₹{totalIncome}</div>
                 <div className="mt-3 text-xs font-medium text-zinc-400 flex gap-3"><span>Online: ₹{modeTotals.Online}</span><span>Cash: ₹{modeTotals.Cash}</span></div>
               </div>
               <div className={`${cardStyle} p-6 border-b-4 border-b-rose-500 relative overflow-hidden`}>
                 <TrendingDown className="absolute -right-4 -bottom-4 w-24 h-24 text-rose-500/10"/>
                 <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Total Expenses</div>
                 <div className="text-3xl font-extrabold text-rose-500">₹{totalExpense}</div>
                 <div className="mt-3 text-xs font-medium text-zinc-400">Purchases, Bills, Salaries etc.</div>
               </div>
               <div className={`${cardStyle} p-6 border-b-4 border-b-blue-500 relative overflow-hidden`}>
                 <DollarSign className="absolute -right-4 -bottom-4 w-24 h-24 text-blue-500/10"/>
                 <div className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider mb-2">Net Balance (Profit)</div>
                 <div className={`text-3xl font-extrabold ${netBalance >= 0 ? 'text-blue-400' : 'text-rose-500'}`}>₹{netBalance}</div>
                 <div className="mt-3 text-xs font-medium text-zinc-400">Income minus Expenses</div>
               </div>
             </div>

             <form onSubmit={(e) => { 
                e.preventDefault(); 
                push(ref(db, 'finance'), {...newFinance, amount: Number(newFinance.amount), date: new Date().toISOString()}); 
                setNewFinance({...newFinance, amount:'', note:''}); 
               }} 
               className={`${cardStyle} p-6 sm:p-8`}
             >
               <h3 className="text-lg font-bold text-white mb-6">Add New Entry</h3>
               <div className="flex gap-2 p-1.5 bg-zinc-950/80 rounded-xl mb-6 w-fit border border-zinc-800/80 shadow-inner">
                 <button type="button" onClick={()=>setNewFinance({...newFinance, category: 'Income'})} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${newFinance.category === 'Income' ? 'bg-green-500/20 text-green-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Income</button>
                 <button type="button" onClick={()=>setNewFinance({...newFinance, category: 'Expense'})} className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all duration-300 ${newFinance.category === 'Expense' ? 'bg-rose-500/20 text-rose-400 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>Expense</button>
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                 <input type="number" placeholder="Amount (₹)" required className={inputStyle} value={newFinance.amount} onChange={e => setNewFinance({...newFinance, amount: e.target.value})} />
                 <select className={inputStyle} value={newFinance.type} onChange={e => setNewFinance({...newFinance, type: e.target.value})}>
                    <option value="Online">Online</option>
                    <option value="Cash">Cash</option>
                    <option value="Udhar">Udhar</option>
                 </select>
                 <input placeholder={newFinance.category === 'Expense' ? "Details (e.g., Sabzi, Gas)" : "Details (Optional)"} required={newFinance.category === 'Expense'} className={inputStyle} value={newFinance.note} onChange={e => setNewFinance({...newFinance, note: e.target.value})} />
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
                       <td className="p-5">
                         <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${f.category === 'Expense' ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}>
                           {f.category || 'Income'}
                         </span>
                       </td>
                       <td className="p-5 text-white font-medium">{f.note || '---'}</td>
                       <td className="p-5 font-bold text-zinc-500 text-xs uppercase">{f.type}</td>
                       <td className={`p-5 font-black text-base ${f.category === 'Expense' ? 'text-rose-500' : 'text-green-400'}`}>
                         {f.category === 'Expense' ? '-' : '+'}₹{f.amount}
                       </td>
                       <td className="p-5 text-center">
                         <button onClick={() => remove(ref(db, `finance/${f.id}`))} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
               {filteredFinance.length === 0 && <div className="text-center p-10 text-zinc-600 font-semibold text-sm">No transactions found.</div>}
             </div>
           </div>
        )}

        {/* 3. RECENT ORDERS */}
        {tab === 'recentorders' && (
          <div className={`${cardStyle} overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out divide-y divide-zinc-800/50`}>
             {orders.map(o => (
               <div key={o.id} className="p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-zinc-800/30 transition-colors duration-300">
                 <div>
                   <div className="text-white font-bold text-base sm:text-lg mb-1">{o.customerName}</div>
                   <div className="text-xs text-zinc-500 font-medium font-mono bg-zinc-950/50 inline-block px-3 py-1 rounded-lg border border-zinc-800/50">{o.customerPhone} | {o.date}</div>
                 </div>
                 <div className="text-orange-500 font-black text-2xl tracking-tight">₹{o.total}</div>
                 <div className="flex w-full sm:w-auto gap-3 justify-between sm:justify-end items-center">
                   <button onClick={() => update(ref(db, `orders/${o.id}`), { status: o.status === 'Pending' ? 'Completed' : 'Pending' })} className={`px-5 py-2 w-full sm:w-auto rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-300 border ${o.status === 'Pending' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20 hover:bg-orange-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'}`}>{o.status}</button>
                   <button onClick={() => remove(ref(db, `orders/${o.id}`))} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-xl transition-all duration-300"><Trash2 className="w-5 h-5"/></button>
                 </div>
               </div>
             ))}
             {orders.length === 0 && <div className="p-16 text-center text-zinc-600 font-bold uppercase tracking-widest text-sm">No Recent Orders</div>}
          </div>
        )}

        {/* 4. MEAL PASSES */}
        {tab === 'mealpasses' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div>
              <h3 className="text-white font-extrabold text-xl mb-6 border-b border-zinc-800/50 pb-3 flex items-center gap-2"><Users className="text-blue-500"/> Active Subscribers</h3>
              {editPassId && (
                <form onSubmit={(e) => { e.preventDefault(); update(ref(db, `meal_passes/${editPassId}`), editPassData); setEditPassId(null); }} className={`${cardStyle} p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8 border-blue-500/30 shadow-blue-900/10`}>
                   <div className="sm:col-span-3 text-white font-bold flex items-center gap-2 mb-2"><Edit className="w-4 h-4 text-blue-400"/> Edit Subscriber Details</div>
                   <input placeholder="Name" required className={inputStyle} value={editPassData.name} onChange={e => setEditPassData({...editPassData, name: e.target.value})} />
                   <input placeholder="Phone" required className={inputStyle} value={editPassData.phone} onChange={e => setEditPassData({...editPassData, phone: e.target.value})} />
                   <input placeholder="Plan Name" required className={inputStyle} value={editPassData.plan} onChange={e => setEditPassData({...editPassData, plan: e.target.value})} />
                   <div className="sm:col-span-3 flex flex-col sm:flex-row gap-3 mt-4">
                     <button type="submit" className="flex-1 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-500 transition-all duration-300 active:scale-[0.98]">Update Sub</button>
                     <button type="button" onClick={() => setEditPassId(null)} className="flex-1 bg-zinc-800 text-white py-3.5 rounded-xl font-bold hover:bg-zinc-700 transition-all duration-300">Cancel</button>
                   </div>
                </form>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {mealPassSubscribers.map(s => (
                  <div key={s.id} className={`${cardStyle} p-6 flex justify-between items-center hover:-translate-y-1 transition-all duration-300 border-l-4 border-l-pink-500`}>
                    <div className="truncate pr-4">
                      <div className="text-white font-bold text-lg truncate mb-1">{s.name}</div>
                      <div className="text-xs text-zinc-400 font-mono">{s.phone}</div>
                      <div className="text-pink-400 font-black text-[10px] uppercase tracking-widest mt-3 bg-pink-500/10 inline-block px-3 py-1 rounded-lg border border-pink-500/20">{s.plan}</div>
                    </div>
                    <div className="flex flex-col gap-3 border-l border-zinc-800/80 pl-4">
                      <button onClick={() => { setEditPassId(s.id); setEditPassData({ name: s.name, phone: s.phone, plan: s.plan }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="text-blue-400 hover:text-white bg-blue-500/10 hover:bg-blue-500 p-2 rounded-lg transition-all duration-300"><Edit className="w-4 h-4"/></button>
                      <button onClick={() => remove(ref(db, `meal_passes/${s.id}`))} className="text-rose-500 hover:text-white bg-rose-500/10 hover:bg-rose-500 p-2 rounded-lg transition-all duration-300"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
                {mealPassSubscribers.length === 0 && <div className="col-span-full text-center p-12 text-zinc-600 font-bold uppercase tracking-widest text-sm">No Active Subs</div>}
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
                  <div key={p.id} className={`${cardStyle} p-6 flex flex-col justify-between hover:shadow-orange-500/10 transition-shadow duration-300`}>
                    <div>
                      <div className="flex justify-between items-start mb-3"><div className="text-white font-bold text-xl">{p.name}</div><div className="text-orange-500 font-black text-xl">₹{p.price}</div></div>
                      <div className="text-xs text-zinc-400 mb-5 font-medium bg-zinc-900 inline-block px-3 py-1 rounded-md border border-zinc-800">{p.duration}</div>
                      <ul className="text-sm text-zinc-400 space-y-2 mb-6 font-medium">{p.features.split(',').map((f, i) => <li key={i} className="flex gap-2"><CheckCircle className="w-4 h-4 text-zinc-600 shrink-0"/> {f.trim()}</li>)}</ul>
                    </div>
                    <div className="flex gap-3 pt-5 border-t border-zinc-800/60 mt-auto">
                      <button onClick={() => { setEditPlanId(p.id); setNewPlan({ name: p.name, price: p.price, duration: p.duration, features: p.features }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="flex-1 bg-zinc-800/50 hover:bg-blue-500/20 py-2.5 rounded-xl text-blue-400 font-bold transition-all duration-300 text-xs">Edit</button>
                      <button onClick={() => remove(ref(db, `meal_pass_plans/${p.id}`))} className="flex-1 bg-zinc-800/50 hover:bg-rose-500/20 py-2.5 rounded-xl text-rose-500 font-bold transition-all duration-300 text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 5. USER LOGINS */}
        {tab === 'userlogins' && (
          <div className={`${cardStyle} overflow-x-auto animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out`}>
            <table className="w-full text-left text-sm min-w-[500px]">
              <thead className="bg-zinc-950/50 text-zinc-500 uppercase text-[10px] font-black border-b border-zinc-800/50 tracking-wider">
                <tr><th className="p-5">Name</th><th className="p-5">Phone</th><th className="p-5">Password</th><th className="p-5 text-center">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/30">
                {registeredUsers.map(u => (
                  <tr key={u.id} className="hover:bg-zinc-800/20 transition-colors duration-200 group">
                    <td className="p-5 text-white font-bold">{u.name}</td>
                    <td className="p-5 font-mono text-zinc-400">{u.phone}</td>
                    <td className="p-5 text-orange-400/80 font-mono font-semibold tracking-widest">{u.password}</td>
                    <td className="p-5 text-center"><button onClick={() => remove(ref(db, `users/${u.id}`))} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. MANAGE CATEGORIES */}
        {tab === 'managecategories' && (
          <div className="space-y-6 max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
             <form onSubmit={(e) => { e.preventDefault(); if(!newCategoryName) return; push(ref(db, 'categories'), { name: newCategoryName }); setNewCategoryName(''); }} className="flex gap-3">
                <input placeholder="Enter New Category Name" className={`flex-1 ${inputStyle}`} value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} />
                <button type="submit" className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 rounded-xl font-bold hover:shadow-lg hover:shadow-orange-500/30 transition-all duration-300 active:scale-[0.98]"><PlusCircle className="w-5 h-5"/></button>
             </form>
             <div className="grid grid-cols-1 gap-3">
               {categories.map(c => (
                 <div key={c.id} className={`${cardStyle} p-4 px-5 flex justify-between items-center hover:border-orange-500/30 transition-all duration-300 group`}>
                   <div className="flex items-center gap-3"><Tags className="w-4 h-4 text-orange-500"/> <span className="text-white font-bold">{c.name}</span></div>
                   <button onClick={() => remove(ref(db, `categories/${c.id}`))} className="text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 p-2 rounded-lg transition-all duration-300 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* 7. MANAGE MENU */}
        {tab === 'managemenu' && (
          <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
             <form onSubmit={saveItem} className={`${cardStyle} p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-5`}>
                <h3 className="md:col-span-2 text-xl font-extrabold text-white mb-2">{editId ? 'Edit Menu Item' : 'Add New Menu Item'}</h3>
                <input placeholder="Item Name" required className={inputStyle} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                <input placeholder="Price (₹)" type="number" required className={inputStyle} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                <select required className={inputStyle} value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                  <option value="">Select Category</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
                <input placeholder="Google Drive Link or Image URL" className={inputStyle} value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
                <button type="submit" className={`w-full md:col-span-2 ${btnPrimary}`}>{editId ? 'Update Item' : 'Add to Menu'}</button>
             </form>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
               {menuItems.map(m => (
                 <div key={m.id} className={`${cardStyle} p-4 pr-5 flex justify-between items-center transition-all duration-300 group hover:-translate-y-1 ${!m.inStock && 'opacity-60 border-red-500/20'}`}>
                   <div className="flex items-center gap-4 truncate pr-4">
                     <div className="relative flex-shrink-0 bg-zinc-950 rounded-2xl overflow-hidden flex items-center justify-center w-14 h-14 border border-zinc-800">
                       {m.image ? <img src={m.image} className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${!m.inStock && 'grayscale'}`} alt="" onError={(e) => e.target.src = '/logo.png'} /> : <span className="text-[10px] text-zinc-600 font-bold">NO IMG</span>}
                       {!m.inStock && <Ban className="absolute inset-0 m-auto text-red-500 w-6 h-6 drop-shadow-lg"/>}
                     </div>
                     <div className="truncate">
                       <div className={`font-bold text-base truncate mb-1 transition-colors duration-300 ${m.inStock ? 'text-white group-hover:text-orange-400' : 'text-zinc-500 line-through'}`}>{m.name}</div>
                       <div className="text-[11px] text-orange-500 font-black uppercase tracking-widest bg-orange-500/10 inline-block px-2 py-0.5 rounded border border-orange-500/20">₹{m.price} <span className="text-zinc-500 font-medium px-1">|</span> {m.category}</div>
                     </div>
                   </div>
                   <div className="flex gap-2">
                     <button onClick={() => update(ref(db, `menu/${m.id}`), { inStock: !m.inStock })} className={`p-2.5 rounded-xl transition-all duration-300 ${m.inStock ? 'bg-zinc-800/50 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white'}`}>{m.inStock ? <Check className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}</button>
                     <button onClick={() => { setNewItem(m); setEditId(m.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="p-2.5 bg-zinc-800/50 text-blue-400 hover:bg-blue-500 hover:text-white rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"><Edit className="w-4 h-4"/></button>
                     <button onClick={() => remove(ref(db, `menu/${m.id}`))} className="p-2.5 bg-zinc-800/50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all duration-300 opacity-0 group-hover:opacity-100"><Trash2 className="w-4 h-4"/></button>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* 8. BULK UPDATE */}
        {tab === 'bulkupdate' && (
          <div className="max-w-2xl mx-auto py-10 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className={`${cardStyle} p-10 sm:p-14 border-2 border-dashed hover:border-orange-500/50 flex flex-col items-center transition-all duration-500 group cursor-pointer relative overflow-hidden`}>
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              <Upload className="w-14 h-14 text-orange-500 mb-6 group-hover:-translate-y-2 transition-transform duration-500" />
              <input type="file" accept=".csv" onChange={handleBulkUpload} className="hidden" id="csvInput" />
              <label htmlFor="csvInput" className={`relative z-10 ${btnPrimary} px-8 cursor-pointer text-base inline-block`}>Upload CSV Menu</label>
              <p className="mt-6 text-xs text-zinc-500 font-bold uppercase tracking-widest relative z-10">Select your Menu Sheet</p>
            </div>
            
            <div className={`${cardStyle} p-8 text-left`}>
               <h4 className="text-white font-extrabold mb-5 flex items-center gap-3 text-lg"><Download className="w-5 h-5 text-orange-500"/> Instructions</h4>
               <ul className="space-y-3 text-zinc-400 font-medium text-sm pl-8 list-decimal">
                 <li>Download the template below first.</li>
                 <li>Do not change column names (name, price, category).</li>
                 <li>Paste direct Google Drive link in image column.</li>
                 <li>New Categories will be auto-created if they don't exist.</li>
               </ul>
               <button onClick={downloadBulkTemplate} className="w-full mt-8 bg-zinc-800/80 border border-zinc-700 text-white py-4 rounded-xl font-bold hover:bg-zinc-700 hover:shadow-lg transition-all duration-300">Download Template</button>
            </div>
          </div>
        )}

        {/* ✅ 9. SETTINGS - NOW 100% CRASH-PROOF */}
        {tab === 'settings' && (
          <div className={`max-w-2xl mx-auto ${cardStyle} p-8 sm:p-12 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out`}>
             <div className="flex items-center gap-3 mb-8 border-b border-zinc-800/50 pb-6">
               <div className="bg-orange-500/10 p-2.5 rounded-xl"><MapPin className="w-5 h-5 text-orange-500"/></div>
               <h3 className="text-white font-extrabold text-2xl tracking-tight">Store Settings</h3>
             </div>
             
             {/* Note the use of "prev => ..." to prevent object wiping */}
             <div>
               <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">WhatsApp Number</label>
               <input className={inputStyle} value={contactDetails?.phone || ''} onChange={e => setContactDetails(prev => ({...prev, phone: e.target.value}))} />
             </div>
             <div>
               <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Email ID</label>
               <input className={inputStyle} value={contactDetails?.email || ''} onChange={e => setContactDetails(prev => ({...prev, email: e.target.value}))} placeholder="hello@dadimaa.com"/>
             </div>
             <div>
               <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Instagram Username</label>
               <input className={inputStyle} value={contactDetails?.instagram || ''} onChange={e => setContactDetails(prev => ({...prev, instagram: e.target.value}))} />
             </div>
             <div>
               <label className="text-[10px] uppercase font-bold text-zinc-500 mb-2 block tracking-widest">Full Address</label>
               <input className={inputStyle} value={contactDetails?.address || ''} onChange={e => setContactDetails(prev => ({...prev, address: e.target.value}))} />
             </div>
             
             <button onClick={() => { set(ref(db, 'settings'), contactDetails); alert("Store Settings Updated!"); }} className={`w-full mt-8 ${btnPrimary} py-4 text-lg`}>Save Changes</button>
          </div>
        )}
      </div>
    </div>
  );
}

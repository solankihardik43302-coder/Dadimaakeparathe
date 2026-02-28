import React, { useState, useEffect } from 'react';
import { 
  Lock, LogOut, Wallet, Calendar, Users, 
  Trash2, Check, Ban, Utensils, PlusCircle, Edit, Download, Tags, Eye, ShieldCheck
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, set, push, update, remove } from "firebase/database";

// Admin Login Component
const AdminLogin = ({ onLogin }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-300">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
        <div className="bg-orange-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-10 h-10 text-orange-500" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Admin Access</h2>
        <p className="text-zinc-500 text-sm mb-8">Secure dashboard for Dadi Maa Ke Parathe.</p>
        <input 
          type="password" 
          value={pwd} 
          onChange={e => setPwd(e.target.value)} 
          onKeyDown={e => e.key === 'Enter' && onLogin(pwd)}
          className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white mb-6 outline-none focus:border-orange-500 text-center text-lg tracking-widest transition-all" 
          placeholder="••••••••" 
        />
        <button onClick={() => onLogin(pwd)} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl hover:bg-orange-500 transition-all active:scale-[0.98]">
          Unlock Dashboard
        </button>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [tab, setTab] = useState('overview');
  
  // Real-time Database States
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [mealPassSubscribers, setMealPassSubscribers] = useState([]);
  const [visitors, setVisitors] = useState(0);
  const [contactDetails, setContactDetails] = useState({ 
    phone: '', logo: '/logo.png', address: '', instagram: '' 
  });

  // Form States
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  const [newAddon, setNewAddon] = useState({ name: '', price: '' });
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState(null);

  // Sync with Firebase
  useEffect(() => {
    if (!isAdminAuthenticated) return;

    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'addons'), snap => setAddons(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'orders'), snap => setOrders(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'users'), snap => setRegisteredUsers(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'meal_passes'), snap => setMealPassSubscribers(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'stats/visitors'), snap => setVisitors(snap.val() || 0));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });
  }, [isAdminAuthenticated]);

  const handleLogin = (pwd) => pwd === 'admin123' ? setIsAdminAuthenticated(true) : alert("Oops! Wrong Password.");

  // Excel/CSV Downloader
  const downloadData = (data, filename) => {
    if (data.length === 0) return alert("No data found to download!");
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(item => Object.values(item).map(v => typeof v === 'object' ? 'ItemsList' : String(v).replace(/,/g, ' ')).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + headers + "\n" + rows));
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isAdminAuthenticated) return <AdminLogin onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-zinc-800 pb-6 gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-600 w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-900/20">
              <Lock className="w-6 h-6 text-white"/>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">Dadi Maa Dashboard</h2>
              <p className="text-xs text-zinc-500 uppercase tracking-[0.2em] font-semibold">Administrator Panel</p>
            </div>
          </div>
          <button onClick={() => setIsAdminAuthenticated(false)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-zinc-800 hover:text-white transition-all">
            <LogOut className="w-4 h-4"/> Lock & Exit
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-2 md:space-x-6 border-b border-zinc-800 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['Overview', 'Recent Orders', 'Meal Passes', 'User Logins', 'Manage Categories', 'Manage Menu', 'Settings'].map(t => {
            const id = t.toLowerCase().replace(/ /g, '');
            return (
              <button 
                key={t} 
                onClick={() => setTab(id)} 
                className={`pb-4 px-2 text-sm font-bold whitespace-nowrap transition-all ${tab === id ? 'text-orange-500 border-b-2 border-orange-500' : 'hover:text-zinc-200'}`}
              >
                {t}
              </button>
            )
          })}
        </div>

        {/* --- OVERVIEW TAB: 5 BIG CARDS --- */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in duration-500">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-purple-500">
              <div className="flex justify-between mb-2 text-[10px] uppercase text-zinc-500 font-black tracking-widest">Visitors <Eye className="text-purple-500 w-4 h-4"/></div>
              <div className="text-3xl font-bold text-white tracking-tight">{visitors.toLocaleString()}</div>
              <div className="text-[9px] text-zinc-600 mt-2 font-bold">TOTAL PAGE VIEWS</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-blue-500">
              <div className="flex justify-between mb-2 text-[10px] uppercase text-zinc-500 font-black tracking-widest">Users <Users className="text-blue-500 w-4 h-4"/></div>
              <div className="text-3xl font-bold text-white tracking-tight">{registeredUsers.length}</div>
              <div className="text-[9px] text-zinc-600 mt-2 font-bold">REGISTERED ACCOUNTS</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-pink-500">
              <div className="flex justify-between mb-2 text-[10px] uppercase text-zinc-500 font-black tracking-widest">Subscribers <ShieldCheck className="text-pink-500 w-4 h-4"/></div>
              <div className="text-3xl font-bold text-white tracking-tight">{mealPassSubscribers.length}</div>
              <div className="text-[9px] text-zinc-600 mt-2 font-bold">ACTIVE MEAL PASSES</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-green-500">
              <div className="flex justify-between mb-2 text-[10px] uppercase text-zinc-500 font-black tracking-widest">Total Sales <Wallet className="text-green-500 w-4 h-4"/></div>
              <div className="text-3xl font-bold text-white tracking-tight">₹{orders.reduce((sum, o) => sum + (o.total || 0), 0)}</div>
              <div className="text-[9px] text-zinc-600 mt-2 font-bold">GROSS REVENUE</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 shadow-xl border-l-4 border-l-orange-500">
              <div className="flex justify-between mb-2 text-[10px] uppercase text-zinc-500 font-black tracking-widest">Pending <Calendar className="text-orange-500 w-4 h-4"/></div>
              <div className="text-3xl font-bold text-white tracking-tight">{orders.filter(o => o.status === 'Pending').length}</div>
              <div className="text-[9px] text-zinc-600 mt-2 font-bold">WAITING ORDERS</div>
            </div>
          </div>
        )}

        {/* --- RECENT ORDERS TAB --- */}
        {tab === 'recentorders' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Manage Orders</h3>
              <button onClick={() => downloadData(orders, "orders")} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-orange-500"><Download className="w-4 h-4"/> CSV Export</button>
            </div>
            <div className="bg-zinc-900 rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-[10px] text-zinc-500 uppercase font-black tracking-widest border-b border-zinc-800">
                  <tr><th className="p-6">Time</th><th className="p-6">Customer</th><th className="p-6">Total Bill</th><th className="p-6">Status</th><th className="p-6 text-center">Action</th></tr>
                </thead>
                <tbody className="text-sm">
                  {orders.map(o => (
                    <tr key={o.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="p-6 text-xs"><div className="text-white font-bold">{o.date}</div><div className="text-zinc-500">{o.time}</div></td>
                      <td className="p-6">
                        <div className="text-white font-bold">{o.customerName}</div>
                        <div className="text-xs text-zinc-500">{o.customerPhone}</div>
                      </td>
                      <td className="p-6 text-orange-400 font-black text-base">₹{o.total}</td>
                      <td className="p-6">
                        <button 
                          onClick={() => update(ref(db, `orders/${o.id}`), { status: o.status === 'Pending' ? 'Completed' : 'Pending' })}
                          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all ${o.status === 'Pending' ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' : 'bg-green-500/10 text-green-500 border border-green-500/20'}`}
                        >
                          {o.status}
                        </button>
                      </td>
                      <td className="p-6 text-center">
                        <button onClick={() => { if(window.confirm('Delete order?')) remove(ref(db, `orders/${o.id}`)); }} className="p-2.5 bg-zinc-950 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {orders.length === 0 && <div className="p-20 text-center text-zinc-600 font-bold uppercase tracking-widest">No Orders Yet</div>}
            </div>
          </div>
        )}

        {/* --- MEAL PASSES TAB --- */}
        {tab === 'mealpasses' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Pass Subscribers</h3>
              <button onClick={() => downloadData(mealPassSubscribers, "subscriptions")} className="text-xs bg-orange-600 text-white px-4 py-2 rounded-xl font-bold uppercase"><Download className="w-4 h-4 inline mr-2"/> CSV</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {mealPassSubscribers.map(s => (
                <div key={s.id} className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 flex justify-between items-start shadow-xl">
                  <div>
                    <div className="text-white font-bold text-lg">{s.name}</div>
                    <div className="text-zinc-500 text-xs mb-4">{s.phone}</div>
                    <div className="inline-block px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest">{s.plan}</div>
                  </div>
                  <button onClick={() => { if(window.confirm('Remove pass?')) remove(ref(db, `meal_passes/${s.id}`)); }} className="text-zinc-700 hover:text-rose-500"><Trash2 className="w-5 h-5"/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- USER LOGINS TAB --- */}
        {tab === 'userlogins' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">Member Directory</h3>
              <button onClick={() => downloadData(registeredUsers, "users")} className="text-xs bg-orange-600 text-white px-4 py-2 rounded-xl font-bold uppercase">Export Users</button>
            </div>
            <div className="bg-zinc-900 rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-[10px] text-zinc-500 uppercase font-black tracking-widest border-b border-zinc-800">
                  <tr><th className="p-6">Name</th><th className="p-6">User ID (Phone)</th><th className="p-6">Password</th><th className="p-6 text-center">Action</th></tr>
                </thead>
                <tbody>
                  {registeredUsers.map(u => (
                    <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-all">
                      <td className="p-6 text-white font-bold">{u.name}</td>
                      <td className="p-6 font-mono">{u.phone}</td>
                      <td className="p-6 text-orange-400 font-mono tracking-tighter font-bold">{u.password}</td>
                      <td className="p-6 text-center">
                        <button onClick={() => { if(window.confirm('Delete user?')) remove(ref(db, `users/${u.id}`)); }} className="p-2 bg-zinc-950 rounded-lg text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4"/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* --- MANAGE CATEGORIES TAB --- */}
        {tab === 'managecategories' && (
          <div className="space-y-8 animate-in fade-in max-w-2xl mx-auto">
            <form 
              onSubmit={(e) => { e.preventDefault(); push(ref(db, 'categories'), {name: newCategory}); setNewCategory(''); }}
              className="bg-zinc-900 p-6 rounded-[2rem] border border-zinc-800 flex gap-4"
            >
              <input 
                placeholder="New Category (e.g. Navratri Special)" 
                required 
                className="flex-1 bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500 transition-all" 
                value={newCategory} 
                onChange={e => setNewCategory(e.target.value)} 
              />
              <button type="submit" className="bg-orange-600 text-white p-4 rounded-2xl font-bold hover:bg-orange-500 px-6 active:scale-95 transition-all">
                <PlusCircle className="w-6 h-6"/>
              </button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categories.map(c => (
                <div key={c.id} className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center shadow-lg transition-all hover:border-zinc-700">
                  <div className="text-white font-bold flex items-center gap-3"><Tags className="w-4 h-4 text-orange-500"/> {c.name}</div>
                  <button onClick={() => { if(window.confirm('Delete category?')) remove(ref(db, `categories/${c.id}`)); }} className="text-zinc-700 hover:text-rose-500"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- MANAGE MENU TAB --- */}
        {tab === 'managemenu' && (
          <div className="space-y-8 animate-in fade-in">
            <form onSubmit={saveItem} className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6 shadow-2xl">
              <div className="md:col-span-2 text-white font-bold text-xl flex items-center gap-3">
                <Utensils className="text-orange-500"/> {editId ? 'Update Paratha' : 'Add New Item'}
              </div>
              <input placeholder="Item Name" required className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <input placeholder="Price (₹)" type="number" required className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <select required className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                <option value="" disabled>Select Category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input placeholder="Image URL (Optional)" className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white outline-none focus:border-orange-500" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
              <input placeholder="Description" className="bg-zinc-950 border border-zinc-800 p-4 rounded-2xl md:col-span-2 text-white outline-none focus:border-orange-500" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
              <div className="md:col-span-2 p-5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-zinc-900 transition-all">
                <input type="checkbox" id="addonsCB" checked={newItem.allowAddons} onChange={e => setNewItem({...newItem, allowAddons: e.target.checked})} className="w-5 h-5 accent-orange-600" />
                <label htmlFor="addonsCB" className="text-sm cursor-pointer select-none font-bold">Enable Extra Butter/Curd Add-ons for this item?</label>
              </div>
              <div className="md:col-span-2 flex gap-4">
                <button type="submit" className="flex-1 bg-orange-600 text-white p-4 rounded-2xl font-bold hover:bg-orange-500 shadow-xl active:scale-[0.98] transition-all">{editId ? 'Update Item' : 'Add to Live Menu'}</button>
                {editId && <button type="button" onClick={() => { setEditId(null); setNewItem({ name: '', price: '', category: '', description: '', image: '', allowAddons: true }); }} className="bg-zinc-800 text-white p-4 rounded-2xl font-bold px-8">Cancel</button>}
              </div>
            </form>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {menuItems.map(m => (
                <div key={m.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-[2rem] flex justify-between items-center shadow-lg transition-all hover:border-zinc-700">
                  <div className="flex items-center gap-5">
                    {m.image ? <img src={m.image} className={`w-16 h-16 rounded-2xl object-cover border-2 border-zinc-800 ${!m.inStock && 'grayscale'}`} alt=""/> : <Utensils className="w-16 h-16 p-5 bg-zinc-950 rounded-2xl text-zinc-700"/>}
                    <div>
                      <div className="text-white font-bold text-base leading-none mb-1">{m.name}</div>
                      <div className="text-xs font-bold text-orange-500">₹{m.price} <span className="text-zinc-600 ml-2 uppercase font-black tracking-widest">{m.category}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => update(ref(db, `menu/${m.id}`), { inStock: !m.inStock })} className={`p-2.5 rounded-xl transition-all ${m.inStock ? 'bg-zinc-950 text-green-500 hover:bg-green-500 hover:text-white' : 'bg-rose-500 text-white'}`} title="Stock Toggle">{m.inStock ? <Check className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}</button>
                     <button onClick={() => startEdit(m)} className="p-2.5 bg-zinc-950 rounded-xl text-blue-500 hover:bg-blue-500 hover:text-white transition-all"><Edit className="w-4 h-4"/></button>
                     <button onClick={() => { if(window.confirm('Delete item?')) remove(ref(db, `menu/${m.id}`)); }} className="p-2.5 bg-zinc-950 rounded-xl text-rose-500 hover:bg-rose-500 hover:text-white transition-all"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* --- SETTINGS TAB --- */}
        {tab === 'settings' && (
           <div className="grid md:grid-cols-2 gap-10 animate-in fade-in max-w-5xl mx-auto">
             <div className="bg-zinc-900 p-8 rounded-[2.5rem] border border-zinc-800 space-y-6 shadow-2xl">
               <h3 className="text-white font-bold text-lg border-b border-zinc-800 pb-3">Contact Information</h3>
               <div><label className="text-[10px] text-zinc-500 font-black uppercase mb-2 block">WhatsApp Number</label><input className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white" value={contactDetails.phone} onChange={e => setContactDetails({...contactDetails, phone: e.target.value})} placeholder="919876543210" /></div>
               <div><label className="text-[10px] text-zinc-500 font-black uppercase mb-2 block">Instagram Username</label><input className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white" value={contactDetails.instagram} onChange={e => setContactDetails({...contactDetails, instagram: e.target.value})} placeholder="dadimaakeparathe" /></div>
               <div><label className="text-[10px] text-zinc-500 font-black uppercase mb-2 block">Address</label><input className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white" value={contactDetails.address} onChange={e => setContactDetails({...contactDetails, address: e.target.value})} /></div>
               <div><label className="text-[10px] text-zinc-500 font-black uppercase mb-2 block">Logo URL</label><input className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white" value={contactDetails.logo} onChange={e => setContactDetails({...contactDetails, logo: e.target.value})} placeholder="/logo.png" /></div>
               <button onClick={() => { set(ref(db, 'settings'), contactDetails); alert("Success!"); }} className="bg-green-600 text-white px-6 py-4 rounded-2xl font-bold w-full active:scale-95 transition-all shadow-lg shadow-green-900/20">Update Store Settings</button>
             </div>
             
             <div className="bg-orange-950/10 p-8 rounded-[2.5rem] border border-orange-500/20 space-y-6 flex flex-col justify-center text-center">
                <div className="w-20 h-20 bg-orange-600/20 rounded-full flex items-center justify-center mx-auto mb-2"><ShieldCheck className="w-10 h-10 text-orange-500"/></div>
                <h3 className="text-orange-500 font-black text-2xl">One-Click Setup</h3>
                <p className="text-zinc-400 text-sm leading-relaxed font-medium px-4">Agar database empty hai, toh yahan se Default Categories aur Parathe load karein. Iske baad aap inhe Admin se manually edit kar payenge.</p>
                <button onClick={loadDummyData} className="bg-orange-600 hover:bg-orange-500 text-white px-8 py-5 rounded-[2rem] font-black tracking-widest text-xs transition-all shadow-2xl active:scale-95">LOAD DUMMY DATA BASE</button>
             </div>
           </div>
        )}

      </div>
    </div>
  );
}

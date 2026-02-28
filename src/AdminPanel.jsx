import React, { useState, useEffect } from 'react';
import { 
  Lock, LogOut, Wallet, Calendar, Users, 
  Trash2, Check, Ban, Utensils, PlusCircle, Edit, Download, Tags
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, set, push, update, remove } from "firebase/database";

const DUMMY_MENU = [
  { name: "Aloo Pyaz Paratha", price: 80, category: "Classic Parathas", description: "Crispy garma-garam paratha with spicy aloo and pyaz filling.", image: "https://images.unsplash.com/photo-1626779836967-0c7f3e8211db?auto=format&fit=crop&q=80&w=600&h=400", inStock: true, allowAddons: true },
  { name: "Paneer Cheese Paratha", price: 120, category: "Classic Parathas", description: "Rich paneer and melting cheese inside perfectly roasted crust.", image: "https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&q=80&w=600&h=400", inStock: true, allowAddons: true },
  { name: "Kulhad Chai", price: 30, category: "Beverages", description: "Kadak adrak wali chai, seedha mitti ke kulhad mein.", image: "https://images.unsplash.com/photo-1576092762791-dd9e2220afa1?auto=format&fit=crop&q=80&w=600&h=400", inStock: true, allowAddons: false },
];

const AdminLogin = ({ onLogin }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl">
        <div className="bg-orange-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-10 h-10 text-orange-500" /></div>
        <h2 className="text-2xl font-bold text-white mb-2">Admin Access</h2>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && onLogin(pwd)} className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white mb-6 outline-none focus:border-orange-500 text-center text-lg tracking-widest" placeholder="Enter Password" />
        <button onClick={() => onLogin(pwd)} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl hover:bg-orange-500 transition-colors">Unlock Dashboard</button>
      </div>
    </div>
  );
};

export default function AdminPanel() {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [tab, setTab] = useState('overview');
  
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [registeredUsers, setRegisteredUsers] = useState([]);
  const [mealPassSubscribers, setMealPassSubscribers] = useState([]); // Naya state
  const [visitors, setVisitors] = useState(0);
  
  const [contactDetails, setContactDetails] = useState({ 
    phone: '919876543210', logo: '/logo.png', address: 'Vijay Nagar, Indore, MP', instagram: 'dadimaakeparathe' 
  });

  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  const [newAddon, setNewAddon] = useState({ name: '', price: '' });
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'addons'), snap => setAddons(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'orders'), snap => setOrders(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'users'), snap => setRegisteredUsers(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'meal_passes'), snap => setMealPassSubscribers(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : [])); // Fetch Subscribers
    onValue(ref(db, 'stats/visitors'), snap => setVisitors(snap.val() || 0));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });
  }, [isAdminAuthenticated]);

  const handleLogin = (pwd) => pwd === 'admin123' ? setIsAdminAuthenticated(true) : alert("Galat Password!");

  const downloadData = (data, filename) => {
    if (data.length === 0) return alert("Download karne ke liye koi data nahi hai!");
    const headers = Object.keys(data[0]).join(",");
    const rows = data.map(item => Object.values(item).map(v => typeof v === 'object' && v !== null ? `"${JSON.stringify(v).replace(/"/g, '""')}"` : `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI("data:text/csv;charset=utf-8," + headers + "\n" + rows));
    link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const saveItem = (e) => {
    e.preventDefault();
    if (!newItem.category) return alert("Please select a category!");
    const itemData = { ...newItem, price: Number(newItem.price), inStock: true };
    if (editId) { update(ref(db, `menu/${editId}`), itemData); setEditId(null); alert("Item update ho gaya!"); } 
    else { push(ref(db, 'menu'), itemData); alert("Naya item add ho gaya!"); }
    setNewItem({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  };
  const startEdit = (item) => { setNewItem({ name: item.name, price: item.price, category: item.category, description: item.description || '', image: item.image || '', allowAddons: item.allowAddons ?? true }); setEditId(item.id); };
  const toggleStock = (id, current) => update(ref(db, `menu/${id}`), { inStock: !current });
  const deleteItem = (id) => { if(window.confirm("Delete karna hai?")) remove(ref(db, `menu/${id}`)); };

  const saveCategory = (e) => { e.preventDefault(); push(ref(db, 'categories'), { name: newCategory }); setNewCategory(''); };
  const deleteCategory = (id) => { if(window.confirm("Category delete karein? Is se jude items delete nahi honge.")) remove(ref(db, `categories/${id}`)); };

  const saveAddon = (e) => { e.preventDefault(); push(ref(db, 'addons'), { name: newAddon.name, price: Number(newAddon.price) }); setNewAddon({ name: '', price: '' }); };
  const deleteAddon = (id) => { if(window.confirm("Addon delete karein?")) remove(ref(db, `addons/${id}`)); };

  const deleteOrder = (id) => { if(window.confirm("Order hamesha ke liye delete karein?")) remove(ref(db, `orders/${id}`)); };
  const deleteUser = (id) => { if(window.confirm("Ye User account delete karein?")) remove(ref(db, `users/${id}`)); };
  const deleteSubscription = (id) => { if(window.confirm("Ye subscription delete karein?")) remove(ref(db, `meal_passes/${id}`)); }; // Delete Sub

  const toggleOrderStatus = (id, currentStatus) => update(ref(db, `orders/${id}`), { status: currentStatus === 'Pending' ? 'Completed' : 'Pending' });
  const saveSettings = () => { set(ref(db, 'settings'), contactDetails); alert("Settings save aur update ho gayi!"); };

  const loadDummyData = () => {
    ["Classic Parathas", "Student Combos", "Beverages"].forEach(c => push(ref(db, 'categories'), { name: c }));
    DUMMY_MENU.forEach(item => push(ref(db, 'menu'), item));
    push(ref(db, 'addons'), { name: "Extra White Butter", price: 20 });
    push(ref(db, 'addons'), { name: "Fresh Curd (Katori)", price: 30 });
    alert("Dummy Data Database mein load ho gaya! Ab Manage me jaake inhe Edit/Delete karein.");
  };

  if (!isAdminAuthenticated) return <AdminLogin onLogin={handleLogin} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 p-8 font-sans pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
          <div className="flex items-center gap-4">
            <div className="bg-orange-600 w-10 h-10 rounded-xl flex items-center justify-center"><Lock className="w-5 h-5 text-white"/></div>
            <div><h2 className="text-2xl font-bold text-white">Admin Central</h2></div>
          </div>
          <button onClick={() => setIsAdminAuthenticated(false)} className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm hover:text-white"><LogOut className="w-4 h-4"/> Logout</button>
        </div>

        <div className="flex space-x-6 border-b border-zinc-800 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['Overview', 'Recent Orders', 'Meal Passes', 'User Logins', 'Manage Categories', 'Manage Menu', 'Manage Add-ons', 'Settings'].map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase().replace(/ /g, '').replace('-', ''))} className={`pb-4 text-sm font-medium whitespace-nowrap transition-colors ${tab === t.toLowerCase().replace(/ /g, '').replace('-', '') ? 'text-orange-500 border-b-2 border-orange-500' : 'hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><div className="flex justify-between mb-2 text-xs uppercase text-zinc-500">Total Sales <Wallet className="text-green-500"/></div><div className="text-3xl font-bold text-white">₹{orders.reduce((sum, o) => sum + (o.total || 0), 0)}</div></div>
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><div className="flex justify-between mb-2 text-xs uppercase text-zinc-500">Pending Orders <Calendar className="text-orange-500"/></div><div className="text-3xl font-bold text-white">{orders.filter(o => o.status === 'Pending').length}</div></div>
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><div className="flex justify-between mb-2 text-xs uppercase text-zinc-500">Registered Users <Users className="text-blue-500"/></div><div className="text-3xl font-bold text-white">{registeredUsers.length}</div></div>
            <div className="bg-zinc-900 p-6 rounded-2xl border border-zinc-800"><div className="flex justify-between mb-2 text-xs uppercase text-zinc-500">Total Subscriptions <Users className="text-purple-500"/></div><div className="text-3xl font-bold text-white">{mealPassSubscribers.length}</div></div>
          </div>
        )}

        {tab === 'recentorders' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold">Recent Orders</h3>
              <button onClick={() => downloadData(orders, "orders_data")} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-500 transition-colors"><Download className="w-4 h-4"/> CSV</button>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-xs text-zinc-500 uppercase"><tr><th className="p-4">Date & Time</th><th className="p-4">Customer</th><th className="p-4">Total</th><th className="p-4">Status</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody className="text-sm">
                  {orders.map(o => (
                    <tr key={o.id} className="border-t border-zinc-800">
                      <td className="p-4"><div className="text-white">{o.date}</div><div className="text-xs text-zinc-500">{o.time}</div></td>
                      <td className="p-4"><div className="text-white">{o.customerName}</div><div className="text-xs text-zinc-500">{o.customerPhone}</div></td>
                      <td className="p-4 text-orange-400 font-bold">₹{o.total}</td>
                      <td className="p-4"><button onClick={() => toggleOrderStatus(o.id, o.status)} className={`px-3 py-1 rounded-full text-xs font-bold ${o.status === 'Pending' ? 'bg-orange-500/20 text-orange-500' : 'bg-green-500/20 text-green-500'}`}>{o.status}</button></td>
                      <td className="p-4 text-center"><button onClick={() => deleteOrder(o.id)} className="p-2 bg-zinc-800 rounded-lg text-rose-500 hover:bg-rose-500/20"><Trash2 className="w-4 h-4"/></button></td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan="5" className="p-4 text-center">Koi order nahi aaya abhi tak.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* NAYA TAB WAPAS AAGAYA: MEAL PASSES */}
        {tab === 'mealpasses' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold">Meal Pass Subscriptions</h3>
              <button onClick={() => downloadData(mealPassSubscribers, "meal_passes_data")} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-500 transition-colors"><Download className="w-4 h-4"/> CSV</button>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-xs text-zinc-500 uppercase"><tr><th className="p-4">Customer Name</th><th className="p-4">Phone Number</th><th className="p-4">Plan Selected</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody className="text-sm">
                  {mealPassSubscribers.map(s => (
                    <tr key={s.id} className="border-t border-zinc-800">
                      <td className="p-4 text-white font-bold">{s.name}</td>
                      <td className="p-4 text-zinc-400">{s.phone}</td>
                      <td className="p-4 text-orange-400 font-bold">{s.plan}</td>
                      <td className="p-4 text-center"><button onClick={() => deleteSubscription(s.id)} className="p-2 bg-zinc-800 rounded-lg text-rose-500 hover:bg-rose-500/20"><Trash2 className="w-4 h-4"/></button></td>
                    </tr>
                  ))}
                  {mealPassSubscribers.length === 0 && <tr><td colSpan="4" className="p-4 text-center">Abhi tak kisi ne Meal Pass nahi liya hai.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'userlogins' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-white font-bold">Registered Users</h3>
              <button onClick={() => downloadData(registeredUsers, "users_data")} className="flex items-center gap-2 bg-orange-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-500 transition-colors"><Download className="w-4 h-4"/> CSV</button>
            </div>
            <div className="bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-zinc-950 text-xs text-zinc-500 uppercase"><tr><th className="p-4">Customer Name</th><th className="p-4">Phone (User ID)</th><th className="p-4">Password</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody className="text-sm">
                  {registeredUsers.map(u => (
                    <tr key={u.id} className="border-t border-zinc-800">
                      <td className="p-4 text-white font-bold">{u.name}</td>
                      <td className="p-4 text-zinc-400">{u.phone}</td>
                      <td className="p-4 text-orange-400 font-mono tracking-wider">{u.password}</td>
                      <td className="p-4 text-center"><button onClick={() => deleteUser(u.id)} className="p-2 bg-zinc-800 rounded-lg text-rose-500 hover:bg-rose-500/20"><Trash2 className="w-4 h-4"/></button></td>
                    </tr>
                  ))}
                  {registeredUsers.length === 0 && <tr><td colSpan="4" className="p-4 text-center">Koi user registered nahi hai.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'managecategories' && (
          <div className="space-y-8">
            <form onSubmit={saveCategory} className="p-6 rounded-2xl border bg-zinc-900 border-zinc-800 flex flex-col md:flex-row gap-4 items-center">
              <input placeholder="New Category Name (e.g. Navratri Special)" required className="flex-1 w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newCategory} onChange={e => setNewCategory(e.target.value)} />
              <button type="submit" className="w-full md:w-auto bg-orange-600 text-white p-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2"><Tags className="w-5 h-5"/> Add Category</button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {categories.map(c => (
                <div key={c.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                  <div className="text-white font-bold">{c.name}</div>
                  <button onClick={() => deleteCategory(c.id)} className="p-2 bg-zinc-800 rounded-lg text-rose-500 hover:bg-rose-500/20"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
              {categories.length === 0 && <p className="text-zinc-500 p-4 col-span-3 text-center">Koi category nahi hai. Pehle Category add karein!</p>}
            </div>
          </div>
        )}

        {tab === 'managemenu' && (
           <div className="space-y-8">
            <form onSubmit={saveItem} className="p-6 rounded-2xl border bg-zinc-900 border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2 text-white font-bold text-lg border-b border-zinc-800 pb-2">{editId ? 'Update Item' : 'Add New Item'}</div>
              <input placeholder="Item Name" required className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              <input placeholder="Price (₹)" type="number" required className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              <select required className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newItem.category} onChange={e => setNewItem({...newItem, category: e.target.value})}>
                <option value="" disabled>Select Category</option>
                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
              <input placeholder="Image URL (Optional)" className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newItem.image} onChange={e => setNewItem({...newItem, image: e.target.value})} />
              <input placeholder="Description" className="bg-zinc-950 border border-zinc-800 p-3 rounded-xl md:col-span-2 text-white outline-none" value={newItem.description} onChange={e => setNewItem({...newItem, description: e.target.value})} />
              <div className="md:col-span-2 p-4 bg-zinc-950 border border-zinc-800 rounded-xl flex items-center gap-3 mt-2">
                <input type="checkbox" id="addonsCheckbox" checked={newItem.allowAddons} onChange={e => setNewItem({...newItem, allowAddons: e.target.checked})} className="w-5 h-5 accent-orange-600" />
                <label htmlFor="addonsCheckbox" className="text-white cursor-pointer select-none">
                  <span className="font-bold">Allow Add-ons</span> <span className="text-sm text-zinc-500 block">Yes/No: Iske sath Extra Butter jaisa option dikhana hai?</span>
                </label>
              </div>
              <div className="md:col-span-2 flex gap-4 mt-2">
                <button type="submit" className="flex-1 bg-orange-600 text-white p-3 rounded-xl font-bold">{editId ? 'Update Item' : 'Add to Menu'}</button>
                {editId && <button type="button" onClick={() => setEditId(null)} className="bg-zinc-800 p-3 rounded-xl text-white">Cancel</button>}
              </div>
            </form>

            <div className="space-y-3">
              {menuItems.map(m => (
                <div key={m.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    {m.image ? <img src={m.image} className="w-12 h-12 rounded-lg object-cover" alt=""/> : <Utensils className="w-12 h-12 p-3 bg-zinc-800 rounded-lg"/>}
                    <div><div className="text-white font-bold">{m.name}</div><div className="text-xs text-zinc-400">₹{m.price} • {m.category}</div></div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => toggleStock(m.id, m.inStock)} className={`p-2 rounded-lg ${m.inStock ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{m.inStock ? <Check className="w-4 h-4"/> : <Ban className="w-4 h-4"/>}</button>
                     <button onClick={() => startEdit(m)} className="p-2 bg-zinc-800 rounded-lg text-blue-500"><Edit className="w-4 h-4"/></button>
                     <button onClick={() => deleteItem(m.id)} className="p-2 bg-zinc-800 rounded-lg text-rose-500"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'manageaddons' && (
          <div className="space-y-8">
            <form onSubmit={saveAddon} className="p-6 rounded-2xl border bg-zinc-900 border-zinc-800 flex flex-col md:flex-row gap-4 items-center">
              <input placeholder="Addon Name (e.g. Extra Butter)" required className="flex-1 w-full bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newAddon.name} onChange={e => setNewAddon({...newAddon, name: e.target.value})} />
              <input placeholder="Price (₹)" type="number" required className="w-full md:w-32 bg-zinc-950 border border-zinc-800 p-3 rounded-xl text-white outline-none" value={newAddon.price} onChange={e => setNewAddon({...newAddon, price: e.target.value})} />
              <button type="submit" className="w-full md:w-auto bg-orange-600 text-white p-3 px-6 rounded-xl font-bold flex items-center justify-center gap-2"><PlusCircle className="w-5 h-5"/> Add</button>
            </form>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {addons.map(a => (
                <div key={a.id} className="p-4 bg-zinc-900 border border-zinc-800 rounded-xl flex justify-between items-center">
                  <div><div className="text-white font-bold">{a.name}</div><div className="text-orange-500 font-bold">+ ₹{a.price}</div></div>
                  <button onClick={() => deleteAddon(a.id)} className="p-2 bg-zinc-800 rounded-lg text-rose-500"><Trash2 className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'settings' && (
           <div className="grid md:grid-cols-2 gap-8">
             <div className="bg-zinc-900 p-8 rounded-2xl border border-zinc-800 space-y-4">
               <h3 className="text-white font-bold mb-4">Contact & Social Info</h3>
               <div><label className="text-xs text-zinc-500 uppercase">WhatsApp Number (Bina + ke)</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white outline-none focus:border-orange-500" value={contactDetails.phone} onChange={e => setContactDetails({...contactDetails, phone: e.target.value})} /></div>
               <div><label className="text-xs text-zinc-500 uppercase">Instagram ID (Sirf Username)</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white outline-none focus:border-orange-500" value={contactDetails.instagram} onChange={e => setContactDetails({...contactDetails, instagram: e.target.value})} /></div>
               <div><label className="text-xs text-zinc-500 uppercase">Shop Address</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white outline-none focus:border-orange-500" value={contactDetails.address} onChange={e => setContactDetails({...contactDetails, address: e.target.value})} /></div>
               <div><label className="text-xs text-zinc-500 uppercase">Logo Image URL</label><input className="w-full bg-zinc-950 border border-zinc-800 p-3 rounded-lg text-white outline-none focus:border-orange-500" value={contactDetails.logo} onChange={e => setContactDetails({...contactDetails, logo: e.target.value})} /></div>
               <button onClick={saveSettings} className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold mt-4 w-full shadow-lg">Save Settings</button>
             </div>
             <div className="bg-orange-900/10 p-8 rounded-2xl border border-orange-500/20 space-y-4 flex flex-col justify-center text-center">
                <h3 className="text-orange-500 font-bold text-xl">Fix Menu Data</h3>
                <p className="text-zinc-400 text-sm">Agar website par categories ya menu show nahi ho raha, toh is button par click karein.</p>
                <button onClick={loadDummyData} className="bg-orange-600 hover:bg-orange-500 text-white px-6 py-4 rounded-xl font-bold transition-all shadow-lg mt-4">Load Default Dummy Data</button>
             </div>
           </div>
        )}
      </div>
    </div>
  );
}
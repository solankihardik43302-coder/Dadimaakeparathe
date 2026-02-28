import React, { useState, useEffect } from 'react';
import { 
  Lock, LogOut, Wallet, Calendar, Users, 
  Trash2, Check, Ban, Utensils, PlusCircle, Edit, Download, Tags, Eye, ShieldCheck, Banknote, CreditCard, Clock
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, set, push, update, remove } from "firebase/database";

const AdminLogin = ({ onLogin }) => {
  const [pwd, setPwd] = useState('');
  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 font-sans text-zinc-300">
      <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95">
        <div className="bg-orange-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"><Lock className="w-10 h-10 text-orange-500" /></div>
        <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">Admin Access</h2>
        <input type="password" value={pwd} onChange={e => setPwd(e.target.value)} onKeyDown={e => e.key === 'Enter' && onLogin(pwd)} className="w-full bg-zinc-950 border border-zinc-800 p-4 rounded-2xl text-white mb-6 outline-none focus:border-orange-500 text-center text-lg tracking-widest" placeholder="••••••••" />
        <button onClick={() => onLogin(pwd)} className="w-full bg-orange-600 text-white font-bold py-4 rounded-2xl hover:bg-orange-500 transition-all">Unlock Dashboard</button>
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
  const [visitors, setVisitors] = useState(0);
  const [financeData, setFinanceData] = useState([]);
  const [contactDetails, setContactDetails] = useState({ phone: '', logo: '/logo.png', address: '', instagram: '' });
  const [newItem, setNewItem] = useState({ name: '', price: '', category: '', description: '', image: '', allowAddons: true });
  const [newFinance, setNewFinance] = useState({ amount: '', type: 'Online', note: '' });
  const [newCategory, setNewCategory] = useState('');
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    if (!isAdminAuthenticated) return;
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'orders'), snap => setOrders(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'users'), snap => setRegisteredUsers(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'meal_passes'), snap => setMealPassSubscribers(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'finance'), snap => setFinanceData(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })).reverse() : []));
    onValue(ref(db, 'stats/visitors'), snap => setVisitors(snap.val() || 0));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });
  }, [isAdminAuthenticated]);

  const totals = financeData.reduce((acc, curr) => {
    acc[curr.type] = (acc[curr.type] || 0) + curr.amount;
    return acc;
  }, { Online: 0, Cash: 0, Udhar: 0 });

  if (!isAdminAuthenticated) return <AdminLogin onLogin={(pwd) => pwd === 'admin123' ? setIsAdminAuthenticated(true) : alert("Wrong Password")} />;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-400 p-4 md:p-8 font-sans pb-24">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-10 border-b border-zinc-800 pb-6">
          <h2 className="text-2xl font-bold text-white">Dadi Maa Dashboard</h2>
          <button onClick={() => setIsAdminAuthenticated(false)} className="bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-sm hover:text-white transition-all"><LogOut className="w-4 h-4 inline mr-2"/>Logout</button>
        </div>

        <div className="flex space-x-6 border-b border-zinc-800 mb-8 overflow-x-auto pb-2 scrollbar-hide">
          {['Overview', 'Finance Tracker', 'Recent Orders', 'Meal Passes', 'User Logins', 'Manage Menu', 'Settings'].map(t => (
            <button key={t} onClick={() => setTab(t.toLowerCase().replace(/ /g, ''))} className={`pb-4 text-sm font-bold whitespace-nowrap transition-all ${tab === t.toLowerCase().replace(/ /g, '') ? 'text-orange-500 border-b-2 border-orange-500' : 'hover:text-white'}`}>{t}</button>
          ))}
        </div>

        {tab === 'overview' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 animate-in fade-in">
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-purple-500 shadow-xl">
              <div className="flex justify-between mb-2 text-[10px] uppercase font-black">Visitors <Eye className="text-purple-500 w-4 h-4"/></div>
              <div className="text-2xl font-bold text-white">{visitors}</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-green-500 shadow-xl">
              <div className="flex justify-between mb-2 text-[10px] uppercase font-black">Online <CreditCard className="text-green-500 w-4 h-4"/></div>
              <div className="text-2xl font-bold text-white">₹{totals.Online}</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-blue-500 shadow-xl">
              <div className="flex justify-between mb-2 text-[10px] uppercase font-black">Cash <Banknote className="text-blue-500 w-4 h-4"/></div>
              <div className="text-2xl font-bold text-white">₹{totals.Cash}</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-rose-500 shadow-xl">
              <div className="flex justify-between mb-2 text-[10px] uppercase font-black">Udhar <Clock className="text-rose-500 w-4 h-4"/></div>
              <div className="text-2xl font-bold text-white">₹{totals.Udhar}</div>
            </div>
            <div className="bg-zinc-900 p-5 rounded-2xl border border-zinc-800 border-l-4 border-l-orange-500 shadow-xl">
              <div className="flex justify-between mb-2 text-[10px] uppercase font-black">Orders <Calendar className="text-orange-500 w-4 h-4"/></div>
              <div className="text-2xl font-bold text-white">{orders.length}</div>
            </div>
          </div>
        )}

        {tab === 'financetracker' && (
          <div className="space-y-8 animate-in fade-in">
            <form onSubmit={(e) => { e.preventDefault(); push(ref(db, 'finance'), { ...newFinance, amount: Number(newFinance.amount), date: new Date().toLocaleDateString() }); setNewFinance({ amount: '', type: 'Online', note: '' }); }} className="bg-zinc-900 p-6 rounded-3xl border border-zinc-800 grid grid-cols-1 md:grid-cols-4 gap-4">
              <input type="number" placeholder="Amount (₹)" required className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none" value={newFinance.amount} onChange={e => setNewFinance({...newFinance, amount: e.target.value})} />
              <select className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none" value={newFinance.type} onChange={e => setNewFinance({...newFinance, type: e.target.value})}>
                <option value="Online">Online Payment</option>
                <option value="Cash">Cash Payment</option>
                <option value="Udhar">Udhar (Credit)</option>
              </select>
              <input placeholder="Note (Name/Detail)" className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 outline-none" value={newFinance.note} onChange={e => setNewFinance({...newFinance, note: e.target.value})} />
              <button type="submit" className="bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-500 transition-all">Add Entry</button>
            </form>
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-950 text-[10px] uppercase font-black tracking-widest border-b border-zinc-800 text-zinc-500"><tr ><th className="p-4">Date</th><th className="p-4">Note</th><th className="p-4">Type</th><th className="p-4">Amount</th><th className="p-4 text-center">Action</th></tr></thead>
                <tbody>
                  {financeData.map(f => (
                    <tr key={f.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/10">
                      <td className="p-4 text-xs">{f.date}</td>
                      <td className="p-4 text-white font-bold">{f.note || '---'}</td>
                      <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.type === 'Online' ? 'bg-green-500/10 text-green-500' : f.type === 'Cash' ? 'bg-blue-500/10 text-blue-500' : 'bg-rose-500/10 text-rose-500'}`}>{f.type}</span></td>
                      <td className="p-4 font-bold text-white">₹{f.amount}</td>
                      <td className="p-4 text-center"><button onClick={() => remove(ref(db, `finance/${f.id}`))} className="text-zinc-600 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4"/></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ... (Baki Tabs ke liye bhi same code structure rahega) */}
      </div>
    </div>
  );
}

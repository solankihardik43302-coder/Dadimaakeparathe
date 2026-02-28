import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ArrowRight, Plus, Minus, Heart, Flame, ShieldCheck,
  LogOut, CheckCircle, Utensils, MapPin, Instagram, X
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, push, set, get } from "firebase/database";

export default function UserApp() {
  const [currentView, setCurrentView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [categories, setCategories] = useState([]);
  
  const [contactDetails, setContactDetails] = useState({ 
    phone: '919876543210', logo: 'https://images.unsplash.com/photo-1565557612110-381dd275225c?auto=format&fit=crop&q=80&w=200&h=200', address: 'Vijay Nagar, Indore, MP', instagram: 'dadimaakeparathe' 
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedItemForAddon, setSelectedItemForAddon] = useState(null);
  const [currentAddons, setCurrentAddons] = useState([]);
  const [orderSuccess, setOrderSuccess] = useState(false);

  useEffect(() => {
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })) : []));
    onValue(ref(db, 'addons'), snap => setAddons(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })) : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, name: x.name })) : []));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });

    const visited = sessionStorage.getItem('visited');
    if (!visited) {
      get(ref(db, 'stats/visitors')).then(snap => {
        set(ref(db, 'stats/visitors'), snap.exists() ? snap.val() + 1 : 1);
        sessionStorage.setItem('visited', 'true');
      });
    }
  }, []);

  const filteredMenu = selectedCategory === "All" ? menuItems : menuItems.filter(item => item.category === selectedCategory);
  const cartTotal = cart.reduce((total, item) => total + (item.price + item.addons.reduce((s, a) => s + a.price, 0)) * item.quantity, 0);

  const handleAddToCartClick = (item) => {
    if (item.allowAddons === false || addons.length === 0) { setCart([...cart, { ...item, cartItemId: Date.now(), quantity: 1, addons: [] }]); setIsCartOpen(true); } 
    else { setSelectedItemForAddon(item); }
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authMode === 'signup') {
      const newUser = { id: Date.now(), ...authForm };
      push(ref(db, 'users'), newUser); setCurrentUser(newUser); alert("Account ban gaya!");
    } else {
      get(ref(db, 'users')).then(snap => {
        if(snap.exists()) {
          const user = Object.values(snap.val()).find(u => u.phone === authForm.phone && u.password === authForm.password);
          if (user) setCurrentUser(user); else alert("Galat details!");
        } else { alert("Koi account nahi mila!"); }
      });
    }
    setShowAuthModal(false);
  };

  const handleWhatsAppCheckout = () => {
    if (!currentUser) return setShowAuthModal(true);
    push(ref(db, 'orders'), { date: new Date().toLocaleDateString('en-IN'), time: new Date().toLocaleTimeString('en-IN'), customerName: currentUser.name, customerPhone: currentUser.phone, items: cart, total: cartTotal, status: 'Pending' });

    let msg = `*Hi Dadi Maa Ke Parathe!*\nNaya Order:\n`;
    cart.forEach(item => { msg += `\n*${item.quantity}x ${item.name}*`; if(item.addons.length > 0) msg += `\n   (+ ${item.addons.map(a => a.name).join(', ')})`; });
    msg += `\n\n*Total Bill: ₹${cartTotal}*\n_Customer: ${currentUser.name} (${currentUser.phone})_`;

    const cleanWhatsAppNumber = contactDetails.phone.replace(/\D/g, ''); 
    window.open(`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent(msg)}`, '_blank');
    setCart([]); setOrderSuccess(true);
  };

  const getInstagramLink = () => {
    const rawInsta = contactDetails.instagram || 'dadimaakeparathe';
    if(rawInsta.includes('http')) return rawInsta;
    return `https://instagram.com/${rawInsta.replace('@', '')}`;
  };

  const categoryFilters = [{id: 'all', name: 'All'}, ...categories];

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans selection:bg-orange-100 selection:text-orange-900 flex flex-col">
      <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur-md border-b border-zinc-100 px-6 h-20 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView('home')}>
          {contactDetails.logo && <img src={contactDetails.logo} className="w-10 h-10 rounded-full border-2 border-orange-100 object-cover" alt="logo" />}
          <div className="flex flex-col"><span className="text-xl font-bold text-zinc-900 leading-none">Dadi Maa Ke</span><span className="text-xs font-bold text-orange-600 tracking-widest uppercase">Parathe</span></div>
        </div>
        <div className="hidden md:flex space-x-8">
          {['Menu', 'Meal Pass', 'About'].map(v => <button key={v} onClick={() => setCurrentView(v.toLowerCase().replace(' ', ''))} className={`text-sm font-bold ${currentView === v.toLowerCase().replace(' ', '') ? 'text-orange-600' : 'text-zinc-500 hover:text-orange-600'}`}>{v}</button>)}
        </div>
        <div className="flex items-center space-x-4">
          {currentUser ? <button onClick={() => setCurrentUser(null)} className="text-rose-500" title="Logout"><LogOut className="w-5 h-5"/></button> : <button onClick={() => setShowAuthModal(true)} className="text-sm font-bold text-zinc-700 hover:text-orange-600">Login</button>}
          <button onClick={() => setIsCartOpen(true)} className="relative p-2 bg-zinc-50 rounded-full hover:bg-zinc-100"><ShoppingBag className="w-5 h-5 text-zinc-900"/>{cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] w-5 h-5 rounded-full flex justify-center items-center font-bold border-2 border-white">{cart.length}</span>}</button>
        </div>
      </nav>

      <main className="flex-grow">
        {currentView === 'home' && (
          <div className="flex flex-col items-center pt-24 pb-16 text-center animate-in fade-in duration-700 px-6">
            <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-sm font-medium mb-8"><Flame className="w-4 h-4" /><span>Hot & Fresh in Indore</span></div>
            <h1 className="text-5xl md:text-7xl font-extrabold text-zinc-900 mb-6 leading-tight">The Comfort of Home,<br/><span className="text-orange-600">Delivered.</span></h1>
            <p className="text-lg text-zinc-500 mb-10 max-w-2xl">Premium, whole-wheat stuffed parathas crafted with grandmother's secret recipes. Because you deserve more than just fast food.</p>
            <button onClick={() => setCurrentView('menu')} className="px-8 py-4 bg-zinc-900 text-white rounded-full font-bold text-lg flex items-center space-x-2 hover:bg-zinc-800 transition-all shadow-xl mb-12"><span>Explore Menu</span><ArrowRight className="w-5 h-5" /></button>
            
            {/* HERO LOGO SECTION */}
            {contactDetails.logo && (
              <div className="relative w-48 h-48 md:w-64 md:h-64 mt-4 animate-in zoom-in duration-1000">
                <img src={contactDetails.logo} alt="Dadi Maa Ke Parathe" className="w-full h-full object-cover rounded-full border-8 border-white shadow-2xl" />
                <div className="absolute -bottom-4 -right-4 bg-white p-4 rounded-3xl shadow-xl flex items-center space-x-2 border border-orange-50">
                   <Heart className="w-6 h-6 text-rose-500 fill-rose-500" />
                   <span className="font-bold text-zinc-800 text-sm">Homemade</span>
                </div>
              </div>
            )}
          </div>
        )}

        {currentView === 'menu' && (
          <div className="max-w-6xl mx-auto px-6 py-12 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
              <div><h2 className="text-3xl font-bold text-zinc-900 mb-2">Our Menu</h2><p className="text-zinc-500">Authentic recipes, premium ingredients.</p></div>
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
                {categoryFilters.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.name)} className={`whitespace-nowrap px-5 py-2.5 rounded-full text-sm font-bold transition-all ${selectedCategory === c.name ? 'bg-zinc-900 text-white shadow-md' : 'bg-white text-zinc-600 border border-zinc-200'}`}>{c.name}</button>)}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredMenu.map(item => (
                <div key={item.id} className={`group bg-white rounded-3xl overflow-hidden border border-zinc-100 ${!item.inStock && 'opacity-80'}`}>
                  <div className="h-56 bg-zinc-100 relative overflow-hidden">
                    {item.image ? <img src={item.image} className={`w-full h-full object-cover ${!item.inStock ? 'grayscale' : 'group-hover:scale-105 transition-transform duration-500'}`} alt="" /> : <Utensils className="w-16 h-16 absolute inset-0 m-auto text-orange-200" />}
                    {!item.inStock && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><span className="bg-red-600 text-white px-4 py-1.5 font-bold transform -rotate-12 rounded-xl">Out of Stock</span></div>}
                  </div>
                  <div className="p-6">
                    <div className="flex justify-between items-start mb-3"><h3 className="text-xl font-bold text-zinc-900">{item.name}</h3><span className="text-lg font-bold text-orange-600">₹{item.price}</span></div>
                    <p className="text-zinc-500 text-sm mb-6 line-clamp-2">{item.description}</p>
                    <button disabled={!item.inStock} onClick={() => handleAddToCartClick(item)} className={`w-full py-3.5 font-bold rounded-xl flex items-center justify-center gap-2 ${!item.inStock ? 'bg-zinc-100 text-zinc-400' : 'bg-zinc-50 hover:bg-orange-50 hover:text-orange-700 text-zinc-900'}`}>{!item.inStock ? <span>Currently Unavailable</span> : <><Plus className="w-4 h-4"/> Add to Order</>}</button>
                  </div>
                </div>
              ))}
              {menuItems.length === 0 && <div className="col-span-full text-center py-20 text-zinc-400">Loading Menu / Menu is empty. Ask Admin to update!</div>}
            </div>
          </div>
        )}

        {currentView === 'mealpass' && (
           <div className="max-w-4xl mx-auto px-6 py-16 text-center animate-in fade-in duration-500">
             <h2 className="text-4xl font-bold mb-4">Monthly Meal Pass</h2>
             <p className="text-lg text-zinc-500 max-w-xl mx-auto mb-16">Ghar ka khana, har roz discounted rate par.</p>
             <div className="grid md:grid-cols-2 gap-8 text-left">
               <div className="bg-white p-8 rounded-3xl border shadow-sm">
                 <span className="text-orange-600 font-bold text-sm uppercase mb-4">Standard Pass</span>
                 <div className="flex items-baseline text-5xl font-extrabold text-zinc-900 mb-8">₹2,499<span className="text-xl font-medium text-zinc-400">/mo</span></div>
                 <button onClick={() => { if(!currentUser) setShowAuthModal(true); else alert('Pass Activated!'); }} className="w-full py-4 bg-zinc-100 text-zinc-900 rounded-xl font-bold hover:bg-zinc-200">Subscribe Now</button>
               </div>
               <div className="bg-zinc-900 text-white p-8 rounded-3xl border border-zinc-800">
                 <span className="text-orange-400 font-bold text-sm uppercase mb-4">Heavy Diet Pass</span>
                 <div className="flex items-baseline text-5xl font-extrabold text-white mb-8">₹3,999<span className="text-xl font-medium text-zinc-400">/mo</span></div>
                 <button onClick={() => { if(!currentUser) setShowAuthModal(true); else alert('Pass Activated!'); }} className="w-full py-4 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-500">Subscribe Now</button>
               </div>
             </div>
           </div>
        )}
        
        {currentView === 'about' && (
          <div className="max-w-3xl mx-auto px-6 py-20 animate-in fade-in">
            <h2 className="text-4xl font-extrabold mb-10 text-center">Humari Kahani</h2>
            <div className="bg-white p-10 rounded-[2.5rem] border space-y-6">
               <p className="text-zinc-600 text-lg"><span className="text-zinc-900 font-bold">Dadi Maa Ke Parathe</span> sirf ek cloud kitchen nahi, ek chhota sa ashiyana hai. Humara maqsad har bite mein wahi sukoon aur swaad dena hai jo dadi ke hath ke bane garma-garam parathon mein hota hai.</p>
               <p className="text-zinc-600 text-lg">Pure gehun ka atta, fresh ingredients, aur dher sara pyaar... Indore ke busy dino aur der raat ki padhai ke beech, hum aapke liye ghar ka swaad laate hain.</p>
               <div className="pt-6 border-t flex items-center gap-4"><Heart className="w-8 h-8 text-rose-500 fill-rose-500" /><span className="text-orange-600 font-bold text-xl italic">"Ghar se door, par ghar ke swaad ke bilkul paas."</span></div>
            </div>
          </div>
        )}
      </main>

      <footer className="py-10 bg-white border-t mt-auto">
         <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-zinc-500">
           <div className="flex flex-col items-center md:items-start gap-2">
             <div className="flex items-center gap-2 text-zinc-900 font-bold"><MapPin className="w-4 h-4 text-orange-600" /><span>{contactDetails.address}</span></div>
             <p>© 2026 Dadi Maa Ke Parathe. All rights reserved.</p>
             <p>Designed by <span className="font-bold text-zinc-900">Hardik Solanki</span></p>
           </div>
           <a href={getInstagramLink()} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-zinc-600 font-bold bg-zinc-50 px-4 py-2 rounded-xl hover:text-orange-600 hover:bg-orange-50 transition-colors"><Instagram className="w-5 h-5"/> Follow on Instagram</a>
         </div>
      </footer>

      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full p-8 flex flex-col animate-in slide-in-from-right duration-300">
             <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-bold">Cart</h2><button onClick={() => setIsCartOpen(false)} className="p-2 bg-zinc-100 rounded-full"><X className="w-5 h-5"/></button></div>
             {orderSuccess ? (
               <div className="text-center flex flex-col items-center justify-center h-full"><CheckCircle className="w-16 h-16 text-green-500 mb-6"/><h3 className="text-2xl font-bold mb-2">Order Placed!</h3><button onClick={() => { setIsCartOpen(false); setOrderSuccess(false); }} className="mt-8 bg-zinc-900 text-white w-full py-4 rounded-2xl font-bold">Back to Menu</button></div>
             ) : (
               <>
                 <div className="flex-1 overflow-y-auto space-y-6">
                    {cart.map(item => (
                      <div key={item.cartItemId} className="flex justify-between border-b pb-4">
                        <div><div className="font-bold">{item.name}</div><div className="text-xs text-zinc-500">{item.addons.map(a => a.name).join(', ')}</div></div>
                        <div className="flex items-center gap-3">
                           <button onClick={() => { const newCart = [...cart]; const idx = newCart.findIndex(x => x.cartItemId === item.cartItemId); if (newCart[idx].quantity > 1) newCart[idx].quantity -= 1; else newCart.splice(idx, 1); setCart(newCart); }} className="p-1 bg-zinc-100 rounded hover:bg-zinc-200"><Minus className="w-3 h-3"/></button>
                           <div className="font-bold w-4 text-center">{item.quantity}</div>
                           <button onClick={() => { const newCart = [...cart]; const idx = newCart.findIndex(x => x.cartItemId === item.cartItemId); newCart[idx].quantity += 1; setCart(newCart); }} className="p-1 bg-zinc-100 rounded hover:bg-zinc-200"><Plus className="w-3 h-3"/></button>
                        </div>
                      </div>
                    ))}
                    {cart.length === 0 && <div className="text-center py-20 text-zinc-400"><ShoppingBag className="w-12 h-12 opacity-20 mx-auto mb-4" /><p>Cart khali hai!</p></div>}
                 </div>
                 {cart.length > 0 && <div className="pt-6 border-t"><div className="flex justify-between text-2xl font-bold mb-6"><span>Total</span><span>₹{cartTotal}</span></div><button onClick={handleWhatsAppCheckout} className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold hover:bg-green-700 shadow-lg">Checkout on WhatsApp</button></div>}
               </>
             )}
          </div>
        </div>
      )}

      {selectedItemForAddon && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedItemForAddon(null)}></div>
          <div className="relative bg-white p-8 rounded-[2.5rem] w-full max-w-sm animate-in zoom-in-95">
            <h3 className="text-2xl font-bold mb-1">{selectedItemForAddon.name}</h3>
            <p className="text-zinc-500 text-sm mb-6">Extra swaad add karein!</p>
            {addons.map(a => (
              <div key={a.id} onClick={() => setCurrentAddons(prev => prev.find(x => x.id === a.id) ? prev.filter(x => x.id !== a.id) : [...prev, a])} className={`p-4 border-2 rounded-2xl mb-3 flex justify-between cursor-pointer ${currentAddons.find(x=>x.id===a.id) ? 'border-orange-500 bg-orange-50 text-orange-900 font-bold' : 'border-zinc-100 hover:border-zinc-200'}`}>
                <span>{a.name}</span><span>+₹{a.price}</span>
              </div>
            ))}
            <button onClick={() => { setCart([...cart, { ...selectedItemForAddon, cartItemId: Date.now(), quantity: 1, addons: currentAddons }]); setSelectedItemForAddon(null); setCurrentAddons([]); setIsCartOpen(true); }} className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-bold mt-4 shadow-xl hover:bg-zinc-800">Add to Cart</button>
          </div>
        </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}></div>
          <div className="relative bg-white p-8 rounded-[2.5rem] w-full max-w-sm">
            <button onClick={() => setShowAuthModal(false)} className="absolute top-6 right-6 p-2 bg-zinc-100 rounded-full hover:bg-zinc-200"><X className="w-4 h-4"/></button>
            <h3 className="text-2xl font-bold mb-2">{authMode === 'login' ? 'Login' : 'Sign Up'}</h3>
            <p className="text-zinc-500 text-sm mb-6">Account banayein aur order karein.</p>
            {authMode === 'signup' && <input placeholder="Aapka Naam" className="w-full border p-4 rounded-2xl mb-4 outline-none" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
            <input placeholder="Phone Number" className="w-full border p-4 rounded-2xl mb-4 outline-none" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
            <input type="password" placeholder="Password" className="w-full border p-4 rounded-2xl mb-6 outline-none" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
            <button onClick={handleAuthSubmit} className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
            <p className="mt-6 text-center text-sm"><button onClick={() => setAuthMode(authMode==='login'?'signup':'login')} className="text-orange-600 font-bold underline">Switch to {authMode==='login'?'Sign Up':'Login'}</button></p>
          </div>
        </div>
      )}
    </div>
  );
}
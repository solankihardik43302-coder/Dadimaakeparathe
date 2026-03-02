import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ArrowRight, Plus, Minus, Heart, Flame,
  LogOut, CheckCircle, Utensils, MapPin, Instagram, X, Users, ShieldCheck, Mail, Phone, Quote, 
  Trash2, Ticket, Bike, Receipt, Clock, Package
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, push, set, get } from "firebase/database";

export default function UserApp() {
  const [currentView, setCurrentView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allPasses, setAllPasses] = useState([]); 
  const [mealPassPlans, setMealPassPlans] = useState([]); 
  const [allOrders, setAllOrders] = useState([]);
  const [availablePromos, setAvailablePromos] = useState([]);
  
  const [contactDetails, setContactDetails] = useState({ 
    phone: '', email: '', logo: '/logo.png', address: '', instagram: '',
    deliveryCharge: 30, freeDeliveryThreshold: 299
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [discountAmt, setDiscountAmt] = useState(0);

  useEffect(() => {
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ ...x, id })) : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ ...x, id })) : []));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...(snap.val() || {}) })); });
    onValue(ref(db, 'meal_pass_plans'), snap => setMealPassPlans(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ ...x, id })) : []));
    onValue(ref(db, 'meal_passes'), snap => setAllPasses(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ ...x, id })) : []));
    onValue(ref(db, 'orders'), snap => setAllOrders(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ ...x, id })).reverse() : []));
    onValue(ref(db, 'promo_codes'), snap => setAvailablePromos(snap.val() ? Object.values(snap.val()) : []));
  }, []);

  const cartSubTotal = (cart || []).reduce((sum, item) => sum + ((Number(item?.price) || 0) * (Number(item?.quantity) || 1)), 0);
  const dCharge = contactDetails.deliveryCharge !== undefined ? Number(contactDetails.deliveryCharge) : 30;
  const dThreshold = contactDetails.freeDeliveryThreshold !== undefined ? Number(contactDetails.freeDeliveryThreshold) : 299;
  const deliveryCharge = (cartSubTotal > 0 && cartSubTotal < dThreshold) ? dCharge : 0; 
  const cartGrandTotal = Math.max(0, cartSubTotal + deliveryCharge - discountAmt);

  const updateQuantity = (cartItemId, delta) => {
    setCart(prev => prev.map(item => item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item));
  };

  const applyPromo = (codeToApply = promoInput) => {
    const code = codeToApply.trim().toUpperCase();
    if (!code) return;
    
    const validPromo = availablePromos.find(p => p.code === code && p.isActive !== false);
    if (validPromo) {
      if (cartSubTotal < validPromo.minOrder) return alert(`Minimum order of ₹${validPromo.minOrder} is required.`);
      
      let calcDiscount = 0;
      if (validPromo.type === 'PERCENT') {
        calcDiscount = (cartSubTotal * validPromo.value) / 100;
        if (validPromo.maxDiscount && calcDiscount > validPromo.maxDiscount) { calcDiscount = validPromo.maxDiscount; }
      } else { calcDiscount = validPromo.value; }

      setDiscountAmt(Math.floor(calcDiscount));
      setAppliedPromo(validPromo.code);
      setPromoInput(validPromo.code);
    } else {
      alert("Invalid or Inactive Promo Code");
      setPromoInput('');
    }
  };

  const removePromo = () => { setAppliedPromo(null); setDiscountAmt(0); setPromoInput(''); };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    if (authForm.phone.length !== 10) return alert("Enter 10-digit phone number.");
    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;

    if (authMode === 'signup') {
      if (!pwdRegex.test(authForm.password)) return alert("Password: Min 6 chars, letters & numbers.");
      if (authForm.name.trim() === '') return alert("Please enter your name.");
      
      get(ref(db, 'users')).then(snap => {
        const exists = snap.exists() && Object.values(snap.val()).some(u => u.phone === authForm.phone);
        if (exists) {
          alert("Already registered. Please log in.");
          setAuthMode('login');
        } else {
          push(ref(db, 'users'), { ...authForm, createdAt: new Date().toISOString() })
          .then(res => { setCurrentUser({ ...authForm, id: res.key }); setShowAuthModal(false); });
        }
      });
    } else {
      get(ref(db, 'users')).then(snap => {
        if (!snap.exists()) { setAuthMode('signup'); return; }
        const users = Object.entries(snap.val()).map(([id, val]) => ({ ...val, id }));
        const user = users.find(u => u.phone === authForm.phone);
        if (user) {
          if (user.password === authForm.password) { setCurrentUser(user); setShowAuthModal(false); }
          else alert("Incorrect Password!");
        } else { setAuthMode('signup'); }
      });
    }
  };

  const handleSubscribe = (planName) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    push(ref(db, 'meal_passes'), { userId: currentUser.id, name: currentUser.name, phone: currentUser.phone, plan: planName, startDate: new Date().toISOString() }).then(() => {
      alert(`${planName} Activated! We will contact you soon.`);
      setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  };

  const handleWhatsAppCheckout = () => {
    if (!currentUser) return setShowAuthModal(true);
    
    push(ref(db, 'orders'), { 
      date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), 
      customerName: currentUser.name, customerPhone: currentUser.phone, 
      items: cart, subtotal: cartSubTotal, delivery: deliveryCharge, discount: discountAmt,
      promoCode: appliedPromo || 'None', total: cartGrandTotal, status: 'Pending' 
    });

    let msg = `*New Order - Dadi Maa Ke Parathe*\n`;
    (cart || []).forEach(item => { msg += `\n*${item.quantity}x ${item.name}*`; });
    msg += `\n\n*Subtotal:* ₹${cartSubTotal}`;
    if (deliveryCharge > 0) msg += `\n*Delivery:* ₹${deliveryCharge}`;
    if (discountAmt > 0) msg += `\n*Discount (${appliedPromo}):* -₹${discountAmt}`;
    msg += `\n*Grand Total:* ₹${cartGrandTotal}\n\nName: ${currentUser.name}`;
    
    let adminPhone = contactDetails.phone ? String(contactDetails.phone).replace(/\D/g, '') : '';
    if (adminPhone.length === 10) adminPhone = '91' + adminPhone;

    window.open(`https://wa.me/${adminPhone}?text=${encodeURIComponent(msg)}`, '_blank');
    setCart([]); removePromo(); setIsCartOpen(false); setCurrentView('orders'); window.scrollTo({top: 0, behavior: 'smooth'});
  };

  const calculateDaysLeft = (startDateISO) => {
    if (!startDateISO) return 0;
    const start = new Date(startDateISO).getTime();
    const now = new Date().getTime();
    const diff = now - start;
    const daysPassed = Math.floor(diff / (1000 * 60 * 60 * 24));
    const daysLeft = 30 - daysPassed; 
    return daysLeft > 0 ? daysLeft : 0;
  };

  const userPassesList = currentUser ? allPasses.filter(p => p.phone === currentUser.phone) : [];
  const myPass = userPassesList.length > 0 ? userPassesList[userPassesList.length - 1] : null; 
  const daysRemaining = myPass ? calculateDaysLeft(myPass.startDate) : 0;
  const myOrderHistory = currentUser ? allOrders.filter(o => o.customerPhone === currentUser.phone) : [];
  const instaHandle = contactDetails.instagram ? contactDetails.instagram.replace('@', '') : '';

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans antialiased text-zinc-800 flex flex-col selection:bg-orange-200 selection:text-orange-900 overflow-x-hidden">
      
      {/* ---------------- NAVBAR ---------------- */}
      <nav className="sticky top-0 z-40 w-full bg-white/70 backdrop-blur-2xl border-b border-zinc-200/50 px-4 py-3 sm:px-6 transition-all duration-300">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => {setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' });}}>
            <div className="relative overflow-hidden rounded-full shadow-sm group-hover:shadow-md transition-all duration-500 ease-out">
              <img src={contactDetails.logo || '/logo.png'} className="w-9 h-9 sm:w-10 sm:h-10 object-cover transform group-hover:scale-110 transition-transform duration-700 ease-out" alt="logo" onError={(e) => e.target.src = '/logo.png'}/>
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] sm:text-base font-extrabold leading-none tracking-tight text-zinc-900 group-hover:text-orange-600 transition-colors duration-300">Dadi Maa Ke</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-orange-500 uppercase tracking-widest mt-0.5">Parathe</span>
            </div>
          </div>
          
          <div className="hidden sm:flex items-center space-x-1 bg-zinc-100/50 p-1.5 rounded-full border border-zinc-200/50 backdrop-blur-md">
            {['Home', 'Menu', 'Meal Pass', 'About'].map(v => (
              <button key={v} onClick={() => {setCurrentView(v.toLowerCase().replace(' ', '')); window.scrollTo({ top: 0, behavior: 'smooth' });}} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-out hover:-translate-y-0.5 ${currentView === v.toLowerCase().replace(' ', '') ? 'bg-white text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'}`}>{v}</button>
            ))}
            {currentUser && (
               <button onClick={() => {setCurrentView('orders'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ease-out hover:-translate-y-0.5 flex items-center gap-1.5 ${currentView === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-200/50'}`}>
                 <Receipt className="w-4 h-4"/> Orders
               </button>
            )}
          </div>

          <div className="flex items-center space-x-3 sm:space-x-4">
            {currentUser ? 
              <button onClick={() => setCurrentUser(null)} className="text-zinc-400 hover:text-rose-500 hover:bg-rose-50 p-2.5 rounded-full transition-all duration-300"><LogOut className="w-5 h-5"/></button> 
              : 
              <button onClick={() => setShowAuthModal(true)} className="bg-zinc-900 text-white px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold shadow-md shadow-zinc-900/20 hover:shadow-lg hover:-translate-y-0.5 active:scale-95 transition-all duration-300">Login</button>
            }
            <button onClick={() => setIsCartOpen(true)} className="relative p-2.5 bg-zinc-100/80 rounded-full hover:bg-zinc-200 transition-all duration-300 hover:shadow-inner group">
              <ShoppingBag className="w-5 h-5 text-zinc-700 group-hover:text-orange-600 transition-colors duration-300"/>
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold shadow-md ring-2 ring-white animate-in zoom-in">{cart.length}</span>}
            </button>
          </div>
        </div>
        
        <div className="flex sm:hidden space-x-2 overflow-x-auto scrollbar-hide pt-4 pb-1 border-t border-zinc-100 mt-2">
          {['Home', 'Menu', 'Meal Pass', 'About'].map(v => (
            <button key={v} onClick={() => {setCurrentView(v.toLowerCase().replace(' ', '')); window.scrollTo({ top: 0, behavior: 'smooth' });}} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 ${currentView === v.toLowerCase().replace(' ', '') ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-zinc-500 border border-transparent'}`}>{v}</button>
          ))}
          {currentUser && (
             <button onClick={() => {setCurrentView('orders'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-1 ${currentView === 'orders' ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-zinc-500 border border-transparent'}`}>
               <Receipt className="w-3 h-3"/> Orders
             </button>
          )}
        </div>
      </nav>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-grow">
        
        {/* HOME VIEW */}
        {currentView === 'home' && (
          <>
            <div className="flex flex-col items-center pt-16 sm:pt-28 pb-12 sm:pb-20 text-center px-6 animate-in fade-in duration-700 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-orange-500/10 rounded-full blur-3xl -z-10 animate-pulse" style={{ animationDuration: '4s' }}></div>
              <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-orange-100 shadow-sm hover:shadow-md transition-shadow">
                <Flame className="w-3 h-3 fill-orange-600" />
                <span className="uppercase tracking-widest">100% Authentic Recipe</span>
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 text-zinc-900 leading-tight tracking-tight">
                Milega esa swad,<br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-600 to-rose-500">Na aayegi ghar ki yaad.</span>
              </h1>
              <p className="text-zinc-500 text-base sm:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                Hand-rolled, whole-wheat parathas crafted with love, pure desi ghee, and grandmother's secret spices. Delivered hot & fresh in Indore.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
                <button onClick={() => {setCurrentView('menu'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-full font-bold flex items-center justify-center space-x-2 shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 hover:-translate-y-1 active:scale-95 transition-all duration-300 text-lg">
                  <span>Order Online</span><ArrowRight className="w-5 h-5"/>
                </button>
                <button onClick={() => {setCurrentView('mealpass'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="w-full sm:w-auto px-8 py-4 bg-white/80 backdrop-blur-md text-zinc-900 border border-zinc-200/80 rounded-full font-bold flex items-center justify-center space-x-2 hover:bg-zinc-50 hover:-translate-y-1 hover:shadow-md active:scale-95 transition-all duration-300 text-lg">
                  <ShieldCheck className="w-5 h-5 text-orange-500"/>
                  <span>View Meal Passes</span>
                </button>
              </div>
              
              <div className="relative group">
                <img src={contactDetails.logo || '/logo.png'} className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-[10px] border-white shadow-2xl object-cover group-hover:scale-105 group-hover:rotate-6 transition-transform duration-1000 ease-in-out relative z-10" alt="Dadi Maa Ke Parathe" onError={(e) => e.target.src = '/logo.png'}/>
                <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-white p-3 sm:p-4 rounded-3xl shadow-xl flex items-center gap-3 border border-orange-50 z-20 animate-bounce transition-all duration-1000 group-hover:shadow-rose-500/10">
                  <div className="bg-orange-100 p-2 rounded-full"><Heart className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 fill-orange-600"/></div>
                  <div className="text-left"><div className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">Made with</div><div className="font-black text-sm sm:text-base text-zinc-900">100% Love</div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 pb-20 animate-in slide-in-from-bottom duration-700 delay-200">
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100/80 text-center shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-500 ease-out cursor-default">
                 <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Utensils className="w-8 h-8 text-orange-600" /></div>
                 <h4 className="font-bold text-xl mb-2 text-zinc-900">Pure Ingredients</h4>
                 <p className="text-sm text-zinc-500 font-medium">Made with 100% whole wheat and rich desi ghee for a healthy stomach.</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100/80 text-center shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-500 ease-out cursor-default">
                 <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Heart className="w-8 h-8 text-rose-500 fill-rose-100" /></div>
                 <h4 className="font-bold text-xl mb-2 text-zinc-900">Ghar Ka Swad</h4>
                 <p className="text-sm text-zinc-500 font-medium">Authentic recipes and spice blends passed down from generations.</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100/80 text-center shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] hover:-translate-y-1.5 transition-all duration-500 ease-out cursor-default">
                 <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Flame className="w-8 h-8 text-green-600 fill-green-100" /></div>
                 <h4 className="font-bold text-xl mb-2 text-zinc-900">Hot & Fresh</h4>
                 <p className="text-sm text-zinc-500 font-medium">Every paratha is made to order and delivered piping hot to your door.</p>
              </div>
            </div>
          </>
        )}

        {/* MENU VIEW */}
        {currentView === 'menu' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-6 items-start md:items-end">
              <div className="shrink-0">
                <h2 className="text-4xl font-extrabold text-zinc-900 tracking-tight">Our Menu</h2>
                <p className="text-zinc-500 font-medium text-sm sm:text-base mt-2">Freshly prepared, just for you.</p>
              </div>
              
              <div className="relative w-full overflow-hidden pt-2 pb-4">
                <div className="flex w-full overflow-x-auto scrollbar-hide gap-3 sm:gap-4 px-1 snap-x">
                  <button onClick={() => setSelectedCategory("All")} className={`snap-start shrink-0 px-7 py-3 rounded-[1.25rem] text-sm font-bold whitespace-nowrap transition-all duration-300 ease-out ${selectedCategory === "All" ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20 ring-offset-2 ring-offset-[#FAFAFA] scale-105' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-md hover:-translate-y-0.5'}`}>
                    All Items
                  </button>
                  {(categories || []).map(c => (
                    <button key={c.id} onClick={() => setSelectedCategory(c.name)} className={`snap-start shrink-0 px-7 py-3 rounded-[1.25rem] text-sm font-bold whitespace-nowrap transition-all duration-300 ease-out ${selectedCategory === c.name ? 'bg-gradient-to-r from-orange-600 to-orange-500 text-white shadow-lg shadow-orange-500/30 ring-2 ring-orange-500/20 ring-offset-2 ring-offset-[#FAFAFA] scale-105' : 'bg-white text-zinc-500 border border-zinc-200 hover:border-zinc-300 hover:text-zinc-900 hover:shadow-md hover:-translate-y-0.5'}`}>
                      {c.name}
                    </button>
                  ))}
                </div>
                <div className="absolute right-0 top-0 bottom-4 w-12 bg-gradient-to-l from-[#FAFAFA] to-transparent pointer-events-none sm:hidden"></div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {(menuItems || []).filter(i => selectedCategory === "All" || i.category === selectedCategory).map(item => (
                <div key={item.id} className={`bg-white rounded-[2rem] border border-zinc-100/80 p-3 sm:p-4 flex flex-col shadow-sm hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] hover:-translate-y-1.5 transition-all duration-500 ease-out group ${!item.inStock && 'opacity-60'}`}>
                  <div className="relative overflow-hidden rounded-[1.5rem] bg-zinc-100 aspect-[4/3] mb-4">
                    <img src={item.image || '/logo.png'} className={`w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700 ease-in-out ${!item.inStock && 'grayscale'}`} alt={item.name} onError={(e) => { e.target.src = '/logo.png'; }}/>
                    {!item.inStock && <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] flex items-center justify-center"><span className="bg-red-500 text-white font-bold px-4 py-1.5 rounded-xl uppercase tracking-widest text-xs shadow-lg">Sold Out</span></div>}
                  </div>
                  <div className="px-2 pb-2 flex flex-col flex-grow">
                    <div className="flex justify-between items-start gap-4 mb-2">
                      <h3 className="font-bold text-xl text-zinc-800 leading-snug group-hover:text-orange-600 transition-colors duration-300">{item.name}</h3>
                      <span className="text-orange-600 font-extrabold text-xl shrink-0">₹{item.price}</span>
                    </div>
                    {item.description && <p className="text-sm text-zinc-500 font-medium leading-relaxed line-clamp-2 mb-6">{item.description}</p>}
                    
                    <div className="mt-auto">
                      <button disabled={!item.inStock} onClick={() => { setCart(prev => { const existing = prev.find(p => p.id === item.id); if(existing){ return prev.map(p => p.id === item.id ? {...p, quantity: p.quantity + 1} : p); } return [...prev, { ...item, cartItemId: Date.now(), quantity: 1 }]; }); setIsCartOpen(true); }} className={`w-full py-3.5 rounded-xl font-bold text-sm sm:text-base transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 ${item.inStock ? 'bg-orange-50 text-orange-600 hover:bg-gradient-to-r hover:from-orange-600 hover:to-orange-500 hover:text-white hover:shadow-md hover:shadow-orange-500/20' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}>
                        {item.inStock ? <><Plus className="w-4 h-4"/> Add to Order</> : 'Unavailable'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDER HISTORY VIEW */}
        {currentView === 'orders' && (
           <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
             <div className="mb-10 text-center sm:text-left">
               <h2 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 tracking-tight">My Orders</h2>
               <p className="text-zinc-500 font-medium mt-2">Track your past orders and status.</p>
             </div>
             
             {!currentUser ? (
               <div className="bg-white p-12 rounded-[2rem] border border-zinc-100 shadow-sm text-center flex flex-col items-center">
                 <Receipt className="w-16 h-16 text-zinc-300 mb-4"/>
                 <h3 className="text-xl font-bold text-zinc-800 mb-2">Please Login</h3>
                 <p className="text-zinc-500 mb-6">Login to view your past orders and live status.</p>
                 <button onClick={() => setShowAuthModal(true)} className="px-8 py-3 bg-zinc-900 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors">Login Now</button>
               </div>
             ) : (
               <div className="space-y-6">
                 {myOrderHistory.length === 0 ? (
                   <div className="bg-white p-12 rounded-[2rem] border border-zinc-100 shadow-sm text-center">
                     <ShoppingBag className="w-12 h-12 text-zinc-200 mx-auto mb-4"/>
                     <h3 className="text-xl font-bold text-zinc-800 mb-2">No orders yet</h3>
                     <p className="text-zinc-500 mb-6">Looks like you haven't ordered yet.</p>
                     <button onClick={() => setCurrentView('menu')} className="px-8 py-3 bg-orange-50 text-orange-600 rounded-xl font-bold hover:bg-orange-600 hover:text-white transition-colors">Explore Menu</button>
                   </div>
                 ) : (
                   myOrderHistory.map(order => {
                     let badgeStyle = 'bg-zinc-50 text-zinc-600 border-zinc-200';
                     let StatusIcon = Clock;
                     if(order.status === 'Pending') { badgeStyle = 'bg-orange-50 text-orange-600 border-orange-200'; StatusIcon = Clock; }
                     else if(order.status === 'Preparing') { badgeStyle = 'bg-yellow-50 text-yellow-600 border-yellow-200'; StatusIcon = Flame; }
                     else if(order.status === 'Dispatched') { badgeStyle = 'bg-blue-50 text-blue-600 border-blue-200'; StatusIcon = Bike; }
                     else if(order.status === 'Delivered') { badgeStyle = 'bg-green-50 text-green-600 border-green-200'; StatusIcon = CheckCircle; }

                     return (
                       <div key={order.id} className="bg-white p-6 sm:p-8 rounded-[2rem] border border-zinc-100/80 shadow-sm hover:shadow-lg transition-shadow duration-300 relative overflow-hidden">
                         <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-zinc-100 pb-6">
                           <div>
                             <div className="text-sm text-zinc-400 font-medium font-mono mb-1">{order.date} • {order.time}</div>
                             <div className="text-xl font-black text-zinc-900">Total: ₹{order.total}</div>
                           </div>
                           <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest border flex items-center gap-2 ${badgeStyle}`}>
                             <StatusIcon className={`w-4 h-4 ${order.status === 'Pending' || order.status === 'Preparing' ? 'animate-pulse' : ''}`}/>
                             {order.status || 'Pending'}
                           </div>
                         </div>
                         
                         <div className="bg-zinc-50/80 rounded-xl p-5 border border-zinc-100/50">
                           <h4 className="text-xs font-bold uppercase text-zinc-500 tracking-widest mb-4 flex items-center gap-2"><Package className="w-4 h-4"/> Items Ordered</h4>
                           <ul className="space-y-3">
                             {(order.items || []).map((item, idx) => (
                               <li key={idx} className="flex justify-between items-center text-sm font-medium text-zinc-700">
                                 <span><span className="font-bold text-zinc-900 mr-2 bg-white px-2 py-0.5 rounded shadow-sm border border-zinc-100">{item.quantity}x</span> {item.name}</span>
                                 <span className="text-zinc-500">₹{item.price * item.quantity}</span>
                               </li>
                             ))}
                           </ul>
                           {(order.delivery > 0 || order.discount > 0) && (
                             <div className="mt-5 pt-4 border-t border-zinc-200 space-y-1.5 text-xs font-medium text-zinc-500">
                               <div className="flex justify-between"><span>Subtotal:</span><span>₹{order.subtotal || (order.total - (order.delivery || 0) + (order.discount || 0))}</span></div>
                               {order.delivery > 0 && <div className="flex justify-between"><span>Delivery:</span><span>₹{order.delivery}</span></div>}
                               {order.discount > 0 && <div className="flex justify-between text-green-600"><span>Promo ({order.promoCode || 'Applied'}):</span><span>-₹{order.discount}</span></div>}
                             </div>
                           )}
                         </div>
                       </div>
                     );
                   })
                 )}
               </div>
             )}
           </div>
        )}

        {/* MEAL PASS VIEW */}
        {currentView === 'mealpass' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            {myPass && daysRemaining > 0 ? (
              <div className="bg-green-50 border border-green-200 p-8 sm:p-12 rounded-[2.5rem] shadow-xl text-center max-w-lg mx-auto transform hover:scale-105 transition-transform duration-500 ease-out">
                <ShieldCheck className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto mb-6" />
                <h3 className="text-2xl sm:text-3xl font-bold text-green-900 mb-2">Your {myPass.plan} is Active!</h3>
                <div className="text-6xl sm:text-7xl font-extrabold text-green-600 my-6 tracking-tighter">
                  {daysRemaining} <span className="text-xl sm:text-2xl font-bold text-green-800 tracking-normal block sm:inline">Days Left</span>
                </div>
                <p className="text-green-700 font-bold bg-green-200/50 py-2 px-4 rounded-full inline-block mt-4">Enjoy home-cooked meals without any hassle.</p>
              </div>
            ) : (
              <>
                <h2 className="text-4xl sm:text-5xl font-extrabold mb-4 text-zinc-900 tracking-tight">Choose Your Meal Pass</h2>
                <p className="text-zinc-500 font-medium mb-12 max-w-xl mx-auto">Subscribe to our monthly plans and get hot, home-cooked food delivered to you daily without the hassle of ordering every day.</p>
                {myPass && daysRemaining === 0 && <div className="bg-red-50 text-red-600 font-bold p-4 rounded-xl mb-8 max-w-md mx-auto border border-red-100">Your previous pass has expired. Please renew!</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 text-left justify-center">
                  {(mealPassPlans && mealPassPlans.length > 0) ? mealPassPlans.map(plan => (
                     <div key={plan.id} className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-out flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors duration-500"></div>
                        <span className="text-orange-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-4 relative z-10">{plan.name}</span>
                        <div className="text-4xl sm:text-5xl font-extrabold mb-8 text-zinc-900 relative z-10">₹{plan.price}<span className="text-lg sm:text-xl text-zinc-400 font-medium">/{plan.duration}</span></div>
                        <ul className="mb-8 space-y-3 text-sm text-zinc-600 font-medium relative z-10">
                          {(plan.features || "").split(',').map((f, i) => <li key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0"/> {f.trim()}</li>)}
                        </ul>
                        <button onClick={() => handleSubscribe(plan.name)} className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-600 hover:text-white active:scale-95 transition-all duration-300 mt-auto text-sm sm:text-base relative z-10">Subscribe Now</button>
                     </div>
                  )) : (
                     <>
                       <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all duration-500 ease-out flex flex-col relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl"></div>
                         <span className="text-orange-600 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-4">Standard Pass</span>
                         <div className="text-4xl sm:text-5xl font-extrabold mb-8 text-zinc-900">₹2,499<span className="text-lg sm:text-xl text-zinc-400 font-medium">/30 Days</span></div>
                         <ul className="mb-8 space-y-3 text-sm text-zinc-600 font-medium">
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> 1 Meal Every Day</li>
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Free Delivery</li>
                         </ul>
                         <button onClick={() => handleSubscribe('Standard Pass')} className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-600 hover:text-white active:scale-95 transition-all duration-300 mt-auto text-sm sm:text-base">Subscribe Now</button>
                       </div>
                       
                       <div className="bg-gradient-to-br from-zinc-900 to-black text-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(249,115,22,0.25)] hover:-translate-y-2 transition-all duration-500 ease-out flex flex-col relative overflow-hidden ring-1 ring-white/10 hover:ring-orange-500/50">
                         <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
                         <span className="text-orange-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs mb-4 flex items-center gap-2"><Flame className="w-4 h-4"/> Heavy Diet Pass</span>
                         <div className="text-4xl sm:text-5xl font-extrabold mb-8 text-white">₹3,999<span className="text-lg sm:text-xl text-zinc-500 font-medium">/30 Days</span></div>
                         <ul className="mb-8 space-y-3 text-sm text-zinc-400 font-medium">
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500"/> 2 Meals Every Day</li>
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500"/> Sunday Special Included</li>
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500"/> Priority Support</li>
                         </ul>
                         <button onClick={() => handleSubscribe('Heavy Diet Pass')} className="w-full py-4 bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-2xl font-bold hover:shadow-lg hover:shadow-orange-900/50 active:scale-95 transition-all duration-300 mt-auto text-sm sm:text-base">Get Premium Pass</button>
                       </div>
                     </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* ABOUT VIEW */}
        {currentView === 'about' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-12 text-center text-zinc-900 tracking-tight">Our Story</h2>
            
            <div className="bg-white p-8 sm:p-14 rounded-[3rem] border border-zinc-100 shadow-xl mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -z-10"></div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 text-center sm:text-left relative z-10">
                <div className="bg-orange-500 p-5 rounded-3xl shadow-lg shadow-orange-500/30 shrink-0 transform -rotate-6"><Heart className="w-10 h-10 text-white fill-white" /></div>
                <div>
                  <h3 className="text-3xl sm:text-4xl font-extrabold mb-3 text-zinc-900">Ek Choti Street Shop Se...</h3>
                  <p className="text-orange-600 font-bold uppercase tracking-widest text-xs sm:text-sm">A journey fueled by passion</p>
                </div>
              </div>
              <div className="space-y-6 text-zinc-600 leading-loose sm:text-lg relative z-10 font-medium">
                <p>
                  Dadi Maa Ke Parathe ki shuruaat ek choti si street shop se hui thi. Ek chhota sa thela, par sapne aur swad dono bade the. Humara maksad sirf logo ka pet bharna nahi tha, balki unhe wo comfort aur pyar dena tha jo sirf ghar ke khane mein milta hai.
                </p>
                <div className="bg-zinc-50 border-l-4 border-orange-500 p-6 rounded-r-2xl my-8 italic text-zinc-800 font-bold shadow-sm">
                  <Quote className="w-6 h-6 text-orange-300 mb-2" />
                  "Humare yahan bahar ka staff kam, aur ghar ke log hi zyada kaam karte hain. Hum khana banate nahi, khilate hain!"
                </div>
                <p>
                  Aaj 3 saal baad bhi, Indore mein successfully chalne ke bawajood, humara philosophy wahi hai. Taki har ek parathe mein dadi maa ka wahi pyaar, care aur authentic 'Ghar Jaisa Swad' barkarar rahe.
                </p>
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-extrabold mb-8 text-center text-zinc-900">Get In Touch</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <a href={`tel:${contactDetails.phone}`} className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors duration-300"><Phone className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors duration-300"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Call Us</div><div className="font-bold text-zinc-900 text-lg">{contactDetails.phone}</div></div>
              </a>
              <a href={`mailto:${contactDetails.email || 'hello@dadimaa.com'}`} className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors duration-300"><Mail className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors duration-300"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Email</div><div className="font-bold text-zinc-900 text-lg">{contactDetails.email || 'hello@dadimaa.com'}</div></div>
              </a>
              <a href={`https://instagram.com/${instaHandle}`} target="_blank" rel="noopener noreferrer" className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors duration-300"><Instagram className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors duration-300"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Instagram</div><div className="font-bold text-zinc-900 text-lg">@{instaHandle}</div></div>
              </a>
              <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors duration-300"><MapPin className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors duration-300"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Visit Us</div><div className="font-bold text-zinc-900 leading-tight">{contactDetails.address}</div></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="bg-zinc-950 text-zinc-400 py-16 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="space-y-6">
            <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => {setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' });}}>
              {contactDetails.logo && <img src={contactDetails.logo} className="w-14 h-14 rounded-full border-2 border-zinc-800 transition-colors duration-300" alt="logo" onError={(e) => e.target.src = '/logo.png'}/>}
              <div>
                <span className="text-2xl font-extrabold text-white leading-none block transition-colors duration-300">Dadi Maa Ke</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-0.5">Parathe</span>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-medium">Milega esa swad, Na aayegi ghar ki yaad. Authentic whole-wheat parathas crafted with love.</p>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><button onClick={() => {setCurrentView('home'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="hover:text-orange-500 transition-colors duration-300 flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Home</button></li>
              <li><button onClick={() => {setCurrentView('menu'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="hover:text-orange-500 transition-colors duration-300 flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Order Menu</button></li>
              <li><button onClick={() => {setCurrentView('mealpass'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="hover:text-orange-500 transition-colors duration-300 flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Meal Passes</button></li>
              <li><button onClick={() => {setCurrentView('about'); window.scrollTo({ top: 0, behavior: 'smooth' });}} className="hover:text-orange-500 transition-colors duration-300 flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Our Story</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Get In Touch</h4>
            <ul className="space-y-5 text-sm font-medium">
              <li className="flex items-center gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl"><Phone className="w-4 h-4 text-orange-500"/></div> 
                <a href={`tel:${contactDetails.phone}`} className="hover:text-orange-500 transition-colors duration-300 cursor-pointer">{contactDetails.phone}</a>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl"><Mail className="w-4 h-4 text-orange-500"/></div> 
                <a href={`mailto:${contactDetails.email || 'hello@dadimaa.com'}`} className="hover:text-orange-500 transition-colors duration-300 cursor-pointer">{contactDetails.email || 'hello@dadimaa.com'}</a>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl"><Instagram className="w-4 h-4 text-orange-500"/></div> 
                <a href={`https://instagram.com/${instaHandle}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors duration-300 cursor-pointer">@{instaHandle}</a>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl mt-1"><MapPin className="w-4 h-4 text-orange-500"/></div> 
                <span className="leading-relaxed">{contactDetails.address}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-bold mb-6 uppercase tracking-widest text-xs">Find Us</h4>
            <div className="rounded-3xl overflow-hidden h-40 border border-zinc-800 opacity-80 hover:opacity-100 transition-all duration-500 shadow-lg shadow-black">
             <iframe 
  title="Dadi Maa Ke Parathe Location"
  width="100%" 
  height="100%" 
  style={{ border: 0 }}
  src={`https://maps.google.com/maps?q=${encodeURIComponent('Dadi Maa Ke Parathe, ' + (contactDetails.address || 'Indore'))}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
  allowFullScreen=""
  loading="lazy"
  referrerPolicy="no-referrer-when-downgrade"
></iframe>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto mt-16 pt-8 border-t border-zinc-800/50 text-xs text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-6">
          <p className="font-medium text-zinc-500">© {new Date().getFullYear()} Dadi Maa Ke Parathe. All rights reserved.</p>
          <a href="https://instagram.com/axiomdesignsco" target="_blank" rel="noopener noreferrer" className="bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800 font-medium hover:border-zinc-700 hover:bg-zinc-900 transition-all duration-300 cursor-pointer group">
            Designed with <Heart className="w-3 h-3 inline text-rose-500 fill-rose-500 mx-1 group-hover:scale-110 transition-transform"/> by <span className="font-bold text-white tracking-widest uppercase text-[10px]">Hardik Solanki.</span>
          </a>
        </div>
      </footer>

      {/* MODALS */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-md transition-opacity duration-300">
          <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] w-full max-w-sm relative animate-in zoom-in-95 duration-500 ease-out shadow-2xl">
            <X className="absolute top-6 right-6 cursor-pointer text-zinc-400 hover:text-zinc-900 bg-zinc-100 rounded-full p-2 w-10 h-10 transition-colors duration-300" onClick={() => setShowAuthModal(false)}/>
            <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mb-6 shadow-inner">
              <Users className="w-8 h-8 text-orange-600"/>
            </div>
            <h3 className="text-3xl font-extrabold mb-2 text-zinc-900 tracking-tight">{authMode === 'login' ? 'Welcome Back!' : 'Create Account'}</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8">
              {authMode === 'login' ? 'Login to track your live orders.' : 'Join the Dadi Maa family today.'}
            </p>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <input placeholder="Your Name" required className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 font-medium text-zinc-900" onChange={e => setAuthForm({...authForm, name: e.target.value})} />
              )}
              <input type="tel" placeholder="Phone Number (10 digits)" required value={authForm.phone} className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 font-medium text-zinc-900 tracking-wider" onChange={e => { const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 10); setAuthForm({...authForm, phone: numbersOnly}); }} />
              <input type="password" placeholder="Password" required className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-500/10 transition-all duration-300 font-medium text-zinc-900 tracking-wider" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              {authMode === 'signup' && <p className="text-[10px] text-zinc-400 font-medium px-2 mt-1">Min 6 characters, combining letters & numbers.</p>}
              <button type="submit" className="w-full bg-gradient-to-r from-orange-600 to-orange-500 text-white py-4 rounded-2xl font-bold text-lg hover:shadow-[0_8px_30px_-8px_rgba(249,115,22,0.4)] active:scale-95 transition-all duration-300 mt-4">
                {authMode === 'login' ? 'Login Securely' : 'Create My Account'}
              </button>
            </form>
            <button onClick={() => setAuthMode(authMode==='login'?'signup':'login')} className="w-full text-center mt-8 text-zinc-500 text-sm font-medium hover:text-zinc-900 transition-colors duration-300">
              {authMode==='login' ? 'Don\'t have an account? ' : 'Already have an account? '}<span className="text-orange-600 font-bold underline decoration-orange-200 underline-offset-4">Click Here</span>
            </button>
          </div>
        </div>
      )}

      {/* 🚀 PREMIUM CART DRAWER */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm transition-opacity duration-500 ease-out" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full sm:max-w-md bg-white h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 ease-out">
             
             <div className="flex justify-between items-center p-6 sm:p-8 border-b border-zinc-100">
               <h2 className="font-extrabold text-2xl text-zinc-900 tracking-tight">Checkout</h2>
               <X className="cursor-pointer bg-zinc-50 p-2 rounded-full hover:bg-zinc-200 w-10 h-10 transition-colors duration-300 text-zinc-500" onClick={() => setIsCartOpen(false)}/>
             </div>
             
             <div className="flex-1 overflow-y-auto px-6 sm:px-8 py-4 space-y-6 scrollbar-hide">
                
                <div className="space-y-4">
                  {(cart || []).map(item => (
                    <div key={item.cartItemId} className="flex flex-col border border-zinc-100/80 p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 bg-white">
                      <div className="flex justify-between items-start mb-3">
                        <div className="font-bold text-zinc-800 text-base leading-tight pr-4">{item.name}</div>
                        <div className="font-extrabold text-base text-zinc-900">₹{item.price * item.quantity}</div>
                      </div>
                      
                      <div className="flex justify-between items-center mt-auto">
                        <div className="text-xs font-bold text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded-md">₹{item.price} / each</div>
                        
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-zinc-50 rounded-lg p-1 border border-zinc-200/80">
                            <button onClick={() => updateQuantity(item.cartItemId, -1)} className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded shadow-sm transition-all"><Minus size={14}/></button>
                            <span className="w-8 text-center font-bold text-zinc-900 text-sm">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.cartItemId, 1)} className="p-1 text-zinc-500 hover:text-zinc-900 hover:bg-white rounded shadow-sm transition-all"><Plus size={14}/></button>
                          </div>
                          <button onClick={() => setCart(cart.filter(c => c.cartItemId !== item.cartItemId))} className="text-zinc-400 hover:text-rose-500 transition-colors duration-300 p-2 hover:bg-rose-50 rounded-lg"><Trash2 className="w-4 h-4"/></button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {(!cart || cart.length === 0) && (
                    <div className="text-center py-20 text-zinc-400 font-bold flex flex-col items-center">
                      <div className="bg-zinc-50 p-6 rounded-full mb-6"><ShoppingBag className="w-12 h-12 text-zinc-300"/></div>
                      <span className="text-lg text-zinc-600">Your cart is feeling light!</span>
                      <span className="text-sm font-medium mt-2">Let's add some delicious parathas.</span>
                    </div>
                  )}
                </div>

                {cart.length > 0 && (
                  <div className="border-t border-zinc-100 pt-6">
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Ticket className="w-4 h-4 text-orange-500"/> Offers & Benefits</h4>
                    
                    {appliedPromo ? (
                      <div className="bg-green-50 border border-green-200 p-4 rounded-2xl flex justify-between items-center mb-4">
                        <div className="flex items-center gap-3">
                          <div className="bg-green-100 p-2 rounded-full"><CheckCircle className="w-5 h-5 text-green-600"/></div>
                          <div>
                            <div className="text-green-700 font-bold text-sm">'{appliedPromo}' applied</div>
                            <div className="text-green-600 text-xs font-medium">You saved ₹{discountAmt}</div>
                          </div>
                        </div>
                        <button onClick={removePromo} className="text-rose-500 text-xs font-bold uppercase tracking-wider hover:bg-rose-50 px-2 py-1 rounded transition-colors">Remove</button>
                      </div>
                    ) : (
                      <>
                        <div className="flex gap-2 mb-4">
                          <input type="text" placeholder="Enter Promo Code" value={promoInput} onChange={e => setPromoInput(e.target.value)} className="flex-1 bg-zinc-50 border border-zinc-200 rounded-xl px-4 py-3 text-sm font-bold uppercase outline-none focus:bg-white focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all duration-300" />
                          <button onClick={() => applyPromo(promoInput)} className="bg-zinc-900 text-white px-6 rounded-xl font-bold text-sm hover:bg-orange-600 transition-colors shadow-md active:scale-95">Apply</button>
                        </div>
                        
                        {availablePromos.filter(p => p.isActive !== false).length > 0 && (
                          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide snap-x">
                             {availablePromos.filter(p => p.isActive !== false).map(p => (
                               <div key={p.id} className="snap-start shrink-0 bg-white border border-dashed border-orange-300 rounded-xl p-4 w-[180px] flex flex-col justify-between shadow-sm relative overflow-hidden group hover:border-orange-500 hover:shadow-md transition-all duration-300 cursor-pointer" onClick={() => applyPromo(p.code)}>
                                  <div className="absolute -right-4 -top-4 w-12 h-12 bg-orange-50 rounded-full opacity-50 group-hover:scale-150 transition-transform duration-500"></div>
                                  <div className="relative z-10">
                                    <div className="font-black text-zinc-800 tracking-widest text-sm mb-1">{p.code}</div>
                                    <div className="text-xs font-bold text-green-600">
                                      {p.type === 'PERCENT' ? `${p.value}% OFF (Up to ₹${p.maxDiscount})` : `Flat ₹${p.value} OFF`}
                                    </div>
                                    <div className="text-[10px] text-zinc-400 font-medium mt-1">Min Order: ₹{p.minOrder}</div>
                                  </div>
                                  <button className="mt-4 text-[11px] font-bold text-orange-600 group-hover:text-orange-700 text-left uppercase tracking-wider relative z-10 transition-colors">Tap to Apply</button>
                               </div>
                             ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {cart.length > 0 && (
                  <div className="border-t border-zinc-100 pt-6 pb-8">
                    <h4 className="text-xs font-bold text-zinc-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Receipt className="w-4 h-4 text-orange-500"/> Bill Details</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm font-medium text-zinc-600">
                        <span>Item Total</span><span>₹{cartSubTotal}</span>
                      </div>
                      
                      <div className="flex justify-between text-sm font-medium text-zinc-600 items-center">
                        <span className="flex items-center gap-1.5 border-b border-dashed border-zinc-300 pb-0.5">Delivery Fee <Bike className="w-3.5 h-3.5"/></span>
                        {deliveryCharge === 0 ? <span className="text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded border border-green-100">FREE</span> : <span>+ ₹{deliveryCharge}</span>}
                      </div>
                      
                      {deliveryCharge > 0 && <div className="text-[10px] text-orange-500 font-medium bg-orange-50 p-2 rounded-lg border border-orange-100">Add items worth ₹{dThreshold - cartSubTotal} more for FREE delivery.</div>}
                      
                      {discountAmt > 0 && (
                        <div className="flex justify-between text-sm font-bold text-green-600 pt-2 border-t border-green-100 border-dashed">
                          <span>Item Discount</span><span>- ₹{discountAmt}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-base font-extrabold text-zinc-900 pt-4 border-t border-zinc-200">
                        <span>To Pay</span><span>₹{cartGrandTotal}</span>
                      </div>
                      
                      {(discountAmt > 0 || (deliveryCharge === 0 && cartSubTotal >= dThreshold)) && (
                        <div className="text-right text-[10px] font-bold text-green-600 bg-green-50 p-2 rounded-lg inline-block float-right mt-2 border border-green-100 shadow-sm animate-in fade-in duration-500">
                          🎉 Total Savings: ₹{discountAmt + (deliveryCharge === 0 && cartSubTotal >= dThreshold ? dCharge : 0)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
             </div>

             {cart.length > 0 && (
               <div className="p-6 sm:p-8 bg-white border-t border-zinc-100 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)] z-10">
                 <button onClick={handleWhatsAppCheckout} className="w-full bg-gradient-to-r from-green-600 to-green-500 text-white py-4 sm:py-5 rounded-2xl font-bold text-lg hover:shadow-[0_8px_30px_-8px_rgba(34,197,94,0.4)] active:scale-95 transition-all duration-300 flex justify-between items-center px-8">
                   <div className="flex flex-col items-start text-left">
                     <span className="text-[10px] uppercase tracking-widest opacity-90 font-medium">Pay via WhatsApp</span>
                     <span className="text-xl font-extrabold">₹{cartGrandTotal}</span>
                   </div>
                   <div className="flex items-center gap-2">Place Order <ArrowRight className="w-5 h-5"/></div>
                 </button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

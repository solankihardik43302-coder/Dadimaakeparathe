import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ArrowRight, Plus, Minus, Heart, Flame,
  LogOut, CheckCircle, Utensils, MapPin, Instagram, X, Users, ShieldCheck, Mail, Phone, Quote
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, push, set, get } from "firebase/database";

export default function UserApp() {
  const [currentView, setCurrentView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allPasses, setAllPasses] = useState([]); 
  const [mealPassPlans, setMealPassPlans] = useState([]); 
  
  const [contactDetails, setContactDetails] = useState({ 
    phone: '919876543210', email: 'hello@dadimaa.com', logo: '/logo.png', address: 'Vijay Nagar, Indore, MP', instagram: 'dadimaakeparathe' 
  });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [authForm, setAuthForm] = useState({ name: '', phone: '', password: '' });
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })) : []));
    onValue(ref(db, 'addons'), snap => setAddons(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })) : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key })) : []));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });
    
    onValue(ref(db, 'meal_passes'), snap => {
      if (snap.exists()) { setAllPasses(Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key }))); } 
      else { setAllPasses([]); }
    });

    onValue(ref(db, 'meal_pass_plans'), snap => {
      if (snap.exists()) { setMealPassPlans(Object.entries(snap.val()).map(([key, val]) => ({ ...val, id: key }))); } 
      else { setMealPassPlans([]); }
    });

    const visited = sessionStorage.getItem('visited');
    if (!visited) {
      get(ref(db, 'stats/visitors')).then(snap => {
        set(ref(db, 'stats/visitors'), (snap.val() || 0) + 1);
        sessionStorage.setItem('visited', 'true');
      });
    }
  }, []);

  const cartTotal = cart.reduce((total, item) => total + (item.price + (item.addons ? item.addons.reduce((s, a) => s + a.price, 0) : 0)) * item.quantity, 0);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();

    if (authForm.phone.length !== 10) {
      alert("Please enter a valid 10-digit phone number.");
      return;
    }

    const pwdRegex = /^(?=.*[A-Za-z])(?=.*\d).{6,}$/;
    if (authMode === 'signup' && !pwdRegex.test(authForm.password)) {
      alert("Please create a stronger password (minimum 6 characters, including both letters and numbers).");
      return;
    }

    if (authMode === 'signup') {
      if (authForm.name.trim() === '') {
        alert("Please enter your name.");
        return;
      }
      
      get(ref(db, 'users')).then(snap => {
        let exists = false;
        if (snap.exists()) {
           const usersArray = Object.values(snap.val());
           exists = usersArray.some(u => u.phone === authForm.phone);
        }
        
        if (exists) {
           alert("Welcome back! This number is already registered. Please log in to continue.");
           setAuthMode('login'); 
        } else {
           const newUser = { name: authForm.name, phone: authForm.phone, password: authForm.password, createdAt: new Date().toISOString() };
           push(ref(db, 'users'), newUser).then((newRef) => {
              setCurrentUser({ ...newUser, id: newRef.key }); 
              alert("Welcome to Dadi Maa Ke Parathe! Your account has been created.");
              setShowAuthModal(false);
           });
        }
      });

    } else {
      get(ref(db, 'users')).then(snap => {
        if(snap.exists()) {
          const users = Object.entries(snap.val()).map(([key, val]) => ({...val, id: key}));
          const userByPhone = users.find(u => u.phone === authForm.phone);
          
          if (userByPhone) {
            if (userByPhone.password === authForm.password) {
              setCurrentUser(userByPhone);
              setShowAuthModal(false);
            } else {
              alert("Incorrect Password! Please try again.");
            }
          } else {
            setAuthMode('signup');
          }
        } else {
          setAuthMode('signup');
        }
      });
    }
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

  const handleSubscribe = (planName) => {
    if (!currentUser) { setShowAuthModal(true); return; }
    const subData = { userId: currentUser.id, name: currentUser.name, phone: currentUser.phone, plan: planName, startDate: new Date().toISOString() };
    push(ref(db, 'meal_passes'), subData).then(() => {
      alert(`${planName} Activated! We will contact you soon.`);
      setCurrentView('home');
      window.scrollTo(0,0);
    });
  };

  const handleWhatsAppCheckout = () => {
    if (!currentUser) return setShowAuthModal(true);
    const orderData = { date: new Date().toLocaleDateString(), time: new Date().toLocaleTimeString(), customerName: currentUser.name, customerPhone: currentUser.phone, items: cart, total: cartTotal, status: 'Pending' };
    push(ref(db, 'orders'), orderData);

    let msg = `*New Order - Dadi Maa Ke Parathe*\n`;
    cart.forEach(item => { 
      msg += `\n*${item.quantity}x ${item.name}*`; 
    });
    msg += `\n\n*Total: ₹${cartTotal}*\nName: ${currentUser.name}`;

    window.open(`https://wa.me/${contactDetails.phone}?text=${encodeURIComponent(msg)}`, '_blank');
    setCart([]);
    setIsCartOpen(false);
  };

  const instaHandle = contactDetails.instagram ? contactDetails.instagram.replace('@', '') : '';

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans flex flex-col selection:bg-orange-100">
      
      {/* ---------------- NAVBAR ---------------- */}
      <nav className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-zinc-100 px-4 sm:px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => {setCurrentView('home'); window.scrollTo(0,0);}}>
            {contactDetails.logo && <img src={contactDetails.logo} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-orange-100 object-cover shadow-sm" alt="logo" onError={(e) => e.target.src = '/logo.png'}/>}
            <div className="flex flex-col">
              <span className="text-sm sm:text-xl font-black text-zinc-900 leading-none">Dadi Maa Ke</span>
              <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-widest">Parathe</span>
            </div>
          </div>
          <div className="hidden sm:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 space-x-8 bg-zinc-100/50 px-6 py-2 rounded-full border border-zinc-200">
            {['Home', 'Menu', 'Meal Pass', 'About'].map(v => (
              <button key={v} onClick={() => {setCurrentView(v.toLowerCase().replace(' ', '')); window.scrollTo(0,0);}} className={`text-sm font-bold transition-all hover:-translate-y-0.5 ${currentView === v.toLowerCase().replace(' ', '') ? 'text-orange-600' : 'text-zinc-500 hover:text-orange-600'}`}>{v}</button>
            ))}
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {currentUser ? 
              <button onClick={() => setCurrentUser(null)} className="text-rose-500 bg-rose-50 p-2 rounded-full hover:bg-rose-100 transition-colors"><LogOut className="w-4 h-4 sm:w-5 sm:h-5"/></button> 
              : 
              <button onClick={() => setShowAuthModal(true)} className="text-xs sm:text-sm font-bold bg-zinc-900 text-white px-5 py-2.5 rounded-full hover:bg-orange-600 shadow-lg active:scale-95 transition-all">Login</button>
            }
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 sm:p-2.5 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors shadow-sm">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900"/>
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white shadow-sm">{cart.length}</span>}
            </button>
          </div>
        </div>
        <div className="flex sm:hidden space-x-6 overflow-x-auto scrollbar-hide pt-3 mt-3 border-t border-zinc-100 px-2">
          {['Home', 'Menu', 'Meal Pass', 'About'].map(v => (
            <button key={v} onClick={() => {setCurrentView(v.toLowerCase().replace(' ', '')); window.scrollTo(0,0);}} className={`text-xs font-bold whitespace-nowrap pb-1 transition-all ${currentView === v.toLowerCase().replace(' ', '') ? 'text-orange-600 border-b-2 border-orange-600' : 'text-zinc-400'}`}>{v}</button>
          ))}
        </div>
      </nav>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className="flex-grow">
        
        {/* PREMIUM HOME VIEW */}
        {currentView === 'home' && (
          <>
            <div className="flex flex-col items-center pt-16 sm:pt-28 pb-12 sm:pb-20 text-center px-6 animate-in fade-in duration-700 relative overflow-hidden">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[30rem] h-[30rem] bg-orange-500/10 rounded-full blur-3xl -z-10"></div>
              <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-700 px-4 py-1.5 rounded-full text-xs font-bold mb-6 border border-orange-100 shadow-sm">
                <Flame className="w-3 h-3 fill-orange-600" />
                <span className="uppercase tracking-widest">100% Authentic Recipe</span>
              </div>
              <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 text-zinc-900 leading-tight tracking-tight">
                Milega esa swad,<br/>
                <span className="text-orange-600 bg-clip-text">Na aayegi ghar ki yaad.</span>
              </h1>
              <p className="text-zinc-500 text-base sm:text-xl max-w-2xl mx-auto mb-10 font-medium leading-relaxed">
                Hand-rolled, whole-wheat parathas crafted with love, pure desi ghee, and grandmother's secret spices. Delivered hot & fresh in Indore.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mb-16 w-full sm:w-auto">
                <button onClick={() => {setCurrentView('menu'); window.scrollTo(0,0);}} className="w-full sm:w-auto px-8 py-4 bg-orange-600 text-white rounded-full font-bold flex items-center justify-center space-x-2 shadow-xl shadow-orange-900/20 hover:bg-orange-500 hover:-translate-y-1 transition-all text-lg">
                  <span>Order Online</span><ArrowRight className="w-5 h-5"/>
                </button>
                <button onClick={() => {setCurrentView('mealpass'); window.scrollTo(0,0);}} className="w-full sm:w-auto px-8 py-4 bg-white text-zinc-900 border-2 border-zinc-200 rounded-full font-bold flex items-center justify-center space-x-2 hover:border-zinc-900 hover:bg-zinc-50 transition-all text-lg shadow-sm">
                  <ShieldCheck className="w-5 h-5 text-orange-500"/>
                  <span>View Meal Passes</span>
                </button>
              </div>
              <div className="relative group">
                <img src={contactDetails.logo} className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border-[10px] border-white shadow-2xl object-cover group-hover:rotate-6 group-hover:scale-105 transition-all duration-700 relative z-10" alt="Dadi Maa Ke Parathe" onError={(e) => e.target.src = '/logo.png'}/>
                <div className="absolute -bottom-4 -right-4 sm:-bottom-6 sm:-right-6 bg-white p-3 sm:p-4 rounded-3xl shadow-xl flex items-center gap-3 border border-orange-50 z-20 animate-bounce">
                  <div className="bg-orange-100 p-2 rounded-full"><Heart className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600 fill-orange-600"/></div>
                  <div className="text-left"><div className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest">Made with</div><div className="font-black text-sm sm:text-base text-zinc-900">100% Love</div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-5xl mx-auto px-6 pb-20 animate-in slide-in-from-bottom duration-700 delay-200">
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 text-center hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default">
                 <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Utensils className="w-8 h-8 text-orange-600" /></div>
                 <h4 className="font-black text-xl mb-2 text-zinc-900">Pure Ingredients</h4>
                 <p className="text-sm text-zinc-500 font-medium">Made with 100% whole wheat and rich desi ghee for a healthy stomach.</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 text-center hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default">
                 <div className="bg-rose-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Heart className="w-8 h-8 text-rose-500 fill-rose-100" /></div>
                 <h4 className="font-black text-xl mb-2 text-zinc-900">Ghar Ka Swad</h4>
                 <p className="text-sm text-zinc-500 font-medium">Authentic recipes and spice blends passed down from generations.</p>
              </div>
              <div className="bg-white p-8 rounded-[2rem] border border-zinc-100 text-center hover:shadow-2xl hover:-translate-y-2 transition-all cursor-default">
                 <div className="bg-green-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"><Flame className="w-8 h-8 text-green-600 fill-green-100" /></div>
                 <h4 className="font-black text-xl mb-2 text-zinc-900">Hot & Fresh</h4>
                 <p className="text-sm text-zinc-500 font-medium">Every paratha is made to order and delivered piping hot to your door.</p>
              </div>
            </div>
          </>
        )}

        {/* PREMIUM MENU VIEW */}
        {currentView === 'menu' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between mb-10 gap-6 items-start md:items-center">
              <div>
                <h2 className="text-3xl sm:text-4xl font-black text-zinc-900">Our Menu</h2>
                <p className="text-zinc-500 font-medium mt-1">Freshly prepared, just for you.</p>
              </div>
              <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto p-1 bg-zinc-100 rounded-full">
                <button onClick={() => setSelectedCategory("All")} className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === "All" ? 'bg-white text-orange-600 shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}>All</button>
                {categories.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.name)} className={`px-5 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === c.name ? 'bg-white text-orange-600 shadow-md' : 'text-zinc-500 hover:text-zinc-900'}`}>{c.name}</button>)}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {menuItems.filter(i => selectedCategory === "All" || i.category === selectedCategory).map(item => (
                <div key={item.id} className={`bg-white rounded-[2rem] overflow-hidden border border-zinc-100 shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group flex flex-col ${!item.inStock && 'opacity-60'}`}>
                  <div className="relative overflow-hidden p-2 bg-zinc-50">
                    {/* ADDED onError FALLBACK HERE */}
                    <img src={item.image || '/logo.png'} className={`w-full h-48 sm:h-56 object-cover rounded-3xl group-hover:scale-105 transition-transform duration-700 ${!item.inStock && 'grayscale'}`} alt="" onError={(e) => { e.target.src = '/logo.png'; }}/>
                    {!item.inStock && <div className="absolute inset-0 flex items-center justify-center"><span className="bg-red-600 text-white font-black px-4 py-2 rounded-xl uppercase tracking-widest text-xs shadow-xl backdrop-blur-sm bg-opacity-90">Out of Stock</span></div>}
                  </div>
                  <div className="p-5 sm:p-6 flex flex-col flex-grow">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <h3 className="font-black text-xl sm:text-2xl text-zinc-900 leading-tight">{item.name}</h3>
                      <span className="text-orange-600 font-black text-xl tracking-tight">₹{item.price}</span>
                    </div>
                    {item.description && <p className="text-sm text-zinc-500 font-medium mb-4 line-clamp-2">{item.description}</p>}
                    
                    <div className="mt-auto pt-4">
                      <button disabled={!item.inStock} onClick={() => { setCart([...cart, {...item, cartItemId: Date.now(), quantity: 1, addons: []}]); setIsCartOpen(true); }} className={`w-full py-4 rounded-2xl font-bold transition-all ${item.inStock ? 'bg-orange-50 text-orange-600 hover:bg-orange-600 hover:text-white shadow-sm hover:shadow-orange-500/30 active:scale-95' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}>{item.inStock ? '+ Add to Order' : 'Unavailable'}</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PREMIUM MEAL PASS VIEW */}
        {currentView === 'mealpass' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center animate-in fade-in">
            {myPass && daysRemaining > 0 ? (
              <div className="bg-green-50 border border-green-200 p-8 sm:p-12 rounded-[2.5rem] shadow-xl text-center max-w-lg mx-auto transform hover:scale-105 transition-transform">
                <ShieldCheck className="w-16 h-16 sm:w-20 sm:h-20 text-green-500 mx-auto mb-6" />
                <h3 className="text-2xl sm:text-3xl font-black text-green-900 mb-2">Your {myPass.plan} is Active!</h3>
                <div className="text-6xl sm:text-7xl font-black text-green-600 my-6 tracking-tighter">
                  {daysRemaining} <span className="text-xl sm:text-2xl font-bold text-green-800 tracking-normal block sm:inline">Days Left</span>
                </div>
                <p className="text-green-700 font-bold bg-green-200/50 py-2 px-4 rounded-full inline-block mt-4">Enjoy home-cooked meals without any hassle.</p>
              </div>
            ) : (
              <>
                <h2 className="text-4xl sm:text-5xl font-black mb-4 text-zinc-900 tracking-tight">Choose Your Meal Pass</h2>
                <p className="text-zinc-500 font-medium mb-12 max-w-xl mx-auto">Subscribe to our monthly plans and get hot, home-cooked food delivered to you daily without the hassle of ordering every day.</p>
                {myPass && daysRemaining === 0 && <div className="bg-red-50 text-red-600 font-bold p-4 rounded-xl mb-8 max-w-md mx-auto border border-red-100">Your previous pass has expired. Please renew!</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 text-left justify-center">
                  {mealPassPlans.length > 0 ? mealPassPlans.map(plan => (
                     <div key={plan.id} className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl group-hover:bg-orange-500/10 transition-colors"></div>
                        <span className="text-orange-600 font-black uppercase tracking-widest text-[10px] sm:text-xs mb-4 relative z-10">{plan.name}</span>
                        <div className="text-4xl sm:text-5xl font-black mb-8 text-zinc-900 relative z-10">₹{plan.price}<span className="text-lg sm:text-xl text-zinc-400 font-medium">/{plan.duration}</span></div>
                        <ul className="mb-8 space-y-3 text-sm text-zinc-600 font-medium relative z-10">
                          {plan.features.split(',').map((f, i) => <li key={i} className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500 shrink-0"/> {f.trim()}</li>)}
                        </ul>
                        <button onClick={() => handleSubscribe(plan.name)} className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-600 hover:text-white active:scale-95 transition-all mt-auto text-sm sm:text-base relative z-10">Subscribe Now</button>
                     </div>
                  )) : (
                     <>
                       {/* DEFAULT FALLBACK PLANS */}
                       <div className="bg-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-100 shadow-lg hover:shadow-2xl hover:-translate-y-2 transition-all flex flex-col relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl"></div>
                         <span className="text-orange-600 font-black uppercase tracking-widest text-[10px] sm:text-xs mb-4">Standard Pass</span>
                         <div className="text-4xl sm:text-5xl font-black mb-8 text-zinc-900">₹2,499<span className="text-lg sm:text-xl text-zinc-400 font-medium">/30 Days</span></div>
                         <ul className="mb-8 space-y-3 text-sm text-zinc-600 font-medium">
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> 1 Meal Every Day</li>
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-500"/> Free Delivery</li>
                         </ul>
                         <button onClick={() => handleSubscribe('Standard Pass')} className="w-full py-4 bg-orange-50 text-orange-600 rounded-2xl font-bold hover:bg-orange-600 hover:text-white active:scale-95 transition-all mt-auto text-sm sm:text-base">Subscribe Now</button>
                       </div>
                       <div className="bg-gradient-to-br from-zinc-900 to-black text-white p-8 sm:p-10 rounded-[2.5rem] border border-zinc-800 shadow-2xl hover:shadow-orange-900/20 hover:-translate-y-2 transition-all flex flex-col relative overflow-hidden ring-1 ring-white/10 hover:ring-orange-500/50">
                         <div className="absolute top-0 right-0 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
                         <span className="text-orange-400 font-black uppercase tracking-widest text-[10px] sm:text-xs mb-4 flex items-center gap-2"><Flame className="w-4 h-4"/> Heavy Diet Pass</span>
                         <div className="text-4xl sm:text-5xl font-black mb-8 text-white">₹3,999<span className="text-lg sm:text-xl text-zinc-500 font-medium">/30 Days</span></div>
                         <ul className="mb-8 space-y-3 text-sm text-zinc-400 font-medium">
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500"/> 2 Meals Every Day</li>
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500"/> Sunday Special Included</li>
                           <li className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-orange-500"/> Priority Support</li>
                         </ul>
                         <button onClick={() => handleSubscribe('Heavy Diet Pass')} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-500 active:scale-95 transition-all mt-auto shadow-lg shadow-orange-900/50 text-sm sm:text-base">Get Premium Pass</button>
                       </div>
                     </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* PREMIUM ABOUT VIEW */}
        {currentView === 'about' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 animate-in fade-in">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-12 text-center text-zinc-900 tracking-tight">Our Story</h2>
            
            <div className="bg-white p-8 sm:p-14 rounded-[3rem] border border-zinc-100 shadow-xl mb-12 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-50 rounded-full blur-3xl -z-10"></div>
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-10 text-center sm:text-left relative z-10">
                <div className="bg-orange-500 p-5 rounded-3xl shadow-lg shadow-orange-500/30 shrink-0 transform -rotate-6"><Heart className="w-10 h-10 text-white fill-white" /></div>
                <div>
                  <h3 className="text-3xl sm:text-4xl font-black mb-3 text-zinc-900">Ek Choti Street Shop Se...</h3>
                  <p className="text-orange-600 font-bold uppercase tracking-widest text-xs sm:text-sm">A journey fueled by passion</p>
                </div>
              </div>
              <div className="space-y-6 text-zinc-600 leading-loose sm:text-lg relative z-10 font-medium">
                <p>
                  Dadi Maa Ke Parathe ki shuruaat ek choti si street shop se hui thi. Ek chhota sa thela, par sapne aur swad dono bade the. Humara maksad sirf logo ka pet bharna nahi tha, balki unhe wo comfort aur pyar dena tha jo sirf ghar ke khane mein milta hai.
                </p>
                <div className="bg-zinc-50 border-l-4 border-orange-500 p-6 rounded-r-2xl my-8 italic text-zinc-800 font-bold">
                  <Quote className="w-6 h-6 text-orange-300 mb-2" />
                  "Humare yahan bahar ka staff kam, aur ghar ke log hi zyada kaam karte hain. Hum khana banate nahi, khilate hain!"
                </div>
                <p>
                  Aaj 3 saal baad bhi, Indore mein successfully chalne ke bawajood, humara philosophy wahi hai. Taki har ek parathe mein dadi maa ka wahi pyaar, care aur authentic 'Ghar Jaisa Swad' barkarar rahe.
                </p>
              </div>
            </div>

            <h3 className="text-2xl sm:text-3xl font-black mb-8 text-center text-zinc-900">Get In Touch</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <a href={`tel:${contactDetails.phone}`} className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors"><Phone className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Call Us</div><div className="font-bold text-zinc-900 text-lg">{contactDetails.phone}</div></div>
              </a>
              <a href={`mailto:${contactDetails.email || 'hello@dadimaa.com'}`} className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors"><Mail className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Email</div><div className="font-bold text-zinc-900 text-lg">{contactDetails.email || 'hello@dadimaa.com'}</div></div>
              </a>
              <a href={`https://instagram.com/${instaHandle}`} target="_blank" rel="noopener noreferrer" className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all hover:-translate-y-1 cursor-pointer group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors"><Instagram className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Instagram</div><div className="font-bold text-zinc-900 text-lg">@{instaHandle}</div></div>
              </a>
              <div className="bg-white p-6 rounded-[2rem] border border-zinc-100 flex items-center gap-5 hover:border-orange-300 hover:shadow-xl transition-all hover:-translate-y-1 group">
                <div className="bg-orange-50 p-4 rounded-2xl group-hover:bg-orange-500 transition-colors"><MapPin className="w-6 h-6 text-orange-600 group-hover:text-white transition-colors"/></div>
                <div><div className="text-xs text-zinc-500 font-bold uppercase tracking-widest mb-1">Visit Us</div><div className="font-bold text-zinc-900 leading-tight">{contactDetails.address}</div></div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ---------------- PREMIUM FOOTER ---------------- */}
      <footer className="bg-zinc-950 text-zinc-400 py-16 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          
          <div className="space-y-6">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => {setCurrentView('home'); window.scrollTo(0,0);}}>
              {contactDetails.logo && <img src={contactDetails.logo} className="w-14 h-14 rounded-full border-2 border-zinc-800" alt="logo" onError={(e) => e.target.src = '/logo.png'}/>}
              <div>
                <span className="text-2xl font-black text-white leading-none block">Dadi Maa Ke</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Parathe</span>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed font-medium">Milega esa swad, Na aayegi ghar ki yaad. Authentic whole-wheat parathas crafted with love.</p>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-4 text-sm font-medium">
              <li><button onClick={() => {setCurrentView('home'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Home</button></li>
              <li><button onClick={() => {setCurrentView('menu'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Order Menu</button></li>
              <li><button onClick={() => {setCurrentView('mealpass'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Meal Passes</button></li>
              <li><button onClick={() => {setCurrentView('about'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-3"><ArrowRight className="w-3 h-3"/> Our Story</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Get In Touch</h4>
            <ul className="space-y-5 text-sm font-medium">
              <li className="flex items-center gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl"><Phone className="w-4 h-4 text-orange-500"/></div> 
                <a href={`tel:${contactDetails.phone}`} className="hover:text-orange-500 transition-colors cursor-pointer">{contactDetails.phone}</a>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl"><Mail className="w-4 h-4 text-orange-500"/></div> 
                <a href={`mailto:${contactDetails.email || 'hello@dadimaa.com'}`} className="hover:text-orange-500 transition-colors cursor-pointer">{contactDetails.email || 'hello@dadimaa.com'}</a>
              </li>
              <li className="flex items-center gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl"><Instagram className="w-4 h-4 text-orange-500"/></div> 
                <a href={`https://instagram.com/${instaHandle}`} target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors cursor-pointer">@{instaHandle}</a>
              </li>
              <li className="flex items-start gap-4">
                <div className="bg-zinc-900 p-2.5 rounded-xl mt-1"><MapPin className="w-4 h-4 text-orange-500"/></div> 
                <span className="leading-relaxed">{contactDetails.address}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Find Us</h4>
            <div className="rounded-3xl overflow-hidden h-40 border border-zinc-800 opacity-80 hover:opacity-100 transition-all shadow-lg shadow-black">
              <iframe 
                title="Google Maps Location"
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
          <a href="https://instagram.com/axiomdesignsco" target="_blank" rel="noopener noreferrer" className="bg-zinc-900/50 px-5 py-2.5 rounded-full border border-zinc-800 font-medium hover:border-zinc-700 hover:bg-zinc-900 transition-all cursor-pointer">
            Designed with <Heart className="w-3 h-3 inline text-rose-500 fill-rose-500 mx-1 animate-pulse"/> by <span className="font-bold text-white tracking-widest uppercase text-[10px]">Axiom Designs Co.</span>
          </a>
        </div>
      </footer>

      {/* ---------------- MODALS & DRAWERS ---------------- */}
      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}></div>
          <div className="relative bg-white p-8 sm:p-10 rounded-[2.5rem] w-full max-w-sm animate-in zoom-in-95 shadow-2xl">
            <X className="absolute top-6 right-6 cursor-pointer text-zinc-400 hover:text-zinc-900 bg-zinc-100 rounded-full p-2 w-10 h-10 transition-colors" onClick={() => setShowAuthModal(false)}/>
            <div className="bg-orange-50 w-16 h-16 rounded-full flex items-center justify-center mb-6">
              <Users className="w-8 h-8 text-orange-600"/>
            </div>
            <h3 className="text-3xl font-black mb-2 text-zinc-900">{authMode === 'login' ? 'Welcome Back!' : 'Create Account'}</h3>
            <p className="text-zinc-500 text-sm font-medium mb-8">
              {authMode === 'login' ? 'Login to order your favorite parathas.' : 'Join the Dadi Maa family today.'}
            </p>
            
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <input 
                  placeholder="Your Name" 
                  required 
                  className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white transition-colors font-medium text-zinc-900" 
                  onChange={e => setAuthForm({...authForm, name: e.target.value})} 
                />
              )}
              
              <input 
                type="tel"
                placeholder="Phone Number (10 digits)" 
                required 
                value={authForm.phone}
                className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white transition-colors font-medium text-zinc-900 tracking-wider" 
                onChange={e => {
                  const numbersOnly = e.target.value.replace(/\D/g, '').slice(0, 10);
                  setAuthForm({...authForm, phone: numbersOnly});
                }} 
              />
              
              <input 
                type="password" 
                placeholder="Password" 
                required 
                className="w-full bg-zinc-50 border border-zinc-200 p-4 rounded-2xl outline-none focus:border-orange-500 focus:bg-white transition-colors font-medium text-zinc-900 tracking-wider" 
                onChange={e => setAuthForm({...authForm, password: e.target.value})} 
              />
              {authMode === 'signup' && <p className="text-[10px] text-zinc-400 font-medium px-2 mt-1">Min 6 characters, combining letters & numbers.</p>}
              
              <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-black text-lg hover:bg-orange-500 shadow-xl shadow-orange-600/20 active:scale-95 transition-all mt-4">
                {authMode === 'login' ? 'Login Securely' : 'Create My Account'}
              </button>
            </form>
            
            <button onClick={() => setAuthMode(authMode==='login'?'signup':'login')} className="w-full text-center mt-8 text-zinc-500 text-sm font-medium hover:text-zinc-900 transition-colors">
              {authMode==='login' ? 'Don\'t have an account? ' : 'Already have an account? '}<span className="text-orange-600 font-bold underline decoration-orange-200 underline-offset-4">Click Here</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full sm:max-w-md bg-white h-full p-6 sm:p-8 flex flex-col shadow-2xl animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-8">
               <h2 className="font-black text-3xl text-zinc-900">Your Order</h2>
               <X className="cursor-pointer bg-zinc-100 p-2 rounded-full hover:bg-zinc-200 w-10 h-10 transition-colors text-zinc-500" onClick={() => setIsCartOpen(false)}/>
             </div>
             <div className="flex-1 overflow-y-auto space-y-5 pr-2">
                {cart.map(item => (
                  <div key={item.cartItemId} className="flex justify-between items-center border border-zinc-100 p-4 rounded-3xl shadow-sm bg-zinc-50/50">
                    <div>
                      <div className="font-bold text-zinc-900 text-lg">{item.name}</div>
                      <div className="text-xs font-bold text-orange-600 bg-orange-50 inline-block px-2 py-1 rounded-md mt-1">₹{item.price} x {item.quantity}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="font-black text-xl text-zinc-900">₹{item.price * item.quantity}</div>
                      <button onClick={() => setCart(cart.filter(c => c.cartItemId !== item.cartItemId))} className="text-rose-500 bg-white border border-rose-100 p-2.5 rounded-xl hover:bg-rose-50 hover:border-rose-200 transition-all shadow-sm"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && (
                  <div className="text-center py-32 text-zinc-400 font-bold flex flex-col items-center">
                    <div className="bg-zinc-50 p-6 rounded-full mb-6"><ShoppingBag className="w-12 h-12 text-zinc-300"/></div>
                    <span className="text-lg">Cart is empty!</span>
                    <span className="text-sm font-medium mt-2">Let's add some delicious parathas.</span>
                  </div>
                )}
             </div>
             {cart.length > 0 && (
               <div className="pt-6 border-t border-zinc-100 mt-auto bg-white">
                 <div className="flex justify-between items-end mb-6">
                   <span className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Total Amount</span>
                   <span className="text-3xl font-black text-zinc-900">₹{cartTotal}</span>
                 </div>
                 <button onClick={handleWhatsAppCheckout} className="w-full bg-green-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-green-500 shadow-xl shadow-green-900/20 active:scale-95 transition-all flex justify-center items-center gap-2">
                   Order on WhatsApp <ArrowRight className="w-5 h-5"/>
                 </button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, ArrowRight, Plus, Minus, Heart, Flame,
  LogOut, CheckCircle, Utensils, MapPin, Instagram, X, Users, ShieldCheck, Mail, Phone
} from 'lucide-react';
import { db } from "./firebase";
import { ref, onValue, push, set, get } from "firebase/database";

export default function UserApp() {
  const [currentView, setCurrentView] = useState('home');
  const [menuItems, setMenuItems] = useState([]);
  const [addons, setAddons] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allPasses, setAllPasses] = useState([]); 
  
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
    onValue(ref(db, 'menu'), snap => setMenuItems(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })) : []));
    onValue(ref(db, 'addons'), snap => setAddons(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, ...x })) : []));
    onValue(ref(db, 'categories'), snap => setCategories(snap.val() ? Object.entries(snap.val()).map(([id, x]) => ({ id, name: x.name })) : []));
    onValue(ref(db, 'settings'), snap => { if (snap.exists()) setContactDetails(prev => ({ ...prev, ...snap.val() })); });
    
    onValue(ref(db, 'meal_passes'), snap => {
      if (snap.exists()) { setAllPasses(Object.entries(snap.val()).map(([id, x]) => ({ id, ...x }))); } 
      else { setAllPasses([]); }
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
    if (authMode === 'signup') {
      const newUser = { id: Date.now(), ...authForm };
      push(ref(db, 'users'), newUser); 
      setCurrentUser(newUser); 
      alert("Welcome! Account Created.");
    } else {
      get(ref(db, 'users')).then(snap => {
        if(snap.exists()) {
          const user = Object.values(snap.val()).find(u => u.phone === authForm.phone && u.password === authForm.password);
          if (user) setCurrentUser(user); else alert("Wrong Phone or Password!");
        } else { alert("Please Sign Up first!"); }
      });
    }
    setShowAuthModal(false);
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

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans flex flex-col selection:bg-orange-100">
      {/* Mobile Friendly Navbar */}
      <nav className="sticky top-0 z-40 w-full bg-white/90 backdrop-blur-md border-b border-zinc-100 px-4 sm:px-6 py-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 sm:space-x-3 cursor-pointer" onClick={() => {setCurrentView('home'); window.scrollTo(0,0);}}>
            {contactDetails.logo && <img src={contactDetails.logo} className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-orange-100 object-cover shadow-sm" alt="logo" />}
            <div className="flex flex-col">
              <span className="text-sm sm:text-xl font-black text-zinc-900 leading-none">Dadi Maa Ke</span>
              <span className="text-[10px] sm:text-xs font-bold text-orange-600 uppercase tracking-widest">Parathe</span>
            </div>
          </div>
          <div className="hidden sm:flex absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 space-x-8">
            {/* Added 'Home' to Desktop Links */}
            {['Home', 'Menu', 'Meal Pass', 'About'].map(v => (
              <button key={v} onClick={() => {setCurrentView(v.toLowerCase().replace(' ', '')); window.scrollTo(0,0);}} className={`text-sm font-bold transition-colors ${currentView === v.toLowerCase().replace(' ', '') ? 'text-orange-600' : 'text-zinc-500 hover:text-orange-600'}`}>{v}</button>
            ))}
          </div>
          <div className="flex items-center space-x-3 sm:space-x-4">
            {currentUser ? 
              <button onClick={() => setCurrentUser(null)} className="text-rose-500 bg-rose-50 p-2 rounded-full hover:bg-rose-100 transition-colors"><LogOut className="w-4 h-4 sm:w-5 sm:h-5"/></button> 
              : 
              <button onClick={() => setShowAuthModal(true)} className="text-xs sm:text-sm font-bold bg-orange-50 text-orange-600 px-4 py-2 rounded-full hover:bg-orange-100 transition-colors">Login</button>
            }
            <button onClick={() => setIsCartOpen(true)} className="relative p-2 sm:p-2.5 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-900"/>
              {cart.length > 0 && <span className="absolute -top-1 -right-1 bg-orange-600 text-white text-[10px] w-4 h-4 sm:w-5 sm:h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">{cart.length}</span>}
            </button>
          </div>
        </div>
        <div className="flex sm:hidden space-x-6 overflow-x-auto scrollbar-hide pt-3 mt-3 border-t border-zinc-100 px-2">
          {/* Added 'Home' to Mobile Links */}
          {['Home', 'Menu', 'Meal Pass', 'About'].map(v => (
            <button key={v} onClick={() => {setCurrentView(v.toLowerCase().replace(' ', '')); window.scrollTo(0,0);}} className={`text-xs font-bold whitespace-nowrap pb-1 ${currentView === v.toLowerCase().replace(' ', '') ? 'text-orange-600 border-b-2 border-orange-600' : 'text-zinc-400'}`}>{v}</button>
          ))}
        </div>
      </nav>

      <main className="flex-grow">
        {currentView === 'home' && (
          <div className="flex flex-col items-center pt-16 sm:pt-20 pb-16 text-center px-6 animate-in fade-in duration-700">
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold mb-6 text-zinc-900 leading-tight">Ghar Jaisa Swad,<br/><span className="text-orange-600">Ab Indore Mein.</span></h1>
            <button onClick={() => {setCurrentView('menu'); window.scrollTo(0,0);}} className="px-6 sm:px-8 py-3 sm:py-4 bg-zinc-900 text-white rounded-full font-bold flex items-center space-x-2 shadow-xl hover:bg-zinc-800 hover:scale-105 active:scale-95 transition-all mb-12"><span>Explore Menu</span><ArrowRight/></button>
            <img src={contactDetails.logo} className="w-48 h-48 sm:w-56 sm:h-56 md:w-64 md:h-64 rounded-full border-8 border-white shadow-2xl object-cover hover:rotate-3 transition-transform duration-500" alt="Hero" />
          </div>
        )}

        {currentView === 'menu' && (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12 animate-in fade-in">
            <div className="flex flex-col md:flex-row justify-between mb-8 gap-4 sm:gap-6">
              <h2 className="text-2xl sm:text-3xl font-bold">Our Menu</h2>
              <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide w-full md:w-auto">
                <button onClick={() => setSelectedCategory("All")} className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap ${selectedCategory === "All" ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-600 hover:border-zinc-300'}`}>All</button>
                {categories.map(c => <button key={c.id} onClick={() => setSelectedCategory(c.name)} className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap ${selectedCategory === c.name ? 'bg-zinc-900 text-white' : 'bg-white border text-zinc-600 hover:border-zinc-300'}`}>{c.name}</button>)}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {menuItems.filter(i => selectedCategory === "All" || i.category === selectedCategory).map(item => (
                <div key={item.id} className={`bg-white rounded-3xl overflow-hidden border p-4 sm:p-6 transition-all hover:shadow-lg ${!item.inStock && 'opacity-60'}`}>
                  <div className="relative">
                    <img src={item.image || '/logo.png'} className={`w-full h-40 sm:h-48 object-cover rounded-2xl mb-4 ${!item.inStock && 'grayscale'}`} alt=""/>
                    {!item.inStock && <div className="absolute inset-0 flex items-center justify-center"><span className="bg-red-600 text-white font-black px-4 py-1 rounded-lg uppercase tracking-widest text-xs transform -rotate-12 shadow-xl">Out of Stock</span></div>}
                  </div>
                  <div className="flex justify-between items-start mb-2"><h3 className="font-bold text-lg sm:text-xl text-zinc-900">{item.name}</h3><span className="text-orange-600 font-black text-lg">₹{item.price}</span></div>
                  <button disabled={!item.inStock} onClick={() => { setCart([...cart, {...item, cartItemId: Date.now(), quantity: 1, addons: []}]); setIsCartOpen(true); }} className={`w-full py-3 rounded-xl font-bold mt-4 transition-all ${item.inStock ? 'bg-zinc-50 hover:bg-orange-50 text-zinc-900 hover:text-orange-700 active:scale-95' : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}>{item.inStock ? '+ Add to Order' : 'Unavailable'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {currentView === 'mealpass' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 text-center animate-in fade-in">
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
                <h2 className="text-3xl sm:text-4xl font-black mb-10 sm:mb-16">Choose Your Meal Pass</h2>
                {myPass && daysRemaining === 0 && <div className="bg-red-50 text-red-600 font-bold p-4 rounded-xl mb-8 max-w-md mx-auto">Your previous pass has expired. Please renew!</div>}
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8 text-left">
                  <div className="bg-white p-6 sm:p-8 rounded-3xl border shadow-sm flex flex-col hover:border-orange-500 hover:shadow-lg transition-all">
                    <span className="text-orange-600 font-black uppercase tracking-widest text-[10px] sm:text-xs mb-4">Standard Pass</span>
                    <div className="text-4xl sm:text-5xl font-black mb-8">₹2,499<span className="text-lg sm:text-xl text-zinc-400 font-medium">/30 Days</span></div>
                    <ul className="mb-8 space-y-2 text-sm text-zinc-600 font-medium"><li>✓ 1 Meal Every Day</li><li>✓ Free Delivery</li></ul>
                    <button onClick={() => handleSubscribe('Standard Pass')} className="w-full py-4 bg-zinc-100 rounded-2xl font-bold hover:bg-zinc-200 active:scale-95 transition-all mt-auto text-sm sm:text-base">Subscribe Now</button>
                  </div>
                  <div className="bg-zinc-900 text-white p-6 sm:p-8 rounded-3xl border border-zinc-800 shadow-2xl flex flex-col transform sm:-translate-y-4">
                    <span className="text-orange-400 font-black uppercase tracking-widest text-[10px] sm:text-xs mb-4 flex items-center gap-2"><Flame className="w-4 h-4"/> Heavy Diet Pass</span>
                    <div className="text-4xl sm:text-5xl font-black mb-8 text-white">₹3,999<span className="text-lg sm:text-xl text-zinc-500 font-medium">/30 Days</span></div>
                    <ul className="mb-8 space-y-2 text-sm text-zinc-400 font-medium"><li>✓ 2 Meals Every Day</li><li>✓ Sunday Special Included</li></ul>
                    <button onClick={() => handleSubscribe('Heavy Diet Pass')} className="w-full py-4 bg-orange-600 rounded-2xl font-bold hover:bg-orange-500 active:scale-95 transition-all mt-auto shadow-lg shadow-orange-900/50 text-sm sm:text-base">Get Premium Pass</button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {currentView === 'about' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16 animate-in fade-in">
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-8 text-center text-zinc-900">Our Story</h2>
            
            <div className="bg-white p-8 sm:p-12 rounded-[3rem] border shadow-sm mb-12">
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 mb-8 text-center sm:text-left">
                <div className="bg-orange-50 p-5 rounded-full shrink-0"><Heart className="w-10 h-10 text-orange-600 fill-orange-600" /></div>
                <div>
                  <h3 className="text-2xl sm:text-3xl font-black mb-2">Ek Choti Street Shop Se...</h3>
                  <p className="text-zinc-500 font-medium text-sm sm:text-base">A journey fueled by passion and authentic taste.</p>
                </div>
              </div>
              <div className="space-y-6 text-zinc-600 leading-relaxed sm:text-lg">
                <p>
                  Dadi Maa Ke Parathe ki shuruaat ek choti si street shop se hui thi. Ek chhota sa thela, par sapne aur swad dono bade the. Humara maksad sirf logo ka pet bharna nahi tha, balki unhe wo comfort aur pyar dena tha jo sirf ghar ke khane mein milta hai.
                </p>
                <p>
                  Aaj 3 saal baad bhi, Indore mein successfully chalne ke bawajood, humara philosophy wahi hai. Isliye humare yahan bahar ka staff kam, aur <strong className="text-zinc-900">ghar ke log hi zyada kaam karte hain.</strong> Taki har ek parathe mein dadi maa ka wahi pyaar, care aur authentic 'Ghar Jaisa Swad' barkarar rahe. Hum khana banate nahi, khilate hain!
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-zinc-950 text-zinc-400 py-12 px-6 mt-auto">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10">
          
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {contactDetails.logo && <img src={contactDetails.logo} className="w-12 h-12 rounded-full border border-zinc-800" alt="logo" />}
              <div>
                <span className="text-xl font-black text-white leading-none block">Dadi Maa Ke</span>
                <span className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">Parathe</span>
              </div>
            </div>
            <p className="text-sm text-zinc-500 leading-relaxed">Premium whole-wheat parathas crafted with grandmother's secret recipes. Ghar Jaisa Swad, Ab Indore Mein.</p>
          </div>

          <div>
            <h4 className="text-white font-black mb-5 uppercase tracking-widest text-xs">Quick Links</h4>
            <ul className="space-y-3 text-sm font-medium">
              <li><button onClick={() => {setCurrentView('home'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3"/> Home</button></li>
              <li><button onClick={() => {setCurrentView('menu'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3"/> Order Menu</button></li>
              <li><button onClick={() => {setCurrentView('mealpass'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3"/> Meal Passes</button></li>
              <li><button onClick={() => {setCurrentView('about'); window.scrollTo(0,0);}} className="hover:text-orange-500 transition-colors flex items-center gap-2"><ArrowRight className="w-3 h-3"/> Our Story</button></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-5 uppercase tracking-widest text-xs">Get In Touch</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-center gap-3"><div className="bg-zinc-900 p-2 rounded-lg"><Phone className="w-4 h-4 text-orange-500"/></div> {contactDetails.phone}</li>
              <li className="flex items-center gap-3"><div className="bg-zinc-900 p-2 rounded-lg"><Mail className="w-4 h-4 text-orange-500"/></div> {contactDetails.email || 'hello@dadimaa.com'}</li>
              <li className="flex items-center gap-3"><div className="bg-zinc-900 p-2 rounded-lg"><Instagram className="w-4 h-4 text-orange-500"/></div> @{contactDetails.instagram}</li>
              <li className="flex items-start gap-3"><div className="bg-zinc-900 p-2 rounded-lg mt-1"><MapPin className="w-4 h-4 text-orange-500"/></div> <span className="leading-relaxed">{contactDetails.address}</span></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-5 uppercase tracking-widest text-xs">Find Us</h4>
            <div className="rounded-2xl overflow-hidden h-32 border border-zinc-800 opacity-80 hover:opacity-100 transition-opacity">
              <iframe 
                title="Google Maps Location"
                width="100%" 
                height="100%" 
                style={{ border: 0 }}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(contactDetails.address || 'Vijay Nagar, Indore')}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>

        </div>

        <div className="max-w-6xl mx-auto mt-12 pt-6 border-t border-zinc-800 text-xs text-center sm:text-left flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="font-medium">© {new Date().getFullYear()} Dadi Maa Ke Parathe. All rights reserved.</p>
          <p className="bg-zinc-900 px-4 py-2 rounded-full border border-zinc-800 font-medium">
            Designed with <Heart className="w-3 h-3 inline text-red-500 fill-red-500 mx-1 animate-pulse"/> by <span className="font-bold text-white tracking-widest uppercase text-[10px]">Hardik Solanki.</span>
          </p>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAuthModal(false)}></div>
          <div className="relative bg-white p-6 sm:p-8 rounded-[2rem] w-full max-w-sm animate-in zoom-in-95">
            <X className="absolute top-6 right-6 cursor-pointer text-zinc-400 hover:text-zinc-900" onClick={() => setShowAuthModal(false)}/>
            <h3 className="text-2xl font-bold mb-6">{authMode === 'login' ? 'Welcome Back!' : 'Create Account'}</h3>
            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'signup' && <input placeholder="Your Name" required className="w-full border-2 border-zinc-100 p-4 rounded-2xl outline-none focus:border-orange-500 font-medium" onChange={e => setAuthForm({...authForm, name: e.target.value})} />}
              <input placeholder="Phone Number" required className="w-full border-2 border-zinc-100 p-4 rounded-2xl outline-none focus:border-orange-500 font-medium" onChange={e => setAuthForm({...authForm, phone: e.target.value})} />
              <input type="password" placeholder="Password" required className="w-full border-2 border-zinc-100 p-4 rounded-2xl outline-none focus:border-orange-500 font-medium" onChange={e => setAuthForm({...authForm, password: e.target.value})} />
              <button type="submit" className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-500 shadow-xl">{authMode === 'login' ? 'Login' : 'Sign Up'}</button>
            </form>
            <button onClick={() => setAuthMode(authMode==='login'?'signup':'login')} className="w-full text-center mt-6 text-zinc-500 text-sm">
              {authMode==='login' ? 'Don\'t have an account? ' : 'Already have an account? '}<span className="text-orange-600 font-bold underline">Click Here</span>
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsCartOpen(false)}></div>
          <div className="relative w-full sm:max-w-md bg-white h-full p-6 sm:p-8 flex flex-col shadow-2xl animate-in slide-in-from-right">
             <div className="flex justify-between items-center mb-8 font-black text-2xl"><span>Your Order</span><X className="cursor-pointer bg-zinc-100 p-2 rounded-full hover:bg-zinc-200 w-10 h-10" onClick={() => setIsCartOpen(false)}/></div>
             <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                {cart.map(item => (
                  <div key={item.cartItemId} className="flex justify-between items-center border-b border-zinc-100 pb-4">
                    <div><div className="font-bold text-zinc-900">{item.name}</div><div className="text-xs font-bold text-orange-600">₹{item.price} x {item.quantity}</div></div>
                    <div className="flex items-center gap-4">
                      <div className="font-black text-lg">₹{item.price * item.quantity}</div>
                      <button onClick={() => setCart(cart.filter(c => c.cartItemId !== item.cartItemId))} className="text-rose-500 bg-rose-50 p-2 rounded-xl hover:bg-rose-100 transition-colors"><Trash2 className="w-4 h-4"/></button>
                    </div>
                  </div>
                ))}
                {cart.length === 0 && <div className="text-center py-20 text-zinc-400 font-bold flex flex-col items-center"><ShoppingBag className="w-16 h-16 mb-4 opacity-20"/>Cart is empty!</div>}
             </div>
             {cart.length > 0 && (
               <div className="pt-6 border-t border-zinc-100 mt-auto">
                 <div className="flex justify-between text-xl sm:text-2xl font-black mb-6"><span>Total Bill</span><span>₹{cartTotal}</span></div>
                 <button onClick={handleWhatsAppCheckout} className="w-full bg-green-600 text-white py-4 sm:py-5 rounded-2xl font-black text-base sm:text-lg hover:bg-green-500 shadow-xl shadow-green-900/20 active:scale-95 transition-all">Order on WhatsApp</button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
}

import React from 'react';

interface LoginProps {
  onLogin: () => void;
  onNavigate: (view: any) => void;
}

export default function Login({ onLogin, onNavigate }: LoginProps) {
  return (
    <div className="flex min-h-screen bg-[#0f0f12]">
       {/* Left Hero */}
       <div className="hidden lg:flex lg:w-1/2 relative bg-cover bg-center" style={{backgroundImage: `url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=2073&auto=format&fit=crop')`}}>
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
          <div className="relative z-10 p-16 flex flex-col justify-end h-full text-white">
             <span className="material-symbols-outlined text-4xl text-primary mb-6">format_quote</span>
             <h2 className="text-4xl font-black leading-tight mb-8">
                The AI itinerary planner saved me hours of research. My trip to Kyoto was flawless.
             </h2>
             <div className="flex items-center gap-4">
                <img src="https://i.pravatar.cc/150?u=sarah" alt="User" className="size-12 rounded-full border-2 border-primary" />
                <div>
                   <p className="font-bold text-lg">Sarah Jenkins</p>
                   <p className="text-gray-400 text-sm">Travel Enthusiast</p>
                </div>
             </div>
          </div>
       </div>

       {/* Right Form */}
       <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-[#0f0f12]">
          <div className="w-full max-w-md flex flex-col gap-8">
             <div className="flex flex-col gap-2 text-center lg:text-left">
                <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
                   <span className="material-symbols-outlined text-primary text-3xl">travel_explore</span>
                   <span className="text-white font-bold text-xl">Itinerary AI</span>
                </div>
                <h1 className="text-3xl font-black text-white">Welcome back, Traveler</h1>
                <p className="text-gray-400">Please enter your details to sign in.</p>
             </div>

             <div className="flex gap-8 border-b border-[#27272a]">
                <button className="pb-3 text-sm font-bold text-primary border-b-[3px] border-primary">Log In</button>
                <button className="pb-3 text-sm font-bold text-gray-500 hover:text-white transition-colors">Sign Up</button>
             </div>

             <form className="flex flex-col gap-5" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
                <div className="flex flex-col gap-2">
                   <label className="text-gray-300 text-sm font-bold">Email Address</label>
                   <input type="email" placeholder="user@example.com" className="w-full bg-[#1f1f23] border border-[#27272a] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" />
                </div>
                <div className="flex flex-col gap-2">
                   <div className="flex justify-between">
                      <label className="text-gray-300 text-sm font-bold">Password</label>
                      <a href="#" className="text-primary text-xs font-bold hover:underline">Forgot Password?</a>
                   </div>
                   <input type="password" placeholder="••••••••" className="w-full bg-[#1f1f23] border border-[#27272a] rounded-lg px-4 py-3 text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all" />
                </div>
                
                <button type="submit" className="w-full bg-primary hover:bg-primary-hover text-white font-bold py-3.5 rounded-lg shadow-lg shadow-primary/20 transition-all mt-2">
                   Log In
                </button>
             </form>

             <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-[#27272a]"></div>
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold uppercase tracking-wider">Or continue with</span>
                <div className="flex-grow border-t border-[#27272a]"></div>
             </div>

             <div className="grid grid-cols-2 gap-4">
                <button className="flex items-center justify-center gap-2 bg-[#1f1f23] hover:bg-[#2a2a30] text-white font-bold py-3 rounded-lg border border-[#27272a] transition-all">
                   <span className="text-xl">G</span> Google
                </button>
                <button className="flex items-center justify-center gap-2 bg-[#1f1f23] hover:bg-[#2a2a30] text-white font-bold py-3 rounded-lg border border-[#27272a] transition-all">
                   <span className="text-xl">f</span> Facebook
                </button>
             </div>
             
             <button onClick={() => onNavigate('home')} className="text-gray-500 hover:text-white text-sm mt-4">
                 Back to Home
             </button>
          </div>
       </div>
    </div>
  );
}

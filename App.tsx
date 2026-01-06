import React, { useState } from 'react';
import Home from './pages/Home';
import Explore from './pages/Explore';
import MyItineraries from './pages/MyItineraries';
import Profile from './pages/Profile';
import ItineraryDetail from './pages/ItineraryDetail';
import Login from './pages/Login';
import { Itinerary } from './types';
import { translations, Language } from './translations';

// Simple Navigation Context type
type View = 'home' | 'explore' | 'my-trips' | 'profile' | 'itinerary' | 'login';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [user, setUser] = useState<{name: string, avatar: string} | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);

  const t = translations[language];

  // Helper to switch views
  const navigate = (view: View, data?: any) => {
    if (view === 'itinerary' && data) {
      setSelectedItinerary(data);
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleSaveItinerary = (itinerary: Itinerary) => {
    // Avoid duplicates based on ID
    if (!savedItineraries.some(i => i.id === itinerary.id)) {
      setSavedItineraries(prev => [itinerary, ...prev]);
    }
  };

  const handleUpdateItinerary = (updatedItinerary: Itinerary) => {
    setSavedItineraries(prev => prev.map(it => it.id === updatedItinerary.id ? updatedItinerary : it));
  };

  const handleDeleteItinerary = (id: string) => {
     setSavedItineraries(prev => prev.filter(it => it.id !== id));
  };

  const handleLogin = () => {
    // Mock login
    setUser({
      name: "Alex Rivera",
      avatar: "https://lh3.googleusercontent.com/aida-public/AB6AXuBtg5WmhO6SlhRkSw3oPu3fRGHCukn7Uqo_PL1G0xtT3FZxw_fZVcWi74mHIU-9UAzkdaiOZmUSGzDLUQ2jlzeHKdk_YgCEeD-OEFSBSaGrx3y1tuM70NGD6MR-NeOTHh_L9EWc7AgU0RBgEVG-Zy0Wlt0AK9MOmB4QLhtiIrjcBwikUC6QPdtscqrbQETiMkbKM2YTd8wXCJ6nNRYNim2wk3hOo-kFbRfYSF9xX9y2lavaBOK6pF19Q_sQ7IM8s18_cjiCk0Gpfk3B"
    });
    navigate('home');
  };

  const renderView = () => {
    switch (currentView) {
      case 'home':
        return <Home onNavigate={navigate} lang={language} t={t} />;
      case 'explore':
        return <Explore onNavigate={navigate} t={t} />;
      case 'my-trips':
        return <MyItineraries 
                 onNavigate={navigate} 
                 t={t} 
                 itineraries={savedItineraries} 
                 onUpdate={handleUpdateItinerary}
                 onDelete={handleDeleteItinerary}
               />;
      case 'profile':
        return <Profile onNavigate={navigate} t={t} />;
      case 'itinerary':
        return <ItineraryDetail itinerary={selectedItinerary} onNavigate={navigate} t={t} onSave={handleSaveItinerary} />;
      case 'login':
        return <Login onLogin={handleLogin} onNavigate={navigate} />;
      default:
        return <Home onNavigate={navigate} lang={language} t={t} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-gray-100 selection:bg-primary selection:text-white">
      {/* Navigation Bar */}
      {currentView !== 'login' && (
        <header className="sticky top-0 z-50 w-full border-b border-[#e5e7eb] dark:border-[#2a2e35] bg-background-light/95 dark:bg-[#16181d]/95 backdrop-blur-md px-4 sm:px-6 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
                <button onClick={() => navigate('home')} className="flex items-center gap-2 group">
                  <div className="size-8 text-primary group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-4xl">travel_explore</span>
                  </div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-gray-100 hidden sm:block">Itinerary AI</h2>
                </button>
            </div>
            
            <nav className="hidden md:flex items-center gap-8">
              <button 
                onClick={() => navigate('home')}
                className={`text-sm font-medium transition-colors hover:text-primary ${currentView === 'home' ? 'text-primary font-bold' : 'text-slate-600 dark:text-gray-400'}`}
              >
                {t.nav_home}
              </button>
              <button 
                onClick={() => navigate('explore')}
                className={`text-sm font-medium transition-colors hover:text-primary ${currentView === 'explore' ? 'text-primary font-bold' : 'text-slate-600 dark:text-gray-400'}`}
              >
                {t.nav_explore}
              </button>
              <button 
                onClick={() => navigate('my-trips')}
                className={`text-sm font-medium transition-colors hover:text-primary ${currentView === 'my-trips' ? 'text-primary font-bold' : 'text-slate-600 dark:text-gray-400'}`}
              >
                {t.nav_my_trips}
              </button>
            </nav>

            <div className="flex items-center gap-4">
               {/* Language Selector */}
               <div className="relative group z-50">
                    <button className="flex items-center gap-1 text-sm font-bold text-slate-600 dark:text-gray-300 hover:text-primary transition-colors py-2">
                        <span className="material-symbols-outlined text-[20px]">language</span>
                        <span className="uppercase">{language === 'zh-TW' ? '繁' : language === 'zh-CN' ? '简' : 'EN'}</span>
                    </button>
                    {/* Dropdown with padding-top (pt-2) instead of margin-top to bridge the hover gap */}
                    <div className="absolute top-full right-0 pt-2 w-32 hidden group-hover:block animate-fadeIn">
                        <div className="bg-white dark:bg-[#1e2126] rounded-xl shadow-xl border border-gray-100 dark:border-[#2a2e35] overflow-hidden">
                            <button onClick={() => setLanguage('en')} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium ${language === 'en' ? 'text-primary' : 'text-slate-700 dark:text-gray-300'}`}>English</button>
                            <button onClick={() => setLanguage('zh-TW')} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium ${language === 'zh-TW' ? 'text-primary' : 'text-slate-700 dark:text-gray-300'}`}>繁體中文</button>
                            <button onClick={() => setLanguage('zh-CN')} className={`w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium ${language === 'zh-CN' ? 'text-primary' : 'text-slate-700 dark:text-gray-300'}`}>簡體中文</button>
                        </div>
                    </div>
                </div>

               {!user ? (
                 <button 
                   onClick={() => navigate('login')}
                   className="hidden sm:flex h-10 px-6 items-center justify-center rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all shadow-md hover:shadow-lg hover:shadow-primary/20"
                 >
                   {t.sign_in}
                 </button>
               ) : (
                 <>
                   <button 
                     onClick={() => navigate('home')}
                     className="hidden sm:flex items-center justify-center gap-2 rounded-lg h-9 px-4 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-sm font-bold"
                   >
                     <span className="material-symbols-outlined text-[18px]">add</span>
                     <span>{t.new_trip}</span>
                   </button>
                   <button onClick={() => navigate('profile')} className="bg-center bg-no-repeat bg-cover rounded-full size-9 ring-2 ring-transparent hover:ring-primary cursor-pointer transition-all" style={{backgroundImage: `url("${user.avatar}")`}}></button>
                 </>
               )}
               <button className="md:hidden text-slate-900 dark:text-white" onClick={() => navigate('explore')}>
                  <span className="material-symbols-outlined">menu</span>
               </button>
            </div>
          </div>
        </header>
      )}

      <main className="w-full">
        {renderView()}
      </main>

      {/* Simple Footer */}
      {currentView !== 'login' && (
        <footer className="border-t border-[#e5e7eb] dark:border-[#2a2e35] bg-white dark:bg-[#16181d] py-8 text-center mt-auto">
          <div className="flex justify-center gap-6 mb-4 text-slate-400 dark:text-gray-500">
            <span className="material-symbols-outlined hover:text-primary cursor-pointer">public</span>
            <span className="material-symbols-outlined hover:text-primary cursor-pointer">mail</span>
            <span className="material-symbols-outlined hover:text-primary cursor-pointer">alternate_email</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-gray-500">© 2024 Itinerary AI. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}
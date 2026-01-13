import React, { useState, useEffect } from 'react';
import Home from './pages/Home';
import Explore from './pages/Explore';
import MyItineraries from './pages/MyItineraries';
import Profile from './pages/Profile';
import ItineraryDetail from './pages/ItineraryDetail';
import ManualItineraryCreator from './pages/ManualItineraryCreator';
import { Itinerary } from './types';
import { translations, Language } from './translations';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthModal from './components/AuthModal';
import { ToastProvider } from './components/Toast';
import { supabase } from './lib/supabase';

// Simple Navigation Context type
type View = 'home' | 'explore' | 'my-trips' | 'profile' | 'itinerary' | 'manual-create';

function AppContent() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedItinerary, setSelectedItinerary] = useState<Itinerary | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoadingSharedItinerary, setIsLoadingSharedItinerary] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  const { user, signOut } = useAuth();
  const t = translations[language];

  // Parse URL on initial load for shared links
  useEffect(() => {
    const handleRouteChange = async () => {
      const path = window.location.pathname;
      const match = path.match(/^\/itinerary\/([a-zA-Z0-9-]+)$/);

      if (match) {
        const itineraryId = match[1];
        setIsLoadingSharedItinerary(true);

        try {
          const { data, error } = await supabase
            .from('itineraries')
            .select('*')
            .eq('id', itineraryId)
            .single();

          if (data && !error) {
            const itinerary: Itinerary = {
              ...data.content,
              id: data.id,
              userId: data.user_id,
              title: data.title,
              location: data.destination,
              startDate: data.start_date,
              endDate: data.end_date,
              isPublic: data.is_public,
              likes: data.likes,
            };
            setSelectedItinerary(itinerary);
            setCurrentView('itinerary');
          }
        } catch (err) {
          console.error('Error loading shared itinerary:', err);
        } finally {
          setIsLoadingSharedItinerary(false);
        }
      } else if (path === '/' || path === '') {
        // Handle root path - navigate to home
        setCurrentView('home');
        setSelectedItinerary(null);
      }
    };

    handleRouteChange();
    window.addEventListener('popstate', handleRouteChange);
    return () => window.removeEventListener('popstate', handleRouteChange);
  }, []);

  // Fetch user avatar from profiles table
  useEffect(() => {
    const fetchUserAvatar = async () => {
      if (!user) {
        setUserAvatar(null);
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      setUserAvatar(data?.avatar_url || null);
    };
    fetchUserAvatar();
  }, [user, currentView]); // Re-fetch when view changes (e.g., after profile update)

  // Helper to switch views
  const navigate = (view: View, data?: any) => {
    if (view === 'itinerary' && data) {
      setSelectedItinerary(data);
      // Update URL for shareable links
      window.history.pushState({}, '', `/itinerary/${data.id}`);
    } else {
      // Reset URL for non-itinerary views
      window.history.pushState({}, '', '/');
    }
    setCurrentView(view);
    window.scrollTo(0, 0);
  };

  const handleSaveItinerary = (itinerary: Itinerary) => {
    // Update the selected itinerary state without navigating
    // This is called when exiting edit mode to sync changes to parent
    setSelectedItinerary(itinerary);
  };

  const renderView = () => {
    if (isLoadingSharedItinerary) {
      return (
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <span className="material-symbols-outlined text-5xl text-primary animate-spin">progress_activity</span>
            <p className="mt-4 text-slate-500 dark:text-gray-400">Loading itinerary...</p>
          </div>
        </div>
      );
    }

    switch (currentView) {
      case 'home':
        return <Home onNavigate={navigate} lang={language} t={t} />;
      case 'explore':
        return <Explore onNavigate={navigate} t={t} />;
      case 'my-trips':
        return <MyItineraries
          onNavigate={navigate}
          t={t}
        />;
      case 'profile':
        return <Profile onNavigate={navigate} t={t} />;
      case 'manual-create':
        return <ManualItineraryCreator onNavigate={navigate} t={t} />;
      case 'itinerary':
        return <ItineraryDetail itinerary={selectedItinerary} onNavigate={navigate} t={t} onSave={handleSaveItinerary} />;
      default:
        return <Home onNavigate={navigate} lang={language} t={t} />;
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark font-sans text-slate-900 dark:text-gray-100 selection:bg-primary selection:text-white">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-[#e5e7eb] dark:border-[#2a2e35] bg-background-light/95 dark:bg-[#16181d]/95 backdrop-blur-md px-4 sm:px-6 py-3">
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
            {user && (
              <button
                onClick={() => navigate('my-trips')}
                className={`text-sm font-medium transition-colors hover:text-primary ${currentView === 'my-trips' ? 'text-primary font-bold' : 'text-slate-600 dark:text-gray-400'}`}
              >
                {t.nav_my_trips}
              </button>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {/* Language Selector */}
            <div className="relative group z-50">
              <button className="flex items-center gap-1 text-sm font-bold text-slate-600 dark:text-gray-300 hover:text-primary transition-colors py-2">
                <span className="material-symbols-outlined text-[20px]">language</span>
                <span className="uppercase">{language === 'zh-TW' ? '繁' : language === 'zh-CN' ? '简' : 'EN'}</span>
              </button>
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
                onClick={() => setIsAuthModalOpen(true)}
                className="flex h-10 px-4 sm:px-6 items-center justify-center rounded-lg bg-primary hover:bg-primary-hover text-white text-sm font-bold transition-all shadow-md hover:shadow-lg hover:shadow-primary/20"
              >
                {t.sign_in}
              </button>
            ) : (
              <>
                <div className="relative group z-40">
                  <button
                    className="hidden sm:flex items-center justify-center gap-2 rounded-lg h-9 px-4 bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors text-sm font-bold"
                  >
                    <span className="material-symbols-outlined text-[18px]">add</span>
                    <span>{t.new_trip}</span>
                  </button>
                  <div className="absolute top-full right-0 pt-2 w-48 hidden group-hover:block animate-fadeIn">
                    <div className="bg-white dark:bg-[#1e2126] rounded-xl shadow-xl border border-gray-100 dark:border-[#2a2e35] overflow-hidden py-1">
                      <button onClick={() => navigate('home')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-primary">auto_awesome</span>
                        {t.plan_with_ai}
                      </button>
                      <button onClick={() => navigate('manual-create')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-blue-500">edit_note</span>
                        {t.create_manually || 'Create Manually'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="relative group z-40">
                  <button onClick={() => navigate('profile')} className="bg-center bg-no-repeat bg-cover rounded-full size-9 ring-2 ring-transparent hover:ring-primary cursor-pointer transition-all bg-gray-200 text-gray-600 font-bold flex items-center justify-center"
                    style={userAvatar ? { backgroundImage: `url("${userAvatar}")` } : {}}>
                    {!userAvatar && user.email?.charAt(0).toUpperCase()}
                  </button>
                  {/* User Dropdown */}
                  <div className="absolute top-full right-0 pt-2 w-48 hidden group-hover:block animate-fadeIn">
                    <div className="bg-white dark:bg-[#1e2126] rounded-xl shadow-xl border border-gray-100 dark:border-[#2a2e35] overflow-hidden py-1">
                      <button onClick={() => navigate('profile')} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium text-slate-700 dark:text-gray-300 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">person</span>
                        Profile
                      </button>
                      <button onClick={() => signOut()} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-[#2a2e35] font-medium text-red-500 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px]">logout</span>
                        Sign Out
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
            <button className="md:hidden text-slate-900 dark:text-white" onClick={() => navigate('explore')}>
              <span className="material-symbols-outlined">menu</span>
            </button>
          </div>
        </div>
      </header>

      <main className="w-full">
        {renderView()}
      </main>

      {/* Simple Footer */}
      <footer className="border-t border-[#e5e7eb] dark:border-[#2a2e35] bg-white dark:bg-[#16181d] py-8 text-center mt-auto">
        <div className="flex justify-center gap-6 mb-4 text-slate-400 dark:text-gray-500">
          <span className="material-symbols-outlined hover:text-primary cursor-pointer">public</span>
          <span className="material-symbols-outlined hover:text-primary cursor-pointer">mail</span>
          <span className="material-symbols-outlined hover:text-primary cursor-pointer">alternate_email</span>
        </div>
        <p className="text-sm text-slate-500 dark:text-gray-500">© 2024 Itinerary AI. All rights reserved.</p>
      </footer>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
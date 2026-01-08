import React, { useState, useEffect, useRef } from 'react';
import { Itinerary } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface MyItinerariesProps {
  onNavigate: (view: any, data?: any) => void;
  t: any;
}

type Tab = 'upcoming' | 'past' | 'drafts' | 'favorites';

export default function MyItineraries({ onNavigate, t }: MyItinerariesProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [editingTrip, setEditingTrip] = useState<Itinerary | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchItineraries();
  }, [user]);

  const fetchItineraries = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Fetch owned itineraries
      const { data: ownedData, error: ownedError } = await supabase
        .from('itineraries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (ownedError) throw ownedError;

      if (ownedData) {
        const mappedItineraries: Itinerary[] = ownedData.map(item => ({
          id: item.id,
          userId: item.user_id,
          title: item.title,
          location: item.destination,
          startDate: item.start_date,
          endDate: item.end_date,
          isPublic: item.is_public,
          likes: item.likes,
          ...item.content,
          // Ensure ID and title are from the top level row
          id: item.id,
          title: item.title,
        }));
        setItineraries(mappedItineraries);
      }

      // Fetch saved itineraries
      const { data: savedData, error: savedError } = await supabase
        .from('itinerary_saves')
        .select(`
          itinerary_id,
          itineraries:itinerary_id (
            *,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('user_id', user.id);

      if (savedError) throw savedError;

      if (savedData) {
        const mappedSaved: Itinerary[] = savedData
          .filter((item: any) => item.itineraries) // Filter out nulls if any
          .map((item: any) => {
            const it = item.itineraries;
            return {
              id: it.id,
              userId: it.user_id,
              title: it.title,
              location: it.destination,
              startDate: it.start_date,
              endDate: it.end_date,
              isPublic: it.is_public,
              likes: it.likes,
              ...it.content,
              author: {
                name: it.profiles?.full_name || 'Unknown',
                avatar: it.profiles?.avatar_url || '',
              },
              id: it.id,
              title: it.title,
            };
          });
        setSavedItineraries(mappedSaved);
      }

    } catch (error) {
      console.error('Error fetching itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleMenuClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === id ? null : id);
  };

  const handleEditClick = (e: React.MouseEvent, trip: Itinerary) => {
    e.stopPropagation();
    setEditingTrip(trip);
    setEditTitle(trip.title);
    setEditDescription(trip.description || '');
    setOpenMenuId(null);
  };

  const handleDeleteClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (window.confirm(t.delete_confirm)) {
      try {
        const { error } = await supabase
          .from('itineraries')
          .delete()
          .eq('id', id);

        if (error) throw error;

        setItineraries(prev => prev.filter(i => i.id !== id));
      } catch (error) {
        console.error('Error deleting itinerary:', error);
        alert('Failed to delete itinerary');
      }
    }
  };

  const handleRemoveSavedClick = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;

    if (window.confirm("Remove from saved trips?")) {
      try {
        const { error } = await supabase
          .from('itinerary_saves')
          .delete()
          .match({ user_id: user.id, itinerary_id: id });

        if (error) throw error;

        setSavedItineraries(prev => prev.filter(i => i.id !== id));
      } catch (error) {
        console.error('Error removing saved itinerary:', error);
        alert('Failed to remove saved itinerary');
      }
    }
  };

  const handlePublishToggle = async (e: React.MouseEvent, trip: Itinerary) => {
    e.stopPropagation();
    setOpenMenuId(null);

    try {
      const newStatus = !trip.isPublic;
      const { error } = await supabase
        .from('itineraries')
        .update({ is_public: newStatus })
        .eq('id', trip.id);

      if (error) throw error;

      setItineraries(prev => prev.map(i =>
        i.id === trip.id ? { ...i, isPublic: newStatus } : i
      ));
    } catch (error) {
      console.error('Error updating publish status:', error);
      alert('Failed to update status');
    }
  };

  const handleSaveEdit = async () => {
    if (!editingTrip) return;

    try {
      const updatedContent = {
        ...editingTrip, // This spreads all content fields including days, tags etc from the itinerary object
        title: editTitle,
        description: editDescription
      };

      // We need to be careful not to include non-content fields in the content column if they are duplicate,
      // but for now keeping it simple as per original implementation logic where we might be storing everything in content json
      // Ideally 'content' should only have JSON structure, not top level columns.
      // Let's ensure we are just updating the title column and content column

      const { error } = await supabase
        .from('itineraries')
        .update({
          title: editTitle,
          content: updatedContent
        })
        .eq('id', editingTrip.id);

      if (error) throw error;

      setItineraries(prev => prev.map(trip =>
        trip.id === editingTrip.id
          ? { ...trip, title: editTitle, description: editDescription }
          : trip
      ));
      setEditingTrip(null);

    } catch (error) {
      console.error('Error updating itinerary:', error);
      alert('Failed to update itinerary');
    }
  };

  // Filter itineraries based on active tab
  const getFilteredItineraries = () => {
    if (activeTab === 'favorites') {
      return savedItineraries;
    }

    const now = new Date();
    return itineraries.filter(trip => {
      const endDate = new Date(trip.endDate);

      if (activeTab === 'upcoming') {
        return endDate >= now && trip.status !== 'draft';
      } else if (activeTab === 'past') {
        return endDate < now && trip.status !== 'draft';
      } else if (activeTab === 'drafts') {
        return trip.status === 'draft'; // note: purely frontend status logic if we had it implementing status field properly
      }
      return true;
    });
  };

  // Fallback if no status field used yet, just show all in upcoming for now or split by date
  // Since we don't strictly use 'status' column in DB yet (it's in JSON), let's simplify logic:
  const displayItineraries = (() => {
    if (activeTab === 'favorites') return savedItineraries;

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Normalize today

    return itineraries.filter(trip => {
      if (!trip.endDate) return activeTab === 'upcoming'; // No date = upcoming/draft
      const end = new Date(trip.endDate);

      if (activeTab === 'past') return end < now;
      // Default everything else to upcoming/drafts bucket for now
      // IF we want to separate drafts, we need a way to identify them. 
      // Assuming all created trips are 'upcoming' unless date passed
      if (activeTab === 'upcoming' || activeTab === 'drafts') return end >= now;
      return false;
    });
  })();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary animate-spin">progress_activity</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-2">{t.my_itineraries}</h1>
          <p className="text-slate-500 dark:text-gray-400 text-lg">{t.manage_trips}</p>
        </div>
        <div className="w-full md:w-auto min-w-[300px]">
          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              type="text"
              placeholder={t.search_destinations}
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-[#1e2126] border border-gray-200 dark:border-[#2a2e35] rounded-xl text-base focus:ring-1 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white transition-all shadow-sm"
            />
          </div>
        </div>
      </div>

      <div className="mb-8 border-b border-gray-200 dark:border-[#2a2e35]">
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          {(['upcoming', 'past', 'drafts', 'favorites'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-3 border-b-[3px] px-2 font-bold text-sm tracking-wide transition-all ${activeTab === tab
                  ? 'border-primary text-primary'
                  : 'border-transparent hover:border-primary/30 text-slate-500 dark:text-gray-400'
                }`}
            >
              {t[tab === 'past' ? 'past_trips' : tab]}
            </button>
          ))}
        </div>
      </div>

      {displayItineraries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-gray-100 dark:bg-[#2a2e35] p-6 rounded-full mb-6">
            <span className="material-symbols-outlined text-5xl text-gray-400">
              {activeTab === 'favorites' ? 'favorite_border' : 'flight_takeoff'}
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
            {activeTab === 'favorites' ? 'No saved trips' : 'No trips found'}
          </h2>
          <p className="text-slate-500 dark:text-gray-400 mb-6">
            {activeTab === 'favorites' ? 'Go to Explore to find and save trips!' : "You haven't planned any trips yet."}
          </p>
          <button
            onClick={() => onNavigate(activeTab === 'favorites' ? 'explore' : 'home')}
            className="px-6 py-3 bg-primary text-white font-bold rounded-xl hover:bg-primary-hover transition-colors shadow-lg shadow-primary/20"
          >
            {activeTab === 'favorites' ? 'Explore Itineraries' : t.create_new_trip}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card - Only show in Upcoming/Drafts */}
          {(activeTab === 'upcoming' || activeTab === 'drafts') && (
            <button
              onClick={() => onNavigate('home')}
              className="group flex flex-col items-center justify-center bg-white dark:bg-[#1e2126] rounded-xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-[#2a2e35] hover:border-primary dark:hover:border-primary transition-all duration-300 min-h-[400px]"
            >
              <div className="size-16 rounded-full bg-primary/10 group-hover:bg-primary flex items-center justify-center mb-4 transition-colors">
                <span className="material-symbols-outlined text-4xl text-primary group-hover:text-white transition-colors">add</span>
              </div>
              <span className="text-lg font-bold text-slate-900 dark:text-white mb-2">{t.create_new_trip}</span>
              <p className="text-slate-500 dark:text-gray-400 text-sm max-w-[200px] text-center">{t.plan_ai_subtitle}</p>
            </button>
          )}

          {/* Render Itineraries */}
          {displayItineraries.map((trip) => (
            <div key={trip.id} className="group flex flex-col bg-white dark:bg-[#1e2126] rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2e35] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <div className="relative h-48 w-full overflow-hidden">
                {trip.generated && (
                  <div className="absolute top-3 left-3 z-10 bg-primary/90 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm">
                    <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                    {t.ai_generated}
                  </div>
                )}

                {/* Public Status Badge */}
                {activeTab !== 'favorites' && (
                  <div className={`absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full backdrop-blur-sm text-xs font-bold flex items-center gap-1 shadow-sm ${trip.isPublic ? 'bg-green-500 text-white' : 'bg-gray-800/80 text-gray-200'}`}>
                    <span className="material-symbols-outlined text-[14px]">{trip.isPublic ? 'public' : 'lock'}</span>
                    {trip.isPublic ? t.published_status : t.private_status}
                  </div>
                )}

                <img
                  src={trip.coverImage || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop'}
                  alt={trip.title}
                  className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5 flex flex-col flex-1">
                <div className="flex items-start justify-between mb-2 relative">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 pr-6">{trip.title}</h3>
                  <div className="relative" ref={openMenuId === trip.id ? menuRef : null}>
                    <button
                      onClick={(e) => handleMenuClick(e, trip.id)}
                      className="text-slate-400 hover:text-primary rounded-full hover:bg-gray-100 dark:hover:bg-[#2a2e35] p-1 transition-colors"
                    >
                      <span className="material-symbols-outlined">more_vert</span>
                    </button>
                    {openMenuId === trip.id && (
                      <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#25282e] rounded-lg shadow-xl border border-gray-100 dark:border-[#32363e] overflow-hidden z-20 animate-fadeIn">
                        {activeTab === 'favorites' ? (
                          <button
                            onClick={(e) => handleRemoveSavedClick(e, trip.id)}
                            className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                          >
                            <span className="material-symbols-outlined text-[18px]">bookmark_remove</span>
                            Remove
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={(e) => handlePublishToggle(e, trip)}
                              className={`w-full text-left px-4 py-2.5 text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#2a2e35] flex items-center gap-2 ${trip.isPublic ? 'text-amber-600' : 'text-green-600'}`}
                            >
                              <span className="material-symbols-outlined text-[18px]">{trip.isPublic ? 'unpublished' : 'public'}</span>
                              {trip.isPublic ? t.unpublish : t.publish}
                            </button>
                            <button
                              onClick={(e) => handleEditClick(e, trip)}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2e35] flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">edit</span>
                              {t.edit_trip}
                            </button>
                            <button
                              onClick={(e) => handleDeleteClick(e, trip.id)}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">delete</span>
                              {t.delete_trip}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {activeTab === 'favorites' && trip.author && (
                  <div className="flex items-center gap-2 mb-3">
                    <img src={trip.author.avatar || 'https://i.pravatar.cc/150'} alt={trip.author.name} className="size-6 rounded-full" />
                    <span className="text-xs font-bold text-slate-500 dark:text-gray-400">by {trip.author.name}</span>
                  </div>
                )}

                <div className="flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-primary">calendar_month</span>
                    <span>{trip.startDate} - {trip.endDate}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-500 dark:text-gray-400 text-sm">
                    <span className="material-symbols-outlined text-[18px] text-primary">schedule</span>
                    <span>{trip.days?.length || 0} {t.days_count}</span>
                  </div>
                </div>
                <div className="flex gap-2 mb-6 flex-wrap">
                  {trip.tags?.map(tag => (
                    <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-[#2a2e35] text-slate-600 dark:text-gray-300 text-xs font-bold rounded">{tag}</span>
                  ))}
                  {!trip.tags?.length && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a2e35] text-slate-600 dark:text-gray-300 text-xs font-bold rounded">#Trip</span>
                  )}
                </div>
                <div className="mt-auto flex gap-3">
                  <button
                    onClick={() => onNavigate('itinerary', trip)}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold py-2.5 rounded-lg transition-all duration-200"
                  >
                    <span>{t.view_plan}</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  </button>
                  <button className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#2a2e35] hover:bg-gray-200 dark:hover:bg-[#32363e] text-slate-900 dark:text-white font-medium px-4 py-2.5 rounded-lg transition-all duration-200">
                    <span className="material-symbols-outlined text-[20px]">share</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal - Same as before */}
      {editingTrip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-[#1e2126] rounded-2xl w-full max-w-lg p-6 shadow-2xl border border-gray-200 dark:border-[#2a2e35]">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{t.edit_trip}</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-gray-400 mb-1">{t.trip_title}</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#25282e] border border-gray-200 dark:border-[#32363e] rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-500 dark:text-gray-400 mb-1">{t.trip_description}</label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-[#25282e] border border-gray-200 dark:border-[#32363e] rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:ring-1 focus:ring-primary focus:border-primary outline-none resize-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => setEditingTrip(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-slate-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2e35] transition-colors"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleSaveEdit}
                className="px-5 py-2.5 rounded-xl font-bold bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 transition-all"
              >
                {t.save_changes}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Itinerary } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonGrid } from '../components/Skeleton';
import { NoTripsEmptyState, NoSavedTripsEmptyState, NoSearchResultsEmptyState } from '../components/EmptyState';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface MyItinerariesProps {
  onNavigate: (view: any, data?: any) => void;
  t: any;
}

type Tab = 'upcoming' | 'past' | 'favorites';

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
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    type: 'delete' | 'remove';
    tripId: string;
  }>({ isOpen: false, type: 'delete', tripId: '' });
  const [isDeleting, setIsDeleting] = useState(false);
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
          ...item.content,
          id: item.id,
          userId: item.user_id,
          title: item.title,
          location: item.destination,
          startDate: item.start_date,
          endDate: item.end_date,
          createdAt: item.created_at,
          isPublic: item.is_public,
          likes: item.likes,
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
              ...it.content,
              id: it.id,
              userId: it.user_id,
              title: it.title,
              location: it.destination,
              startDate: it.start_date,
              endDate: it.end_date,
              createdAt: it.created_at,
              isPublic: it.is_public,
              likes: it.likes,
              author: {
                name: it.profiles?.full_name || 'Unknown',
                avatar: it.profiles?.avatar_url || '',
              },
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
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpenMenuId(null);
        setEditingTrip(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
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

  const handleDeleteClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setOpenMenuId(null);
    setConfirmDialog({ isOpen: true, type: 'delete', tripId: id });
  };

  const confirmDelete = async () => {
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('itineraries')
        .delete()
        .eq('id', confirmDialog.tripId);

      if (error) throw error;

      setItineraries(prev => prev.filter(i => i.id !== confirmDialog.tripId));
      setConfirmDialog({ isOpen: false, type: 'delete', tripId: '' });
    } catch (error) {
      console.error('Error deleting itinerary:', error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRemoveSavedClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!user) return;
    setConfirmDialog({ isOpen: true, type: 'remove', tripId: id });
  };

  const confirmRemoveSaved = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('itinerary_saves')
        .delete()
        .match({ user_id: user.id, itinerary_id: confirmDialog.tripId });

      if (error) throw error;

      setSavedItineraries(prev => prev.filter(i => i.id !== confirmDialog.tripId));
      setConfirmDialog({ isOpen: false, type: 'delete', tripId: '' });
    } catch (error) {
      console.error('Error removing saved itinerary:', error);
    } finally {
      setIsDeleting(false);
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

  const handleDuplicateTrip = async (e: React.MouseEvent, trip: Itinerary) => {
    e.stopPropagation();
    setOpenMenuId(null);
    if (!user) return;

    try {
      // Create new dates starting from today
      const today = new Date();
      const originalStart = new Date(trip.startDate);
      const originalEnd = new Date(trip.endDate);
      const duration = Math.ceil((originalEnd.getTime() - originalStart.getTime()) / (1000 * 60 * 60 * 24));

      const newStartDate = today.toISOString().split('T')[0];
      const newEndDate = new Date(today.getTime() + duration * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const newItinerary = {
        user_id: user.id,
        title: `${trip.title} (Copy)`,
        destination: trip.location,
        start_date: newStartDate,
        end_date: newEndDate,
        is_public: false,
        likes: 0,
        content: {
          ...trip,
          title: `${trip.title} (Copy)`,
          startDate: newStartDate,
          endDate: newEndDate,
          isPublic: false,
          likes: 0,
        }
      };

      const { data, error } = await supabase
        .from('itineraries')
        .insert(newItinerary)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const duplicated: Itinerary = {
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
        setItineraries(prev => [duplicated, ...prev]);
        alert('Trip duplicated successfully!');
      }
    } catch (error) {
      console.error('Error duplicating trip:', error);
      alert('Failed to duplicate trip');
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
    let items: Itinerary[] = [];

    if (activeTab === 'favorites') {
      items = savedItineraries;
    } else {
      const now = new Date();
      now.setHours(0, 0, 0, 0); // Normalize today

      items = itineraries.filter(trip => {
        if (!trip.endDate) return activeTab === 'upcoming'; // No date = upcoming
        const end = new Date(trip.endDate);

        if (activeTab === 'past') return end < now;
        if (activeTab === 'upcoming') return end >= now;
        return false;
      });
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      items = items.filter(trip =>
        trip.title?.toLowerCase().includes(query) ||
        trip.location?.toLowerCase().includes(query) ||
        trip.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        trip.description?.toLowerCase().includes(query)
      );
    }

    return items;
  })();

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <div className="h-10 w-48 bg-gray-200 dark:bg-[#2a2e35] rounded-lg animate-pulse mb-2" />
          <div className="h-5 w-32 bg-gray-200 dark:bg-[#2a2e35] rounded animate-pulse" />
        </div>
        <SkeletonGrid count={6} />
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search_destinations}
              className="w-full pl-10 pr-10 py-3 bg-white dark:bg-[#1e2126] border border-gray-200 dark:border-[#2a2e35] rounded-xl text-base focus:ring-1 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white transition-all shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-600"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 border-b border-gray-200 dark:border-[#2a2e35]">
        <div className="flex gap-8 overflow-x-auto no-scrollbar">
          {(['upcoming', 'past', 'favorites'] as const).map((tab) => (
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
        searchQuery ? (
          <NoSearchResultsEmptyState query={searchQuery} onClear={() => setSearchQuery('')} />
        ) : activeTab === 'favorites' ? (
          <NoSavedTripsEmptyState onExplore={() => onNavigate('explore')} />
        ) : (
          <NoTripsEmptyState onCreateTrip={() => onNavigate('home')} />
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Create New Card - Only show in Upcoming/Drafts */}
          {activeTab === 'upcoming' && (
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
                              onClick={(e) => handleDuplicateTrip(e, trip)}
                              className="w-full text-left px-4 py-2.5 text-sm font-medium text-slate-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2e35] flex items-center gap-2"
                            >
                              <span className="material-symbols-outlined text-[18px]">content_copy</span>
                              Duplicate
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
                <div className="mt-auto">
                  <button
                    onClick={() => onNavigate('itinerary', trip)}
                    className="w-full flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary text-primary hover:text-white font-bold py-2.5 rounded-lg transition-all duration-200"
                  >
                    <span>{t.view_plan}</span>
                    <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
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
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
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

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => setConfirmDialog({ isOpen: false, type: 'delete', tripId: '' })}
        onConfirm={confirmDialog.type === 'delete' ? confirmDelete : confirmRemoveSaved}
        title={confirmDialog.type === 'delete' ? 'Delete Trip?' : 'Remove Saved Trip?'}
        message={confirmDialog.type === 'delete'
          ? 'This action cannot be undone. Your itinerary and all its data will be permanently deleted.'
          : 'This trip will be removed from your saved collection. You can always save it again later.'
        }
        confirmLabel={confirmDialog.type === 'delete' ? 'Delete' : 'Remove'}
        variant={confirmDialog.type === 'delete' ? 'danger' : 'warning'}
        isLoading={isDeleting}
      />
    </div>
  );
}
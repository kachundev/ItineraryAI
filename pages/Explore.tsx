import React, { useState, useEffect, useMemo } from 'react';
import { Itinerary } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SkeletonExploreGrid } from '../components/Skeleton';
import { NoSearchResultsEmptyState, NoCommunityTripsEmptyState } from '../components/EmptyState';
import { useToast } from '../components/Toast';

interface ExploreProps {
  onNavigate: (view: any, data?: any) => void;
  t: any;
}

type SortCategory = 'trending' | 'newest' | 'top-rated';

const ITEMS_PER_PAGE = 9;

export default function Explore({ onNavigate, t }: ExploreProps) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [itineraries, setItineraries] = useState<Itinerary[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<SortCategory>('newest');
  const [activeTag, setActiveTag] = useState<string>('All');
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  // Get unique tags from all itineraries
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    itineraries.forEach(item => {
      item.tags?.forEach(tag => tagSet.add(tag));
    });
    return ['All', ...Array.from(tagSet).slice(0, 8)];
  }, [itineraries]);

  // Filter and sort itineraries
  const filteredItineraries = useMemo(() => {
    let result = [...itineraries];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(item =>
        item.title?.toLowerCase().includes(query) ||
        item.location?.toLowerCase().includes(query) ||
        item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
        item.description?.toLowerCase().includes(query)
      );
    }

    // Apply tag filter
    if (activeTag !== 'All') {
      result = result.filter(item =>
        item.tags?.some(tag => tag.toLowerCase() === activeTag.toLowerCase())
      );
    }

    // Apply category sorting
    switch (activeCategory) {
      case 'trending':
        // Filter to last 7 days (by publish date), then sort by likes
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        result = result.filter(item => item.createdAt && new Date(item.createdAt) >= sevenDaysAgo);
        result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'newest':
        // Sort by publish date (newest first)
        result.sort((a, b) => new Date(b.createdAt || b.startDate).getTime() - new Date(a.createdAt || a.startDate).getTime());
        break;
      case 'top-rated':
        // Sort by most likes
        result.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
    }

    return result;
  }, [itineraries, searchQuery, activeTag, activeCategory]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(ITEMS_PER_PAGE);
  }, [searchQuery, activeTag, activeCategory]);

  useEffect(() => {
    fetchPublicItineraries();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserSavesAndLikes();
    }
  }, [user]);

  const fetchUserSavesAndLikes = async () => {
    if (!user) return;

    const { data: saves } = await supabase
      .from('itinerary_saves')
      .select('itinerary_id')
      .eq('user_id', user.id);

    if (saves) {
      setSavedIds(new Set(saves.map(s => s.itinerary_id)));
    }

    const { data: likes } = await supabase
      .from('itinerary_likes')
      .select('itinerary_id')
      .eq('user_id', user.id);

    if (likes) {
      setLikedIds(new Set(likes.map(l => l.itinerary_id)));
    }
  };

  const handleSaveToggle = async (e: React.MouseEvent, itinerary: Itinerary) => {
    e.stopPropagation();
    if (!user) {
      showToast(t.login_to_save, 'warning');
      return;
    }

    const isSaved = savedIds.has(itinerary.id);

    try {
      if (isSaved) {
        // Remove from saved
        const { error } = await supabase
          .from('itinerary_saves')
          .delete()
          .match({ user_id: user.id, itinerary_id: itinerary.id });

        if (error) throw error;

        setSavedIds(prev => {
          const next = new Set(prev);
          next.delete(itinerary.id);
          return next;
        });
        showToast(t.removed_from_saved || 'Removed from saved trips', 'success');
      } else {
        // Add to saved
        const { error } = await supabase
          .from('itinerary_saves')
          .insert({ user_id: user.id, itinerary_id: itinerary.id });

        if (error) throw error;

        setSavedIds(prev => new Set(prev).add(itinerary.id));
        showToast(t.saved_success || 'Saved to your trips!', 'success');
      }
    } catch (error) {
      console.error('Error toggling save:', error);
      showToast(t.save_error || 'Failed to save itinerary', 'error');
    }
  };

  const handleLikeToggle = async (e: React.MouseEvent, itineraryId: string) => {
    e.stopPropagation();
    if (!user) {
      showToast(t.login_to_comment, 'warning');
      return;
    }

    const isLiked = likedIds.has(itineraryId);

    if (isLiked) {
      await supabase
        .from('itinerary_likes')
        .delete()
        .match({ user_id: user.id, itinerary_id: itineraryId });
      setLikedIds(prev => {
        const next = new Set(prev);
        next.delete(itineraryId);
        return next;
      });
      setItineraries(prev => prev.map(it =>
        it.id === itineraryId ? { ...it, likes: Math.max(0, (it.likes || 0) - 1) } : it
      ));
      await supabase.rpc('decrement_likes', { itinerary_id: itineraryId });
    } else {
      await supabase
        .from('itinerary_likes')
        .insert({ user_id: user.id, itinerary_id: itineraryId });
      setLikedIds(prev => new Set(prev).add(itineraryId));
      setItineraries(prev => prev.map(it =>
        it.id === itineraryId ? { ...it, likes: (it.likes || 0) + 1 } : it
      ));
      await supabase.rpc('increment_likes', { itinerary_id: itineraryId });
    }
  };

  const fetchPublicItineraries = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('itineraries')
        .select(`
          *,
          profiles:user_id (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedItineraries: Itinerary[] = data.map(item => ({
          ...item.content,
          id: item.id,
          userId: item.user_id,
          title: item.title,
          location: item.destination,
          startDate: item.start_date,
          endDate: item.end_date,
          createdAt: item.created_at,
          isPublic: item.is_public,
          likes: item.likes || 0,
          author: {
            name: item.profiles?.full_name || 'Anonymous',
            avatar: item.profiles?.avatar_url || `https://i.pravatar.cc/150?u=${item.user_id}`,
          },
        }));
        setItineraries(mappedItineraries);
      }
    } catch (error) {
      console.error('Error fetching public itineraries:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex flex-col md:flex-row gap-8">

        {/* Sidebar Filters */}
        <aside className="w-full md:w-64 space-y-6 shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t.discover}</h2>
            <p className="text-slate-500 dark:text-gray-400 text-sm">{t.discover_subtitle}</p>
          </div>

          <div className="relative group">
            <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
              <span className="material-symbols-outlined">search</span>
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.search_destinations}
              className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-[#1e2126] border border-gray-200 dark:border-[#2a2e35] rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white"
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

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-sm uppercase text-slate-400 dark:text-gray-500 tracking-wider mb-2">{t.categories}</h3>
            {([
              { id: 'trending', label: 'Trending', icon: 'trending_up' },
              { id: 'newest', label: 'Newest', icon: 'schedule' },
              { id: 'top-rated', label: 'Top Rated', icon: 'star' },
            ] as const).map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${activeCategory === cat.id ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1e2126]'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">{cat.icon}</span>
                  {cat.label}
                </div>
                {activeCategory === cat.id && (
                  <span className="material-symbols-outlined text-[16px]">check</span>
                )}
              </button>
            ))}
          </div>

          {/* AI Banner */}
          <div className="bg-gradient-to-br from-[#2a221c] to-[#1a1612] dark:from-[#2d2317] dark:to-[#0a0a0c] rounded-2xl p-6 text-white relative overflow-hidden group cursor-pointer shadow-lg" onClick={() => onNavigate('home')}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
            <div className="relative z-10 flex flex-col gap-4">
              <div className="size-10 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm border border-white/5">
                <span className="material-symbols-outlined text-primary">auto_awesome</span>
              </div>
              <div>
                <h4 className="font-bold text-lg mb-1">{t.plan_with_ai}</h4>
                <p className="text-sm text-gray-300 leading-relaxed">{t.plan_ai_subtitle}</p>
              </div>
              <button className="w-full py-2 bg-primary hover:bg-primary-hover rounded-lg font-bold text-xs transition-colors mt-2 text-white">
                {t.start_planning}
              </button>
            </div>
          </div>
        </aside>

        {/* Main Feed */}
        <div className="flex-1">
          <div className="flex gap-2 overflow-x-auto pb-4 mb-4 no-scrollbar">
            {availableTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTag(tag)}
                className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${activeTag === tag ? 'bg-white dark:bg-[#1e2126] border-primary text-primary font-bold' : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-[#1e2126] text-slate-600 dark:text-gray-400'}`}
              >
                {tag}
              </button>
            ))}
          </div>

          {loading ? (
            <SkeletonExploreGrid count={6} />
          ) : filteredItineraries.length === 0 ? (
            searchQuery ? (
              <NoSearchResultsEmptyState query={searchQuery} onClear={() => setSearchQuery('')} />
            ) : (
              <NoCommunityTripsEmptyState onCreateTrip={() => onNavigate('home')} />
            )
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredItineraries.slice(0, displayCount).map((item) => (
                <div
                  key={item.id}
                  onClick={() => onNavigate('itinerary', item)}
                  className="group bg-white dark:bg-[#1e2126] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2a2e35] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col"
                >
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={item.coverImage || 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?q=80&w=2070&auto=format&fit=crop'}
                      alt={item.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 border border-white/10">
                        <span className="material-symbols-outlined text-[14px]">schedule</span> {item.days?.length || 0} {t.days_count}
                      </span>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <div className="flex items-center gap-2 text-white text-sm font-bold">
                        <span className="material-symbols-outlined text-[16px] text-primary">location_on</span>
                        {item.location}
                      </div>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 gap-3">
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors">{item.title}</h3>
                    <div className="flex items-center gap-2 mt-auto pt-3 border-t border-gray-100 dark:border-[#2a2e35]">
                      <img src={item.author?.avatar} alt={item.author?.name} className="size-8 rounded-full border border-gray-200 dark:border-[#2a2e35]" />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-900 dark:text-gray-200">{item.author?.name}</span>
                        <span className="text-[10px] text-slate-500 dark:text-gray-500">{item.startDate}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-3 text-slate-400 dark:text-gray-500">
                        <button
                          className={`flex items-center gap-1 transition-colors group/heart ${likedIds.has(item.id) ? 'text-red-500' : 'hover:text-red-500'}`}
                          onClick={(e) => handleLikeToggle(e, item.id)}
                        >
                          <span className={`material-symbols-outlined text-[18px] ${likedIds.has(item.id) ? 'fill-1' : 'group-hover/heart:fill-1'}`}>favorite</span>
                          <span className="text-xs font-medium">{item.likes || 0}</span>
                        </button>
                        <button
                          className={`flex items-center justify-center transition-colors ${savedIds.has(item.id) ? 'text-primary' : 'hover:text-primary'}`}
                          onClick={(e) => handleSaveToggle(e, item)}
                          title={savedIds.has(item.id) ? t.saved_to_my_trips : t.save_to_my_trips}
                        >
                          <span className={`material-symbols-outlined text-[18px] ${savedIds.has(item.id) ? 'fill-1' : ''}`}>bookmark</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredItineraries.length > displayCount && (
            <div className="flex flex-col items-center gap-2 mt-12">
              <p className="text-sm text-slate-500 dark:text-gray-400">
                Showing {Math.min(displayCount, filteredItineraries.length)} of {filteredItineraries.length} trips
              </p>
              <button
                onClick={() => setDisplayCount(prev => prev + ITEMS_PER_PAGE)}
                className="px-8 py-3 rounded-full bg-white dark:bg-[#1e2126] border border-gray-200 dark:border-[#2a2e35] text-slate-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-[#2a2e35]/80 transition-all shadow-sm"
              >
                {t.load_more}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

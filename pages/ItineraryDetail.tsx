import React, { useState } from 'react';
import { Itinerary, Activity, RestaurantOption } from '../types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface ItineraryDetailProps {
  itinerary: Itinerary | null;
  onNavigate: (view: any) => void;
  onSave: (itinerary: Itinerary) => void;
  t: any;
}

const RestaurantCard = ({ option, index, t }: { option: RestaurantOption, index: number, t: any }) => {
  const openMap = (e: React.MouseEvent) => {
    e.stopPropagation();
    const query = `${option.name} ${option.cuisine}`;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  return (
    <div className="bg-gray-50 dark:bg-[#25282e] rounded-lg p-4 border border-gray-100 dark:border-[#2a2e35] flex flex-col gap-2 min-w-[260px] flex-1 group/card relative">
      <div className="flex justify-between items-start">
        <h4 className="font-bold text-slate-900 dark:text-white truncate pr-6" title={option.name}>{index + 1}. {option.name}</h4>
        <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded">{option.priceLevel}</span>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400">
        <span className="flex items-center gap-0.5 text-yellow-500">
          <span className="material-symbols-outlined text-[14px] filled">star</span>
          {option.rating}
        </span>
        <span>•</span>
        <span>{option.cuisine}</span>
      </div>
      <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed line-clamp-2 mt-1" title={option.description}>
        {option.description}
      </p>

      {/* Map Button for Restaurant */}
      <button
        onClick={openMap}
        className="absolute bottom-3 right-3 p-1.5 bg-white dark:bg-[#1e2126] text-slate-500 hover:text-primary rounded-full shadow-sm border border-gray-200 dark:border-[#2a2e35] opacity-0 group-hover/card:opacity-100 transition-opacity"
        title={t.view_on_google_maps}
      >
        <span className="material-symbols-outlined text-[18px]">map</span>
      </button>
    </div>
  );
};

export default function ItineraryDetail({ itinerary, onNavigate, onSave, t }: ItineraryDetailProps) {
  const { user } = useAuth();
  const [activeDay, setActiveDay] = useState(0);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    setIsSaved(false);
  }, [itinerary]);

  if (!itinerary) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold mb-4 dark:text-white">{t.no_itinerary}</h2>
        <button onClick={() => onNavigate('home')} className="text-primary hover:underline">{t.go_home}</button>
      </div>
    );
  }

  const currentDay = itinerary.days[activeDay];

  const handleOpenMap = (location: string, title: string) => {
    const query = location || title;
    window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
  };

  const handleSave = async () => {
    if (!user) {
      alert("Please sign in to save itineraries.");
      return;
    }

    try {
      setIsSaving(true);

      // Prepare data for DB
      const { id, title, location: destination, startDate, endDate, generated, ...rest } = itinerary;

      // We use the 'content' jsonb column to store the full itinerary details including days, activities etc.
      const content = {
        generated,
        ...rest,
        days: itinerary.days, // Ensure days are explicitly included
        tags: itinerary.tags,
        budget: itinerary.budget,
        rating: itinerary.rating,
        coverImage: itinerary.coverImage
      };

      const { error } = await supabase
        .from('itineraries')
        .insert({
          user_id: user.id,
          title,
          destination,
          start_date: startDate,
          end_date: endDate,
          content,
          is_public: false // Default to private
        });

      if (error) throw error;

      setIsSaved(true);
      onSave(itinerary); // Callback to update parent state or navigate
    } catch (error) {
      console.error("Error saving itinerary:", error);
      alert("Failed to save itinerary.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-20">
      {/* Header Image */}
      <div className="relative h-[40vh] w-full bg-slate-900">
        <img
          src={itinerary.coverImage}
          alt={itinerary.title}
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background-light dark:from-background-dark to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full p-6 lg:p-12 max-w-7xl mx-auto">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              {itinerary.generated && (
                <span className="bg-primary/90 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                  {t.ai_generated}
                </span>
              )}
              <span className="bg-white/10 text-white border border-white/20 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-md">
                {itinerary.days.length} {t.days_count}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white leading-tight shadow-sm">
              {itinerary.title}
            </h1>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <img src={itinerary.author?.avatar} alt={itinerary.author?.name} className="size-8 rounded-full border border-white/50" />
                <span className="text-sm font-bold">{itinerary.author?.name}</span>
              </div>
              <span className="text-white/40">•</span>
              <span className="text-sm">{itinerary.startDate} - {itinerary.endDate}</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="absolute top-6 right-6 flex gap-3 z-20">
          <button className="size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors">
            <span className="material-symbols-outlined text-[20px]">favorite_border</span>
          </button>
          <button className="size-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white hover:bg-white hover:text-slate-900 transition-colors">
            <span className="material-symbols-outlined text-[20px]">ios_share</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 -mt-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Content */}
          <div className="lg:col-span-8 flex flex-col gap-8">

            {/* Stats Bar */}
            <div className="bg-white dark:bg-card-dark rounded-xl border border-gray-100 dark:border-[#2a2e35] p-6 shadow-sm flex flex-wrap gap-8 justify-around sm:justify-start">
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 font-bold mb-1">{t.duration}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                  {itinerary.days.length} {t.days_count}
                </span>
              </div>
              <div className="w-px h-12 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 font-bold mb-1">{t.budget}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  {itinerary.budget}
                </span>
              </div>
              <div className="w-px h-12 bg-gray-200 dark:bg-gray-700 hidden sm:block"></div>
              <div className="flex flex-col items-center sm:items-start">
                <span className="text-xs uppercase tracking-wide text-slate-500 dark:text-gray-400 font-bold mb-1">{t.rating}</span>
                <span className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-xl">star</span>
                  {itinerary.rating}
                </span>
              </div>
            </div>

            {/* Day Tabs */}
            <div className="sticky top-[72px] bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md py-4 z-20 border-b border-gray-200 dark:border-[#2a2e35] -mx-4 px-4 lg:mx-0 lg:px-0">
              <div className="flex gap-3 overflow-x-auto no-scrollbar pb-1">
                {itinerary.days.map((day, index) => (
                  <button
                    key={day.day}
                    onClick={() => setActiveDay(index)}
                    className={`flex-shrink-0 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-200 whitespace-nowrap ${activeDay === index
                        ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-105'
                        : 'bg-white dark:bg-[#1e2126] text-slate-500 dark:text-gray-400 border border-gray-200 dark:border-[#2a2e35] hover:border-primary dark:hover:border-primary hover:text-primary'
                      }`}
                  >
                    {t.day_prefix}{day.day}{t.day_suffix}
                  </button>
                ))}
              </div>
            </div>

            {/* Daily Plan */}
            <div className="space-y-8 min-h-[500px]">
              <div className="flex items-center gap-3 animate-fadeIn">
                <span className="material-symbols-outlined text-2xl text-primary">wb_sunny</span>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  {t.day_prefix}{currentDay.day}{t.day_suffix}: {currentDay.title}
                </h2>
              </div>

              <div className="relative pl-8 border-l-2 border-gray-200 dark:border-[#2a2e35] space-y-10">
                {currentDay.activities.map((activity, idx) => {
                  const isMeal = ['breakfast', 'lunch', 'dinner', '早餐', '午餐', '晚餐'].some(type => activity.type.toLowerCase().includes(type));

                  return (
                    <div key={idx} className="relative group animate-fadeIn" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className={`absolute -left-[9px] top-0 size-4 rounded-full ring-4 ring-background-light dark:ring-background-dark transition-colors ${isMeal ? 'bg-green-500' : 'bg-primary'}`}></div>

                      <div className="bg-white dark:bg-card-dark border border-gray-100 dark:border-[#2a2e35] rounded-xl p-5 hover:border-primary/30 hover:shadow-lg transition-all duration-300">

                        {/* Meal Section */}
                        {isMeal && activity.restaurantOptions ? (
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 p-2 rounded-lg">
                                <span className="material-symbols-outlined text-xl">restaurant</span>
                              </div>
                              <div>
                                <span className="text-xs font-bold uppercase text-slate-500 dark:text-gray-500">{activity.time}</span>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{activity.title}</h3>
                              </div>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-gray-300">{activity.description}</p>

                            <div className="mt-2">
                              <h4 className="text-xs font-bold uppercase text-slate-500 dark:text-gray-500 mb-3">{t.top_recommendations}</h4>
                              <div className="flex flex-col sm:flex-row gap-3 overflow-x-auto">
                                {activity.restaurantOptions.map((opt, i) => (
                                  <RestaurantCard key={i} option={opt} index={i} t={t} />
                                ))}
                              </div>
                            </div>
                          </div>
                        ) : (
                          /* Standard Activity Section - No Image List View */
                          <div className="flex flex-col gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="bg-gray-100 dark:bg-[#2a2e35] text-slate-600 dark:text-gray-300 text-xs font-bold px-2 py-0.5 rounded">
                                    {activity.time}
                                  </span>
                                  <span className="text-xs font-bold text-primary uppercase tracking-wide">{activity.type}</span>
                                </div>
                              </div>
                              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3 group-hover:text-primary transition-colors">{activity.title}</h3>

                              <div className="prose dark:prose-invert max-w-none mb-4">
                                <p className="text-slate-600 dark:text-gray-300 text-sm leading-relaxed">
                                  {activity.description}
                                </p>
                              </div>

                              {/* Detailed Guides Section */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 bg-gray-50 dark:bg-[#1e2126] p-4 rounded-lg border border-gray-100 dark:border-[#1e2126]">
                                {activity.tips && (
                                  <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] text-yellow-600 mt-0.5 shrink-0">lightbulb</span>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs font-bold uppercase text-slate-500 dark:text-gray-500">{t.tip}</span>
                                      <span className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed">{activity.tips}</span>
                                    </div>
                                  </div>
                                )}
                                {activity.transport && (
                                  <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined text-[18px] text-blue-500 mt-0.5 shrink-0">directions_bus</span>
                                    <div className="flex flex-col gap-1">
                                      <span className="text-xs font-bold uppercase text-slate-500 dark:text-gray-500">Transport</span>
                                      <span className="text-sm text-slate-700 dark:text-gray-300 leading-relaxed">{activity.transport}</span>
                                    </div>
                                  </div>
                                )}
                              </div>

                              {/* Info Badges & Navigation */}
                              <div className="flex flex-wrap gap-2 mt-4 items-center justify-between">
                                {activity.location && (
                                  <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 px-2 py-1 rounded">
                                    <span className="material-symbols-outlined text-[16px] text-slate-400 shrink-0">location_on</span>
                                    <span>{activity.location}</span>
                                  </div>
                                )}

                                {/* Main Navigation Button */}
                                <button
                                  onClick={() => handleOpenMap(activity.location || activity.title, activity.title)}
                                  className="flex items-center gap-1.5 text-xs text-primary font-bold bg-primary/10 hover:bg-primary/20 px-4 py-2 rounded-lg transition-colors ml-auto"
                                >
                                  <span className="material-symbols-outlined text-[18px]">near_me</span>
                                  {t.navigate}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="sticky top-24 space-y-6">
              {/* Actions Card */}
              <div className="bg-white dark:bg-card-dark border border-gray-100 dark:border-[#2a2e35] rounded-xl p-6 shadow-lg">
                <button onClick={handleSave} disabled={isSaved} className={`w-full font-bold py-3.5 px-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 mb-4 group ${isSaved ? 'bg-green-600 text-white cursor-default' : 'bg-primary hover:bg-primary-hover text-white shadow-primary/20'}`}>
                  <span className={`material-symbols-outlined ${!isSaved && 'group-hover:animate-bounce'}`}>{isSaved ? 'check' : 'bookmark_add'}</span>
                  {isSaved ? t.saved : t.save_trip}
                </button>
                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-[#2a2e35] hover:bg-gray-50 dark:hover:bg-[#2a2e35] text-slate-700 dark:text-gray-300 font-bold text-sm transition-colors">
                    <span className="material-symbols-outlined text-[20px] text-red-500">favorite</span> {t.like}
                  </button>
                  <button className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-gray-200 dark:border-[#2a2e35] hover:bg-gray-50 dark:hover:bg-[#2a2e35] text-slate-700 dark:text-gray-300 font-bold text-sm transition-colors">
                    <span className="material-symbols-outlined text-[20px]">share</span> {t.share}
                  </button>
                </div>
              </div>

              {/* Map Preview */}
              <div
                onClick={() => handleOpenMap(itinerary.location, itinerary.title)}
                className="bg-white dark:bg-card-dark border border-gray-100 dark:border-[#2a2e35] rounded-xl overflow-hidden shadow-sm group cursor-pointer"
              >
                <div className="p-4 border-b border-gray-100 dark:border-[#2a2e35] flex justify-between items-center bg-gray-50 dark:bg-[#2a2e35]/30">
                  <h4 className="font-bold text-slate-900 dark:text-white">{t.route_preview}</h4>
                  <span className="text-primary text-xs font-bold uppercase tracking-wider">{t.view_map}</span>
                </div>
                <div className="relative h-48 w-full bg-slate-200 dark:bg-gray-800">
                  <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuCmMO-UNBvXaVw35yiyJwjI9jD1hBWsqNrlpW_ZoN9SoG4LIkN0aFIi6FzJ3eKtPikEthWXORiAPyLZrKjSZGUaV-jGr78kERmtPVkfgwjPQsXwB7Bt9lRZG1jQK8KtwMKXmuumvJRP3jxCuptUFKKS6p_PsT_O8iIFUmMmA9cWRAO6ueYohzot4s6qMPmfBkVF8BXfN-EkfYvBiGeK6MxRzUm4JwUAonZmAPqyEdQ-G43gRkOkN9FUzU4EvF8vPNpoLmhwHg343tY1" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" alt="Map" />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/90 dark:bg-black/50 backdrop-blur-sm p-3 rounded-full shadow-lg">
                      <span className="material-symbols-outlined text-primary text-2xl">map</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
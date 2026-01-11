import React, { useState, useEffect } from 'react';
import { generateItinerary } from '../services/geminiService';
import { Itinerary } from '../types';
import { supabase } from '../lib/supabase';
import CustomDatePicker from '../components/CustomDatePicker';

interface HomeProps {
  onNavigate: (view: any, data?: any) => void;
  lang: string;
  t: any;
}

export default function Home({ onNavigate, lang, t }: HomeProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [specialRequests, setSpecialRequests] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trendingItineraries, setTrendingItineraries] = useState<any[]>([]);

  // Fetch trending itineraries
  useEffect(() => {
    const fetchTrending = async () => {
      const { data } = await supabase
        .from('itineraries')
        .select('id, title, destination, content, likes')
        .eq('is_public', true)
        .order('likes', { ascending: false })
        .limit(3);
      setTrendingItineraries(data || []);
    };
    fetchTrending();
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || !startDate || !endDate) return;

    if (endDate < startDate) {
      setError('End date cannot be earlier than start date');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Format dates as strings for the API
      const formatDate = (d: Date) => d.toISOString().split('T')[0];
      const itinerary = await generateItinerary(destination, formatDate(startDate), formatDate(endDate), [], specialRequests, lang);
      onNavigate('itinerary', itinerary);
    } catch (err: any) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to generate itinerary. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1">
      <section className="relative">
        <div className="absolute inset-0 h-[750px] w-full overflow-hidden">
          <div
            className="h-full w-full bg-cover bg-center transition-transform duration-[20s] hover:scale-105"
            style={{
              backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(22,24,29,1)), url('https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop')`
            }}
          ></div>
        </div>

        <div className="relative z-10 px-6 py-12 lg:px-20 lg:py-24 flex flex-col items-center">
          <div className="mb-10 text-center max-w-3xl animate-fadeIn">
            <h1 className="text-4xl md:text-6xl font-black leading-tight tracking-tight text-white mb-6 drop-shadow-lg">
              {t.home_title} <br />
              <span className="text-primary">{t.home_title_highlight}</span>
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-medium max-w-2xl mx-auto">
              {t.home_subtitle}
            </p>
          </div>

          <div className="w-full max-w-4xl rounded-2xl bg-white dark:bg-[#1e2126] shadow-2xl border border-gray-100 dark:border-[#2a2e35] p-6 md:p-8 animate-fadeIn" style={{ animationDelay: '0.2s' }}>
            <form className="flex flex-col gap-6" onSubmit={handleGenerate}>
              {/* Destination Input */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">{t.destination_label}</label>
                <div className="relative flex items-center group">
                  <div className="absolute left-4 text-primary group-focus-within:scale-110 transition-transform">
                    <span className="material-symbols-outlined">location_on</span>
                  </div>
                  <input
                    type="text"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#16181d] py-4 pl-12 pr-4 text-lg font-medium text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none"
                    placeholder={t.destination_placeholder}
                    required
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">{t.start_date}</label>
                  <CustomDatePicker
                    selected={startDate}
                    onChange={(date) => {
                      setStartDate(date);
                      // Reset end date if it becomes invalid
                      if (endDate && date && date > endDate) {
                        setEndDate(null);
                      }
                    }}
                    minDate={new Date()}
                    placeholder={t.start_date}
                    icon="calendar_today"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">{t.end_date}</label>
                  <CustomDatePicker
                    selected={endDate}
                    onChange={setEndDate}
                    minDate={startDate || new Date()}
                    placeholder={t.end_date}
                    icon="event"
                  />
                </div>
              </div>

              {/* Special Requests */}
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-slate-700 dark:text-gray-300 uppercase tracking-wide">{t.special_requests}</label>
                <div className="relative flex items-start group">
                  <div className="absolute top-3.5 left-4 text-primary group-focus-within:scale-110 transition-transform">
                    <span className="material-symbols-outlined">edit_note</span>
                  </div>
                  <textarea
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#16181d] py-3 pl-12 pr-4 text-base font-medium text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none resize-none"
                    placeholder={t.special_requests_placeholder}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-xl bg-primary py-4 text-lg font-bold text-white shadow-lg transition-all hover:bg-primary-hover hover:shadow-xl hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>{t.planning_button}</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined group-hover:animate-pulse">auto_awesome</span>
                      <span>{t.generate_button}</span>
                    </>
                  )}
                </button>
                {error && <p className="text-red-500 text-center mt-4 text-sm font-medium">{error}</p>}
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="px-6 py-20 lg:px-20 bg-background-light dark:bg-background-dark">
        <div className="mx-auto max-w-7xl">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white">{t.trending_destinations}</h2>
              <p className="text-slate-500 dark:text-gray-400 mt-2">{t.trending_subtitle}</p>
            </div>
            <button onClick={() => onNavigate('explore')} className="hidden sm:flex items-center gap-1 text-primary font-bold hover:underline">
              {t.view_all} <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {trendingItineraries.length > 0 ? (
              trendingItineraries.map((item) => (
                <div key={item.id} className="group relative h-64 rounded-2xl overflow-hidden cursor-pointer shadow-md hover:shadow-xl transition-all" onClick={() => onNavigate('explore')}>
                  <img
                    src={item.content?.coverImage || `https://image.pollinations.ai/prompt/${encodeURIComponent(item.destination + " travel landscape")}?width=800&height=600&nologo=true`}
                    alt={item.destination}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className="text-xl font-bold">{item.destination}</h3>
                    <p className="text-sm opacity-90 flex items-center gap-1 mt-1">
                      <span className="material-symbols-outlined text-sm">thumb_up</span>
                      {item.likes || 0} {t.like}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              // Skeleton loading
              [1, 2, 3].map((i) => (
                <div key={i} className="h-64 rounded-2xl bg-gray-200 dark:bg-[#2a2e35] animate-pulse"></div>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
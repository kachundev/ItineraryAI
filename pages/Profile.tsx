import React from 'react';

interface ProfileProps {
  onNavigate: (view: any) => void;
  t: any;
}

export default function Profile({ onNavigate, t }: ProfileProps) {
  return (
    <div className="flex justify-center py-8 px-4 md:px-10">
       <div className="flex flex-col max-w-6xl w-full gap-8">
          <div className="flex flex-col lg:flex-row gap-8 items-start">
             
             {/* Profile Sidebar */}
             <aside className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6">
                <div className="bg-white dark:bg-[#1e2126] rounded-2xl p-8 flex flex-col items-center text-center shadow-sm border border-gray-100 dark:border-[#2a2e35]">
                   <div className="relative mb-4 group cursor-pointer">
                      <div className="size-32 rounded-full border-4 border-white dark:border-[#2a2e35] shadow-lg overflow-hidden">
                         <img src="https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=2080&auto=format&fit=crop" alt="Profile" className="w-full h-full object-cover" />
                      </div>
                      <div className="absolute bottom-1 right-1 bg-primary text-white rounded-full p-1.5 border-4 border-white dark:border-[#1e2126] flex items-center justify-center shadow-md">
                         <span className="material-symbols-outlined text-[16px] leading-none">auto_awesome</span>
                      </div>
                   </div>
                   <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">Alex Rivera</h1>
                   <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-4">@traveler_alex</p>
                   <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed mb-6">
                      Digital nomad exploring Asia. AI enthusiast. Collecting memories one itinerary at a time. 🌏✨
                   </p>
                   <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-4 rounded-xl transition-colors">
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      <span>{t.edit_profile}</span>
                   </button>
                </div>

                <div className="bg-white dark:bg-[#1e2126] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#2a2e35]">
                   <h3 className="text-slate-900 dark:text-white font-bold mb-4 px-1">{t.community_stats}</h3>
                   <div className="grid grid-cols-3 gap-3">
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-[#2a2e35]/50">
                         <span className="text-xl font-bold text-slate-900 dark:text-white">12</span>
                         <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 mt-1">{t.trips}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-[#2a2e35]/50">
                         <span className="text-xl font-bold text-slate-900 dark:text-white">1.5k</span>
                         <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 mt-1">{t.fans}</span>
                      </div>
                      <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-[#2a2e35]/50">
                         <span className="text-xl font-bold text-slate-900 dark:text-white">450</span>
                         <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 mt-1">{t.like}</span>
                      </div>
                   </div>
                </div>
             </aside>

             {/* Main Content */}
             <main className="flex-1 w-full min-w-0">
                <div className="flex border-b border-gray-200 dark:border-[#2a2e35] mb-6 overflow-x-auto no-scrollbar">
                   <button className="px-6 py-3 border-b-2 border-primary text-primary font-bold text-sm whitespace-nowrap">{t.published}</button>
                   <button className="px-6 py-3 border-b-2 border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors whitespace-nowrap">
                      {t.drafts} <span className="ml-1 text-xs bg-slate-200 dark:bg-[#2a2e35] px-1.5 py-0.5 rounded-full text-slate-600 dark:text-gray-300">2</span>
                   </button>
                   <button className="px-6 py-3 border-b-2 border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white font-medium text-sm transition-colors whitespace-nowrap">{t.favorites}</button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="group bg-white dark:bg-[#1e2126] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-[#2a2e35]">
                         <div className="relative h-48 overflow-hidden">
                            <div className="absolute top-3 left-3 z-10 flex gap-2">
                               <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                  <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                                  {t.ai_generated}
                               </span>
                            </div>
                            <img 
                               src={`https://source.unsplash.com/random/800x600?travel&sig=${i}`} 
                               alt="Trip" 
                               className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" 
                            />
                         </div>
                         <div className="p-5">
                            <div className="flex justify-between items-start mb-2">
                               <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">Weekend Adventure {i}</h3>
                               <div className="flex items-center gap-1 text-slate-400 dark:text-gray-500 text-xs font-medium">
                                  <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                                  <span>{100 * i}</span>
                               </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-4">
                               <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a2e35] text-slate-500 dark:text-gray-400 text-xs rounded font-bold">Foodie</span>
                               <span className="px-2 py-1 bg-gray-100 dark:bg-[#2a2e35] text-slate-500 dark:text-gray-400 text-xs rounded font-bold">Urban</span>
                            </div>
                            <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#2a2e35] pt-3 mt-2">
                               <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-gray-400">
                                  <div className="flex items-center gap-1">
                                     <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                                     3 {t.days}
                                  </div>
                               </div>
                               <button className="text-primary text-xs font-bold hover:underline">{t.view_details}</button>
                            </div>
                         </div>
                      </div>
                   ))}
                </div>
             </main>
          </div>
       </div>
    </div>
  );
}

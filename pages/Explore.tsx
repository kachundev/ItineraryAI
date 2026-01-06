import React from 'react';

interface ExploreProps {
  onNavigate: (view: any) => void;
  t: any;
}

const FEED_ITEMS = [
  {
    id: 1,
    title: "Relaxing Weekend in Hakone",
    days: 5,
    location: "Hakone, Japan",
    author: "TravelFanatic",
    avatar: "https://i.pravatar.cc/150?u=TravelFanatic",
    image: "https://images.unsplash.com/photo-1545569341-9eb8b30979d9?q=80&w=2070&auto=format&fit=crop",
    likes: "1.2k",
    time: "2 hours ago"
  },
  {
    id: 2,
    title: "7 Days in Swiss Alps",
    days: 7,
    location: "Interlaken, Switzerland",
    author: "AlpsLover",
    avatar: "https://i.pravatar.cc/150?u=AlpsLover",
    image: "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?q=80&w=2070&auto=format&fit=crop",
    likes: "850",
    time: "1 day ago"
  },
  {
    id: 3,
    title: "Hidden Gems of Bali",
    days: 10,
    location: "Ubud, Bali",
    author: "BaliLife",
    avatar: "https://i.pravatar.cc/150?u=BaliLife",
    image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?q=80&w=2038&auto=format&fit=crop",
    likes: "2.1k",
    time: "2 days ago"
  },
  {
    id: 4,
    title: "Roadtrip across Iceland",
    days: 8,
    location: "Reykjavik, Iceland",
    author: "IceQueen",
    avatar: "https://i.pravatar.cc/150?u=IceQueen",
    image: "https://images.unsplash.com/photo-1476610182048-b716b8518aae?q=80&w=2159&auto=format&fit=crop",
    likes: "500",
    time: "4 days ago"
  },
  {
    id: 5,
    title: "Tokyo Food Tour",
    days: 3,
    location: "Tokyo, Japan",
    author: "SushiKing",
    avatar: "https://i.pravatar.cc/150?u=SushiKing",
    image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?q=80&w=1974&auto=format&fit=crop",
    likes: "1.5k",
    time: "5 days ago"
  },
  {
    id: 6,
    title: "Paris on a Budget",
    days: 4,
    location: "Paris, France",
    author: "CityExplorer",
    avatar: "https://i.pravatar.cc/150?u=CityExplorer",
    image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?q=80&w=2073&auto=format&fit=crop",
    likes: "3k",
    time: "3 days ago"
  }
];

export default function Explore({ onNavigate, t }: ExploreProps) {
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
              placeholder={t.search_destinations}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#1e2126] border border-gray-200 dark:border-[#2a2e35] rounded-xl text-sm focus:ring-1 focus:ring-primary focus:border-primary outline-none text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="font-bold text-sm uppercase text-slate-400 dark:text-gray-500 tracking-wider mb-2">{t.categories}</h3>
            {['Trending', 'Newest', 'Top Rated', 'Following'].map((cat, i) => (
              <button 
                key={cat}
                className={`flex items-center justify-between p-3 rounded-xl transition-all ${i === 0 ? 'bg-primary/10 text-primary font-bold' : 'text-slate-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#1e2126]'}`}
              >
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[20px]">
                    {i === 0 ? 'trending_up' : i === 1 ? 'new_releases' : i === 2 ? 'star' : 'group'}
                  </span>
                  {cat}
                </div>
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
            {['All', 'Kyoto', 'Budget Friendly', 'Family Trip', 'Adventure', 'Foodie'].map((tag, i) => (
              <button 
                key={tag}
                className={`px-4 py-2 rounded-full text-sm font-medium border whitespace-nowrap transition-colors ${i === 0 ? 'bg-white dark:bg-[#1e2126] border-primary text-primary font-bold' : 'bg-transparent border-transparent hover:bg-gray-100 dark:hover:bg-[#1e2126] text-slate-600 dark:text-gray-400'}`}
              >
                {tag}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEED_ITEMS.map((item) => (
              <div key={item.id} className="group bg-white dark:bg-[#1e2126] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2a2e35] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col">
                <div className="relative aspect-[4/3] overflow-hidden">
                   <img src={item.image} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                   <div className="absolute top-3 right-3">
                      <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-md text-white text-xs font-bold flex items-center gap-1 border border-white/10">
                         <span className="material-symbols-outlined text-[14px]">schedule</span> {item.days} {t.days}
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
                      <img src={item.avatar} alt={item.author} className="size-8 rounded-full border border-gray-200 dark:border-[#2a2e35]" />
                      <div className="flex flex-col">
                         <span className="text-xs font-bold text-slate-900 dark:text-gray-200">{item.author}</span>
                         <span className="text-[10px] text-slate-500 dark:text-gray-500">{item.time}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-3 text-slate-400 dark:text-gray-500">
                         <button className="flex items-center gap-1 hover:text-red-500 transition-colors group/heart">
                            <span className="material-symbols-outlined text-[18px] group-hover/heart:fill-1">favorite</span>
                            <span className="text-xs font-medium">{item.likes}</span>
                         </button>
                      </div>
                   </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center mt-12">
            <button className="px-8 py-3 rounded-full bg-white dark:bg-[#1e2126] border border-gray-200 dark:border-[#2a2e35] text-slate-900 dark:text-white font-bold hover:bg-gray-50 dark:hover:bg-[#2a2e35]/80 transition-all shadow-sm">
                {t.load_more}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

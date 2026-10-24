import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { User, Itinerary } from '../types';

interface ProfileProps {
   onNavigate: (view: any, data?: any) => void;
   t: any;
}

export default function Profile({ onNavigate, t }: ProfileProps) {
   const { user } = useAuth();
   const [profile, setProfile] = useState<User | null>(null);
   const [myItineraries, setMyItineraries] = useState<Itinerary[]>([]);
   const [savedItineraries, setSavedItineraries] = useState<Itinerary[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<'published' | 'private' | 'favorites'>('published');
   const [isEditing, setIsEditing] = useState(false);
   const [editForm, setEditForm] = useState({ full_name: '', username: '', bio: '', avatar_url: '', banner_url: '' });
   const [saving, setSaving] = useState(false);

   useEffect(() => {
      if (user) {
         fetchProfileData();
      }
   }, [user]);

   const fetchProfileData = async () => {
      try {
         setLoading(true);
         if (!user) return;

         // 1. Fetch Profile
         const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

         if (profileError && profileError.code !== 'PGRST116') {
            console.error('Error fetching profile:', profileError);
         }

         // 2. Fetch User's Itineraries
         const { data: itinerariesData, error: itinerariesError } = await supabase
            .from('itineraries')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

         if (itinerariesError) console.error('Error fetching itineraries:', itinerariesError);

         // 3. Fetch Saved Itineraries
         const { data: savedData, error: savedError } = await supabase
            .from('itinerary_saves')
            .select('itinerary_id, itineraries(*)')
            .eq('user_id', user.id);

         if (savedError) console.error('Error fetching saved itineraries:', savedError);

         // Process Data
         const itineraries: Itinerary[] = (itinerariesData || []).map((item: any) => ({
            ...item.content,
            id: item.id,
            userId: item.user_id,
            title: item.title,
            location: item.destination,
            startDate: item.start_date,
            endDate: item.end_date,
            isPublic: item.is_public,
            likes: item.likes,
         }));

         const saved: Itinerary[] = (savedData || []).map((item: any) => ({
            ...item.itineraries.content,
            id: item.itineraries.id,
            userId: item.itineraries.user_id,
            title: item.itineraries.title,
            location: item.itineraries.destination,
            startDate: item.itineraries.start_date,
            endDate: item.itineraries.end_date,
            isPublic: item.itineraries.is_public,
            likes: item.itineraries.likes,
         }));

         const totalLikes = itineraries.reduce((sum, item) => sum + (item.likes || 0), 0);

         const userProfile: User = {
            id: user.id,
            name: profileData?.full_name || user.email?.split('@')[0] || t.default_name_traveler || 'Traveler',
            email: user.email || '',
            username: profileData?.username || '',
            bio: profileData?.bio || '',
            avatar: profileData?.avatar_url || user.user_metadata?.avatar_url,
            banner: profileData?.banner_url,
            joinedAt: user.created_at,
            stats: {
               trips: itineraries.length,
               likes: totalLikes,
               fans: 0 // Placeholder
            }
         };

         setProfile(userProfile);
         setMyItineraries(itineraries);
         setSavedItineraries(saved);
         setEditForm({
            full_name: userProfile.name,
            username: userProfile.username || '',
            bio: userProfile.bio || '',
            avatar_url: userProfile.avatar || '',
            banner_url: userProfile.banner || ''
         });

      } catch (error) {
         console.error('Error loading profile data:', error);
      } finally {
         setLoading(false);
      }
   };

   // Extract filename from Supabase storage URL
   const getFilenameFromUrl = (url: string): string | null => {
      try {
         const urlObj = new URL(url);
         const parts = urlObj.pathname.split('/');
         return parts[parts.length - 1];
      } catch {
         return null;
      }
   };

   const uploadImage = async (file: File, oldUrl?: string) => {
      try {
         // Delete old image if exists
         if (oldUrl && oldUrl.includes('supabase')) {
            const oldFilename = getFilenameFromUrl(oldUrl);
            if (oldFilename) {
               await supabase.storage.from('avatars').remove([oldFilename]);
            }
         }

         const fileExt = file.name.split('.').pop();
         const fileName = `${user?.id}-${Date.now()}.${fileExt}`; // Use timestamp for uniqueness

         const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, file);

         if (uploadError) throw uploadError;

         const { data } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);

         return data.publicUrl;
      } catch (error) {
         console.error('Error uploading image:', error);
         throw error;
      }
   };

   const handleUpdateProfile = async () => {
      try {
         if (!user) return;
         setSaving(true);

         const username = editForm.username.trim();
         if (username && !/^[A-Za-z0-9_]{3,30}$/.test(username)) {
            alert(t.username_invalid || 'Username must be 3–30 characters: letters, numbers, and underscores.');
            return;
         }

         const updates = {
            id: user.id,
            full_name: editForm.full_name,
            username: username || null,
            bio: editForm.bio,
            avatar_url: editForm.avatar_url,
            banner_url: editForm.banner_url || null,
         };

         const { error } = await supabase.from('profiles').upsert(updates);

         if (error) {
            if (error.code === '23505') {
               alert(t.username_taken || 'That username is already taken.');
               return;
            }
            if (error.code === '23514') {
               alert(t.username_invalid || 'Username must be 3–30 characters: letters, numbers, and underscores.');
               return;
            }
            throw error;
         }

         setIsEditing(false);
         fetchProfileData(); // Refresh data
      } catch (error) {
         console.error('Error updating profile:', error);
         alert(t.update_profile_error || 'Failed to update profile');
      } finally {
         setSaving(false);
      }
   };

   if (loading) {
      return (
         <div className="flex justify-center items-center py-20">
            <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
         </div>
      );
   }

   if (!profile) return null;

   const publishedTrips = myItineraries.filter(i => i.isPublic);
   const draftTrips = myItineraries.filter(i => !i.isPublic);

   const displayedTrips = activeTab === 'published' ? publishedTrips
      : activeTab === 'private' ? draftTrips
         : savedItineraries;

   return (
      <div className="flex justify-center py-8 px-4 md:px-10">
         <div className="flex flex-col max-w-6xl w-full gap-8">
            <div className="flex flex-col lg:flex-row gap-8 items-start">

               {/* Profile Sidebar */}
               <aside className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6">
                  <div className="bg-white dark:bg-[#1e2126] rounded-2xl flex flex-col items-center text-center shadow-sm border border-gray-100 dark:border-[#2a2e35] relative overflow-hidden">

                     {!isEditing ? (
                        <>
                           <div className="h-32 w-full bg-slate-200 dark:bg-slate-700 absolute top-0 left-0">
                              {profile.banner && (
                                 <img src={profile.banner} alt="Banner" className="w-full h-full object-cover" />
                              )}
                           </div>

                           <div className="w-full px-8 pb-8 pt-16 relative z-10 flex flex-col items-center">
                              <div className="relative mb-4 group">
                                 <div className="size-32 rounded-full border-4 border-white dark:border-[#2a2e35] shadow-lg overflow-hidden bg-gray-100 flex items-center justify-center bg-white dark:bg-[#1e2126]">
                                    {profile.avatar ? (
                                       <img src={profile.avatar} alt="Profile" className="w-full h-full object-cover" />
                                    ) : (
                                       <span className="text-4xl font-bold text-gray-400">{profile.name.charAt(0).toUpperCase()}</span>
                                    )}
                                 </div>
                              </div>
                              <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{profile.name}</h1>
                              <p className="text-slate-500 dark:text-gray-400 text-sm font-medium mb-4">{profile.username ? `@${profile.username}` : ''}</p>
                              <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed mb-6 whitespace-pre-wrap">
                                 {profile.bio || t.no_bio || "No bio yet."}
                              </p>
                              <button
                                 onClick={() => setIsEditing(true)}
                                 className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-hover text-white font-bold py-2.5 px-4 rounded-xl transition-colors"
                              >
                                 <span className="material-symbols-outlined text-[18px]">edit</span>
                                 <span>{t.edit_profile}</span>
                              </button>
                           </div>
                        </>
                     ) : (
                        <div className="w-full space-y-4 p-8">
                           <div>
                              <label className="block text-left text-xs font-bold text-slate-500 mb-1">{t.display_name}</label>
                              <input
                                 type="text"
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                 value={editForm.full_name}
                                 onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                              />
                           </div>
                           <div>
                              <label className="block text-left text-xs font-bold text-slate-500 mb-1">{t.username}</label>
                              <input
                                 type="text"
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                 value={editForm.username}
                                 maxLength={30}
                                 autoCapitalize="none"
                                 spellCheck={false}
                                 placeholder={t.username_placeholder || 'traveler_jane'}
                                 onChange={e => setEditForm({ ...editForm, username: e.target.value })}
                              />
                           </div>
                           <div>
                              <label className="block text-left text-xs font-bold text-slate-500 mb-1">{t.bio}</label>
                              <textarea
                                 className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm"
                                 rows={3}
                                 value={editForm.bio}
                                 onChange={e => setEditForm({ ...editForm, bio: e.target.value })}
                              />
                           </div>
                           <div>
                              <label className="block text-left text-xs font-bold text-slate-500 mb-1">{t.avatar_url}</label>
                              <div className="flex gap-2 items-center">
                                 <div className="size-10 rounded-full bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200">
                                    {editForm.avatar_url ? (
                                       <img src={editForm.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                       <span className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                                          {editForm.full_name?.charAt(0) || '?'}
                                       </span>
                                    )}
                                 </div>
                                 <input
                                    type="file"
                                    accept="image/*"
                                    className="block w-full text-xs text-slate-500
                                       file:mr-4 file:py-2 file:px-4
                                       file:rounded-full file:border-0
                                       file:text-xs file:font-bold
                                       file:bg-primary/10 file:text-primary
                                       hover:file:bg-primary/20
                                    "
                                    onChange={async (e) => {
                                       if (!e.target.files || e.target.files.length === 0) return;
                                       try {
                                          setSaving(true);
                                          const url = await uploadImage(e.target.files[0], editForm.avatar_url);
                                          setEditForm({ ...editForm, avatar_url: url });
                                       } catch (error) {
                                          alert(t.upload_image_error || 'Error uploading image');
                                       } finally {
                                          setSaving(false);
                                       }
                                    }}
                                 />
                              </div>
                           </div>
                           <div>
                              <label className="block text-left text-xs font-bold text-slate-500 mb-1">{t.banner_url}</label>
                              {editForm.banner_url ? (
                                 <img src={editForm.banner_url} alt="" className="mb-2 h-16 w-full rounded-lg object-cover" />
                              ) : null}
                              <input
                                 type="file"
                                 accept="image/*"
                                 className="block w-full text-xs text-slate-500
                                    file:mr-4 file:py-2 file:px-4
                                    file:rounded-full file:border-0
                                    file:text-xs file:font-bold
                                    file:bg-primary/10 file:text-primary
                                    hover:file:bg-primary/20
                                 "
                                 onChange={async (e) => {
                                    if (!e.target.files || e.target.files.length === 0) return;
                                    try {
                                       setSaving(true);
                                       const url = await uploadImage(e.target.files[0], editForm.banner_url);
                                       setEditForm({ ...editForm, banner_url: url });
                                    } catch (error) {
                                       alert(t.upload_image_error || 'Error uploading image');
                                    } finally {
                                       setSaving(false);
                                    }
                                 }}
                              />
                           </div>
                           <div className="flex gap-2 pt-2">
                              <button
                                 onClick={() => setIsEditing(false)}
                                 disabled={saving}
                                 className="flex-1 bg-slate-100 dark:bg-white/10 hover:bg-slate-200 dark:hover:bg-white/20 text-slate-600 dark:text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                 {t.cancel}
                              </button>
                              <button
                                 onClick={handleUpdateProfile}
                                 disabled={saving}
                                 className="flex-1 bg-primary hover:bg-primary-hover text-white font-bold py-2 rounded-lg text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
                              >
                                 {saving ? (
                                    <>
                                       <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                                       <span>{t.save}...</span>
                                    </>
                                 ) : (
                                    t.save
                                 )}
                              </button>
                           </div>
                        </div>
                     )}
                  </div>

                  <div className="bg-white dark:bg-[#1e2126] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-[#2a2e35]">
                     <h3 className="text-slate-900 dark:text-white font-bold mb-4 px-1">{t.community_stats}</h3>
                     <div className="grid grid-cols-2 gap-3">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-[#2a2e35]/50">
                           <span className="text-xl font-bold text-slate-900 dark:text-white">{profile.stats?.trips || 0}</span>
                           <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 mt-1">{t.trips}</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 dark:bg-[#2a2e35]/50">
                           <span className="text-xl font-bold text-slate-900 dark:text-white">{profile.stats?.likes || 0}</span>
                           <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 dark:text-gray-500 mt-1">{t.like}</span>
                        </div>
                     </div>
                     {profile.joinedAt && (
                        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-[#2a2e35] flex items-center justify-center gap-2 text-slate-500 dark:text-gray-400 text-sm">
                           <span className="material-symbols-outlined text-[16px]">calendar_month</span>
                           <span>{t.joined} {new Date(profile.joinedAt).toLocaleDateString()}</span>
                        </div>
                     )}
                  </div>
               </aside>

               {/* Main Content */}
               <main className="flex-1 w-full min-w-0">
                  <div className="flex border-b border-gray-200 dark:border-[#2a2e35] mb-6 overflow-x-auto no-scrollbar">
                     <button
                        onClick={() => setActiveTab('published')}
                        className={`px-6 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'published' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                     >
                        {t.published} <span className="ml-1 text-xs bg-slate-100 dark:bg-[#2a2e35] px-1.5 py-0.5 rounded-full text-slate-500">{publishedTrips.length}</span>
                     </button>
                     <button
                        onClick={() => setActiveTab('private')}
                        className={`px-6 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'private' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                     >
                        {t.private} <span className="ml-1 text-xs bg-slate-100 dark:bg-[#2a2e35] px-1.5 py-0.5 rounded-full text-slate-500">{draftTrips.length}</span>
                     </button>
                     <button
                        onClick={() => setActiveTab('favorites')}
                        className={`px-6 py-3 border-b-2 font-bold text-sm whitespace-nowrap transition-colors ${activeTab === 'favorites' ? 'border-primary text-primary' : 'border-transparent text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'}`}
                     >
                        {t.favorites} <span className="ml-1 text-xs bg-slate-100 dark:bg-[#2a2e35] px-1.5 py-0.5 rounded-full text-slate-500">{savedItineraries.length}</span>
                     </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {displayedTrips.length > 0 ? (
                        displayedTrips.map((itinerary) => (
                           <div
                              key={itinerary.id}
                              onClick={() => onNavigate('itinerary', itinerary)}
                              className="group bg-white dark:bg-[#1e2126] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 dark:border-[#2a2e35] cursor-pointer"
                           >
                              <div className="relative h-48 overflow-hidden bg-gray-200">
                                 <div className="absolute top-3 left-3 z-10 flex gap-2">
                                    {itinerary.generated && (
                                       <span className="bg-black/60 backdrop-blur-sm text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                                          {t.ai_generated}
                                       </span>
                                    )}
                                 </div>
                                 {itinerary.coverImage ? (
                                    <img
                                       src={itinerary.coverImage}
                                       alt={itinerary.title}
                                       className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                 ) : (
                                    <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100 dark:bg-[#2a2e35] dark:text-slate-600">
                                       <span className="material-symbols-outlined text-4xl">image</span>
                                    </div>
                                 )}
                              </div>
                              <div className="p-5">
                                 <div className="flex justify-between items-start mb-2">
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1 group-hover:text-primary transition-colors">{itinerary.title}</h3>
                                    <div className="flex items-center gap-1 text-slate-400 dark:text-gray-500 text-xs font-medium">
                                       <span className="material-symbols-outlined text-[16px]">thumb_up</span>
                                       <span>{itinerary.likes || 0}</span>
                                    </div>
                                 </div>
                                 <div className="flex flex-wrap gap-2 mb-4">
                                    {itinerary.tags?.slice(0, 2).map(tag => (
                                       <span key={tag} className="px-2 py-1 bg-gray-100 dark:bg-[#2a2e35] text-slate-500 dark:text-gray-400 text-xs rounded font-bold">{tag}</span>
                                    ))}
                                 </div>
                                 <div className="flex items-center justify-between border-t border-gray-100 dark:border-[#2a2e35] pt-3 mt-2">
                                    <div className="flex items-center gap-3 text-xs font-medium text-slate-500 dark:text-gray-400">
                                       <div className="flex items-center gap-1">
                                          <span className="material-symbols-outlined text-[16px] text-primary">calendar_month</span>
                                          {itinerary.days?.length || 0} {t.days}
                                       </div>
                                    </div>
                                    <button className="text-primary text-xs font-bold hover:underline">{t.view_details}</button>
                                 </div>
                              </div>
                           </div>
                        ))
                     ) : (
                        <div className="col-span-1 md:col-span-2 py-16 text-center">
                           <div className="relative inline-block mb-6">
                              <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl scale-150" />
                              <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-full">
                                 <span className="material-symbols-outlined text-5xl text-primary">
                                    {activeTab === 'published' ? 'public' : activeTab === 'private' ? 'lock' : 'bookmark'}
                                 </span>
                              </div>
                           </div>
                           <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                              {activeTab === 'published' ? t.empty_published_title : activeTab === 'private' ? t.empty_private_title : t.empty_favorites_title}
                           </h3>
                           <p className="text-slate-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                              {activeTab === 'published' ? t.empty_published_desc : activeTab === 'private' ? t.empty_private_desc : t.empty_favorites_desc}
                           </p>
                           <button
                              onClick={() => onNavigate(activeTab === 'favorites' ? 'explore' : 'home')}
                              className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 inline-flex items-center gap-2"
                           >
                              <span className="material-symbols-outlined text-[18px]">
                                 {activeTab === 'favorites' ? 'explore' : 'add'}
                              </span>
                              {activeTab === 'favorites' ? t.explore_now : t.create_trip}
                           </button>
                        </div>
                     )}
                  </div>
               </main>
            </div >
         </div >
      </div >
   );
}

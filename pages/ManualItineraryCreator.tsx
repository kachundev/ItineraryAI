import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Itinerary, DayPlan, Activity } from '../types';
import { useToast } from '../components/Toast';

// Preset cover images for quick selection
const PRESET_COVER_IMAGES = [
    { url: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop', label: 'Road Trip' },
    { url: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?q=80&w=2070&auto=format&fit=crop', label: 'Beach' },
    { url: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?q=80&w=2020&auto=format&fit=crop', label: 'City' },
    { url: 'https://images.unsplash.com/photo-1454391304352-2bf4678b1a7a?q=80&w=2074&auto=format&fit=crop', label: 'Mountain' },
    { url: 'https://images.unsplash.com/photo-1528164344705-47542687000d?q=80&w=2069&auto=format&fit=crop', label: 'Culture' },
    { url: 'https://images.unsplash.com/photo-1504150558240-0b4fd8946624?q=80&w=2064&auto=format&fit=crop', label: 'Adventure' },
];

// DayCard component for expandable day with activities
interface DayCardProps {
    day: DayPlan;
    dayIndex: number;
    onUpdateDay: (day: DayPlan) => void;
    t: any;
}

function DayCard({ day, dayIndex, onUpdateDay, t }: DayCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [newActivity, setNewActivity] = useState<Partial<Activity>>({
        time: '09:00',
        title: '',
        description: '',
        type: 'sightseeing',
        location: '',
        duration: '60', // Default 60 minutes
    });

    const handleAddActivity = () => {
        if (!newActivity.title) return;

        const activity: Activity = {
            time: newActivity.time || '09:00',
            title: newActivity.title,
            description: newActivity.description || '',
            type: newActivity.type || 'sightseeing',
            location: newActivity.location,
            duration: newActivity.duration || '60',
        };

        onUpdateDay({
            ...day,
            activities: [...day.activities, activity]
        });

        // Reset form
        setNewActivity({
            time: '09:00',
            title: '',
            description: '',
            type: 'sightseeing',
            location: '',
            duration: '60',
        });
    };

    // Calculate total duration for the day
    const totalMinutes = day.activities.reduce((sum, act) => {
        return sum + (parseInt(act.duration || '60') || 60);
    }, 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;

    const handleRemoveActivity = (index: number) => {
        onUpdateDay({
            ...day,
            activities: day.activities.filter((_, i) => i !== index)
        });
    };

    // Drag and drop state
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        // Reorder activities
        const newActivities = [...day.activities];
        const draggedItem = newActivities[draggedIndex];
        newActivities.splice(draggedIndex, 1);
        newActivities.splice(index, 0, draggedItem);

        onUpdateDay({ ...day, activities: newActivities });
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    return (
        <div className="border border-gray-200 dark:border-[#2a2e35] rounded-xl overflow-hidden bg-white dark:bg-[#1e2126]">
            {/* Day Header - Clickable */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252830] transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className="size-10 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center">
                        {day.day}
                    </div>
                    <div className="text-left">
                        <p className="font-bold text-slate-900 dark:text-white">{formatDate(day.date)}</p>
                        <p className="text-xs text-slate-500 dark:text-gray-400 flex items-center gap-2">
                            <span>{day.activities.length} {day.activities.length === 1 ? 'activity' : 'activities'}</span>
                            {day.activities.length > 0 && (
                                <span className="flex items-center gap-0.5 text-primary">
                                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                                    {totalHours > 0 ? `${totalHours}h ` : ''}{remainingMins > 0 ? `${remainingMins}m` : ''}
                                </span>
                            )}
                        </p>
                    </div>
                </div>
                <span className={`material-symbols-outlined text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                </span>
            </button>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="border-t border-gray-100 dark:border-[#2a2e35] p-4 space-y-4">
                    {/* Existing Activities */}
                    {day.activities.length > 0 && (
                        <div className="space-y-2">
                            {day.activities.map((activity, idx) => (
                                <div
                                    key={idx}
                                    draggable
                                    onDragStart={() => handleDragStart(idx)}
                                    onDragOver={(e) => handleDragOver(e, idx)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#252830] rounded-lg group cursor-grab active:cursor-grabbing transition-all ${draggedIndex === idx ? 'opacity-50 scale-95' : ''
                                        }`}
                                >
                                    <span className="material-symbols-outlined text-slate-400 dark:text-gray-500 text-lg cursor-grab">drag_indicator</span>
                                    <span className="text-xs font-mono text-primary font-bold w-12">{activity.time}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium text-slate-900 dark:text-white truncate">{activity.title}</p>
                                        {activity.location && (
                                            <p className="text-xs text-slate-500 dark:text-gray-400 truncate flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[12px]">location_on</span>
                                                {activity.location}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleRemoveActivity(idx)}
                                        className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full p-1 transition-all"
                                    >
                                        <span className="material-symbols-outlined text-lg">close</span>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add Activity Form */}
                    <div className="bg-gray-50 dark:bg-[#252830] rounded-lg p-3 space-y-3">
                        {/* Activity Templates */}
                        <div>
                            <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-2">Quick Add</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { icon: 'restaurant', label: 'Restaurant', type: 'meal', title: 'Meal' },
                                    { icon: 'photo_camera', label: 'Attraction', type: 'sightseeing', title: 'Visit' },
                                    { icon: 'directions_car', label: 'Transport', type: 'transport', title: 'Transport' },
                                    { icon: 'hotel', label: 'Hotel', type: 'accommodation', title: 'Check-in' },
                                ].map((template) => (
                                    <button
                                        key={template.type}
                                        onClick={() => setNewActivity({ ...newActivity, type: template.type, title: template.title })}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${newActivity.type === template.type
                                            ? 'bg-primary text-white'
                                            : 'bg-white dark:bg-[#1e2126] text-slate-600 dark:text-gray-300 hover:bg-primary/10 border border-gray-200 dark:border-[#3a3e45]'
                                            }`}
                                    >
                                        <span className="material-symbols-outlined text-sm">{template.icon}</span>
                                        {template.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide">Add Activity</p>
                        <div className="grid grid-cols-[100px_1fr] gap-2">
                            <input
                                type="time"
                                value={newActivity.time}
                                onChange={(e) => setNewActivity({ ...newActivity, time: e.target.value })}
                                className="px-2 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                            />
                            <input
                                type="text"
                                value={newActivity.title}
                                onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                                placeholder="Activity name *"
                                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                            />
                        </div>
                        <input
                            type="text"
                            value={newActivity.location || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                            placeholder="Location (optional)"
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">schedule</span>
                            <select
                                value={newActivity.duration || '60'}
                                onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                            >
                                <option value="15">15 min</option>
                                <option value="30">30 min</option>
                                <option value="45">45 min</option>
                                <option value="60">1 hour</option>
                                <option value="90">1.5 hours</option>
                                <option value="120">2 hours</option>
                                <option value="180">3 hours</option>
                                <option value="240">4 hours</option>
                                <option value="300">5 hours</option>
                            </select>
                        </div>
                        <textarea
                            value={newActivity.description}
                            onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                            placeholder="Notes (optional)"
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white resize-none"
                        />
                        <button
                            onClick={handleAddActivity}
                            disabled={!newActivity.title}
                            className="w-full py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            Add Activity
                        </button>
                    </div>
                </div>
            )
            }
        </div >
    );
}

interface ManualItineraryCreatorProps {
    onNavigate: (view: any, data?: any) => void;
    t: any;
}

export default function ManualItineraryCreator({ onNavigate, t }: ManualItineraryCreatorProps) {
    const { user } = useAuth();
    const { showToast } = useToast();
    const [step, setStep] = useState(1); // 1: Basic Info, 2: Days & Activities
    const [isLoading, setIsLoading] = useState(false);

    // Basic Info State
    const [basicInfo, setBasicInfo] = useState({
        title: '',
        destination: '',
        startDate: '',
        endDate: '',
        description: '',
        budget: '$',
        coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?q=80&w=2021&auto=format&fit=crop',
    });

    // Days State
    const [days, setDays] = useState<DayPlan[]>([]);

    // Auto-save draft key
    const DRAFT_KEY = 'itinerary_draft';

    // Load draft from localStorage on mount
    useEffect(() => {
        const savedDraft = localStorage.getItem(DRAFT_KEY);
        if (savedDraft) {
            try {
                const draft = JSON.parse(savedDraft);
                if (draft.basicInfo) setBasicInfo(draft.basicInfo);
                if (draft.days) setDays(draft.days);
                if (draft.step) setStep(draft.step);
                showToast('info', 'Draft restored from previous session');
            } catch (e) {
                console.error('Failed to restore draft:', e);
            }
        }
    }, []);

    // Auto-save to localStorage when data changes
    useEffect(() => {
        if (basicInfo.title || basicInfo.destination || days.length > 0) {
            const draft = { basicInfo, days, step };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [basicInfo, days, step]);

    const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        // Date validation: ensure endDate >= startDate
        if (name === 'endDate' && basicInfo.startDate && value) {
            if (new Date(value) < new Date(basicInfo.startDate)) {
                showToast('error', t.end_date_before_start || 'End date cannot be before start date');
                return;
            }
        }
        if (name === 'startDate' && basicInfo.endDate && value) {
            if (new Date(basicInfo.endDate) < new Date(value)) {
                showToast('error', t.start_date_after_end || 'Start date cannot be after end date');
                return;
            }
        }

        setBasicInfo(prev => ({ ...prev, [name]: value }));
    };

    const calculateDays = () => {
        if (!basicInfo.startDate || !basicInfo.endDate) return;

        const start = new Date(basicInfo.startDate);
        const end = new Date(basicInfo.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        const newDays: DayPlan[] = [];
        for (let i = 0; i < diffDays; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);
            newDays.push({
                day: i + 1,
                date: currentDate.toISOString().split('T')[0],
                title: `Day ${i + 1} in ${basicInfo.destination}`,
                activities: []
            });
        }
        setDays(newDays);
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (!basicInfo.title || !basicInfo.destination || !basicInfo.startDate || !basicInfo.endDate) {
                showToast('warning', t.fill_all_fields || 'Please fill in all required fields');
                return;
            }
            // Final date validation before proceeding
            if (new Date(basicInfo.endDate) < new Date(basicInfo.startDate)) {
                showToast('error', t.end_date_before_start || 'End date cannot be before start date');
                return;
            }
            calculateDays();
            setStep(2);
        }
    };

    const handleSaveItinerary = async () => {
        if (!user) {
            showToast('warning', t.login_to_save || 'Please log in to save your itinerary');
            return;
        }

        try {
            setIsLoading(true);
            const itineraryData: Partial<Itinerary> = {
                title: basicInfo.title,
                location: basicInfo.destination,
                startDate: basicInfo.startDate,
                endDate: basicInfo.endDate,
                description: basicInfo.description,
                budget: basicInfo.budget,
                coverImage: basicInfo.coverImage,
                days: days,
                generated: false,
                // Assuming default privacy is private for now
                isPublic: false
            };

            // We use the 'content' jsonb column to store the full itinerary details including days, activities etc.
            const content = {
                generated: false,
                days: days,
                tags: [], // Could add tags later
                budget: basicInfo.budget,
                rating: 0,
                coverImage: basicInfo.coverImage,
                description: basicInfo.description
            };

            const { data, error } = await supabase
                .from('itineraries')
                .insert({
                    user_id: user.id,
                    title: basicInfo.title,
                    destination: basicInfo.destination,
                    start_date: basicInfo.startDate,
                    end_date: basicInfo.endDate,
                    content: content,
                    is_public: false
                })
                .select()
                .single();

            if (error) throw error;

            // Clear draft after successful save
            localStorage.removeItem(DRAFT_KEY);

            showToast('success', t.saved_success || 'Itinerary saved successfully!');
            // Navigate to the new itinerary details
            // We need to construct the full Itinerary object to pass to onNavigate
            const newItinerary: Itinerary = {
                id: data.id,
                userId: user.id,
                ...itineraryData,
                ...content,
                author: {
                    name: user.user_metadata?.full_name || user.email || 'Me',
                    avatar: user.user_metadata?.avatar_url || ''
                }
            } as Itinerary;

            onNavigate('itinerary', newItinerary);

        } catch (error) {
            console.error('Error saving itinerary:', error);
            showToast('error', t.save_error || 'Failed to save itinerary');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background-light dark:bg-background-dark py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl mx-auto">
                <div className="bg-white dark:bg-card-dark rounded-2xl shadow-xl overflow-hidden border border-gray-100 dark:border-[#2a2e35]">
                    <div className="bg-primary p-6 text-center">
                        <h2 className="text-2xl font-bold text-white mb-2">{t.create_new_trip}</h2>
                        <div className="flex items-center justify-center gap-2 text-white/80 text-sm">
                            <span className={`flex items-center justify-center size-6 rounded-full border border-white/40 ${step >= 1 ? 'bg-white text-primary font-bold' : ''}`}>1</span>
                            <span>Basic Info</span>
                            <span className="w-8 h-px bg-white/40"></span>
                            <span className={`flex items-center justify-center size-6 rounded-full border border-white/40 ${step >= 2 ? 'bg-white text-primary font-bold' : ''}`}>2</span>
                            <span>Itinerary</span>
                        </div>
                    </div>

                    <div className="p-8">
                        {step === 1 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                        {t.trip_title}
                                    </label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={basicInfo.title}
                                        onChange={handleBasicInfoChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="e.g. Summer in Tokyo"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                        {t.destination_label}
                                    </label>
                                    <input
                                        type="text"
                                        name="destination"
                                        value={basicInfo.destination}
                                        onChange={handleBasicInfoChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        placeholder="e.g. Tokyo, Japan"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                            {t.start_date}
                                        </label>
                                        <input
                                            type="date"
                                            name="startDate"
                                            value={basicInfo.startDate}
                                            min={new Date().toISOString().split('T')[0]}
                                            max={basicInfo.endDate || undefined}
                                            onChange={handleBasicInfoChange}
                                            style={{ colorScheme: 'dark' }}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                            {t.end_date}
                                        </label>
                                        <input
                                            type="date"
                                            name="endDate"
                                            value={basicInfo.endDate}
                                            min={basicInfo.startDate || undefined}
                                            onChange={handleBasicInfoChange}
                                            style={{ colorScheme: 'dark' }}
                                            className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                        {t.trip_description}
                                    </label>
                                    <textarea
                                        name="description"
                                        value={basicInfo.description}
                                        onChange={handleBasicInfoChange}
                                        rows={4}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                                        placeholder="Describe your trip..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                        {t.budget}
                                    </label>
                                    <select
                                        name="budget"
                                        value={basicInfo.budget}
                                        onChange={handleBasicInfoChange}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                    >
                                        <option value="$">Low ($)</option>
                                        <option value="$$">Medium ($$)</option>
                                        <option value="$$$">High ($$$)</option>
                                        <option value="$$$$">Luxury ($$$$)</option>
                                    </select>
                                </div>

                                {/* Cover Image Picker */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                        Cover Image
                                    </label>

                                    {/* Current preview */}
                                    <div className="relative mb-4 rounded-xl overflow-hidden h-40 bg-gray-100 dark:bg-[#1e2126]">
                                        <img
                                            src={basicInfo.coverImage}
                                            alt="Cover preview"
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = PRESET_COVER_IMAGES[0].url;
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                        <span className="absolute bottom-3 left-3 text-white text-sm font-medium flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[18px]">image</span>
                                            Preview
                                        </span>
                                    </div>

                                    {/* Preset images grid */}
                                    <p className="text-xs text-slate-500 dark:text-gray-400 mb-2">Choose a preset:</p>
                                    <div className="grid grid-cols-3 gap-2 mb-3">
                                        {PRESET_COVER_IMAGES.map((img, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => setBasicInfo(prev => ({ ...prev, coverImage: img.url }))}
                                                className={`relative h-16 rounded-lg overflow-hidden transition-all ${basicInfo.coverImage === img.url
                                                    ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-card-dark'
                                                    : 'hover:opacity-80'
                                                    }`}
                                            >
                                                <img src={img.url} alt={img.label} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                                    <span className="text-white text-xs font-medium">{img.label}</span>
                                                </div>
                                                {basicInfo.coverImage === img.url && (
                                                    <div className="absolute top-1 right-1 bg-primary rounded-full p-0.5">
                                                        <span className="material-symbols-outlined text-white text-[14px]">check</span>
                                                    </div>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Custom URL input */}
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="text"
                                            name="coverImage"
                                            value={basicInfo.coverImage}
                                            onChange={handleBasicInfoChange}
                                            placeholder="Or paste a custom image URL..."
                                            className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#1e2126] text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end gap-3">
                                    <button
                                        onClick={() => onNavigate('home')}
                                        className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2e35] transition-colors"
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        onClick={handleNextStep}
                                        className="px-6 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors shadow-lg shadow-primary/20"
                                    >
                                        Next Step
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6 animate-fadeIn">
                                <div className="text-center">
                                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {basicInfo.title}
                                    </h3>
                                    <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                                        {basicInfo.startDate} - {basicInfo.endDate} • {days.length} Days
                                    </p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                    <span className="material-symbols-outlined text-lg">tips_and_updates</span>
                                    Click on each day to expand and add activities!
                                </div>

                                {/* Preview Card */}
                                <div className="bg-gray-50 dark:bg-[#252830] rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        Preview
                                    </p>
                                    <div className="relative rounded-xl overflow-hidden bg-white dark:bg-[#1e2126] shadow-md">
                                        <div className="h-32 relative">
                                            <img
                                                src={basicInfo.coverImage}
                                                alt="Cover"
                                                className="w-full h-full object-cover"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = PRESET_COVER_IMAGES[0].url;
                                                }}
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <h4 className="text-white font-bold text-lg truncate">{basicInfo.title || 'Untitled Trip'}</h4>
                                                <p className="text-white/80 text-xs flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                    {basicInfo.destination || 'Destination'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="p-3 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-3 text-slate-600 dark:text-gray-400">
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">calendar_today</span>
                                                    {days.length} days
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">list</span>
                                                    {days.reduce((sum, d) => sum + d.activities.length, 0)} activities
                                                </span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                                                {basicInfo.budget}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Expandable Day Cards */}
                                <div className="space-y-3">
                                    {days.map((day, dayIndex) => (
                                        <DayCard
                                            key={day.day}
                                            day={day}
                                            dayIndex={dayIndex}
                                            onUpdateDay={(updatedDay) => {
                                                setDays(prev => prev.map((d, i) => i === dayIndex ? updatedDay : d));
                                            }}
                                            t={t}
                                        />
                                    ))}
                                </div>

                                <div className="pt-4 flex justify-between gap-3 border-t border-gray-100 dark:border-[#2a2e35]">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="px-6 py-3 rounded-xl font-bold text-slate-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2e35] transition-colors"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={handleSaveItinerary}
                                        disabled={isLoading}
                                        className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">save</span>
                                                Save Itinerary
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Itinerary, DayPlan, Activity } from '../types';
import { useToast } from '../components/Toast';
import CustomDatePicker from '../components/CustomDatePicker';


// DayCard component for expandable day with activities
interface DayCardProps {
    day: DayPlan;
    dayIndex: number;
    onUpdateDay: (day: DayPlan) => void;
    t: any;
}

const DayCard: React.FC<DayCardProps> = ({ day, dayIndex, onUpdateDay, t }) => {
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
                            <span>{day.activities.length} {t.activity}</span>
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
                            <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide mb-2">{t.quick_add}</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { icon: 'restaurant', label: t.restaurant, type: 'meal', title: t.template_breakfast },
                                    { icon: 'photo_camera', label: t.attraction, type: 'sightseeing', title: t.template_sightseeing },
                                    { icon: 'directions_car', label: t.template_transport, type: 'transport', title: t.template_transport },
                                    { icon: 'hotel', label: t.hotel, type: 'accommodation', title: t.template_hotel },
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

                        <p className="text-xs font-bold text-slate-600 dark:text-gray-400 uppercase tracking-wide">{t.add_activity}</p>
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
                                placeholder={t.activity_name}
                                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                            />
                        </div>
                        <input
                            type="text"
                            value={newActivity.location || ''}
                            onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                            placeholder={t.location_optional}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                        />
                        <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-slate-400 text-lg">schedule</span>
                            <select
                                value={newActivity.duration || '60'}
                                onChange={(e) => setNewActivity({ ...newActivity, duration: e.target.value })}
                                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white"
                            >
                                <option value="15">{t.min_15}</option>
                                <option value="30">{t.min_30}</option>
                                <option value="45">{t.min_45}</option>
                                <option value="60">{t.hour_1}</option>
                                <option value="90">{t.hour_1_5}</option>
                                <option value="120">{t.hour_2}</option>
                                <option value="180">{t.hour_3}</option>
                                <option value="240">{t.hour_4}</option>
                                <option value="300">{t.hour_5}</option>
                            </select>
                        </div>
                        <textarea
                            value={newActivity.description}
                            onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                            placeholder={t.notes_optional}
                            rows={2}
                            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-[#3a3e45] bg-white dark:bg-[#1e2126] text-slate-900 dark:text-white resize-none"
                        />
                        <button
                            onClick={handleAddActivity}
                            disabled={!newActivity.title}
                            className="w-full py-2 rounded-lg bg-primary hover:bg-primary-hover disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white font-bold text-sm transition-colors flex items-center justify-center gap-2"
                        >
                            <span className="material-symbols-outlined text-lg">add</span>
                            {t.add_activity}
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
        description: '',
        budget: '$',
        coverImage: '',
    });
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [endDate, setEndDate] = useState<Date | null>(null);

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
                if (draft.startDate) setStartDate(new Date(draft.startDate));
                if (draft.endDate) setEndDate(new Date(draft.endDate));
                if (draft.days) setDays(draft.days);
                if (draft.step) setStep(draft.step);
                showToast('info', t.draft_restored_message || 'Draft restored from previous session');
            } catch (e) {
                console.error('Failed to restore draft:', e);
            }
        }
    }, []);

    // Auto-save to localStorage when data changes
    useEffect(() => {
        if (basicInfo.title || basicInfo.destination || days.length > 0) {
            const draft = {
                basicInfo,
                startDate: startDate?.toISOString(),
                endDate: endDate?.toISOString(),
                days,
                step
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [basicInfo, startDate, endDate, days, step]);

    const handleBasicInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setBasicInfo(prev => ({ ...prev, [name]: value }));
    };

    const calculateDays = () => {
        if (!startDate || !endDate) return;

        const start = startDate;
        const end = endDate;
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

        // Preserve existing activities when recalculating days
        const newDays: DayPlan[] = [];
        for (let i = 0; i < diffDays; i++) {
            const currentDate = new Date(start);
            currentDate.setDate(start.getDate() + i);

            // Try to preserve activities from existing day with same day number
            const existingDay = days.find(d => d.day === i + 1);

            newDays.push({
                day: i + 1,
                date: currentDate.toISOString().split('T')[0],
                title: existingDay?.title || `Day ${i + 1} in ${basicInfo.destination}`,
                activities: existingDay?.activities || []
            });
        }
        setDays(newDays);
    };

    const handleNextStep = () => {
        if (step === 1) {
            if (!basicInfo.title || !basicInfo.destination || !startDate || !endDate) {
                showToast('warning', t.fill_all_fields || 'Please fill in all required fields');
                return;
            }
            // Final date validation before proceeding
            if (endDate < startDate) {
                showToast('error', t.end_date_before_start || 'End date cannot be before start date');
                return;
            }
            calculateDays();
            setStep(2);
        }
    };

    const handleSaveItinerary = async () => {
        if (!user) {
            showToast('warning', t.login_required_save || 'Please log in to save your itinerary');
            return;
        }

        try {
            setIsLoading(true);
            const formatDateStr = (d: Date) => d.toISOString().split('T')[0];
            const itineraryData: Partial<Itinerary> = {
                title: basicInfo.title,
                location: basicInfo.destination,
                startDate: formatDateStr(startDate!),
                endDate: formatDateStr(endDate!),
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
                    start_date: formatDateStr(startDate!),
                    end_date: formatDateStr(endDate!),
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
                    name: user.user_metadata?.full_name || user.email || t.author_me || 'Me',
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
                            <span>{t.step_basic_info}</span>
                            <span className="w-8 h-px bg-white/40"></span>
                            <span className={`flex items-center justify-center size-6 rounded-full border border-white/40 ${step >= 2 ? 'bg-white text-primary font-bold' : ''}`}>2</span>
                            <span>{t.step_itinerary}</span>
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
                                        placeholder={t.placeholder_trip_title}
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
                                        placeholder={t.placeholder_destination}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                            {t.start_date}
                                        </label>
                                        <CustomDatePicker
                                            selected={startDate}
                                            onChange={(date) => {
                                                setStartDate(date);
                                                if (endDate && date && date > endDate) {
                                                    setEndDate(null);
                                                }
                                            }}
                                            minDate={new Date()}
                                            placeholder={t.start_date}
                                            icon="calendar_today"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                            {t.end_date}
                                        </label>
                                        <CustomDatePicker
                                            selected={endDate}
                                            onChange={setEndDate}
                                            minDate={startDate || new Date()}
                                            placeholder={t.end_date}
                                            icon="event"
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
                                        placeholder={t.placeholder_description}
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
                                        <option value="$">{t.budget_low}</option>
                                        <option value="$$">{t.budget_medium}</option>
                                        <option value="$$$">{t.budget_high}</option>
                                        <option value="$$$$">{t.budget_luxury}</option>
                                    </select>
                                </div>

                                {/* Cover Image Upload */}
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-gray-300 mb-2">
                                        {t.cover_image}
                                    </label>

                                    {/* Current preview */}
                                    {basicInfo.coverImage ? (
                                        <div className="relative mb-4 rounded-xl overflow-hidden h-40 bg-gray-100 dark:bg-[#1e2126]">
                                            <img
                                                src={basicInfo.coverImage}
                                                alt="Cover preview"
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                                            <button
                                                type="button"
                                                onClick={() => setBasicInfo(prev => ({ ...prev, coverImage: '' }))}
                                                className="absolute top-2 right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 transition-colors"
                                            >
                                                <span className="material-symbols-outlined text-[18px]">close</span>
                                            </button>
                                            <span className="absolute bottom-3 left-3 text-white text-sm font-medium flex items-center gap-1">
                                                <span className="material-symbols-outlined text-[18px]">image</span>
                                                {t.preview}
                                            </span>
                                        </div>
                                    ) : (
                                        <label className="relative mb-4 rounded-xl overflow-hidden h-40 bg-gray-100 dark:bg-[#1e2126] border-2 border-dashed border-gray-300 dark:border-[#3a3e45] hover:border-primary dark:hover:border-primary cursor-pointer flex flex-col items-center justify-center gap-2 transition-colors">
                                            <span className="material-symbols-outlined text-4xl text-gray-400 dark:text-gray-500">cloud_upload</span>
                                            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">{t.click_to_upload}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500">{t.image_format_hint}</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="hidden"
                                                onChange={async (e) => {
                                                    const file = e.target.files?.[0];
                                                    if (!file) return;

                                                    if (file.size > 5 * 1024 * 1024) {
                                                        showToast('error', t.image_too_large);
                                                        return;
                                                    }

                                                    // Convert to base64 for preview (in production, upload to storage)
                                                    const reader = new FileReader();
                                                    reader.onload = (event) => {
                                                        if (event.target?.result) {
                                                            setBasicInfo(prev => ({ ...prev, coverImage: event.target!.result as string }));
                                                        }
                                                    };
                                                    reader.readAsDataURL(file);
                                                }}
                                            />
                                        </label>
                                    )}

                                    {/* Or paste URL */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500 dark:text-gray-400">{t.or}</span>
                                        <input
                                            type="text"
                                            name="coverImage"
                                            value={basicInfo.coverImage.startsWith('data:') ? '' : basicInfo.coverImage}
                                            onChange={handleBasicInfoChange}
                                            placeholder={t.paste_image_url}
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
                                        {t.next_step}
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
                                        {startDate?.toLocaleDateString()} - {endDate?.toLocaleDateString()} • {days.length} Days
                                    </p>
                                </div>

                                <div className="bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-xl p-3 flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
                                    <span className="material-symbols-outlined text-lg">tips_and_updates</span>
                                    {t.click_expand_tip}
                                </div>

                                {/* Preview Card */}
                                <div className="bg-gray-50 dark:bg-[#252830] rounded-xl p-4">
                                    <p className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1">
                                        <span className="material-symbols-outlined text-sm">visibility</span>
                                        {t.preview}
                                    </p>
                                    <div className="relative rounded-xl overflow-hidden bg-white dark:bg-[#1e2126] shadow-md">
                                        <div className="h-32 relative bg-gray-200 dark:bg-[#2a2e35]">
                                            {basicInfo.coverImage ? (
                                                <img
                                                    src={basicInfo.coverImage}
                                                    alt="Cover"
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <span className="material-symbols-outlined text-4xl text-gray-400">image</span>
                                                </div>
                                            )}
                                            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                                            <div className="absolute bottom-3 left-3 right-3">
                                                <h4 className="text-white font-bold text-lg truncate">{basicInfo.title || t.untitled_trip}</h4>
                                                <p className="text-white/80 text-xs flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[14px]">location_on</span>
                                                    {basicInfo.destination || t.destination_label}
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
                                                    {days.reduce((sum, d) => sum + d.activities.length, 0)} {t.activities}
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
                                        {t.back}
                                    </button>
                                    <button
                                        onClick={handleSaveItinerary}
                                        disabled={isLoading}
                                        className="px-8 py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold transition-colors shadow-lg shadow-primary/20 flex items-center gap-2"
                                    >
                                        {isLoading ? (
                                            <>
                                                <span className="material-symbols-outlined animate-spin text-[20px]">progress_activity</span>
                                                {t.creating}
                                            </>
                                        ) : (
                                            <>
                                                <span className="material-symbols-outlined text-[20px]">save</span>
                                                {t.save_itinerary}
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

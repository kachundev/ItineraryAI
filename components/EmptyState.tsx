import React from 'react';

interface EmptyStateProps {
    icon: string;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    secondaryActionLabel?: string;
    onSecondaryAction?: () => void;
}

export function EmptyState({
    icon,
    title,
    description,
    actionLabel,
    onAction,
    secondaryActionLabel,
    onSecondaryAction,
}: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            {/* Decorative background */}
            <div className="relative mb-6">
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl scale-150" />
                <div className="relative bg-gradient-to-br from-primary/10 to-primary/5 p-8 rounded-full">
                    <span className="material-symbols-outlined text-6xl text-primary">{icon}</span>
                </div>
            </div>

            <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">{title}</h2>
            <p className="text-slate-500 dark:text-gray-400 max-w-sm mb-8 leading-relaxed">{description}</p>

            <div className="flex flex-col sm:flex-row gap-3">
                {actionLabel && onAction && (
                    <button
                        onClick={onAction}
                        className="px-8 py-3 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-[20px]">add</span>
                        {actionLabel}
                    </button>
                )}
                {secondaryActionLabel && onSecondaryAction && (
                    <button
                        onClick={onSecondaryAction}
                        className="px-8 py-3 bg-gray-100 dark:bg-[#2a2e35] hover:bg-gray-200 dark:hover:bg-[#353a42] text-slate-700 dark:text-gray-300 font-bold rounded-xl transition-all flex items-center gap-2"
                    >
                        {secondaryActionLabel}
                    </button>
                )}
            </div>
        </div>
    );
}

// Preset empty states for common scenarios
export function NoTripsEmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
    return (
        <EmptyState
            icon="flight_takeoff"
            title="No trips yet"
            description="Your adventure awaits! Start planning your first trip and create unforgettable memories."
            actionLabel="Plan Your First Trip"
            onAction={onCreateTrip}
        />
    );
}

export function NoSearchResultsEmptyState({
    query,
    onClear,
}: {
    query: string;
    onClear: () => void;
}) {
    return (
        <EmptyState
            icon="search_off"
            title="No results found"
            description={`We couldn't find any itineraries matching "${query}". Try different keywords or browse all trips.`}
            actionLabel="Clear Search"
            onAction={onClear}
        />
    );
}

export function NoSavedTripsEmptyState({ onExplore }: { onExplore: () => void }) {
    return (
        <EmptyState
            icon="bookmark_border"
            title="No saved trips"
            description="Discover amazing itineraries shared by our community and save your favorites here."
            actionLabel="Explore Itineraries"
            onAction={onExplore}
        />
    );
}

export function NoCommunityTripsEmptyState({ onCreateTrip }: { onCreateTrip: () => void }) {
    return (
        <EmptyState
            icon="explore"
            title="Be the first explorer!"
            description="No public itineraries yet. Share your travel plans with the community and inspire others."
            actionLabel="Create & Share"
            onAction={onCreateTrip}
        />
    );
}

import React from 'react';

interface SkeletonCardProps {
    variant?: 'grid' | 'list';
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({ variant = 'grid' }) => {
    return (
        <div className="bg-white dark:bg-[#1e2126] rounded-xl overflow-hidden border border-gray-200 dark:border-[#2a2e35] animate-pulse">
            {/* Image placeholder */}
            <div className="h-48 bg-gray-200 dark:bg-[#2a2e35]" />

            {/* Content */}
            <div className="p-5 space-y-4">
                {/* Title */}
                <div className="h-6 bg-gray-200 dark:bg-[#2a2e35] rounded-lg w-3/4" />

                {/* Date info */}
                <div className="space-y-2">
                    <div className="h-4 bg-gray-200 dark:bg-[#2a2e35] rounded w-1/2" />
                    <div className="h-4 bg-gray-200 dark:bg-[#2a2e35] rounded w-1/3" />
                </div>

                {/* Tags */}
                <div className="flex gap-2">
                    <div className="h-6 bg-gray-200 dark:bg-[#2a2e35] rounded w-16" />
                    <div className="h-6 bg-gray-200 dark:bg-[#2a2e35] rounded w-20" />
                </div>

                {/* Button */}
                <div className="h-10 bg-gray-200 dark:bg-[#2a2e35] rounded-lg w-full mt-4" />
            </div>
        </div>
    );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonCard key={i} />
            ))}
        </div>
    );
}

export function SkeletonExploreCard() {
    return (
        <div className="bg-white dark:bg-[#1e2126] rounded-2xl overflow-hidden border border-gray-100 dark:border-[#2a2e35] animate-pulse flex flex-col">
            {/* Image */}
            <div className="aspect-[4/3] bg-gray-200 dark:bg-[#2a2e35]" />

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div className="h-5 bg-gray-200 dark:bg-[#2a2e35] rounded w-4/5" />

                {/* Author section */}
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 dark:border-[#2a2e35]">
                    <div className="size-8 rounded-full bg-gray-200 dark:bg-[#2a2e35]" />
                    <div className="flex-1 space-y-1">
                        <div className="h-3 bg-gray-200 dark:bg-[#2a2e35] rounded w-20" />
                        <div className="h-2 bg-gray-200 dark:bg-[#2a2e35] rounded w-16" />
                    </div>
                    <div className="flex gap-2">
                        <div className="h-5 w-10 bg-gray-200 dark:bg-[#2a2e35] rounded" />
                        <div className="h-5 w-5 bg-gray-200 dark:bg-[#2a2e35] rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function SkeletonExploreGrid({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: count }).map((_, i) => (
                <SkeletonExploreCard key={i} />
            ))}
        </div>
    );
}

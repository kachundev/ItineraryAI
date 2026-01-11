import React, { useState, useRef, useEffect } from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import 'react-day-picker/style.css';

interface CustomDatePickerProps {
    selected: Date | null;
    onChange: (date: Date | null) => void;
    minDate?: Date;
    placeholder?: string;
    icon?: string;
}

export default function CustomDatePicker({
    selected,
    onChange,
    minDate,
    placeholder = 'Select date',
    icon = 'calendar_today'
}: CustomDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close calendar when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div ref={containerRef} className="relative flex items-center group">
            <div className="absolute left-4 text-primary group-focus-within:scale-110 transition-transform z-10">
                <span className="material-symbols-outlined">{icon}</span>
            </div>
            <input
                type="text"
                readOnly
                value={selected ? format(selected, 'yyyy/MM/dd') : ''}
                placeholder={placeholder}
                onClick={() => setIsOpen(!isOpen)}
                className="w-full rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#16181d] py-4 pl-12 pr-12 text-base font-medium text-slate-900 dark:text-white placeholder:text-gray-400 focus:border-primary focus:ring-1 focus:ring-primary transition-all outline-none cursor-pointer"
            />
            {isOpen && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-white dark:bg-[#1e2126] rounded-xl shadow-xl border border-gray-200 dark:border-[#2a2e35] p-3">
                    <DayPicker
                        mode="single"
                        selected={selected || undefined}
                        onSelect={(date) => {
                            onChange(date || null);
                            setIsOpen(false);
                        }}
                        disabled={minDate ? { before: minDate } : undefined}
                        className="custom-day-picker"
                    />
                </div>
            )}
        </div>
    );
}

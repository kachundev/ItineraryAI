import React, { useState, useRef, useEffect } from 'react';

interface ShareMenuProps {
    url: string;
    title: string;
    description?: string;
}

export function ShareMenu({ url, title, description }: ShareMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const shareUrl = encodeURIComponent(url);
    const shareTitle = encodeURIComponent(title);
    const shareText = encodeURIComponent(description || title);

    const shareLinks = [
        {
            name: 'Copy Link',
            icon: 'link',
            color: 'text-slate-600 dark:text-gray-400',
            action: async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            },
        },
        {
            name: 'WhatsApp',
            icon: 'chat',
            color: 'text-green-500',
            href: `https://wa.me/?text=${shareText}%20${shareUrl}`,
        },
        {
            name: 'Twitter',
            icon: 'share',
            color: 'text-sky-500',
            href: `https://twitter.com/intent/tweet?text=${shareTitle}&url=${shareUrl}`,
        },
        {
            name: 'Facebook',
            icon: 'thumb_up',
            color: 'text-blue-600',
            href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
        },
        {
            name: 'Email',
            icon: 'mail',
            color: 'text-slate-600 dark:text-gray-400',
            href: `mailto:?subject=${shareTitle}&body=${shareText}%0A%0A${shareUrl}`,
        },
    ];

    return (
        <div className="relative z-40" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="flex items-center justify-center gap-2 bg-gray-100 dark:bg-[#2a2e35] hover:bg-gray-200 dark:hover:bg-[#32363e] text-slate-900 dark:text-white font-medium px-4 py-2.5 rounded-lg transition-all duration-200"
            >
                <span className="material-symbols-outlined text-[20px]">share</span>
            </button>

            {isOpen && (
                <div className="absolute right-0 bottom-12 w-48 bg-white dark:bg-[#25282e] rounded-xl shadow-2xl border border-gray-100 dark:border-[#32363e] z-[100] animate-scaleIn">
                    <div className="p-2">
                        <p className="text-xs font-bold text-slate-400 dark:text-gray-500 uppercase px-2 py-1">Share via</p>
                        {shareLinks.map((link) => (
                            link.action ? (
                                <button
                                    key={link.name}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        link.action();
                                    }}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2e35] transition-colors"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${link.color}`}>
                                        {copied && link.name === 'Copy Link' ? 'check' : link.icon}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">
                                        {copied && link.name === 'Copy Link' ? 'Copied!' : link.name}
                                    </span>
                                </button>
                            ) : (
                                <a
                                    key={link.name}
                                    href={link.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 dark:hover:bg-[#2a2e35] transition-colors"
                                >
                                    <span className={`material-symbols-outlined text-[18px] ${link.color}`}>{link.icon}</span>
                                    <span className="text-sm font-medium text-slate-700 dark:text-gray-300">{link.name}</span>
                                </a>
                            )
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

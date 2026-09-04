
import React, { useState, useEffect, useRef } from 'react';
import type { AppNotification } from '../types';
import { BellIcon } from './icons/BellIcon';
import { CheckIcon } from './icons/CheckIcon';

interface NotificationBellProps {
  notifications: AppNotification[];
  onMarkAsRead: (notificationId?: string) => void;
}

function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays}d ago`;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ notifications, onMarkAsRead }) => {
    const [isOpen, setIsOpen] = useState(false);
    const unreadCount = notifications.filter(n => !n.isRead).length;
    const ref = useRef<HTMLDivElement>(null);

    const sortedNotifications = [...notifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };
    
    const handleMarkAllRead = () => {
        onMarkAsRead(); // Calls without ID implies 'all'
    };

    const handleItemAction = (n: AppNotification) => {
        if (!n.isRead) {
            onMarkAsRead(n.id);
        }
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [ref]);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={handleToggle}
                className="relative p-2 rounded-full text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                aria-label="View notifications"
            >
                <BellIcon className="h-6 w-6" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white dark:ring-slate-800 flex items-center justify-center">
                        {unreadCount > 9 ? '9+' : unreadCount}
                         <span className="absolute -inset-full animate-ping rounded-full bg-red-500 opacity-75"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-80 sm:w-96 rounded-md shadow-xl bg-white dark:bg-slate-800 ring-1 ring-black ring-opacity-5 focus:outline-none z-50 overflow-hidden">
                    <div className="flex justify-between items-center px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-700">
                        <span className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</span>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                className="text-xs font-medium text-[var(--color-primary)] hover:underline"
                            >
                                Mark all as read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {sortedNotifications.length > 0 ? (
                            <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                                {sortedNotifications.map(notification => {
                                    const isVisitorNotif = notification.type === 'guest_arrival' || notification.type === 'visitor';
                                    return (
                                        <li 
                                            key={notification.id} 
                                            className={`p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                                                !notification.isRead 
                                                    ? (isVisitorNotif ? 'bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-amber-500' : 'bg-blue-50/50 dark:bg-blue-900/20 border-l-4 border-blue-500') 
                                                    : ''
                                            }`}
                                        >
                                            <div className="flex justify-between items-start gap-3">
                                                <div className="flex-grow">
                                                    {isVisitorNotif && (
                                                        <div className="flex items-center gap-1.5 mb-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                                                VISITOR AT GATE
                                                            </span>
                                                        </div>
                                                    )}
                                                    <p className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {notification.message}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatTimeAgo(notification.timestamp)}</p>
                                                </div>
                                                {!notification.isRead && (
                                                    <button 
                                                        onClick={() => handleItemAction(notification)}
                                                        className={`flex-shrink-0 p-1.5 rounded-xl transition-all ${
                                                            isVisitorNotif 
                                                                ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700' 
                                                                : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                        }`}
                                                        title={isVisitorNotif ? "Acknowledge & Mark Met" : "Mark as Read"}
                                                    >
                                                        {isVisitorNotif ? (
                                                            <div className="flex items-center gap-1 px-1.5 py-0.5">
                                                                 <CheckIcon className="w-3.5 h-3.5" />
                                                                 <span className="text-[11px] font-black uppercase">Met</span>
                                                            </div>
                                                        ) : (
                                                            <span className="block w-2.5 h-2.5 bg-blue-500 rounded-full"></span>
                                                        )}
                                                    </button>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <BellIcon className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                                <p className="text-sm text-slate-500 dark:text-slate-400">
                                    You have no notifications.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


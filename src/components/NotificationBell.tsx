import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { AppNotification, User, Institution } from '../types';
import { BellIcon } from './icons/BellIcon';
import { CheckIcon } from './icons/CheckIcon';

interface NotificationBellProps {
  notifications: AppNotification[];
  onMarkAsRead: (notificationId?: string) => void;
  currentUser?: User | null;
  currentInstitution?: Institution | null;
  onAcknowledgeVisitorMet?: (notification: AppNotification) => void;
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

export function isGateVisitorNotification(notification: AppNotification): boolean {
    if (!notification) return false;
    const rawType = String(notification.type || '').toLowerCase();
    const notifMsg = String(notification.message || '');
    
    // Explicitly exclude marketing leads, demo requests, simulators, and AI chats
    if (
        rawType === 'demo_request' ||
        rawType === 'lead' ||
        rawType === 'contact_request' ||
        notifMsg.toLowerCase().includes('demo request') ||
        notifMsg.toLowerCase().includes('new lead') ||
        notifMsg.toLowerCase().includes('simulator') ||
        notifMsg.toLowerCase().includes('lead captured') ||
        notifMsg.toLowerCase().includes('chatting with')
    ) {
        return false;
    }

    return rawType === 'guest_arrival' || rawType === 'visitor';
}

function extractVisitorDetails(notification: AppNotification): { visitorName: string; purpose: string } {
    const meta = (notification as any).metadata || {};
    let visitorName = notification.visitorName || (notification as any).visitor_name || meta.visitorName || meta.name || '';
    let purpose = notification.purpose || meta.purpose || '';

    // If visitorName isn't explicitly set, try extracting from the message text
    // E.g.: "You have a visitor: John Doe (Meeting) has arrived at the security gate."
    // or "You have a visitor: Jane Smith is waiting at the security gate for Registration."
    if (!visitorName && notification.message) {
        const match = notification.message.match(/(?:visitor:\s*|guest\s+)([^(\n\r,]+?)(?:\s+is\s+waiting|\s+has\s+arrived|\s+has\s+registered|\s*\(|\s+for|\.|$)/i);
        if (match && match[1]) {
            const candidate = match[1].trim();
            if (candidate && !candidate.toLowerCase().includes('you have') && !candidate.toLowerCase().includes('demo request') && !candidate.toLowerCase().includes('new lead')) {
                visitorName = candidate;
            }
        }
    }

    if (!purpose && notification.message) {
        const purposeMatch = notification.message.match(/(?:for\s+|\(|\bpurpose:\s*)([^).\n\r]+)/i);
        if (purposeMatch && purposeMatch[1] && !purposeMatch[1].toLowerCase().includes('security gate')) {
            purpose = purposeMatch[1].trim();
        }
    }

    return {
        visitorName: visitorName.trim() || 'Visitor',
        purpose: purpose.trim()
    };
}

export const NotificationBell: React.FC<NotificationBellProps> = ({ 
    notifications, 
    onMarkAsRead, 
    currentUser, 
    currentInstitution,
    onAcknowledgeVisitorMet 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // ── STRICT FILTERING: Only show visitor notifications to the assigned host within the correct tenant ──
    const filteredNotifications = useMemo(() => {
        if (!notifications || !Array.isArray(notifications)) return [];
        const currentUserId = String(currentUser?.id || '').trim();
        const currentUserIdNorm = currentUserId.replace(/^u_/, '').toLowerCase();
        const isSuperAdmin = currentUser?.role === 'super_admin';
        const activeInstId = String(currentInstitution?.id || currentUser?.institutionId || '').trim();
        const isGlobalRootContext = isSuperAdmin && (!activeInstId || activeInstId === 'GLOBAL');

        return notifications.filter(notification => {
            if (!notification) return false;
            const isVisitorNotif = isGateVisitorNotification(notification);

            // 1. Physical security gate arrivals belong to specific institutions,
            // never the global platform super admin root / Cyber Command view.
            if (isVisitorNotif && isGlobalRootContext) {
                return false;
            }

            // 2. Tenant isolation: verify institution match if notification is tenant-scoped
            const notifInstId = String(
                notification.institutionId || 
                (notification as any).institution_id || 
                (notification as any).metadata?.institutionId || 
                (notification as any).metadata?.institution_id || 
                ''
            ).trim();

            if (activeInstId && activeInstId !== 'GLOBAL') {
                if (notifInstId && notifInstId !== 'GLOBAL' && notifInstId !== activeInstId) {
                    return false;
                }
                // Visitor notifications must belong to the active institution
                if (isVisitorNotif && notifInstId && notifInstId !== activeInstId) {
                    return false;
                }
            }

            // 3. Visitor notifications MUST ONLY be visible to the assigned host!
            if (isVisitorNotif) {
                if (!currentUser) return false;

                const targetHostId = String(
                    notification.userId || 
                    (notification as any).user_id || 
                    (notification as any).metadata?.hostId || 
                    (notification as any).metadata?.targetHostId || 
                    ''
                ).trim();

                // If no host ID was recorded, do not leak visitor notifications
                if (!targetHostId) return false;

                const targetHostIdNorm = targetHostId.replace(/^u_/, '').toLowerCase();
                return targetHostIdNorm === currentUserIdNorm;
            }

            // 4. For targeted user notifications, ensure they belong to current user
            const targetUserId = String(notification.userId || (notification as any).user_id || '').trim();
            if (targetUserId && currentUser) {
                const targetUserIdNorm = targetUserId.replace(/^u_/, '').toLowerCase();
                return targetUserIdNorm === currentUserIdNorm;
            }

            return true;
        });
    }, [notifications, currentUser, currentInstitution]);

    const unreadCount = filteredNotifications.filter(n => !n.isRead).length;
    const sortedNotifications = useMemo(() => {
        return [...filteredNotifications].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }, [filteredNotifications]);

    const handleToggle = () => {
        setIsOpen(!isOpen);
    };
    
    const handleMarkAllRead = () => {
        onMarkAsRead(); // Calls without ID implies 'all'
    };

    const handleItemAction = (n: AppNotification) => {
        const isVisitorNotif = isGateVisitorNotification(n);
        if (isVisitorNotif && onAcknowledgeVisitorMet) {
            onAcknowledgeVisitorMet(n);
        }
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
                                    const isVisitorNotif = isGateVisitorNotification(notification);
                                    const visitorDetails = isVisitorNotif ? extractVisitorDetails(notification) : null;

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
                                                    {isVisitorNotif && visitorDetails && (
                                                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-300 dark:border-amber-700">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                                                                VISITOR AT GATE
                                                            </span>
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-black bg-amber-200/90 text-amber-950 dark:bg-amber-800/70 dark:text-amber-100 border border-amber-300 dark:border-amber-600">
                                                                👤 {visitorDetails.visitorName}
                                                            </span>
                                                        </div>
                                                    )}

                                                    <p className={`text-sm ${!notification.isRead ? 'font-bold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                                        {notification.message || (isVisitorNotif && visitorDetails ? `${visitorDetails.visitorName} has arrived at the security gate to see you.` : 'New notification')}
                                                    </p>

                                                    {isVisitorNotif && visitorDetails?.purpose && !notification.message?.toLowerCase().includes(visitorDetails.purpose.toLowerCase()) && (
                                                        <p className="mt-0.5 text-xs font-semibold text-amber-800 dark:text-amber-300">
                                                            Purpose: {visitorDetails.purpose}
                                                        </p>
                                                    )}

                                                    <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{formatTimeAgo(notification.timestamp)}</p>
                                                </div>
                                                {!notification.isRead && (
                                                    <button 
                                                        onClick={() => handleItemAction(notification)}
                                                        className={`flex-shrink-0 p-1.5 rounded-xl transition-all ${
                                                            isVisitorNotif 
                                                                ? 'text-emerald-700 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700 shadow-sm' 
                                                                : 'text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                                                        }`}
                                                        title={isVisitorNotif ? "Mark Met & Auto-Finalize Exit" : "Mark as Read"}
                                                    >
                                                        {isVisitorNotif ? (
                                                            <div className="flex items-center gap-1 px-2 py-0.5">
                                                                <CheckIcon className="w-3.5 h-3.5" />
                                                                <span className="text-[11px] font-black uppercase tracking-wider">Met & Exit</span>
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

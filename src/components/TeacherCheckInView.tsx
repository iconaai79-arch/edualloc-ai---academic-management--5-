import React, { useState, useEffect } from 'react';
import { User, Institution, TeacherCheckInWithDetails, CheckInType, CheckInStatus } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BellIcon } from './icons/BellIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { CameraIcon } from './icons/CameraIcon';
import { apiService } from '../services/apiService';
import { calculateDistance } from '../utils/locationUtils';


interface TeacherCheckInViewProps {
    currentUser?: User | null;
    currentInstitution?: Institution | null;
    onLogAction?: (action: string) => Promise<void> | void;
}

const TeacherCheckInView: React.FC<TeacherCheckInViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction
}) => {
    const [todayCheckIn, setTodayCheckIn] = useState<TeacherCheckInWithDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCheckInModal, setShowCheckInModal] = useState(false);
    const [checkInType, setCheckInType] = useState<CheckInType>('Morning');
    const [location, setLocation] = useState('');
    const [notes, setNotes] = useState('');
    const [showReminder, setShowReminder] = useState(false);
    const [reminderType, setReminderType] = useState<CheckInType | null>(null);
    const [checkingLocation, setCheckingLocation] = useState(false);
    const [scanningGateQr, setScanningGateQr] = useState(false);

    const teacherId = currentUser?.id || '';
    const institutionId = currentInstitution?.id || currentUser?.institutionId || '';

    useEffect(() => {
        if (teacherId) {
            loadTodayCheckIn();
            setupReminderChecks();
        } else {
            setLoading(false);
        }
    }, [teacherId]);

    const loadTodayCheckIn = async () => {
        if (!teacherId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const data = await apiService.fetchTodayTeacherCheckIn(teacherId);
            setTodayCheckIn(data);
            if (onLogAction) {
                await onLogAction('Viewed teacher check-in');
            }
        } catch (error) {
            console.error('Error loading check-in:', error);
        } finally {
            setLoading(false);
        }
    };

    const setupReminderChecks = () => {
        // Check for reminders every minute
        const checkReminders = () => {
            const now = new Date();
            const currentTime = now.getHours() * 60 + now.getMinutes();

            // Morning reminder at 7:45 AM (7 * 60 + 45 = 465 minutes)
            const morningReminderTime = 7 * 60 + 45;
            // Afternoon reminder at 3:45 PM (15 * 60 + 45 = 945 minutes)
            const afternoonReminderTime = 15 * 60 + 45;

            // Show morning reminder between 7:45 and 8:00
            if (currentTime >= morningReminderTime && currentTime < 8 * 60) {
                if (!todayCheckIn?.morningCheckInTime) {
                    setReminderType('Morning');
                    setShowReminder(true);
                }
            }

            // Show afternoon reminder between 3:45 and 4:00
            if (currentTime >= afternoonReminderTime && currentTime < 16 * 60) {
                if (!todayCheckIn?.afternoonCheckInTime) {
                    setReminderType('Afternoon');
                    setShowReminder(true);
                }
            }
        };

        checkReminders();
        const interval = setInterval(checkReminders, 60000); // Check every minute

        return () => clearInterval(interval);
    };

    const handleOpenCheckInModal = (type: CheckInType) => {
        setCheckInType(type);
        setLocation('');
        setNotes('');
        setShowCheckInModal(true);
    };

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault();

        if (currentInstitution?.checkinRadiusEnabled) {
            if (!navigator.geolocation) {
                alert('Geolocation is not supported by your browser. Location check is required.');
                return;
            }

            setCheckingLocation(true);
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    
                    if (!currentInstitution?.location?.latitude || !currentInstitution?.location?.longitude) {
                        alert('School coordinates are not configured in settings. Check-in rejected.');
                        setCheckingLocation(false);
                        return;
                    }

                    const distance = calculateDistance(
                        latitude,
                        longitude,
                        currentInstitution.location.latitude,
                        currentInstitution.location.longitude
                    );

                    const radiusLimit = currentInstitution?.checkinRadiusMeters || 200;

                    if (distance > radiusLimit) {
                        alert(`Out of Range: You must be within ${radiusLimit}m of the school to check in. Current distance: ${Math.round(distance)}m`);
                        setCheckingLocation(false);
                        return;
                    }

                    // Save with coordinates appended to the location
                    const locationWithCoords = location 
                        ? `${location} (GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)})`
                        : `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

                    try {
                        const now = new Date();
                        const currentTime = now.toTimeString().split(' ')[0];

                        await apiService.processTeacherCheckIn({
                            teacher_id: teacherId,
                            institution_id: institutionId,
                            checkin_type: checkInType,
                            location: locationWithCoords,
                            notes: notes
                        });

                        if (onLogAction) {
                            await onLogAction(`Checked in: ${checkInType} at ${currentTime} (GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)})`);
                        }
                        alert(`${checkInType} check-in successful!`);

                        setShowCheckInModal(false);
                        setShowReminder(false);
                        loadTodayCheckIn();
                    } catch (error) {
                        console.error('Error checking in:', error);
                        alert('Failed to check in');
                    } finally {
                        setCheckingLocation(false);
                    }
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Failed to get your current location. Location check is required to check in.');
                    setCheckingLocation(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            // Normal flow without geofencing
            setCheckingLocation(true);
            try {
                const now = new Date();
                const currentTime = now.toTimeString().split(' ')[0];

                await apiService.processTeacherCheckIn({
                    teacher_id: teacherId,
                    institution_id: institutionId,
                    checkin_type: checkInType,
                    location: location,
                    notes: notes
                });

                if (onLogAction) {
                    await onLogAction(`Checked in: ${checkInType} at ${currentTime}`);
                }
                alert(`${checkInType} check-in successful!`);

                setShowCheckInModal(false);
                setShowReminder(false);
                loadTodayCheckIn();
            } catch (error) {
                console.error('Error checking in:', error);
                alert('Failed to check in');
            } finally {
                setCheckingLocation(false);
            }
        }
    };

    const getStatusColor = (status: CheckInStatus) => {
        switch (status) {
            case 'On Time': return 'text-green-600 bg-green-100';
            case 'Late': return 'text-orange-600 bg-orange-100';
            case 'Absent': return 'text-red-600 bg-red-100';
            default: return 'text-gray-600 bg-gray-100';
        }
    };

    const getCurrentTime = () => {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const isCheckInTime = (type: CheckInType) => {
        const now = new Date();
        const currentHour = now.getHours();

        if (type === 'Morning') {
            return currentHour >= 7 && currentHour < 9; // 7 AM - 9 AM
        } else {
            return currentHour >= 15 && currentHour < 17; // 3 PM - 5 PM
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Reminder Notification */}
            {showReminder && reminderType && (
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg shadow-md animate-pulse">
                    <div className="flex items-start">
                        <BellIcon className="w-6 h-6 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="ml-3 flex-1">
                            <h3 className="text-lg font-semibold text-yellow-900">
                                {reminderType} Check-In Reminder
                            </h3>
                            <p className="text-yellow-800 mt-1">
                                It's time for your {reminderType.toLowerCase()} check-in!
                                Please check in within the next 15 minutes.
                            </p>
                            <div className="mt-3 flex gap-3">
                                <button
                                    onClick={() => handleOpenCheckInModal(reminderType)}
                                    className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-medium"
                                >
                                    Check In Now
                                </button>
                                <button
                                    onClick={() => setShowReminder(false)}
                                    className="px-4 py-2 bg-white border border-yellow-600 text-yellow-600 rounded-lg hover:bg-yellow-50 transition-colors font-medium"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Teacher Check-In</h2>
                    <p className="text-gray-600 mt-1">
                        {new Date().toLocaleDateString('en-US', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </p>
                    <p className="text-lg font-semibold text-blue-600 mt-1">{getCurrentTime()}</p>
                </div>
                <button
                    onClick={() => setScanningGateQr(true)}
                    className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-indigo-150 transition-all font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98]"
                >
                    <QrCodeIcon className="w-5 h-5 text-white" />
                    Scan Gate QR
                </button>
            </div>

            {/* Check-In Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Morning Check-In */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">Morning Check-In</h3>
                                <p className="text-sm opacity-90 mt-1">Before 8:00 AM</p>
                            </div>
                            <ClockIcon className="w-10 h-10 opacity-80" />
                        </div>
                    </div>

                    <div className="p-6">
                        {todayCheckIn?.morningCheckInTime ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(todayCheckIn.morningCheckInStatus)}`}>
                                        {todayCheckIn.morningCheckInStatus}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Time:</span>
                                    <span className="font-semibold">{todayCheckIn.morningCheckInTime}</span>
                                </div>
                                {todayCheckIn.morningLocation && (
                                    <div className="flex items-start gap-2 pt-2 border-t">
                                        <MapPinIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                        <span className="text-sm text-gray-600">{todayCheckIn.morningLocation}</span>
                                    </div>
                                )}
                                {todayCheckIn.morningNotes && (
                                    <div className="pt-2 border-t">
                                        <p className="text-sm text-gray-600">{todayCheckIn.morningNotes}</p>
                                    </div>
                                )}
                                <div className="pt-3 flex items-center gap-2 text-green-600">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span className="font-medium">Checked In</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                {isCheckInTime('Morning') ? (
                                    <>
                                        <XCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4">You haven't checked in yet</p>
                                        <button
                                            onClick={() => handleOpenCheckInModal('Morning')}
                                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                        >
                                            Check In Now
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600">
                                            {new Date().getHours() < 7
                                                ? 'Morning check-in opens at 7:00 AM'
                                                : 'Morning check-in period has ended'}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Afternoon Check-In */}
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-4 text-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-xl font-bold">Afternoon Check-In</h3>
                                <p className="text-sm opacity-90 mt-1">Before 4:00 PM</p>
                            </div>
                            <ClockIcon className="w-10 h-10 opacity-80" />
                        </div>
                    </div>

                    <div className="p-6">
                        {todayCheckIn?.afternoonCheckInTime ? (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(todayCheckIn.afternoonCheckInStatus)}`}>
                                        {todayCheckIn.afternoonCheckInStatus}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-gray-600">Time:</span>
                                    <span className="font-semibold">{todayCheckIn.afternoonCheckInTime}</span>
                                </div>
                                {todayCheckIn.afternoonLocation && (
                                    <div className="flex items-start gap-2 pt-2 border-t">
                                        <MapPinIcon className="w-4 h-4 text-gray-500 mt-0.5" />
                                        <span className="text-sm text-gray-600">{todayCheckIn.afternoonLocation}</span>
                                    </div>
                                )}
                                {todayCheckIn.afternoonNotes && (
                                    <div className="pt-2 border-t">
                                        <p className="text-sm text-gray-600">{todayCheckIn.afternoonNotes}</p>
                                    </div>
                                )}
                                <div className="pt-3 flex items-center gap-2 text-green-600">
                                    <CheckCircleIcon className="w-5 h-5" />
                                    <span className="font-medium">Checked In</span>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                {isCheckInTime('Afternoon') ? (
                                    <>
                                        <XCircleIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600 mb-4">You haven't checked in yet</p>
                                        <button
                                            onClick={() => handleOpenCheckInModal('Afternoon')}
                                            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                                        >
                                            Check In Now
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <ClockIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                        <p className="text-gray-600">
                                            {new Date().getHours() < 15
                                                ? 'Afternoon check-in opens at 3:00 PM'
                                                : 'Afternoon check-in period has ended'}
                                        </p>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Reminder Schedule Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                    <BellIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="font-semibold text-blue-900">Automatic Reminders</h4>
                        <p className="text-sm text-blue-800 mt-1">
                            You will receive reminders at:
                        </p>
                        <ul className="text-sm text-blue-800 mt-2 space-y-1">
                            <li>• <strong>7:45 AM</strong> - Morning check-in reminder (15 minutes before 8:00 AM)</li>
                            <li>• <strong>3:45 PM</strong> - Afternoon check-in reminder (15 minutes before 4:00 PM)</li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Check-In Modal */}
            {showCheckInModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
                        <div className="flex items-center justify-between p-6 border-b">
                            <h3 className="text-xl font-bold text-gray-900">
                                {checkInType} Check-In
                            </h3>
                            <button
                                onClick={() => setShowCheckInModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <XCircleIcon className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCheckIn} className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <div className="flex items-center gap-2 text-blue-900">
                                    <ClockIcon className="w-5 h-5" />
                                    <span className="font-semibold">Current Time: {getCurrentTime()}</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Location (Optional)
                                </label>
                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    placeholder="e.g., Main Office, Classroom 101"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Notes (Optional)
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    rows={3}
                                    placeholder="Any additional notes..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    type="button"
                                    onClick={() => setShowCheckInModal(false)}
                                    disabled={checkingLocation}
                                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={checkingLocation}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2 disabled:bg-blue-400"
                                >
                                    {checkingLocation ? (
                                        <>
                                            <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                            Verifying Location...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircleIcon className="w-5 h-5" />
                                            Confirm Check-In
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {scanningGateQr && (
                <div className="fixed inset-0 bg-black/90 z-[200] flex flex-col items-center justify-center p-4">
                    <div className="w-full max-w-lg text-center flex flex-col items-center">
                        <div className="relative aspect-square w-full max-w-[320px] bg-slate-800 rounded-3xl border-4 border-indigo-500 overflow-hidden mb-6 shadow-[0_0_50px_rgba(99,102,241,0.5)]">
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                                <QrCodeIcon className="w-24 h-24 text-indigo-400/20 mb-4 animate-pulse" />
                                <p className="text-indigo-400 font-bold uppercase text-[10px] tracking-widest mb-4">Accessing Camera...</p>
                                <button
                                    onClick={() => setScanningGateQr(false)}
                                    className="px-6 py-2.5 bg-red-650/40 hover:bg-red-650/60 text-red-300 rounded-xl border border-red-500/20 text-xs font-black uppercase tracking-wider transition-all"
                                >
                                    Cancel Scan
                                </button>
                            </div>
                            <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 shadow-[0_0_20px_#6366f1] animate-[scan_3s_infinite]"></div>
                        </div>
                        <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">Scan Gate printed QR Code</h3>
                        <p className="text-slate-400 font-medium text-xs mb-8">Point your device camera at the printed QR code plate mounted at the school gate</p>
                        
                        {/* Mock Printed QR Scanner Targets */}
                        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-5 text-left space-y-4">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Mock Scan Target (Static Gate Signboard)</h4>
                            <button
                                onClick={async () => {
                                    setScanningGateQr(false);
                                    // Determine shift type based on hour
                                    const hour = new Date().getHours();
                                    const shift: CheckInType = (hour >= 15) ? 'Afternoon' : 'Morning';
                                    try {
                                        await apiService.processTeacherCheckIn({
                                            teacher_id: teacherId,
                                            institution_id: institutionId,
                                            checkin_type: shift,
                                            location: 'School Gate (Scanned printed QR code)',
                                            notes: 'Gate self-scan check-in success'
                                        });
                                        if (onLogAction) {
                                            await onLogAction(`Checked in via Gate QR Code Scan`);
                                        }
                                        alert(`Gate QR Check-in successful! Checked in for ${shift} shift.`);
                                        loadTodayCheckIn();
                                    } catch (e: any) {
                                        alert(e.message || 'Failed to check in via QR code.');
                                    }
                                }}
                                className="w-full flex items-center justify-between p-4 rounded-xl bg-slate-950 hover:bg-indigo-950/20 border border-slate-800 hover:border-indigo-500/35 transition-all text-left"
                            >
                                <div>
                                    <p className="text-xs font-black text-white">MAIN GATE QR SIGNPOST</p>
                                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Payload: school_gate_id: {institutionId || 'N/A'}</p>
                                </div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 px-3 py-1 rounded border border-indigo-500/20">
                                    SCAN CODE
                                </span>
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes scan {
                            0% { transform: translateY(0); }
                            50% { transform: translateY(320px); }
                            100% { transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default TeacherCheckInView;


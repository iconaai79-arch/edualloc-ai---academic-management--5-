import React, { useState, useEffect, useMemo } from 'react';
import type { TimetableEntry, Subject, User, Room, Building } from '../types';
import { calculateDistance } from '../utils/locationUtils';
import { timeToMinutes } from '../utils/timeUtils';
import { MapPinIcon } from './icons';

interface NearbyClassesViewProps {
    timetable: TimetableEntry[];
    getSubjectById: (id: string) => Subject | undefined;
    getLecturerById: (id: string) => User | undefined;
    getRoomById: (id: string) => Room | undefined;
    buildings: Building[];
}

const NEARBY_RADIUS_METERS = 100;
const dayMapping = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const NearbyClassesView: React.FC<NearbyClassesViewProps> = ({ timetable, getSubjectById, getLecturerById, getRoomById, buildings }) => {
    const [location, setLocation] = useState<{ latitude: number, longitude: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [now, setNow] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 5000); // Update time every 5 seconds
        let watchId: number | null = null;

        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(
                (position) => {
                    setLocation({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                    setError(null);
                },
                (err) => {
                    setError(`Geolocation error: ${err.message}`);
                },
                { enableHighAccuracy: true }
            );
        } else {
            setError("Geolocation is not supported by your browser.");
        }

        return () => {
            clearInterval(timer);
            if (watchId !== null) {
                navigator.geolocation.clearWatch(watchId);
            }
        };
    }, []);

    const nearbyOngoingClasses = useMemo(() => {
        if (!location) return [];

        const todayStr = dayMapping[now.getDay()];
        const nowMinutes = now.getHours() * 60 + now.getMinutes();

        return timetable.filter(entry => {
            if (entry.day !== todayStr) return false;

            const lessonStartMinutes = timeToMinutes(entry.startTime);
            const lessonEndMinutes = timeToMinutes(entry.endTime);
            if (nowMinutes < lessonStartMinutes || nowMinutes >= lessonEndMinutes) return false;

            const room = getRoomById(entry.roomId);
            if (!room?.location) return false;

            const distance = calculateDistance(location.latitude, location.longitude, room.location.latitude, room.location.longitude);
            return distance <= NEARBY_RADIUS_METERS;
        });
    }, [location, now, timetable, getRoomById]);

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold">Nearby Ongoing Classes</h3>
            {error && <p className="text-red-500 bg-red-100 p-3 rounded-md">{error}</p>}
            {!location && !error && (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400">Getting your location to find nearby classes...</p>
                    <p className="text-xs text-slate-400 mt-2">Please ensure your browser has location permissions.</p>
                </div>
            )}
            {location && nearbyOngoingClasses.length === 0 && (
                <div className="text-center py-10 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-slate-500 dark:text-slate-400">No ongoing classes found within {NEARBY_RADIUS_METERS} meters of your location.</p>
                </div>
            )}
            {location && nearbyOngoingClasses.length > 0 && (
                <ul className="space-y-4">
                    {nearbyOngoingClasses.map(lesson => {
                        const subject = getSubjectById(lesson.subjectId);
                        const lecturer = getLecturerById(lesson.lecturerId);
                        const room = getRoomById(lesson.roomId);
                        const building = room ? buildings.find(b => b.id === room.buildingId) : undefined;
                        const distance = room?.location ? calculateDistance(location.latitude, location.longitude, room.location.latitude, room.location.longitude) : null;

                        return (
                            <li key={lesson.id} className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-sm">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-bold text-lg text-[var(--color-primary)]">{subject?.name}</p>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            With <strong>{lecturer?.name}</strong> in room <strong>{room?.name}</strong> ({building?.name})
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                            Ends at {lesson.endTime}
                                        </p>
                                    </div>
                                    {distance !== null && (
                                        <div className="text-right flex-shrink-0">
                                            <p className="font-semibold text-slate-700 dark:text-slate-200">{Math.round(distance)}m away</p>
                                        </div>
                                    )}
                                </div>
                                {room?.location && (
                                    <a
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${room.location.latitude},${room.location.longitude}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="mt-2 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:underline"
                                    >
                                        <MapPinIcon className="w-4 h-4" /> Get Directions
                                    </a>
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

import type { ClassGeofence } from '../types';

/**
 * Calculates the great-circle distance between two GPS points on Earth
 * using the Haversine formula (returns distance in meters rounded to 1 decimal place).
 */
export function calculateHaversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6371e3; // Earth radius in meters
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
        Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
        Math.cos(phi1) * Math.cos(phi2) *
        Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c * 10) / 10;
}

/**
 * Promisified browser Geolocation API to capture live device coordinates
 * with high accuracy.
 */
export function getCurrentDeviceLocation(
    options: PositionOptions = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
): Promise<{ latitude: number; longitude: number; accuracy: number }> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined' || !navigator?.geolocation) {
            return reject(new Error('Geolocation is not supported by your browser or device.'));
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    accuracy: Math.round((position.coords.accuracy || 0) * 10) / 10
                });
            },
            (error) => {
                let msg = 'Failed to obtain device GPS location.';
                if (error.code === error.PERMISSION_DENIED) {
                    msg = 'Location permission was denied. Please allow location access in your browser settings to verify classroom presence.';
                } else if (error.code === error.POSITION_UNAVAILABLE) {
                    msg = 'GPS location is unavailable. Check that Location/GPS is turned on in your device settings.';
                } else if (error.code === error.TIMEOUT) {
                    msg = 'Location request timed out. Please retry outdoors or closer to a window.';
                }
                reject(new Error(msg));
            },
            options
        );
    });
}

const GEOFENCE_STORAGE_KEY_PREFIX = 'eduai_remedial_class_geofences_';

/**
 * Loads all configured class geofences for an institution from persistent storage.
 */
export function loadClassGeofences(institutionId: string = 'default'): ClassGeofence[] {
    try {
        const key = `${GEOFENCE_STORAGE_KEY_PREFIX}${institutionId || 'default'}`;
        const raw = localStorage.getItem(key);
        if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch (e) {
        console.error('[geofenceUtils] Error loading class geofences:', e);
    }
    return [];
}

/**
 * Saves or updates a classroom geofence.
 */
export function saveClassGeofence(geofence: ClassGeofence, institutionId: string = 'default'): ClassGeofence[] {
    const list = loadClassGeofences(institutionId);
    const existingIdx = list.findIndex(g => g.id === geofence.id || (g.courseId === geofence.courseId && (g.stream || '') === (geofence.stream || '')));
    
    let updated: ClassGeofence[];
    if (existingIdx >= 0) {
        updated = [...list];
        updated[existingIdx] = {
            ...updated[existingIdx],
            ...geofence,
            updatedAt: new Date().toISOString()
        };
    } else {
        const item: ClassGeofence = {
            ...geofence,
            id: geofence.id || `geofence_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            institutionId,
            radiusMeters: geofence.radiusMeters || 40,
            updatedAt: new Date().toISOString()
        };
        updated = [item, ...list];
    }

    try {
        const key = `${GEOFENCE_STORAGE_KEY_PREFIX}${institutionId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(updated));
    } catch (e) {
        console.error('[geofenceUtils] Error saving class geofence:', e);
    }

    return updated;
}

/**
 * Removes a class geofence.
 */
export function deleteClassGeofence(geofenceId: string, institutionId: string = 'default'): ClassGeofence[] {
    const list = loadClassGeofences(institutionId);
    const filtered = list.filter(g => g.id !== geofenceId);
    try {
        const key = `${GEOFENCE_STORAGE_KEY_PREFIX}${institutionId || 'default'}`;
        localStorage.setItem(key, JSON.stringify(filtered));
    } catch (e) {
        console.error('[geofenceUtils] Error deleting class geofence:', e);
    }
    return filtered;
}

/**
 * Finds the most specific geofence for a course/stream.
 */
export function findMatchingGeofence(
    geofences: ClassGeofence[],
    courseId?: string,
    className?: string,
    stream?: string
): ClassGeofence | null {
    if (!geofences || geofences.length === 0) return null;

    const sNorm = (stream || '').trim().toLowerCase();
    const cNorm = (className || '').trim().toLowerCase();

    // 1. Exact match on courseId + stream
    if (courseId && sNorm && sNorm !== 'all streams') {
        const match = geofences.find(g => g.courseId === courseId && (g.stream || '').trim().toLowerCase() === sNorm);
        if (match) return match;
    }

    // 2. Exact match on courseId (stream-agnostic or whole class)
    if (courseId) {
        const match = geofences.find(g => g.courseId === courseId);
        if (match) return match;
    }

    // 3. Match on className + stream
    if (cNorm && sNorm && sNorm !== 'all streams') {
        const match = geofences.find(g => (g.className || '').trim().toLowerCase() === cNorm && (g.stream || '').trim().toLowerCase() === sNorm);
        if (match) return match;
    }

    // 4. Match on className alone
    if (cNorm) {
        const match = geofences.find(g => (g.className || '').trim().toLowerCase() === cNorm);
        if (match) return match;
    }

    return null;
}

/**
 * Verifies live device location against the classroom's registered boundary.
 * Incorporates GPS accuracy tolerance to prevent false rejects indoors.
 */
export function verifyLocationAgainstGeofence(
    deviceLat: number,
    deviceLon: number,
    accuracy: number,
    geofence: ClassGeofence
): {
    withinBounds: boolean;
    distanceMeters: number;
    accuracyMeters: number;
    status: 'within_bounds' | 'out_of_bounds';
    message: string;
} {
    const distanceMeters = calculateHaversineDistance(
        deviceLat,
        deviceLon,
        geofence.latitude,
        geofence.longitude
    );

    const radius = geofence.radiusMeters || 40;
    // We provide a slight indoor accuracy buffer (up to 15m) if GPS has slight drift indoors
    const accuracyBuffer = Math.min(15, Math.max(0, accuracy - 10));
    const effectiveRadius = radius + accuracyBuffer;

    const withinBounds = distanceMeters <= effectiveRadius;

    if (withinBounds) {
        return {
            withinBounds: true,
            distanceMeters,
            accuracyMeters: accuracy,
            status: 'within_bounds',
            message: `Verified inside classroom! You are ${distanceMeters}m from ${geofence.locationName || geofence.className} (Allowed radius: ${radius}m).`
        };
    }

    return {
        withinBounds: false,
        distanceMeters,
        accuracyMeters: accuracy,
        status: 'out_of_bounds',
        message: `Out of Classroom Bounds! You are ${distanceMeters}m away from ${geofence.locationName || geofence.className}. Scans are restricted to a ${radius}m radius around the classroom.`
    };
}

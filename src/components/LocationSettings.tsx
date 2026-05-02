
import React, { useState, useEffect } from 'react';
import type { Institution } from '../types';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { MapIcon } from './icons/MapIcon';
import { MapPinIcon } from './icons/MapPinIcon';

import { findLocationCoordinates } from '../services/geminiService';

interface LocationSettingsProps {
    institution?: Institution | null;
    onSave: (institutionId: string, data: Partial<Omit<Institution, 'id'>>) => void;
}

export const LocationSettings: React.FC<LocationSettingsProps> = ({ institution, onSave }) => {
    const [latitude, setLatitude] = useState('');
    const [longitude, setLongitude] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
    const [error, setError] = useState<string | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResult, setSearchResult] = useState<{ address: string; uri?: string } | null>(null);


    useEffect(() => {
        if (institution?.location) {
            setLatitude(institution.location.latitude.toString());
            setLongitude(institution.location.longitude.toString());
        }
    }, [institution]);

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            setStatus('error');
            return;
        }

        setStatus('loading');
        setError(null);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setLatitude(position.coords.latitude.toFixed(6));
                setLongitude(position.coords.longitude.toFixed(6));
                setStatus('idle');
            },
            (err) => {
                switch (err.code) {
                    case err.PERMISSION_DENIED:
                        setError("You denied the request for Geolocation.");
                        break;
                    case err.POSITION_UNAVAILABLE:
                        setError("Location information is unavailable.");
                        break;
                    case err.TIMEOUT:
                        setError("The request to get user location timed out.");
                        break;
                    default:
                        setError("An unknown error occurred.");
                        break;
                }
                setStatus('error');
            }
        );
    };

    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) return;
        setStatus('loading');
        setError(null);
        setSearchResult(null);

        try {
            const result = await findLocationCoordinates(searchQuery);
            if (result) {
                setLatitude(result.latitude.toString());
                setLongitude(result.longitude.toString());
                setSearchResult({ address: result.address, uri: result.googleMapsUri });
                setStatus('idle');
            } else {
                setError("Could not find location. Please try a specific address or landmark.");
                setStatus('error');
            }
        } catch (err) {
            console.error(err);
            setError("Failed to search location. Please check your internet connection.");
            setStatus('error');
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSaveStatus('saving');
        setError(null);
        setStatus('idle');

        const lat = parseFloat(latitude);
        const lon = parseFloat(longitude);

        if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            setError("Please enter valid latitude (-90 to 90) and longitude (-180 to 180) values.");
            setStatus('error');
            setSaveStatus('idle');
            return;
        }
        
        setTimeout(() => {
            if (institution) {
                onSave(institution.id, { location: { latitude: lat, longitude: lon } });
            }
            setSaveStatus('saved');
            setTimeout(() => {
                setSaveStatus('idle');
            }, 2000);
        }, 500);
    };

    return (
        <section>
            <h3 className="text-xl font-semibold mb-4">Location Settings</h3>
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm space-y-6 max-w-2xl">
                <div>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                        Set your institution's coordinates. This allows the system to calculate distances between buildings and check proximity for attendance.
                    </p>
                </div>
                
                {status === 'error' && error && (
                    <div className="p-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-md text-sm">
                        {error}
                    </div>
                )}

                <div className="space-y-2">
                    <label htmlFor="location-search" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                        Search Location (Google Maps)
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="location-search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchLocation())}
                            className="shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder="e.g., University of Nairobi, Main Campus"
                        />
                        <button
                            type="button"
                            onClick={handleSearchLocation}
                            disabled={status === 'loading'}
                            className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-500 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                        >
                            {status === 'loading' ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                    {searchResult && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-2">
                            <CheckCircleIcon className="w-4 h-4" /> Found: {searchResult.address}
                            {searchResult.uri && (
                                <a href={searchResult.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
                                    <MapIcon className="w-3 h-3"/> View on Map
                                </a>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="latitude" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Latitude
                        </label>
                        <input 
                            type="number" 
                            id="latitude" 
                            step="any"
                            value={latitude}
                            onChange={(e) => setLatitude(e.target.value)}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder="-1.286389"
                        />
                    </div>
                     <div>
                        <label htmlFor="longitude" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                            Longitude
                        </label>
                        <input 
                            type="number" 
                            id="longitude" 
                            step="any"
                            value={longitude}
                            onChange={(e) => setLongitude(e.target.value)}
                            className="mt-1 shadow-sm focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)] block w-full sm:text-sm border-slate-300 rounded-md dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                            placeholder="36.817223"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap justify-between items-center gap-4">
                    <button
                        type="button"
                        onClick={handleGetLocation}
                        disabled={status === 'loading'}
                        className="inline-flex items-center px-4 py-2 border border-slate-300 dark:border-slate-500 text-sm font-medium rounded-md shadow-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] disabled:opacity-50"
                    >
                        <MapPinIcon className="w-4 h-4 mr-2"/>
                        {status === 'loading' ? 'Getting location...' : 'Use Current GPS'}
                    </button>
                     <button
                        type="submit"
                        className={`inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-primary)] transition-all duration-300 ${
                            saveStatus === 'saved'
                                ? 'bg-green-600 hover:bg-green-700'
                                : 'bg-[var(--color-primary)] hover:brightness-90'
                        }`}
                        disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                    >
                        {saveStatus === 'idle' && 'Save Location'}
                        {saveStatus === 'saving' && 'Saving...'}
                        {saveStatus === 'saved' && (
                            <>
                                <CheckCircleIcon className="w-5 h-5 mr-2" />
                                Saved!
                            </>
                        )}
                    </button>
                </div>
            </form>
        </section>
    );
};


import React, { useState, useEffect, useRef, useCallback } from 'react';
import { User, Institution, TeacherCheckInWithDetails, CheckInType, CheckInStatus } from '../types';
import { ClockIcon } from './icons/ClockIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';
import { XCircleIcon } from './icons/XCircleIcon';
import { BellIcon } from './icons/BellIcon';
import { MapPinIcon } from './icons/MapPinIcon';
import { CalendarDaysIcon } from './icons/CalendarDaysIcon';
import { QrCodeIcon } from './icons/QrCodeIcon';
import { CameraIcon } from './icons/CameraIcon';
import { PhotoIcon } from './icons/PhotoIcon';
import { PrinterIcon } from './icons/PrinterIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { apiService } from '../services/apiService';
import { calculateDistance } from '../utils/locationUtils';

export const printGateQrSignboard = (institutionName: string, institutionId: string) => {
    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
        alert('Please allow popups to print the Gate QR Signboard.');
        return;
    }
    const token = `school_gate_id:${institutionId}`;
    const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(token)}`;

    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8" />
            <title>${institutionName} - Gate Attendance QR Signboard</title>
            <style>
                @page { size: A4 portrait; margin: 15mm; }
                * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    margin: 0;
                    padding: 24px;
                    background: #ffffff;
                    color: #0f172a;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 90vh;
                }
                .sign-card {
                    border: 4px solid #1e293b;
                    border-radius: 28px;
                    padding: 40px 32px;
                    text-align: center;
                    max-width: 520px;
                    width: 100%;
                    box-shadow: 0 10px 25px rgba(0,0,0,0.06);
                }
                .school-title {
                    font-size: 14px;
                    font-weight: 900;
                    text-transform: uppercase;
                    color: #64748b;
                    letter-spacing: 1.5px;
                    margin-bottom: 6px;
                }
                .main-heading {
                    font-size: 22px;
                    font-weight: 900;
                    text-transform: uppercase;
                    color: #0f172a;
                    letter-spacing: 0.5px;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 12px;
                    margin-bottom: 16px;
                }
                .badge {
                    display: inline-block;
                    background: #eef2ff;
                    color: #4338ca;
                    border: 1px solid #c7d2fe;
                    padding: 6px 16px;
                    border-radius: 9999px;
                    font-size: 11px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 1px;
                    margin-bottom: 20px;
                }
                .qr-frame {
                    background: #ffffff;
                    border: 3px solid #cbd5e1;
                    border-radius: 20px;
                    padding: 16px;
                    display: inline-block;
                    margin-bottom: 20px;
                }
                .instructions {
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 16px;
                    padding: 14px 18px;
                    text-align: left;
                    font-size: 12px;
                    color: #334155;
                    line-height: 1.6;
                    margin-bottom: 16px;
                }
                .instructions ol {
                    margin: 4px 0 0 18px;
                    padding: 0;
                }
                .instructions li {
                    margin-bottom: 4px;
                    font-weight: 600;
                }
                .token-tag {
                    font-family: monospace;
                    font-size: 10px;
                    font-weight: bold;
                    color: #64748b;
                    background: #f1f5f9;
                    padding: 4px 10px;
                    border-radius: 6px;
                    display: inline-block;
                }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none !important; }
                }
            </style>
        </head>
        <body>
            <div class="sign-card">
                <div class="school-title">${institutionName}</div>
                <div class="main-heading">STAFF & TEACHER CHECK-IN</div>
                <div class="badge">OFFICIAL SCHOOL GATE ENTRANCE SIGNBOARD</div>
                
                <div class="qr-frame">
                    <img src="${qrSrc}" width="260" height="260" alt="Gate Attendance QR" style="display:block;" />
                </div>

                <div class="instructions">
                    <div style="font-weight:900;text-transform:uppercase;color:#0f172a;font-size:11px;margin-bottom:4px;letter-spacing:0.5px;">HOW TO CHECK IN:</div>
                    <ol>
                        <li>Open the EDUAI Portal or Mobile App on your device.</li>
                        <li>Navigate to <strong>Teacher Check-In</strong>.</li>
                        <li>Tap <strong>Scan Gate QR</strong> and point camera at this code.</li>
                    </ol>
                </div>

                <div>
                    <span class="token-tag">${token}</span>
                </div>
            </div>
            <div style="margin-top:20px;" class="no-print">
                <button onclick="window.print()" style="padding:10px 24px;background:#4338ca;color:#fff;border:none;border-radius:10px;font-weight:bold;cursor:pointer;font-size:14px;">Print Signboard Now</button>
            </div>
            <script>
                window.onload = function() {
                    setTimeout(function() { window.print(); }, 400);
                };
            </script>
        </body>
        </html>
    `);
    printWindow.document.close();
};


interface TeacherCheckInViewProps {
    currentUser?: User | null;
    currentInstitution?: Institution | null;
    onLogAction?: (action: string) => Promise<void> | void;
    showPrintGateQr?: boolean;
}

const TeacherCheckInView: React.FC<TeacherCheckInViewProps> = ({
    currentUser,
    currentInstitution,
    onLogAction,
    showPrintGateQr = false
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

    // Live Camera & Hardware QR Scanner States
    const scannerVideoRef = useRef<HTMLVideoElement | null>(null);
    const cameraStreamRef = useRef<MediaStream | null>(null);
    const qrFileInputRef = useRef<HTMLInputElement | null>(null);
    const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
    const [isProcessingCheckIn, setIsProcessingCheckIn] = useState(false);
    const [scanSuccessBadge, setScanSuccessBadge] = useState<string | null>(null);
    const [qrValidationError, setQrValidationError] = useState<string | null>(null);

    const teacherId = currentUser?.id || '';
    const institutionId = currentInstitution?.id || currentUser?.institutionId || '';

    const stopCamera = useCallback(() => {
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => {
                try { track.stop(); } catch (_) {}
            });
            cameraStreamRef.current = null;
        }
        if (scannerVideoRef.current) {
            try {
                scannerVideoRef.current.srcObject = null;
            } catch (_) {}
        }
        setCameraStream(null);
        setIsCameraActive(false);
    }, []);

    const startCamera = useCallback(async (facing: 'environment' | 'user' = 'environment') => {
        setCameraError(null);
        setIsCameraActive(false);

        // Terminate any previous media tracks before starting a new session
        if (cameraStreamRef.current) {
            cameraStreamRef.current.getTracks().forEach(track => {
                try { track.stop(); } catch (_) {}
            });
            cameraStreamRef.current = null;
        }

        try {
            if (typeof window !== 'undefined' && !window.isSecureContext && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
                throw new Error("Camera requires a secure HTTPS connection. Please use HTTPS.");
            }

            if (!navigator?.mediaDevices?.getUserMedia) {
                throw new Error("Camera API not supported or blocked in this browser. Please check browser permissions.");
            }

            let stream: MediaStream | null = null;

            // Strategy 1: Ideal facingMode with resolutions
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: facing },
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    },
                    audio: false
                });
            } catch (err1) {
                console.warn("Camera ideal constraint fallback triggered:", err1);
            }

            // Strategy 2: Simple facingMode constraint
            if (!stream) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: { facingMode: facing },
                        audio: false
                    });
                } catch (err2) {
                    console.warn("Camera facingMode fallback triggered:", err2);
                }
            }

            // Strategy 3: Ultimate universal video fallback (works on all webcams and laptops)
            if (!stream) {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }

            if (!stream) {
                throw new Error("Could not acquire video feed from device camera.");
            }

            cameraStreamRef.current = stream;
            setCameraStream(stream);
            setIsCameraActive(true);

            if (scannerVideoRef.current) {
                scannerVideoRef.current.srcObject = stream;
                scannerVideoRef.current.setAttribute('playsinline', 'true');
                scannerVideoRef.current.setAttribute('muted', 'true');
                scannerVideoRef.current.muted = true;
                scannerVideoRef.current.play().catch(e => console.warn('Video play warning:', e));
            }
        } catch (err: any) {
            console.error("Camera access failed:", err);
            let friendly = err?.message || "Could not activate camera.";
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                friendly = "Camera access denied. Please click the lock or camera icon in your browser address bar and allow Camera permission.";
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                friendly = "No camera hardware detected on this device.";
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                friendly = "Camera is currently in use by another tab or app. Please close other camera apps and retry.";
            } else if (err.name === 'OverconstrainedError') {
                friendly = "Requested camera sensor is not supported by your hardware.";
            }
            setCameraError(friendly);
            setIsCameraActive(false);
        }
    }, []);

    const toggleCameraFacing = useCallback(() => {
        setCameraFacingMode(prev => {
            const nextFacing = prev === 'environment' ? 'user' : 'environment';
            startCamera(nextFacing);
            return nextFacing;
        });
    }, [startCamera]);

    // Callback ref guaranteeing srcObject is immediately assigned when the video element mounts
    const handleScannerVideoRef = useCallback((node: HTMLVideoElement | null) => {
        scannerVideoRef.current = node;
        if (node && cameraStreamRef.current) {
            node.srcObject = cameraStreamRef.current;
            node.setAttribute('playsinline', 'true');
            node.setAttribute('muted', 'true');
            node.muted = true;
            node.play().catch(e => console.warn('Video play warning on ref mount:', e));
        }
    }, []);

    // Scanned Gate QR Code processor
    const processScannedGateCode = useCallback(async (rawCode: string) => {
        const trimmed = (rawCode || '').trim();
        if (!trimmed) return;

        const expectedToken = `school_gate_id:${institutionId}`;
        const isValidGate = (
            trimmed === expectedToken ||
            (institutionId && trimmed.includes(institutionId)) ||
            trimmed.startsWith('school_gate_id:')
        );

        if (!isValidGate) {
            setQrValidationError(`Invalid Gate QR: "${trimmed.slice(0, 28)}...". This code does not match the official school entrance gate.`);
            return;
        }

        // Official Gate QR verified! Process check-in
        setQrValidationError(null);
        setScanSuccessBadge(trimmed);
        setIsProcessingCheckIn(true);

        const hour = new Date().getHours();
        const shift: CheckInType = (hour >= 15) ? 'Afternoon' : 'Morning';

        try {
            await apiService.processTeacherCheckIn({
                teacher_id: teacherId,
                institution_id: institutionId,
                checkin_type: shift,
                location: 'School Gate (Hardware Scanned Entrance Signboard)',
                notes: `Gate Check-In Verified [${trimmed}]`
            });

            if (onLogAction) {
                await onLogAction(`Checked in via Gate QR Code Scan for ${shift} shift`);
            }

            setTimeout(() => {
                setScanningGateQr(false);
                stopCamera();
                loadTodayCheckIn();
            }, 1400);
        } catch (err: any) {
            setQrValidationError(err.message || 'Check-in failed. Please try again.');
            setIsProcessingCheckIn(false);
        }
    }, [institutionId, teacherId, onLogAction, stopCamera]);

    // Fallback: upload or capture image with QR code
    const handleQrPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const img = new Image();
            const objectUrl = URL.createObjectURL(file);
            img.src = objectUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });

            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Could not initialize canvas");
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(objectUrl);

            let detected: string | null = null;

            if ('BarcodeDetector' in window) {
                try {
                    const detector = new (window as any).BarcodeDetector({ formats: ['qr_code'] });
                    const barcodes = await detector.detect(canvas);
                    if (barcodes.length > 0) detected = barcodes[0].rawValue;
                } catch (_) {}
            }

            if (!detected && (window as any).jsQR) {
                const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const code = (window as any).jsQR(imgData.data, imgData.width, imgData.height);
                if (code) detected = code.data;
            }

            if (detected) {
                await processScannedGateCode(detected);
            } else {
                setQrValidationError("No QR code detected in the selected image. Please ensure the gate signboard is clear and well-lit.");
            }
        } catch (err: any) {
            console.error("Photo QR scan failed:", err);
            setQrValidationError("Failed to read image file. Please retry or scan with live camera.");
        } finally {
            if (e.target) e.target.value = '';
        }
    };

    // Manual gate pass 1-tap confirmation fallback
    const handleManualGateTokenCheckIn = async () => {
        if (!institutionId) {
            alert("School institution ID is not set.");
            return;
        }
        await processScannedGateCode(`school_gate_id:${institutionId}`);
    };

    // Gate QR Scanner loop: native BarcodeDetector with jsQR fallback and validation
    useEffect(() => {
        let scanInterval: any = null;
        let detector: any = null;
        let offscreenCanvas: HTMLCanvasElement | null = null;
        let jsQrScript: HTMLScriptElement | null = null;

        if (scanningGateQr) {
            setScanSuccessBadge(null);
            setQrValidationError(null);
            setIsProcessingCheckIn(false);
            setCameraFacingMode('environment'); // Always default to rear camera on open
            startCamera('environment');

            if ('BarcodeDetector' in window) {
                try {
                    detector = new (window as any).BarcodeDetector({
                        formats: ['qr_code', 'code_128', 'ean_13', 'data_matrix']
                    });
                } catch (e) {
                    console.warn('BarcodeDetector init warning:', e);
                }
            }

            if (!('BarcodeDetector' in window) && !(window as any).jsQR) {
                jsQrScript = document.createElement('script');
                jsQrScript.src = "https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js";
                jsQrScript.async = true;
                document.body.appendChild(jsQrScript);
            }

            offscreenCanvas = document.createElement('canvas');

            let lastScannedRaw = '';
            let lastScanTime = 0;

            scanInterval = setInterval(async () => {
                const video = scannerVideoRef.current;
                if (!video || video.readyState < 2) return;

                let detectedRaw: string | null = null;

                // Engine 1: Native BarcodeDetector
                if (detector) {
                    try {
                        const barcodes = await detector.detect(video);
                        if (barcodes && barcodes.length > 0 && barcodes[0].rawValue) {
                            detectedRaw = String(barcodes[0].rawValue).trim();
                        }
                    } catch (_) {}
                }

                // Engine 2: Canvas + jsQR Fallback
                if (!detectedRaw && (window as any).jsQR && offscreenCanvas) {
                    try {
                        const vw = video.videoWidth || 640;
                        const vh = video.videoHeight || 480;
                        offscreenCanvas.width = vw;
                        offscreenCanvas.height = vh;
                        const ctx = offscreenCanvas.getContext('2d');
                        if (ctx) {
                            ctx.drawImage(video, 0, 0, vw, vh);
                            const imgData = ctx.getImageData(0, 0, vw, vh);
                            const code = (window as any).jsQR(imgData.data, imgData.width, imgData.height, {
                                inversionAttempts: "dontInvert"
                            });
                            if (code && code.data) {
                                detectedRaw = String(code.data).trim();
                            }
                        }
                    } catch (_) {}
                }

                if (!detectedRaw) return;

                const now = Date.now();
                if (detectedRaw === lastScannedRaw && now - lastScanTime < 3000) {
                    return;
                }
                lastScannedRaw = detectedRaw;
                lastScanTime = now;

                await processScannedGateCode(detectedRaw);
            }, 120);
        } else {
            stopCamera();
        }

        return () => {
            if (scanInterval) clearInterval(scanInterval);
            if (jsQrScript && jsQrScript.parentNode) {
                jsQrScript.parentNode.removeChild(jsQrScript);
            }
            stopCamera();
        };
    }, [scanningGateQr, startCamera, stopCamera, processScannedGateCode]);

    // Clean up camera stream on unmount
    useEffect(() => {
        return () => {
            if (cameraStreamRef.current) {
                cameraStreamRef.current.getTracks().forEach(track => {
                    try { track.stop(); } catch (_) {}
                });
                cameraStreamRef.current = null;
            }
        };
    }, []);

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
                <div className="flex items-center gap-3">
                    {showPrintGateQr && (
                        <button
                            onClick={() => printGateQrSignboard(currentInstitution?.name || 'School Entrance', institutionId)}
                            className="flex items-center gap-2 px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 rounded-2xl shadow-sm transition-all font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98]"
                            title="Print Gate Attendance Signboard"
                        >
                            <PrinterIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                            Print Gate QR
                        </button>
                    )}
                    <button
                        onClick={() => setScanningGateQr(true)}
                        className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-2xl shadow-lg hover:shadow-indigo-150 transition-all font-black uppercase text-xs tracking-widest hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <QrCodeIcon className="w-5 h-5 text-white" />
                        Scan Gate QR
                    </button>
                </div>
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
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex flex-col items-center justify-center p-4">
                    {/* Hidden file input for photo fallback */}
                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        ref={qrFileInputRef}
                        onChange={handleQrPhotoUpload}
                    />

                    <div className="w-full max-w-md text-center flex flex-col items-center">
                        {/* Camera Facing & Status Pill */}
                        <div className="flex items-center justify-between w-full max-w-[340px] mb-3 px-2">
                            <span className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1 rounded-full">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                                {cameraFacingMode === 'environment' ? 'Rear Camera Active' : 'Front Camera Active'}
                            </span>
                            <button
                                type="button"
                                onClick={toggleCameraFacing}
                                className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-full text-[10px] font-bold transition-all"
                                title="Flip Camera Lens"
                            >
                                <ArrowPathIcon className="w-3.5 h-3.5 text-indigo-400" />
                                Flip Lens
                            </button>
                        </div>

                        {/* Video Viewfinder Box */}
                        <div className="relative aspect-square w-full max-w-[340px] bg-slate-950 rounded-3xl border-4 border-indigo-500/80 overflow-hidden mb-5 shadow-[0_0_60px_rgba(99,102,241,0.4)]">
                            <video
                                ref={handleScannerVideoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover"
                            />

                            {/* Corner Reticles */}
                            <div className="absolute inset-0 pointer-events-none p-6">
                                <div className="w-full h-full border-2 border-dashed border-indigo-400/40 rounded-2xl relative">
                                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                                </div>
                            </div>

                            {/* Scanning Laser Line */}
                            {!scanSuccessBadge && isCameraActive && (
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_#22d3ee] animate-[scan_2.4s_infinite]"></div>
                            )}

                            {/* Camera Initializing Overlay */}
                            {!isCameraActive && !cameraError && (
                                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                                    <CameraIcon className="w-12 h-12 text-indigo-400 animate-pulse mb-3" />
                                    <p className="text-white font-bold text-xs uppercase tracking-wider">Starting Hardware Camera...</p>
                                    <p className="text-slate-400 text-[10px] mt-1">Acquiring sensor feed...</p>
                                </div>
                            )}

                            {/* Camera Error Overlay */}
                            {cameraError && (
                                <div className="absolute inset-0 bg-slate-950/95 flex flex-col items-center justify-center p-5 text-center overflow-y-auto">
                                    <XCircleIcon className="w-10 h-10 text-red-500 mb-2 shrink-0" />
                                    <p className="text-white font-black text-xs uppercase tracking-wider mb-1">Camera Feed Unavailable</p>
                                    <p className="text-red-300 text-[11px] mb-4 max-w-[280px] leading-relaxed">{cameraError}</p>
                                    
                                    <div className="flex flex-col gap-2 w-full max-w-[240px]">
                                        <button
                                            type="button"
                                            onClick={() => startCamera(cameraFacingMode)}
                                            className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                        >
                                            Retry Camera
                                        </button>
                                        <button
                                            type="button"
                                            onClick={toggleCameraFacing}
                                            className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700"
                                        >
                                            Switch to {cameraFacingMode === 'environment' ? 'Front Camera' : 'Rear Camera'}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => qrFileInputRef.current?.click()}
                                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                                        >
                                            <PhotoIcon className="w-4 h-4" />
                                            Take / Upload QR Photo
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleManualGateTokenCheckIn}
                                            className="w-full py-2 bg-indigo-950 hover:bg-indigo-900 border border-indigo-700/60 text-indigo-200 rounded-xl text-[11px] font-bold transition-all"
                                        >
                                            Instant Gate Pass Check-In
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Valid Scan Verified Banner */}
                            {scanSuccessBadge && (
                                <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                                    <CheckCircleIcon className="w-16 h-16 text-emerald-400 mb-3 animate-bounce" />
                                    <h4 className="text-lg font-black text-white uppercase tracking-tight">Gate QR Verified!</h4>
                                    <p className="text-emerald-300 text-xs mt-1">
                                        {isProcessingCheckIn ? 'Recording attendance...' : 'Check-in confirmed!'}
                                    </p>
                                    <code className="mt-3 text-[10px] font-mono text-emerald-200/70 bg-emerald-900/60 px-3 py-1 rounded-full truncate max-w-[260px]">
                                        {scanSuccessBadge}
                                    </code>
                                </div>
                            )}
                        </div>

                        {/* QR Validation Error Banner */}
                        {qrValidationError && (
                            <div className="w-full max-w-[340px] bg-red-950/80 border border-red-500/50 rounded-2xl p-3 mb-4 text-left animate-shake">
                                <div className="flex items-start gap-2.5">
                                    <XCircleIcon className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-red-200">Scan Rejected</p>
                                        <p className="text-[11px] text-red-300 mt-0.5">{qrValidationError}</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        <h3 className="text-lg font-black text-white uppercase tracking-tight mb-1">Scan Official Gate Signboard</h3>
                        <p className="text-slate-400 font-medium text-xs mb-5 max-w-xs">
                            Point device camera at the printed QR signboard at the school entrance gate
                        </p>

                        {/* Alternative Controls & Fallbacks */}
                        <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
                            <button
                                type="button"
                                onClick={() => qrFileInputRef.current?.click()}
                                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-xl border border-slate-700 text-xs font-bold transition-all"
                            >
                                <PhotoIcon className="w-4 h-4 text-indigo-400" />
                                Snap / Upload Photo
                            </button>
                            <button
                                type="button"
                                onClick={handleManualGateTokenCheckIn}
                                className="px-4 py-2 bg-indigo-900/60 hover:bg-indigo-900 text-indigo-200 rounded-xl border border-indigo-700/50 text-xs font-bold transition-all"
                            >
                                Quick Gate Check-In
                            </button>
                        </div>

                        {/* Cancel Button */}
                        <div>
                            <button
                                type="button"
                                onClick={() => {
                                    setScanningGateQr(false);
                                    stopCamera();
                                }}
                                className="px-8 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                    <style>{`
                        @keyframes scan {
                            0% { transform: translateY(0); }
                            50% { transform: translateY(336px); }
                            100% { transform: translateY(0); }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
};

export default TeacherCheckInView;


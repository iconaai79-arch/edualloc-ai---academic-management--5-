
import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import Tesseract from 'tesseract.js';
import { XIcon } from './icons/XIcon';
import { CameraIcon } from './icons/CameraIcon';
import { ArrowPathIcon } from './icons/ArrowPathIcon';
import { CheckCircleIcon } from './icons/CheckCircleIcon';


interface LicensePlateScannerProps {
    onPlateDetected: (plate: string) => void;
    onClose: () => void;
}

export const LicensePlateScanner: React.FC<LicensePlateScannerProps> = ({ onPlateDetected, onClose }) => {
    const webcamRef = useRef<Webcam>(null);
    const [scanning, setScanning] = useState(true);
    const [capturedText, setCapturedText] = useState<string>('');
    const [confidence, setConfidence] = useState<number>(0);
    const [lastScannedImage, setLastScannedImage] = useState<string | null>(null);

    // Regex for standard Kenyan/Generic plates (e.g., KAA 123B, KBA 456C)
    // Adjust this regex based on your specific regional requirements
    const plateRegex = /[A-Z]{3}\s?\d{3}[A-Z]/; 

    const videoConstraints = {
        width: 720,
        height: 480,
        facingMode: "environment" // Use back camera on mobile
    };

    const capture = useCallback(() => {
        const imageSrc = webcamRef.current?.getScreenshot();
        return imageSrc;
    }, [webcamRef]);

    const processImage = async () => {
        if (!scanning) return;

        const imageSrc = capture();
        if (imageSrc) {
            setLastScannedImage(imageSrc);
            try {
                const result = await Tesseract.recognize(
                    imageSrc,
                    'eng',
                    { 
                        logger: m => {
                            // Optional: Log progress if needed
                            // console.log(m); 
                        } 
                    }
                );

                const text = result.data.text.toUpperCase();
                // Filter out noise and look for patterns
                const cleanText = text.replace(/[^A-Z0-9\s]/g, '');
                
                const match = cleanText.match(plateRegex);

                if (match) {
                    const detectedPlate = match[0];
                    setCapturedText(detectedPlate);
                    setConfidence(result.data.confidence);
                    
                    // If high confidence or matches pattern perfectly, auto-select
                    // For now, we let the user confirm visually
                    setScanning(false); 
                }
            } catch (err) {
                console.error("OCR Error:", err);
            }
        }
    };

    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (scanning) {
            interval = setInterval(() => {
                processImage();
            }, 2000); // Scan every 2 seconds to save resources
        }
        return () => clearInterval(interval);
    }, [scanning]);

    const handleRetake = () => {
        setScanning(true);
        setCapturedText('');
        setLastScannedImage(null);
    };

    const handleConfirm = () => {
        if (capturedText) {
            onPlateDetected(capturedText);
            onClose();
        }
    };

    // Simulation button for testing without a clear camera view of a plate
    const simulateScan = () => {
        const mockPlate = "KCB 456D";
        setCapturedText(mockPlate);
        setScanning(false);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-lg bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-700 relative">
                {/* Header */}
                <div className="p-4 flex justify-between items-center bg-slate-800">
                    <h3 className="text-white font-bold flex items-center gap-2">
                        <CameraIcon className="w-5 h-5 text-[var(--color-primary)]" />
                        Scan License Plate
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Camera Area */}
                <div className="relative bg-black aspect-video flex items-center justify-center overflow-hidden">
                    {scanning ? (
                        <>
                            <Webcam
                                audio={false}
                                ref={webcamRef}
                                screenshotFormat="image/jpeg"
                                videoConstraints={videoConstraints}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                            {/* Guide Box */}
                            <div className="absolute border-2 border-[var(--color-primary)] w-2/3 h-1/3 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full text-white text-xs font-bold mb-2 bg-black/50 px-2 py-1 rounded">
                                    Align Plate Here
                                </div>
                                {/* Scanning animation line */}
                                <div className="w-full h-0.5 bg-red-500 absolute top-0 animate-scan opacity-70"></div>
                            </div>
                        </>
                    ) : (
                        lastScannedImage && <img loading="lazy" src={lastScannedImage} alt="Captured" className="w-full h-full object-cover opacity-50" />
                    )}
                    
                    {!scanning && capturedText && (
                         <div className="absolute inset-0 flex items-center justify-center">
                             <div className="bg-white p-6 rounded-xl shadow-2xl text-center animate-bounce-in">
                                 <p className="text-sm text-slate-500 uppercase tracking-wider mb-1">Detected Plate</p>
                                 <p className="text-4xl font-black text-slate-900 border-4 border-slate-900 px-4 py-2 rounded mb-4 font-mono tracking-widest">
                                     {capturedText}
                                 </p>
                                 <div className="flex gap-3 justify-center">
                                     <button onClick={handleRetake} className="flex items-center gap-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-md text-slate-800 font-bold text-sm">
                                        <ArrowPathIcon className="w-4 h-4" /> Retake
                                     </button>
                                     <button onClick={handleConfirm} className="flex items-center gap-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-md text-white font-bold text-sm">
                                        <CheckCircleIcon className="w-4 h-4" /> Confirm
                                     </button>
                                 </div>
                             </div>
                         </div>
                    )}
                </div>

                {/* Footer / Controls */}
                <div className="p-4 bg-slate-800 text-center">
                    {scanning && (
                         <div className="space-y-3">
                            <p className="text-slate-400 text-sm">Point camera at vehicle front/rear. Ensure good lighting.</p>
                            <button onClick={simulateScan} className="text-xs text-blue-400 hover:underline">
                                (Dev: Simulate Scan)
                            </button>
                         </div>
                    )}
                </div>
            </div>
            <style>{`
                @keyframes scan {
                    0% { top: 0; }
                    50% { top: 100%; }
                    100% { top: 0; }
                }
                .animate-scan {
                    animation: scan 2s linear infinite;
                }
                .animate-bounce-in {
                    animation: bounceIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }
                @keyframes bounceIn {
                    0% { transform: scale(0.3); opacity: 0; }
                    50% { transform: scale(1.05); opacity: 1; }
                    70% { transform: scale(0.9); }
                    100% { transform: scale(1); }
                }
            `}</style>
        </div>
    );
};


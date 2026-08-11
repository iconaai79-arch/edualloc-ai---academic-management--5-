import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Download } from 'lucide-react';

interface PdfViewerProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
    src?: string;
    pdfDataUri?: string;
}

// Sub-component to render each individual page
const PageRenderer: React.FC<{ doc: any; pageNum: number; zoom: number }> = ({ doc, pageNum, zoom }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isVisible, setIsVisible] = useState(false);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [rendering, setRendering] = useState(true);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '600px 0px' } // Preload pages when within 600px of viewport
        );
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!isVisible || !doc) return;
        let active = true;
        
        const renderPage = async () => {
            setRendering(true);
            try {
                const page = await doc.getPage(pageNum);
                if (!active) return;
                const canvas = canvasRef.current;
                if (!canvas) return;
                const context = canvas.getContext('2d');
                if (!context) return;

                // Determine container width
                const containerWidth = containerRef.current?.clientWidth || canvas.parentElement?.clientWidth || 800;
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                
                // Calculate scale to fit page width into container, multiplied by zoom factor
                const baseScale = containerWidth / unscaledViewport.width;
                const scale = baseScale * zoom;
                const viewport = page.getViewport({ scale: Math.max(scale, 0.25) });

                // Set device pixel ratio for high DPI screens
                const dpr = window.devicePixelRatio || 1;
                canvas.width = viewport.width * dpr;
                canvas.height = viewport.height * dpr;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                context.scale(dpr, dpr);

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport
                };
                await page.render(renderContext).promise;
                if (active) setRendering(false);
            } catch (err: any) {
                console.error(`Error rendering page ${pageNum}:`, err);
                if (active) {
                    setRenderError(err.message || 'Render failed');
                    setRendering(false);
                }
            }
        };

        renderPage();

        return () => {
            active = false;
        };
    }, [doc, pageNum, isVisible, zoom]);

    return (
        <div 
            ref={containerRef}
            className="relative flex flex-col items-center justify-center p-2 mb-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm max-w-full overflow-hidden"
            style={{ 
                minHeight: '200px',
                aspectRatio: '1 / 1.414' // Standard A4 page ratio
            }}
        >
            {(!isVisible || rendering) && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 z-10 backdrop-blur-[1px]">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mb-2" />
                    {!isVisible && (
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Scrolling into view...</p>
                    )}
                </div>
            )}
            
            {isVisible && (
                <canvas ref={canvasRef} className="max-w-full h-auto rounded-2xl transition-transform duration-300" />
            )}
            
            {/* Page Floating Tag */}
            <span className="absolute top-4 right-4 bg-slate-900/60 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md backdrop-blur-md z-20">
                Page {pageNum}
            </span>

            {renderError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-500/10 p-4 text-center z-10">
                    <AlertCircle className="w-8 h-8 text-rose-500 mb-2" />
                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-wider">Page Render Failed</p>
                    <p className="text-[9px] text-rose-400 mt-1 max-w-xs">{renderError}</p>
                </div>
            )}
        </div>
    );
};

export const PdfViewer: React.FC<PdfViewerProps> = ({ src, pdfDataUri, className, title, style, ...otherProps }) => {
    const effectiveSrc = pdfDataUri || src || '';

    // Detect mobile WebView (Android/iOS)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window as any).Capacitor?.getPlatform() === 'android' || 
                     (window as any).Capacitor?.getPlatform() === 'ios';

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [loading, setLoading] = useState(isMobile);
    const [loadingError, setLoadingError] = useState<string | null>(null);
    const [zoom, setZoom] = useState<number>(1.0);

    useEffect(() => {
        if (!isMobile) return;

        let active = true;
        setLoading(true);
        setLoadingError(null);

        const loadPdfjsAndDocument = async () => {
            try {
                // Load PDF.js dynamically if not available
                if (!(window as any).pdfjsLib) {
                    const loadScript = (url: string) => {
                        return new Promise<void>((resolve, reject) => {
                            const script = document.createElement('script');
                            script.src = url;
                            script.async = true;
                            script.onload = () => resolve();
                            script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
                            document.body.appendChild(script);
                        });
                    };

                    let isLocalLoaded = false;
                    try {
                        await loadScript('/pdfjs/pdf.min.js');
                        isLocalLoaded = true;
                    } catch (e) {
                        console.warn("Local PDF.js script not found, falling back to CDN...", e);
                        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js');
                    }

                    const pdfjsLib = (window as any).pdfjsLib;
                    if (isLocalLoaded) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
                    } else {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    }
                } else {
                    const pdfjsLib = (window as any).pdfjsLib;
                    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
                        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs/pdf.worker.min.js';
                    }
                }

                const pdfjsLib = (window as any).pdfjsLib;

                // Load document (handle base64 vs normal url)
                let pdfData: any;
                if (src && src.startsWith('data:application/pdf;base64,')) {
                    const base64 = src.split(',')[1];
                    const binaryStr = atob(base64);
                    const len = binaryStr.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryStr.charCodeAt(i);
                    }
                    pdfData = { data: bytes };
                } else {
                    pdfData = { url: src };
                }

                const loadingTask = pdfjsLib.getDocument(pdfData);
                const doc = await loadingTask.promise;
                
                if (active) {
                    setPdfDoc(doc);
                    setNumPages(doc.numPages);
                    setLoading(false);
                }
            } catch (err: any) {
                console.error("Error initializing PDF viewer:", err);
                if (active) {
                    setLoadingError(err.message || 'Failed to parse PDF document.');
                    setLoading(false);
                }
            }
        };

        loadPdfjsAndDocument();

        return () => {
            active = false;
        };
    }, [effectiveSrc, isMobile]);

    const [objectUrl, setObjectUrl] = useState<string>('');

    useEffect(() => {
        if (!effectiveSrc) return;
        if (effectiveSrc.startsWith('data:application/pdf;base64,')) {
            try {
                const base64 = effectiveSrc.split(',')[1];
                const binaryStr = atob(base64);
                const len = binaryStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryStr.charCodeAt(i);
                }
                const blob = new Blob([bytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);
                setObjectUrl(url);
                return () => {
                    URL.revokeObjectURL(url);
                };
            } catch (err) {
                console.error("Failed to convert data URI to blob URL:", err);
                setObjectUrl(effectiveSrc);
            }
        } else {
            setObjectUrl(effectiveSrc);
        }
    }, [effectiveSrc]);

    // Desktop fallback: render standard iframe
    if (!isMobile) {
        return (
            <iframe
                src={objectUrl || effectiveSrc}
                className={className || "w-full h-full border-none"}
                title={title || "PDF Preview"}
                style={style}
                {...otherProps}
            />
        );
    }

    // Mobile rendering layout
    return (
        <div className={`w-full h-full flex flex-col bg-slate-50 dark:bg-slate-950 overflow-y-auto p-4 ${className || ''}`} style={style}>
            {loading ? (
                <div className="flex-1 flex flex-col items-center justify-center p-6 gap-3">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">Initializing PDF Previewer...</p>
                </div>
            ) : loadingError ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-100 dark:bg-slate-900/50 rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800">
                    <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">Unable to load preview</h4>
                    <p className="text-xs text-slate-400 mt-2 max-w-sm leading-relaxed">
                        The device webview failed to render this document preview. You can download the PDF to view it on your device.
                    </p>
                    <a
                        href={src}
                        download="Document.pdf"
                        className="mt-6 inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all"
                    >
                        <Download className="w-4 h-4" /> Download Document
                    </a>
                </div>
            ) : (
                <div className="flex-1 flex flex-col max-w-full">
                    {/* Header showing pages summary and zoom controls */}
                    <div className="flex justify-between items-center mb-4 px-2 bg-white dark:bg-slate-900 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
                        <div className="flex flex-col gap-0.5">
                            <span className="text-[9px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                                📑 {numPages} {numPages === 1 ? 'Page' : 'Pages'}
                            </span>
                            <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                Canvas Render Mode
                            </span>
                        </div>
                        
                        {/* Zoom Controls */}
                        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                            <button
                                onClick={() => setZoom(prev => Math.max(0.5, prev - 0.2))}
                                title="Zoom Out"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors font-black text-xs select-none"
                            >
                                −
                            </button>
                            <button
                                onClick={() => setZoom(1.0)}
                                title="Reset Zoom"
                                className="px-2 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors text-[9px] font-black uppercase tracking-wider select-none"
                            >
                                {Math.round(zoom * 100)}%
                            </button>
                            <button
                                onClick={() => setZoom(prev => Math.min(2.5, prev + 0.2))}
                                title="Zoom In"
                                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors font-black text-xs select-none"
                            >
                                +
                            </button>
                        </div>
                    </div>

                    {/* Scrollable list of pages */}
                    <div className="flex-1 overflow-x-hidden">
                        {Array.from(new Array(numPages), (el, index) => (
                            <PageRenderer
                                key={index}
                                doc={pdfDoc}
                                pageNum={index + 1}
                                zoom={zoom}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};


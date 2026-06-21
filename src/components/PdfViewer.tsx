import React, { useState, useEffect, useRef } from 'react';
import { Loader2, AlertCircle, Download } from 'lucide-react';

interface PdfViewerProps extends React.IframeHTMLAttributes<HTMLIFrameElement> {
    src: string;
}

// Sub-component to render each individual page
const PageRenderer: React.FC<{ doc: any; pageNum: number }> = ({ doc, pageNum }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [renderError, setRenderError] = useState<string | null>(null);
    const [rendering, setRendering] = useState(true);

    useEffect(() => {
        let active = true;
        const renderPage = async () => {
            if (!doc || !canvasRef.current) return;
            setRendering(true);
            try {
                const page = await doc.getPage(pageNum);
                if (!active) return;
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');
                if (!context) return;

                // Fit to container width (default to 800 if clientWidth is 0)
                const containerWidth = canvas.parentElement?.clientWidth || 800;
                const unscaledViewport = page.getViewport({ scale: 1.0 });
                const scale = containerWidth / unscaledViewport.width;
                const viewport = page.getViewport({ scale: Math.max(scale, 0.5) });

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
    }, [doc, pageNum]);

    return (
        <div className="relative flex flex-col items-center justify-center p-2 mb-6 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm max-w-full overflow-hidden min-h-[150px]">
            {rendering && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 z-10 backdrop-blur-[1px]">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                </div>
            )}
            <canvas ref={canvasRef} className="max-w-full h-auto rounded-2xl" />
            
            {/* Page Floating Tag */}
            <span className="absolute top-4 right-4 bg-slate-900/60 text-white text-[8px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md backdrop-blur-md">
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

export const PdfViewer: React.FC<PdfViewerProps> = ({ src, className, title, style, ...otherProps }) => {
    // Detect mobile WebView (Android/iOS)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                     (window as any).Capacitor?.getPlatform() === 'android' || 
                     (window as any).Capacitor?.getPlatform() === 'ios';

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [loading, setLoading] = useState(isMobile);
    const [loadingError, setLoadingError] = useState<string | null>(null);

    useEffect(() => {
        if (!isMobile) return;

        let active = true;
        setLoading(true);
        setLoadingError(null);

        const loadPdfjsAndDocument = async () => {
            try {
                // Load PDF.js from CDN dynamically if not available
                if (!(window as any).pdfjsLib) {
                    await new Promise<void>((resolve, reject) => {
                        const script = document.createElement('script');
                        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
                        script.async = true;
                        script.onload = () => resolve();
                        script.onerror = () => reject(new Error('PDF Engine network loading failed.'));
                        document.body.appendChild(script);
                    });
                }

                const pdfjsLib = (window as any).pdfjsLib;
                pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

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
    }, [src, isMobile]);

    // Desktop fallback: render standard iframe
    if (!isMobile) {
        return (
            <iframe
                src={src}
                className={className}
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
                    {/* Header showing pages summary */}
                    <div className="flex justify-between items-center mb-4 px-2">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            📑 {numPages} {numPages === 1 ? 'Page' : 'Pages'}
                        </span>
                        <span className="text-[8px] font-black text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Interactive Canvas Mode
                        </span>
                    </div>

                    {/* Scrollable list of pages */}
                    <div className="flex-1 overflow-x-hidden">
                        {Array.from(new Array(numPages), (el, index) => (
                            <PageRenderer
                                key={index}
                                doc={pdfDoc}
                                pageNum={index + 1}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
    splitSqlStatements, 
    analyzeSqlScript, 
    executeBatchSqlImport, 
    SqlAnalysisStats, 
    SqlImportProgress, 
    SqlImportLogEntry, 
    SqlImportResult 
} from '../../utils/sqlImporter';
import { XIcon } from '../icons/XIcon';
import { ArrowPathIcon } from '../icons/ArrowPathIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { CommandLineIcon } from '../icons/CommandLineIcon';
import { ArrowUpTrayIcon } from '../icons/ArrowUpTrayIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { ShieldIcon } from '../icons/ShieldIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { Database, AlertCircle, FileCode, Play, StopCircle, RefreshCw, Copy, Download } from 'lucide-react';

interface FullSqlImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (result: SqlImportResult) => void;
    initialSql?: string;
}

export const FullSqlImportModal: React.FC<FullSqlImportModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    initialSql = ''
}) => {
    const [inputMode, setInputMode] = useState<'upload' | 'paste'>('upload');
    const [rawSql, setRawSql] = useState<string>(initialSql);
    const [fileName, setFileName] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<number>(0);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Analysis
    const [analysis, setAnalysis] = useState<{ statements: string[]; stats: SqlAnalysisStats } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Execution Configuration
    const [continueOnError, setContinueOnError] = useState(true);
    const [batchSize, setBatchSize] = useState<number>(30);
    const [confirmationCode, setConfirmationCode] = useState('');
    const [isConfirmed, setIsConfirmed] = useState(false);

    // Execution State
    const [isExecuting, setIsExecuting] = useState(false);
    const [progress, setProgress] = useState<SqlImportProgress | null>(null);
    const [logs, setLogs] = useState<SqlImportLogEntry[]>([]);
    const [result, setResult] = useState<SqlImportResult | null>(null);
    const [copiedLog, setCopiedLog] = useState(false);
    const logContainerRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Trigger analysis when rawSql changes
    useEffect(() => {
        if (!rawSql || rawSql.trim().length === 0) {
            setAnalysis(null);
            return;
        }

        setIsAnalyzing(true);
        const timer = setTimeout(() => {
            try {
                const analyzed = analyzeSqlScript(rawSql);
                setAnalysis(analyzed);
            } catch (e) {
                console.error("SQL script analysis failed:", e);
            } finally {
                setIsAnalyzing(false);
            }
        }, 150);

        return () => clearTimeout(timer);
    }, [rawSql]);

    // Auto-scroll logs
    useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    if (!isOpen) return null;

    const handleFileSelect = (file: File) => {
        if (!file) return;
        setFileName(file.name);
        setFileSize(file.size);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = (e.target?.result as string) || '';
            setRawSql(text);
        };
        reader.readAsText(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleStartImport = async () => {
        if (!analysis || analysis.statements.length === 0) return;
        if (!isConfirmed && confirmationCode.trim().toUpperCase() !== 'IMPORT') {
            alert('Please type IMPORT or check the confirmation box to proceed.');
            return;
        }

        setIsExecuting(true);
        setResult(null);
        setLogs([]);
        setProgress({
            currentBatch: 0,
            totalBatches: Math.ceil(analysis.statements.length / batchSize),
            executedStatements: 0,
            failedStatements: 0,
            totalStatements: analysis.statements.length,
            percent: 0,
            currentStatementSnippet: 'Preparing database connection pool...'
        });

        const abortController = new AbortController();
        abortControllerRef.current = abortController;

        try {
            const importRes = await executeBatchSqlImport({
                statements: analysis.statements,
                batchSize,
                continueOnError,
                signal: abortController.signal,
                onProgress: (p) => setProgress(p),
                onLog: (l) => setLogs((prev) => [...prev, l])
            });

            setResult(importRes);
            if (onSuccess) {
                onSuccess(importRes);
            }
        } catch (err: any) {
            console.error("SQL Import execution error:", err);
            setLogs((prev) => [
                ...prev,
                {
                    id: Math.random().toString(36),
                    timestamp: new Date().toLocaleTimeString(),
                    type: 'error',
                    message: `Critical import failure: ${err?.message || err}`
                }
            ]);
        } finally {
            setIsExecuting(false);
            abortControllerRef.current = null;
        }
    };

    const handleCancelImport = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            setIsExecuting(false);
        }
    };

    const handleReset = () => {
        setRawSql('');
        setFileName(null);
        setFileSize(0);
        setAnalysis(null);
        setResult(null);
        setProgress(null);
        setLogs([]);
        setConfirmationCode('');
        setIsConfirmed(false);
    };

    const handleCopyLog = () => {
        const text = logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.details || ''}`).join('\n');
        navigator.clipboard.writeText(text);
        setCopiedLog(true);
        setTimeout(() => setCopiedLog(false), 2000);
    };

    const handleDownloadLog = () => {
        const text = [
            `========================================================================`,
            `EduAI Automation - Database SQL Import Execution Log`,
            `Generated At: ${new Date().toISOString()}`,
            `Source File : ${fileName || 'Pasted SQL Buffer'}`,
            `Total Statements: ${result?.totalStatements || 0}`,
            `Executed: ${result?.executedCount || 0}`,
            `Failed: ${result?.failedCount || 0}`,
            `Duration: ${((result?.durationMs || 0) / 1000).toFixed(2)}s`,
            `========================================================================\n`,
            ...logs.map((l) => `[${l.timestamp}] [${l.type.toUpperCase()}] ${l.message} ${l.details ? `\n  Details: ${l.details}` : ''}`)
        ].join('\n');

        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sql_import_log_${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const canSubmit = analysis && analysis.statements.length > 0 && !isExecuting && (isConfirmed || confirmationCode.trim().toUpperCase() === 'IMPORT');

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
            <div className="relative w-full max-w-5xl my-8 bg-slate-900 border border-slate-800 rounded-[2.5rem] shadow-2xl text-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
                
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-800/80 flex items-center justify-between bg-slate-900/90 sticky top-0 z-20 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg shadow-indigo-600/10">
                            <Database className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-xl font-black text-white tracking-tight">Full Database SQL Importer</h3>
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    Super Admin Vault
                                </span>
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                                Import full PostgreSQL database backups, idempotent table records, or multi-statement schema DDL scripts.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={isExecuting}
                        className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-30"
                    >
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-8 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

                    {/* Mode Tabs (Only when not executing) */}
                    {!isExecuting && !result && (
                        <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800/80 w-fit">
                            <button
                                onClick={() => setInputMode('upload')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    inputMode === 'upload'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <ArrowUpTrayIcon className="w-4 h-4" /> Upload .sql File
                            </button>
                            <button
                                onClick={() => setInputMode('paste')}
                                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
                                    inputMode === 'paste'
                                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                        : 'text-slate-400 hover:text-slate-200'
                                }`}
                            >
                                <CommandLineIcon className="w-4 h-4" /> Paste Raw SQL Script
                            </button>
                        </div>
                    )}

                    {/* Upload Mode Area */}
                    {!isExecuting && !result && inputMode === 'upload' && (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                            className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all ${
                                isDragging
                                    ? 'border-indigo-400 bg-indigo-500/10 scale-[1.01]'
                                    : 'border-slate-700/80 hover:border-indigo-500/60 bg-slate-950/40 hover:bg-slate-950/70'
                            }`}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".sql,text/plain"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        handleFileSelect(e.target.files[0]);
                                    }
                                }}
                                className="hidden"
                            />
                            <div className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                                <ArrowUpTrayIcon className="w-8 h-8 animate-pulse" />
                            </div>
                            <h4 className="text-base font-bold text-white mb-1">
                                {fileName ? `Selected: ${fileName}` : 'Choose or drop your .sql file here'}
                            </h4>
                            <p className="text-xs text-slate-400 max-w-md mx-auto">
                                Supports PostgreSQL dump files, EduAI full platform backups, or custom migration scripts (.sql).
                            </p>
                            {fileName && (
                                <div className="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-mono">
                                    <span>{(fileSize / 1024).toFixed(1)} KB</span>
                                    <span>•</span>
                                    <span className="text-indigo-400 font-bold">{analysis?.stats.totalStatements || 0} statements detected</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Paste Mode Area */}
                    {!isExecuting && !result && inputMode === 'paste' && (
                        <div className="space-y-3">
                            <div className="flex justify-between items-center px-1">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                                    Raw PostgreSQL Script
                                </label>
                                <span className="text-xs text-slate-500 font-mono">
                                    {rawSql.length.toLocaleString()} characters ({analysis?.stats.totalStatements || 0} statements)
                                </span>
                            </div>
                            <textarea
                                value={rawSql}
                                onChange={(e) => setRawSql(e.target.value)}
                                placeholder="-- Paste PostgreSQL script here (e.g. INSERT INTO public.users ... ON CONFLICT DO UPDATE; or CREATE TABLE ...;)"
                                rows={10}
                                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-xs text-indigo-300 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-y"
                            />
                        </div>
                    )}

                    {/* Analysis Summary Badge & Breakdown */}
                    {analysis && analysis.statements.length > 0 && !result && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-3xl p-6 space-y-5 animate-fade-in">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                        <CheckCircleIcon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Parsed SQL Structure</h4>
                                        <p className="text-[11px] text-slate-400">
                                            {analysis.stats.totalStatements.toLocaleString()} executable statements identified across {analysis.stats.detectedTables.length} tables.
                                        </p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-bold">
                                    {(analysis.stats.totalBytes / 1024).toFixed(1)} KB
                                </span>
                            </div>

                            {/* Stat Tiles */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Statements</p>
                                    <p className="text-xl font-black text-white mt-0.5">{analysis.stats.totalStatements.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">DML Inserts / Rows</p>
                                    <p className="text-xl font-black text-emerald-300 mt-0.5">{analysis.stats.dmlCount.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-indigo-400">DDL Schema Rules</p>
                                    <p className="text-xl font-black text-indigo-300 mt-0.5">{analysis.stats.ddlCount.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-900/90 border border-slate-800/80 p-3 rounded-2xl">
                                    <p className="text-[10px] font-black uppercase tracking-wider text-amber-400">Transactions / Other</p>
                                    <p className="text-xl font-black text-amber-300 mt-0.5">{analysis.stats.transactionCount + analysis.stats.otherCount}</p>
                                </div>
                            </div>

                            {/* Detected Tables Tags */}
                            {analysis.stats.detectedTables.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Target Tables ({analysis.stats.detectedTables.length}):
                                    </label>
                                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto custom-scrollbar p-1">
                                        {analysis.stats.detectedTables.map((tbl) => (
                                            <span
                                                key={tbl}
                                                className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-lg font-mono text-[11px] text-slate-300"
                                            >
                                                {tbl}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Script Preview Snippets */}
                            {analysis.stats.previewStatements.length > 0 && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        Script Preview (First {analysis.stats.previewStatements.length} Statements):
                                    </label>
                                    <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-800 text-indigo-300 font-mono text-[11px] space-y-1 overflow-x-auto">
                                        {analysis.stats.previewStatements.map((snippet, idx) => (
                                            <div key={idx} className="truncate">
                                                <span className="text-slate-600 select-none mr-2">{idx + 1}.</span>
                                                {snippet};
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Execution Controls & Safety Safeguards (when not executing and not completed) */}
                    {!isExecuting && !result && analysis && analysis.statements.length > 0 && (
                        <div className="bg-slate-950/90 border border-slate-800 rounded-3xl p-6 space-y-6">
                            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                                <ShieldIcon className="w-4 h-4 text-amber-400" />
                                Execution Configuration & Safeguards
                            </h4>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                    <div>
                                        <p className="text-xs font-bold text-white">Continue on Non-Fatal Errors</p>
                                        <p className="text-[10px] text-slate-400">Log errors and continue importing subsequent statements</p>
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={continueOnError}
                                        onChange={(e) => setContinueOnError(e.target.checked)}
                                        className="w-5 h-5 accent-indigo-600 rounded cursor-pointer"
                                    />
                                </div>

                                <div className="flex items-center justify-between p-4 bg-slate-900 rounded-2xl border border-slate-800">
                                    <div>
                                        <p className="text-xs font-bold text-white">Batch Execution Size</p>
                                        <p className="text-[10px] text-slate-400">Number of statements processed per serverless request</p>
                                    </div>
                                    <select
                                        value={batchSize}
                                        onChange={(e) => setBatchSize(Number(e.target.value))}
                                        className="bg-slate-950 border border-slate-700 text-xs rounded-xl px-3 py-1.5 text-white font-mono"
                                    >
                                        <option value={10}>10 stmts/batch</option>
                                        <option value={25}>25 stmts/batch</option>
                                        <option value={50}>50 stmts/batch</option>
                                        <option value={100}>100 stmts/batch</option>
                                    </select>
                                </div>
                            </div>

                            {/* Safety Confirmation */}
                            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-amber-200">Production Database Safety Guard</p>
                                        <p className="text-[11px] text-amber-300/80">
                                            This directly executes SQL statements on the production database. Ensure backups are current before executing.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <input
                                        type="text"
                                        placeholder="Type IMPORT to confirm"
                                        value={confirmationCode}
                                        onChange={(e) => setConfirmationCode(e.target.value)}
                                        className="px-3 py-2 bg-slate-950 border border-slate-700 text-xs rounded-xl text-white font-mono placeholder:text-slate-600 uppercase tracking-widest focus:outline-none focus:border-amber-400"
                                    />
                                    <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer whitespace-nowrap">
                                        <input
                                            type="checkbox"
                                            checked={isConfirmed}
                                            onChange={(e) => setIsConfirmed(e.target.checked)}
                                            className="w-4 h-4 accent-amber-500 rounded"
                                        />
                                        Confirm
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Active Execution Dashboard */}
                    {(isExecuting || progress) && (
                        <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 space-y-4 animate-fade-in">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    {isExecuting ? (
                                        <ArrowPathIcon className="w-5 h-5 text-indigo-400 animate-spin" />
                                    ) : (
                                        <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                                    )}
                                    <div>
                                        <h4 className="text-sm font-bold text-white">
                                            {isExecuting ? 'Executing SQL Import...' : 'Import Execution Complete'}
                                        </h4>
                                        <p className="text-xs text-slate-400 font-mono">
                                            Batch {progress?.currentBatch || 0} of {progress?.totalBatches || 0} • {progress?.executedStatements || 0} statements executed
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className="text-lg font-black text-indigo-400 font-mono">
                                        {progress?.percent || 0}%
                                    </span>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 via-sky-400 to-emerald-400 rounded-full transition-all duration-300"
                                    style={{ width: `${Math.max(2, progress?.percent || 0)}%` }}
                                />
                            </div>

                            {/* Live Console Output */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                                        <CommandLineIcon className="w-3.5 h-3.5" />
                                        Live Execution Stream
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={handleCopyLog}
                                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                            {copiedLog ? <CheckIcon className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                                            {copiedLog ? 'Copied' : 'Copy'}
                                        </button>
                                        <button
                                            onClick={handleDownloadLog}
                                            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                        >
                                            <Download className="w-3 h-3" /> Log
                                        </button>
                                    </div>
                                </div>

                                <div
                                    ref={logContainerRef}
                                    className="h-56 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-[11px] overflow-y-auto space-y-1.5 custom-scrollbar"
                                >
                                    {logs.map((log) => {
                                        const color =
                                            log.type === 'error'
                                                ? 'text-red-400'
                                                : log.type === 'warning'
                                                ? 'text-amber-400'
                                                : log.type === 'success'
                                                ? 'text-emerald-400'
                                                : 'text-slate-300';
                                        return (
                                            <div key={log.id} className="leading-relaxed">
                                                <span className="text-slate-600 select-none mr-2">[{log.timestamp}]</span>
                                                <span className={color}>{log.message}</span>
                                                {log.details && (
                                                    <div className="text-slate-500 pl-6 text-[10px]">{log.details}</div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Completion Summary Card */}
                    {result && (
                        <div className={`p-6 rounded-3xl border ${
                            result.success
                                ? 'bg-emerald-950/30 border-emerald-500/30'
                                : 'bg-amber-950/30 border-amber-500/30'
                        } space-y-4 animate-fade-in`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                                        result.success ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                                    }`}>
                                        {result.success ? <CheckCircleIcon className="w-6 h-6" /> : <ExclamationTriangleIcon className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <h4 className="text-base font-bold text-white">
                                            {result.success ? 'SQL Import Completed Successfully' : 'SQL Import Completed with Warnings'}
                                        </h4>
                                        <p className="text-xs text-slate-400">
                                            Processed {result.totalStatements.toLocaleString()} statements in {(result.durationMs / 1000).toFixed(2)} seconds.
                                        </p>
                                    </div>
                                </div>
                                <span className={`px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider ${
                                    result.success ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                                }`}>
                                    {result.success ? '100% Success' : `${result.failedCount} Errors Skipped`}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Executed</span>
                                    <p className="text-lg font-black text-emerald-400">{result.executedCount.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Errors/Skipped</span>
                                    <p className="text-lg font-black text-amber-400">{result.failedCount.toLocaleString()}</p>
                                </div>
                                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Duration</span>
                                    <p className="text-lg font-black text-slate-200 font-mono">{(result.durationMs / 1000).toFixed(1)}s</p>
                                </div>
                                <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">Tables Touched</span>
                                    <p className="text-lg font-black text-indigo-400">{result.affectedTables.length}</p>
                                </div>
                            </div>

                            {/* Error Details Breakdown if any */}
                            {result.errors.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-amber-400">
                                        Error / Warning Details ({result.errors.length}):
                                    </label>
                                    <div className="max-h-36 overflow-y-auto space-y-2 custom-scrollbar p-1">
                                        {result.errors.slice(0, 10).map((err, idx) => (
                                            <div key={idx} className="p-2.5 bg-slate-900/90 rounded-xl border border-red-500/20 text-xs font-mono">
                                                <div className="text-red-400 font-bold">
                                                    Stmt #{err.statementIndex}: {err.error} {err.code ? `(Code: ${err.code})` : ''}
                                                </div>
                                                <div className="text-slate-400 text-[10px] truncate mt-1">
                                                    {err.statementSnippet}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="px-8 py-5 border-t border-slate-800/80 bg-slate-900/90 flex flex-wrap items-center justify-between gap-4 sticky bottom-0 z-20 backdrop-blur-md">
                    <div className="flex items-center gap-2">
                        {result ? (
                            <button
                                onClick={handleReset}
                                className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-wider transition-all"
                            >
                                Import Another Script
                            </button>
                        ) : (
                            <button
                                onClick={handleReset}
                                disabled={isExecuting || !rawSql}
                                className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-all disabled:opacity-30"
                            >
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        {isExecuting ? (
                            <button
                                onClick={handleCancelImport}
                                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg shadow-red-600/30"
                            >
                                <StopCircle className="w-4 h-4" /> Stop Import
                            </button>
                        ) : result ? (
                            <>
                                <button
                                    onClick={() => window.location.reload()}
                                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/30"
                                >
                                    <RefreshCw className="w-4 h-4" /> Reload Platform Data
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Close Console
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={onClose}
                                    className="px-6 py-3 rounded-2xl text-slate-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleStartImport}
                                    disabled={!canSubmit}
                                    className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/40 disabled:opacity-40 disabled:pointer-events-none active:scale-95"
                                >
                                    <Play className="w-4 h-4 fill-white" />
                                    <span>Execute Full SQL Import ({analysis?.stats.totalStatements || 0})</span>
                                </button>
                            </>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

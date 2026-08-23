import React, { useState, useMemo } from 'react';
import type { User, Institution } from '../../types';
import { apiService } from '../../services/apiService';
import { SearchIcon } from '../icons/SearchIcon';
import { Trash2Icon } from '../icons/Trash2Icon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { XIcon } from '../icons/XIcon';
import { EyeIcon } from '../icons/EyeIcon';
import { CalendarDaysIcon } from '../icons/CalendarDaysIcon';
import { PencilIcon } from '../icons/PencilIcon';
import { ClockIcon } from '../icons/ClockIcon';

export interface ReceiptBatch {
    id: string; description: string; totalValue: number; noOfRecords: number;
    addedOn: string; addedBy: string; receiptIds: string[];
    status: 'active' | 'reversed'; createdAt?: string; reversedAt?: string; reversedBy?: string;
}
interface Props { receipts: any[]; students: User[]; institution: Institution; currentUserName?: string; onRefreshData?: () => Promise<void>; }
const pm = (a: any): number => { if (!a && a !== 0) return 0; if (typeof a === 'number') return a; const n = parseFloat(String(a).replace(/[^0-9.-]/g,'')); return isNaN(n)?0:n; };
const sd = (r: any): string|null => {
    if (!r && r !== 0) return null;
    if (r instanceof Date) return isNaN(r.getTime())?null:r.toISOString().split('T')[0];
    if (typeof r==='number'){if(r<1||r>200000)return null;const u=new Date(Date.UTC(1899,11,30)+Math.round(r)*86400000);return isNaN(u.getTime())?null:u.toISOString().split('T')[0];}
    const s=String(r).trim();if(!s||s==='0001-01-01')return null;
    const m=s.match(/^\+?(\d{5,})-(\d{1,2})-(\d{1,2})/);if(m){const n=parseInt(m[1],10);if(n>1&&n<200000){const u=new Date(Date.UTC(1899,11,30)+n*86400000);if(!isNaN(u.getTime()))return u.toISOString().split('T')[0];}}
    return null;
};
const fd=(s?:string):string=>{if(!s||s==='0001-01-01')return '—';const fx=sd(s);const v=fx||s;try{const d=new Date(v);if(!isNaN(d.getTime())&&d.getFullYear()>1970&&d.getFullYear()<2100)return d.toLocaleDateString('en-US',{month:'short',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:true});}catch{}return v.split('T')[0]||'—';};
export const ReceiptHistoryManager: React.FC<Props> = ({ receipts, students, institution, currentUserName='Finance Officer', onRefreshData }) => {
    const [sq,setSq]=useState(''); const [sf,setSf]=useState<'all'|'active'|'reversed'>('all');
    const [sel,setSel]=useState<Set<string>>(new Set()); const [btu,setBtu]=useState<ReceiptBatch|null>(null);
    const [undo,setUndo]=useState(false); const [msg,setMsg]=useState<string|null>(null);
    const [vb,setVb]=useState<ReceiptBatch|null>(null); const [bed,setBed]=useState<ReceiptBatch|null>(null);
    const [nbd,setNbd]=useState(''); const [sbd,setSbd]=useState(false);
    const [red,setRed]=useState<any|null>(null); const [nrd,setNrd]=useState(''); const [srd,setSrd]=useState(false);

    const stMap=useMemo(()=>{const m=new Map<string,User>();(students||[]).forEach(s=>{if(s?.id)m.set(s.id,s);});return m;},[students]);

    const [pb,setPb]=useState<ReceiptBatch[]>(()=>{
        try{const s=localStorage.getItem('eduai_receipt_batches_'+(institution?.id));if(s){const p=JSON.parse(s);if(Array.isArray(p))return p;}}catch{}
        return [];
    });

    const save=(b:ReceiptBatch[])=>{
        setPb(b);
        try{const id=institution?.id;if(id){localStorage.setItem('eduai_receipt_batches_'+id,JSON.stringify(b));apiService.saveModuleRecord('institution_module_states',{institution_id:id,module_id:'receipt_batches_history',state_data:b,updated_at:new Date().toISOString()}).catch(()=>{});}}
        catch{}
    };

    const allB=useMemo<ReceiptBatch[]>(()=>{
        const rm=new Map<string,any>();(receipts||[]).forEach(r=>{if(r?.id)rm.set(r.id,r);});
        const res:ReceiptBatch[]=[]; const done=new Set<string>();
        pb.forEach(b=>{
            const ex=b.receiptIds.filter(id=>rm.has(id)); const rcs=ex.map(id=>rm.get(id)!);
            ex.forEach(id=>done.add(id));
            if(b.status==='reversed'){res.push(b);}else if(ex.length>0){
                const tv=rcs.reduce((s,r)=>s+pm(r.amountPaid??r.amount_paid??r.amount??0),0);
                res.push({...b,totalValue:tv,noOfRecords:ex.length,receiptIds:ex});}
        });
        const grps=new Map<string,{desc:string;addedOn:string;recs:any[]}>();
        (receipts||[]).forEach(r=>{
            if(done.has(r.id))return;
            let desc='Fee Receipts';
            const mode=(r.excelPaymentMode||r.paymentMethod||r.payment_method||'').toLowerCase();
            const pf=(r.paidFor||r.paid_for||'').toLowerCase();
            if(pf.includes('excel')||pf.includes('bulk import'))desc='Excel Bulk Import — '+(r.paymentMethod||'Payment');
            else if(pf.includes('bursary'))desc='Bursary Disbursement';
            else if(/mpesa|m-pesa|paybill/.test(mode))desc='M-Pesa Receipts';
            else if(/bank|transfer|eft/.test(mode))desc='Bank Transfer Receipts';
            else if(/cash/.test(mode))desc='Cash Receipts';
            const rd=r.createdAt||r.created_at||r.paymentDate||r.payment_date||r.date||new Date().toISOString();
            const k=desc+'___'+String(rd).slice(0,16);
            if(!grps.has(k))grps.set(k,{desc,addedOn:rd,recs:[]});
            grps.get(k)!.recs.push(r);
        });
        grps.forEach((g,k)=>{
            const tv=g.recs.reduce((s,r)=>s+pm(r.amountPaid??r.amount_paid??r.amount??0),0);
            res.push({id:'rb_'+k.replace(/[^a-zA-Z0-9]/g,'_').slice(0,60),description:g.desc.toUpperCase(),totalValue:tv,noOfRecords:g.recs.length,addedOn:g.addedOn,addedBy:currentUserName||'Finance Officer',receiptIds:g.recs.map(r=>r.id),status:'active',createdAt:g.addedOn});
        });
        return res.sort((a,b)=>new Date(b.addedOn||'').getTime()-new Date(a.addedOn||'').getTime());
    },[receipts,pb,currentUserName]);

    const fb=useMemo(()=>allB.filter(b=>{const q=sq.toLowerCase();const ok=b.description.toLowerCase().includes(q)||b.addedBy.toLowerCase().includes(q);if(!ok)return false;if(sf==='active')return b.status==='active';if(sf==='reversed')return b.status==='reversed';return true;}),[allB,sq,sf]);
    const st=useMemo(()=>{const a=allB.filter(b=>b.status==='active');const r=allB.filter(b=>b.status==='reversed');return{total:allB.length,ac:a.length,rc:r.length,tv:a.reduce((s,b)=>s+b.totalValue,0),tr:a.reduce((s,b)=>s+b.noOfRecords,0)};},[allB]);
    const tsa=(v:boolean)=>setSel(v?new Set(fb.filter(b=>b.status==='active').map(b=>b.id)):new Set());
    const tb=(id:string)=>{const n=new Set(sel);n.has(id)?n.delete(id):n.add(id);setSel(n);};
    const doUndo=async()=>{
        if(!btu)return;setUndo(true);
        try{
            const ids=btu.receiptIds.filter(Boolean);
            for(let i=0;i<ids.length;i+=50)await apiService.deleteModuleRecord('receipts',ids.slice(i,i+50).join(','));
            const up=pb.filter(b=>b.id!==btu.id);
            up.unshift({...btu,status:'reversed',reversedAt:new Date().toISOString(),reversedBy:currentUserName});
            save(up); if(onRefreshData)await onRefreshData();
            setMsg('Reversed '+btu.description+' — '+ids.length+' receipt(s) deleted.');
            setBtu(null); setTimeout(()=>setMsg(null),6000);
        }catch(e){console.error('[RHM]',e);alert('Failed to undo. Try again.');}
        finally{setUndo(false);}
    };

    const doSaveBatchDate=async()=>{
        if(!bed||!nbd)return;setSbd(true);
        try{
            const iso=new Date(nbd).toISOString();
            save(pb.map(b=>b.id===bed.id?{...b,addedOn:iso,createdAt:iso}:b));
            const br=(receipts||[]).filter(r=>bed.receiptIds.includes(r.id));
            if(br.length>0)await apiService.saveModuleRecords('receipts',br.map(r=>({...r,paymentDate:nbd,payment_date:nbd,date:nbd,updatedAt:iso,updated_at:iso})));
            if(onRefreshData)await onRefreshData();
            setMsg('Batch date updated to '+nbd+'.');setBed(null);setTimeout(()=>setMsg(null),5000);
        }catch{alert('Failed to update batch date.');}
        finally{setSbd(false);}
    };

    const doSaveRecDate=async()=>{
        if(!red||!nrd)return;setSrd(true);
        try{
            const iso=new Date(nrd).toISOString();
            await apiService.updateModuleRecord('receipts',red.id,{...red,paymentDate:nrd,payment_date:nrd,date:nrd,updatedAt:iso,updated_at:iso});
            if(onRefreshData)await onRefreshData();
            setMsg('Receipt date updated to '+nrd+'.');setRed(null);setTimeout(()=>setMsg(null),5000);
        }catch{alert('Failed to update receipt date.');}
        finally{setSrd(false);}
    };
    return (
        <div className="space-y-6 text-left animate-in fade-in duration-300">
            {msg && (
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between gap-3 text-emerald-800 dark:text-emerald-200 text-xs font-bold animate-in slide-in-from-top duration-200">
                    <div className="flex items-center gap-2"><CheckCircleIcon className="w-5 h-5 text-emerald-600"/><span>{msg}</span></div>
                    <button onClick={()=>setMsg(null)} className="text-emerald-500 hover:text-emerald-700"><XIcon className="w-4 h-4"/></button>
                </div>
            )}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    {label:'Total Batches',val:st.total,sub:st.ac+' active · '+st.rc+' reversed',c:'slate'},
                    {label:'Total Receipted',val:'KES '+st.tv.toLocaleString(),sub:'Cumulative active value',c:'indigo'},
                    {label:'Total Records',val:st.tr.toLocaleString(),sub:'Individual receipt entries',c:'emerald'},
                    {label:'Reversals',val:st.rc,sub:'Undone batch transactions',c:'rose'},
                ].map((k,i)=>(
                    <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800/60 shadow-sm">
                        <span className={'text-[10px] font-black uppercase tracking-wider text-'+k.c+'-600 dark:text-'+k.c+'-400'}>{k.label}</span>
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{k.val}</h3>
                        <p className="text-[10px] text-slate-500 font-semibold mt-1">{k.sub}</p>
                    </div>
                ))}
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800/60 shadow-sm space-y-6">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <ClockIcon className="w-5 h-5 text-indigo-500"/>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Income Receipt History &amp; Audit Log</h3>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">Batch Ledger</span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold mt-0.5">Full audit trail of posted receipts grouped by import session, with undo &amp; rollback.</p>
                    </div>
                    {sel.size>0 && (
                        <button type="button" onClick={()=>{const f=fb.find(b=>sel.has(b.id));if(f)setBtu(f);}}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-rose-500/20 active:scale-95 cursor-pointer">
                            <Trash2Icon className="w-4 h-4"/><span>↩️ Undo Selected ({sel.size})</span>
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full">
                        <SearchIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
                        <input type="text" placeholder="Search description or posted by..." value={sq} onChange={e=>setSq(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-indigo-500"/>
                    </div>
                    <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl text-xs font-bold shrink-0">
                        {(['all','active','reversed'] as const).map(f=>(
                            <button key={f} type="button" onClick={()=>setSf(f)}
                                className={'px-3 py-1.5 rounded-xl transition-all '+(sf===f?f==='active'?'bg-emerald-600 text-white shadow-sm':f==='reversed'?'bg-rose-600 text-white shadow-sm':'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm':'text-slate-500')}>
                                {f==='all'?'All ('+st.total+')':f==='active'?'Active ('+st.ac+')':'Reversed ('+st.rc+')'}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800/60 rounded-3xl">
                    <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800/60">
                            <tr>
                                <th className="px-5 py-4 w-10">
                                    <input type="checkbox" checked={fb.length>0&&fb.filter(b=>b.status==='active').every(b=>sel.has(b.id))} onChange={e=>tsa(e.target.checked)}
                                        className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer"/>
                                </th>
                                {['Description','Total Value','Receipts','Posted On','Posted By','Actions'].map(h=>(
                                    <th key={h} className={'px-5 py-4 text-[10px] font-black uppercase text-slate-400 tracking-wider'+(h==='Total Value'?' text-right':h==='Receipts'?' text-center':h==='Actions'?' text-right':'')}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                            {fb.length===0?(
                                <tr><td colSpan={7} className="px-6 py-14 text-center text-slate-400 font-bold">No receipt history records found.</td></tr>
                            ):fb.map(batch=>{
                                const isRev=batch.status==='reversed';
                                return(
                                    <tr key={batch.id} className={'hover:bg-slate-50/60 dark:hover:bg-slate-850/60 transition-colors'+(isRev?' bg-rose-50/30 dark:bg-rose-950/20 opacity-70':'')}>
                                        <td className="px-5 py-4">
                                            <input type="checkbox" disabled={isRev} checked={sel.has(batch.id)} onChange={()=>tb(batch.id)}
                                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-slate-700 cursor-pointer disabled:opacity-30"/>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="font-black text-slate-900 dark:text-white uppercase tracking-tight">{batch.description}</span>
                                                {isRev&&<span className="px-2 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 text-[9px] font-black uppercase rounded-full border border-rose-200 dark:border-rose-800">Reversed</span>}
                                            </div>
                                            <span className="text-[10px] font-mono text-slate-400 block mt-0.5">ID: {batch.id.slice(0,44)}</span>
                                        </td>
                                        <td className="px-5 py-4 font-mono font-black text-right text-slate-900 dark:text-white">KES {batch.totalValue.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                                        <td className="px-5 py-4 text-center"><span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-black text-slate-700 dark:text-slate-300">{batch.noOfRecords}</span></td>
                                        <td className="px-5 py-4 text-slate-600 dark:text-slate-400 font-semibold whitespace-nowrap">{fd(batch.addedOn)}</td>
                                        <td className="px-5 py-4 text-slate-700 dark:text-slate-300 font-bold whitespace-nowrap">{batch.addedBy||'System'}</td>
                                        <td className="px-5 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button type="button" disabled={isRev} onClick={()=>{setBed(batch);setNbd(batch.addedOn?new Date(batch.addedOn).toISOString().split('T')[0]:new Date().toISOString().split('T')[0]);}}
                                                    className="p-2 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-30" title="Edit batch payment date">
                                                    <CalendarDaysIcon className="w-4 h-4"/>
                                                </button>
                                                <button type="button" onClick={()=>setVb(batch)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="View receipts in batch">
                                                    <EyeIcon className="w-4 h-4"/>
                                                </button>
                                                {!isRev?(
                                                    <button type="button" onClick={()=>setBtu(batch)}
                                                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all shadow-sm active:scale-95 cursor-pointer">
                                                        <span>↩️ Undo</span>
                                                    </button>
                                                ):(
                                                    <span className="text-[10px] font-bold text-rose-500 italic pr-2">Rolled back</span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Edit Batch Date Modal */}
            {bed&&(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-left animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/80 text-amber-600 flex items-center justify-center"><CalendarDaysIcon className="w-6 h-6"/></div>
                            <div><h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Batch Payment Date</h4><p className="text-xs font-semibold text-slate-500 mt-0.5">{bed.description}</p></div>
                        </div>
                        <input type="date" value={nbd} onChange={e=>setNbd(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-amber-500 text-xs font-black text-slate-800 dark:text-white outline-none"/>
                        <p className="text-xs font-semibold text-slate-500 bg-slate-50 dark:bg-slate-850 p-3 rounded-xl border border-slate-200 dark:border-slate-800">Updates payment date for all <strong>{bed.noOfRecords}</strong> receipts in this batch.</p>
                        <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={()=>setBed(null)} disabled={sbd} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="button" onClick={doSaveBatchDate} disabled={sbd||!nbd} className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                                <CheckCircleIcon className="w-4 h-4"/>{sbd?'Saving...':'Update Date'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Edit Single Receipt Date Modal */}
            {red&&(
                <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-left animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 flex items-center justify-center"><CalendarDaysIcon className="w-6 h-6"/></div>
                            <div><h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">Edit Receipt Date</h4><p className="text-xs font-semibold text-slate-500 mt-0.5">Receipt: {red.receiptNumber||red.receipt_number}</p></div>
                        </div>
                        <input type="date" value={nrd} onChange={e=>setNrd(e.target.value)} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 focus:border-indigo-500 text-xs font-black text-slate-800 dark:text-white outline-none"/>
                        <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={()=>setRed(null)} disabled={srd} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="button" onClick={doSaveRecDate} disabled={srd||!nrd} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                                <CheckCircleIcon className="w-4 h-4"/>{srd?'Saving...':'Update Date'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Undo Confirm Modal */}
            {btu&&(
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl p-8 border border-slate-200 dark:border-slate-800 space-y-6 text-left animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20"><ExclamationTriangleIcon className="w-8 h-8"/></div>
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Undo &amp; Rollback Receipt Batch?</h4>
                                <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mt-0.5">This permanently deletes the receipts and recalculates student balances.</p>
                            </div>
                        </div>
                        <div className="p-5 bg-slate-50 dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2.5 text-xs">
                            {[['Batch',btu.description],['Total Value','KES '+btu.totalValue.toLocaleString()],['Receipts to Delete',btu.noOfRecords+' records'],['Posted On',fd(btu.addedOn)]].map(([k,v])=>(
                                <div key={k} className="flex justify-between"><span className="text-slate-400 font-bold uppercase text-[10px]">{k}:</span><span className="font-black text-slate-900 dark:text-white">{v}</span></div>
                            ))}
                        </div>
                        <p className="text-xs font-semibold text-slate-500 leading-relaxed">⚠️ <strong>Warning:</strong> All <strong>{btu.noOfRecords}</strong> receipt records will be permanently deleted and student account balances will update immediately.</p>
                        <div className="flex items-center justify-end gap-3">
                            <button type="button" onClick={()=>setBtu(null)} className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">Cancel</button>
                            <button type="button" onClick={doUndo} disabled={undo}
                                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-500/25 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50">
                                <Trash2Icon className="w-4 h-4"/>{undo?'Rolling back...':'Confirm & Undo Batch'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Drilldown Modal */}
            {vb&&(
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl max-h-[85vh] rounded-[2.5rem] shadow-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 flex flex-col space-y-5 text-left animate-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                            <div>
                                <h4 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Batch: {vb.description}</h4>
                                <p className="text-xs font-semibold text-slate-400 mt-0.5">{vb.noOfRecords} Receipts · KES {vb.totalValue.toLocaleString()} · Posted by {vb.addedBy}</p>
                            </div>
                            <button type="button" onClick={()=>setVb(null)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><XIcon className="w-5 h-5"/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-2xl">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800/60 sticky top-0 border-b border-slate-200 dark:border-slate-800">
                                    <tr>{['Receipt No','Student','ADM No','Amount (KES)','Method','Payment Date','Edit'].map(h=><th key={h} className="px-4 py-3 text-[10px] font-black uppercase text-slate-400">{h}</th>)}</tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                                    {(receipts||[]).filter(r=>vb.receiptIds.includes(r.id)).map(rec=>{
                                        const s=stMap.get(rec.studentId||rec.student_id||'');
                                        const adm=s?.admissionNumber||(s as any)?.admission_number||rec.admissionNumber||rec.admission_number||'—';
                                        const amt=pm(rec.amountPaid??rec.amount_paid??rec.amount??0);
                                        const pd=rec.paymentDate||rec.payment_date||rec.date||rec.createdAt;
                                        return(
                                            <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                                <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">{rec.receiptNumber||rec.receipt_number}</td>
                                                <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{s?.name||rec.studentName||rec.student_name||'Student'}</td>
                                                <td className="px-4 py-3 font-mono font-semibold text-slate-500">{adm}</td>
                                                <td className="px-4 py-3 font-mono font-black text-emerald-600 dark:text-emerald-400">{amt.toLocaleString()}</td>
                                                <td className="px-4 py-3"><span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black uppercase">{rec.paymentMethod||rec.payment_method||rec.excelPaymentMode||'—'}</span></td>
                                                <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-semibold whitespace-nowrap">{fd(pd)}</td>
                                                <td className="px-4 py-3">
                                                    <button type="button" onClick={()=>{setRed(rec);setNrd(pd?new Date(pd).toISOString().split('T')[0]:new Date().toISOString().split('T')[0]);}}
                                                        className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors" title="Edit payment date">
                                                        <PencilIcon className="w-3.5 h-3.5"/>
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex justify-end pt-2">
                            <button type="button" onClick={()=>setVb(null)} className="px-6 py-2 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-800 transition-all">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

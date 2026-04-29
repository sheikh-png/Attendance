import React, { useState, useEffect } from 'react';
import { Key, Timer, RefreshCw, CheckCircle2, AlertCircle, Copy, Check } from 'lucide-react';
import axios from 'axios';

const AttendanceCodesTab = () => {
    const [activeCodes, setActiveCodes] = useState({});
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(null); // 'morning' | 'afternoon' | 'evening'
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        fetchActiveCodes();
        const interval = setInterval(fetchActiveCodes, 10000); // Refresh every 10s
        return () => clearInterval(interval);
    }, []);

    const fetchActiveCodes = async () => {
        try {
            const { data } = await axios.get('http://localhost:5000/api/admin/active-codes');
            setActiveCodes(data);
        } catch (error) {
            console.error('Error fetching active codes:', error);
        }
    };

    const generateCode = async (slot) => {
        setGenerating(slot);
        try {
            await axios.post('http://localhost:5000/api/admin/generate-code', { slot });
            await fetchActiveCodes();
        } catch (error) {
            alert('Error generating code: ' + (error.response?.data?.message || error.message));
        } finally {
            setGenerating(null);
        }
    };

    const handleCopy = (code, slot) => {
        navigator.clipboard.writeText(code);
        setCopied(slot);
        setTimeout(() => setCopied(null), 2000);
    };

    const slots = [
        { 
            id: 'morning', 
            label: 'Morning Session', 
            classes: {
                activeCard: 'border-blue-400 bg-blue-50/30 ring-4 ring-blue-500/10',
                inactiveCard: 'border-slate-100 bg-slate-50/50',
                iconActive: 'bg-blue-100 text-blue-600 shadow-inner',
                iconInactive: 'bg-slate-100 text-slate-400',
                textActive: 'text-blue-600',
                btn: 'bg-gradient-to-r from-blue-600 to-cyan-500 shadow-blue-500/30 hover:shadow-blue-500/50'
            }
        },
        { 
            id: 'afternoon', 
            label: 'Afternoon Session', 
            classes: {
                activeCard: 'border-emerald-400 bg-emerald-50/30 ring-4 ring-emerald-500/10',
                inactiveCard: 'border-slate-100 bg-slate-50/50',
                iconActive: 'bg-emerald-100 text-emerald-600 shadow-inner',
                iconInactive: 'bg-slate-100 text-slate-400',
                textActive: 'text-emerald-600',
                btn: 'bg-gradient-to-r from-emerald-600 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50'
            }
        },
        { 
            id: 'evening', 
            label: 'Evening Session', 
            classes: {
                activeCard: 'border-purple-400 bg-purple-50/30 ring-4 ring-purple-500/10',
                inactiveCard: 'border-slate-100 bg-slate-50/50',
                iconActive: 'bg-purple-100 text-purple-600 shadow-inner',
                iconInactive: 'bg-slate-100 text-slate-400',
                textActive: 'text-purple-600',
                btn: 'bg-gradient-to-r from-purple-600 to-pink-500 shadow-purple-500/30 hover:shadow-purple-500/50'
            }
        }
    ];

    return (
        <div className="space-y-8 max-w-5xl">
            <div className="flex flex-col gap-2">
                <h2 className="text-3xl font-black text-slate-800">Attendance Codes</h2>
                <p className="text-slate-500 font-medium">Generate 6-digit codes for students to mark their presence. Codes expire in 20 minutes.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {slots.map((slot) => {
                    const active = activeCodes[slot.id];
                    const isGenerating = generating === slot.id;

                    return (
                        <div key={slot.id} className={`glass-card p-6 border-2 transition-all duration-300 ${
                            active ? slot.classes.activeCard : slot.classes.inactiveCard
                        }`}>
                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-3 rounded-2xl transition-colors ${active ? slot.classes.iconActive : slot.classes.iconInactive}`}>
                                    <Key size={24} />
                                </div>
                                {active && (
                                    <div className="text-right animate-in fade-in slide-in-from-right-4 duration-500">
                                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${slot.classes.textActive}`}>
                                            <Timer size={12} className="animate-pulse" />
                                            Active
                                        </div>
                                        <p className="text-xs font-black text-slate-500 mt-1">Exp: {active.expiresAt}</p>
                                    </div>
                                )}
                            </div>

                            <h3 className="text-lg font-black text-slate-800 mb-1">{slot.label}</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-6">
                                {active ? `${active.timeLeft} minutes remaining` : 'No active code'}
                            </p>

                            {active ? (
                                <div className="space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className={`text-4xl font-black text-center py-4 rounded-2xl bg-white border-2 border-dashed ${slot.classes.textActive.replace('text', 'border')} text-slate-800 tracking-[0.2em] relative shadow-sm`}>
                                        {active.code}
                                        <button 
                                            onClick={() => handleCopy(active.code, slot.id)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-slate-400 hover:text-slate-800 transition-colors bg-white rounded-lg hover:shadow-md"
                                        >
                                            {copied === slot.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => generateCode(slot.id)}
                                        disabled={isGenerating}
                                        className={`w-full py-3 rounded-xl bg-slate-800 text-white text-xs font-black uppercase tracking-widest hover:bg-slate-900 transition-all flex items-center justify-center gap-2`}
                                    >
                                        <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                                        Regenerate Code
                                    </button>
                                </div>
                            ) : (
                                <button 
                                    onClick={() => generateCode(slot.id)}
                                    disabled={isGenerating}
                                    className={`w-full py-4 rounded-2xl text-white text-sm font-black uppercase tracking-widest shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 ${slot.classes.btn}`}
                                >
                                    {isGenerating ? <RefreshCw size={20} className="animate-spin" /> : <Key size={20} />}
                                    Generate Code
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="glass-card p-6 bg-slate-900 text-white flex items-center gap-6">
                <div className="p-4 rounded-2xl bg-white/10 text-white">
                    <AlertCircle size={32} />
                </div>
                <div>
                    <h4 className="text-lg font-black">Security Protocol</h4>
                    <p className="text-slate-400 text-sm font-medium">Codes are only valid for 20 minutes from the time of generation. Ensure students mark their presence within this window. Only one code can be active per slot at a time.</p>
                </div>
            </div>
        </div>
    );
};

export default AttendanceCodesTab;

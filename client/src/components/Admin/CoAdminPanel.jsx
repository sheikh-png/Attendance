import React, { useState, useEffect } from 'react';
import { 
    Key, Timer, RefreshCw, CheckCircle2, XCircle, 
    Copy, Check, ShieldCheck, Zap, Sparkles
} from 'lucide-react';
import axios from 'axios';

const CoAdminPanel = () => {
    const [activeCodes, setActiveCodes] = useState({});
    const [generating, setGenerating] = useState(null);
    const [copied, setCopied] = useState(null);

    useEffect(() => {
        fetchActiveCodes();
        const interval = setInterval(fetchActiveCodes, 10000);
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
            icon: '🌅',
            gradient: 'from-orange-400 to-amber-600',
            lightBg: 'bg-orange-50',
            textColor: 'text-orange-600',
            shadow: 'shadow-orange-500/20'
        },
        { 
            id: 'afternoon', 
            label: 'Afternoon Session', 
            icon: '☀️',
            gradient: 'from-emerald-400 to-teal-600',
            lightBg: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            shadow: 'shadow-emerald-500/20'
        },
        { 
            id: 'evening', 
            label: 'Evening Session', 
            icon: '🌙',
            gradient: 'from-indigo-500 to-purple-600',
            lightBg: 'bg-indigo-50',
            textColor: 'text-indigo-600',
            shadow: 'shadow-indigo-500/20'
        }
    ];

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Ultra Premium Colorful Header */}
            <div className="relative overflow-hidden rounded-[2.5rem] p-8 group">
                <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 animate-gradient-xy" />
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
                <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-black/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-1000" />
                
                <div className="relative flex flex-col md:flex-row items-center gap-6">
                    <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-xl border border-white/30 flex items-center justify-center shadow-2xl animate-pulse">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <div className="text-center md:text-left space-y-1">
                        <div className="flex items-center justify-center md:justify-start gap-3">
                            <h2 className="text-2xl font-black text-white tracking-tight">Co-Admin Command Center</h2>
                            <span className="px-2 py-0.5 bg-white/20 backdrop-blur-md border border-white/30 rounded-full text-[9px] font-black text-white uppercase tracking-widest">Master Access</span>
                        </div>
                        <p className="text-white/80 text-sm font-medium max-w-lg">
                            Manage session codes and oversee student attendance with elevated privileges. 
                            <span className="text-white font-bold ml-1 italic">Everything is under your control.</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Session Codes Grid */}
            <div className="space-y-6">
                <div className="flex items-center justify-between px-2">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
                        <Zap size={18} className="text-amber-500 fill-amber-500" />
                        Live Session Management
                    </h3>
                    <div className="h-1 flex-1 mx-6 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full w-1/3 bg-gradient-to-r from-primary-500 to-indigo-500 animate-shimmer" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {slots.map((slot) => {
                        const active = activeCodes[slot.id];
                        const isGenerating = generating === slot.id;

                        return (
                            <div key={slot.id} className={`group relative rounded-[2rem] transition-all duration-500 hover:-translate-y-2 ${
                                active ? 'shadow-2xl' : 'hover:shadow-xl'
                            } ${active ? slot.shadow : 'shadow-slate-200'}`}>
                                
                                <div className={`absolute inset-0 rounded-[2rem] bg-gradient-to-br ${active ? slot.gradient : 'from-slate-50 to-slate-100'} opacity-[0.03] group-hover:opacity-[0.08] transition-opacity`} />
                                
                                <div className={`relative bg-white border-2 rounded-[2rem] p-6 h-full flex flex-col ${
                                    active ? `border-transparent` : 'border-slate-100'
                                }`} style={active ? { borderImage: `linear-gradient(to bottom right, var(--tw-gradient-from), var(--tw-gradient-to)) 1` } : {}}>
                                    
                                    {/* Slot Badge */}
                                    <div className="flex justify-between items-start mb-6">
                                        <div className={`text-3xl p-3 rounded-2xl ${active ? slot.lightBg : 'bg-slate-50'} transition-colors`}>
                                            {slot.icon}
                                        </div>
                                        {active && (
                                            <div className={`px-3 py-1 rounded-full ${slot.lightBg} ${slot.textColor} flex items-center gap-1.5 animate-bounce`}>
                                                <div className={`w-2 h-2 rounded-full bg-current animate-ping`} />
                                                <span className="text-[10px] font-black uppercase tracking-tighter">Live Now</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex-1 space-y-2">
                                        <h4 className={`text-lg font-black ${active ? 'text-slate-800' : 'text-slate-400'} transition-colors`}>
                                            {slot.label}
                                        </h4>
                                        <p className="text-[10px] font-bold text-slate-400">
                                            {active ? `Valid for ${active.timeLeft} minutes` : 'Session inactive'}
                                        </p>
                                    </div>

                                    <div className="mt-8 pt-6 border-t border-slate-50">
                                        {active ? (
                                            <div className="space-y-4">
                                                <div className={`relative overflow-hidden group/code`}>
                                                    <div className={`absolute inset-0 bg-gradient-to-r ${slot.gradient} opacity-5 group-hover/code:opacity-10 transition-opacity rounded-2xl`} />
                                                    <div className={`relative px-6 py-4 rounded-2xl border-2 border-dashed ${active ? `border-${slot.id === 'evening' ? 'indigo' : slot.id === 'afternoon' ? 'emerald' : 'orange'}-200` : 'border-slate-200'} text-center`}>
                                                        <span className="text-3xl font-black tracking-[0.3em] text-slate-800">
                                                            {active.code}
                                                        </span>
                                                        <button 
                                                            onClick={() => handleCopy(active.code, slot.id)}
                                                            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl bg-white shadow-sm hover:shadow-md transition-all ${slot.textColor}`}
                                                        >
                                                            {copied === slot.id ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => generateCode(slot.id)}
                                                    disabled={isGenerating}
                                                    className={`w-full py-3.5 rounded-2xl bg-slate-900 text-white text-[11px] font-black uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-2 shadow-xl`}
                                                >
                                                    <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
                                                    {isGenerating ? 'Refreshing...' : 'Regenerate Code'}
                                                </button>
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => generateCode(slot.id)}
                                                disabled={isGenerating}
                                                className={`w-full py-4 rounded-2xl bg-gradient-to-r ${slot.gradient} text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-lg ${slot.shadow} hover:scale-[1.03] active:scale-[0.97] transition-all flex items-center justify-center gap-2`}
                                            >
                                                {isGenerating ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
                                                Initialize Session
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer Tip */}
            <div className="bg-slate-100/50 rounded-2xl p-4 text-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
                    Codes are valid for 20 minutes • System Refresh every 10 seconds
                </p>
            </div>
        </div>
    );
};

export default CoAdminPanel;

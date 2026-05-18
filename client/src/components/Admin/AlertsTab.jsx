import React, { useState, useEffect } from 'react';
import { 
    AlertCircle, MessageSquare, Mail, 
    ChevronRight, Send, AlertTriangle, Phone,
    Calendar as CalendarIcon, Clock
} from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';

const AlertsTab = () => {
    const [alerts, setAlerts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchAlerts();
    }, [selectedDate]);

    const fetchAlerts = async () => {
        setLoading(true);
        try {
            const month = selectedDate.getMonth() + 1;
            const year = selectedDate.getFullYear();
            const { data } = await axios.get(`/api/admin/alerts?month=${month}&year=${year}&t=${new Date().getTime()}`);
            setAlerts(data);
        } catch (error) {
            console.error('Error fetching alerts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() - 1);
            return d;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => {
            const d = new Date(prev);
            d.setMonth(d.getMonth() + 1);
            return d;
        });
    };

    const sendMessage = (student, type) => {
        const template = `Hello ${student.fullName}, your attendance is critical (Consecutive ${student.consecutiveDays} absent days). Last absent: ${student.lastAbsentDate}. Please report to the administration immediately.`;
        if (type === 'WhatsApp') {
            window.open(`https://wa.me/${student.mobileNumber?.replace('+', '')}?text=${encodeURIComponent(template)}`, '_blank');
        } else {
            window.location.href = `mailto:${student.email}?subject=Urgent Attendance Alert&body=${encodeURIComponent(template)}`;
        }
    };

    return (
        <div className="space-y-6">
            {/* Header & Month Filter */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-800 flex-1 shadow-sm">
                    <AlertTriangle size={24} className="text-rose-600 animate-pulse" />
                    <div>
                        <h4 className="font-bold flex items-center gap-2 text-sm md:text-base uppercase tracking-tight">
                            Urgent Attendance Alerts 
                            <span className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded-full font-black">
                                {alerts.length} Students
                            </span>
                        </h4>
                        <p className="text-[10px] md:text-xs opacity-90 font-bold uppercase tracking-wider">Condition: 5+ Continuous Absent Days</p>
                    </div>
                </div>

                <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
                    <button onClick={handlePrevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                        <ChevronRight className="rotate-180" size={20} />
                    </button>
                    <div className="px-4 py-2 bg-slate-50 rounded-xl flex items-center gap-2 min-w-[150px] justify-center">
                        <CalendarIcon size={16} className="text-rose-500" />
                        <span className="font-black text-slate-700 text-sm uppercase">{format(selectedDate, 'MMMM yyyy')}</span>
                    </div>
                    <button onClick={handleNextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-all text-slate-400 hover:text-slate-600">
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Alert List - Compact Format */}
            <div className="space-y-3">
                {loading ? (
                    <div className="glass-card p-20 text-center flex flex-col items-center gap-4">
                        <div className="animate-spin h-10 w-10 border-4 border-rose-600 border-t-transparent rounded-full"></div>
                        <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">Analyzing Streaks...</p>
                    </div>
                ) : alerts.length > 0 ? (
                    alerts.map((student) => (
                        <div key={student.id} className="group glass-card p-4 flex flex-col md:flex-row items-center justify-between hover:border-rose-300 transition-all border-l-4 border-l-rose-500 bg-white hover:shadow-lg">
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                {/* Compact Avatar */}
                                <div className="w-12 h-12 rounded-xl bg-rose-600 flex items-center justify-center text-white font-black text-lg shadow-md shrink-0">
                                    {student.fullName?.charAt(0)}
                                </div>
                                
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h4 className="font-bold text-slate-800 text-base truncate tracking-tight">{student.fullName}</h4>
                                        <span className="text-[9px] px-2 py-0.5 rounded-md bg-rose-100 text-rose-600 font-black uppercase">{student.consecutiveDays} Days</span>
                                    </div>
                                    <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase tracking-tight">
                                        <span>ID: {student.studentId || student.id}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span>{student.course}</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-200" />
                                        <span>{student.house} House</span>
                                    </div>
                                </div>
                            </div>

                            {/* Info Section - Integrated */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4 md:mt-0 px-4 md:px-8 border-l-0 md:border-l border-slate-100 flex-1 justify-center md:justify-start">
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Phone size={12} className="text-rose-400" />
                                    <span className="text-[11px] font-semibold">{student.mobileNumber || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-slate-500">
                                    <Mail size={12} className="text-rose-400" />
                                    <span className="text-[11px] font-semibold truncate max-w-[120px]">{student.email || 'N/A'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-rose-500">
                                    <CalendarIcon size={12} />
                                    <span className="text-[10px] font-black uppercase">Since: {student.lastAbsentDate || 'N/A'}</span>
                                </div>
                            </div>

                            {/* Actions - Condensed */}
                            <div className="flex items-center gap-2 w-full md:w-auto mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                                <button 
                                    onClick={() => sendMessage(student, 'WhatsApp')}
                                    className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-all shadow-sm font-bold text-[10px] uppercase tracking-wider"
                                >
                                    <MessageSquare size={14} />
                                    WhatsApp
                                </button>
                                <button 
                                    onClick={() => sendMessage(student, 'Email')}
                                    className="flex-1 md:flex-none flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white hover:bg-primary-700 transition-all shadow-sm font-bold text-[10px] uppercase tracking-wider"
                                >
                                    <Mail size={14} />
                                    Email
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="glass-card p-20 text-center border-dashed border-slate-200 flex flex-col items-center justify-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                            <AlertCircle size={32} />
                        </div>
                        <div className="space-y-1">
                            <p className="text-slate-500 font-bold text-base">No Critical Streaks</p>
                            <p className="text-slate-400 text-xs font-medium">All students are within attendance thresholds.</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AlertsTab;


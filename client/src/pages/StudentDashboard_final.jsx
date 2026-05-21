import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Clock, Calendar, CheckCircle2, XCircle, 
    MessageSquare, LogOut, ChevronRight, ChevronLeft, Timer, 
    Wifi, MapPin, BarChart2, Users, TrendingUp, TrendingDown, Settings, Eye, EyeOff, X
} from 'lucide-react';
import axios from 'axios';
import { format, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSunday, isSameMonth } from 'date-fns';

const StudentDashboard = () => {
    const { user, logout } = useAuth();
    const now = new Date();
    const [dashboardData, setDashboardData] = useState({
        attendance: [],
        rawStats: { totalDays: 0, presentDays: 0, attendancePercentage: 0 }
    });
    const [monthlyStats, setMonthlyStats] = useState({ totalDays: 0, presentDays: 0, attendancePercentage: 0 });
    const [settings, setSettings] = useState(null);
    const [slotStates, setSlotStates] = useState({}); // Stores { status: 'pending'|'active'|'closed', countdown: 'HH:MM:SS' }
    const [viewDate, setViewDate] = useState(new Date());
    
    // Password change modal state
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [showPasswords, setShowPasswords] = useState({ current: false, new: false, confirm: false });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        fetchDashboardData();
        fetchSettings();
    }, []);

    useEffect(() => {
        if (!settings) return; // Wait for settings to load
        
        // Initial timer update
        updateTimers();
        
        // Then set interval
        const timer = setInterval(updateTimers, 1000);
        return () => clearInterval(timer);
    }, [settings]); // Dependency on settings

    const fetchDashboardData = async () => {
        try {
            const { data } = await axios.get('/api/student/dashboard');
            setDashboardData(data);
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    };

    const joinDate = user?.joinDate ? startOfDay(new Date(user.joinDate)) : null;

    useEffect(() => {
        calculateMonthlyStats();
    }, [viewDate, dashboardData.attendance, user?.joinDate]);

    const calculateMonthlyStats = () => {
        const start = startOfMonth(viewDate);
        const end = endOfMonth(viewDate);
        const now = new Date();
        
        const effectiveStart = joinDate && joinDate > start ? joinDate : start;
        const reportEnd = isSameMonth(viewDate, now) ? now : end;
        if (joinDate && effectiveStart > reportEnd) {
            setMonthlyStats({ totalDays: 0, presentDays: 0, absentDays: 0, attendancePercentage: 0 });
            return;
        }

        // String-based boundaries for robust comparison (fixes timezone bugs)
        const startStr = format(effectiveStart, 'yyyy-MM-dd');
        const endStr = format(reportEnd, 'yyyy-MM-dd');

        const attendanceArr = dashboardData.attendance || [];

        // Filter and remove duplicates by date (ensure one record per day)
        const monthlyAttendanceMap = new Map();
        attendanceArr.forEach(a => {
            if (a.date >= startStr && a.date <= endStr) {
                // If duplicates exist, prefer the one with a marked status
                if (!monthlyAttendanceMap.has(a.date) || a.totalStatus !== 'Pending') {
                    monthlyAttendanceMap.set(a.date, a);
                }
            }
        });
        const monthlyAttendance = Array.from(monthlyAttendanceMap.values());

        // Present Days: Unique dates marked Present, excluding Sundays
        const presentDays = monthlyAttendance.filter(a => 
            a.totalStatus === 'Present' && !isSunday(new Date(a.date))
        ).length;
        
        const daysInterval = eachDayOfInterval({ 
            start: effectiveStart, 
            end: reportEnd 
        });
        const classDays = daysInterval.filter(d => !isSunday(d));

        let absentDays = 0;
        classDays.forEach(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const record = monthlyAttendanceMap.get(dateStr);
            const isPastDay = day < now && !isSameDay(day, now);
            
            if (record) {
                if (record.totalStatus === 'Absent') {
                    absentDays++;
                }
            } else if (isPastDay) {
                absentDays++;
            }
        });
        
        const totalDays = classDays.length;
        const attendancePercentage = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : 0;

        setMonthlyStats({
            totalDays,
            presentDays,
            absentDays,
            attendancePercentage
        });
    };

    const fetchSettings = async () => {
        try {
            const { data } = await axios.get('/api/admin/settings');
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const updateTimers = () => {
        if (!settings) return;
        const now = new Date();
        const newSlotStates = {};

        ['morning', 'afternoon', 'evening'].forEach(slot => {
            const config = settings.slots[slot];
            
            // Create Date objects for today's slot start and end
            const [startH, startM] = config.start.split(':').map(Number);
            const [endH, endM] = config.end.split(':').map(Number);
            
            const startDate = new Date();
            startDate.setHours(startH, startM, 0, 0);
            
            const endDate = new Date();
            endDate.setHours(endH, endM, 0, 0);

            const isTodaySunday = isSunday(now);

            let status, prefix, countdown, diff = 0;

            if (isTodaySunday) {
                status = 'holiday';
                prefix = 'Happy Sunday';
                countdown = 'ENJOY';
            } else if (now < startDate) {
                status = 'pending';
                diff = startDate - now;
                prefix = 'Opens in';
            } else if (now >= startDate && now <= endDate) {
                status = 'active';
                diff = endDate - now;
                prefix = 'Closing in';
            } else {
                status = 'closed';
                diff = 0;
                prefix = 'Closed';
            }

            // Format HH:MM:SS
            const hours = Math.floor(diff / 3600000);
            const minutes = Math.floor((diff % 3600000) / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            
            if (status !== 'holiday' && status !== 'closed') {
                countdown = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            } else if (status === 'closed') {
                countdown = 'Closed';
            }

            newSlotStates[slot] = { status, countdown, prefix };
        });

        setSlotStates(newSlotStates);
    };

    const markAttendance = async (slot, isPresent = true) => {
        try {
            await axios.post('/api/attendance/mark', { slot, isPresent });
            const statusText = isPresent ? 'Present' : 'Absent';
            alert(`Marked as ${statusText}!`);
            
            // Wait a moment then refetch to ensure data is updated
            setTimeout(() => {
                fetchDashboardData();
            }, 500);
        } catch (error) {
            alert(error.response?.data?.message || 'Error marking attendance');
        }
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
            return alert('All password fields are required');
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return alert('New password and confirm password do not match');
        }

        if (passwordData.newPassword.length < 6) {
            return alert('Password must be at least 6 characters long');
        }

        setPasswordLoading(true);
        try {
            const { data } = await axios.put('/api/student/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
                confirmPassword: passwordData.confirmPassword
            });
            
            alert('Password changed successfully! Please log in again with your new password.');
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setShowPasswordModal(false);
            // Log out after password change
            setTimeout(() => logout(), 1000);
        } catch (error) {
            console.error('Password change error:', error.response?.data || error.message);
            alert('Error: ' + (error.response?.data?.message || 'Error changing password'));
        } finally {
            setPasswordLoading(false);
        }
    };

    const handlePrevMonth = () => setViewDate(subMonths(viewDate, 1));
    const handleNextMonth = () => setViewDate(addMonths(viewDate, 1));

    // Calendar Logic
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const todayAttendance = dashboardData.attendance.find(a => a.date === todayStr);

    const calendarStart = startOfWeek(startOfMonth(viewDate));
    const calendarEnd = endOfWeek(endOfMonth(viewDate));
    const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-outfit">
            {/* Professional Header */}
            <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 leading-none mb-1 flex items-center gap-2">
                                Welcome, <span className="text-primary-600">{user.fullName}</span>
                            </h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Attendance Management Dashboard</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-3">
                            <div className="text-right">
                                <p className="text-sm font-black text-slate-900">{user.fullName}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{user.studentId}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center text-primary-600 font-black">
                                {user.fullName ? user.fullName[0] : 'S'}
                            </div>
                        </div>
                        <button onClick={() => setShowPasswordModal(true)} className="p-2.5 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-all active:scale-95" title="Change Password">
                            <Settings size={20} />
                        </button>
                        <button onClick={logout} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all active:scale-95">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8 pb-20">
                {/* Stats & Summary Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="glass-card p-6 bg-slate-900 text-white relative overflow-hidden group">
                        <div className="relative z-10">
                            <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Monthly Score</p>
                            <h3 className="text-4xl font-black mb-1">{monthlyStats.attendancePercentage}%</h3>
                            <div className="flex items-center gap-2 mt-4">
                                <div className="h-1.5 flex-1 bg-white/10 rounded-full overflow-hidden">
                                    <div className="h-full bg-primary-500" style={{ width: `${monthlyStats.attendancePercentage}%` }} />
                                </div>
                                <span className="text-[10px] font-black text-primary-400">Target: 85%</span>
                            </div>
                        </div>
                        <BarChart2 className="absolute -right-4 -bottom-4 text-white/5 w-24 h-24 rotate-12 group-hover:scale-110 transition-transform" />
                    </div>

                    <div className="glass-card p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                                <CheckCircle2 size={24} />
                            </div>
                            <span className="text-xs font-black text-emerald-500">PRESENT</span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-black text-slate-800">{monthlyStats.presentDays} Days</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase flex items-center gap-1 mt-1">
                                <TrendingUp size={12} className="text-emerald-500" /> {format(viewDate, 'MMMM')}
                            </p>
                        </div>
                    </div>

                    <div className="glass-card p-6 flex flex-col justify-between">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                                <XCircle size={24} />
                            </div>
                            <span className="text-xs font-black text-rose-500 uppercase">Absent</span>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-3xl font-black text-slate-800">{monthlyStats.absentDays} Days</h3>
                            <p className="text-xs text-slate-400 font-bold uppercase mt-1 flex items-center gap-1">
                                <TrendingDown size={12} className="text-rose-500" /> {format(viewDate, 'MMMM')} Total
                            </p>
                        </div>
                    </div>

                    <div className="glass-card p-6 flex flex-col justify-between bg-primary-600 text-white">
                        <div className="flex justify-between items-start">
                            <div className="p-2 rounded-xl bg-white/20 text-white">
                                <Wifi size={24} />
                            </div>
                        </div>
                        <div className="mt-4">
                            <h3 className="text-xl font-black transition-all group-hover:scale-105">Verified WiFi</h3>
                            <p className="text-xs text-white/70 font-bold uppercase tracking-wider mt-1 truncate">
                                {user.assignedWiFiIP || 'Locking pending...'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Center Column: Today's Sessions (9 units now that side lists are gone) */}
                    <div className="lg:col-span-9 space-y-6">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                                <span className="w-8 h-1 bg-primary-600 rounded-full" />
                                Today's Attendance Sessions
                            </h3>
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full">
                                <div className="w-1.5 h-1.5 rounded-full bg-primary-500 animate-pulse" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Live Tracking</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {['morning', 'afternoon', 'evening'].map(slot => {
                                const state = slotStates[slot] || { status: 'closed', countdown: '--:--:--', prefix: 'Loading...' };
                                const statusValue = todayAttendance?.slots[slot];
                                const isMarked = statusValue && statusValue !== 'Pending';

                                return (
                                    <div key={slot} className={`glass-card p-6 border-2 transition-all relative overflow-hidden flex flex-col justify-between min-h-[220px] ${
                                        state.status === 'active' ? 'border-primary-500 bg-white ring-4 ring-primary-500/5' : 
                                        state.status === 'holiday' ? 'border-amber-500 bg-amber-50/30' :
                                        'border-transparent opacity-60 grayscale-[0.5]'
                                    }`}>
                                        <div className="relative z-10">
                                            <div className="flex justify-between items-start mb-4">
                                                <div className={`p-2 rounded-xl ${state.status === 'active' ? 'bg-primary-50 text-primary-600' : 'bg-slate-100 text-slate-400'}`}>
                                                    <Timer size={20} />
                                                </div>
                                                
                                                {state.status !== 'closed' && !isMarked && (
                                                    <div className="text-right">
                                                        <div className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest ${
                                                            state.status === 'pending' ? 'text-emerald-500' : 
                                                            state.status === 'holiday' ? 'text-amber-600' :
                                                            'text-rose-500'
                                                        }`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                                                                state.status === 'pending' ? 'bg-emerald-500' : 
                                                                state.status === 'holiday' ? 'bg-amber-500' :
                                                                'bg-rose-500'
                                                            }`} />
                                                            {state.prefix}
                                                        </div>
                                                        <p className={`text-sm font-black mt-0.5 tabular-nums ${state.status === 'holiday' ? 'text-amber-700' : 'text-slate-700'}`}>
                                                            {state.countdown}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase mb-1 tracking-widest">{slot}</p>
                                            <h4 className="text-xl font-black text-slate-800 capitalize mb-1">{slot} Session</h4>
                                            <div className="mt-2 pt-2 border-t border-slate-50">
                                                <p className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Session Window</p>
                                                <p className="text-xs font-black text-slate-500 tracking-tight">
                                                    {settings?.slots[slot].start} - {settings?.slots[slot].end}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative z-10 pt-6 space-y-2">
                                            {isMarked ? (
                                                <button 
                                                    disabled
                                                    className="w-full py-3 rounded-xl bg-emerald-50 text-emerald-600 text-[11px] font-black uppercase tracking-widest border-2 border-emerald-200 cursor-not-allowed flex items-center justify-center gap-2"
                                                >
                                                    <CheckCircle2 size={18} /> Already Marked
                                                </button>
                                            ) : state.status === 'active' ? (
                                                <button 
                                                    onClick={() => markAttendance(slot, true)}
                                                    className="w-full py-3 rounded-xl bg-blue-600 text-white text-[11px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/40 hover:bg-blue-700 active:scale-95 transition-all border-2 border-blue-400"
                                                >
                                                    ✓ Mark Present
                                                </button>
                                            ) : state.status === 'closed' ? (
                                                <div className="p-3 bg-amber-50 rounded-xl border-2 border-amber-300 text-center">
                                                    <p className="text-amber-700 font-black text-[11px] uppercase tracking-widest">⏱️ Time Up!</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 text-slate-400 font-black text-xs uppercase tracking-widest p-3 bg-slate-50 rounded-xl justify-center">
                                                    <Clock size={18} /> {state.status === 'pending' ? 'Upcoming' : 'Holiday'}
                                                </div>
                                            ) }
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="p-2 bg-white/20 rounded-xl">
                                    </div>
                                </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest ml-1">Select Date</p>
                                            <input 
                                                type="date"
                                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-white/30 outline-none transition-all placeholder:text-white/40"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black text-primary-200 uppercase tracking-widest ml-1">Reason</p>
                                            <input 
                                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white focus:ring-2 focus:ring-white/30 outline-none transition-all placeholder:text-white/40"
                                                required
                                            />
                                        </div>
                                    </div>
                                    <button 
                                        type="submit"
                                        className="w-full py-3 bg-white text-primary-600 font-black rounded-xl hover:bg-primary-50 transition-all text-[11px] uppercase tracking-widest shadow-xl active:scale-95"
                                    >
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Compact Calendar Widget (3 units) */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="glass-card p-5">
                            <div className="flex items-center justify-between mb-5">
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Attendance Map</h3>
                                <div className="flex items-center gap-1">
                                    <button onClick={handlePrevMonth} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors">
                                        <ChevronLeft size={16} />
                                    </button>
                                    <button onClick={handleNextMonth} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 transition-colors">
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <p className="text-sm font-black text-slate-800 mb-4">{format(viewDate, 'MMMM yyyy')}</p>

                            <div className="grid grid-cols-7 gap-1 mb-1">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                    <div key={idx} className="text-center text-[9px] font-black text-slate-400 p-1">{day}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {calendarDays.map(day => {
                                    const dateStr = format(day, 'yyyy-MM-dd');
                                    const record = dashboardData.attendance.find(a => a.date === dateStr);
                                    const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                                    const isSun = isSunday(day);
                                    const isBeforeJoin = joinDate && startOfDay(day) < joinDate;
                                    
                                    let statusColor = 'bg-slate-50 text-slate-300';
                                    if (isSun) statusColor = 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-200';
                                    else if (record?.totalStatus === 'Present') statusColor = 'bg-emerald-500 text-white shadow-sm';
                                    else if (record?.totalStatus === 'Absent' || (isCurrentMonth && day < now && !isSameDay(day, now) && !record && !isBeforeJoin)) statusColor = 'bg-rose-500 text-white shadow-sm';
                                    
                                    return (
                                        <div 
                                            key={day.toISOString()} 
                                            className={`aspect-square flex items-center justify-center rounded-lg text-[9px] font-black transition-all ${
                                                !isCurrentMonth ? 'opacity-20 pointer-events-none' : ''
                                            } ${statusColor} ${isToday(day) ? 'ring-2 ring-primary-500 ring-offset-1' : ''}`}
                                        >
                                            {isSun ? 'SUN' : format(day, 'd')}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-5 flex items-center justify-center gap-3 pt-4 border-t border-slate-50">
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /><span className="text-[8px] font-black text-slate-400">P ({monthlyStats.presentDays})</span></div>
                                <div className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-rose-500" /><span className="text-[8px] font-black text-slate-400">A ({monthlyStats.absentDays})</span></div>
                            </div>
                        </div>

                        {/* Additional Quick Action: View Profile/WiFi Status */}
                        <div className="glass-card p-5 bg-slate-50/50 border-dashed border-2 border-slate-200">
                             <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white rounded-lg text-primary-600 shadow-sm">
                                    <Wifi size={16} />
                                </div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Connection</p>
                                    <p className="text-[11px] font-black text-slate-700">Campus WiFi</p>
                                </div>
                             </div>
                             <div className="p-2.5 bg-white rounded-xl border border-slate-100 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 truncate mr-2">{user.assignedWiFiIP || 'Checking...'}</span>
                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                             </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Password Change Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-2xl font-black text-slate-900">Change Password</h3>
                            <button 
                                onClick={() => setShowPasswordModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            {/* Current Password */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Current Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.current ? 'text' : 'password'}
                                        value={passwordData.currentPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter current password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* New Password */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">New Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.new ? 'text' : 'password'}
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Enter new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Minimum 6 characters</p>
                            </div>

                            {/* Confirm Password */}
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Confirm Password</label>
                                <div className="relative">
                                    <input
                                        type={showPasswords.confirm ? 'text' : 'password'}
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Confirm new password"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>

                            {/* Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={passwordLoading}
                                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-all disabled:opacity-50"
                                >
                                    {passwordLoading ? 'Changing...' : 'Change Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentDashboard;



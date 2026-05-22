import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    Clock, Calendar, CheckCircle2, XCircle, 
    MessageSquare, LogOut, ChevronRight, ChevronLeft, Timer, 
    Wifi, MapPin, BarChart2, Users, TrendingUp, TrendingDown, Key, RefreshCw,
    Eye, EyeOff
} from 'lucide-react';
import axios from 'axios';
import { format, startOfDay, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isToday, startOfWeek, endOfWeek, addMonths, subMonths, isSunday, isSameMonth } from 'date-fns';
import CoAdminPanel from '../components/Admin/CoAdminPanel';

const StudentDashboard = () => {
    const { user, logout, updateUserData } = useAuth();
    const now = new Date();
    const [dashboardData, setDashboardData] = useState({
        attendance: [],
        rawStats: { totalDays: 0, presentDays: 0, attendancePercentage: 0 }
    });
    const [monthlyStats, setMonthlyStats] = useState({ totalDays: 0, presentDays: 0, attendancePercentage: 0 });
    const [settings, setSettings] = useState(null);
    const [slotStates, setSlotStates] = useState({});
    const [viewDate, setViewDate] = useState(new Date());
    const [toast, setToast] = useState(null); // { message, type: 'success'|'error' }
    const [showCodeModal, setShowCodeModal] = useState(null); // 'morning' | 'afternoon' | 'evening' | null
    const [inputCode, setInputCode] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [refreshing, setRefreshing] = useState(false);

    // Password change states
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchDashboardData();
        fetchSettings();
        fetchUserProfile();
        // Refresh settings every 60 seconds so admin changes reflect without reload
        const settingsRefresh = setInterval(fetchSettings, 60000);
        return () => clearInterval(settingsRefresh);
    }, []);

    const fetchUserProfile = async () => {
        try {
            const { data } = await axios.get('/api/auth/profile');
            // Sync with local storage and context
            updateUserData(data);
        } catch (error) {
            console.error('Error fetching profile:', error);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            await Promise.all([
                fetchDashboardData(),
                fetchSettings(),
                fetchUserProfile()
            ]);
            showToast('Dashboard data updated', 'success');
        } catch (error) {
            showToast('Failed to refresh data', 'error');
        } finally {
            setTimeout(() => setRefreshing(false), 600);
        }
    };

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

    const joinDate = (user?.joinDate || user?.createdAt) ? startOfDay(new Date(user.joinDate || user.createdAt)) : null;

    useEffect(() => {
        calculateMonthlyStats();
    }, [viewDate, dashboardData.attendance, user?.joinDate, user?.createdAt]);

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
            const hasValidRecord = record && ['Present', 'Absent', 'Leave'].includes(record.totalStatus);
            


            if (record) {
                if (record.totalStatus === 'Absent') {
                    absentDays++;
                }
            } else if (isPastDay) {
                absentDays++;
            }
        });
        
        // Count total class days (all non-Sunday days in the selected month up to today)
        const relevantClassDays = classDays;
        
        const totalDays = relevantClassDays.length;
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

            // Handle midnight-crossing: if end is before start, end is next day
            if (endDate <= startDate) {
                endDate.setDate(endDate.getDate() + 1);
            }

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
        if (isPresent) {
            setShowCodeModal(slot);
            setInputCode('');
            return;
        }
        
        // Marking Absent doesn't require a code
        try {
            await axios.post('/api/attendance/mark', { slot, isPresent });
            showToast('Marked as Absent for this session.', 'error');
            setTimeout(() => { handleRefresh(); }, 500);
        } catch (error) {
            showToast(error.response?.data?.message || 'Error marking attendance', 'error');
        }
    };

    const submitCode = async () => {
        if (inputCode.length !== 6) return showToast('Please enter a 6-digit code', 'error');
        setSubmitting(true);
        try {
            await axios.post(
                '/api/attendance/mark', 
                { slot: showCodeModal, isPresent: true, code: inputCode }
            );

            showToast('🎉 Congratulations! Marked as Present!', 'success');
            setShowCodeModal(null);
            setTimeout(() => { handleRefresh(); }, 500);
        } catch (error) {
            showToast(error.response?.data?.message || 'Error marking attendance', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const { currentPassword, newPassword, confirmPassword } = passwordData;

        if (!currentPassword || !newPassword || !confirmPassword) {
            return showToast('All fields are required', 'error');
        }
        if (newPassword !== confirmPassword) {
            return showToast('New password and confirm password do not match', 'error');
        }
        if (newPassword.length < 6) {
            return showToast('Password must be at least 6 characters long', 'error');
        }

        setPasswordSubmitting(true);
        try {
            await axios.put('/api/student/change-password', {
                currentPassword,
                newPassword,
                confirmPassword
            });
            showToast('🎉 Password changed successfully! Logging out...', 'success');
            setShowPasswordModal(false);
            setPasswordData({
                currentPassword: '',
                newPassword: '',
                confirmPassword: ''
            });
            setShowPasswords({
                current: false,
                new: false,
                confirm: false
            });
            // Automatically log out after 1.5 seconds so user can log in with new password
            setTimeout(() => {
                logout();
            }, 1500);
        } catch (error) {
            showToast(error.response?.data?.message || 'Error changing password', 'error');
        } finally {
            setPasswordSubmitting(false);
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
        <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-outfit text-sm relative overflow-x-hidden">
            {/* 3D Ambient Background Elements */}
            <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-blue-100/50 to-transparent pointer-events-none" />
            <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-purple-400/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute top-60 -left-20 w-[400px] h-[400px] bg-cyan-400/20 rounded-full blur-[100px] pointer-events-none" />

            {/* Custom Toast Popup */}
            {toast && (
                <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[999] w-full max-w-sm px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 transition-all duration-300 ${
                    toast.type === 'success'
                        ? 'bg-emerald-500 text-white'
                        : 'bg-rose-500 text-white'
                }`}>
                    <div className="text-2xl">
                        {toast.type === 'success' ? '🎉' : '⚠️'}
                    </div>
                    <p className="flex-1 font-bold text-sm leading-snug">{toast.message}</p>
                    <button
                        onClick={() => setToast(null)}
                        className="text-white/70 hover:text-white text-lg font-black leading-none"
                    >×</button>
                </div>
            )}

            {/* Professional Header */}
            <header className="bg-white border-b border-slate-100 px-6 py-4 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-primary-500/30">
                            <Users size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-none mb-1 flex items-center gap-2">
                                Welcome, <span className="text-primary-600">{user.fullName}</span>
                            </h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Attendance Management Dashboard</p>
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
                        <button 
                            onClick={handleRefresh} 
                            disabled={refreshing}
                            className={`px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2 font-bold text-sm ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
                            title="Refresh Dashboard"
                        >
                            <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
                            Refresh
                        </button>
                        <button 
                            onClick={() => setShowPasswordModal(true)} 
                            className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all active:scale-95 flex items-center gap-2 font-bold text-sm"
                            title="Change Password"
                        >
                            <Key size={18} />
                            <span className="hidden md:inline">Change Password</span>
                        </button>
                        <button onClick={logout} className="p-2.5 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-all active:scale-95">
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8 pb-20">
                {/* Stats & Summary Bar */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 text-white relative overflow-hidden group shadow-[0_20px_40px_-15px_rgba(147,51,234,0.5)] transform transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_50px_-15px_rgba(147,51,234,0.6)] border border-white/10">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="relative z-10">
                            <p className="text-[10px] font-black text-purple-200 uppercase tracking-widest mb-2 drop-shadow-md">Monthly Score</p>
                            <h3 className="text-4xl font-black mb-1 drop-shadow-lg">{monthlyStats.attendancePercentage}%</h3>
                            <div className="flex items-center gap-3 mt-5">
                                <div className="h-2.5 flex-1 bg-black/20 rounded-full overflow-hidden shadow-inner backdrop-blur-sm border border-white/10">
                                    <div className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_15px_rgba(52,211,153,0.8)] rounded-full relative" style={{ width: `${monthlyStats.attendancePercentage}%` }}>
                                        <div className="absolute inset-0 bg-white/30" style={{clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0% 100%)'}}></div>
                                    </div>
                                </div>
                                <span className="text-[10px] font-black text-purple-100 bg-white/10 px-2 py-0.5 rounded backdrop-blur-md">Target: 85%</span>
                            </div>
                        </div>
                        <BarChart2 className="absolute -right-4 -bottom-4 text-white/10 w-28 h-28 rotate-12 group-hover:scale-110 group-hover:-rotate-12 transition-transform duration-500 drop-shadow-2xl" />
                    </div>

                    <div className="p-6 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-[0_20px_40px_-15px_rgba(16,185,129,0.4)] text-white transform transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_50px_-15px_rgba(16,185,129,0.5)] border border-white/20 relative overflow-hidden group">
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                                <CheckCircle2 size={24} className="drop-shadow-md" />
                            </div>
                            <span className="text-xs font-black text-emerald-50 uppercase tracking-widest drop-shadow-sm bg-black/10 px-2.5 py-1 rounded-lg backdrop-blur-sm">PRESENT</span>
                        </div>
                        <div className="mt-4 relative z-10">
                            <h3 className="text-4xl font-black text-white drop-shadow-lg">{monthlyStats.presentDays} <span className="text-lg opacity-80 font-bold">Days</span></h3>
                            <p className="text-[10px] text-emerald-100 font-bold uppercase flex items-center gap-1.5 mt-2 bg-black/10 w-fit px-2 py-0.5 rounded-full">
                                <TrendingUp size={12} className="text-emerald-200" /> {format(viewDate, 'MMMM')}
                            </p>
                        </div>
                    </div>

                    <div className="p-6 flex flex-col justify-between rounded-3xl bg-gradient-to-br from-rose-400 to-orange-500 shadow-[0_20px_40px_-15px_rgba(244,63,94,0.4)] text-white transform transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_50px_-15px_rgba(244,63,94,0.5)] border border-white/20 relative overflow-hidden group">
                        <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700"></div>
                        <div className="flex justify-between items-start relative z-10">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.4)]">
                                <XCircle size={24} className="drop-shadow-md" />
                            </div>
                            <span className="text-xs font-black text-rose-50 uppercase tracking-widest drop-shadow-sm bg-black/10 px-2.5 py-1 rounded-lg backdrop-blur-sm">ABSENT</span>
                        </div>
                        <div className="mt-4 relative z-10">
                            <h3 className="text-4xl font-black text-white drop-shadow-lg">{monthlyStats.absentDays} <span className="text-lg opacity-80 font-bold">Days</span></h3>
                            <p className="text-[10px] text-rose-100 font-bold uppercase mt-2 flex items-center gap-1.5 bg-black/10 w-fit px-2 py-0.5 rounded-full">
                                <TrendingDown size={12} className="text-rose-200" /> {format(viewDate, 'MMMM')} Total
                            </p>
                        </div>
                    </div>
                </div>

                {/* Co-Admin Section */}
                {user.role === 'co-admin' && (
                    <div className="space-y-6">
                        <CoAdminPanel />
                        <div className="border-t-2 border-slate-100 pt-8" />
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Center Column: Today's Sessions (8 units) */}
                    <div className="lg:col-span-8 space-y-6">
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
                                <div key={slot} className={`rounded-3xl p-6 border transition-all duration-300 relative overflow-hidden flex flex-col justify-between min-h-[220px] transform hover:-translate-y-2 ${
                                    state.status === 'active' ? 'border-blue-200 bg-gradient-to-b from-white to-blue-50 shadow-[0_15px_40px_-15px_rgba(59,130,246,0.3)] ring-1 ring-blue-100' : 
                                    state.status === 'holiday' ? 'border-amber-200 bg-gradient-to-b from-amber-50/80 to-orange-50/80 shadow-xl shadow-amber-500/10 backdrop-blur-sm' :
                                    'border-slate-200 bg-white/80 opacity-80 grayscale-[0.2] shadow-lg backdrop-blur-sm hover:grayscale-0'
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
                                        <h4 className="text-lg font-black text-slate-800 capitalize mb-1">{slot} Session</h4>
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
                                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-500 text-white text-[11px] font-black uppercase tracking-widest shadow-[inset_0_-4px_0_rgba(0,0,0,0.2)] cursor-not-allowed flex items-center justify-center gap-2 opacity-90"
                                            >
                                                <CheckCircle2 size={18} /> Already Marked
                                            </button>
                                        ) : state.status === 'active' ? (
                                            <button 
                                                onClick={() => markAttendance(slot, true)}
                                                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-xs font-black uppercase tracking-widest shadow-[0_6px_0_0_rgba(30,58,138,1)] hover:shadow-[0_4px_0_0_rgba(30,58,138,1)] hover:translate-y-0.5 active:shadow-none active:translate-y-1.5 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CheckCircle2 size={16} /> Mark Present
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
                </div>

                {/* Right Column: Attendance Calendar Widget (4 units) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 shadow-[0_15px_40px_-15px_rgba(0,0,0,0.1)] border border-slate-200/60 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary-100 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none opacity-60"></div>
                        <div className="flex items-center justify-between mb-5">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Calendar size={14} className="text-primary-500" />
                                Attendance Map
                            </h3>
                            <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg">
                                <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-400 transition-all">
                                    <ChevronLeft size={16} />
                                </button>
                                <button onClick={handleNextMonth} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md text-slate-400 transition-all">
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                        
                        <p className="text-base font-black text-slate-800 mb-4 tracking-tight">{format(viewDate, 'MMMM yyyy')}</p>

                        <div className="grid grid-cols-7 gap-1.5 mb-2">
                            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                                <div key={idx} className="text-center text-[10px] font-black text-slate-400 p-1">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1.5">
                            {calendarDays.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const recordsForDate = dashboardData.attendance.filter(a => a.date === dateStr);
                                const record = recordsForDate.find(a => a.totalStatus !== 'Pending') || recordsForDate[0];

                                const isCurrentMonth = day.getMonth() === viewDate.getMonth();
                                const isSun = isSunday(day);
                                
                                const hasValidRecord = record && ['Present', 'Absent', 'Leave'].includes(record.totalStatus);

                                const isTodayDate = isToday(day);
                                let isTodayExpired = false;
                                if (isTodayDate && settings && !record) {
                                    isTodayExpired = Object.keys(settings.slots).every(slotKey => {
                                        const [endH, endM] = settings.slots[slotKey].end.split(':').map(Number);
                                        const expiry = new Date();
                                        expiry.setHours(endH, endM, 0, 0);
                                        return new Date() > expiry;
                                    });
                                }

                                const isBeforeJoin = joinDate && startOfDay(day) < joinDate;
                                let statusColor = 'bg-slate-50 text-slate-300';
                                if (record?.totalStatus === 'Present') {
                                    statusColor = 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400/50';
                                } else if (record?.totalStatus === 'Absent') {
                                    statusColor = 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400/50';
                                } else if (isSun) {
                                    statusColor = 'bg-rose-500/10 text-rose-500 font-black';
                                } else if (isTodayExpired || (isCurrentMonth && day < now && !isTodayDate && !record && !isBeforeJoin)) {
                                    statusColor = 'bg-rose-500 text-white shadow-sm ring-1 ring-rose-400/50';
                                }
                                
                                return (
                                    <div 
                                        key={day.toISOString()} 
                                        className={`aspect-square flex items-center justify-center rounded-xl text-[11px] font-black transition-all ${
                                            !isCurrentMonth ? 'opacity-20 pointer-events-none' : ''
                                        } ${statusColor} ${isToday(day) ? 'ring-2 ring-primary-500 ring-offset-2 scale-110 shadow-lg' : ''}`}
                                    >
                                        {isSun && !hasValidRecord ? 'SUN' : format(day, 'd')}
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 pt-5 border-t border-slate-100">
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Present ({monthlyStats.presentDays})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-sm" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Absent ({monthlyStats.absentDays})</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-2.5 h-2.5 rounded-md bg-slate-100 border border-slate-200" />
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Pending/NA</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </main>

            {/* Attendance Code Modal */}
            {showCodeModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <div className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-2xl bg-primary-50 text-primary-600">
                                    <Key size={32} />
                                </div>
                                <button onClick={() => setShowCodeModal(null)} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-800 capitalize">{showCodeModal} Session Code</h3>
                                <p className="text-slate-500 font-medium mt-1 text-sm">Enter the 6-digit code provided by your admin to mark your presence.</p>
                            </div>

                            <div className="space-y-4">
                                <input 
                                    type="text" 
                                    maxLength="6"
                                    placeholder="Enter 6-digit code"
                                    className="w-full text-center text-4xl font-black tracking-[0.3em] py-5 rounded-2xl border-2 border-slate-200 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none transition-all placeholder:text-slate-200 placeholder:tracking-normal placeholder:text-xl"
                                    value={inputCode}
                                    onChange={(e) => setInputCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                />
                                
                                <button 
                                    onClick={submitCode}
                                    disabled={submitting || inputCode.length !== 6}
                                    className="w-full py-4 rounded-2xl bg-primary-600 text-white font-black uppercase tracking-widest shadow-xl shadow-primary-500/30 hover:bg-primary-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                                >
                                    {submitting ? <RefreshCw size={20} className="animate-spin" /> : 'Verify & Mark Present'}
                                </button>
                                
                                <p className="text-[10px] text-center text-slate-400 font-bold uppercase tracking-wider">
                                    Code is valid for 20 minutes from generation
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Change Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-300">
                        <form onSubmit={handlePasswordChange} className="p-8 space-y-6">
                            <div className="flex justify-between items-start">
                                <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600">
                                    <Key size={32} />
                                </div>
                                <button 
                                    type="button" 
                                    onClick={() => {
                                        setShowPasswordModal(false);
                                        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                                    }} 
                                    className="p-2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    <XCircle size={24} />
                                </button>
                            </div>

                            <div>
                                <h3 className="text-2xl font-black text-slate-800">Change Password</h3>
                                <p className="text-slate-500 font-medium mt-1 text-sm">Update your account password to keep it secure.</p>
                            </div>

                            <div className="space-y-4">
                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showPasswords.current ? "text" : "password"}
                                            placeholder="Enter current password"
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-700 pr-12"
                                            value={passwordData.currentPassword}
                                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPasswords.current ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">New Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showPasswords.new ? "text" : "password"}
                                            placeholder="Enter new password (min. 6 chars)"
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-700 pr-12"
                                            value={passwordData.newPassword}
                                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPasswords.new ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Confirm Password</label>
                                    <div className="relative">
                                        <input 
                                            type={showPasswords.confirm ? "text" : "password"}
                                            placeholder="Confirm new password"
                                            className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all text-slate-700 pr-12"
                                            value={passwordData.confirmPassword}
                                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPasswords.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                
                                <button 
                                    type="submit"
                                    disabled={passwordSubmitting}
                                    className="w-full py-4 mt-2 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest shadow-xl shadow-indigo-500/30 hover:bg-indigo-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                                >
                                    {passwordSubmitting ? <RefreshCw size={20} className="animate-spin" /> : 'Change Password'}
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



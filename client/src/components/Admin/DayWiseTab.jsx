import React, { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, CheckCircle2, XCircle, Clock, Search, ChevronLeft, ChevronRight, User } from 'lucide-react';
import axios from 'axios';
import { 
    format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
    isSameMonth, isSameDay, addDays, eachDayOfInterval,
    addMonths, subMonths, isSunday, startOfDay
} from 'date-fns';

const DayWiseTab = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [attendance, setAttendance] = useState([]);
    const [students, setStudents] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchDayAttendance();
    }, [selectedDate]);

    const fetchDayAttendance = async () => {
        setLoading(true);
        try {
            const dateStr = format(selectedDate, 'yyyy-MM-dd');
            
            const [attRes, stdRes, settRes] = await Promise.all([
                axios.get(`/api/attendance/day/${dateStr}`),
                axios.get('/api/admin/students'),
                axios.get('/api/admin/settings')
            ]);
            
            setAttendance(attRes.data);
            setStudents(stdRes.data);
            setSettings(settRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    // Removed unused parseDate function since we no longer fall back to createdAt

    const mergedData = students.map(student => {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        // Simple matching like Monthly tab for consistency
        const record = attendance.find(a => a.studentId === student.studentId);
        
        const rawJoin = student?.joinDate || student?.createdAt;
        const joinDateObj = rawJoin ? new Date(rawJoin) : null;
        const isBeforeJoin = joinDateObj && startOfDay(selectedDate) < startOfDay(joinDateObj);
        const isPastDate = startOfDay(selectedDate) < startOfDay(new Date());
        
        // Prioritize actual records over Join Date (if they were there, they were there!)
        // However, if there is no record AND it's before join date, it's NA.
        let status = record?.totalStatus || (isBeforeJoin ? 'NA' : 'Pending');
        
        // Final resolution for Pending statuses on past/expired dates
        if (status === 'Pending') {
            if (isPastDate) {
                status = 'Absent';
            } else if (isSameDay(selectedDate, new Date()) && settings) {
                const now = new Date();
                const allExpired = Object.keys(settings.slots).every(slotKey => {
                    const [endH, endM] = settings.slots[slotKey].end.split(':').map(Number);
                    const expiry = new Date();
                    expiry.setHours(endH, endM, 0, 0);
                    return now > expiry;
                });
                if (allExpired) status = 'Absent';
            }
        }

        return {
            ...record,
            student,
            totalStatus: status
        };
    });

    const validAttendance = mergedData.filter(a => a.totalStatus !== 'NA');

    const filteredAttendance = validAttendance.filter(a => {
        const searchLower = searchTerm.toLowerCase();
        return (
            a.student?.fullName?.toLowerCase().includes(searchLower) ||
            a.student?.studentId?.toLowerCase().includes(searchLower)
        );
    });

    const present = filteredAttendance.filter(a => a.totalStatus === 'Present');
    const absent = filteredAttendance.filter(a => a.totalStatus === 'Absent' || a.totalStatus === 'Leave');
    const pending = filteredAttendance.filter(a => a.totalStatus === 'Pending');

    const getGender = (student) => student?.gender === 'Female' ? 'Female' : 'Male';

    const CompactCalendar = () => {
        const monthStart = startOfMonth(currentMonth);
        const monthEnd = endOfMonth(monthStart);
        const startDate = startOfWeek(monthStart);
        const endDate = endOfWeek(monthEnd);
        const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

        return (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-800 text-sm">{format(currentMonth, 'MMMM yyyy')}</h3>
                    <div className="flex gap-1">
                        <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronLeft size={16}/></button>
                        <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded-lg"><ChevronRight size={16}/></button>
                    </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                        <div key={`${d}-${i}`} className="text-[10px] font-bold text-slate-400 text-center py-1">{d}</div>
                    ))}
                    {calendarDays.map(day => (
                        <button
                            key={day.toString()}
                            onClick={() => setSelectedDate(day)}
                            className={`h-8 w-8 flex items-center justify-center text-xs rounded-lg transition-colors ${
                                !isSameMonth(day, monthStart) ? 'text-slate-300' : 
                                isSameDay(day, selectedDate) ? 'bg-primary-600 text-white font-bold' :
                                isSameDay(day, new Date()) ? 'bg-primary-50 text-primary-600 font-bold border border-primary-200' :
                                'text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {format(day, 'd')}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    const MiniStatus = ({ status, isPastDate, slotKey }) => {
        let isMissed = isPastDate && status === 'Pending';
        const isToday = isSameDay(selectedDate, new Date());

        if (!isMissed && status === 'Pending' && isToday && settings && settings.slots[slotKey]) {
            const [endH, endM] = settings.slots[slotKey].end.split(':').map(Number);
            const expiry = new Date();
            expiry.setHours(endH, endM, 0, 0);
            if (new Date() > expiry) isMissed = true;
        }

        const colors = {
            'Present': 'bg-emerald-500',
            'Absent': 'bg-rose-500',
            'Leave': 'bg-amber-500',
            'Pending': isMissed ? 'bg-rose-500' : 'bg-slate-200'
        };
        return (
            <div 
                title={isMissed ? 'Missed (Absent)' : status}
                className={`w-1.5 h-1.5 rounded-full ${colors[status] || (isMissed ? colors.Absent : colors.Pending)}`} 
            />
        );
    };

    const isPastDate = selectedDate < new Date() && !isSameDay(selectedDate, new Date());

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Sidebar - Calendar */}
            <div className="lg:col-span-1 space-y-6">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 mb-1">Attendance Date</h3>
                    <p className="text-xs text-slate-500 font-medium mb-4">Select a date to view records</p>
                    <CompactCalendar />
                </div>

                <div className="glass-card p-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Summary</h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Present</span>
                            <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 text-xs font-bold">{present.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Absent</span>
                            <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 text-xs font-bold">{absent.length}</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-slate-600">Pending</span>
                            <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs font-bold">{pending.length}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Buckets & List */}
            <div className="lg:col-span-3 space-y-6">
                {/* Search and Filters */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search student by name or ID..."
                            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && (
                            <button 
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <XCircle size={18} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Gender Stats Buckets */}
                {!isSunday(selectedDate) && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                <User size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-wider">Male Statistics</p>
                                    <span className="text-[10px] font-bold text-blue-400 bg-white px-1.5 py-0.5 rounded border border-blue-100">
                                        Total: {filteredAttendance.filter(a => getGender(a.student) === 'Male').length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                                        <p className="text-[10px] font-black text-emerald-600 leading-none">{filteredAttendance.filter(a => getGender(a.student) === 'Male' && a.totalStatus === 'Present').length}</p>
                                        <p className="text-[8px] font-bold text-emerald-400 uppercase mt-0.5">Present</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-rose-50 border border-rose-100">
                                        <p className="text-[10px] font-black text-rose-600 leading-none">{filteredAttendance.filter(a => getGender(a.student) === 'Male' && (a.totalStatus === 'Absent' || a.totalStatus === 'Leave')).length}</p>
                                        <p className="text-[8px] font-bold text-rose-400 uppercase mt-0.5">Absent</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-600 leading-none">{filteredAttendance.filter(a => getGender(a.student) === 'Male' && a.totalStatus === 'Pending').length}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Pending</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100 flex items-center gap-4 shadow-sm">
                            <div className="w-12 h-12 rounded-xl bg-pink-600 flex items-center justify-center text-white shadow-lg shadow-pink-500/20">
                                <User size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-pink-600 uppercase tracking-wider">Female Statistics</p>
                                    <span className="text-[10px] font-bold text-pink-400 bg-white px-1.5 py-0.5 rounded border border-pink-100">
                                        Total: {filteredAttendance.filter(a => getGender(a.student) === 'Female').length}
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="text-center p-1.5 rounded-lg bg-emerald-50 border border-emerald-100">
                                        <p className="text-[10px] font-black text-emerald-600 leading-none">{filteredAttendance.filter(a => getGender(a.student) === 'Female' && a.totalStatus === 'Present').length}</p>
                                        <p className="text-[8px] font-bold text-emerald-400 uppercase mt-0.5">Present</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-rose-50 border border-rose-100">
                                        <p className="text-[10px] font-black text-rose-600 leading-none">{filteredAttendance.filter(a => getGender(a.student) === 'Female' && (a.totalStatus === 'Absent' || a.totalStatus === 'Leave')).length}</p>
                                        <p className="text-[8px] font-bold text-rose-400 uppercase mt-0.5">Absent</p>
                                    </div>
                                    <div className="text-center p-1.5 rounded-lg bg-slate-50 border border-slate-200">
                                        <p className="text-[10px] font-black text-slate-600 leading-none">{filteredAttendance.filter(a => getGender(a.student) === 'Female' && a.totalStatus === 'Pending').length}</p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Pending</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Multi-Column List Container */}
                <div className="">
                    {isSunday(selectedDate) ? (
                        <div className="glass-card p-20 flex flex-col items-center justify-center gap-6 text-rose-500 animate-in fade-in zoom-in duration-500 min-h-[400px]">
                            <div className="w-32 h-32 rounded-full bg-rose-50 flex items-center justify-center text-6xl shadow-inner border-2 border-rose-100/50">🎉</div>
                            <div className="text-center">
                                <h3 className="text-5xl font-black uppercase tracking-tighter bg-gradient-to-br from-rose-500 to-orange-500 bg-clip-text text-transparent">ENJOY!</h3>
                                <p className="text-lg font-bold opacity-60 mt-2">Sundays are holidays. No attendance records needed.</p>
                            </div>
                        </div>
                    ) : loading ? (
                        <div className="glass-card p-20 text-center"><div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div></div>
                    ) : filteredAttendance.length > 0 ? (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                {/* Present Column */}
                                <div className="flex flex-col gap-4">
                                    <div className="px-4 py-3 bg-emerald-500 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-emerald-500/20">
                                        <div className="flex items-center gap-2">
                                            <CheckCircle2 size={18} />
                                            <h4 className="font-bold text-sm">Present</h4>
                                        </div>
                                        <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">{present.length}</span>
                                    </div>
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 pb-2">
                                        {present.length > 0 ? present.map((record) => (
                                            <div key={record.student.studentId} className="glass-card p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform border-l-4 border-l-emerald-500">
                                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 font-bold text-[10px]">
                                                    {record.student?.fullName?.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">{record.student?.fullName}</p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[10px] text-slate-500 truncate">{record.student?.studentId}</p>
                                                        <div className="flex gap-1">
                                                            <MiniStatus status={record.slots?.morning || 'Pending'} isPastDate={isPastDate} slotKey="morning" />
                                                            <MiniStatus status={record.slots?.afternoon || 'Pending'} isPastDate={isPastDate} slotKey="afternoon" />
                                                            <MiniStatus status={record.slots?.evening || 'Pending'} isPastDate={isPastDate} slotKey="evening" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">No present students</div>
                                        )}
                                    </div>
                                </div>

                                {/* Absent Column */}
                                <div className="flex flex-col gap-4">
                                    <div className="px-4 py-3 bg-rose-500 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-rose-500/20">
                                        <div className="flex items-center gap-2">
                                            <XCircle size={18} />
                                            <h4 className="font-bold text-sm">Absent</h4>
                                        </div>
                                        <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">{absent.length}</span>
                                    </div>
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 pb-2">
                                        {absent.length > 0 ? absent.map((record) => (
                                            <div key={record.student.studentId} className="glass-card p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform border-l-4 border-l-rose-500">
                                                <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 shrink-0 font-bold text-[10px]">
                                                    {record.student?.fullName?.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">{record.student?.fullName}</p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[10px] text-slate-500 truncate">{record.student?.studentId}</p>
                                                        <div className="flex gap-1">
                                                            <MiniStatus status={record.slots?.morning || 'Pending'} isPastDate={isPastDate} slotKey="morning" />
                                                            <MiniStatus status={record.slots?.afternoon || 'Pending'} isPastDate={isPastDate} slotKey="afternoon" />
                                                            <MiniStatus status={record.slots?.evening || 'Pending'} isPastDate={isPastDate} slotKey="evening" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">No absent students</div>
                                        )}
                                    </div>
                                </div>

                                {/* Pending Column */}
                                <div className="flex flex-col gap-4">
                                    <div className="px-4 py-3 bg-slate-500 rounded-2xl flex items-center justify-between text-white shadow-lg shadow-slate-500/20">
                                        <div className="flex items-center gap-2">
                                            <Clock size={18} />
                                            <h4 className="font-bold text-sm">Pending</h4>
                                        </div>
                                        <span className="bg-white/20 px-2 py-0.5 rounded-lg text-xs font-black">{pending.length}</span>
                                    </div>
                                    <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2 pb-2">
                                        {pending.length > 0 ? pending.map((record) => (
                                            <div key={record.student.studentId} className="glass-card p-3 flex items-center gap-3 hover:scale-[1.02] transition-transform border-l-4 border-l-slate-400">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 shrink-0 font-bold text-[10px]">
                                                    {record.student?.fullName?.charAt(0)}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-800 text-sm truncate">{record.student?.fullName}</p>
                                                    <div className="flex items-center justify-between gap-2">
                                                        <p className="text-[10px] text-slate-500 truncate">{record.student?.studentId}</p>
                                                        <div className="flex gap-1">
                                                            <MiniStatus status={record.slots?.morning || 'Pending'} isPastDate={isPastDate} slotKey="morning" />
                                                            <MiniStatus status={record.slots?.afternoon || 'Pending'} isPastDate={isPastDate} slotKey="afternoon" />
                                                            <MiniStatus status={record.slots?.evening || 'Pending'} isPastDate={isPastDate} slotKey="evening" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 text-center text-slate-400 text-xs italic bg-slate-50 rounded-2xl border border-dashed border-slate-200">No pending students</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </>
                    ) : (
                        <div className="glass-card p-20 text-center text-slate-400 italic">No students found</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DayWiseTab;


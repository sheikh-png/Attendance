import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, ChevronLeft, ChevronRight, UserMinus, AlertCircle } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSunday, startOfDay, isSameDay, isSameMonth, parseISO } from 'date-fns';

const TotalAbsentsTab = () => {
    const [students, setStudents] = useState([]);
    const [allAttendance, setAllAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [stdRes, attRes] = await Promise.all([
                axios.get('/api/admin/students'),
                axios.get('/api/attendance/all')
            ]);
            setStudents(stdRes.data);
            setAllAttendance(attRes.data);
        } catch (error) {
            console.error('Error fetching leave stats:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevMonth = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() - 1);
            return newDate;
        });
    };

    const handleNextMonth = () => {
        setSelectedDate(prev => {
            const newDate = new Date(prev);
            newDate.setMonth(newDate.getMonth() + 1);
            return newDate;
        });
    };

    // Find the earliest date in the entire system to use as a fallback for missing Join Dates
    const globalSystemStart = useMemo(() => {
        if (allAttendance.length === 0) return startOfMonth(new Date());
        const sortedDates = allAttendance.map(a => a.date).sort();
        const [y, m, d] = sortedDates[0].split('-').map(Number);
        return new Date(y, m - 1, d);
    }, [allAttendance]);

    const studentStats = useMemo(() => {
        const today = startOfDay(new Date());
        const mStart = startOfMonth(selectedDate);
        const mEnd = endOfMonth(selectedDate);

        return students.map(s => {
            const studentRecords = allAttendance.filter(a => a.studentId === s.studentId);
            
            // Map for fast lookup
            const recordMap = {};
            studentRecords.forEach(r => {
                recordMap[r.date] = r.totalStatus;
            });

            // Parse Join Date safely
            let joinDate = null;
            if (s.joinDate) {
                const [y, m, d] = s.joinDate.split('T')[0].split('-').map(Number);
                joinDate = new Date(y, m - 1, d);
            }

            // 1. Calculate Monthly Absents (Entire selected month)
            let monthlyAbsents = 0;
            const monthDays = eachDayOfInterval({ start: mStart, end: mEnd });
            monthDays.forEach(day => {
                if (!isSunday(day)) {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const recordStatus = recordMap[dateStr];
                    const isPast = startOfDay(day) < today;
                    const isBeforeJoin = joinDate && startOfDay(day) < joinDate;

                    if (isBeforeJoin) return; // Skip days before they joined

                    let currentStatus;
                    if (recordStatus) {
                        currentStatus = recordStatus;
                    } else if (isPast) {
                        currentStatus = 'Absent';
                    } else {
                        currentStatus = 'Pending';
                    }

                    if (currentStatus === 'Absent' || (isPast && currentStatus === 'Pending')) {
                        monthlyAbsents++;
                    }
                }
            });

            // 2. Calculate Lifetime Absents
            let totalAbsents = 0;
            // Use Join Date if exists, otherwise use the Earliest Record in the system
            let startDate = joinDate || globalSystemStart;

            let iter = new Date(startDate);
            while (iter <= today) {
                if (!isSunday(iter)) {
                    const dateStr = format(iter, 'yyyy-MM-dd');
                    const recordStatus = recordMap[dateStr];
                    const isPast = startOfDay(iter) < today;
                    
                    let currentStatus;
                    if (recordStatus) {
                        currentStatus = recordStatus;
                    } else if (isPast) {
                        currentStatus = 'Absent';
                    } else {
                        currentStatus = 'Pending';
                    }

                    if (currentStatus === 'Absent' || (isPast && currentStatus === 'Pending')) {
                        totalAbsents++;
                    }
                }
                iter.setDate(iter.getDate() + 1);
            }

            return { ...s, monthlyAbsents, totalAbsents };
        }).filter(s => 
            s.fullName.toLowerCase().includes(search.toLowerCase()) || 
            s.studentId.includes(search)
        ).sort((a, b) => b.totalAbsents - a.totalAbsents);
    }, [students, allAttendance, selectedDate, search, globalSystemStart]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative max-w-md w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search student name or ID..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-sm"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-4 bg-white px-2 py-1.5 rounded-xl shadow-sm border border-slate-200">
                    <button 
                        onClick={handlePrevMonth}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>
                    <div className="w-32 text-center">
                        <span className="font-bold text-slate-700">{format(selectedDate, 'MMMM yyyy')}</span>
                    </div>
                    <button 
                        onClick={handleNextMonth}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course / House</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-rose-50/50">Current Month Absents</th>
                                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-rose-100/50 border-l border-slate-200">Total Lifetime Absents</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {studentStats.map((student) => (
                                <tr key={student._id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm">
                                                {student.fullName.charAt(0)}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-900">{student.fullName}</p>
                                                <p className="text-xs font-semibold text-slate-500">{student.studentId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-sm font-semibold text-slate-700">{student.course}</span>
                                            <span className="text-xs text-slate-500">{student.house}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-center bg-rose-50/20">
                                        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm ${student.monthlyAbsents > 0 ? 'bg-rose-100 text-rose-700' : 'text-slate-400'}`}>
                                            {student.monthlyAbsents}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-center bg-rose-50/50 border-l border-slate-100">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-lg font-black text-rose-600">{student.totalAbsents}</span>
                                            {student.totalAbsents > 5 && (
                                                <AlertCircle size={16} className="text-rose-500" title="High number of total absents" />
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {studentStats.length === 0 && (
                                <tr>
                                    <td colSpan="4" className="px-6 py-12 text-center text-slate-500">
                                        <UserMinus size={48} className="mx-auto mb-4 text-slate-300" />
                                        <p className="font-medium text-lg">No students found</p>
                                        <p className="text-sm text-slate-400">Try adjusting your search criteria</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TotalAbsentsTab;


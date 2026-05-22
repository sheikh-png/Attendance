import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Users, Home, Calendar, Award, AlertTriangle, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { format, getDaysInMonth, startOfMonth, endOfMonth, addMonths, subMonths, isSameMonth, eachDayOfInterval, isSunday } from 'date-fns';

const MonthlyProgressTab = () => {
    const [stats, setStats] = useState({
        topPerformers: [],
        lowPerformers: [],
        houseStats: []
    });
    const [selectedMonth, setSelectedMonth] = useState(new Date());
    const [loading, setLoading] = useState(true);

     useEffect(() => {
        fetchMonthlyStats();
    }, [selectedMonth]);

    const handlePrevMonth = () => setSelectedMonth(subMonths(selectedMonth, 1));
    const handleNextMonth = () => setSelectedMonth(addMonths(selectedMonth, 1));

    const fetchMonthlyStats = async () => {
        setLoading(true);
        try {
            const { data: students } = await axios.get('/api/admin/students');
            const { data: attendance } = await axios.get('/api/attendance/all');
            
            const now = new Date();
            const isCurrentMonth = isSameMonth(selectedMonth, now);
            const monthStart = startOfMonth(selectedMonth);
            const monthEnd = endOfMonth(selectedMonth);
            
            // Filter attendance for the selected month
            const currentMonthAttendance = attendance.filter(a => {
                const aDate = new Date(a.date);
                return aDate >= monthStart && aDate <= monthEnd;
            });

            // Calculate per student - considering their join date
            const studentMetrics = students.map(s => {
                // Calculate class days for THIS specific student
                // Start from: max(joinDate, monthStart)
                const studentJoinDate = new Date(s.joinDate || s.createdAt);
                const effectiveStart = studentJoinDate > monthStart ? studentJoinDate : monthStart;
                
                // End on: min(today, monthEnd) if current month, else monthEnd
                const endCheck = isCurrentMonth ? now : monthEnd;
                const effectiveEnd = endCheck > monthEnd ? monthEnd : endCheck;
                
                // Calculate class days (excluding Sundays) from effective start to effective end
                const daysInterval = eachDayOfInterval({ 
                    start: effectiveStart, 
                    end: effectiveEnd 
                });
                const sClassDaysCount = daysInterval.filter(d => !isSunday(d)).length;

                const studentAttendance = currentMonthAttendance.filter(a => a.studentId === s.studentId);
                const presentCount = studentAttendance.filter(a => a.totalStatus === 'Present').length;
                const percentage = sClassDaysCount > 0 ? ((presentCount / sClassDaysCount) * 100).toFixed(1) : 0;
                return { ...s, presentCount, sClassDaysCount, percentage: parseFloat(percentage) };
            });

            // Top Performers
            const topPerformers = [...studentMetrics].sort((a, b) => b.percentage - a.percentage).slice(0, 10);

            // House Stats
            const houses = [...new Set(students.map(s => s.house))];
            const houseMetrics = houses.map(h => {
                const houseStudents = studentMetrics.filter(s => s.house === h);
                const avgPercentage = houseStudents.length > 0 
                    ? (houseStudents.reduce((acc, curr) => acc + curr.percentage, 0) / houseStudents.length).toFixed(1)
                    : 0;
                return { house: h, percentage: parseFloat(avgPercentage), count: houseStudents.length };
            });

            // Low Performers (below 75% or bottom 10 students)
            const lowPerformers = [...studentMetrics]
                .filter(s => s.percentage < 75)
                .sort((a, b) => a.percentage - b.percentage);

            setStats({
                topPerformers,
                lowPerformers,
                houseStats: houseMetrics.sort((a, b) => b.percentage - a.percentage).slice(0, 3)
            });

        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="h-64 flex items-center justify-center"><div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="space-y-8">
            {/* Top Section - House Championship & Top Per House */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <Home className="text-primary-600" size={20} />
                        <h3 className="text-lg font-bold text-slate-800">House Championship & Top Performers</h3>
                    </div>

                    <div className="flex items-center gap-4 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
                        <button 
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-primary-600 transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className="flex items-center gap-2 min-w-[140px] justify-center">
                            <Calendar size={16} className="text-primary-500" />
                            <span className="font-black text-slate-700 uppercase tracking-tight">
                                {format(selectedMonth, 'MMMM yyyy')}
                            </span>
                        </div>

                        <button 
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-slate-50 rounded-xl text-slate-400 hover:text-primary-600 transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {stats.houseStats.length > 0 ? stats.houseStats.map((house, idx) => {
                        // Filter top students for THIS house
                        const houseTopPerformers = stats.topPerformers
                            .filter(s => s.house === house.house)
                            .slice(0, 3); // Top 3 per house

                        return (
                            <div key={house.house} className="flex flex-col gap-4">
                                {/* House Card */}
                                <div className={`glass-card p-6 border-b-4 h-fit ${
                                    idx === 0 ? 'border-amber-400' : idx === 1 ? 'border-slate-300' : 'border-orange-300'
                                }`}>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                                            idx === 0 ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-600'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <TrendingUp className="text-emerald-500" size={18} />
                                    </div>
                                    <h4 className="text-xl font-black text-slate-800 mb-1">{house.house}</h4>
                                    <p className="text-xs text-slate-500 font-bold mb-4">{house.count} Students</p>
                                    <div className="space-y-2">
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="font-bold text-slate-600">Monthly Avg</span>
                                            <span className="font-black text-primary-600">{house.percentage}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div 
                                                className="bg-primary-600 h-full transition-all duration-1000" 
                                                style={{ width: `${house.percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Top Students in this House */}
                                <div className="glass-card overflow-hidden">
                                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-[10px] font-black uppercase text-slate-500">
                                        Top in {house.house}
                                    </div>
                                    <div className="divide-y divide-slate-100">
                                        {houseTopPerformers.length > 0 ? houseTopPerformers.map((student, sIdx) => (
                                            <div key={`top-${student._id}-${sIdx}`} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-800 truncate">{student.fullName}</p>
                                                    <p className="text-[10px] text-slate-400 truncate">{student.studentId}</p>
                                                </div>
                                                <span className="text-xs font-black text-primary-600">{student.presentCount}/{student.sClassDaysCount} Days</span>
                                            </div>
                                        )) : (
                                            <div className="p-4 text-center text-[10px] text-slate-400 italic">No data</div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    }) : (
                        <div className="col-span-3 text-center py-10 text-slate-400 italic bg-white rounded-2xl border border-dashed border-slate-200">
                            No house data available.
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Section - Low Attendance Watchlist */}
            <div className="glass-card overflow-hidden border-rose-100 border-2">
                <div className="p-6 border-b border-rose-50 bg-rose-50/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                            <AlertTriangle size={28} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-rose-900">Attendance Watchlist (Below 75%)</h3>
                            <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Immediate attention required</p>
                        </div>
                    </div>
                </div>
                <div className="p-0">
                    <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100">
                        {stats.lowPerformers.length > 0 ? stats.lowPerformers.map((student, lIdx) => (
                            <div key={`low-${student._id}-${lIdx}`} className="p-4 flex items-center justify-between hover:bg-rose-50/30 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600 font-black text-xs">
                                        {student.fullName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{student.fullName}</p>
                                        <p className="text-xs text-slate-500">{student.studentId} • {student.house} House</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-black text-rose-600">{student.sClassDaysCount - student.presentCount} Days Absent</p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase justify-end">
                                        <UserX size={10} /> Total missed
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-2 p-10 text-center text-slate-400 italic">
                                Great! No students are below the 75% threshold this month.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MonthlyProgressTab;


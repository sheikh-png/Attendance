import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    format,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    getYear,
    getMonth,
    isSunday,
    isAfter,
    startOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Search, X, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const AllAttendanceTab = (props) => {
    const [attendance, setAttendance] = useState([]);
    const [students, setStudents] = useState([]);
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Date Selection State
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [dates, setDates] = useState([]);

    // Edit Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState(null);
    const [editDate, setEditDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [editSlots, setEditSlots] = useState({ morning: 'Pending', afternoon: 'Pending', evening: 'Pending' });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const start = startOfMonth(selectedDate);
        const end = endOfMonth(selectedDate);
        const days = eachDayOfInterval({ start, end });
        setDates(days);
        fetchData();
    }, [selectedDate]);

    useEffect(() => {
        if (editingStudent && editDate) {
            const existing = attendance.find(a => a.studentId === editingStudent.studentId && a.date === editDate);
            if (existing) {
                setEditSlots(existing.slots);
            } else {
                setEditSlots({ morning: 'Pending', afternoon: 'Pending', evening: 'Pending' });
            }
        }
    }, [editDate, editingStudent]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const year = getYear(selectedDate);
            const month = getMonth(selectedDate) + 1;

            const [attRes, stdRes, settRes] = await Promise.all([
                axios.get(`/api/attendance/month/${year}/${month}`),
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

    const handleSaveAttendance = async () => {
        if (!editingStudent) return;
        setSaving(true);
        try {
            await axios.post('/api/attendance/admin-update', {
                studentId: editingStudent.studentId,
                date: editDate,
                slots: editSlots
            });
            await fetchData();
            if (props.refreshStats) await props.refreshStats(); // Refresh dashboard counts
            setIsEditModalOpen(false);
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert('Failed to save attendance');
        } finally {
            setSaving(false);
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

    const getStatus = (studentId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const entry = attendance.find(a => a.studentId === studentId && a.date === dateStr);
        
        // Use date-fns for robust comparison
        const today = startOfDay(new Date());
        const compareDate = startOfDay(date);
        const isPast = compareDate < today;

        if (entry) {
            if (entry.totalStatus === 'Present') return 'Present';
            if (entry.totalStatus === 'Leave') return 'Leave';
            if (entry.totalStatus === 'Absent') return 'Absent';
            // If the record exists but status is somehow 'Pending', treat as Absent for past
            return isPast ? 'Absent' : 'Pending';
        }

        const student = students.find(s => s.studentId === studentId);
        const rawJoin = student?.joinDate || student?.createdAt;
        const joinDateObj = rawJoin ? new Date(rawJoin) : null;
        const isBeforeJoin = joinDateObj && startOfDay(date) < startOfDay(joinDateObj);

        // No record exists
        return isBeforeJoin ? 'NA' : (isPast ? 'Absent' : 'Pending');
    };

    const getAttendanceEntry = (studentId, date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        return attendance.find(a => a.studentId === studentId && a.date === dateStr);
    };

    const MiniBadge = ({ status, label, isPastDate, date, slotKey }) => {
        let isMissed = isPastDate && status === 'Pending';
        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

        if (!isMissed && status === 'Pending' && isToday && settings && settings.slots[slotKey]) {
            const [endH, endM] = settings.slots[slotKey].end.split(':').map(Number);
            const expiry = new Date();
            expiry.setHours(endH, endM, 0, 0);
            if (new Date() > expiry) isMissed = true;
        }
        const styles = {
            'Present': 'bg-emerald-100 text-emerald-700',
            'Absent': 'bg-rose-100 text-rose-700',
            'Leave': 'bg-amber-100 text-amber-700',
            'Pending': isMissed ? 'bg-rose-100 text-rose-700' : 'bg-slate-50 text-slate-300'
        };
        const letters = {
            'Present': 'P',
            'Absent': 'A',
            'Leave': 'L',
            'Pending': isMissed ? 'A' : '-'
        };
        return (
            <div className="flex flex-col items-center gap-0.5">
                <div 
                    title={`${label}: ${isMissed ? 'Missed (Absent)' : status}`} 
                    className={`w-4 h-4 text-[8px] font-black flex items-center justify-center rounded-sm ${styles[status] || styles.Pending}`}
                >
                    {(status === 'Present') ? 'P' : (status === 'Leave') ? 'L' : (status === 'Absent' || isMissed) ? 'A' : '-'}
                </div>
                <span className="text-[6px] font-black text-slate-400 opacity-80 leading-none">{label.charAt(0)}</span>
            </div>
        );
    };

    const StatusBadge = ({ status, isPastDate, date }) => {
        let displayStatus = status;
        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

        if (status === 'Pending') {
            if (isPastDate) {
                displayStatus = 'Absent';
            } else if (isToday && settings) {
                // If it's today, check if all slots have expired
                const now = new Date();
                const allExpired = Object.keys(settings.slots).every(slotKey => {
                    const [endH, endM] = settings.slots[slotKey].end.split(':').map(Number);
                    const expiry = new Date();
                    expiry.setHours(endH, endM, 0, 0);
                    return now > expiry;
                });
                if (allExpired) displayStatus = 'Absent';
            }
        }

        const isMissed = displayStatus === 'Absent' && status === 'Pending';

        const styles = {
            'Present': 'text-emerald-600 bg-emerald-50',
            'Absent': 'text-rose-600 bg-rose-50',
            'Leave': 'text-amber-600 bg-amber-50',
            'Pending': 'text-slate-300 bg-slate-50'
        };
        const labels = {
            'Present': 'P',
            'Absent': 'A',
            'Leave': 'L',
            'Pending': '-'
        };
        return (
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${styles[displayStatus] || styles.Pending}`}>
                {labels[displayStatus] || '-'}
            </div>
        );
    };

    const handleExport = () => {
        // Prepare data for Excel
        const rows = filteredStudents.map(student => {
            const rowData = {
                'Student Name': student.fullName,
                'Student ID': student.studentId,
                'Course': student.course,
                'House': student.house,
            };

            // Add each date as a column
            dates.forEach(date => {
                const dateHeader = format(date, 'dd-MMM-yyyy');
                rowData[dateHeader] = getStatus(student.studentId, date);
            });

            return rowData;
        });

        // Create Worksheet
        const worksheet = XLSX.utils.json_to_sheet(rows);
        
        // Create Workbook
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

        // Force download as .xlsx
        XLSX.writeFile(workbook, `Monthly_Attendance_${format(selectedDate, 'MMM_yyyy')}.xlsx`);
    };

    // Filter students based on search term
    const filteredStudents = students.filter(student =>
        student.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.studentId.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-4">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handlePrevMonth}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <div className="px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 flex items-center gap-2 min-w-[200px] justify-center">
                            <CalendarIcon size={16} className="text-primary-500" />
                            <span className="font-bold text-slate-700">{format(selectedDate, 'MMMM yyyy')}</span>
                        </div>
                        <button
                            onClick={handleNextMonth}
                            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all active:scale-95"
                    >
                        <Download size={16} /> Export
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    {/* Search Box */}
                    <div className="relative flex-1 md:flex-none">
                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-8 py-2 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-primary-500 outline-none text-sm w-full md:w-64 transition-all"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={18} />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-wider">
                        <div className="flex items-center gap-2 text-slate-600"><div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" /> Present</div>
                        <div className="flex items-center gap-2 text-slate-600"><div className="w-3 h-3 rounded-full bg-rose-500 shadow-sm" /> Absent</div>
                    </div>
                </div>
            </div>

            <div className="glass-card overflow-hidden shadow-xl border-white/40">
                <div className="overflow-x-auto overflow-y-auto max-h-[70vh]">
                    <table className="w-full border-collapse">
                        <thead className="sticky top-0 z-20">
                            <tr className="bg-slate-900 text-white">
                                <th className="sticky left-0 z-30 bg-slate-900 px-6 py-4 border-b border-white/10 text-xs font-black uppercase text-left min-w-[220px]">
                                    Student Details
                                </th>
                                <th className="bg-slate-900 px-4 py-4 border-b border-white/10 text-xs font-black uppercase text-center min-w-[80px]">
                                    Gender
                                </th>
                                {dates.map((date, dIdx) => (
                                    <th key={`head-${date.getTime()}-${dIdx}`} className="p-4 border-b border-white/10 text-[10px] font-black uppercase text-center min-w-[50px]">
                                        <p className="opacity-60">{format(date, 'EEE')}</p>
                                        <p className="text-sm">{format(date, 'dd')}</p>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={dates.length + 1} className="p-20 text-center">
                                        <div className="animate-spin h-8 w-8 border-2 border-primary-600 border-t-transparent rounded-full mx-auto"></div>
                                        <p className="mt-4 text-slate-500 font-medium">Crunching data for {format(selectedDate, 'MMMM')}...</p>
                                    </td>
                                </tr>
                            ) : filteredStudents.length > 0 ? filteredStudents.map((student, sIdx) => (
                                <tr key={`${student._id || student.studentId}-${sIdx}`} className="hover:bg-slate-50/80 transition-colors group">
                                    <td
                                        className="sticky left-0 z-10 bg-white group-hover:bg-slate-50 p-4 border-r border-slate-100 shadow-[4px_0_10px_-4px_rgba(0,0,0,0.05)] cursor-pointer"
                                        onClick={() => {
                                            setEditingStudent(student);
                                            setEditDate(format(new Date(), 'yyyy-MM-dd'));
                                            setIsEditModalOpen(true);
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center font-black text-[10px]">
                                                {student.fullName.split(' ').map(n => n[0]).join('')}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-bold text-slate-800 text-sm truncate group-hover:text-primary-600 transition-colors">{student.fullName}</p>
                                                <p className="text-[10px] text-slate-400 font-medium">{student.studentId}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 border-r border-slate-100 text-center">
                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${student.gender === 'Female' ? 'bg-pink-100 text-pink-600 border border-pink-200' : 'bg-blue-100 text-blue-600 border border-blue-200'}`}>
                                            {student.gender === 'Female' ? 'F' : 'M'}
                                        </span>
                                    </td>
                                    {dates.map(date => {
                                         const isSun = isSunday(date);
                                         const rawJoin = student?.joinDate || student?.createdAt;
                                         const joinDateObj = rawJoin ? new Date(rawJoin) : null;
                                         const isBeforeJoin = joinDateObj && startOfDay(date) < startOfDay(joinDateObj);
                                         const entry = getAttendanceEntry(student.studentId, date);
                                         
                                         // Prioritize actual records over Join Date
                                         let status = entry?.totalStatus || (isBeforeJoin ? 'NA' : 'Pending');
                                         const isPastDate = startOfDay(date) < startOfDay(new Date());

                                         return (
                                             <td key={date.toISOString()} className="p-2 text-center text-[10px] font-black uppercase">
                                                 <div className="flex flex-col items-center gap-1.5">
                                                     {isSun ? (
                                                         <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-500 border border-orange-100 flex items-center justify-center text-[8px] leading-tight">
                                                             SUN
                                                         </div>
                                                     ) : status === 'NA' ? (
                                                         <div className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 border border-slate-100 flex items-center justify-center text-[8px] font-bold">
                                                             NA
                                                         </div>
                                                     ) : (
                                                         <>
                                                              <StatusBadge status={status} isPastDate={isPastDate} date={date} />
                                                             <div className="flex gap-1" title="Morning | Afternoon | Evening">
                                                                  <MiniBadge status={entry?.slots?.morning || 'Pending'} label="M" isPastDate={isPastDate} date={date} slotKey="morning" />
                                                                  <MiniBadge status={entry?.slots?.afternoon || 'Pending'} label="A" isPastDate={isPastDate} date={date} slotKey="afternoon" />
                                                                  <MiniBadge status={entry?.slots?.evening || 'Pending'} label="E" isPastDate={isPastDate} date={date} slotKey="evening" />
                                                             </div>
                                                         </>
                                                     )}
                                                 </div>
                                             </td>
                                         );
                                    })}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={dates.length + 1} className="p-20 text-center text-slate-400 italic font-medium">
                                        {searchTerm ? 'No students match your search.' : 'No students found in the system.'}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Attendance Modal */}
            {isEditModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div>
                                <h3 className="text-2xl font-black text-slate-900">Edit Attendance</h3>
                                <p className="text-sm font-medium text-slate-500 mt-1">{editingStudent?.fullName} ({editingStudent?.studentId})</p>
                            </div>
                            <button
                                onClick={() => setIsEditModalOpen(false)}
                                className="p-3 hover:bg-white hover:shadow-md rounded-2xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="p-8 space-y-8">
                            {/* Date Picker Section */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Date</label>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-primary-500" size={20} />
                                    <input
                                        type="date"
                                        className="w-full pl-12 pr-4 py-4 rounded-2xl border-2 border-slate-100 focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 outline-none font-bold text-slate-700 transition-all bg-slate-50/30"
                                        value={editDate}
                                        onChange={(e) => setEditDate(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Slots Section */}
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Attendance Sessions</label>
                                <div className="grid grid-cols-3 gap-4">
                                    {['morning', 'afternoon', 'evening'].map(slot => (
                                        <div key={slot} className="space-y-2">
                                            <p className="text-[9px] font-black text-slate-400 uppercase text-center tracking-tighter">{slot}</p>
                                            <button
                                                onClick={() => {
                                                    const cycle = { 'Pending': 'Present', 'Present': 'Absent', 'Absent': 'Present' };
                                                    const newStatus = cycle[editSlots[slot]] || 'Present';
                                                    
                                                    setEditSlots(prev => {
                                                        const updated = { ...prev, [slot]: newStatus };
                                                        
                                                        // Auto-fill logic: If exactly 2 slots are 'Present' and the 3rd is 'Pending', 
                                                        // make the 3rd 'Absent'.
                                                        const slots = ['morning', 'afternoon', 'evening'];
                                                        const presentCount = slots.filter(s => updated[s] === 'Present').length;
                                                        
                                                        if (presentCount === 2) {
                                                            const pendingSlot = slots.find(s => updated[s] === 'Pending');
                                                            if (pendingSlot) {
                                                                updated[pendingSlot] = 'Absent';
                                                            }
                                                        }
                                                        
                                                        return updated;
                                                    });
                                                }}
                                                className={`w-full py-4 rounded-2xl font-black text-xs transition-all border-2 flex flex-col items-center gap-2 ${
                                                    editSlots[slot] === 'Present' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-sm' :
                                                    editSlots[slot] === 'Absent' ? 'bg-rose-50 border-rose-200 text-rose-600 shadow-sm' :
                                                    'bg-slate-50 border-slate-100 text-slate-400'
                                                }`}
                                            >
                                                <span className="text-xl">
                                                    {editSlots[slot] === 'Present' ? '✓' : editSlots[slot] === 'Absent' ? '✕' : '−'}
                                                </span>
                                                {editSlots[slot]}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 px-6 py-4 rounded-2xl border-2 border-slate-100 text-slate-500 font-black text-sm hover:bg-slate-50 transition-all uppercase tracking-widest"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveAttendance}
                                    disabled={saving}
                                    className="flex-[2] px-6 py-4 rounded-2xl bg-slate-900 text-white font-black text-sm hover:bg-slate-800 shadow-xl shadow-slate-900/20 transition-all uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {saving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : 'Save Attendance'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AllAttendanceTab;


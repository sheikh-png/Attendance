import React, { useState, useEffect } from 'react';
import { 
    Search, Filter, Plus, Download, Edit2, Trash2, 
    User, Users, UserCheck, UserX,
    TrendingUp, TrendingDown, RefreshCw, ShieldCheck, ShieldAlert, Eye, EyeOff
} from 'lucide-react';
import axios from 'axios';

const StudentsTab = ({ stats, refreshStats }) => {
    const TotalCard = () => {
        const stats = {
            sop: students.filter(s => s.course === 'SOP').length,
            sob: students.filter(s => s.course === 'SOB').length,
            sof: students.filter(s => s.course === 'SOF').length,
            total: students.length
        };
        return (
            <div className="glass-card p-4 transition-all hover:shadow-lg border border-primary-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-primary-50 text-primary-500">
                            <Users size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">All Students</h3>
                    </div>
                    <div className="text-[10px] font-black text-white bg-primary-400 px-2 py-0.5 rounded-full shadow-sm">
                        {stats.total}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">SOP</p>
                        <p className="text-lg font-black text-primary-500 leading-none">{stats.sop}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">SOB</p>
                        <p className="text-lg font-black text-emerald-600 leading-none">{stats.sob}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">SOF</p>
                        <p className="text-lg font-black text-amber-600 leading-none">{stats.sof}</p>
                    </div>
                </div>
            </div>
        );
    };

    const GenderCard = () => {
        const stats = {
            male: students.filter(s => (s.gender || 'Male') === 'Male').length,
            female: students.filter(s => s.gender === 'Female').length,
            total: students.length
        };
        return (
            <div className="glass-card p-4 transition-all hover:shadow-lg border border-indigo-100">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500">
                            <User size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">Gender Ratio</h3>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">Male</p>
                        <p className="text-lg font-black text-primary-600 leading-none">{stats.male}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">Female</p>
                        <p className="text-lg font-black text-rose-500 leading-none">{stats.female}</p>
                    </div>
                </div>
            </div>
        );
    };

    const getHouseStats = (houseName) => {
        const houseStudents = students.filter(s => s.house === houseName);
        return {
            sop: houseStudents.filter(s => s.course === 'SOP').length,
            sob: houseStudents.filter(s => s.course === 'SOB').length,
            sof: houseStudents.filter(s => s.course === 'SOF').length,
            total: houseStudents.length
        };
    };

    const HouseCard = ({ houseName, iconColorClass }) => {
        const stats = getHouseStats(houseName);
        return (
            <div className="glass-card p-4 transition-all hover:shadow-lg">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-xl ${iconColorClass}`}>
                            <Users size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 leading-tight">{houseName}</h3>
                    </div>
                    <div className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                        {stats.total}
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">SOP</p>
                        <p className="text-lg font-black text-primary-600 leading-none">{stats.sop}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">SOB</p>
                        <p className="text-lg font-black text-emerald-600 leading-none">{stats.sob}</p>
                    </div>
                    <div className="bg-slate-50/50 p-2 rounded-xl text-center border border-slate-100">
                        <p className="text-[9px] font-black text-slate-400 mb-0.5">SOF</p>
                        <p className="text-lg font-black text-amber-600 leading-none">{stats.sof}</p>
                    </div>
                </div>
            </div>
        );
    };
    const [students, setStudents] = useState([]);
    const [search, setSearch] = useState('');
    const [filterCourse, setFilterCourse] = useState('All');
    const [filterHouse, setFilterHouse] = useState('All');
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentStudent, setCurrentStudent] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '', studentId: '', gender: 'Male', course: 'SOP', house: 'Malhar',
        email: '', mobileNumber: '', username: '', password: ''
    });

    useEffect(() => {
        fetchStudents();
    }, []);

    const fetchStudents = async () => {
        try {
            const { data } = await axios.get('/api/admin/students');
            setStudents(data);
        } catch (error) {
            console.error('Error fetching students:', error);
        }
    };

    const handleAddOrUpdate = async (e) => {
        e.preventDefault();
        try {
            if (isEditing) {
                await axios.put(`/api/admin/students/${currentStudent._id}`, formData);
            } else {
                await axios.post('/api/admin/students', formData);
            }
            fetchStudents();
            if (refreshStats) refreshStats();
            setShowAddModal(false);
            resetForm();
        } catch (error) {
            alert(error.response?.data?.message || 'Error saving student');
        }
    };

    const resetForm = () => {
        setFormData({
            fullName: '', studentId: '', gender: 'Male', course: 'SOP', house: 'Malhar',
            email: '', mobileNumber: '', username: '', password: '', joinDate: new Date().toISOString().split('T')[0]
        });
        setIsEditing(false);
        setShowPassword(false);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this student?')) {
            try {
                await axios.delete(`/api/admin/students/${id}`);
                fetchStudents();
                if (refreshStats) refreshStats();
            } catch (error) {
                console.error('Error deleting student:', error);
            }
        }
    };

    const toggleCoAdmin = async (student) => {
        const isCurrentlyCoAdmin = student.role === 'co-admin';
        const newRole = isCurrentlyCoAdmin ? 'student' : 'co-admin';
        
        try {
            await axios.put(`/api/admin/students/${student._id}/role`, { role: newRole });
            fetchStudents();
            if (refreshStats) refreshStats();
        } catch (error) {
            alert(error.response?.data?.message || 'Error updating student role');
        }
    };

    const filteredStudents = students.filter(s => 
        (s.fullName.toLowerCase().includes(search.toLowerCase()) || s.studentId.includes(search))
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
                <TotalCard />
                <GenderCard />
                <HouseCard houseName="Malhar" iconColorClass="bg-sky-50 text-sky-500" />
                <HouseCard houseName="Bhairav" iconColorClass="bg-purple-50 text-purple-500" />
                <HouseCard houseName="Bageshree" iconColorClass="bg-orange-50 text-orange-500" />
            </div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search by name or ID..."
                            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => { resetForm(); setShowAddModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/30"
                    >
                        <Plus size={18} /> Add Student
                    </button>
                </div>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Gender</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Info</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Course</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">House</th>
                            <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredStudents.map((student) => (
                            <tr key={student._id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs">
                                            {student.fullName.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-slate-900">{student.fullName}</p>
                                                {student.role === 'co-admin' && (
                                                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-600 text-[10px] font-black uppercase border border-amber-100">
                                                        <ShieldCheck size={10} /> Co-Admin
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                                        {student.studentId}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                                        student.gender === 'Female' ? 'bg-rose-50 text-rose-600' : 'bg-primary-50 text-primary-600'
                                    }`}>
                                        {student.gender || 'Male'}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs text-slate-700">{student.email || '-'}</span>
                                        <span className="text-xs text-slate-500">{student.mobileNumber || '-'}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-600">{student.course}</td>
                                <td className="px-6 py-4 text-sm text-slate-600">{student.house}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <button 
                                            onClick={() => toggleCoAdmin(student)}
                                            className={`p-2 rounded-lg transition-colors ${
                                                student.role === 'co-admin' 
                                                ? 'text-amber-500 bg-amber-50 hover:bg-amber-100' 
                                                : 'text-slate-400 hover:bg-slate-100'
                                            }`}
                                            title={student.role === 'co-admin' ? 'Revoke Co-Admin' : 'Make Co-Admin'}
                                        >
                                            <ShieldCheck size={16} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const parseDate = (dateVal) => {
                                                    if (!dateVal) return new Date().toISOString().split('T')[0];
                                                    const d = (dateVal._seconds) ? new Date(dateVal._seconds * 1000) : new Date(dateVal);
                                                    return isNaN(d.getTime()) ? new Date().toISOString().split('T')[0] : d.toISOString().split('T')[0];
                                                };
                                                const studentToEdit = { 
                                                    ...student, 
                                                    gender: student.gender || 'Male',
                                                    joinDate: parseDate(student.joinDate || student.createdAt)
                                                };
                                                setFormData(studentToEdit);
                                                setIsEditing(true);
                                                setCurrentStudent(student);
                                                setShowAddModal(true);
                                            }}
                                            className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(student._id)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">{isEditing ? 'Students Details' : 'Add New Student'}</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        <form onSubmit={handleAddOrUpdate} className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Full Name</label>
                                    <input 
                                        type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Student ID</label>
                                    <input 
                                        type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.studentId} onChange={e => setFormData({...formData, studentId: e.target.value})} required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Gender</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}
                                    >
                                        <option value="Male">Male</option>
                                        <option value="Female">Female</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Course</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})}
                                    >
                                        <option>SOP</option>
                                        <option>SOB</option>
                                        <option>SOF</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">House</label>
                                    <select 
                                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.house} onChange={e => setFormData({...formData, house: e.target.value})}
                                    >
                                        <option>Malhar</option>
                                        <option>Bhairav</option>
                                        <option>Bageshree</option>
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Email ID</label>
                                    <input 
                                        type="email" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Mobile Number</label>
                                    <input 
                                        type="tel" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.mobileNumber} onChange={e => setFormData({...formData, mobileNumber: e.target.value})} required
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Join Date</label>
                                    <input 
                                        type="date" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                        value={formData.joinDate} onChange={e => setFormData({...formData, joinDate: e.target.value})} required
                                    />
                                </div>
                            </div>
                            <div className="pt-3 border-t border-slate-100">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-3">Login Credentials</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Username</label>
                                        <input 
                                            type="text" className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm"
                                            value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} required
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Password</label>
                                        <div className="relative">
                                            <input 
                                                type={showPassword ? "text" : "password"}
                                                className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none text-sm pr-10"
                                                placeholder={isEditing ? 'Leave blank to keep same' : 'Enter password'}
                                                value={formData.password} 
                                                onChange={e => setFormData({...formData, password: e.target.value})} 
                                                required={!isEditing}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword(!showPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                                title={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-3 pt-3">
                                <button 
                                    type="button" onClick={() => setShowAddModal(false)}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-primary-600 text-white font-bold text-sm hover:bg-primary-700 shadow-lg shadow-primary-500/30 transition-all active:scale-[0.98]"
                                >
                                    {isEditing ? 'Update Student' : 'Create Student'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentsTab;


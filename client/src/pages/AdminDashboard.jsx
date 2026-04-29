import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
    LayoutDashboard, Users, Calendar, BarChart3, 
    Settings as SettingsIcon, LogOut, Search,
    Filter, Plus, Download, Send, Phone, Mail,
    AlertTriangle, RefreshCw, Key, CalendarOff
} from 'lucide-react';
import axios from 'axios';

// Sub-components
import StudentsTab from '../components/Admin/StudentsTab';
import DayWiseTab from '../components/Admin/DayWiseTab';
import AllAttendanceTab from '../components/Admin/AllAttendanceTab';
import MonthlyProgressTab from '../components/Admin/MonthlyProgressTab';
import AlertsTab from '../components/Admin/AlertsTab';
import AttendanceCodesTab from '../components/Admin/AttendanceCodesTab';
import SettingsTab from '../components/Admin/SettingsTab';
import TotalAbsentsTab from '../components/Admin/TotalAbsentsTab';

const AdminDashboard = () => {
    const [activeTab, setActiveTab] = useState('students');
    const { user, logout } = useAuth();
    const [stats, setStats] = useState({
        totalStudents: 0,
        presentToday: 0,
        absentToday: 0,
        alertCount: 0
    });
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        fetchDashboardStats();
    }, []);

    const fetchDashboardStats = async () => {
        setIsRefreshing(true);
        try {
            // Fetch basic stats
            const statsRes = await axios.get('http://localhost:5000/api/admin/dashboard-stats');
            setStats(prev => ({ ...prev, ...statsRes.data }));
            
            // Separately fetch alert count for the badge
            try {
                const alertsRes = await axios.get('http://localhost:5000/api/admin/alerts');
                setStats(prev => ({ ...prev, alertCount: alertsRes.data.length }));
            } catch (alertError) {
                console.error('Error fetching alerts for badge:', alertError);
            }

            // Small delay for visual feedback
            setTimeout(() => setIsRefreshing(false), 500);
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            setIsRefreshing(false);
        }
    };

    const handleGlobalRefresh = () => {
        fetchDashboardStats();
        setRefreshTrigger(prev => prev + 1);
    };

    const menuItems = [
        { id: 'students', label: 'Student Details', icon: Users },
        { id: 'codes', label: 'Attendance Codes', icon: Key },
        { id: 'daywise', label: 'Day-wise Attendance', icon: Calendar },
        { id: 'allattendance', label: 'Monthly Attendance', icon: BarChart3 },
        { id: 'monthly', label: 'Monthly Progress', icon: BarChart3 },
        { id: 'totalabsents', label: 'Total Absents', icon: CalendarOff },
        { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: stats?.alertCount },
        { id: 'settings', label: 'System Settings', icon: SettingsIcon },
    ];

    const renderTab = () => {
        const key = `${activeTab}-${refreshTrigger}`;
        const commonProps = { 
            refreshStats: handleGlobalRefresh
        };
        switch (activeTab) {
            case 'students': return <StudentsTab key={key} stats={stats} {...commonProps} />;
            case 'codes': return <AttendanceCodesTab key={key} {...commonProps} />;
            case 'daywise': return <DayWiseTab key={key} {...commonProps} />;
            case 'allattendance': return <AllAttendanceTab key={key} {...commonProps} />;
            case 'monthly': return <MonthlyProgressTab key={key} {...commonProps} />;
            case 'totalabsents': return <TotalAbsentsTab key={key} {...commonProps} />;
            case 'alerts': return <AlertsTab key={key} {...commonProps} />;
            case 'settings': return <SettingsTab key={key} {...commonProps} />;
            default: return <StudentsTab key={key} stats={stats} {...commonProps} />;
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            {/* Sidebar with dark vibrant gradient */}
            <aside className="w-72 bg-slate-900 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-900 border-r border-indigo-900/50 flex flex-col relative z-20 shadow-2xl">
                {/* Decorative blob in sidebar */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="p-6 border-b border-indigo-900/50 flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary-400 to-indigo-600 shadow-lg shadow-indigo-500/30 text-white">
                            <AlertTriangle size={24} className="animate-pulse" />
                        </div>
                        <span className="font-black text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">DNT Admin</span>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={`sidebar-link w-full flex items-center justify-between ${activeTab === item.id ? 'active' : ''}`}
                        >
                            <div className="flex items-center gap-3 relative z-10">
                                <item.icon size={20} className={activeTab === item.id ? "text-white" : "text-slate-400"} />
                                <span>{item.label}</span>
                            </div>
                            {item.badge > 0 && (
                                <span className="bg-rose-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-lg shadow-rose-200">
                                    {item.badge}
                                </span>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-indigo-900/50 relative z-10 bg-slate-900/50 backdrop-blur-md">
                    <button
                        onClick={logout}
                        className="sidebar-link w-full text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 hover:border-rose-500/20"
                    >
                        <LogOut size={20} />
                        <span>Secure Logout</span>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden relative">
                {/* Decorative background blobs for the main content area */}
                <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200/40 rounded-full blur-3xl -ml-20 -mt-20 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-200/40 rounded-full blur-3xl -mr-20 -mb-20 pointer-events-none"></div>
                
                {/* Navbar */}
                <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-white/50 shadow-[0_4px_30px_rgba(0,0,0,0.03)] flex items-center justify-between px-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-10 w-1.5 bg-gradient-to-b from-primary-500 to-indigo-600 rounded-full"></div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">
                            {menuItems.find(i => i.id === activeTab)?.label}
                        </h2>
                    </div>
                    <div className="flex items-center gap-6">
                        <button 
                            onClick={handleGlobalRefresh}
                            disabled={isRefreshing}
                            className={`p-3 rounded-xl transition-all flex items-center gap-2 font-bold text-sm border ${
                                isRefreshing 
                                ? 'bg-slate-100 text-slate-400 border-slate-200' 
                                : 'bg-white text-indigo-600 hover:bg-indigo-50 border-indigo-100 shadow-sm hover:shadow-md hover:-translate-y-0.5'
                            }`}
                            title="Sync All Data"
                        >
                            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                            <span className="hidden md:inline">{isRefreshing ? 'Refreshing...' : 'Refresh Data'}</span>
                        </button>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-semibold text-slate-900">{user?.username || 'Admin'}</p>
                                <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">{user?.role || 'User'}</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold overflow-hidden shadow-inner border border-primary-200">
                                {user?.profilePhoto ? (
                                    <img src={user.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                                ) : (
                                    (user?.username || 'A').charAt(0).toUpperCase()
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-8">
                    {renderTab()}
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;

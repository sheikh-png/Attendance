import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, ShieldAlert, X, Eye, EyeOff } from 'lucide-react';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [toast, setToast] = useState(null);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 5000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setToast(null);
        setLoading(true);
        const res = await login(username, password);
        setLoading(false);
        if (!res.success) {
            setToast({ message: res.message, type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
            {toast && (
                <div
                    className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-5 py-4 rounded-2xl shadow-2xl flex items-start gap-3 animate-in fade-in slide-in-from-top-4 duration-300 ${
                        toast.type === 'warning'
                            ? 'bg-amber-50 border border-amber-200 text-amber-900'
                            : 'bg-red-50 border border-red-200 text-red-900'
                    }`}
                >
                    <ShieldAlert className="shrink-0 mt-0.5" size={20} />
                    <p className="flex-1 font-semibold text-sm leading-snug">{toast.message}</p>
                    <button
                        onClick={() => setToast(null)}
                        className="shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            )}

            <div className="w-full max-w-md">
                <div className="glass-card p-8 space-y-6">
                    <div className="text-center space-y-2">
                        <div className="inline-flex p-3 rounded-2xl bg-primary-100 text-primary-600 mb-2">
                            <LogIn size={32} />
                        </div>
                        <h1 className="text-3xl font-bold text-slate-900">DNT Attendance</h1>
                        <p className="text-slate-500">Sign in to your account</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Username</label>
                            <input
                                type="text"
                                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                placeholder="Student ID or Admin User"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-slate-700">Password</label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary-500/30 transition-all active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : 'Sign In'}
                        </button>
                    </form>

                    <div className="text-center text-sm text-slate-400 pt-4">
                        Professional Attendance System v1.0
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;

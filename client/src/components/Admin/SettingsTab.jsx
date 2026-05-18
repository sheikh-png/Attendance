import React, { useState, useEffect } from 'react';
import { Wifi, Clock, Save, Plus, X, ShieldCheck, Camera, User, Lock } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';

const SettingsTab = () => {
    const { user, updateUserData } = useAuth();
    const [settings, setSettings] = useState({
        slots: {
            morning: { start: "09:00", end: "10:00" },
            afternoon: { start: "13:00", end: "14:00" },
            evening: { start: "17:00", end: "18:00" }
        }
    });
    const [profileData, setProfileData] = useState({
        username: user?.username || '',
        password: '',
        profilePhoto: user?.profilePhoto || ''
    });
    const [loading, setLoading] = useState(false);
    const [profileLoading, setProfileLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const { data } = await axios.get('/api/admin/settings');
            setSettings(data);
        } catch (error) {
            console.error('Error fetching settings:', error);
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 1024 * 1024) { // 1MB limit
                alert('Image size must be less than 1MB');
                return;
            }
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfileData({ ...profileData, profilePhoto: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleProfileSave = async () => {
        if (!profileData.username) return alert('Username is required');
        setProfileLoading(true);
        try {
            const { data } = await axios.put('/api/admin/profile', profileData);
            updateUserData(data);
            alert('✓ Profile Updated Successfully!');
            setProfileData({ ...profileData, password: '' }); // Clear password field
        } catch (error) {
            alert('✕ Error updating profile: ' + (error.response?.data?.message || error.message));
        } finally {
            setProfileLoading(false);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await axios.put('/api/admin/settings', settings);
            alert('Settings Saved Successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSlot = (slot, field, value) => {
        setSettings({
            ...settings,
            slots: {
                ...(settings.slots || {}),
                [slot]: { ...(settings.slots?.[slot] || {}), [field]: value }
            }
        });
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            {/* Profile Management Section */}
            <div className="glass-card p-8 border-primary-100 border-2 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary-50 rounded-bl-full -z-10" />
                <div className="flex flex-col md:flex-row gap-10 items-start">
                    {/* Avatar Upload */}
                    <div className="relative group mx-auto md:mx-0">
                        <div className="w-32 h-32 rounded-3xl bg-slate-100 border-4 border-white shadow-xl overflow-hidden flex items-center justify-center">
                            {profileData.profilePhoto ? (
                                <img src={profileData.profilePhoto} alt="Admin" className="w-full h-full object-cover" />
                            ) : (
                                <User size={48} className="text-slate-300" />
                            )}
                        </div>
                        <label className="absolute -bottom-2 -right-2 w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center cursor-pointer hover:bg-primary-700 shadow-lg transition-transform group-hover:scale-110">
                            <Camera size={18} />
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                        </label>
                    </div>

                    <div className="flex-1 space-y-6 w-full">
                        <div>
                            <h3 className="text-2xl font-black text-slate-800">Admin Profile</h3>
                            <p className="text-sm text-slate-500 font-medium">Manage your personal account details and security.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <User size={14} /> Username
                                </label>
                                <input 
                                    type="text" 
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white font-bold text-slate-700"
                                    value={profileData.username}
                                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <Lock size={14} /> New Password
                                </label>
                                <input 
                                    type="password" 
                                    placeholder="Leave blank to keep current"
                                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-primary-500 outline-none bg-white"
                                    value={profileData.password}
                                    onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={handleProfileSave}
                                disabled={profileLoading}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-lg shadow-primary-500/20 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {profileLoading ? <Clock className="animate-spin" size={18} /> : <ShieldCheck size={18} />}
                                Update Profile Data
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-2xl">
                {/* Slot Management */}
                <div className="glass-card p-6 space-y-6 border-2 border-slate-100">
                    <div className="flex items-center gap-3 text-primary-600">
                        <Clock size={24} />
                        <h3 className="text-xl font-bold text-slate-900">Attendance Slots</h3>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">Set active time windows for daily attendance marking.</p>

                    <div className="space-y-6">
                        {['morning', 'afternoon', 'evening'].map(slot => (
                            <div key={slot} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3">
                                <h4 className="text-sm font-bold text-slate-700 uppercase tracking-wider">{slot} Slot</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold">START TIME</label>
                                        <input 
                                            type="time" 
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                            value={settings.slots?.[slot]?.start || ''}
                                            onChange={(e) => updateSlot(slot, 'start', e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs text-slate-400 font-bold">END TIME</label>
                                        <input 
                                            type="time" 
                                            className="w-full px-3 py-2 rounded-lg border border-slate-200"
                                            value={settings.slots?.[slot]?.end || ''}
                                            onChange={(e) => updateSlot(slot, 'end', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="flex justify-end">
                <button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center gap-2 px-8 py-3 rounded-xl bg-primary-600 text-white font-bold hover:bg-primary-700 shadow-xl shadow-primary-500/30 disabled:opacity-50 transition-all active:scale-95"
                >
                    {loading ? <Clock className="animate-spin" size={18} /> : <Save size={18} />}
                    Save System Settings
                </button>
            </div>
        </div>
    );
};

export default SettingsTab;


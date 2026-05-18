import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            setUser(parsedUser);
            axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
        }
        axios.defaults.baseURL = import.meta.env.VITE_API_BASE_URL || '';
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            let publicIP = null;
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                publicIP = ipData.ip;
            } catch (ipErr) {
                console.warn('Could not fetch public IP, proceeding without it:', ipErr.message);
            }

            const headers = { 'Content-Type': 'application/json' };
            if (publicIP) headers['x-client-ip'] = publicIP;

            const { data } = await axios.post('/api/auth/login', { username, password }, { headers });
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Login failed',
            };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        delete axios.defaults.headers.common['Authorization'];
    };

    const updateUserData = (newData) => {
        const updatedUser = { ...user, ...newData };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, updateUserData, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

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
            // Set axios auth header
            axios.defaults.headers.common['Authorization'] = `Bearer ${parsedUser.token}`;
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            // Step 1: Detect public IP using ipify.org
            let publicIP = null;
            try {
                const ipRes = await fetch('https://api.ipify.org?format=json');
                const ipData = await ipRes.json();
                publicIP = ipData.ip;
                console.log('Detected Public IP:', publicIP);
            } catch (ipErr) {
                console.warn('Could not fetch public IP, proceeding without it:', ipErr.message);
            }

            // Step 2: Login with public IP as header
            const headers = { 'Content-Type': 'application/json' };
            if (publicIP) headers['x-client-ip'] = publicIP;

            const { data } = await axios.post(
                'http://localhost:5000/api/auth/login', 
                { username, password },
                { headers }
            );
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { success: true };
        } catch (error) {
            return { 
                success: false, 
                message: error.response?.data?.message || 'Login failed',
                assignedIP: error.response?.data?.assignedIP
            };
        }
    };

    const googleLoginBackend = async (email) => {
        try {
            const { data } = await axios.post(
                'http://localhost:5000/api/auth/google',
                { email },
                { headers: { 'Content-Type': 'application/json' } }
            );
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
            axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
            return { success: true };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Google login failed on backend'
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
        <AuthContext.Provider value={{ user, login, googleLoginBackend, logout, updateUserData, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

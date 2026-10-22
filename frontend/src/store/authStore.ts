import { create } from 'zustand';

interface User {
    username: string;
    role: string;
    displayName?: string;
    accessLevel?: 'READ' | 'EDIT' | 'ADMIN';
}

interface AuthState {
    user: User | null;
    token: string | null;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

const getInitialUser = (): User | null => {
    try {
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
        console.error("Error reading stored user from localStorage", error);
        return null;
    }
};

export const useAuthStore = create<AuthState>((set) => ({
    user: getInitialUser(),
    token: localStorage.getItem('token') || null,
    setAuth: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        set({ user, token });
    },
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null, token: null });
    },
}));


/** Only admins manage the marketing team; everyone can view and change portal content. */
export const useIsAdmin = () => useAuthStore(s => s.user?.role === 'ADMIN');

/** The public demo login: can view everything, but the server rejects every change. */
export const useIsDemo = () => useAuthStore(s => s.user?.role === 'DEMO');

/** Fired when the demo account tries to change something, so the layout can explain why it failed. */
export const DEMO_READ_ONLY_EVENT = 'demo-read-only';

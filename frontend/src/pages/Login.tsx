import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';
import { api } from '../api/axios';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    // Public read-only demo login, when the server has one turned on
    const [demo, setDemo] = useState<{ username: string; password: string } | null>(null);
    
    const navigate = useNavigate();
    // Set when the session ended on the server (password changed or member removed)
    const sessionEnded = new URLSearchParams(window.location.search).get('session') === 'ended';
    const { token, user, setAuth } = useAuthStore();

    useEffect(() => {
        if (token && user) {
            navigate('/overview', { replace: true });
        }
    }, [token, user, navigate]);

    useEffect(() => {
        api.get('/auth/demo').then(res => setDemo(res.data)).catch(() => setDemo(null));
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setErrorMsg('');
        
        try {
            const response = await api.post('/auth/authenticate', { username, password });
            const token = response.data.token;
            const role = response.data.role;

            setAuth({ username: response.data.username || username, role, displayName: response.data.displayName }, token);
            
            navigate('/overview');
        } catch (error: any) {
            console.error("Login failed", error);
            const status = error.response?.status;
            if (status === 401 || status === 403) {
                setErrorMsg("Invalid credentials. Please try again.");
            } else {
                // No answer or a server error: the password may be fine, so don't blame it
                setErrorMsg("Can't reach the server right now. Please try again in a moment.");
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:24px_24px] relative overflow-hidden p-6">
            <div className="w-full max-w-md z-10 animate-fade-in">
                <Card glass>
                    <div className="text-center mb-8">
                        <div className="text-4xl mb-3 inline-block">✨</div>
                        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1.5">Welcome Back</h2>
                        <p className="text-sm text-slate-500">Sign in to Marketing Management Portal</p>
                    </div>

                    {sessionEnded && !errorMsg && (
                        <p role="status" className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                            You've been signed out. Your password may have been changed by an admin — please sign in again.
                        </p>
                    )}

                    <form onSubmit={handleLogin} className="flex flex-col gap-4">
                        <Input
                            label="Username / Alias"
                            type="text"
                            placeholder="Enter your username"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            required
                        />

                        <div className="relative">
                            <Input
                                label="Password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                error={errorMsg}
                            />
                            <button
                                type="button"
                                className="absolute right-2 top-[28px] bg-none border-none text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-md transition-all cursor-pointer"
                                onClick={() => setShowPassword(!showPassword)}
                                title={showPassword ? "Hide password" : "Show password"}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                aria-pressed={showPassword}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                            </button>
                        </div>

                        <div className="mt-4">
                            <Button 
                                type="submit" 
                                size="lg" 
                                fullWidth 
                                disabled={isLoading || !username || !password}
                            >
                                {isLoading ? 'Authenticating...' : 'Sign In'}
                            </Button>
                        </div>
                    </form>

                    {demo && (
                        <div className="mt-6 rounded-lg border border-blue-200 bg-blue-50/60 p-4 text-sm">
                            <p className="font-semibold text-slate-900 mb-1">Just looking around? Use the demo account</p>
                            <p className="text-slate-600 mb-3">Read-only access to every page, with sample data.</p>
                            <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 mb-3">
                                <dt className="text-slate-500">Username</dt>
                                <dd><code className="font-mono font-semibold text-slate-900 select-all">{demo.username}</code></dd>
                                <dt className="text-slate-500">Password</dt>
                                <dd><code className="font-mono font-semibold text-slate-900 select-all">{demo.password}</code></dd>
                            </dl>
                            <Button
                                type="button"
                                variant="secondary"
                                fullWidth
                                onClick={() => { setUsername(demo.username); setPassword(demo.password); setErrorMsg(''); }}
                            >
                                Fill in demo account
                            </Button>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};

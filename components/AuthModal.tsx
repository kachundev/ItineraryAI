import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    t: any;
}

export default function AuthModal({ isOpen, onClose, t }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                onClose();
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        emailRedirectTo: `${window.location.origin}/`,
                    },
                });
                if (error) throw error;
                setMessage(t.registration_success || 'Registration successful! Please check your email to confirm your account.');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="w-full max-w-md bg-white dark:bg-[#1e2126] rounded-2xl shadow-2xl overflow-hidden">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                            {isLogin ? (t.welcome_back || 'Welcome Back') : (t.create_account || 'Create Account')}
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                            <span className="material-symbols-outlined">close</span>
                        </button>
                    </div>

                    {error && (
                        <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    {message && (
                        <div className="mb-4 p-3 rounded-lg bg-green-50 text-green-600 text-sm font-medium">
                            {message}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t.email_label || 'Email'}</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#16181d] px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                placeholder={t.email_placeholder || 'name@example.com'}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">{t.password_label || 'Password'}</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 dark:border-[#2a2e35] bg-gray-50 dark:bg-[#16181d] px-4 py-3 text-slate-900 dark:text-white focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-bold rounded-xl shadow-lg transition-transform active:scale-[0.99] disabled:opacity-70 flex justify-center items-center gap-2"
                        >
                            {loading && <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>}
                            {isLogin ? (t.sign_in || 'Sign In') : (t.sign_up || 'Sign Up')}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {isLogin ? (t.no_account || "Don't have an account?") : (t.has_account || "Already have an account?")}
                            <button
                                onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
                                className="ml-1 text-primary font-bold hover:underline"
                            >
                                {isLogin ? (t.sign_up || 'Sign Up') : (t.sign_in || 'Sign In')}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { userAPI } from '@/lib/api';
import { motion } from 'framer-motion';
import {
    User, Mail, Key, Shield, Save, Video,
    Globe, ChevronRight
} from 'lucide-react';

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        email: '',
        profile_type: 'interview',
        language: 'en',
    });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const response = await userAPI.getProfile();
            setUser(response.data);
            setFormData({
                full_name: response.data.full_name || '',
                email: response.data.email || '',
                profile_type: response.data.profile_type || 'interview',
                language: response.data.language || 'en',
            });
        } catch (error) {
            console.error('Failed to fetch profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await userAPI.updateProfile(formData);
            const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
            localStorage.setItem('user', JSON.stringify({ ...storedUser, ...formData }));
            alert('Settings saved successfully!');
        } catch (error) {
            console.error('Failed to save settings:', error);
            alert('Failed to save settings.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="w-16 h-16 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
            </div>
        );
    }

    const profileTypes = [
        { value: 'interview', label: 'Technical Interview', desc: 'Coding & system design' },
        { value: 'sales', label: 'Sales Call', desc: 'Pitches & negotiations' },
        { value: 'meeting', label: 'Business Meeting', desc: 'General meetings' },
        { value: 'presentation', label: 'Presentation', desc: 'Talks & demos' },
        { value: 'negotiation', label: 'Negotiation', desc: 'Deal-making sessions' },
        { value: 'exam', label: 'Exam', desc: 'Tests & assessments' },
    ];

    return (
        <>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Settings</h1>
                <p className="text-text-secondary">Manage your account and preferences</p>
            </motion.div>

            <div className="max-w-3xl space-y-6">
                {/* Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-panel rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                            <User className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Profile Information</h3>
                            <p className="text-xs text-text-muted">Your personal details</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-5">
                        <div>
                            <label className="block text-sm font-medium mb-2 text-text-secondary">Full Name</label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="premium-input"
                                placeholder="John Doe"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-text-secondary">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    disabled
                                    className="premium-input pl-11 opacity-60 cursor-not-allowed"
                                    placeholder="john@example.com"
                                />
                            </div>
                            <p className="text-xs text-text-muted mt-1.5">Email cannot be changed</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-2 text-text-secondary">Username</label>
                            <input
                                type="text"
                                value={user?.username || ''}
                                disabled
                                className="premium-input opacity-60 cursor-not-allowed"
                            />
                        </div>
                    </div>
                </motion.div>

                {/* AI Profile Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                            <Video className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold">AI Profile</h3>
                            <p className="text-xs text-text-muted">Choose your default session type</p>
                        </div>
                    </div>
                    <div className="p-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {profileTypes.map((pt) => (
                                <button
                                    key={pt.value}
                                    onClick={() => setFormData({ ...formData, profile_type: pt.value })}
                                    className={`p-4 rounded-xl text-left transition-all duration-200 border ${
                                        formData.profile_type === pt.value
                                            ? 'bg-brand-primary/15 border-brand-primary/40 shadow-lg shadow-brand-primary/10'
                                            : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04]'
                                    }`}
                                >
                                    <div className="font-medium text-sm mb-0.5">{pt.label}</div>
                                    <div className="text-[11px] text-text-muted">{pt.desc}</div>
                                </button>
                            ))}
                        </div>

                        <div className="mt-6">
                            <label className="block text-sm font-medium mb-2 text-text-secondary">Language</label>
                            <select
                                value={formData.language}
                                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                                className="premium-input appearance-none cursor-pointer"
                            >
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="zh">Chinese</option>
                                <option value="ja">Japanese</option>
                            </select>
                        </div>
                    </div>
                </motion.div>

                {/* Security Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel rounded-2xl overflow-hidden"
                >
                    <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                            <Shield className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Security</h3>
                            <p className="text-xs text-text-muted">Account security settings</p>
                        </div>
                    </div>
                    <div className="p-6 space-y-3">
                        <button
                            onClick={() => alert('Password change coming soon!')}
                            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.04] transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <Key className="w-5 h-5 text-text-muted" />
                                <div className="text-left">
                                    <div className="font-medium text-sm">Change Password</div>
                                    <div className="text-xs text-text-muted">Last changed: Never</div>
                                </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-brand-primary transition-colors" />
                        </button>

                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                            <div className="flex items-center gap-3">
                                <Shield className="w-5 h-5 text-text-muted" />
                                <div>
                                    <div className="font-medium text-sm">Two-Factor Authentication</div>
                                    <div className="text-xs text-text-muted">Extra security layer</div>
                                </div>
                            </div>
                            <span className="text-xs px-2.5 py-1 rounded-full bg-white/[0.06] text-text-muted">Coming Soon</span>
                        </div>
                    </div>
                </motion.div>

                {/* Save */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="flex justify-end gap-3 pb-8"
                >
                    <Button variant="outline" className="border-white/10" onClick={() => router.push('/dashboard')}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="glow-button gap-2">
                        {saving ? 'Saving...' : <><Save className="w-4 h-4" /> Save Changes</>}
                    </Button>
                </motion.div>
            </div>
        </>
    );
}

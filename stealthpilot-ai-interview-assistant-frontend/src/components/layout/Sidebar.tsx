'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import {
    BarChart3,
    Video,
    Settings,
    LogOut,
    Camera,
    Sparkles,
    Shield,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { userAPI } from '@/lib/api';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: BarChart3 },
    { href: '/sessions', label: 'Sessions', icon: Video },
    { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (stored) {
            try {
                setUser(JSON.parse(stored));
            } catch {}
        }
    }, []);

    const handleLogout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/');
    };

    return (
        <aside className="fixed left-0 top-0 bottom-0 w-72 z-40 flex flex-col">
            {/* Glass background */}
            <div className="absolute inset-0 bg-bg-surface/80 backdrop-blur-2xl border-r border-white/[0.06]" />

            {/* Gradient accent line */}
            <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-brand-primary/40 via-brand-teal/20 to-transparent" />

            <div className="relative flex flex-col h-full p-6">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-3 mb-10 group">
                    <motion.div
                        whileHover={{ scale: 1.05, rotate: 3 }}
                        className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center shadow-lg shadow-brand-primary/25"
                    >
                        <Shield className="w-5 h-5 text-white" />
                        <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                    <div className="flex flex-col">
                        <span className="text-lg font-bold gradient-text tracking-tight">StealthPilot</span>
                        <span className="text-[10px] text-text-muted uppercase tracking-widest">AI Assistant</span>
                    </div>
                </Link>

                {/* Navigation */}
                <nav className="space-y-1.5 flex-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link key={item.href} href={item.href}>
                                <motion.div
                                    whileHover={{ x: 4 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? 'text-white'
                                            : 'text-text-secondary hover:text-text-primary hover:bg-white/[0.04]'
                                    }`}
                                >
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-active"
                                            className="absolute inset-0 rounded-xl bg-gradient-to-r from-brand-primary/20 to-brand-teal/10 border border-brand-primary/30"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    {isActive && (
                                        <motion.div
                                            layoutId="sidebar-indicator"
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 rounded-full bg-gradient-to-b from-brand-primary to-brand-teal"
                                            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                    <item.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-brand-primary' : ''}`} />
                                    <span className={`relative z-10 font-medium ${isActive ? 'text-white' : ''}`}>{item.label}</span>
                                </motion.div>
                            </Link>
                        );
                    })}

                    {/* Divider */}
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-4" />

                    {/* Quick Actions */}
                    <p className="text-[10px] text-text-muted uppercase tracking-widest px-4 mb-2">Quick Actions</p>
                    <Link href="/session/live?quick=true">
                        <motion.div
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all"
                        >
                            <Sparkles className="w-5 h-5" />
                            <span className="font-medium">Quick Session</span>
                        </motion.div>
                    </Link>
                    <Link href="/session/live?mode=screenshot">
                        <motion.div
                            whileHover={{ x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className="flex items-center gap-3 px-4 py-3 rounded-xl text-text-secondary hover:text-text-primary hover:bg-white/[0.04] transition-all"
                        >
                            <Camera className="w-5 h-5" />
                            <span className="font-medium">Screenshot Mode</span>
                        </motion.div>
                    </Link>
                </nav>

                {/* User card */}
                <div className="mt-auto">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center text-white font-semibold text-sm">
                                    {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                </div>
                                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-brand-emerald border-2 border-bg-surface" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{user?.full_name || 'User'}</p>
                                <p className="text-xs text-text-muted truncate">{user?.email || ''}</p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-text-muted hover:text-red-400 hover:bg-red-500/10"
                            onClick={handleLogout}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </aside>
    );
}

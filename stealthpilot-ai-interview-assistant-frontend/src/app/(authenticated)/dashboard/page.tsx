'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { sessionAPI, userAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Calendar, TrendingUp, Clock, Play, Zap, Target,
    ArrowUpRight, Sparkles, Activity
} from 'lucide-react';

const statCards = [
    {
        key: 'total_sessions',
        label: 'Total Sessions',
        icon: Calendar,
        gradient: 'from-blue-500 to-cyan-500',
        format: (v: number) => v.toString(),
        sub: 'All time',
    },
    {
        key: 'avg_confidence_score',
        label: 'Avg Confidence',
        icon: Target,
        gradient: 'from-emerald-500 to-teal-500',
        format: (v: number) => `${v}%`,
        sub: 'Across sessions',
    },
    {
        key: 'total_questions_answered',
        label: 'Questions',
        icon: Zap,
        gradient: 'from-purple-500 to-pink-500',
        format: (v: number) => v.toString(),
        sub: 'Answered by AI',
    },
    {
        key: 'total_time_minutes',
        label: 'Time Saved',
        icon: Clock,
        gradient: 'from-orange-500 to-amber-500',
        format: (v: number) => `${Math.round(v)}m`,
        sub: 'Total session time',
    },
];

export default function DashboardPage() {
    const router = useRouter();
    const [user, setUser] = useState<any>(null);
    const [stats, setStats] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [userRes, statsRes, sessionsRes] = await Promise.all([
                userAPI.getProfile(),
                userAPI.getStats(),
                sessionAPI.getAll(10),
            ]);
            setUser(userRes.data);
            setStats(statsRes.data);
            setSessions(sessionsRes.data);
            // Update localStorage for sidebar
            localStorage.setItem('user', JSON.stringify(userRes.data));
        } catch (error) {
            console.error('Failed to fetch data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStartLiveSession = async () => {
        try {
            const response = await sessionAPI.create({
                profile_type: 'interview',
                language: 'en',
                company_name: 'Quick Session',
                role_title: 'Live Interview',
            });
            router.push(`/session/live?id=${response.data.id}`);
        } catch (error) {
            console.error('Failed to create session:', error);
            alert('Failed to start session. Please try again.');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-brand-teal/10 border-b-brand-teal animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
            </div>
        );
    }

    return (
        <>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-bold mb-2">
                    Welcome back, <span className="gradient-text">{user?.full_name?.split(' ')[0]}</span>
                </h1>
                <p className="text-text-secondary">
                    Ready for your next interview? Let&apos;s get started.
                </p>
            </motion.div>

            {/* Quick Start Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
            >
                <div className="relative overflow-hidden rounded-2xl">
                    {/* Animated gradient border */}
                    <div className="shimmer-border rounded-2xl">
                        <div className="relative p-8 rounded-2xl bg-gradient-to-br from-brand-primary/15 via-bg-surface to-brand-teal/10 backdrop-blur-sm">
                            {/* Decorative orbs */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />
                            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />

                            <div className="relative flex items-center justify-between flex-wrap gap-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Sparkles className="w-5 h-5 text-brand-primary" />
                                        <span className="text-sm font-medium text-brand-glow">AI-Powered Interview Assistant</span>
                                    </div>
                                    <h2 className="text-2xl md:text-3xl font-bold mb-2">Start a Live Session</h2>
                                    <p className="text-text-secondary max-w-md">
                                        Launch real-time AI-assisted interview with live transcription, instant answers, and screenshot OCR
                                    </p>
                                </div>
                                <Button
                                    size="lg"
                                    className="glow-button bg-gradient-to-r from-brand-primary to-brand-primary/80 px-8 py-6 h-auto text-base group"
                                    onClick={handleStartLiveSession}
                                >
                                    <Play className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />
                                    Start Live Session
                                    <ArrowUpRight className="w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                {statCards.map((card, index) => (
                    <motion.div
                        key={card.key}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 + index * 0.05 }}
                    >
                        <div className="stat-card rounded-2xl">
                            <div className="flex items-start justify-between mb-4">
                                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center shadow-lg`}>
                                    <card.icon className="w-5 h-5 text-white" />
                                </div>
                                <Activity className="w-4 h-4 text-text-muted" />
                            </div>
                            <div className="text-3xl font-bold mb-1">
                                {card.format(stats?.[card.key] || 0)}
                            </div>
                            <div className="text-sm text-text-muted">{card.label}</div>
                            <div className="text-xs text-text-muted mt-1 opacity-60">{card.sub}</div>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Recent Sessions */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
            >
                <div className="glass-panel rounded-2xl overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
                        <div className="flex items-center gap-3">
                            <Video className="w-5 h-5 text-brand-primary" />
                            <h3 className="text-lg font-semibold">Recent Sessions</h3>
                        </div>
                        <Link href="/sessions">
                            <Button variant="ghost" size="sm" className="text-text-muted hover:text-brand-primary">
                                View All
                                <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                        </Link>
                    </div>
                    <div className="p-4">
                        {sessions.length === 0 ? (
                            <div className="text-center py-16 text-text-muted">
                                <div className="w-16 h-16 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
                                    <Video className="w-8 h-8 opacity-40" />
                                </div>
                                <p className="font-medium mb-1">No sessions yet</p>
                                <p className="text-sm opacity-60">Start your first live session to get AI-powered assistance</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <AnimatePresence>
                                    {sessions.map((session, idx) => (
                                        <motion.div
                                            key={session.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                        >
                                            <Link href={`/session/${session.id}`}>
                                                <div className="p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-brand-primary/20 transition-all duration-300 cursor-pointer group">
                                                    <div className="flex items-start justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-3 mb-1.5">
                                                                <div className="w-2 h-2 rounded-full bg-brand-emerald" />
                                                                <span className="font-medium group-hover:text-brand-primary transition-colors">
                                                                    {session.company_name || 'Interview Session'}
                                                                </span>
                                                                {session.role_title && (
                                                                    <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.06] text-text-muted">
                                                                        {session.role_title}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <p className="text-sm text-text-muted">
                                                                {new Date(session.started_at || session.created_at).toLocaleString()}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            {session.confidence_score && (
                                                                <div className="text-sm font-medium text-brand-teal">
                                                                    {session.confidence_score}%
                                                                </div>
                                                            )}
                                                            {session.duration_seconds && (
                                                                <div className="text-xs text-text-muted">
                                                                    {Math.round(session.duration_seconds / 60)} min
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </Link>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}

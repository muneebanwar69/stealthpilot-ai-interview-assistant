'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { sessionAPI } from '@/lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Video, Calendar, Clock, Play, Trash2,
    CheckCircle, Search, Filter, ArrowUpRight
} from 'lucide-react';

export default function SessionsPage() {
    const router = useRouter();
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            const response = await sessionAPI.getAll(100);
            setSessions(response.data);
        } catch (error) {
            console.error('Failed to fetch sessions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this session?')) return;
        try {
            await sessionAPI.delete(id);
            setSessions(sessions.filter((s) => s.id !== id));
        } catch (error) {
            console.error('Failed to delete session:', error);
        }
    };

    const formatDate = (dateString: string | null | undefined) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return 'Invalid date';
            return new Intl.DateTimeFormat('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
            }).format(date);
        } catch (error) {
            return 'Invalid date';
        }
    };

    const filteredSessions = sessions.filter(s =>
        (s.company_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.role_title || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
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
                className="flex items-center justify-between mb-8 flex-wrap gap-4"
            >
                <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">Your Sessions</h1>
                    <p className="text-text-secondary">View and manage all your interview sessions</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                        <input
                            type="text"
                            placeholder="Search sessions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="premium-input pl-10 pr-4 py-2.5 w-64"
                        />
                    </div>
                </div>
            </motion.div>

            {/* Sessions List */}
            {filteredSessions.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-2xl p-16 text-center"
                >
                    <div className="w-20 h-20 rounded-2xl bg-white/[0.04] flex items-center justify-center mx-auto mb-6">
                        <Video className="w-10 h-10 text-text-muted opacity-40" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                        {sessions.length === 0 ? 'No sessions yet' : 'No matching sessions'}
                    </h3>
                    <p className="text-text-secondary mb-8 max-w-md mx-auto">
                        {sessions.length === 0
                            ? 'Start your first interview session to get AI-powered assistance'
                            : 'Try a different search term'}
                    </p>
                    {sessions.length === 0 && (
                        <Link href="/dashboard">
                            <Button className="glow-button">
                                <Play className="w-4 h-4 mr-2" /> Start Live Session
                            </Button>
                        </Link>
                    )}
                </motion.div>
            ) : (
                <div className="space-y-3">
                    <AnimatePresence>
                        {filteredSessions.map((session, idx) => (
                            <motion.div
                                key={session.id}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ delay: idx * 0.03 }}
                            >
                                <div className="glass-panel rounded-2xl p-5 hover:border-brand-primary/20 transition-all duration-300 group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-teal/10 flex items-center justify-center">
                                                    <Video className="w-5 h-5 text-brand-primary" />
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold group-hover:text-brand-primary transition-colors">
                                                        {session.role_title || 'Interview Session'}
                                                    </h3>
                                                    {session.company_name && (
                                                        <span className="text-xs text-text-muted">{session.company_name}</span>
                                                    )}
                                                </div>
                                                <span className="text-xs px-2.5 py-1 rounded-full bg-brand-primary/10 text-brand-glow font-medium">
                                                    {session.profile_type || 'interview'}
                                                </span>
                                            </div>

                                            <div className="flex items-center gap-5 text-sm text-text-muted ml-[52px]">
                                                <div className="flex items-center gap-1.5">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    <span>{formatDate(session.created_at)}</span>
                                                </div>
                                                {session.duration && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        <span>{Math.round(session.duration / 60)} min</span>
                                                    </div>
                                                )}
                                                {session.confidence_score && (
                                                    <div className="flex items-center gap-1.5">
                                                        <CheckCircle className="w-3.5 h-3.5 text-brand-emerald" />
                                                        <span className="text-brand-emerald">{session.confidence_score}%</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Link href={`/session/live?id=${session.id}`}>
                                                <Button variant="outline" size="sm" className="border-white/10 hover:border-brand-primary/30 gap-1.5">
                                                    <Play className="w-3.5 h-3.5" /> Resume
                                                </Button>
                                            </Link>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(session.id)}
                                                className="text-text-muted hover:text-red-400 hover:bg-red-500/10"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            )}
        </>
    );
}

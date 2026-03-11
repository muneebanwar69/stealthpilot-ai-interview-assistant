'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { AnimatedBackground } from '@/components/ui/animated-background';

export default function AuthenticatedLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (!token) {
            router.push('/sign-in');
        } else {
            setReady(true);
        }
    }, [router]);

    if (!ready) {
        return (
            <div className="min-h-screen bg-bg-base flex items-center justify-center">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                    <div className="absolute inset-0 w-16 h-16 rounded-full border-2 border-brand-teal/10 border-b-brand-teal animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-bg-base">
            {/* Subtle animated background */}
            <AnimatedBackground variant="subtle" />

            <Sidebar />

            {/* Main content area */}
            <main className="ml-72 min-h-screen relative">
                <div className="p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </div>
            </main>
        </div>
    );
}

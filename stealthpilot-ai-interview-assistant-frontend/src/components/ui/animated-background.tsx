'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedBackgroundProps {
    variant?: 'default' | 'subtle' | 'hero';
    className?: string;
}

const orbs = [
    { size: 600, x: '10%', y: '20%', color: 'rgba(124,106,255,0.08)', delay: 0, duration: 20 },
    { size: 500, x: '70%', y: '60%', color: 'rgba(45,212,191,0.06)', delay: 2, duration: 25 },
    { size: 400, x: '50%', y: '10%', color: 'rgba(167,139,250,0.05)', delay: 4, duration: 22 },
    { size: 350, x: '80%', y: '80%', color: 'rgba(124,106,255,0.04)', delay: 6, duration: 28 },
    { size: 300, x: '20%', y: '70%', color: 'rgba(45,212,191,0.05)', delay: 3, duration: 24 },
];

const subtleOrbs = [
    { size: 500, x: '5%', y: '30%', color: 'rgba(124,106,255,0.04)', delay: 0, duration: 30 },
    { size: 400, x: '80%', y: '70%', color: 'rgba(45,212,191,0.03)', delay: 5, duration: 35 },
    { size: 300, x: '60%', y: '15%', color: 'rgba(167,139,250,0.02)', delay: 2, duration: 28 },
];

const heroOrbs = [
    { size: 800, x: '15%', y: '25%', color: 'rgba(124,106,255,0.12)', delay: 0, duration: 18 },
    { size: 700, x: '65%', y: '55%', color: 'rgba(45,212,191,0.10)', delay: 1, duration: 22 },
    { size: 600, x: '45%', y: '15%', color: 'rgba(167,139,250,0.08)', delay: 3, duration: 20 },
    { size: 500, x: '85%', y: '75%', color: 'rgba(124,106,255,0.06)', delay: 5, duration: 26 },
    { size: 450, x: '25%', y: '65%', color: 'rgba(45,212,191,0.07)', delay: 2, duration: 24 },
    { size: 350, x: '70%', y: '30%', color: 'rgba(167,139,250,0.05)', delay: 4, duration: 21 },
];

export function AnimatedBackground({ variant = 'default', className = '' }: AnimatedBackgroundProps) {
    const activeOrbs = variant === 'hero' ? heroOrbs : variant === 'subtle' ? subtleOrbs : orbs;

    return (
        <div className={`fixed inset-0 overflow-hidden pointer-events-none ${className}`} style={{ zIndex: 0 }}>
            {/* Gradient base */}
            <div className="absolute inset-0 bg-gradient-to-br from-bg-void via-bg-base to-bg-void" />

            {/* Floating orbs */}
            {activeOrbs.map((orb, i) => (
                <motion.div
                    key={i}
                    className="absolute rounded-full"
                    style={{
                        width: orb.size,
                        height: orb.size,
                        left: orb.x,
                        top: orb.y,
                        background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                        filter: 'blur(60px)',
                    }}
                    animate={{
                        x: [0, 30, -20, 15, 0],
                        y: [0, -25, 15, -10, 0],
                        scale: [1, 1.1, 0.95, 1.05, 1],
                    }}
                    transition={{
                        duration: orb.duration,
                        delay: orb.delay,
                        repeat: Infinity,
                        ease: 'easeInOut',
                    }}
                />
            ))}

            {/* Grid pattern overlay */}
            {variant === 'hero' && (
                <div
                    className="absolute inset-0 opacity-[0.015]"
                    style={{
                        backgroundImage: `
                            linear-gradient(rgba(124,106,255,0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(124,106,255,0.3) 1px, transparent 1px)
                        `,
                        backgroundSize: '60px 60px',
                    }}
                />
            )}

            {/* Noise texture */}
            <div className="noise-overlay" />

            {/* Floating particles */}
            {variant !== 'subtle' && (
                <div className="absolute inset-0">
                    {Array.from({ length: 20 }).map((_, i) => (
                        <motion.div
                            key={`particle-${i}`}
                            className="absolute w-1 h-1 rounded-full bg-brand-primary/20"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                            }}
                            animate={{
                                y: [0, -100, 0],
                                opacity: [0, 0.6, 0],
                            }}
                            transition={{
                                duration: 8 + Math.random() * 12,
                                delay: Math.random() * 10,
                                repeat: Infinity,
                                ease: 'easeInOut',
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

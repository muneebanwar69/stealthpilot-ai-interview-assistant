'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { GradientText } from '@/components/ui/gradient-text';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { motion } from 'framer-motion';
import { Zap, ChevronDown, Users, Shield, ArrowRight, Mic, Eye, Camera } from 'lucide-react';

const floatingCards = [
  { icon: Mic, label: 'Live Transcription', x: -320, y: -80, rotate: -6, delay: 0.8 },
  { icon: Eye, label: 'Invisible Mode', x: 280, y: -120, rotate: 4, delay: 1.0 },
  { icon: Camera, label: 'Screenshot OCR', x: -280, y: 120, rotate: 3, delay: 1.2 },
  { icon: Shield, label: 'Screen Protected', x: 320, y: 100, rotate: -5, delay: 1.4 },
];

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Premium animated background */}
      <AnimatedBackground variant="hero" />

      {/* Radial spotlight from center */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(124,106,255,0.15)_0%,transparent_60%)]" />

      {/* Secondary teal spotlight */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_70%_70%,rgba(45,212,191,0.08)_0%,transparent_50%)]" />

      <div className="container mx-auto px-6 relative z-10 pt-20">
        <div className="max-w-6xl mx-auto text-center relative">
          {/* Floating feature cards (3D) */}
          <div className="hidden lg:block absolute inset-0 pointer-events-none">
            {floatingCards.map((card, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: card.delay, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="absolute left-1/2 top-1/2"
                style={{ marginLeft: card.x, marginTop: card.y }}
              >
                <motion.div
                  animate={{ y: [0, -8, 0], rotate: [card.rotate, card.rotate + 2, card.rotate] }}
                  transition={{ duration: 5 + i, repeat: Infinity, ease: 'easeInOut' }}
                  className="glass-panel-elevated px-4 py-3 flex items-center gap-3 cursor-default"
                  style={{ transform: `rotate(${card.rotate}deg)` }}
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary/30 to-brand-teal/30 flex items-center justify-center">
                    <card.icon className="w-4 h-4 text-brand-glow" />
                  </div>
                  <span className="text-sm font-medium text-text-secondary whitespace-nowrap">{card.label}</span>
                </motion.div>
              </motion.div>
            ))}
          </div>

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="inline-flex items-center mb-8"
          >
            <div className="shimmer-border rounded-full">
              <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-bg-base/80 backdrop-blur-sm">
                <div className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
                <span className="text-sm font-medium text-text-secondary">
                  Powered by <span className="text-brand-glow">Gemini 2.0 Flash</span>
                </span>
              </div>
            </div>
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold mb-8 leading-[1.05] tracking-tight"
          >
            Your AI co-pilot.
            <br />
            <span className="gradient-text-glow">Completely invisible.</span>
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.8 }}
            className="text-lg md:text-xl text-text-secondary mb-12 max-w-2xl mx-auto leading-relaxed"
          >
            Real-time interview transcription, AI-powered answers, screenshot OCR —
            all hidden from screen share. Your secret weapon for high-stakes moments.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.8 }}
            className="flex flex-col sm:flex-row gap-4 justify-center mb-16"
          >
            <Link href="/sign-up">
              <Button
                size="lg"
                className="w-full sm:w-auto text-base px-10 py-6 h-auto glow-button bg-gradient-to-r from-brand-primary to-brand-primary/80 group"
              >
                Get Started Free
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#features">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-10 py-6 h-auto border-white/10 hover:border-brand-primary/30 hover:bg-white/[0.02]">
                Explore Features
              </Button>
            </Link>
          </motion.div>

          {/* Social Proof */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.8 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <div className="flex -space-x-3">
              {[
                'from-violet-500 to-purple-600',
                'from-blue-500 to-cyan-500',
                'from-emerald-500 to-teal-500',
                'from-orange-500 to-red-500',
                'from-pink-500 to-rose-500',
              ].map((gradient, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.1, type: 'spring', stiffness: 300, damping: 20 }}
                  className={`w-10 h-10 rounded-full bg-gradient-to-br ${gradient} border-2 border-bg-base shadow-md`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <svg key={i} className="w-4 h-4 text-yellow-500 fill-current" viewBox="0 0 20 20">
                    <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                  </svg>
                ))}
              </div>
              <span className="text-text-muted">
                Trusted by <span className="text-text-primary font-semibold">3,400+</span> candidates
              </span>
            </div>
          </motion.div>

          {/* Preview Window (3D glassmorphism) */}
          <motion.div
            initial={{ opacity: 0, y: 60, rotateX: 10 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ delay: 0.9, duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="mt-20 relative"
            style={{ perspective: '1200px' }}
          >
            <div className="relative mx-auto max-w-4xl">
              {/* Glow behind window */}
              <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary/20 via-brand-teal/10 to-brand-primary/20 rounded-3xl blur-2xl opacity-60" />

              <div className="relative glass-panel-elevated rounded-2xl overflow-hidden border border-white/10">
                {/* Title bar */}
                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/[0.06] bg-white/[0.02]">
                  <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 text-center text-xs text-text-muted font-mono">StealthPilot — Live Session</div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-brand-emerald animate-pulse" />
                    <span className="text-[10px] text-brand-emerald font-medium">LIVE</span>
                  </div>
                </div>

                {/* Mock UI */}
                <div className="p-6 grid grid-cols-2 gap-4 min-h-[280px]">
                  {/* Left: Transcript */}
                  <div className="space-y-3">
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2">Live Transcript</div>
                    <motion.div
                      animate={{ opacity: [0.4, 1, 0.4] }}
                      transition={{ duration: 3, repeat: Infinity }}
                      className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-secondary"
                    >
                      Tell me about a time you led a team through a difficult project...
                    </motion.div>
                    <div className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-text-secondary opacity-60">
                      How would you handle conflicting priorities?
                    </div>
                  </div>

                  {/* Right: AI Answer */}
                  <div className="space-y-3">
                    <div className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mb-2 flex items-center gap-2">
                      <Zap className="w-3 h-3 text-brand-primary" /> AI Answer
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-brand-primary/10 to-brand-teal/5 border border-brand-primary/20 text-sm">
                      <typing-effect className="text-text-primary">
                        <motion.span
                          initial={{ width: 0 }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 2, delay: 1.5 }}
                          className="block overflow-hidden whitespace-nowrap text-text-primary"
                        >
                          I led a cross-functional team of 8 through our platform migration...
                        </motion.span>
                      </typing-effect>
                      <div className="mt-2 flex items-center gap-2">
                        <div className="h-1.5 flex-1 rounded-full bg-bg-elevated overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '92%' }}
                            transition={{ duration: 2, delay: 2 }}
                            className="h-full rounded-full bg-gradient-to-r from-brand-primary to-brand-teal"
                          />
                        </div>
                        <span className="text-[10px] text-brand-teal font-medium">92%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="absolute bottom-8 left-1/2 transform -translate-x-1/2"
        >
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5 text-text-muted" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

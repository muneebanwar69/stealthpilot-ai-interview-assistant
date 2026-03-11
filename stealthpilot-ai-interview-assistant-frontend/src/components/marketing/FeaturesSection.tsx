'use client';

import { motion } from 'framer-motion';
import { Mic, Shield, Zap, Eye, Lock, Gauge, Camera, BrainCircuit } from 'lucide-react';

const features = [
  {
    icon: Mic,
    title: 'Live Transcription',
    description: 'Real-time speech-to-text captures interviewer questions with ultra-low latency',
    gradient: 'from-blue-500 to-cyan-500',
    glow: 'rgba(59, 130, 246, 0.15)',
  },
  {
    icon: BrainCircuit,
    title: 'AI-Powered Answers',
    description: 'Gemini 2.0 Flash generates structured, contextual responses in real-time',
    gradient: 'from-purple-500 to-pink-500',
    glow: 'rgba(168, 85, 247, 0.15)',
  },
  {
    icon: Eye,
    title: 'Invisible to Screen Share',
    description: 'OS-level screen capture protection keeps your assistant completely hidden',
    gradient: 'from-green-500 to-emerald-500',
    glow: 'rgba(34, 197, 94, 0.15)',
  },
  {
    icon: Camera,
    title: 'Screenshot OCR',
    description: 'Capture any on-screen question with one click — AI reads and answers it instantly',
    gradient: 'from-orange-500 to-amber-500',
    glow: 'rgba(249, 115, 22, 0.15)',
  },
  {
    icon: Lock,
    title: 'Privacy First',
    description: 'End-to-end encrypted sessions. Audio processed locally. Your data stays yours.',
    gradient: 'from-indigo-500 to-violet-500',
    glow: 'rgba(99, 102, 241, 0.15)',
  },
  {
    icon: Gauge,
    title: 'Multiple Profiles',
    description: 'Interview, Sales, Meeting, Presentation — each profile optimized for its context',
    gradient: 'from-teal-500 to-cyan-500',
    glow: 'rgba(20, 184, 166, 0.15)',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="py-32 relative overflow-hidden">
      {/* Section glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-brand-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-6 relative">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 mb-6"
          >
            <Zap className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-medium text-brand-glow">Powerful Features</span>
          </motion.div>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Built for high-stakes <br />
            <span className="gradient-text">performance</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Everything you need to ace your next interview, all running invisibly in the background.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.65,
                delay: index * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="glass-card-3d p-8 h-full group relative overflow-hidden">
                {/* Hover glow effect */}
                <div
                  className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-3xl pointer-events-none"
                  style={{ background: feature.glow }}
                />

                <div className={`relative w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-lg transition-all duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                  {/* Icon glow */}
                  <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-40 blur-xl transition-opacity duration-300`} />
                </div>
                <h3 className="relative text-xl font-semibold mb-3 group-hover:text-text-primary transition-colors">
                  {feature.title}
                </h3>
                <p className="relative text-text-secondary leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

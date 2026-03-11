'use client';

import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Download, Video, Sparkles, Check } from 'lucide-react';

const steps = [
  {
    icon: Download,
    title: 'Install StealthPilot',
    description: 'Download the desktop app for macOS, Windows, or Linux. Quick 2-minute setup.',
  },
  {
    icon: Video,
    title: 'Join Your Interview',
    description: 'Start your meeting as usual. StealthPilot runs invisibly in a separate window.',
  },
  {
    icon: Sparkles,
    title: 'Get AI Assistance',
    description: 'Receive real-time suggestions, transcripts, and confidence scoring — completely hidden.',
  },
];

export function HowItWorksSection() {
  return (
    <section id="how-it-works" className="py-32 relative overflow-hidden bg-bg-void/50">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Get started in <span className="gradient-text">3 simple steps</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            From download to your first AI-assisted interview in minutes
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="relative">
            {/* Connection Line */}
            <div className="hidden lg:block absolute top-24 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-brand-primary to-transparent opacity-30" />

            <div className="grid md:grid-cols-3 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={step.title}
                  initial={{ opacity: 0, y: 40 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-80px' }}
                  transition={{
                    duration: 0.65,
                    delay: index * 0.2,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="relative"
                >
                  <GlassPanel className="p-8 text-center">
                    {/* Step Number */}
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
                      {index + 1}
                    </div>

                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center mx-auto mb-6 mt-4">
                      <step.icon className="w-8 h-8 text-white" />
                    </div>

                    <h3 className="text-xl font-semibold mb-4">{step.title}</h3>
                    <p className="text-text-secondary leading-relaxed">
                      {step.description}
                    </p>
                  </GlassPanel>
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Feature Checklist */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="mt-20"
        >
          <GlassPanel className="p-8 max-w-3xl mx-auto">
            <h3 className="text-2xl font-bold mb-6 text-center">What you get with StealthPilot</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {[
                'Real-time transcription',
                'AI-powered suggestions',
                'Confidence scoring',
                'Post-session analytics',
                'Multiple interview profiles',
                'Screen share invisibility',
                'End-to-end encryption',
                'Unlimited sessions',
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0">
                    <Check className="w-3 h-3 text-brand-primary" />
                  </div>
                  <span className="text-text-secondary">{feature}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </motion.div>
      </div>
    </section>
  );
}

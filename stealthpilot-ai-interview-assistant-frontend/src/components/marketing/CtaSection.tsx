'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export function CtaSection() {
  return (
    <section className="py-32 relative overflow-hidden">
      {/* Radial gradient background */}
      <div className="absolute inset-0 bg-gradient-radial from-brand-primary/20 to-transparent opacity-50" />
      <div className="noise-overlay" />

      <div className="container mx-auto px-6 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-4xl mx-auto text-center"
        >
          <div className="inline-flex items-center px-4 py-2 mb-8 rounded-full bg-brand-primary/10 border border-brand-primary/20 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 mr-2 text-brand-primary" />
            <span className="text-sm text-brand-glow">Join 3,400+ confident candidates</span>
          </div>

          <h2 className="text-5xl md:text-7xl font-bold mb-8 leading-tight">
            Ready to ace your <br />
            <span className="gradient-text">next interview?</span>
          </h2>

          <p className="text-xl md:text-2xl text-text-secondary mb-12 max-w-2xl mx-auto">
            Get started with StealthPilot today. No credit card required. No hidden fees.
            Just intelligent assistance when you need it most.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/sign-up">
              <Button size="lg" className="w-full sm:w-auto text-lg px-10 py-6 h-auto group">
                Start Free Trial
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-lg px-10 py-6 h-auto">
                Schedule Demo
              </Button>
            </Link>
          </div>

          {/* Additional reassurance */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.65 }}
            className="mt-12 flex flex-wrap items-center justify-center gap-8 text-sm text-text-muted"
          >
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-emerald" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-emerald" />
              <span>14-day free trial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-brand-emerald" />
              <span>Cancel anytime</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}

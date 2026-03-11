'use client';

import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { Check, Star } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'Perfect for trying out StealthPilot',
    features: [
      '3 sessions per month',
      'Basic transcription',
      'Community support',
      'Standard suggestions',
    ],
    cta: 'Get Started',
    popular: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: 'per month',
    description: 'For serious interview prep',
    features: [
      'Unlimited sessions',
      'Advanced AI suggestions',
      'Priority support',
      'Custom profiles',
      'Session recordings',
      'Export transcripts',
      'Analytics dashboard',
    ],
    cta: 'Start Free Trial',
    popular: true,
  },
  {
    name: 'Team',
    price: '$49',
    period: 'per month',
    description: 'For teams and organizations',
    features: [
      'Everything in Pro',
      'Up to 10 team members',
      'Centralized billing',
      'Team analytics',
      'Admin dashboard',
      'Dedicated support',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    popular: false,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="py-32 relative overflow-hidden">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Simple, <span className="gradient-text">transparent pricing</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Choose the plan that works best for you. Cancel anytime.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{
                duration: 0.65,
                delay: index * 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative"
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-brand-primary to-brand-teal text-white text-sm font-medium">
                    <Star className="w-3 h-3 fill-current" />
                    Most Popular
                  </div>
                </div>
              )}

              <GlassPanel
                className={`p-8 h-full flex flex-col ${
                  plan.popular
                    ? 'border-brand-primary shadow-[0_0_50px_rgba(124,106,255,0.3)] scale-105'
                    : ''
                }`}
              >
                <div className="mb-6">
                  <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-5xl font-bold gradient-text">{plan.price}</span>
                    <span className="text-text-muted">/{plan.period}</span>
                  </div>
                  <p className="text-text-secondary">{plan.description}</p>
                </div>

                <div className="space-y-4 mb-8 flex-grow">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full bg-brand-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-brand-primary" />
                      </div>
                      <span className="text-text-secondary text-sm">{feature}</span>
                    </div>
                  ))}
                </div>

                <Link href="/sign-up">
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    size="lg"
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </GlassPanel>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

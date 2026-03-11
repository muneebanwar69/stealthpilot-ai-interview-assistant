'use client';

import { motion } from 'framer-motion';
import * as Accordion from '@radix-ui/react-accordion';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    question: 'Is StealthPilot really invisible during screen sharing?',
    answer:
      'Yes! StealthPilot uses OS-level APIs to exclude itself from screen capture. On Windows, it uses SetWindowDisplayAffinity. On macOS, it uses setContentProtection. The interviewer will never see your assistant window, even when you share your entire screen.',
  },
  {
    question: 'How does the AI generate suggestions?',
    answer:
      'StealthPilot uses Gemini 2.0 Flash to analyze the live transcription from your interview. It understands context, identifies questions, and generates relevant, structured answers in real-time using the STAR method and other frameworks.',
  },
  {
    question: 'What about audio quality and latency?',
    answer:
      'We use Deepgram for speech-to-text with < 300ms latency. Our optimized pipeline ensures suggestions appear almost instantly. Audio is processed locally when possible to minimize delays.',
  },
  {
    question: 'Is my data secure and private?',
    answer:
      'Absolutely. All data is encrypted end-to-end. Audio processing happens locally or through encrypted channels. We never log transcripts to third-party analytics. You can delete your data at any time.',
  },
  {
    question: 'Can I use StealthPilot for different types of meetings?',
    answer:
      'Yes! StealthPilot supports multiple profiles: Interviews, Sales Calls, Business Meetings, Presentations, and Negotiations. Each profile is optimized with specific prompts and suggestion formats.',
  },
  {
    question: 'What platforms are supported?',
    answer:
      'StealthPilot works on macOS (10.15+), Windows (10/11), and Linux (experimental). It supports all video conferencing platforms including Zoom, Google Meet, Microsoft Teams, and more.',
  },
];

export function FaqSection() {
  return (
    <section className="py-32 relative overflow-hidden bg-bg-void/30">
      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <h2 className="text-4xl md:text-6xl font-bold mb-6">
            Frequently asked <span className="gradient-text">questions</span>
          </h2>
          <p className="text-xl text-text-secondary max-w-2xl mx-auto">
            Everything you need to know about StealthPilot
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-3xl mx-auto"
        >
          <Accordion.Root type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <Accordion.Item
                key={index}
                value={`item-${index}`}
                className="glass-panel overflow-hidden"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between p-6 text-left hover:bg-bg-elevated/50 transition-colors group">
                    <span className="text-lg font-semibold group-hover:text-brand-primary transition-colors">
                      {faq.question}
                    </span>
                    <ChevronDown className="w-5 h-5 text-text-muted group-hover:text-brand-primary transition-all duration-300 group-data-[state=open]:rotate-180" />
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Content className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
                  <div className="px-6 pb-6 text-text-secondary leading-relaxed">
                    {faq.answer}
                  </div>
                </Accordion.Content>
              </Accordion.Item>
            ))}
          </Accordion.Root>
        </motion.div>
      </div>
    </section>
  );
}

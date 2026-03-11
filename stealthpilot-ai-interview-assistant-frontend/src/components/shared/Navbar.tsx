'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Menu, X, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-bg-base/90 backdrop-blur-2xl border-b border-white/[0.06] shadow-lg shadow-black/20'
          : 'bg-transparent'
      }`}
    >
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 3 }}
              className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center shadow-lg shadow-brand-primary/20"
            >
              <Shield className="w-5 h-5 text-white" />
              <div className="absolute inset-0 rounded-xl bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            </motion.div>
            <span className="text-xl font-bold gradient-text tracking-tight">StealthPilot</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {['Features', 'How It Works', 'Pricing'].map((item) => (
              <Link
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                className="relative px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors group"
              >
                {item}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-[2px] bg-gradient-to-r from-brand-primary to-brand-teal group-hover:w-3/4 transition-all duration-300" />
              </Link>
            ))}

            <div className="w-px h-6 bg-white/10 mx-4" />

            <Link href="/dashboard">
              <Button variant="ghost" className="text-sm">Dashboard</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="outline" className="text-sm border-white/10 hover:border-brand-primary/40">
                Sign In
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button className="text-sm glow-button bg-gradient-to-r from-brand-primary to-brand-primary/80">
                Get Started Free
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            className="md:hidden text-text-primary p-2 rounded-lg hover:bg-white/[0.04]"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? <X /> : <Menu />}
          </motion.button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-6 space-y-4 border-t border-white/[0.06]">
                {['Features', 'How It Works', 'Pricing'].map((item) => (
                  <Link
                    key={item}
                    href={`#${item.toLowerCase().replace(/\s+/g, '-')}`}
                    className="block text-text-secondary hover:text-text-primary transition-colors text-lg"
                    onClick={() => setIsOpen(false)}
                  >
                    {item}
                  </Link>
                ))}
                <div className="space-y-3 pt-4">
                  <Link href="/sign-in">
                    <Button variant="outline" className="w-full border-white/10">Sign In</Button>
                  </Link>
                  <Link href="/sign-up">
                    <Button className="w-full glow-button">Get Started Free</Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}

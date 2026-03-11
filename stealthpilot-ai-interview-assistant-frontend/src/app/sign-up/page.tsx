'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { AnimatedBackground } from '@/components/ui/animated-background';
import { authAPI } from '@/lib/api';
import { Mail, Lock, User, UserCircle, Loader2, CheckCircle, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    username: '',
    password: '',
    full_name: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authAPI.register(formData);
      setSuccess(true);
      setTimeout(() => {
        router.push('/sign-in');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 relative">
        <AnimatedBackground variant="default" />
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel-elevated rounded-2xl max-w-md w-full text-center p-12 relative z-10"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
            className="w-20 h-20 rounded-full bg-brand-emerald/20 flex items-center justify-center mx-auto mb-6"
          >
            <CheckCircle className="w-10 h-10 text-brand-emerald" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-2">Registration Successful!</h2>
          <p className="text-text-secondary mb-6">
            Your account has been created and is pending admin approval.
            You&apos;ll be able to sign in once approved.
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-text-muted">
            <div className="w-2 h-2 rounded-full bg-brand-primary animate-pulse" />
            Redirecting to sign in...
          </div>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 relative">
      <AnimatedBackground variant="default" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo & Header */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 3 }}
              className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center shadow-lg shadow-brand-primary/25"
            >
              <Shield className="w-6 h-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold gradient-text tracking-tight">StealthPilot</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Create your account</h1>
          <p className="text-text-secondary">Join thousands of confident candidates</p>
        </div>

        {/* Glass form card */}
        <div className="glass-panel-elevated rounded-2xl overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-8 space-y-5">
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
                >
                  {error}
                </motion.div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Full Name</label>
                <div className="relative">
                  <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="premium-input pl-11"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="premium-input pl-11"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="text"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="premium-input pl-11"
                    placeholder="johndoe"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="premium-input pl-11"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-text-muted">Must be at least 6 characters</p>
              </div>

              <Button
                type="submit"
                className="w-full glow-button py-3 h-auto text-base group"
                disabled={loading}
              >
                {loading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating account...</>
                ) : (
                  <>Create Account <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
                )}
              </Button>
            </div>
          </form>
        </div>

        <div className="text-center mt-6 space-y-3">
          <p className="text-sm text-text-muted">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-brand-primary hover:text-brand-glow transition-colors">
              Sign in
            </Link>
          </p>
          <p className="text-xs text-text-muted opacity-60">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </motion.div>
    </main>
  );
}


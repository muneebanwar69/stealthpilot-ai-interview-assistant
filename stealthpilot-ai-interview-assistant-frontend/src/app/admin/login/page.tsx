'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { authAPI } from '@/lib/api';
import { Loader2, ShieldCheck } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Auto-fill admin credentials
    setFormData({
      username: 'admin',
      password: 'admin123',
    });
  }, []);

  const [formData, setFormData] = useState({
    username: 'admin',
    password: 'admin123',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData.username, formData.password);
      localStorage.setItem('token', response.data.access_token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
      
      if (response.data.user.role === 'admin') {
        router.push('/admin');
      } else {
        setError('This account does not have admin privileges.');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-bg-base flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">StealthPilot Admin</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Admin Access</h1>
          <p className="text-text-secondary">Quick admin login for development</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Admin Login</CardTitle>
              <CardDescription>
                Credentials are pre-filled for quick access
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              <div className="p-4 rounded-lg bg-brand-primary/10 border border-brand-primary/20">
                <p className="text-sm text-text-secondary mb-3">Default Admin Credentials:</p>
                <div className="space-y-1 text-sm font-mono">
                  <p className="text-brand-primary">Username: admin</p>
                  <p className="text-brand-primary">Password: admin123</p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-surface border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="admin"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-surface border border-border-default rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-primary focus:border-transparent"
                  placeholder="••••••••"
                  required
                />
              </div>
            </CardContent>
            <div className="px-6 pb-6">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? 'Signing in...' : 'Sign in as Admin'}
              </Button>
              <div className="mt-4 text-center">
                <Link href="/sign-in" className="text-sm text-text-muted hover:text-brand-primary transition-colors">
                  Regular Sign In
                </Link>
              </div>
            </div>
          </form>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-sm text-text-muted">
            This is a development login page. In production, use proper authentication.
          </p>
        </div>
      </div>
    </main>
  );
}

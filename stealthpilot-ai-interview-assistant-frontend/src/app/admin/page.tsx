'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/glass-panel';
import { adminAPI } from '@/lib/api';
import { 
  Users, CheckCircle, XCircle, Clock, BarChart3, Settings, LogOut,
  UserCheck, Ban, Trash2, Eye
} from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<any>(null);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    
    if (!token || !user) {
      router.push('/sign-in');
      return;
    }

    const userData = JSON.parse(user);
    if (userData.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, pendingRes, allRes] = await Promise.all([
        adminAPI.getStats(),
        adminAPI.getPendingUsers(),
        adminAPI.getAllUsers(),
      ]);

      setStats(statsRes.data);
      setPendingUsers(pendingRes.data);
      setAllUsers(allRes.data);
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId: number) => {
    try {
      await adminAPI.approveUser(userId);
      fetchData();
    } catch (error) {
      console.error('Failed to approve user:', error);
    }
  };

  const handleReject = async (userId: number) => {
    try {
      await adminAPI.rejectUser(userId);
      fetchData();
    } catch (error) {
      console.error('Failed to reject user:', error);
    }
  };

  const handleSuspend = async (userId: number) => {
    try {
      await adminAPI.suspendUser(userId);
      fetchData();
    } catch (error) {
      console.error('Failed to suspend user:', error);
    }
  };

  const handleUnsuspend = async (userId: number) => {
    try {
      await adminAPI.unsuspendUser(userId);
      fetchData();
    } catch (error) {
      console.error('Failed to unsuspend user:', error);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await adminAPI.deleteUser(userId);
      fetchData();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-base flex items-center justify-center">
        <span className="loader"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-bg-surface border-r border-border-subtle p-6">
        <Link href="/" className="flex items-center gap-2 mb-12">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-teal" />
          <span className="text-lg font-bold gradient-text">StealthPilot</span>
        </Link>

        <nav className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-brand-primary/10 text-brand-primary border-l-2 border-brand-primary">
            <Users className="w-5 h-5" />
            <span className="font-medium">Admin Panel</span>
          </button>
          <Link href="/dashboard">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors">
              <BarChart3 className="w-5 h-5" />
              <span>Dashboard</span>
            </button>
          </Link>
          <Link href="/settings">
            <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-text-secondary hover:bg-bg-elevated hover:text-text-primary transition-colors">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </Link>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <GlassPanel className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-teal flex items-center justify-center">
                <span className="text-white font-bold">A</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium">Admin</p>
                <p className="text-xs text-text-muted">Administrator</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-full" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </GlassPanel>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-text-secondary">Manage users and monitor system activity</p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-text-muted flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Total Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_users || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-text-muted flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pending Approvals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-brand-primary">{stats?.pending_approvals || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-text-muted flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Approved Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-brand-emerald">{stats?.approved_users || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-text-muted">
                  Total Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stats?.total_sessions || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <Button
              variant={activeTab === 'pending' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('pending')}
            >
              <Clock className="w-4 h-4 mr-2" />
              Pending ({pendingUsers.length})
            </Button>
            <Button
              variant={activeTab === 'all' ? 'default' : 'ghost'}
              onClick={() => setActiveTab('all')}
            >
              <Users className="w-4 h-4 mr-2" />
              All Users ({allUsers.length})
            </Button>
          </div>

          {/* User List */}
          <Card>
            <CardHeader>
              <CardTitle>
                {activeTab === 'pending' ? 'Pending User Approvals' : 'All Users'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeTab === 'pending' ? (
                pendingUsers.length === 0 ? (
                  <div className="text-center py-12 text-text-muted">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No pending approvals</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.map((user) => (
                      <div key={user.id} className="p-4 rounded-lg bg-bg-surface border border-border-subtle">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-teal" />
                              <div>
                                <p className="font-medium">{user.full_name}</p>
                                <p className="text-sm text-text-muted">{user.email}</p>
                                <p className="text-xs text-text-muted">@{user.username}</p>
                              </div>
                            </div>
                            <p className="text-sm text-text-muted">
                              Registered: {new Date(user.created_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              size="sm" 
                              variant="default"
                              onClick={() => handleApprove(user.id)}
                            >
                              <UserCheck className="w-4 h-4 mr-2" />
                              Approve
                            </Button>
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleReject(user.id)}
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="space-y-3">
                  {allUsers.map((user) => (
                    <div key={user.id} className="p-4 rounded-lg bg-bg-surface border border-border-subtle">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-teal" />
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{user.full_name}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${
                                  user.status === 'approved' ? 'bg-brand-emerald/20 text-brand-emerald' :
                                  user.status === 'pending' ? 'bg-brand-primary/20 text-brand-primary' :
                                  user.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {user.status}
                                </span>
                                {user.role === 'admin' && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-purple-500/20 text-purple-400">
                                    admin
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-text-muted">{user.email}</p>
                            </div>
                          </div>
                        </div>
                        {user.role !== 'admin' && (
                          <div className="flex gap-2">
                            {user.status === 'approved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleSuspend(user.id)}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Suspend
                              </Button>
                            )}
                            {user.status === 'suspended' && (
                              <Button 
                                size="sm" 
                                variant="default"
                                onClick={() => handleUnsuspend(user.id)}
                              >
                                <UserCheck className="w-4 h-4 mr-2" />
                                Unsuspend
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="destructive"
                              onClick={() => handleDelete(user.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}

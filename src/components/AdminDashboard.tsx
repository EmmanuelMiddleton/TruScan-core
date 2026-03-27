import { useState, useEffect, FormEvent, useCallback } from 'react';
import { 
  Users, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Shield, 
  LogOut,
  AlertCircle,
  Lock,
  Search,
  UserPlus,
  TrendingUp,
  Wallet,
  BarChart3,
  ArrowUpRight,
  Zap,
  Home,
  RefreshCw,
  Terminal,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

interface Application {
  id: string;
  created_at: string;
  name: string;
  email: string;
  whatsapp: string;
  experience: string;
  status: 'pending' | 'approved' | 'declined';
  agent_code?: string;
}

interface AdminStats {
  totalAgents: number;
  totalLeads: number;
  totalEarnings: number;
  leadsByStage: { name: string; value: number }[];
  recentLeads: { id: string; name: string; stage: string; date: string }[];
  lastUpdated?: string;
}

export default function AdminDashboard() {
  const [adminCode, setAdminCode] = useState<string | null>(localStorage.getItem('truscan_session_token') || localStorage.getItem('truscan_admin_code'));
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone');
  const [whatsapp, setWhatsapp] = useState('');
  const [otp, setOtp] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [appsError, setAppsError] = useState<string | null>(null);
  const [appsErrorCode, setAppsErrorCode] = useState<string | null>(null);
  const [appsErrorDetails, setAppsErrorDetails] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<'checking' | 'connected' | 'error' | 'not_configured'>('checking');
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'declined'>('all');
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; qrCode: string; agentCode: string; name: string; whatsapp: string } | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const fetchData = useCallback(async () => {
    if (!adminCode) return;
    setLoading(true);
    setLoadError(null);
    setAppsError(null);
    setStatsLoading(true);
    setStatsError(false);
    
    console.log('📡 Admin Dashboard: Fetching data...');
    
    // Check Supabase Health
    fetch('/api/health/supabase')
      .then(res => res.json())
      .then(data => setSupabaseStatus(data.status))
      .catch(() => setSupabaseStatus('error'));

    const fetchWithTimeout = async (url: string, options: RequestInit, timeout = 15000) => {
      const controller = new AbortController();
      const id = setTimeout(() => {
        console.warn(`⚠️ Admin fetch timed out: ${url}`);
        controller.abort();
      }, timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (error) {
        clearTimeout(id);
        throw error;
      }
    };

    try {
      const [appsRes, statsRes] = await Promise.all([
        fetchWithTimeout('/api/admin/applications', { headers: { 'Authorization': `Bearer ${adminCode}` } }),
        fetchWithTimeout('/api/admin/stats', { headers: { 'Authorization': `Bearer ${adminCode}` } })
      ]);

      if (appsRes.ok) {
        const appsData = await appsRes.json();
        setApplications(appsData);
        setAppsError(null);
        setAppsErrorCode(null);
        setAppsErrorDetails(null);
      } else {
        const errData = await appsRes.json().catch(() => ({}));
        const errorMsg = errData.error || `Server error: ${appsRes.status}`;
        const errorDetails = errData.details || (appsRes.status === 500 ? 'Internal server error. Check database configuration.' : '');
        const errorCode = errData.code;
        
        console.error('❌ Apps fetch failed:', errorMsg, errorDetails, errorCode);
        setAppsError(errorMsg);
        setAppsErrorCode(errorCode);
        setAppsErrorDetails(errorDetails);
        
        if (appsRes.status === 401) {
          setLoadError('Unauthorized access. Please log in again.');
          handleLogout();
        }
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats({
          totalAgents: data.totalAgents || 0,
          totalLeads: data.totalLeads || 0,
          totalEarnings: data.totalEarnings || 0,
          leadsByStage: data.leadsByStage || [],
          recentLeads: data.recentLeads || [],
          lastUpdated: data.lastUpdated
        });
      } else {
        console.error('❌ Stats fetch failed:', statsRes.status);
        setStatsError(true);
        if (statsRes.status === 401) handleLogout();
      }
    } catch (err: any) {
      console.error('💥 Error fetching admin data:', err);
      if (err.name === 'AbortError') {
        setLoadError('Request timed out. The server might be busy.');
      } else {
        setLoadError('Network error. Please check your connection.');
      }
      setStatsError(true);
    } finally {
      setLoading(false);
      setStatsLoading(false);
    }
  }, [adminCode]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);
    setMockOtp(null);

    try {
      const res = await fetch('/api/auth/whatsapp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, type: 'admin' })
      });

      const data = await res.json();
      if (res.ok) {
        setAuthStep('otp');
        if (data.mockOtp) {
          setMockOtp(data.mockOtp);
        }
      } else {
        setLoginError(data.error || 'Failed to request OTP');
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);

    try {
      const res = await fetch('/api/auth/whatsapp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, otp })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.isAdmin) {
          const token = data.sessionToken;
          localStorage.setItem('truscan_session_token', token);
          setAdminCode(token);
        } else {
          setLoginError('You do not have administrator privileges.');
        }
      } else {
        setLoginError(data.error || 'Invalid OTP');
      }
    } catch (err) {
      setLoginError('Network error. Please try again.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    try {
      if (adminCode) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${adminCode}` }
        });
      }
    } catch (e) {}
    localStorage.removeItem('truscan_admin_code');
    localStorage.removeItem('truscan_session_token');
    setAdminCode(null);
    setApplications([]);
    setLoading(false);
  };

  const handleApprove = async (appId: string) => {
    try {
      const res = await fetch('/api/admin/approve', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${adminCode}`
        },
        body: JSON.stringify({ appId })
      });
      if (res.ok) {
        const { agentCode, qrCodeBase64 } = await res.json();
        const app = applications.find(a => a.id === appId);
        
        setApplications(prev => prev.map(app => 
          app.id === appId ? { ...app, status: 'approved', agent_code: agentCode } : app
        ));

        if (app) {
          setQrModal({
            isOpen: true,
            qrCode: qrCodeBase64,
            agentCode,
            name: app.name,
            whatsapp: app.whatsapp
          });
        }
      }
    } catch (error) {
      showNotification('Failed to approve application.', 'error');
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${adminCode}` }
      });
      if (res.ok) {
        const logs = await res.json();
        setServerLogs(logs);
        setShowLogs(true);
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const handleDecline = async (appId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Decline Application',
      message: 'Are you sure you want to decline this application? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const res = await fetch('/api/admin/decline', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${adminCode}`
            },
            body: JSON.stringify({ appId })
          });
          if (res.ok) {
            setApplications(prev => prev.map(app => 
              app.id === appId ? { ...app, status: 'declined' } : app
            ));
            showNotification('Application declined successfully.');
          }
        } catch (error) {
          showNotification('Failed to decline application.', 'error');
        } finally {
          setConfirmModal(null);
        }
      }
    });
  };

  if (!adminCode) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-brand-surface border border-brand-border-em p-10 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-3 mb-10">
            <Shield className="w-10 h-10 text-brand-blue" />
            <div>
              <h1 className="text-lg font-bold font-display">Admin Portal</h1>
              <p className="text-xs text-brand-muted">TruScan Systems Management</p>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold font-display mb-2">Admin Login</h2>
          <p className="text-sm text-brand-muted mb-8">
            {authStep === 'phone' 
              ? 'Enter your registered WhatsApp number to receive a secure login code.' 
              : `Enter the 6-digit code sent to ${whatsapp}.`}
          </p>

          <form onSubmit={authStep === 'phone' ? handleRequestOtp : handleVerifyOtp} className="space-y-6">
            {authStep === 'phone' ? (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-brand-muted">WhatsApp Number</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-muted text-sm font-bold">+</div>
                  <input 
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    type="tel" 
                    placeholder="27123456789" 
                    className="w-full bg-brand-bg border border-brand-border-em rounded-xl pl-8 pr-5 py-4 text-sm focus:border-brand-blue-light outline-none transition-all tracking-widest font-mono" 
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-brand-muted">6-Digit OTP</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-muted" />
                  <input 
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    type="text" 
                    maxLength={6}
                    placeholder="000000" 
                    className="w-full bg-brand-bg border border-brand-border-em rounded-xl pl-12 pr-5 py-4 text-sm focus:border-brand-blue-light outline-none transition-all tracking-[0.5em] font-mono text-center" 
                  />
                </div>
                {mockOtp && (
                  <div className="p-3 bg-brand-blue/5 border border-brand-blue/10 rounded-lg">
                    <p className="text-[10px] text-brand-blue font-bold uppercase tracking-widest mb-1">Dev Mode OTP:</p>
                    <p className="text-lg font-mono font-bold tracking-widest text-brand-blue-light">{mockOtp}</p>
                  </div>
                )}
                <button 
                  type="button"
                  onClick={() => setAuthStep('phone')}
                  className="text-[10px] font-bold text-brand-blue hover:underline uppercase tracking-widest"
                >
                  Change Number
                </button>
              </div>
            )}

            {loginError && (
              <div className="flex items-center gap-2 text-red-500 text-xs font-bold bg-red-500/10 p-3 rounded-lg">
                <AlertCircle className="w-4 h-4" />
                {loginError}
              </div>
            )}

            <button 
              disabled={isAuthenticating}
              type="submit" 
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-base hover:bg-brand-blue-light transition-all shadow-xl shadow-brand-blue/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isAuthenticating 
                ? 'Processing...' 
                : (authStep === 'phone' ? 'Send OTP' : 'Verify & Login')}
            </button>
            <div className="text-center pt-4">
              <a href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-blue transition-all">
                <Home className="w-3 h-3" />
                Back to Website
              </a>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (loading && adminCode && !applications.length) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin shadow-lg shadow-brand-blue/20"></div>
          <div className="space-y-2">
            <p className="text-brand-blue font-bold text-lg">Loading Admin Portal...</p>
            <p className="text-brand-muted text-sm">Fetching latest business metrics...</p>
          </div>
          <div className="pt-4 flex flex-col gap-3 w-full">
            <button 
              onClick={() => window.location.reload()}
              className="text-xs font-bold text-brand-blue hover:underline uppercase tracking-widest"
            >
              Refresh Page
            </button>
            <button 
              onClick={handleLogout}
              className="text-xs font-bold text-red-500 hover:underline uppercase tracking-widest"
            >
              Cancel & Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loadError && adminCode) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="bg-brand-surface border border-brand-border-em p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-2">Admin Portal Error</h2>
          <p className="text-brand-muted text-sm mb-8">{loadError}</p>
          
          <div className="space-y-3">
            <button 
              onClick={() => fetchData()}
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-base hover:bg-brand-blue-light transition-all shadow-xl shadow-brand-blue/10 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            <button 
              onClick={handleLogout}
              className="w-full bg-brand-bg border border-brand-border text-brand-muted py-4 rounded-xl font-bold text-sm hover:text-brand-blue transition-all"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  const filteredApps = applications.filter(app => {
    if (filter === 'all') return true;
    return app.status === filter;
  });

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans">
      <header className="border-b border-brand-border bg-brand-surface/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-brand-blue" />
              <h1 className="text-sm font-bold uppercase tracking-widest">Admin Dashboard</h1>
            </div>
            <div className="h-6 w-px bg-brand-border hidden md:block"></div>
            <a 
              href="/" 
              className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-blue transition-all bg-brand-bg px-4 py-2 rounded-lg border border-brand-border hover:border-brand-blue/30"
            >
              <Home className="w-3.5 h-3.5" />
              Return to Site
            </a>
          </div>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-bg rounded-full border border-brand-border">
              <div className={`w-2 h-2 rounded-full ${
                supabaseStatus === 'connected' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' :
                supabaseStatus === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]' :
                supabaseStatus === 'not_configured' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' :
                'bg-blue-500 animate-pulse'
              }`} />
              <span className="text-[9px] uppercase tracking-widest font-bold text-brand-muted">
                Supabase: {supabaseStatus.replace('_', ' ')}
              </span>
            </div>
            <button onClick={handleLogout} className="p-2 hover:bg-brand-surface rounded-lg text-brand-muted hover:text-red-500 transition-colors">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Business Overview Stats */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold font-display flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-brand-blue" />
                Business Performance
              </h2>
              {stats?.lastUpdated && (
                <div className="flex items-center gap-2 px-3 py-1 bg-brand-surface border border-brand-border rounded-full">
                  <div className={`w-1.5 h-1.5 rounded-full ${supabaseStatus === 'connected' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-brand-muted">
                    Last Sync: {new Date(stats.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              )}
            </div>
            <button 
              onClick={() => fetchData()}
              className="text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-blue transition-colors flex items-center gap-2"
            >
              <RefreshCw className={`w-3 h-3 ${statsLoading ? 'animate-spin' : ''}`} />
              Refresh Data
            </button>
          </div>
          
          {statsLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-brand-surface border border-brand-border p-6 rounded-3xl animate-pulse">
                  <div className="h-4 w-20 bg-brand-bg rounded mb-4"></div>
                  <div className="h-8 w-32 bg-brand-bg rounded"></div>
                </div>
              ))}
            </div>
          ) : stats && !statsError ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { label: 'Total Agents', value: stats.totalAgents, icon: Users, color: 'text-brand-blue' },
                { label: 'Total Leads', value: stats.totalLeads, icon: Zap, color: 'text-brand-wa' },
                { label: 'Revenue Generated', value: `R ${stats.totalEarnings.toLocaleString()}`, icon: Wallet, color: 'text-brand-text' },
                { label: 'Growth Rate', value: '+24%', icon: TrendingUp, color: 'text-brand-blue' },
              ].map((stat, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={i} 
                  className="bg-brand-surface border border-brand-border p-6 rounded-3xl hover:border-brand-blue/30 transition-all group flex flex-col h-full"
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted group-hover:text-brand-blue transition-colors">{stat.label}</span>
                    <div className={`w-8 h-8 rounded-lg bg-brand-bg flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold font-display">{stat.value}</div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 p-8 rounded-3xl text-center">
              <AlertCircle className="w-8 h-8 text-red-500 mx-auto mb-4" />
              <p className="text-red-500 text-sm font-bold">Failed to load business stats.</p>
              <button onClick={() => window.location.reload()} className="mt-4 text-xs font-bold text-brand-text underline">Try Again</button>
            </div>
          )}
        </div>

        {/* Infographics Section */}
        <div className="grid lg:grid-cols-12 gap-8 mb-16">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-8 bg-brand-surface border border-brand-border p-8 rounded-[2.5rem] flex flex-col"
          >
            <div className="flex items-center justify-between mb-10">
              <div>
                <h3 className="text-xl font-bold font-display">Lead Pipeline</h3>
                <p className="text-xs text-brand-muted">Distribution of leads across funnel stages.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                  <span className="text-[10px] text-brand-muted font-bold uppercase">Active</span>
                </div>
                <div className="flex items-center gap-1.5 ml-4">
                  <div className="w-2 h-2 rounded-full bg-brand-wa"></div>
                  <span className="text-[10px] text-brand-muted font-bold uppercase">Converted</span>
                </div>
              </div>
            </div>
            
            <div className="h-[350px] w-full mt-auto">
              {!statsLoading && stats && stats.leadsByStage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.leadsByStage} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#262626" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#666', fontSize: 10, fontWeight: 600 }} 
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#666', fontSize: 10, fontWeight: 600 }} 
                    />
                    <Tooltip 
                      cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                      contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '16px', fontSize: '12px', boxShadow: '0 20px 40px rgba(0,0,0,0.4)' }}
                      itemStyle={{ color: '#FFF', fontWeight: 'bold' }}
                    />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                      {stats.leadsByStage.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0066FF' : '#16A34A'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-brand-muted border border-dashed border-brand-border rounded-3xl bg-brand-bg/30">
                  <BarChart3 className="w-10 h-10 mb-4 opacity-20" />
                  <p className="text-sm font-medium">No lead data available to visualize.</p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4 bg-brand-surface border border-brand-border p-8 rounded-[2.5rem] flex flex-col"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold font-display">Recent Activity</h3>
              <Zap className="w-4 h-4 text-brand-wa" />
            </div>
            
            <div className="space-y-6 flex-1">
              {!statsLoading && stats && stats.recentLeads.length > 0 ? (
                stats.recentLeads.map((lead, i) => (
                  <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + (i * 0.1) }}
                    key={lead.id} 
                    className="flex items-start gap-4 p-4 rounded-2xl hover:bg-brand-bg/50 transition-colors border border-transparent hover:border-brand-border"
                  >
                    <div className="w-10 h-10 bg-brand-bg rounded-xl flex items-center justify-center text-brand-blue flex-shrink-0 border border-brand-border">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{lead.name}</p>
                      <p className="text-[10px] text-brand-muted uppercase tracking-wider font-bold mt-1">
                        <span className="text-brand-blue">{lead.stage.replace(/_/g, ' ')}</span> • {new Date(lead.date).toLocaleDateString()}
                      </p>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-brand-muted py-12">
                  <Clock className="w-8 h-8 mb-4 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest">No recent events</p>
                </div>
              )}
            </div>
            
            <button className="w-full mt-8 py-4 bg-brand-bg border border-brand-border rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:border-brand-blue transition-all">
              View Full Audit Log
            </button>
          </motion.div>
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center text-brand-blue">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-display">Partner Applications</h2>
              <p className="text-xs text-brand-muted">Onboard and manage your agent network.</p>
            </div>
          </div>
          <div className="flex bg-brand-surface border border-brand-border p-1 rounded-xl">
            {(['all', 'pending', 'approved', 'declined'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-6 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === f 
                    ? 'bg-brand-blue text-white shadow-lg shadow-brand-blue/20' 
                    : 'text-brand-muted hover:text-brand-text'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-32 flex flex-col items-center justify-center text-brand-muted bg-brand-surface/30 border border-dashed border-brand-border rounded-[2.5rem]">
            <div className="w-12 h-12 border-4 border-brand-blue/20 border-t-brand-blue rounded-full animate-spin mb-6" />
            <h3 className="text-lg font-bold font-display text-brand-text mb-2">Fetching Applications</h3>
            <p className="text-sm max-w-xs text-center opacity-60">
              Connecting to secure database... This usually takes 2-5 seconds.
            </p>
          </div>
        ) : appsError ? (
          <div className="bg-red-500/10 border border-red-500/20 p-12 rounded-[2.5rem] text-center">
            <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-red-500 mb-2">Connection Error</h3>
            <div className="text-sm text-red-500/80 mb-6 max-w-md mx-auto space-y-2">
              <p className="font-bold">{appsError}</p>
              {appsErrorCode && <p className="text-[10px] opacity-70">Error Code: {appsErrorCode}</p>}
              {appsErrorDetails && <p className="text-xs italic">Details: {appsErrorDetails}</p>}
              <p className="text-xs opacity-60 pt-2 border-t border-red-500/10">
                This usually means the Supabase environment variables are missing or the table "truscan_partner_applications" hasn't been created yet.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-red-600 transition-all"
              >
                Retry Connection
              </button>
              <button 
                onClick={fetchLogs}
                className="px-8 py-3 bg-brand-surface border border-brand-border-em text-brand-text rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-brand-border transition-all"
              >
                View Server Logs
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6">
            {filteredApps.length > 0 ? filteredApps.map((app) => (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                key={app.id} 
                className="bg-brand-surface border border-brand-border p-8 rounded-3xl"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                  <div className="space-y-4 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-brand-blue/10 rounded-full flex items-center justify-center text-brand-blue">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-lg">{app.name}</h3>
                        <p className="text-xs text-brand-muted">{app.email} • {app.whatsapp}</p>
                      </div>
                      <span className={`ml-4 text-[10px] font-bold uppercase px-2 py-1 rounded-md ${
                        app.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' : 
                        app.status === 'approved' ? 'bg-brand-wa/10 text-brand-wa' : 
                        'bg-red-500/10 text-red-500'
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="bg-brand-bg/50 p-4 rounded-xl border border-brand-border text-sm text-brand-muted italic">
                      "{app.experience}"
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {app.status === 'pending' && (
                      <>
                        <button 
                          onClick={() => handleApprove(app.id)}
                          className="bg-brand-blue text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-blue-light transition-all flex items-center gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Approve
                        </button>
                        <button 
                          onClick={() => handleDecline(app.id)}
                          className="bg-brand-bg border border-brand-border text-red-500 px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-surface transition-all flex items-center gap-2"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                      </>
                    )}
                    <a 
                      href={`https://wa.me/${app.whatsapp.replace(/\D/g, '')}`} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-brand-surface border border-brand-border text-brand-text px-6 py-3 rounded-xl font-bold text-sm hover:bg-brand-bg transition-all flex items-center gap-2"
                    >
                      Contact on WhatsApp
                    </a>
                  </div>
                </div>
              </motion.div>
            )) : (
              <div className="bg-brand-surface border border-brand-border p-20 rounded-[2.5rem] text-center text-brand-muted">
                <Clock className="w-12 h-12 mx-auto mb-6 opacity-20" />
                <h3 className="text-lg font-bold text-brand-text mb-2">No Applications Yet</h3>
                <p className="text-sm max-w-xs mx-auto mb-8">
                  When someone applies to be a partner through the landing page, their application will appear here for your review.
                </p>
                <a 
                  href="/#partner" 
                  target="_blank"
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-blue hover:underline"
                >
                  Test the Application Form
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      {/* QR Code Modal */}
      {qrModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-bg/80 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-md bg-brand-surface border border-brand-border-em p-8 rounded-[2.5rem] shadow-2xl text-center"
          >
            <div className="w-16 h-16 bg-brand-wa/10 rounded-full flex items-center justify-center text-brand-wa mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-bold font-display mb-2">Agent Approved!</h2>
            <p className="text-brand-muted text-sm mb-8">
              {qrModal.name} is now a TruScan Partner.
            </p>

            <div className="bg-white p-6 rounded-3xl inline-block mb-8 shadow-inner">
              <img src={qrModal.qrCode} alt="Agent QR Code" className="w-48 h-48" />
            </div>

            <div className="space-y-4">
              <div className="bg-brand-bg p-4 rounded-2xl border border-brand-border group relative">
                <p className="text-[10px] uppercase tracking-widest text-brand-muted mb-1">Agent Code</p>
                <div className="flex items-center justify-center gap-3">
                  <p className="text-xl font-bold font-mono text-brand-blue">{qrModal.agentCode}</p>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(qrModal.agentCode);
                      showNotification('Agent code copied to clipboard!');
                    }}
                    className="p-2 hover:bg-brand-surface rounded-lg text-brand-muted hover:text-brand-blue transition-all"
                    title="Copy Code"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => {
                  const message = encodeURIComponent(`Welcome to TruScan Systems! 🚀\n\nYou've been approved as a partner. Your unique agent code is: ${qrModal.agentCode}\n\nUse this link to refer clients: ${window.location.origin}/?agent=${qrModal.agentCode}\n\nScan your QR code to get started!`);
                  window.open(`https://wa.me/${qrModal.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
                }}
                className="w-full bg-brand-wa text-white py-4 rounded-xl font-bold text-base hover:opacity-90 transition-all flex items-center justify-center gap-2"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Send to Agent on WhatsApp
              </button>

              <button 
                onClick={() => setQrModal(null)}
                className="w-full text-brand-muted text-sm font-bold hover:text-brand-text transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border ${
              notification.type === 'success' ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white'
            }`}
          >
            {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm font-bold">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[150] flex items-center justify-center p-6 bg-brand-bg/80 backdrop-blur-sm">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-brand-surface border border-brand-border-em p-8 rounded-[2.5rem] shadow-2xl text-center"
            >
              <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold font-display mb-2">{confirmModal.title}</h2>
              <p className="text-brand-muted text-sm mb-8">{confirmModal.message}</p>
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={confirmModal.onConfirm}
                  className="w-full bg-red-500 text-white py-4 rounded-xl font-bold text-sm hover:bg-red-600 transition-all shadow-xl shadow-red-500/10"
                >
                  Confirm Action
                </button>
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="w-full bg-brand-bg border border-brand-border text-brand-muted py-4 rounded-xl font-bold text-sm hover:text-brand-text transition-all"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Logs Modal */}
      {showLogs && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-brand-bg/80 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-brand-surface border border-brand-border-em rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-8 border-b border-brand-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Terminal className="w-6 h-6 text-brand-blue" />
                <h2 className="text-xl font-bold font-display">Server Debug Logs</h2>
              </div>
              <button onClick={() => setShowLogs(false)} className="p-2 hover:bg-brand-bg rounded-full transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-8 font-mono text-xs space-y-1 bg-black/5">
              {serverLogs.length > 0 ? serverLogs.map((log, i) => (
                <div key={i} className={`py-1 border-b border-brand-border/5 ${log.includes('[ERROR]') ? 'text-red-500' : log.includes('[WARN]') ? 'text-yellow-500' : 'text-brand-muted'}`}>
                  {log}
                </div>
              )) : (
                <div className="text-center py-20 opacity-40">No logs available.</div>
              )}
            </div>
            <div className="p-6 bg-brand-bg/50 border-t border-brand-border flex justify-end">
              <button 
                onClick={fetchLogs}
                className="px-6 py-2 bg-brand-blue text-white rounded-xl font-bold text-xs uppercase tracking-widest"
              >
                Refresh Logs
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

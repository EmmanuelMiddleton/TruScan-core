import { useState, useEffect, FormEvent } from 'react';
import { 
  BarChart3, 
  Users, 
  Wallet, 
  Copy, 
  Check, 
  ExternalLink, 
  TrendingUp, 
  Building2,
  Zap,
  ChevronRight,
  LogOut,
  Lock,
  ArrowRight,
  AlertCircle,
  Home,
  LayoutDashboard,
  PieChart,
  Settings,
  HelpCircle,
  Menu,
  X,
  Download,
  Handshake,
  RefreshCw,
  Terminal
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

interface AgentStats {
  agent_code: string;
  agent_name: string;
  total_referrals: number;
  total_earnings: number;
  commission_tier: string;
  qr_image_path?: string;
  agent_status: string;
  conversionRate?: string;
}

interface Referral {
  id: string;
  created_at: string;
  full_name: string;
  entry_category: string;
  funnel_stage: string;
}

interface PipelineData {
  name: string;
  value: number;
}

export default function AgentDashboard() {
  const [agentCode, setAgentCode] = useState<string | null>(localStorage.getItem('truscan_agent_code'));
  const [sessionToken, setSessionToken] = useState<string | null>(localStorage.getItem('truscan_session_token'));
  const [authStep, setAuthStep] = useState<'phone' | 'otp'>('phone');
  const [whatsapp, setWhatsapp] = useState('');
  const [otp, setOtp] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [mockOtp, setMockOtp] = useState<string | null>(null);

  // Check server health on mount
  useEffect(() => {
    const checkServer = async () => {
      try {
        const res = await fetch('/api/ping');
        if (res.ok) setServerStatus('online');
        else setServerStatus('offline');
      } catch (e) {
        setServerStatus('offline');
      }
    };
    checkServer();
  }, []);
  
  const [stats, setStats] = useState<AgentStats | null>(null);
  const [pipeline, setPipeline] = useState<PipelineData[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadErrorCode, setLoadErrorCode] = useState<string | null>(null);
  const [loadErrorDetails, setLoadErrorDetails] = useState<string | null>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [serverLogs, setServerLogs] = useState<string[]>([]);
  const [statsLoading, setStatsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'leads' | 'settings'>('overview');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (!agentCode || !sessionToken) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setStatsLoading(true);
      setLoadError(null);
      try {
        console.log(`📡 Fetching dashboard data for: ${agentCode}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.warn('⚠️ Dashboard data fetch timed out');
          controller.abort();
        }, 12000);

        const res = await fetch(`/api/agent/${agentCode}/all`, { 
          signal: controller.signal,
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
        clearTimeout(timeoutId);

        if (res.ok) {
          // Add a timeout for JSON parsing too
          const jsonPromise = res.json();
          const jsonTimeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('JSON parsing timeout')), 5000)
          );
          
          const data = await Promise.race([jsonPromise, jsonTimeout]) as any;
          console.log('✅ Dashboard data received:', data);
          
          setStats({
            ...data.agent,
            conversionRate: data.stats.conversionRate
          });
          setReferrals(data.referrals);
          setPipeline(data.stats.leadsByStage || []);
          setLoadError(null);
          setLoadErrorCode(null);
          setLoadErrorDetails(null);
        } else {
          const errData = await res.json().catch(() => ({}));
          const errorMsg = errData.error || `Server error: ${res.status}`;
          const errorDetails = errData.details || (res.status === 500 ? 'Internal server error. Check database configuration.' : '');
          const errorCode = errData.code;
          
          console.error('❌ Dashboard fetch failed:', errorMsg, errorDetails, errorCode);
          setLoadError(errorMsg);
          setLoadErrorCode(errorCode);
          setLoadErrorDetails(errorDetails);
          
          if (res.status === 404 || res.status === 401) {
            handleLogout();
          }
        }
      } catch (error: any) {
        console.error('💥 Error fetching dashboard data:', error);
        if (error.name === 'AbortError') {
          setLoadError('Request timed out. The server might be busy.');
        } else {
          setLoadError('Connection error. Please check your internet.');
        }
      } finally {
        setLoading(false);
        setStatsLoading(false);
      }
    };

    fetchData();
  }, [agentCode]);

  const handleRequestOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsAuthenticating(true);
    setMockOtp(null);

    try {
      const res = await fetch('/api/auth/whatsapp/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp, type: 'agent' })
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
        if (data.agentCode) {
          localStorage.setItem('truscan_agent_code', data.agentCode);
          localStorage.setItem('truscan_session_token', data.sessionToken);
          setAgentCode(data.agentCode);
          setSessionToken(data.sessionToken);
        } else {
          setLoginError('No agent found for this WhatsApp number.');
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

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem('truscan_session_token');
      const res = await fetch('/api/admin/logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const logs = await res.json();
        setServerLogs(logs);
        setShowLogs(true);
      } else {
        alert('You need admin privileges to view server logs.');
      }
    } catch (err) {
      console.error('Failed to fetch logs:', err);
    }
  };

  const handleLogout = async () => {
    try {
      if (sessionToken) {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${sessionToken}` }
        });
      }
    } catch (e) {}
    localStorage.removeItem('truscan_agent_code');
    localStorage.removeItem('truscan_session_token');
    setAgentCode(null);
    setSessionToken(null);
    setStats(null);
    setReferrals([]);
    setLoading(false);
  };

  const referralLink = agentCode ? `${window.location.origin}/?agent=${agentCode}` : '';

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading && agentCode) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-6 max-w-sm text-center">
          <div className="w-16 h-16 border-4 border-brand-blue border-t-transparent rounded-full animate-spin shadow-lg shadow-brand-blue/20"></div>
          <div className="space-y-2">
            <p className="text-brand-blue font-bold text-lg">Loading Partner Portal...</p>
            <p className="text-brand-muted text-sm">Synchronizing with TruScan Systems...</p>
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

  if (loadError && agentCode) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="bg-brand-surface border border-brand-border-em p-10 rounded-[2.5rem] shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/10 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold font-display mb-2 text-red-500">Connection Error</h2>
          <div className="text-sm text-brand-muted mb-8 space-y-2">
            <p className="font-bold text-brand-text">{loadError}</p>
            {loadErrorCode && <p className="text-[10px] opacity-70 italic">Error Code: {loadErrorCode}</p>}
            {loadErrorDetails && <p className="text-xs italic">Details: {loadErrorDetails}</p>}
            <p className="text-xs opacity-60 pt-4 border-t border-brand-border/10">
              This usually means the Supabase environment variables are missing or the agent table hasn't been initialized.
            </p>
          </div>
          
          <div className="space-y-3">
            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-brand-blue text-white py-4 rounded-xl font-bold text-base hover:bg-brand-blue-light transition-all shadow-xl shadow-brand-blue/10 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Try Again
            </button>
            <button 
              onClick={fetchLogs}
              className="w-full bg-brand-surface border border-brand-border-em text-brand-text py-4 rounded-xl font-bold text-sm hover:bg-brand-border transition-all flex items-center justify-center gap-2"
            >
              <Terminal className="w-4 h-4" />
              View Server Logs
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

  if (!agentCode) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(37,99,235,0.08)_0%,transparent_60%)]"></div>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(22,163,74,0.07)_0%,transparent_55%)]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-brand-surface border border-brand-border-em p-10 rounded-[2.5rem] shadow-2xl">
            <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-brand-blue rounded-2xl flex items-center justify-center text-white">
                  <Handshake className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-lg font-bold font-display">Partner Portal</h1>
                  <p className="text-xs text-brand-muted">TruScan Systems Automation</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <div className={`w-2 h-2 rounded-full ${
                  serverStatus === 'online' ? 'bg-green-500' : 
                  serverStatus === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
                <span className="text-[8px] uppercase tracking-widest text-brand-muted font-bold">
                  {serverStatus === 'online' ? 'Online' : 
                   serverStatus === 'offline' ? 'Offline' : 'Checking'}
                </span>
              </div>
            </div>

            <h2 className="text-2xl font-bold font-display mb-2">Agent Login</h2>
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
                {!isAuthenticating && <ArrowRight className="w-5 h-5" />}
              </button>
            </form>

            <div className="mt-10 pt-8 border-t border-brand-border text-center space-y-4">
              <p className="text-xs text-brand-muted">
                Don't have a code? <a href="/#partner" className="text-brand-blue-light font-bold hover:underline">Apply to be a partner</a>
              </p>
              <a href="/" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-blue transition-all">
                <Home className="w-3 h-3" />
                Back to Website
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'leads', label: 'My Leads', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text font-sans selection:bg-brand-blue/20 flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 bg-brand-surface border-r border-brand-border flex-col sticky top-0 h-screen z-50">
        <div className="p-8 border-b border-brand-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-brand-blue rounded-xl flex items-center justify-center text-white">
              <Handshake className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-bold uppercase tracking-widest">Partner Portal</h1>
              <p className="text-[10px] text-brand-muted font-medium">TruScan Systems</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-6 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === item.id 
                  ? 'bg-brand-blue/10 text-brand-blue-light border border-brand-blue/20' 
                  : 'text-brand-muted hover:text-brand-text hover:bg-brand-surface-2'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-brand-border">
            <a 
              href="/" 
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-muted hover:text-brand-text hover:bg-brand-surface-2 transition-all"
            >
              <Home className="w-4 h-4" />
              Back to Website
            </a>
          </div>
        </nav>

        <div className="p-6 border-t border-brand-border space-y-4">
          <div className="bg-brand-bg/50 border border-brand-border p-4 rounded-2xl">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-brand-wa"></div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Agent Status</span>
            </div>
            <div className="text-xs font-bold">{agentCode}</div>
          </div>
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-brand-muted hover:text-red-500 hover:bg-red-500/5 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-brand-surface/80 backdrop-blur-xl border-b border-brand-border sticky top-0 z-[100] px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-blue rounded-lg flex items-center justify-center text-white">
            <Handshake className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest">Partner Portal</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2">
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="fixed inset-0 z-[90] bg-brand-bg md:hidden pt-20 px-6"
          >
            <nav className="space-y-4">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-4 p-5 rounded-2xl text-lg font-bold ${
                    activeTab === item.id 
                      ? 'bg-brand-blue/10 text-brand-blue-light' 
                      : 'text-brand-muted'
                  }`}
                >
                  <item.icon className="w-6 h-6" />
                  {item.label}
                </button>
              ))}
              <div className="pt-8 border-t border-brand-border">
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-4 p-5 rounded-2xl text-lg font-bold text-red-500"
                >
                  <LogOut className="w-6 h-6" />
                  Logout
                </button>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <main className="flex-1 min-h-screen overflow-y-auto">
        <div className="max-w-6xl mx-auto p-6 md:p-12">
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <h2 className="text-3xl font-bold font-display mb-2">
                {activeTab === 'overview' && 'Dashboard Overview'}
                {activeTab === 'leads' && 'Lead Management'}
                {activeTab === 'settings' && 'Account Settings'}
              </h2>
              <p className="text-brand-muted flex items-center gap-2">
                {activeTab === 'overview' && 'Monitor your performance and network growth.'}
                {activeTab === 'leads' && 'Track and manage your referred leads.'}
                {activeTab === 'settings' && 'Manage your profile and preferences.'}
                {statsLoading && <RefreshCw className="w-3 h-3 animate-spin inline ml-2" />}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a 
                href="/" 
                className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-blue transition-all bg-brand-surface px-4 py-2.5 rounded-lg border border-brand-border hover:border-brand-blue/30"
              >
                <Home className="w-3.5 h-3.5" />
                Return to Site
              </a>
            </div>
          </header>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-12"
              >
                {/* Referral Link Card */}
                <div className="bg-brand-surface border border-brand-border-em p-8 rounded-[2.5rem] shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-brand-blue-light mb-4">
                        <Zap className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Your Referral Link</span>
                      </div>
                      <p className="text-sm text-brand-muted mb-6">Share this link with potential clients. Every successful automation project earns you commission.</p>
                      <div className="flex gap-3">
                        <div className="flex-1 bg-brand-bg border border-brand-border rounded-xl px-4 py-3.5 text-sm font-mono text-brand-blue-light overflow-hidden whitespace-nowrap">
                          {referralLink}
                        </div>
                        <button 
                          onClick={copyLink}
                          className="bg-brand-blue text-white px-6 py-3.5 rounded-xl font-bold text-sm hover:bg-brand-blue-light transition-all flex items-center gap-2 shadow-lg shadow-brand-blue/10"
                        >
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                    <div className="w-px h-32 bg-brand-border hidden lg:block"></div>
                    <div className="flex items-center gap-6">
                      {stats?.qr_image_path && (
                        <div className="flex flex-col items-center gap-3">
                          <div className="bg-white p-2.5 rounded-2xl shadow-inner">
                            <img src={stats.qr_image_path} alt="Referral QR" className="w-28 h-28" />
                          </div>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = stats.qr_image_path!;
                              link.download = `truscan-qr-${agentCode}.png`;
                              link.click();
                            }}
                            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-brand-muted hover:text-brand-blue-light"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { label: 'Total Referrals', value: stats?.total_referrals || 0, icon: Users, color: 'text-brand-blue-light', bg: 'bg-brand-blue/10' },
                    { label: 'Commission Earned', value: `R ${stats?.total_earnings?.toLocaleString() || '0'}`, icon: Wallet, color: 'text-brand-wa', bg: 'bg-brand-wa/10' },
                    { label: 'Conversion Rate', value: statsLoading ? '...' : ((stats as any)?.conversionRate || '0%'), icon: TrendingUp, color: 'text-brand-text', bg: 'bg-brand-surface-2' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-brand-surface border border-brand-border p-8 rounded-3xl">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">{stat.label}</span>
                        <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="text-4xl font-black font-display">{stat.value}</div>
                    </div>
                  ))}
                </div>

                {/* Pipeline & Tier */}
                <div className="grid lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-8 bg-brand-surface border border-brand-border p-8 rounded-[2.5rem]">
                    <div className="flex items-center justify-between mb-10">
                      <div>
                        <h3 className="text-xl font-bold font-display">Lead Pipeline</h3>
                        <p className="text-xs text-brand-muted">Your leads distribution across funnel stages.</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-brand-blue"></div>
                          <span className="text-[10px] text-brand-muted font-bold uppercase">Active</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-brand-wa"></div>
                          <span className="text-[10px] text-brand-muted font-bold uppercase">Closed</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="h-[300px] w-full">
                      {!statsLoading && pipeline.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={pipeline} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                              contentStyle={{ backgroundColor: '#0A0A0A', border: '1px solid #262626', borderRadius: '16px', fontSize: '12px' }}
                              itemStyle={{ color: '#FFF', fontWeight: 'bold' }}
                            />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={40}>
                              {pipeline.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#0066FF' : '#16A34A'} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-full flex flex-col items-center justify-center text-brand-muted border border-dashed border-brand-border rounded-3xl bg-brand-bg/30">
                          <BarChart3 className="w-10 h-10 mb-4 opacity-20" />
                          <p className="text-sm font-medium">No pipeline data available.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-gradient-to-br from-brand-blue/10 to-brand-wa/10 border border-brand-blue/20 p-8 rounded-[2.5rem] flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-brand-blue-light mb-6">
                        <Zap className="w-5 h-5" />
                        <span className="text-xs font-bold uppercase tracking-widest">Commission Tier</span>
                      </div>
                      <h3 className="text-4xl font-black font-display mb-2">{stats?.commission_tier || 'Standard'}</h3>
                      <p className="text-sm text-brand-muted leading-relaxed">You are currently earning 15% on all personal automation referrals.</p>
                    </div>
                    <div className="space-y-4 mt-8">
                      <div className="p-4 bg-brand-surface/50 rounded-2xl border border-brand-border">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-brand-muted mb-1">Next Tier</div>
                        <div className="flex justify-between items-end">
                          <span className="text-sm font-bold">Premium (20%)</span>
                          <span className="text-[10px] font-bold text-brand-blue-light">3 more leads</span>
                        </div>
                        <div className="w-full h-1.5 bg-brand-bg rounded-full mt-3 overflow-hidden">
                          <div className="h-full bg-brand-blue w-[70%] rounded-full"></div>
                        </div>
                      </div>
                      <button className="w-full py-3 text-xs font-bold text-brand-blue-light flex items-center justify-center gap-2 hover:gap-3 transition-all">
                        View Tier Benefits <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'leads' && (
              <motion.div
                key="leads"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] overflow-hidden">
                  <div className="p-8 border-b border-brand-border flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                      <h3 className="text-xl font-bold font-display flex items-center gap-2">
                        <Users className="w-5 h-5 text-brand-blue-light" />
                        Referral History
                      </h3>
                      <p className="text-xs text-brand-muted mt-1">Detailed list of all your referred clients and their progress.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold hover:border-brand-blue/30 transition-all">Filter</button>
                      <button className="px-4 py-2 bg-brand-bg border border-brand-border rounded-xl text-xs font-bold hover:border-brand-blue/30 transition-all flex items-center gap-2">
                        <Download className="w-3.5 h-3.5" /> Export
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-brand-bg/30 text-[10px] font-bold uppercase tracking-widest text-brand-muted">
                          <th className="px-8 py-5">Date</th>
                          <th className="px-8 py-5">Client Name</th>
                          <th className="px-8 py-5">Industry</th>
                          <th className="px-8 py-5">Funnel Stage</th>
                          <th className="px-8 py-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-brand-border">
                        {referrals.length > 0 ? referrals.map((ref) => (
                          <tr key={ref.id} className="hover:bg-brand-bg/20 transition-colors group">
                            <td className="px-8 py-6 text-xs font-mono text-brand-muted">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-8 py-6">
                              <div className="font-bold text-sm">{ref.full_name}</div>
                            </td>
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-brand-muted" />
                                <span className="text-xs capitalize">{ref.entry_category}</span>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg ${
                                ref.funnel_stage === 'lead_captured' ? 'bg-brand-blue/10 text-brand-blue-light border border-brand-blue/20' : 
                                ref.funnel_stage === 'contacted' ? 'bg-brand-wa/10 text-brand-wa border border-brand-wa/20' : 
                                'bg-brand-muted/10 text-brand-muted border border-brand-border'
                              }`}>
                                {ref.funnel_stage.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right">
                              <button className="p-2 hover:bg-brand-surface-2 rounded-lg transition-colors text-brand-muted group-hover:text-brand-blue-light">
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        )) : (
                          <tr>
                            <td colSpan={5} className="px-8 py-20 text-center">
                              <div className="flex flex-col items-center gap-4 max-w-xs mx-auto">
                                <div className="w-16 h-16 bg-brand-surface-2 rounded-full flex items-center justify-center text-brand-muted/30">
                                  <Users className="w-8 h-8" />
                                </div>
                                <p className="text-sm text-brand-muted font-medium">No referrals found yet. Start sharing your link to earn commission!</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-2xl"
              >
                <div className="bg-brand-surface border border-brand-border rounded-[2.5rem] p-8 space-y-8">
                  <div>
                    <h3 className="text-xl font-bold font-display mb-6">Partner Profile</h3>
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Agent Code</label>
                          <div className="bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm font-mono text-brand-muted">
                            {agentCode}
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Commission Tier</label>
                          <div className="bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm font-bold text-brand-blue-light">
                            {stats?.commission_tier || 'Standard'}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted">Payout Method</label>
                        <div className="bg-brand-bg border border-brand-border rounded-xl px-4 py-3 text-sm flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Wallet className="w-4 h-4 text-brand-wa" />
                            <span className="font-medium">EFT / Bank Transfer</span>
                          </div>
                          <button className="text-[10px] font-bold uppercase tracking-widest text-brand-blue-light hover:underline">Edit</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-brand-border">
                    <h3 className="text-xl font-bold font-display mb-6">Support & Resources</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button className="flex items-center gap-4 p-4 bg-brand-bg border border-brand-border rounded-2xl hover:border-brand-blue/30 transition-all text-left">
                        <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center text-brand-blue">
                          <HelpCircle className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Help Center</div>
                          <div className="text-[10px] text-brand-muted">Guides & Tutorials</div>
                        </div>
                      </button>
                      <button className="flex items-center gap-4 p-4 bg-brand-bg border border-brand-border rounded-2xl hover:border-brand-blue/30 transition-all text-left">
                        <div className="w-10 h-10 bg-brand-wa/10 rounded-xl flex items-center justify-center text-brand-wa">
                          <PieChart className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-sm font-bold">Marketing Kit</div>
                          <div className="text-[10px] text-brand-muted">Banners & Assets</div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
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


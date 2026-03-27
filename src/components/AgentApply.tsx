import * as React from 'react';
import { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Check, 
  ArrowLeft, 
  Zap, 
  Shield, 
  Globe, 
  Users, 
  MessageSquare,
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AgentApply() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      const res = await fetch('/api/partner-apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        setFormStatus('success');
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to submit application.');
      }
    } catch (err: any) {
      console.error('Application error:', err);
      setErrorMessage(err.message || 'Something went wrong. Please try again.');
      setFormStatus('error');
    }
  };

  if (formStatus === 'success') {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-brand-surface border border-brand-border p-12 rounded-[2.5rem] text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-brand-wa/10 text-brand-wa rounded-full flex items-center justify-center mx-auto mb-8">
            <Check className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black tracking-tighter font-display mb-4">Application Received!</h2>
          <p className="text-brand-muted mb-8 leading-relaxed">
            Thank you for applying to the TruScan Partner Program. Our team will review your application and reach out via WhatsApp within 24-48 hours.
          </p>
          <Link 
            to="/" 
            className="inline-flex items-center gap-2 text-brand-blue-light font-bold hover:gap-3 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text selection:bg-brand-blue/20">
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,rgba(37,99,235,0.05)_0%,transparent_70%)]"></div>
      </div>

      <nav className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2 group">
            <span className="text-2xl font-black tracking-tighter font-display">
              <span className="text-blue-500">TRU</span>
              <span className="text-brand-wa">SCAN</span>
            </span>
            <span className="text-[10px] font-bold text-brand-muted tracking-widest uppercase">Systems</span>
          </Link>
          <Link 
            to="/" 
            className="text-xs font-bold uppercase tracking-widest text-brand-muted hover:text-brand-text transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-20 items-start">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue-light text-[10px] font-bold uppercase tracking-[0.2em] mb-8">
            <Users className="w-3 h-3" />
            Partner Program
          </div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter font-display mb-6 leading-[1.1]">
            Join the <br />
            <span className="text-brand-blue-light">Automation</span> <br />
            Revolution.
          </h1>
          <p className="text-lg text-brand-muted mb-12 leading-relaxed max-w-lg">
            TruScan partners help businesses unlock efficiency through bespoke WhatsApp automation. Earn recurring commissions for every successful referral.
          </p>

          <div className="space-y-8">
            {[
              { icon: Zap, title: "High Commissions", desc: "Earn up to 20% recurring commission on every client you refer." },
              { icon: Shield, title: "Full Support", desc: "We handle the technical build, integration, and maintenance." },
              { icon: Globe, title: "Expanding Market", desc: "South African businesses are rapidly adopting WhatsApp automation." }
            ].map((benefit, i) => (
              <div key={i} className="flex gap-6 items-start group">
                <div className="w-12 h-12 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center text-brand-blue-light group-hover:bg-brand-blue/10 transition-colors shrink-0">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold mb-1">{benefit.title}</h4>
                  <p className="text-sm text-brand-muted leading-relaxed">{benefit.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-brand-surface border border-brand-border p-10 rounded-[2.5rem] shadow-2xl relative"
        >
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-brand-blue/10 blur-2xl rounded-full" />
          
          <div className="mb-8">
            <h2 className="text-2xl font-black tracking-tighter font-display mb-2">Partner Application</h2>
            <p className="text-sm text-brand-muted">Fill out the form below to start your journey.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted ml-1">Full Name</label>
                <input 
                  required 
                  name="name" 
                  placeholder="John Doe" 
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none focus:border-brand-blue transition-all" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted ml-1">Email Address</label>
                <input 
                  required 
                  name="email" 
                  type="email" 
                  placeholder="john@example.com" 
                  className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none focus:border-brand-blue transition-all" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted ml-1">WhatsApp Number</label>
              <input 
                required 
                name="whatsapp" 
                placeholder="+27 00 000 0000" 
                className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none focus:border-brand-wa transition-all" 
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-brand-muted ml-1">Experience & Background</label>
              <textarea 
                required 
                name="experience" 
                placeholder="Tell us about your current network and why you'd like to partner with TruScan..." 
                className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none focus:border-brand-blue transition-all resize-none" 
                rows={4} 
              />
            </div>

            {formStatus === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">
                {errorMessage}
              </div>
            )}

            <button 
              type="submit" 
              disabled={formStatus === 'submitting'} 
              className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-brand-blue-light transition-all shadow-xl shadow-brand-blue/20 flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {formStatus === 'submitting' ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Submit Application
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-[10px] text-center text-brand-muted leading-relaxed">
            By submitting this application, you agree to our <button type="button" className="underline">Privacy Policy</button> and <button type="button" className="underline">Terms of Service</button>. We process all data in compliance with POPIA.
          </p>
        </motion.div>
      </main>
    </div>
  );
}

import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion'; 
import { 
  Check, 
  ArrowLeft, 
  Zap, 
  Shield, 
  Globe, 
  Users, 
  ChevronRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // Ensure this points to your Supabase client file

export default function AgentApply() {
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormStatus('submitting');
    
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData);

    try {
      // 1. DIRECT INSERT (This replaces the broken /api call)
      const { error } = await supabase
        .from('truscan_partner_applications') 
        .insert([
          { 
            name: data.name,
            email: data.email,
            whatsapp: data.whatsapp,
            experience: data.experience,
            status: 'pending'
          }
        ]);

      if (error) throw error;

      // 2. TRIGGER SUCCESS UI
      setFormStatus('success');
      
    } catch (err: any) {
      console.error('Submission error:', err);
      // This will catch RLS (permission) errors or missing column errors
      setErrorMessage(err.message || 'Submission failed. Please try again.');
      setFormStatus('error');
    }
  };

  // SUCCESS VIEW
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
          <Link to="/" className="inline-flex items-center gap-2 text-brand-blue-light font-bold hover:gap-3 transition-all">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
        </motion.div>
      </div>
    );
  }

  // FORM VIEW
  return (
    <div className="min-h-screen bg-brand-bg font-sans text-brand-text">
      <nav className="relative z-10 p-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-baseline gap-2">
            <span className="text-2xl font-black tracking-tighter font-display">
              <span className="text-blue-500">TRU</span><span className="text-brand-wa">SCAN</span>
            </span>
          </Link>
          <Link to="/" className="text-xs font-bold uppercase tracking-widest text-brand-muted flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
        </div>
      </nav>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-20 items-start">
        <div>
          <h1 className="text-5xl md:text-6xl font-black tracking-tighter font-display mb-6">
            Join the <span className="text-brand-blue-light">Automation</span> Revolution.
          </h1>
          <p className="text-lg text-brand-muted mb-12">Become a partner and earn recurring commissions.</p>
          <div className="space-y-8">
            {[
              { icon: Zap, title: "High Commissions", desc: "Earn recurring commission on every client." },
              { icon: Shield, title: "Full Support", desc: "We handle the technical build and maintenance." }
            ].map((benefit, i) => (
              <div key={i} className="flex gap-6 items-start">
                <div className="w-12 h-12 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center text-brand-blue-light">
                  <benefit.icon className="w-6 h-6" />
                </div>
                <div><h4 className="font-bold">{benefit.title}</h4><p className="text-sm text-brand-muted">{benefit.desc}</p></div>
              </div>
            ))}
          </div>
        </div>

        <motion.div className="bg-brand-surface border border-brand-border p-10 rounded-[2.5rem] shadow-2xl">
          <h2 className="text-2xl font-black tracking-tighter mb-8">Partner Application</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-6">
              <input required name="name" placeholder="Full Name" className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none" />
              <input required name="email" type="email" placeholder="Email" className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none" />
            </div>
            <input required name="whatsapp" placeholder="WhatsApp Number" className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none" />
            <textarea required name="experience" placeholder="Tell us about your background..." rows={4} className="w-full bg-brand-bg border border-brand-border rounded-2xl px-6 py-4 text-sm outline-none resize-none" />

            {formStatus === 'error' && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold">{errorMessage}</div>
            )}

            <button 
              type="submit" 
              disabled={formStatus === 'submitting'} 
              className="w-full bg-brand-blue text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:bg-brand-blue-light transition-all disabled:opacity-50"
            >
              {formStatus === 'submitting' ? "Processing..." : "Submit Application"}
            </button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}

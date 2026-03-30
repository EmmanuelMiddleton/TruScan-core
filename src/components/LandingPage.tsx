import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowRight, 
  Menu, 
  X,
  Shield,
  Globe,
  Check,
  Zap,
  MessageSquare,
  BarChart3,
  Users,
  Building2,
  Truck,
  Home as HomeIcon,
  Briefcase,
  ShoppingCart,
  ChevronRight,
  Play
} from 'lucide-react';
import AIChat from './AIChat';

// Custom WhatsApp Icon Component
const WhatsAppIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    xmlns="http://www.w3.org/2000/svg" 
    className={className}
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const LEGAL_CONTENT = {
  privacy: {
    title: "Privacy Policy",
    content: `
      <p>Last Updated: March 24, 2026</p>
      <h3>1. Introduction</h3>
      <p>TruScan Systems (Pty) Ltd ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our website and services.</p>
      <h3>2. Information We Collect</h3>
      <p>We collect information you provide directly to us, including your name, email address, WhatsApp number, and details about your business processes when you submit a request for automation.</p>
      <h3>3. How We Use Your Information</h3>
      <p>We use your information to:</p>
      <ul>
        <li>Provide and maintain our automation services.</li>
        <li>Communicate with you via WhatsApp and email regarding your requests.</li>
        <li>Improve our services and develop new features.</li>
        <li>Comply with legal obligations, including POPIA.</li>
      </ul>
      <h3>4. Data Storage and Security</h3>
      <p>Your data is stored securely using industry-standard encryption. We use Supabase for database management, which adheres to strict security protocols.</p>
      <h3>5. Your Rights</h3>
      <p>You have the right to access, correct, or delete your personal information. Please contact us at legal@truscan.co.za to exercise these rights.</p>
    `
  },
  terms: {
    title: "Terms of Service",
    content: `
      <p>Last Updated: March 24, 2026</p>
      <h3>1. Acceptance of Terms</h3>
      <p>By accessing or using TruScan Systems' services, you agree to be bound by these Terms of Service.</p>
      <h3>2. Description of Service</h3>
      <p>TruScan Systems provides bespoke workflow automation and integration services. The specific scope of work for each project will be defined in a separate agreement or scoping document.</p>
      <h3>3. User Responsibilities</h3>
      <p>You are responsible for providing accurate information and ensuring you have the necessary rights to any data or systems you ask us to integrate or automate.</p>
      <h3>4. Limitation of Liability</h3>
      <p>TruScan Systems shall not be liable for any indirect, incidental, or consequential damages arising out of the use of our services.</p>
      <h3>5. Governing Law</h3>
      <p>These terms are governed by the laws of the Republic of South Africa.</p>
    `
  },
  popia: {
    title: "POPIA Compliance",
    content: `
      <p>TruScan Systems (Pty) Ltd is fully committed to compliance with the Protection of Personal Information Act (POPIA) of South Africa.</p>
      <h3>1. Responsible Party</h3>
      <p>TruScan Systems acts as the Responsible Party for the personal information collected through this website.</p>
      <h3>2. Purpose of Processing</h3>
      <p>We process personal information solely for the purpose of delivering requested automation services and communicating system updates.</p>
      <h3>3. Information Officer</h3>
      <p>Our Information Officer ensures that your data is handled in accordance with POPIA. You can reach them at legal@truscan.co.za.</p>
      <h3>4. Data Subject Participation</h3>
      <p>In accordance with POPIA, you may request details of the personal information we hold about you and request that any incorrect information be corrected or deleted.</p>
    `
  },
  cookie: {
    title: "Cookie Policy",
    content: `
      <h3>1. What are Cookies?</h3>
      <p>Cookies are small text files stored on your device when you visit a website.</p>
      <h3>2. How We Use Cookies</h3>
      <p>We use essential cookies to ensure the website functions correctly and to analyze how users interact with our landing page (e.g., tracking referral IDs from agents).</p>
      <h3>3. Managing Cookies</h3>
      <p>Most browsers allow you to control cookies through their settings. However, disabling essential cookies may affect the functionality of the website.</p>
    `
  }
};

export default function LandingPage() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline' | 'not_configured'>('checking');

  useEffect(() => {
    fetch('/api/health/supabase')
      .then(res => res.json())
      .then(data => {
        if (data.status === 'connected') setStatus('online');
        else if (data.status === 'not_configured') setStatus('not_configured');
        else setStatus('offline');
      })
      .catch(() => setStatus('offline'));
  }, []);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'retail' | 'logistics' | 'finance' | 'realestate'>('all');
  const [legalModal, setLegalModal] = useState<{ isOpen: boolean; type: keyof typeof LEGAL_CONTENT | null }>({ isOpen: false, type: null });
  const [agentId, setAgentId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    
    const params = new URLSearchParams(window.location.search);
    const aid = params.get('agent') || params.get('ref');
    if (aid) {
      setAgentId(aid);
      fetch('/api/log-visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: aid, eventType: 'landing_page_visit' })
      }).catch(err => console.error('Error logging agent visit:', err));
    }
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen font-sans selection:bg-brand-wa/20 overflow-x-hidden bg-brand-bg text-brand-text">
      {/* Mesh Gradient Background */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_20%_0%,rgba(37,99,235,0.08)_0%,transparent_60%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_50%_40%_at_80%_100%,rgba(22,163,74,0.07)_0%,transparent_55%)]"></div>
      </div>

      {/* Navigation */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? 'bg-brand-bg/80 backdrop-blur-xl py-4 border-b border-brand-border' : 'bg-transparent py-6'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2 group cursor-pointer">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black tracking-tighter font-display">
                <span className="text-blue-500">TRU</span>
                <span className="text-brand-wa">SCAN</span>
              </span>
              <span className="text-[10px] font-bold text-brand-muted tracking-widest uppercase">Systems</span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-[13px] font-bold tracking-tight text-brand-muted">
            <a href="#who-we-serve" className="hover:text-brand-text transition-colors">Who We Serve</a>
            <a href="#services" className="hover:text-brand-text transition-colors">Services</a>
            <a href="#how-it-works" className="hover:text-brand-text transition-colors">How It Works</a>
            <a 
              href="/dashboard" 
              className="px-4 py-2 rounded-lg bg-brand-blue/10 text-brand-blue-light hover:bg-brand-blue/20 transition-all border border-brand-blue/20"
            >
              Partner Portal
            </a>
            
            <a 
              href="/admin" 
              className="bg-brand-surface text-brand-text px-5 py-2.5 rounded-xl font-black text-[11px] uppercase tracking-widest flex items-center gap-2 hover:bg-brand-surface-em transition-all border border-brand-border shadow-lg"
            >
              <Shield className="w-4 h-4 text-brand-blue" />
              Admin Portal
            </a>
          </div>

          <button className="md:hidden text-brand-text" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        <AnimatePresence>
          {isMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="md:hidden bg-brand-bg border-b border-brand-border overflow-hidden"
            >
              <div className="p-8 flex flex-col gap-6 text-base font-bold tracking-tight">
                <a href="#who-we-serve" onClick={() => setIsMenuOpen(false)} className="text-brand-muted hover:text-brand-text transition-colors">Who We Serve</a>
                <a href="#services" onClick={() => setIsMenuOpen(false)} className="text-brand-muted hover:text-brand-text transition-colors">Services</a>
                <a href="#how-it-works" onClick={() => setIsMenuOpen(false)} className="text-brand-muted hover:text-brand-text transition-colors">How It Works</a>
                <a href="#partner" onClick={() => setIsMenuOpen(false)} className="text-brand-muted hover:text-brand-text transition-colors">Partner</a>
                <a href="/dashboard" onClick={() => setIsMenuOpen(false)} className="text-brand-blue-light hover:text-brand-blue transition-colors">Partner Portal</a>
                <a 
                  href="/admin" 
                  className="bg-brand-surface text-brand-text px-6 py-4 rounded-2xl font-black text-sm uppercase tracking-widest text-center shadow-xl border border-brand-border flex items-center justify-center gap-2" 
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Shield className="w-5 h-5 text-brand-blue" />
                  Admin Portal
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center pt-20 z-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue-light text-[10px] font-bold uppercase tracking-[0.2em] mb-6">
                <Zap className="w-3 h-3" />
                Workflow Automation
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter font-display mb-6 leading-[1.1]">
                Automate Your <br />
                <span className="text-brand-blue-light">Business</span> via <br />
                <span className="text-brand-wa">WhatsApp.</span>
              </h1>
              <p className="text-lg text-brand-muted max-w-lg mb-10 leading-relaxed">
                TruScan Systems builds bespoke automation for South African enterprises. Manage operations and receive reports directly from WhatsApp.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <a 
                  href="#request" 
                  className="group w-full sm:w-auto bg-brand-blue text-white px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-blue-light transition-all flex items-center justify-center gap-3 shadow-xl shadow-brand-blue/20"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
                <a 
                  href="#services" 
                  className="w-full sm:w-auto bg-brand-surface border border-brand-border text-brand-text px-8 py-4 rounded-xl font-bold text-sm uppercase tracking-widest hover:bg-brand-surface-2 transition-all flex items-center justify-center"
                >
                  View Services
                </a>
              </div>
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="hidden lg:block relative"
            >
              <div className="relative z-10 bg-brand-surface border border-brand-border p-8 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-12 h-12 bg-brand-wa rounded-2xl flex items-center justify-center text-white">
                    <WhatsAppIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold">TruScan Bot</h4>
                    <p className="text-[10px] text-brand-muted uppercase tracking-widest font-bold">Active Now</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-brand-bg p-4 rounded-2xl rounded-tl-none border border-brand-border max-w-[80%]">
                    <p className="text-xs">Hi! I've just processed the daily logistics report for you.</p>
                  </div>
                  <div className="bg-brand-blue p-4 rounded-2xl rounded-tr-none text-white ml-auto max-w-[80%]">
                    <p className="text-xs">Great, send me the PDF summary.</p>
                  </div>
                  <div className="bg-brand-bg p-4 rounded-2xl rounded-tl-none border border-brand-border max-w-[80%]">
                    <p className="text-xs">📄 Daily_Report_March24.pdf (2.4MB)</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-blue/20 blur-3xl rounded-full" />
              <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-brand-wa/20 blur-3xl rounded-full" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Who We Serve */}
      <section id="who-we-serve" className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="mb-12 text-center md:text-left">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-display mb-4">Who We Serve</h2>
            <p className="text-brand-muted">Specialised automation for South Africa's core industries.</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Truck, title: "Logistics", desc: "Waybill tracking and driver dispatch via WhatsApp.", color: "text-blue-500" },
              { icon: HomeIcon, title: "Real Estate", desc: "Lead capture and automated tenant updates.", color: "text-brand-wa" },
              { icon: Briefcase, title: "Professional", desc: "Client onboarding and invoice automation.", color: "text-purple-500" },
              { icon: ShoppingCart, title: "E-commerce", desc: "Order tracking and cart recovery bots.", color: "text-orange-500" }
            ].map((item, i) => (
              <div key={i} className="bg-brand-surface border border-brand-border p-8 rounded-3xl hover:border-brand-blue/50 transition-all group">
                <div className={`w-12 h-12 bg-brand-bg rounded-xl flex items-center justify-center mb-6 ${item.color} group-hover:scale-110 transition-transform`}>
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                <p className="text-sm text-brand-muted leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-6 bg-[#080A0E] relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            <div className="lg:col-span-1 text-center lg:text-left">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-display mb-6">
                Our <span className="text-brand-wa">Services.</span>
              </h2>
              <p className="text-brand-muted mb-8 leading-relaxed">
                Bespoke automation tailored to your business logic and tech stack.
              </p>
              <a href="#request" className="inline-flex text-brand-blue-light font-bold items-center gap-2 hover:gap-3 transition-all">
                Request Quote <ArrowRight className="w-4 h-4" />
              </a>
            </div>

            <div className="lg:col-span-2 grid sm:grid-cols-2 gap-4">
              {[
                { title: "Legacy Integration", desc: "Connect old systems to modern APIs." },
                { title: "Data Pipelines", desc: "Automate data flow between platforms." },
                { title: "WhatsApp Bots", desc: "Custom AI assistants for your team." },
                { title: "Finance Automation", desc: "Automate invoicing and payments." }
              ].map((service, i) => (
                <div key={i} className="bg-brand-surface border border-brand-border p-6 rounded-2xl flex gap-4 hover:bg-brand-surface-2 transition-colors">
                  <div className="w-10 h-10 bg-brand-wa/10 text-brand-wa rounded-lg flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold mb-1">{service.title}</h4>
                    <p className="text-xs text-brand-muted">{service.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-display mb-4">How It Works</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", title: "Scope", desc: "We map your manual processes." },
              { step: "02", title: "Build", desc: "We build the custom integration." },
              { step: "03", title: "Deploy", desc: "Go live on WhatsApp." }
            ].map((item, i) => (
              <div key={i} className="bg-brand-surface border border-brand-border p-8 rounded-3xl text-center hover:border-brand-wa/30 transition-all">
                <div className="text-4xl font-black font-display text-brand-blue-light mb-4">{item.step}</div>
                <h4 className="text-xl font-bold mb-2">{item.title}</h4>
                <p className="text-sm text-brand-muted">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partner Section */}
      <section id="partner" className="py-20 px-6 bg-brand-blue/5 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-display mb-6">Partner with Us</h2>
          <p className="text-brand-muted mb-10">Refer businesses and earn recurring commissions.</p>
          
          <div className="flex flex-col items-center gap-6">
            <a 
              href="https://wa.me/27716856449?text=Hi%20TruScan,%20I'm%20interested%20in%20joining%20the%20Partner%20Program."
              target="_blank"
              rel="noreferrer"
              className="bg-brand-wa text-white px-10 py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-sm hover:opacity-90 transition-all shadow-xl shadow-brand-wa/20 flex items-center gap-3"
            >
              <WhatsAppIcon className="w-6 h-6" />
              Apply via WhatsApp
            </a>
            <p className="text-xs text-brand-muted max-w-sm">
              Click the button above to start your application directly on WhatsApp. Our team will guide you through the process.
            </p>
          </div>
        </div>
      </section>

      {/* Request Section */}
      <section id="request" className="py-20 px-6 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter font-display mb-6">Ready to Automate?</h2>
              <p className="text-brand-muted mb-8">Tell us about your bottleneck. We'll reach out on WhatsApp.</p>
              <div className="flex items-center justify-center lg:justify-start gap-4 text-brand-wa font-bold">
                <WhatsAppIcon className="w-6 h-6" />
                <span>+27 71 685 6449</span>
              </div>
            </div>

            <div className="bg-brand-surface border border-brand-border p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center">
              <div className="w-20 h-20 bg-brand-blue/10 text-brand-blue rounded-3xl flex items-center justify-center mb-8">
                <Zap className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-black tracking-tighter font-display mb-4">Start Your Automation</h3>
              <p className="text-brand-muted mb-10 leading-relaxed">
                Skip the forms. Chat with us directly on WhatsApp to discuss your business bottlenecks and get a custom quote.
              </p>
              <a 
                href="https://wa.me/27716856449?text=Hi%20TruScan,%20I'd%20like%20to%20automate%20my%20business%20workflow."
                target="_blank"
                rel="noreferrer"
                className="w-full bg-brand-wa text-white py-5 rounded-2xl font-black uppercase tracking-[0.2em] text-xs hover:opacity-90 transition-all shadow-xl shadow-brand-wa/20 flex items-center justify-center gap-3"
              >
                <WhatsAppIcon className="w-5 h-5" />
                Chat with an Expert
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-24 px-6 bg-[#050505] border-t border-brand-border relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-12 mb-20">
            <div className="col-span-2">
              <span className="text-2xl font-black tracking-tighter font-display mb-6 block">
                <span className="text-blue-500">TRU</span>
                <span className="text-brand-wa">SCAN</span>
              </span>
              <p className="text-brand-muted max-w-sm text-sm leading-relaxed">
                Bespoke workflow automation for South African enterprises. WhatsApp-first. POPIA compliant. Locally built.
              </p>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text mb-8">Legal</h4>
              <ul className="space-y-4 text-xs text-brand-muted">
                <li><button onClick={() => setLegalModal({ isOpen: true, type: 'privacy' })} className="hover:text-brand-wa transition-colors">Privacy Policy</button></li>
                <li><button onClick={() => setLegalModal({ isOpen: true, type: 'terms' })} className="hover:text-brand-wa transition-colors">Terms of Service</button></li>
                <li><button onClick={() => setLegalModal({ isOpen: true, type: 'popia' })} className="hover:text-brand-wa transition-colors">POPIA Compliance</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text mb-8">Contact</h4>
              <ul className="space-y-4 text-xs text-brand-muted">
                <li><a href="mailto:hello@truscan.co.za" className="hover:text-brand-wa transition-colors">hello@truscan.co.za</a></li>
                <li><a href="https://wa.me/27716856449" className="hover:text-brand-wa transition-colors">WhatsApp Support</a></li>
                <li className="pt-4 flex gap-4">
                  <a href="/admin" className="text-[9px] uppercase tracking-widest font-bold text-brand-muted-2 hover:text-brand-text">Admin</a>
                  <a href="/dashboard" className="text-[9px] uppercase tracking-widest font-bold text-brand-muted-2 hover:text-brand-text">Partner</a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-bold uppercase tracking-[0.2em] text-brand-text mb-8">System Status</h4>
              <div className="flex items-center gap-3 bg-brand-surface/50 p-3 rounded-xl border border-brand-border/30">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  status === 'online' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 
                  status === 'not_configured' ? 'bg-yellow-500 shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 
                  'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'
                }`} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-brand-muted">
                  {status === 'checking' && 'Checking...'}
                  {status === 'online' && 'Operational'}
                  {status === 'not_configured' && 'Not Configured'}
                  {status === 'offline' && 'Connection Error'}
                </span>
              </div>
              {status === 'not_configured' && (
                <p className="text-[8px] text-yellow-500/70 mt-3 italic leading-tight">
                  ⚠️ Supabase environment variables are missing. Configure them in AI Studio settings.
                </p>
              )}
            </div>
          </div>
          <div className="pt-12 border-t border-brand-border text-[10px] text-brand-muted-2 font-bold uppercase tracking-widest text-center">
            © {new Date().getFullYear()} TruScan Systems (Pty) Ltd · South Africa
          </div>
        </div>
      </footer>

      {/* Legal Modal */}
      <AnimatePresence>
        {legalModal.isOpen && legalModal.type && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLegalModal({ isOpen: false, type: null })}
              className="absolute inset-0 bg-brand-bg/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-brand-surface border border-brand-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
            >
              <div className="p-6 border-b border-brand-border flex items-center justify-between bg-brand-surface">
                <h3 className="text-xl font-bold font-display">{LEGAL_CONTENT[legalModal.type].title}</h3>
                <button 
                  onClick={() => setLegalModal({ isOpen: false, type: null })}
                  className="w-10 h-10 rounded-full hover:bg-brand-surface-2 flex items-center justify-center transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-8 overflow-y-auto prose prose-invert prose-sm max-w-none">
                <div 
                  className="legal-modal-content space-y-4 text-brand-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: LEGAL_CONTENT[legalModal.type].content }}
                />
              </div>
              <div className="p-6 border-t border-brand-border bg-brand-surface flex justify-end">
                <button 
                  onClick={() => setLegalModal({ isOpen: false, type: null })}
                  className="px-6 py-2 bg-brand-wa text-white rounded-xl font-bold text-sm hover:opacity-90 transition-all"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* AI Chat Assistant */}
      <AIChat />
    </div>
  );
}

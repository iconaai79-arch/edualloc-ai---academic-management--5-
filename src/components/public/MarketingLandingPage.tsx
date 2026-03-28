import React, { useEffect, useState } from 'react';
import { 
  Building, 
  Users, 
  Stethoscope, 
  ShoppingCart, 
  Car, 
  GraduationCap, 
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  Smartphone
} from 'lucide-react';
import './MarketingLanding.css';
import { apiService } from '../../services/apiService';
import { CompanyDetails } from '../../types';

interface ModuleProps {
  icon?: React.ReactNode;
  imageUrl?: string;
  title: string;
  description: string;
  advantages?: string[];
  link?: string;
}

const ModuleCard: React.FC<ModuleProps> = ({ icon, imageUrl, title, description, advantages, link }) => (
  <div 
    className={`module-card animate-in ${link ? 'cursor-pointer hover:border-indigo-500/50' : ''}`}
    onClick={() => {
        if (link) {
            if (link.startsWith('http')) window.open(link, '_blank');
            else window.location.hash = link;
        }
    }}
  >
    <div className="module-icon overflow-hidden">
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
      ) : (
        icon || <Zap className="w-6 h-6" />
      )}
    </div>
    <h3 className="module-title">{title}</h3>
    <p className="module-desc">{description}</p>
    {advantages && advantages.length > 0 && (
      <div className="module-advantages">
        {advantages.map((adv, i) => (
          <span key={i} className="advantage-tag">{adv}</span>
        ))}
      </div>
    )}
  </div>
);

interface MarketingLandingPageProps {
  onOpenStore?: () => void;
  onLogin?: () => void;
  onBookDemo?: () => void;
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onLogin,
  onBookDemo
}) => {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const details = await apiService.fetchCompanySettings();
        setCompanyDetails(details);
      } catch (err) {
        console.error("Landing Page: Failed to load company details", err);
      }
    };
    loadData();
  }, []);

  const staticModules = [
    {
      icon: <Building className="w-8 h-8" />,
      title: "Property Hub",
      description: "Complete real estate automation from tenant onboarding to automated rent reconciliation.",
      advantages: ["Auto-Invoicing", "Maintenance Tracking", "Tenant Portal"]
    },
    {
      icon: <Users className="w-8 h-8" />,
      title: "Coop Connect",
      description: "The digital spine for agricultural cooperatives. Manage farmers, intake, and payouts seamlessly.",
      advantages: ["Daily Intake Log", "Batch Payouts", "Farmer SMS"]
    },
    {
      icon: <Stethoscope className="w-8 h-8" />,
      title: "HealthFirst HIS",
      description: "Advanced Health Information System for clinics and hospitals with integrated pharmacy.",
      advantages: ["Patient Records", "Prescription Flow", "Pharmacy Inventory"]
    },
    {
      icon: <ShoppingCart className="w-8 h-8" />,
      title: "Retail & Agrovet",
      description: "Specialized Point of Sale and inventory systems for retail stores and agricultural shops.",
      advantages: ["Batch Tracking", "Commission Ledger", "Smart Stock"]
    },
    {
      icon: <Car className="w-8 h-8" />,
      title: "Auto Services",
      description: "Streamlined management for Car Washes and Service Centers with customer tracking.",
      advantages: ["Job Cards", "Service History", "Customer Rewards"]
    },
    {
      icon: <GraduationCap className="w-8 h-8" />,
      title: "EduAlloc Engine",
      description: "The most powerful academic management system for timetabling and student oversight.",
      advantages: ["Conflict Detection", "Library Master", "Exam Timetabling"]
    }
  ];

  const showcaseItems = companyDetails?.showcaseConfig?.items || [];
  const displayModules = showcaseItems.length > 0 
    ? showcaseItems.map(item => ({
        imageUrl: item.imageUrl,
        title: item.title,
        description: item.description,
        advantages: item.category ? [item.category] : [],
        link: item.link
      }))
    : staticModules;

  return (
    <div className="marketing-container">
      <div className="marketing-mesh"></div>
      
      <div className="marketing-content">
        {/* Navigation */}
        <nav className="marketing-section py-8 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Zap className="w-6 h-6" />
            </div>
            <span className="text-xl font-black tracking-tighter">{companyDetails?.name || 'EduAI'} <span className="text-indigo-400">OS</span></span>
          </div>
          <div className="hidden md:flex gap-8 text-[10px] font-black uppercase tracking-widest text-slate-400">
            <a href="#showcase" className="hover:text-white transition-colors">Solutions</a>
            <a href="#advantages" className="hover:text-white transition-colors">Advantages</a>
            <a href="#tutorials" className="hover:text-white transition-colors">Tutorials</a>
          </div>
          <button onClick={onLogin} className="cta-button cta-primary px-6 py-3 rounded-xl">
            {companyDetails?.showcaseConfig?.showLoginLink ? 'Sign In' : 'Get Started'}
          </button>
        </nav>
/* ... (same as before) ... */

        {/* Hero */}
        <section className="marketing-section hero-section animate-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-8">
            <ShieldCheck className="w-3 h-3" />
            V4.2.0 Enterprise Ready
          </div>
          <h1 className="hero-title">
            The Ultimate <span className="text-indigo-400">Enterprise</span> <br />
            Operating System.
          </h1>
          <p className="hero-subtitle">
            A comprehensive ecosystem of modules designed to automate every aspect of your institution—from 
            real estate and agriculture to health and education.
          </p>
          <div className="flex flex-wrap justify-center gap-6">
            <button onClick={onLogin} className="cta-button cta-primary">
              Start Free Trial
              <ArrowRight className="w-4 h-4" />
            </button>
            <button onClick={onBookDemo} className="cta-button cta-secondary">
              Book a Demo
            </button>
          </div>
        </section>

        {/* Showcase Grid */}
        <section id="showcase" className="marketing-section pb-32">
          <div className="text-center mb-20 animate-in">
            <h2 className="text-3xl font-black tracking-tighter uppercase mb-4">Powerful Industry Modules</h2>
            <p className="text-slate-400 max-width-600 mx-auto font-medium">Built for scale, designed for simplicity. Choose the modules you need and scale as you grow.</p>
          </div>
          
          <div className="showcase-grid">
            {displayModules.map((mod: any, i: number) => (
              <ModuleCard key={i} {...mod} />
            ))}
          </div>
        </section>

        {/* Advantage Stats */}
        <section id="advantages" className="marketing-section bg-slate-900/50 rounded-[4rem] border border-white/5 py-32 mb-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="animate-in">
              <div className="text-5xl font-black text-indigo-400 mb-2">99.9%</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mx-auto">Uptime Reliability</div>
            </div>
            <div className="animate-in">
              <div className="text-5xl font-black text-emerald-400 mb-2">75%</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mx-auto">Automation Rate</div>
            </div>
            <div className="animate-in">
              <div className="text-5xl font-black text-amber-400 mb-2">150+</div>
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center mx-auto">Module Integrations</div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="marketing-section py-20 border-t border-white/5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 text-center md:text-left">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <Zap className="w-6 h-6 text-indigo-500" />
                <span className="text-xl font-black tracking-tighter">EduAI <span className="text-indigo-400">OS</span></span>
              </div>
              <p className="text-slate-500 text-sm max-w-sm mb-8">
                The next generation of institucional automation. Scale your organization with data-driven insights and automated workflows.
              </p>
              <div className="flex gap-4">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Globe className="w-5 h-5 text-slate-400" /></div>
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors cursor-pointer"><Smartphone className="w-5 h-5 text-slate-400" /></div>
              </div>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Explore</h4>
              <ul className="space-y-4 text-slate-400 text-sm font-bold">
                <li className="hover:text-white transition-colors cursor-pointer">Marketplace</li>
                <li className="hover:text-white transition-colors cursor-pointer">Security</li>
                <li className="hover:text-white transition-colors cursor-pointer">API Docs</li>
              </ul>
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest mb-6">Contact</h4>
              <ul className="space-y-4 text-slate-400 text-sm font-bold">
                <li className="hover:text-white transition-colors cursor-pointer">Help Center</li>
                <li className="hover:text-white transition-colors cursor-pointer">Twitter</li>
                <li className="hover:text-white transition-colors cursor-pointer">Enterprise</li>
              </ul>
            </div>
          </div>
          <div className="mt-20 pt-10 border-t border-white/5 text-[10px] font-bold text-slate-600 text-center uppercase tracking-widest">
            © 2026 EduAI Automation. All rights reserved. Built for the future of institutions.
          </div>
        </footer>
      </div>
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { BuildingOfficeIcon as Building } from '../icons/BuildingOfficeIcon';
import { UserGroupIcon as Users } from '../icons/UserGroupIcon';
import { StethoscopeIcon as Stethoscope } from '../icons/StethoscopeIcon';
import { ShoppingCartIcon as ShoppingCart } from '../icons/ShoppingCartIcon';
import { CarIcon as Car } from '../icons/CarIcon';
import { AcademicCapIcon as GraduationCap } from '../icons/AcademicCapIcon';
import { ArrowRightIcon as ArrowRight } from '../icons/ArrowRightIcon';
import { ShieldCheckIcon as ShieldCheck } from '../icons/ShieldCheckIcon';
import { ZapIcon as Zap } from '../icons/ZapIcon';
import { GlobeAltIcon as Globe } from '../icons/GlobeAltIcon';
import { PhoneIcon as Smartphone } from '../icons/PhoneIcon';
import { TruckIcon as Truck } from '../icons/TruckIcon';
import { MegaphoneIcon as Megaphone } from '../icons/MegaphoneIcon';
import { ScaleIcon as Scale } from '../icons/ScaleIcon';
import { WrenchIcon as Wrench } from '../icons/WrenchIcon';
import { ArrowsRightLeftIcon as Logistics } from '../icons/ArrowsRightLeftIcon';
import { ShareIcon } from '../icons/ShareIcon';
import './MarketingLanding.css';
import { apiService } from '../../services/apiService';
import { CompanyDetails } from '../../types';
import { MODULES } from '../../constants';

interface ModuleProps {
  icon?: React.ReactNode;
  imageUrl?: string;
  title: string;
  description: string;
  advantages?: string[];
  link?: string;
  modId?: string;
  onLaunchSimulator?: () => void;
}

const ModuleCard: React.FC<ModuleProps> = ({ icon, imageUrl, title, description, advantages, modId, onLaunchSimulator }) => (
  <div className="module-card animate-in">
    <div className="module-image-container">
      {imageUrl ? (
        <img src={imageUrl} alt={title} className="hover-target" />
      ) : (
        <div className="p-8 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
          <Zap className="w-12 h-12" />
        </div>
      )}
      <div className="absolute top-4 right-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest">
        Active Simulator
      </div>
    </div>
    
    <div className="module-card-body">
      <div className="module-header">
        <div className="module-mini-icon">
          {icon || <Zap className="w-4 h-4" />}
        </div>
        <h3 className="module-title">{title}</h3>
      </div>
      
      <p className="module-desc">{description}</p>
      
      {advantages && advantages.length > 0 && (
        <div className="module-advantages">
          {advantages.map((adv, i) => (
            <span key={i} className="advantage-tag">{adv}</span>
          ))}
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <button 
          className="simulator-btn group flex-1"
          onClick={(e) => {
            e.stopPropagation();
            if (onLaunchSimulator) onLaunchSimulator();
          }}
        >
          <Zap className="w-4 h-4 fill-indigo-400/30 group-hover:fill-current" />
          Launch Showcase
        </button>
        <button 
          title="Share simulator link"
          className="p-3.5 bg-white/5 border border-white/10 text-slate-400 hover:text-indigo-400 hover:bg-white/10 rounded-2xl transition-all"
          onClick={(e) => {
            e.stopPropagation();
            const shareUrl = `${window.location.origin}${window.location.pathname}?showcaseModId=${modId || title.toLowerCase().replace(/\s+/g, '_')}`;
            navigator.clipboard.writeText(shareUrl);
            alert("Simulator link copied to clipboard!");
          }}
        >
          <ShareIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

interface MarketingLandingPageProps {
  onOpenStore?: () => void;
  onLogin?: () => void;
  onBookDemo?: () => void;
  onLaunchSimulator?: (role: any, modId: string) => void;
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onLogin,
  onBookDemo,
  onLaunchSimulator
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

  const getIcon = (id: string) => {
    switch (id) {
      case 'property': return <Building className="w-8 h-8" />;
      case 'coop': return <Users className="w-8 h-8" />;
      case 'his': return <Stethoscope className="w-8 h-8" />;
      case 'retail': return <ShoppingCart className="w-8 h-8" />;
      case 'autoservice': return <Car className="w-8 h-8" />;
      case 'edu': return <GraduationCap className="w-8 h-8" />;
      case 'fuel': return <Truck className="w-8 h-8" />;
      case 'campaign': return <Megaphone className="w-8 h-8" />;
      case 'legal': return <Scale className="w-8 h-8" />;
      case 'ds': return <GraduationCap className="w-8 h-8 text-amber-500" />;
      case 'civil': return <Wrench className="w-8 h-8" />;
      case 'logistics': return <Logistics className="w-8 h-8" />;
      case 'showroom': return <Car className="w-8 h-8 text-rose-500" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const showcaseItems = companyDetails?.showcaseConfig?.items || [];
  
  // Create modules from our central registry
  const platformModules = MODULES.map(m => ({
    id: m.id,
    icon: getIcon(m.id),
    imageUrl: (m as any).imageUrl,
    title: m.title,
    description: m.description,
    advantages: m.advantages,
    modId: m.id,
    onLaunchSimulator: () => onLaunchSimulator?.(m.role, m.id)
  }));

  // Create modules from custom institutional config
  const customModules = showcaseItems.map(item => ({
    id: item.id || `custom_${Date.now()}`,
    imageUrl: item.imageUrl,
    title: item.title,
    description: item.description,
    advantages: item.category ? [item.category] : [],
    link: item.link,
    onLaunchSimulator: () => onLaunchSimulator?.('admin', item.id || 'edu')
  }));

  // Merge them, prioritizing platformModules for the new auto-updating behavior
  // but keeping custom ones if they are truly unique (by title)
  const displayModules = [...platformModules];
  customModules.forEach(custom => {
     if (!displayModules.find(p => p.title.toLowerCase() === custom.title.toLowerCase())) {
        displayModules.push(custom as any);
     }
  });

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
          
          <div className="hero-visual relative mb-16 animate-in">
             <div className="absolute inset-0 bg-indigo-500/20 blur-[120px] rounded-full"></div>
             <img src="/marketing/marketing_hero_render_1776312304333.png" alt="EduAI Ecosystem" className="relative z-10 w-full max-w-4xl mx-auto rounded-[3rem] shadow-2xl border border-white/10" />
          </div>

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
          
          <div className="showcase-grid animate-in" style={{ animationDelay: '0.4s' }}>
            {displayModules.map((mod: any, i: number) => (
              <ModuleCard key={i} {...mod} />
            ))}
          </div>
        </section>

        {/* Advantage Stats */}
        <section id="advantages" className="marketing-section bg-slate-900/50 rounded-[4rem] border border-white/5 py-32 mb-32 relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500/5 blur-3xl"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center relative z-10">
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

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
import { ArrowsRightLeftIcon as Logistics } from '../icons/ArrowsRightLeftIcon';
import { ShareIcon } from '../icons/ShareIcon';
import { SmartphoneIcon as Smartphone } from '../icons/SmartphoneIcon';
import { GlobeAltIcon as Globe } from '../icons/GlobeAltIcon';
import { ShieldCheckIcon as Shield } from '../icons/ShieldCheckIcon';
import { TruckIcon as Truck } from '../icons/TruckIcon';
import { MegaphoneIcon as Megaphone } from '../icons/MegaphoneIcon';
import { ScaleIcon as Scale } from '../icons/ScaleIcon';
import { WrenchIcon as Wrench } from '../icons/WrenchIcon';
import { PalmTreeIcon as Tourism } from '../icons/PalmTreeIcon';
import { ChatBubbleBottomCenterTextIcon as Community } from '../icons/ChatBubbleBottomCenterTextIcon';
import { MagnifyingGlassIcon as Search } from '../icons/MagnifyingGlassIcon';
import { XCircleIcon as XIcon } from '../icons/XCircleIcon';
import { ChevronRightIcon as ChevronRight } from '../icons/ChevronRightIcon';
import { ChevronDownIcon as ChevronDown } from '../icons/ChevronDownIcon';
import './MarketingLanding.css';
import { apiService } from '../../services/apiService';
import { CompanyDetails } from '../../types';
import { MODULES, ModuleTutorial } from '../../constants';

import { CheckIcon } from '../icons/CheckIcon';
import { PaperAirplaneIcon } from '../icons/PaperAirplaneIcon';
import { EnvelopeIcon } from '../icons/EnvelopeIcon';

const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (e) {
    console.warn("Clipboard API write failed, using execCommand fallback", e);
  }
  try {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    textArea.style.opacity = "0";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const successful = document.execCommand("copy");
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.error("Fallback copy failed", err);
    return false;
  }
};

interface ModuleProps {
  icon?: React.ReactNode;
  imageUrl?: string;
  title: string;
  description: string;
  advantages?: string[];
  link?: string;
  modId?: string;
  isCompatible?: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
  };
  onLaunchSimulator?: () => void;
  tutorial?: any;
  onViewTutorial?: (mod: any) => void;
  onRegister?: () => void;
  onShare?: (mod: ModuleProps) => void;
}

const ModuleCard: React.FC<ModuleProps> = (props) => {
  const { icon, imageUrl, title, description, advantages, modId, onLaunchSimulator, tutorial, onViewTutorial, onRegister, onShare } = props;
  const [justCopied, setJustCopied] = useState(false);

  return (
  <div className="module-card animate-in">
    <div className="module-image-container">
      {imageUrl ? (
        <img loading="lazy"
          src={imageUrl}
          alt={title}
          className="hover-target"
          onError={(e) => {
            // Hide broken image and show fallback gradient
            const img = e.currentTarget;
            img.style.display = 'none';
            const fallback = img.nextElementSibling as HTMLElement;
            if (fallback) fallback.style.display = 'flex';
          }}
        />
      ) : null}
      <div
        className="hover-target items-center justify-center flex-col gap-3"
        style={{ display: imageUrl ? 'none' : 'flex', background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%)', borderRadius: '1.5rem', width: '100%', height: '100%', minHeight: '200px' }}
      >
        <div style={{ opacity: 0.6, transform: 'scale(2)' }}>{icon}</div>
        <div style={{ color: 'rgba(165,180,252,0.5)', fontSize: '9px', fontWeight: 900, letterSpacing: '0.2em', textTransform: 'uppercase', marginTop: '1rem' }}>{title}</div>
      </div>
      <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-[8px] font-black px-2 py-1 rounded-full uppercase tracking-widest shadow-lg shadow-emerald-500/10">
          Active Simulator
        </div>
        <div className="flex gap-1.5 p-1 bg-black/40 backdrop-blur-md rounded-lg border border-white/5">
           <span title="Mobile Optimized"><Smartphone className="w-2.5 h-2.5 text-slate-400" /></span>
           <span title="Tablet Ready"><Shield className="w-2.5 h-2.5 text-slate-400" /></span>
           <span title="Desktop Enterprise"><Globe className="w-2.5 h-2.5 text-slate-400" /></span>
        </div>
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

      {tutorial && (
        <button 
          onClick={(e) => {
             e.stopPropagation();
             if (onViewTutorial) onViewTutorial(props);
          }}
          className="text-[9px] font-black text-indigo-400/80 hover:text-indigo-300 flex items-center gap-1 uppercase tracking-tighter mb-4 transition-colors"
        >
          <ChevronDown className="w-3 h-3" /> Quick Guide Available
        </button>
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
          className="simulator-btn group flex-1 bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 hover:shadow-lg hover:shadow-emerald-500/20"
          onClick={(e) => {
            e.stopPropagation();
            if (onRegister) onRegister();
          }}
        >
          Direct Registration
        </button>
        <button 
          type="button"
          title="Share solution"
          className="p-3.5 bg-white/5 border border-white/10 text-slate-400 hover:text-indigo-400 hover:bg-white/10 active:scale-95 rounded-2xl transition-all group relative"
          onClick={async (e) => {
            e.stopPropagation();
            if (onShare) {
              onShare(props);
              return;
            }
            const shareUrl = `${window.location.origin}${window.location.pathname}?showcaseModId=${modId || title.toLowerCase().replace(/\s+/g, '_')}`;
            await copyToClipboard(shareUrl);
            setJustCopied(true);
            setTimeout(() => setJustCopied(false), 2500);

            if (navigator.share) {
              try {
                await navigator.share({
                  title: `${title} | EduAI OS`,
                  text: description,
                  url: shareUrl
                });
              } catch (err) {
                // Fallback to whatsapp
                const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}: ${description} ${shareUrl}`)}`;
                window.open(whatsappUrl, '_blank');
              }
            } else {
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${title}: ${description} ${shareUrl}`)}`;
              window.open(whatsappUrl, '_blank');
            }
          }}
        >
          {justCopied ? <CheckIcon className="w-4 h-4 text-emerald-400" /> : <ShareIcon className="w-4 h-4" />}
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-indigo-600 text-white text-[8px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap uppercase tracking-widest z-20">
            {justCopied ? 'Link Copied!' : 'Share Solution'}
          </div>
        </button>
      </div>
    </div>
  </div>
  );
};

interface MarketingLandingPageProps {
  onOpenStore?: () => void;
  onLogin?: () => void;
  onBookDemo?: () => void;
  onLaunchSimulator?: (role: any, modId: string) => void;
  onRegister?: (modId: string) => void;
}

export const MarketingLandingPage: React.FC<MarketingLandingPageProps> = ({
  onLogin,
  onBookDemo,
  onLaunchSimulator,
  onRegister
}) => {
  const [companyDetails, setCompanyDetails] = useState<CompanyDetails | null>(null);
  const [currentWidth, setCurrentWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTutorial, setActiveTutorial] = useState<any | null>(null);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [activeShareMod, setActiveShareMod] = useState<any | null>(null);
  const [modalCopied, setModalCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleResize = () => setCurrentWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    
    const loadData = async () => {
      try {
        const details = await apiService.fetchCompanySettings();
        setCompanyDetails(details);
      } catch (err) {
        console.error("Landing Page: Failed to load company details", err);
      }
    };
    loadData();

    // Check for deep-link showcaseModId parameter
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const targetModId = urlParams.get('showcaseModId');
      if (targetModId) {
        setSearchQuery(targetModId.replace(/_/g, ' '));
        setTimeout(() => {
          const el = document.getElementById('showcase');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 600);
      }
    } catch (e) {}
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleTriggerShare = (mod: any) => {
    const shareUrl = `${window.location.origin}${window.location.pathname}?showcaseModId=${mod.modId || mod.title.toLowerCase().replace(/\s+/g, '_')}`;
    copyToClipboard(shareUrl);
    setToastMessage(`✓ Link copied for ${mod.title}!`);
    setTimeout(() => setToastMessage(null), 3000);
    setActiveShareMod(mod);
  };

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
      case 'tourism': return <Tourism className="w-8 h-8 text-cyan-400" />;
      case 'community': return <Community className="w-8 h-8 text-purple-400" />;
      case 'alumni': return <Users className="w-8 h-8 text-indigo-400" />;
      case 'parent_portal': return <Users className="w-8 h-8 text-emerald-400" />;
      case 'milling':
      case 'maize_miller': return <Wrench className="w-8 h-8 text-amber-400" />;
      case 'private_security':
      case 'security':
      case 'private-security':
      case 'security_company': return <ShieldCheck className="w-8 h-8 text-rose-500" />;
      default: return <Zap className="w-8 h-8" />;
    }
  };

  const getDeviceType = () => {
    if (currentWidth < 768) return 'mobile';
    if (currentWidth < 1024) return 'tablet';
    return 'desktop';
  };

  const currentDevice = getDeviceType();

  const showcaseItems = companyDetails?.showcaseConfig?.items || [];
  
  // Create modules from our central registry
  const platformModules = MODULES.map(m => ({
    id: m.id,
    icon: getIcon(m.id),
    imageUrl: (m as any).imageUrl,
    title: m.title,
    description: m.description,
    advantages: m.advantages,
    tutorial: (m as any).tutorial,
    modId: m.id,
    onLaunchSimulator: () => onLaunchSimulator?.(m.role, m.id),
    onViewTutorial: (mod: any) => {
        setActiveTutorial(mod);
        setTutorialStep(0);
    },
    onRegister: () => onRegister?.(m.id),
    onShare: handleTriggerShare
  }));

  // Create modules from custom institutional config
  const customModules = showcaseItems.map(item => ({
    id: item.id || `custom_${Date.now()}`,
    imageUrl: item.imageUrl,
    title: item.title,
    description: item.description,
    advantages: item.category ? [item.category] : [],
    link: item.link,
    onLaunchSimulator: () => onLaunchSimulator?.('admin', item.id || 'edu'),
    onRegister: () => onRegister?.(item.id || 'edu'),
    onShare: handleTriggerShare
  }));

  // Merge them, prioritizing platformModules for the new auto-updating behavior
  // but keeping custom ones if they are truly unique (by title)
  const displayModules = [...platformModules];
  customModules.forEach(custom => {
     if (!displayModules.find(p => p.title.toLowerCase() === custom.title.toLowerCase())) {
        displayModules.push(custom as any);
     }
  });

  const filteredModules = displayModules.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m as any).category?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <div className="flex items-center gap-3">
            <a
              href="/?view=speechbuddy"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg hover:scale-105 transition-all"
            >
              <span>🗣️</span>
              <span>SpeechBuddy AI</span>
            </a>
            <button onClick={onLogin} className="cta-button cta-primary px-6 py-3 rounded-xl">
              {companyDetails?.showcaseConfig?.showLoginLink ? 'Sign In' : 'Get Started'}
            </button>
          </div>
        </nav>

        {/* 3D Asset Marquee */}
        <div className="asset-marquee-container">
           <div className="asset-marquee-track">
              {/* Double the array for infinite scroll */}
              {[...platformModules, ...platformModules].map((m, i) => (
                <div key={i} className="marquee-item">
                   <img loading="lazy" src={m.imageUrl} alt={m.title} className="marquee-asset floating-3d" />
                   <div className="marquee-label">{m.title}</div>
                   <div className="marquee-item-glow"></div>
                </div>
              ))}
           </div>
        </div>

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
             <img loading="lazy" src="/marketing/marketing_hero_render_1776312304333.png" alt="EduAI Ecosystem" className="relative z-10 w-full max-w-4xl mx-auto rounded-[3rem] shadow-2xl border border-white/10" />
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
          <div className="text-center mb-16 animate-in">
            <h2 className="text-3xl font-black tracking-tighter uppercase mb-4">Powerful Industry Modules</h2>
            <p className="text-slate-400 max-width-600 mx-auto font-medium">Built for scale, designed for simplicity. Choose the modules you need and scale as you grow.</p>
          </div>

          {/* Search Bar */}
          <div className="showcase-search-container animate-in mb-20" style={{ animationDelay: '0.2s' }}>
            <div className="search-glass-wrapper">
              <Search className="search-icon" />
              <input 
                type="text" 
                placeholder="Search modules (e.g. 'fuel', 'education', 'property')..." 
                className="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="search-badge">
                {filteredModules.length} Modules Found
              </div>
            </div>
          </div>
          
          <div className="showcase-grid animate-in" style={{ animationDelay: '0.4s' }}>
            {filteredModules.map((mod: any, i: number) => (
              <ModuleCard key={i} {...mod} />
            ))}
          </div>

          {filteredModules.length === 0 && (
            <div className="py-32 text-center animate-in">
               <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                 <Search className="w-10 h-10 text-slate-600" />
               </div>
               <h3 className="text-xl font-bold text-slate-400">No modules found matching "{searchQuery}"</h3>
               <button onClick={() => setSearchQuery('')} className="mt-4 text-indigo-400 font-bold hover:underline">Clear search</button>
            </div>
          )}
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
                <li className="hover:text-white transition-colors cursor-pointer">
                  <a href="/privacy-policy">Privacy Policy</a>
                </li>
                <li className="hover:text-white transition-colors cursor-pointer">
                  <a href="/terms">Terms of Service</a>
                </li>
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

      {/* Tutorial Overlay Modal */}
      {activeTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 animate-in">
           <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setActiveTutorial(null)}></div>
           
           <div className="relative w-full max-w-5xl bg-[#0f172a] rounded-[2.5rem] border border-white/10 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh]">
              {/* Left Side: Image/Screenshot */}
              <div className="w-full md:w-2/3 bg-slate-900/50 p-6 flex items-center justify-center relative overflow-hidden min-h-[300px]">
                 <div className="absolute inset-0 bg-indigo-500/5 blur-3xl"></div>
                 <img loading="lazy" 
                   src={activeTutorial.tutorial.steps[tutorialStep].image} 
                   alt={activeTutorial.tutorial.steps[tutorialStep].title}
                   className="relative z-10 max-w-full max-h-full rounded-2xl shadow-2xl object-contain animate-in"
                   key={tutorialStep}
                 />
                 
                 {/* Step Indicator */}
                 <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-20">
                    {activeTutorial.tutorial.steps.map((_: any, i: number) => (
                      <div 
                        key={i} 
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === tutorialStep ? 'bg-indigo-500 w-8' : 'bg-white/20'}`}
                      />
                    ))}
                 </div>
              </div>

              {/* Right Side: Content */}
              <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col border-t md:border-t-0 md:border-l border-white/10 bg-slate-900/20 backdrop-blur-md">
                 <button 
                   onClick={() => setActiveTutorial(null)}
                   className="absolute top-6 right-6 p-2 text-slate-500 hover:text-white transition-colors"
                 >
                   <XIcon className="w-6 h-6" />
                 </button>

                 <div className="mb-8">
                    <div className="text-indigo-400 text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                       {activeTutorial.title} Tutorial
                    </div>
                    <h3 className="text-2xl font-black tracking-tight mb-4">
                       {activeTutorial.tutorial.steps[tutorialStep].title}
                    </h3>
                    <p className="text-slate-400 leading-relaxed text-sm">
                       {activeTutorial.tutorial.steps[tutorialStep].description}
                    </p>
                 </div>

                 <div className="mt-auto flex gap-4">
                    <button 
                      onClick={() => setTutorialStep(prev => Math.max(0, prev - 1))}
                      disabled={tutorialStep === 0}
                      className="p-4 rounded-2xl bg-white/5 border border-white/10 text-white disabled:opacity-20 hover:bg-white/10 transition-all"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                    
                    {tutorialStep < activeTutorial.tutorial.steps.length - 1 ? (
                      <button 
                        onClick={() => setTutorialStep(prev => prev + 1)}
                        className="flex-1 p-4 rounded-2xl bg-indigo-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all"
                      >
                        Next Step <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setActiveTutorial(null);
                          onLaunchSimulator?.(activeTutorial.role, activeTutorial.modId);
                        }}
                        className="flex-1 p-4 rounded-2xl bg-emerald-600 text-white font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-3 hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20"
                      >
                        Launch App Now <Zap className="w-4 h-4" />
                      </button>
                    )}
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] bg-slate-900/90 backdrop-blur-xl border border-emerald-500/40 text-emerald-300 px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 font-bold text-xs uppercase tracking-wider animate-in">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
            <CheckIcon className="w-3.5 h-3.5" />
          </div>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Interactive Share Solution Modal */}
      {activeShareMod && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 animate-in">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={() => setActiveShareMod(null)}></div>
          <div className="relative w-full max-w-md bg-[#0f172a] rounded-[2rem] border border-white/10 shadow-2xl p-6 md:p-8 z-10 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                  <ShareIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Share Solution</h3>
                  <p className="text-[11px] text-slate-400">Invite teams or clients to explore this showcase</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setActiveShareMod(null)} 
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-all"
              >
                <XIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Solution Summary */}
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 mb-5 flex items-start gap-3.5">
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 shrink-0">
                {activeShareMod.icon || <Zap className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-black text-white truncate">{activeShareMod.title}</div>
                <div className="text-[11px] text-slate-400 line-clamp-2 mt-0.5 leading-relaxed">{activeShareMod.description}</div>
              </div>
            </div>

            {/* Direct URL Copy Field */}
            <div className="mb-5">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Direct Link</label>
              <div className="flex items-center gap-2 p-1.5 bg-black/40 border border-white/10 rounded-2xl">
                <input 
                  type="text" 
                  readOnly 
                  value={`${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`} 
                  className="flex-1 bg-transparent border-none text-xs text-slate-300 px-3 outline-none select-all font-mono"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`;
                    await copyToClipboard(url);
                    setModalCopied(true);
                    setToastMessage(`✓ Link copied for ${activeShareMod.title}!`);
                    setTimeout(() => {
                      setModalCopied(false);
                      setToastMessage(null);
                    }, 2500);
                  }}
                  className={`px-3.5 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 ${modalCopied ? 'bg-emerald-600 text-white' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                >
                  {modalCopied ? <><CheckIcon className="w-3.5 h-3.5" /> Copied!</> : 'Copy'}
                </button>
              </div>
            </div>

            {/* 1-Click Social Share Grid */}
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2.5">Share Instantly</label>
              <div className="grid grid-cols-4 gap-2">
                {/* WhatsApp */}
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`;
                    const text = `*${activeShareMod.title}* - EduAI OS Solution\n\n${activeShareMod.description}\n\nExplore here: ${url}`;
                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="p-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-[10px] font-bold"
                >
                  <span className="text-sm">💬</span>
                  <span>WhatsApp</span>
                </button>

                {/* Telegram */}
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`;
                    window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${activeShareMod.title}: ${activeShareMod.description}`)}`, '_blank');
                  }}
                  className="p-2.5 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 hover:border-sky-500/40 text-sky-400 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-[10px] font-bold"
                >
                  <PaperAirplaneIcon className="w-4 h-4 -rotate-45" />
                  <span>Telegram</span>
                </button>

                {/* Twitter / X */}
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`;
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Check out ${activeShareMod.title} on EduAI OS:`)}&url=${encodeURIComponent(url)}`, '_blank');
                  }}
                  className="p-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 text-white rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-[10px] font-bold"
                >
                  <span className="text-sm font-black">𝕏</span>
                  <span>Twitter</span>
                </button>

                {/* Email */}
                <button
                  type="button"
                  onClick={() => {
                    const url = `${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`;
                    const subject = `${activeShareMod.title} - EduAI OS Solution`;
                    const body = `Hi,\n\nI recommend checking out ${activeShareMod.title} on EduAI OS:\n\n${activeShareMod.description}\n\nExplore the interactive demo here:\n${url}\n\nBest regards,`;
                    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
                  }}
                  className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 hover:border-indigo-500/40 text-indigo-300 rounded-xl flex flex-col items-center justify-center gap-1 transition-all text-[10px] font-bold"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  <span>Email</span>
                </button>
              </div>

              {/* Native Mobile / System Share button */}
              {typeof navigator !== 'undefined' && !!(navigator as any).share && (
                <button
                  type="button"
                  onClick={async () => {
                    const url = `${window.location.origin}${window.location.pathname}?showcaseModId=${activeShareMod.modId || activeShareMod.title.toLowerCase().replace(/\s+/g, '_')}`;
                    try {
                      await navigator.share({
                        title: `${activeShareMod.title} | EduAI OS`,
                        text: activeShareMod.description,
                        url
                      });
                    } catch (e) {}
                  }}
                  className="w-full mt-3 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-300 hover:text-white flex items-center justify-center gap-2 transition-all"
                >
                  <ShareIcon className="w-3.5 h-3.5" />
                  <span>Open System Share Menu</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


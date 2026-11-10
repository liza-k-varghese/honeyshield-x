import React, { useState, useEffect } from 'react';
import { Menu, X, Clock, Award, Compass, Sun, Cpu, BookOpen, Layers } from 'lucide-react';

export type ChronosChapterTab = 'origins' | 'ancient' | 'mechanical' | 'modern' | 'philosophy';

interface HeaderProps {
  activeTab: ChronosChapterTab;
  setActiveTab: (tab: ChronosChapterTab) => void;
  onOpenSpecs: () => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, onOpenSpecs }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [timeString, setTimeString] = useState('');

  // Live Precision Atomic Clock Ticker (40ms resolution)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      const ms = String(Math.floor(now.getMilliseconds() / 10)).padStart(2, '0');
      setTimeString(`${hours}:${minutes}:${seconds}.${ms}`);
    };

    const interval = setInterval(updateTime, 40);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { id: 'origins', label: 'Origins', chapter: '00' },
    { id: 'ancient', label: 'Ancient', chapter: '01' },
    { id: 'mechanical', label: 'Mechanical', chapter: '02' },
    { id: 'modern', label: 'Modern', chapter: '03' },
    { id: 'philosophy', label: 'Philosophy', chapter: '04' },
  ] as const;

  return (
    <>
      {/* Accessibility Skip Link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-[#C8AA73] focus:text-[#0D1117] focus:px-4 focus:py-2 focus:font-cinzel focus:font-bold focus:rounded focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header role="banner" className="sticky top-0 z-40 w-full bg-[#0D1117]/95 backdrop-blur-xl border-b border-[rgba(200,170,115,0.2)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Brand Monogram */}
          <div
            onClick={() => setActiveTab('origins')}
            className="flex items-center gap-3 cursor-pointer group select-none"
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setActiveTab('origins');
              }
            }}
            aria-label="CHRONOS Homepage — Return to Chapter 00 Origins"
          >
            <div className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-full border border-[#C8AA73] flex items-center justify-center bg-[#1C2730] group-hover:border-[#E6D2B0] group-hover:shadow-[0_0_15px_rgba(200,170,115,0.35)] transition-all flex-shrink-0">
              <svg className="w-6 h-6 text-[#C8AA73]" width="24" height="24" viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <circle cx="50" cy="50" r="44" stroke="#C8AA73" strokeWidth="2.5" />
                <circle cx="50" cy="50" r="14" stroke="#C8AA73" strokeWidth="1.5" strokeDasharray="3 2" />
                <line x1="50" y1="50" x2="50" y2="24" stroke="#F0E9DD" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="50" y1="50" x2="68" y2="50" stroke="#C8AA73" strokeWidth="2" strokeLinecap="round" />
                <circle cx="50" cy="50" r="3.5" fill="#C8AA73" />
              </svg>
            </div>
            <div>
              <span className="font-cinzel text-lg sm:text-xl font-black tracking-[0.22em] text-[#F0E9DD] block group-hover:text-[#C8AA73] transition-colors">
                CHRONOS
              </span>
              <span className="text-[9px] sm:text-[10px] font-mono tracking-widest text-[#AEB8BC] block uppercase -mt-0.5">
                The Architecture of Time
              </span>
            </div>
          </div>

          {/* Desktop Editorial Navigation */}
          <nav role="navigation" aria-label="Exhibition Chapters Navigation" className="hidden lg:flex items-center gap-4 xl:gap-7">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`text-xs font-cinzel tracking-wider uppercase transition-all relative py-2 flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73] rounded px-1.5 ${
                    isActive
                      ? 'text-[#C8AA73] font-bold'
                      : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
                  }`}
                >
                  <span className="text-[9px] font-mono opacity-50 hidden xl:inline-block" aria-hidden="true">{item.chapter}</span>
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#C8AA73] rounded-full shadow-[0_0_8px_#C8AA73]" />
                  )}
                </button>
              );
            })}

            <div className="h-4 w-[1px] bg-[rgba(200,170,115,0.25)] mx-0.5 xl:mx-1" aria-hidden="true" />

            <button
              onClick={onOpenSpecs}
              className="text-xs font-cinzel tracking-wider uppercase text-[#AEB8BC] hover:text-[#C8AA73] transition-colors flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73] rounded px-1.5"
              aria-label="Open Technical Calibre Dossier"
            >
              <Award className="w-3.5 h-3.5 text-[#C8AA73]" aria-hidden="true" />
              <span>Dossier</span>
            </button>
          </nav>

          {/* Right Precision Time Ticker */}
          <div
            className="hidden sm:flex items-center gap-2.5 bg-[#1C2730] px-3.5 py-1.5 rounded border border-[rgba(200,170,115,0.24)]"
            title="Live Precision Atomic Oscillator Ticker (UTC)"
            aria-label={`Current atomic time: ${timeString}`}
          >
            <Clock className="w-3.5 h-3.5 text-[#C8AA73] animate-spin" style={{ animationDuration: '12s' }} aria-hidden="true" />
            <span className="text-xs font-mono tracking-wider text-[#F0E9DD]">
              {timeString}
            </span>
          </div>

          {/* Mobile / Tablet Menu Button */}
          <div className="lg:hidden flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-[#F0E9DD] hover:text-[#C8AA73] transition-colors rounded min-w-[44px] min-h-[44px] flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C8AA73]"
              aria-expanded={isMobileMenuOpen}
              aria-label="Toggle Exhibition Chapters Menu"
            >
              {isMobileMenuOpen ? <X className="w-6 h-6" aria-hidden="true" /> : <Menu className="w-6 h-6" aria-hidden="true" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Drawer */}
        {isMobileMenuOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
            className="lg:hidden bg-[#0D1117] border-b border-[rgba(200,170,115,0.25)] px-6 py-4 space-y-2.5 animate-fadeIn"
          >
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#C8AA73] pb-1 border-b border-[rgba(200,170,115,0.15)]">
              Exhibition Chapters
            </div>
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between w-full text-left py-2.5 text-xs font-cinzel tracking-wider uppercase transition-colors min-h-[44px] ${
                  activeTab === item.id ? 'text-[#C8AA73] font-bold' : 'text-[#AEB8BC] hover:text-[#F0E9DD]'
                }`}
              >
                <span>{item.label}</span>
                <span className="text-[10px] font-mono text-[#AEB8BC]/60">CH. {item.chapter}</span>
              </button>
            ))}
            <div className="pt-2 border-t border-[rgba(200,170,115,0.15)] flex items-center justify-between">
              <button
                onClick={() => {
                  onOpenSpecs();
                  setIsMobileMenuOpen(false);
                }}
                className="text-xs font-cinzel tracking-wider uppercase text-[#C8AA73] flex items-center gap-1.5 min-h-[44px]"
              >
                <Award className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Technical Dossier</span>
              </button>
              <span className="text-xs font-mono text-[#F0E9DD]">{timeString}</span>
            </div>
          </div>
        )}
      </header>
    </>
  );
};

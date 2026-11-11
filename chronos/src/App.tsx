import React, { useState, useEffect } from 'react';
import { Header, ChronosChapterTab } from './components/Header';
import { Footer } from './components/Footer';
import { OriginsHero } from './components/OriginsHero';
import { AncientSection } from './components/AncientSection';
import { MechanicalSection } from './components/MechanicalSection';
import { ModernPrecisionSection } from './components/ModernPrecisionSection';
import { PhilosophyChapter } from './components/PhilosophyChapter';
import { SpecificationsModal } from './components/SpecificationsModal';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { WatchConfig } from './three/WatchModel';
import { ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';

const CHAPTER_SEQUENCE: { id: ChronosChapterTab; title: string; num: string }[] = [
  { id: 'origins', title: '00 Origins & Celestial Cycles', num: '00' },
  { id: 'ancient', title: '01 Ancient Shadow Measurement', num: '01' },
  { id: 'mechanical', title: '02 Mechanical Tourbillon Escapement', num: '02' },
  { id: 'modern', title: '03 Modern Atomic Precision', num: '03' },
  { id: 'philosophy', title: '04 Philosophy & Relativistic Time', num: '04' },
];

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ChronosChapterTab>('origins');
  const [isSpecsOpen, setIsSpecsOpen] = useState(false);

  // Master Watch Configuration State for 3D Scenes
  const [watchConfig, setWatchConfig] = useState<WatchConfig>({
    caseFinish: 'gold',
    dialStyle: 'skeleton',
    strapStyle: 'alligator',
    tourbillonSpeed: 1,
    explodedRatio: 0,
    isTicking: true,
  });

  const handleConfigChange = (newConfig: Partial<WatchConfig>) => {
    setWatchConfig((prev) => ({ ...prev, ...newConfig }));
  };

  const currentIdx = CHAPTER_SEQUENCE.findIndex((c) => c.id === activeTab);
  const prevChapter = currentIdx > 0 ? CHAPTER_SEQUENCE[currentIdx - 1] : null;
  const nextChapter = currentIdx < CHAPTER_SEQUENCE.length - 1 ? CHAPTER_SEQUENCE[currentIdx + 1] : null;

  // Keyboard Navigation: Left / Right arrows to switch chapters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is focusing an input slider or typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowRight' && nextChapter) {
        setActiveTab(nextChapter.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (e.key === 'ArrowLeft' && prevChapter) {
        setActiveTab(prevChapter.id);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextChapter, prevChapter]);

  const navigateToChapter = (chapter: ChronosChapterTab) => {
    setActiveTab(chapter);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0D1117] text-[#F0E9DD] selection:bg-[#C8AA73]/30 selection:text-[#F0E9DD]">
      {/* Editorial Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={navigateToChapter}
        onOpenSpecs={() => setIsSpecsOpen(true)}
      />

      {/* Main Exhibition Stage */}
      <main id="main-content" tabIndex={-1} className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-12 outline-none">
        <ErrorBoundary fallbackTitle="Exhibition Stage Interrupted">
          {activeTab === 'origins' && (
            <OriginsHero
              watchConfig={watchConfig}
              onConfigChange={handleConfigChange}
              onOpenSpecs={() => setIsSpecsOpen(true)}
              onSelectChapter={navigateToChapter}
            />
          )}

          {activeTab === 'ancient' && (
            <AncientSection />
          )}

          {activeTab === 'mechanical' && (
            <MechanicalSection
              watchConfig={watchConfig}
              onConfigChange={handleConfigChange}
              onOpenSpecs={() => setIsSpecsOpen(true)}
            />
          )}

          {activeTab === 'modern' && (
            <ModernPrecisionSection />
          )}

          {activeTab === 'philosophy' && (
            <PhilosophyChapter />
          )}
        </ErrorBoundary>

        {/* Narrative Chapter Breadcrumb & Progression Navigation */}
        <nav aria-label="Chapter Progression Navigation" className="pt-8 border-t border-[rgba(200,170,115,0.2)] flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-xs">
          <div>
            {prevChapter ? (
              <button
                onClick={() => navigateToChapter(prevChapter.id)}
                className="btn-wireframe !py-2.5 !px-4 hover:border-[#C8AA73] transition-all flex items-center gap-2"
                aria-label={`Navigate to previous chapter: ${prevChapter.title}`}
              >
                <ChevronLeft className="w-4 h-4 text-[#C8AA73]" aria-hidden="true" />
                <span className="text-[#AEB8BC]">Previous:</span>
                <span className="text-[#F0E9DD] font-semibold">{prevChapter.title}</span>
              </button>
            ) : (
              <span className="text-[11px] text-[#AEB8BC]/50 uppercase tracking-widest">
                • Inception of Exhibition •
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 text-[11px] text-[#AEB8BC]">
            <span>Chapter</span>
            <span className="text-[#C8AA73] font-bold">{CHAPTER_SEQUENCE[currentIdx].num}</span>
            <span>of 04</span>
          </div>

          <div>
            {nextChapter ? (
              <button
                onClick={() => navigateToChapter(nextChapter.id)}
                className="btn-wireframe !py-2.5 !px-4 hover:border-[#C8AA73] transition-all flex items-center gap-2"
                aria-label={`Navigate to next chapter: ${nextChapter.title}`}
              >
                <span className="text-[#AEB8BC]">Next:</span>
                <span className="text-[#F0E9DD] font-semibold">{nextChapter.title}</span>
                <ChevronRight className="w-4 h-4 text-[#C8AA73]" aria-hidden="true" />
              </button>
            ) : (
              <button
                onClick={() => navigateToChapter('origins')}
                className="btn-wireframe !py-2.5 !px-4 hover:border-[#C8AA73] transition-all flex items-center gap-2"
                aria-label="Return to beginning of exhibition"
              >
                <span className="text-[#C8AA73] font-semibold">Return to Prologue</span>
                <ArrowRight className="w-4 h-4 text-[#C8AA73]" aria-hidden="true" />
              </button>
            )}
          </div>
        </nav>
      </main>

      {/* Specifications Dossier Modal */}
      <SpecificationsModal
        isOpen={isSpecsOpen}
        onClose={() => setIsSpecsOpen(false)}
      />

      {/* Cultural & Horological Colophon Footer */}
      <Footer />
    </div>
  );
};

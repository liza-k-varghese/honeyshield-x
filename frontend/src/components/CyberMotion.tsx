import React, { useEffect, useRef, useState, useCallback } from 'react';
import './CyberMotion.css';

/* --------------------------------------------------------------------------
   Accessibility Helper: Detect Prefers Reduced Motion
   -------------------------------------------------------------------------- */
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const listener = (event: MediaQueryListEvent) => setPrefersReduced(event.matches);
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return prefersReduced;
}

/* ==========================================================================
   1. Reveal Component
   Staggered animated section entrances with direction and delay
   ========================================================================== */
export interface RevealProps {
  children: React.ReactNode;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  delay?: number; // milliseconds
  duration?: number; // milliseconds
  distance?: number; // pixels
  className?: string;
  triggerOnce?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 600,
  distance = 28,
  className = '',
  triggerOnce = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      setIsVisible(true);
      return;
    }

    const node = elementRef.current;
    if (!node) return;

    // Use IntersectionObserver if available
    if (typeof IntersectionObserver !== 'undefined') {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setIsVisible(true);
              if (triggerOnce) {
                observer.unobserve(entry.target);
              }
            } else if (!triggerOnce) {
              setIsVisible(false);
            }
          });
        },
        { threshold: 0.1, rootMargin: '0px 0px -40px 0px' }
      );

      observer.observe(node);
      return () => observer.disconnect();
    } else {
      // Fallback
      setIsVisible(true);
    }
  }, [prefersReduced, triggerOnce]);

  const style: React.CSSProperties = {
    transitionDuration: `${duration}ms`,
    transitionDelay: `${delay}ms`,
  };

  if (!prefersReduced && distance !== 28) {
    if (direction === 'up') style.transform = isVisible ? 'none' : `translate3d(0, ${distance}px, 0)`;
    if (direction === 'down') style.transform = isVisible ? 'none' : `translate3d(0, -${distance}px, 0)`;
    if (direction === 'left') style.transform = isVisible ? 'none' : `translate3d(${distance}px, 0, 0)`;
    if (direction === 'right') style.transform = isVisible ? 'none' : `translate3d(-${distance}px, 0, 0)`;
  }

  return (
    <div
      ref={elementRef}
      style={style}
      className={`hsx-reveal-init hsx-reveal-${direction} ${
        isVisible ? 'hsx-reveal-visible' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
};

/* ==========================================================================
   2. TiltCard Component
   Restrained 3D hover lighting and subtle perspective tilt
   ========================================================================== */
export interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // degrees, default 8
  perspective?: number; // pixels, default 1000
  glare?: boolean;
  glareColor?: string;
  onClick?: () => void;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  maxTilt = 8,
  perspective = 1000,
  glare = true,
  onClick,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const prefersReduced = usePrefersReducedMotion();

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (prefersReduced) return;
      const card = cardRef.current;
      if (!card) return;

      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Restrained tilt calculation
      const rotateX = -((y - centerY) / centerY) * maxTilt;
      const rotateY = ((x - centerX) / centerX) * maxTilt;

      // Normalized coordinates for glare highlight (percentage)
      const pctX = Math.round((x / rect.width) * 100);
      const pctY = Math.round((y / rect.height) * 100);

      setMousePos({ x: pctX, y: pctY });
      setTransform(`perspective(${perspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateZ(6px)`);
    },
    [maxTilt, perspective, prefersReduced]
  );

  const handleMouseLeave = useCallback(() => {
    setTransform(`perspective(${perspective}px) rotateX(0deg) rotateY(0deg) translateZ(0px)`);
    setMousePos({ x: 50, y: 50 });
  }, [perspective]);

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        prefersReduced
          ? undefined
          : ({
              transform,
              '--mouse-x': `${mousePos.x}%`,
              '--mouse-y': `${mousePos.y}%`,
            } as React.CSSProperties)
      }
      className={`cyber-tilt-card ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {glare && !prefersReduced && <div className="cyber-tilt-glare" />}
      {children}
    </div>
  );
};

/* ==========================================================================
   3. ScrollProgress Component
   Subtle glowing progress indicator without scroll hijacking
   ========================================================================== */
export interface ScrollProgressProps {
  className?: string;
}

export const ScrollProgress: React.FC<ScrollProgressProps> = ({ className = '' }) => {
  const [scrollPercentage, setScrollPercentage] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (totalHeight <= 0) {
        setScrollPercentage(0);
        return;
      }
      const currentScroll = window.scrollY;
      const percentage = Math.min(100, Math.max(0, (currentScroll / totalHeight) * 100));
      setScrollPercentage(percentage);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`hsx-scroll-progress-bar ${className}`}
      style={{ width: `${scrollPercentage}%` }}
      role="progressbar"
      aria-valuenow={Math.round(scrollPercentage)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page reading progress"
    />
  );
};

/* ==========================================================================
   4. CurtainTransition Component
   Cinematic split curtain reveal for smooth navigation transitions
   ========================================================================== */
export interface CurtainTransitionProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number; // ms, default 380ms
}

export const CurtainTransition: React.FC<CurtainTransitionProps> = ({
  isActive,
  onComplete,
  duration = 380,
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const prefersReduced = usePrefersReducedMotion();

  useEffect(() => {
    if (prefersReduced) {
      if (isActive && onComplete) {
        onComplete();
      }
      return;
    }

    if (isActive) {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        if (onComplete) onComplete();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isActive, duration, onComplete, prefersReduced]);

  if (prefersReduced || (!isActive && !isAnimating)) {
    return null;
  }

  return (
    <div className={`hsx-curtain-overlay ${isAnimating ? 'hsx-curtain-active' : ''}`}>
      <div className="hsx-curtain-panel hsx-curtain-top" />
      <div className="hsx-curtain-panel hsx-curtain-bottom" />
    </div>
  );
};

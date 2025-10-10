import React, { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

const ScrollProgressIndicator = () => {
  const [scrollPercentage, setScrollPercentage] = useState(0);
  const animationFrameId = useRef<number | null>(null);

  const calculateScrollPercentage = useCallback(() => {
    const { scrollTop, scrollHeight, clientHeight } = document.documentElement;
    const totalScrollableHeight = scrollHeight - clientHeight;
    if (totalScrollableHeight > 0) {
      const percentage = (scrollTop / totalScrollableHeight) * 100;
      setScrollPercentage(Math.min(100, Math.max(0, percentage))); // Clamp between 0 and 100
    } else {
      setScrollPercentage(0); // No scrollable content
    }
  }, []);

  useEffect(() => {
    const handleScrollEvent = () => {
      if (animationFrameId.current === null) {
        animationFrameId.current = requestAnimationFrame(() => {
          calculateScrollPercentage();
          animationFrameId.current = null; // Reset for the next frame
        });
      }
    };

    window.addEventListener('scroll', handleScrollEvent, { passive: true });

    // Initial calculation
    calculateScrollPercentage();

    return () => {
      window.removeEventListener('scroll', handleScrollEvent);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [calculateScrollPercentage]);

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {/* Progress Bar */}
      <div
        className="h-1 bg-mint-green shadow-lg transition-all duration-100 ease-out"
        style={{ width: `${scrollPercentage}%` }}
      />
      {/* Numerical Counter */}
      <div className="absolute top-1 right-2 text-xs font-mono text-muted-foreground bg-background/70 px-1 rounded-sm">
        {Math.round(scrollPercentage)}%
      </div>
    </div>
  );
};

export default ScrollProgressIndicator;
import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface FadeInScrollCardProps {
  children: React.ReactNode;
  delay?: number; // Delay in milliseconds before the animation starts
  className?: string; // Additional classes for the wrapper div
}

const FadeInScrollCard = ({ children, delay = 0, className }: FadeInScrollCardProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Optionally, unobserve after it becomes visible if you only want it to animate once
          if (ref.current) {
            observer.unobserve(ref.current);
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: '0px',
        threshold: 0.1, // Trigger when 10% of the item is visible
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "transition-opacity duration-700 ease-out",
        isVisible ? "opacity-100" : "opacity-0",
        className
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
};

export default FadeInScrollCard;
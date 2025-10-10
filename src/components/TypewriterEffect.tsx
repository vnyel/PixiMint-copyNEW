import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils'; // Assuming cn utility is available

interface TypewriterEffectProps {
  text: string;
  delay?: number; // Delay between characters in ms
  className?: string; // Tailwind classes for the text
  once?: boolean; // If true, animation plays only once
}

const TypewriterEffect = ({ text, delay = 50, className, once = true }: TypewriterEffectProps) => {
  const [displayedText, setDisplayedText] = useState('');
  const [hasAnimated, setHasAnimated] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && (!once || !hasAnimated)) {
          let i = 0;
          setDisplayedText(''); // Reset text before starting
          const typingInterval = setInterval(() => {
            setDisplayedText((prev) => prev + text.charAt(i));
            i++;
            if (i === text.length) {
              clearInterval(typingInterval);
              setHasAnimated(true);
            }
          }, delay);
          return () => clearInterval(typingInterval);
        }
      },
      { threshold: 0.5 } // Trigger when 50% of the component is visible
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [text, delay, once, hasAnimated]); // Re-run effect if text, delay, once, or hasAnimated changes

  return (
    <span ref={ref} className={cn("inline-block", className)}>
      {displayedText}
    </span>
  );
};

export default TypewriterEffect;
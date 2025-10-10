import React, { useEffect } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
  duration?: number; // Duration in milliseconds
}

const SplashScreen = ({ onComplete, duration = 2000 }: SplashScreenProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, duration);

    return () => clearTimeout(timer);
  }, [onComplete, duration]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-[9999] transition-opacity duration-500 ease-out">
      <img src="/favicon.png" alt="App Logo" className="h-20 w-20 animate-pulse" />
    </div>
  );
};

export default SplashScreen;
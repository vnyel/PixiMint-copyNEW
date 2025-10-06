import React, { useState, useEffect } from 'react';

const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      className="fixed z-[9999] pointer-events-none rounded-full bg-mint-green w-4 h-4 -translate-x-1/2 -translate-y-1/2 shadow-lg shadow-primary/50 transition-transform duration-75 ease-out"
      style={{ left: position.x, top: position.y }}
    />
  );
};

export default CustomCursor;
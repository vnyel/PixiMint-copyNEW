import React from 'react';

const BackgroundShapes = () => {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Subtle glowing circles */}
      <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      <div className="absolute bottom-1/4 left-1/3 w-56 h-56 bg-green-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>

      {/* More structured, sharp elements */}
      <div className="absolute top-1/10 left-1/10 w-24 h-24 border-2 border-primary opacity-10 animate-spin-slow"></div>
      <div className="absolute bottom-1/5 right-1/10 w-32 h-32 border-2 border-accent opacity-10 animate-spin-reverse-slow"></div>
      <div className="absolute top-1/3 right-1/5 w-20 h-20 border-2 border-muted opacity-10 animate-spin-slow animation-delay-3000"></div>
    </div>
  );
};

export default BackgroundShapes;
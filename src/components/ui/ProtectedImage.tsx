import React from 'react';

interface ProtectedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  containerClassName?: string;
  watermarkText?: string;
}

const ProtectedImage: React.FC<ProtectedImageProps> = ({ 
  src, 
  alt, 
  className = '', 
  containerClassName = '',
  watermarkText = 'KALE GROUP',
  ...props 
}) => {
  return (
    <div className={`relative group select-none w-full h-full ${containerClassName}`} style={{ WebkitUserSelect: 'none' }}>
      {/* Base Image */}
      <img 
        src={src} 
        alt={alt} 
        className={`${className} block pointer-events-none`} 
        {...props} 
      />

      {/* Centered Watermark - Large but very subtle */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <span 
          className="text-white/10 font-serif font-black uppercase tracking-[0.5em] select-none text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-center leading-none"
          style={{ 
            transform: 'rotate(-30deg)',
            textShadow: '0 0 40px rgba(0,0,0,0.1)'
          }}
        >
          {watermarkText}
        </span>
      </div>

      {/* Security Overlay - Blocks right-click and drag-and-drop */}
      <div 
        className="absolute inset-0 z-10 bg-transparent cursor-default"
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
    </div>
  );
};

export default ProtectedImage;

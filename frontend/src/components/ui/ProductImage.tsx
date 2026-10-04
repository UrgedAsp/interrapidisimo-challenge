import React, { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface ProductImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  className?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  src,
  alt,
  className = '',
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  if (hasError || !src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`aspect-square flex flex-col items-center justify-center bg-tertiary/15 text-tertiary rounded-[var(--radius-card)] ${className}`}
      >
        <ImageOff size={32} aria-hidden="true" />
        <span className="text-xs mt-1 text-primary/60">Sin imagen</span>
      </div>
    );
  }

  return (
    <div className={`aspect-square overflow-hidden bg-neutral rounded-[var(--radius-card)] ${className}`}>
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setHasError(true)}
        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
        {...props}
      />
    </div>
  );
};

/**
 * Image optimization utilities
 * Handles lazy loading, progressive loading, and WebP conversion
 */

import * as React from 'react';

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  placeholder?: string;
  threshold?: number;
  rootMargin?: string;
}

/**
 * Lazy-loaded image component with progressive loading
 */
export function LazyImage({
  src,
  alt,
  placeholder = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f0f0f0" width="400" height="300"/%3E%3C/svg%3E',
  threshold = 0.1,
  rootMargin = '50px',
  className,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = React.useState(placeholder);
  const [imageRef, setImageRef] = React.useState<HTMLImageElement | null>(null);
  const [isLoaded, setIsLoaded] = React.useState(false);

  React.useEffect(() => {
    if (!imageRef) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold,
        rootMargin,
      }
    );

    observer.observe(imageRef);

    return () => {
      if (imageRef) {
        observer.unobserve(imageRef);
      }
    };
  }, [imageRef, src, threshold, rootMargin]);

  return (
    <img
      ref={setImageRef}
      src={imageSrc}
      alt={alt}
      className={`transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'} ${className || ''}`}
      onLoad={() => setIsLoaded(true)}
      loading="lazy"
      {...props}
    />
  );
}

/**
 * Get optimized image URL with WebP support
 */
export function getOptimizedImageUrl(
  url: string,
  width?: number,
  height?: number,
  quality: number = 80
): string {
  if (!url) return '';

  // Check if browser supports WebP
  const supportsWebP = checkWebPSupport();
  
  // If using a CDN or image optimization service, add parameters
  // This is a placeholder - adjust based on your image service
  const params = new URLSearchParams();
  
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  if (quality) params.append('q', quality.toString());
  if (supportsWebP) params.append('format', 'webp');
  
  const separator = url.includes('?') ? '&' : '?';
  const queryString = params.toString();
  
  return queryString ? `${url}${separator}${queryString}` : url;
}

/**
 * Check WebP support
 */
let webpSupported: boolean | null = null;

export function checkWebPSupport(): boolean {
  if (webpSupported !== null) return webpSupported;

  const canvas = document.createElement('canvas');
  if (canvas.getContext && canvas.getContext('2d')) {
    canvas.width = 1;
    canvas.height = 1;
    webpSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  } else {
    webpSupported = false;
  }

  return webpSupported;
}

/**
 * Preload images
 */
export function preloadImages(urls: string[]): Promise<void[]> {
  return Promise.all(
    urls.map((url) => {
      return new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = reject;
        img.src = url;
      });
    })
  );
}

/**
 * Generate responsive image srcset
 */
export function generateSrcSet(baseUrl: string, widths: number[]): string {
  return widths
    .map((width) => {
      const url = getOptimizedImageUrl(baseUrl, width);
      return `${url} ${width}w`;
    })
    .join(', ');
}

/**
 * Get blurhash placeholder (if using blurhash library)
 */
export function getBlurhashPlaceholder(
  hash: string,
  width: number = 32,
  height: number = 32
): string {
  // This would require the blurhash library
  // For now, return a simple gray placeholder
  return `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}"%3E%3Crect fill="%23f0f0f0" width="${width}" height="${height}"/%3E%3C/svg%3E`;
}

/**
 * Progressive image component with blur-up effect
 */
interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholder: string;
  alt: string;
}

export function ProgressiveImage({
  src,
  placeholder,
  alt,
  className,
  ...props
}: ProgressiveImageProps) {
  const [currentSrc, setCurrentSrc] = React.useState(placeholder);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const img = new Image();
    img.src = src;
    img.onload = () => {
      setCurrentSrc(src);
      setLoading(false);
    };
  }, [src]);

  return (
    <div className="relative overflow-hidden">
      <img
        src={currentSrc}
        alt={alt}
        className={`transition-all duration-500 ${
          loading ? 'blur-sm scale-110' : 'blur-0 scale-100'
        } ${className || ''}`}
        {...props}
      />
    </div>
  );
}

/**
 * Responsive image component
 */
interface ResponsiveImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'srcSet' | 'sizes'> {
  src: string;
  alt: string;
  widths?: number[];
  sizes?: string;
}

export function ResponsiveImage({
  src,
  alt,
  widths = [320, 640, 768, 1024, 1280, 1536],
  sizes = '100vw',
  className,
  ...props
}: ResponsiveImageProps) {
  const srcSet = generateSrcSet(src, widths);

  return (
    <img
      src={src}
      srcSet={srcSet}
      sizes={sizes}
      alt={alt}
      loading="lazy"
      className={className}
      {...props}
    />
  );
}

/**
 * Decode image before rendering (for critical images)
 */
export async function decodeImage(src: string): Promise<HTMLImageElement> {
  const img = new Image();
  img.src = src;

  if (img.decode) {
    await img.decode();
  } else {
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });
  }

  return img;
}

/**
 * Get image dimensions
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = (error) => reject(error);
    img.src = src;
  });
}

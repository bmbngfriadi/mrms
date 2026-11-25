import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

export default function RoomPhotoCarousel({
  photos = [],
  imageUrl = '',
  alt = 'Foto Ruang Meeting',
  className = '',
  aspectRatio = 'aspect-video',
  autoPlayInterval = 3500,
}) {
  // Normalize photos list
  const validPhotos = (
    Array.isArray(photos) && photos.length > 0
      ? photos
      : [imageUrl].filter(Boolean)
  ).filter((url) => typeof url === 'string' && url.trim().length > 0);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const timerRef = useRef(null);

  // Auto-play effect
  useEffect(() => {
    if (validPhotos.length <= 1 || isHovered) return;

    timerRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % validPhotos.length);
    }, autoPlayInterval);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [validPhotos.length, isHovered, autoPlayInterval]);

  const handlePrev = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev - 1 + validPhotos.length) % validPhotos.length);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setCurrentIndex((prev) => (prev + 1) % validPhotos.length);
  };

  if (validPhotos.length === 0) {
    return (
      <div
        className={`w-full ${aspectRatio} bg-slate-100 dark:bg-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 ${className}`}
      >
        <ImageIcon size={32} />
        <span className="text-[11px] font-medium mt-1">Belum ada foto</span>
      </div>
    );
  }

  return (
    <div
      className={`relative w-full ${aspectRatio} rounded-2xl overflow-hidden bg-slate-900 group select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={() => setIsHovered(true)}
      onTouchEnd={() => setIsHovered(false)}
    >
      {/* Sliding Images Container */}
      <div className="relative w-full h-full overflow-hidden">
        {validPhotos.map((photo, idx) => {
          const isActive = idx === currentIndex;
          return (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-700 ease-in-out ${
                isActive ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'
              }`}
            >
              <img
                src={photo}
                alt={`${alt} - Foto ${idx + 1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading={idx === 0 ? 'eager' : 'lazy'}
              />
            </div>
          );
        })}
      </div>

      {/* Subtle Bottom Gradient for Indicator Readability */}
      <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent pointer-events-none z-10" />

      {/* Navigation Arrows (Visible on hover or mobile) */}
      {validPhotos.length > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition shadow-sm cursor-pointer"
            aria-label="Foto Sebelumnya"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={handleNext}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 z-20 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-xs text-white flex items-center justify-center opacity-85 group-hover:opacity-100 transition shadow-sm cursor-pointer"
            aria-label="Foto Selanjutnya"
          >
            <ChevronRight size={18} />
          </button>
        </>
      )}

      {/* Photo Counter Badge (Top Right) */}
      {validPhotos.length > 1 && (
        <div className="absolute top-2.5 right-2.5 z-20 px-2 py-0.5 rounded-full bg-black/50 backdrop-blur-xs text-white text-[10px] font-bold tracking-wider">
          {currentIndex + 1} / {validPhotos.length}
        </div>
      )}

      {/* Bottom Dot Indicators */}
      {validPhotos.length > 1 && (
        <div className="absolute bottom-2.5 inset-x-0 z-20 flex items-center justify-center gap-1.5">
          {validPhotos.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                setCurrentIndex(idx);
              }}
              className={`transition-all duration-300 rounded-full cursor-pointer ${
                idx === currentIndex
                  ? 'w-5 h-1.5 bg-white shadow-xs'
                  : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
              }`}
              aria-label={`Ke foto ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}


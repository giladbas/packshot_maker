'use client';

import { useEffect } from 'react';

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
  onDownload: () => void;
}

export function ImageModal({ imageUrl, onClose, onDownload }: ImageModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in"
      onClick={onClose}
    >
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={(e) => { e.stopPropagation(); onDownload(); }}
          className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg text-sm font-medium transition-colors"
        >
          Download
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-bg-tertiary hover:bg-border text-fg-primary rounded-lg text-sm font-medium transition-colors"
        >
          Close
        </button>
      </div>
      <img
        src={imageUrl}
        alt="Generated image"
        className="max-w-full max-h-full object-contain p-4"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

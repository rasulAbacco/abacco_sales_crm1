import React, { useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export default function ImageViewer({ images, currentIndex, onClose, onNext, onPrev }) {
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") onNext();
      if (e.key === "ArrowLeft") onPrev();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose, onNext, onPrev]);

  if (!images || images.length === 0) return null;

  const current = images[currentIndex];

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center">
      {/* Top Bar */}
      <div className="w-full flex justify-between items-center px-6 py-4 bg-black/30 backdrop-blur-md">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-white text-sm font-semibold hover:text-red-400 transition"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <p className="text-gray-300 text-sm truncate max-w-xs">
          {current.filename}
        </p>
        <span className="text-gray-400 text-xs">
          {currentIndex + 1}/{images.length}
        </span>
      </div>

      {/* Image Display */}
      <div className="flex-1 flex items-center justify-center relative w-full px-6">
        <button
          onClick={onPrev}
          className="absolute left-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
        >
          <ChevronLeft className="w-6 h-6 text-white" />
        </button>

        <img
          src={current.url}
          alt={current.filename}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-lg"
        />

        <button
          onClick={onNext}
          className="absolute right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition"
        >
          <ChevronRight className="w-6 h-6 text-white" />
        </button>
      </div>

      {/* Close Button (Bottom) */}
      <div className="pb-6">
        <button
          onClick={onClose}
          className="px-6 py-2 bg-white/20 text-white font-semibold rounded-xl hover:bg-white/30 transition"
        >
          Close
        </button>
      </div>
    </div>
  );
}

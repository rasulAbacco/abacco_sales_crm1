import React, { useState } from "react";
import { Rnd } from "react-rnd";
import { X, Maximize2, Minimize2, GripVertical } from "lucide-react";

export default function FloatingEditWindow({ children, onClose }) {
  const [isMaximized, setIsMaximized] = useState(false);

  const toggleMaximize = () => {
    setIsMaximized(!isMaximized);
  };

  return (
    <div className="fixed inset-0 z-[9998] pointer-events-none">
      {/* 🧩 Transparent background — visible inbox */}
      <div className="absolute inset-0 bg-transparent pointer-events-none"></div>

      <Rnd
        default={{
          x: window.innerWidth / 2 - 350,
          y: 100,
          width: 700,
          height: 600,
        }}
        bounds="window"
        dragHandleClassName="drag-handle"
        minWidth={500}
        minHeight={400}
        size={
          isMaximized
            ? {
                width: window.innerWidth - 40,
                height: window.innerHeight - 100,
              }
            : undefined
        }
        position={isMaximized ? { x: 20, y: 20 } : undefined}
        className="pointer-events-auto bg-white/90 border border-gray-200 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-0"
      >
        {/* Header */}
        <div className="drag-handle flex justify-between items-center p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white rounded-t-2xl cursor-move">
          <div className="flex items-center gap-3">
            <GripVertical className="w-5 h-5 opacity-70" />
            <h3 className="text-lg font-semibold">Edit Lead</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleMaximize}
              className="p-1.5 hover:bg-white/20 rounded-full transition-all"
              title={isMaximized ? "Minimize" : "Maximize"}
            >
              {isMaximized ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-white/20 rounded-full transition-all"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto h-[calc(100%-76px)] bg-white">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 rounded-xl pointer-events-none"></div>
            <div className="relative">{children}</div>
          </div>
        </div>

        {/* Bottom gradient bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 opacity-80"></div>
      </Rnd>
    </div>
  );
}

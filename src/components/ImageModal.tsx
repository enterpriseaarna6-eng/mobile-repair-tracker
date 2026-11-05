'use client';

import React from 'react';
import { X, ExternalLink } from 'lucide-react';

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  title: string;
  onClose: () => void;
}

export function ImageModal({ isOpen, imageUrl, title, onClose }: ImageModalProps) {
  if (!isOpen || !imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative max-w-4xl w-full bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          <div className="flex items-center gap-2">
            <a
              href={imageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md text-xs inline-flex items-center gap-1"
              title="Open full size in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-md"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 bg-slate-950 flex items-center justify-center min-h-[300px] max-h-[75vh]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={title}
            className="max-w-full max-h-[70vh] object-contain rounded shadow"
          />
        </div>

        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
          <span>Batch verification image</span>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-white border border-slate-300 text-slate-700 font-medium rounded hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}


import React from 'react';
import cemindoLogo from '../assets/logo-cemindo.png';

export default function CemindoRhinoBadge({ size = 56, className = '' }) {
  return (
    <div
      className={`rounded-2xl p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-center overflow-hidden inline-flex ${className}`}
      style={{ width: size, height: size }}
    >
      <img
        src={cemindoLogo}
        alt="Semen Merah Putih - PT Cemindo Gemilang Tbk"
        className="w-full h-full object-contain"
        loading="eager"
      />
    </div>
  );
}

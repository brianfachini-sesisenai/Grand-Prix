import React from 'react';

/**
 * FollowCameraButton — Botão-pílula reutilizável para controlar
 * o modo "Câmera Inteligente" (Follow Mode) em qualquer perfil.
 * 
 * Props:
 *   followMode: boolean — se o follow está ativo
 *   onToggle: () => void — callback para alternar o estado
 */
const FollowCameraButton = ({ followMode, onToggle }) => (
   <button 
      onClick={onToggle}
      className={`fixed bottom-8 left-6 z-[9999] flex items-center space-x-2 px-4 py-2.5 rounded-full shadow-lg backdrop-blur-md border transition-all duration-300 transform hover:scale-105 active:scale-95 ${
         followMode 
           ? 'bg-indigo-500/90 border-indigo-400 text-white shadow-indigo-500/30' 
           : 'bg-white/80 dark:bg-slate-800/80 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 shadow-slate-200/50'
      }`}
      title={followMode ? 'Desativar seguimento automático' : 'Ativar seguimento automático'}
   >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         {followMode 
            ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
            : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"></path>
         }
      </svg>
      <span className="text-xs font-bold uppercase tracking-wider">
         {followMode ? 'Seguindo' : 'Livre'}
      </span>
   </button>
);

export default FollowCameraButton;

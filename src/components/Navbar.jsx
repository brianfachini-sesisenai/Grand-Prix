import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const Navbar = () => {
  const { currentUser, logout } = useAuth();
  const { theme, setTheme, toggleTheme, isDarkMode } = useTheme();
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();

  if (location.pathname === '/') return null;

  const handleLogout = () => {
     logout();
     setIsDropdownOpen(false);
     navigate('/');
  };

  return (
    <>
      <nav className="fixed top-0 left-0 w-full z-50 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-md transition-colors duration-300">
        <div className="w-full px-6">
          <div className="flex items-center justify-between h-16">
            
            {/* Esquerda: Logo (flex-1 colado à esquerda) */}
            <div className="flex-1 flex justify-start items-center space-x-2">
              <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center font-black text-amber-400 shadow-lg">V</div>
              <span className="font-bold text-xl tracking-wide text-slate-800 dark:text-white transition-colors duration-300">TMPM</span>
            </div>
            
            {/* Centro: Navegação (flex-1 centralizado matematicamente) */}
            <div className="flex-1 flex justify-center space-x-1 sm:space-x-4">
              <NavLink to="/operador" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                Operador
              </NavLink>
              <NavLink to="/motorista" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                Motorista
              </NavLink>
              <NavLink to="/gestor" className={({isActive}) => `px-3 py-2 rounded-md text-sm font-bold transition-colors ${isActive ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}>
                Gestor
              </NavLink>
              
              <div className="w-[1px] h-5 bg-slate-300 dark:bg-slate-700 hidden sm:block self-center mx-1"></div>
              
              <NavLink to="/metricas" className={({isActive}) => `px-3 py-2 rounded-md text-xs font-bold transition-all flex items-center ${isActive ? 'text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20' : 'text-slate-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}>
                 <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                 Métricas
              </NavLink>
            </div>

            {/* Direita: Ferramentas e Perfil (flex-1 colado à direita) */}
            <div className="flex-1 flex justify-end items-center space-x-4 relative">
              
              <div className="flex items-center space-x-3">
                 {/* Theme Toggle (Sun/Moon) */}
                 <button onClick={toggleTheme} className="text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition" title="Alternar Tema Rápido">
                    {isDarkMode ? (
                       <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z" clipRule="evenodd"></path></svg>
                    ) : (
                       <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z"></path></svg>
                    )}
                 </button>
                 
                 <div className="w-[1px] h-6 bg-slate-300 dark:bg-slate-700 mx-2 transition-colors duration-300"></div>
              </div>

              {/* User Profile Avatar */}
              <div className="relative flex-shrink-0 flex items-center">
                <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className="w-10 h-10 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-inner">
                   <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                </button>

                {isDropdownOpen && (
                   <>
                     <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                     <div className="absolute right-0 top-12 mt-2 w-72 bg-white dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl py-4 z-50 animate-[fade-in_0.2s_ease-out]">
                        <div className="px-4 pb-3 border-b border-slate-200 dark:border-slate-700 flex flex-col items-center">
                           <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 mb-3 border-2 border-slate-300 dark:border-slate-600 shadow-inner">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                           </div>
                           <h3 className="text-slate-800 dark:text-white font-bold text-lg text-center tracking-tight">{currentUser?.nome || 'Usuário Desconhecido'}</h3>
                           
                           <span className={`text-xs font-bold px-2 py-1 rounded mt-2 
                              ${currentUser?.perfil === 'Gestor' ? 'bg-emerald-100 dark:bg-emerald-600/20 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-600/50' : 
                                currentUser?.perfil === 'Operador' ? 'bg-blue-100 dark:bg-blue-600/20 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-600/50' : 
                                currentUser?.perfil === 'Motorista' ? 'bg-orange-100 dark:bg-orange-600/20 text-orange-700 dark:text-orange-400 border border-orange-300 dark:border-orange-600/50' : 
                                'bg-gray-100 dark:bg-gray-600/20 text-gray-700 dark:text-gray-400 border border-gray-300 dark:border-gray-600/50'} uppercase tracking-widest`}>
                              {currentUser?.perfil || 'Sem Perfil'}
                           </span>
                        </div>
                        
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
                           <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">Matrícula</span>
                              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{currentUser?.matricula || '-'}</span>
                           </div>
                           <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded">
                              <span className="text-[10px] text-slate-500 font-bold uppercase">CPF</span>
                              <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{currentUser?.cpf || '-'}</span>
                           </div>
                        </div>

                        <div className="px-4 pt-3">
                           <button onClick={handleLogout} className="w-full bg-red-100 dark:bg-red-600/20 hover:bg-red-500 dark:hover:bg-red-600 border border-red-300 dark:border-red-600/50 hover:border-red-500 text-red-600 dark:text-red-500 hover:text-white dark:hover:text-white font-bold py-2 rounded transition-all text-sm flex justify-center items-center shadow-sm">
                              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                              SAIR / LOGOUT
                           </button>
                        </div>
                     </div>
                   </>
                )}
              </div>

            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Navbar;

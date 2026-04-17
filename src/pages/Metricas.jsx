import React from 'react';
import MapComponent from '../components/MapComponent';
import { useGraph } from '../context/GraphContext';

const Metricas = () => {
  const { vehicles, activeOrder, isMoving, edgeStatuses, auditLogs } = useGraph();

  // Cálculos Mock & Reais
  const frotaTotal = vehicles.length || 0;
  // Veículos em serviço
  const veiculosEmServico = activeOrder && isMoving ? 1 : 0; 
  const taxaOcupacao = frotaTotal > 0 ? Math.round((veiculosEmServico / frotaTotal) * 100) : 0;
  
  const incidentesAtivos = Object.keys(edgeStatuses).length;

  const getStatusColor = (status) => {
     switch(status) {
        case 'ruim': return 'bg-orange-500';
        case 'congestionado': return 'bg-yellow-500';
        case 'interditado': return 'bg-red-500';
        case 'manutencao': return 'bg-purple-500';
        default: return 'bg-slate-500';
     }
  };

  return (
    <div className="h-full relative w-full pt-16 bg-slate-50 dark:bg-slate-900 flex flex-col transition-colors">
      
      {/* Topo 50%: Mapa Gêmeo Digital (Visualização Dinâmica) */}
      <div className="h-1/2 w-full relative border-b border-slate-200 dark:border-slate-800 shadow-inner z-0">
         <MapComponent />
         <div className="absolute top-6 left-6 z-[400] pointer-events-none">
            <span className="bg-slate-900/80 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest py-1.5 px-3 rounded-md shadow-2xl border border-slate-700">🌍 Visão Global</span>
         </div>
      </div>

      {/* Base 50%: Dashboard de Métricas C-Level */}
      <div 
        className="h-1/2 w-full p-8 overflow-y-auto relative z-10 bg-slate-50/50 dark:bg-slate-900/50 [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
         <div className="max-w-7xl mx-auto h-full flex flex-col">
            <div className="flex justify-between items-end mb-6 shrink-0">
               <div>
                  <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tight flex items-center">
                     <svg className="w-8 h-8 mr-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"></path></svg>
                     Kpis & Inteligência Organizacional
                  </h1>
                  <p className="text-sm font-bold text-slate-500 dark:text-gray-400 mt-1 uppercase tracking-widest">Monitoramento Diretor</p>
               </div>
               <div className="text-right">
                  <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Motor de Simulação</div>
                  <div className="flex items-center justify-end space-x-2 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                     <span className="relative flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                     </span>
                     <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Live Sync</span>
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 grow shrink overflow-y-auto">
               {/* Card 1 */}
               <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Ocupação de Frota</h3>
                  <div className="flex items-baseline space-x-2">
                     <span className="text-5xl font-black text-slate-800 dark:text-white tracking-tighter">{taxaOcupacao}%</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Engajada</span>
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 font-bold">{veiculosEmServico} de {frotaTotal} caminhões em rota</div>
                  <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-3 mt-5 overflow-hidden shadow-inner border border-slate-200 dark:border-slate-600">
                     <div className={`h-3 rounded-full transition-all duration-1000 ease-out ${taxaOcupacao > 0 ? 'bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-transparent'}`} style={{ width: `${taxaOcupacao}%` }}></div>
                  </div>
               </div>

               {/* Card 2 */}
               <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between">
                  <div>
                     <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Cycle Time Realtime</h3>
                     <div className="flex items-baseline space-x-2">
                        <span className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-indigo-500 to-purple-600 tracking-tighter">18.5</span>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Min</span>
                     </div>
                  </div>
                  <div className="mt-6 flex space-x-1.5 h-8 items-end group">
                     {/* Barras de mock dinâmico em CSS puro */}
                     {[40, 60, 30, 80, 50, 90, 70].map((h, i) => (
                        <div key={i} className="w-full bg-indigo-100 dark:bg-indigo-900/30 rounded-t-sm group-hover:bg-indigo-200 dark:group-hover:bg-indigo-800/50 transition-colors relative flex items-end">
                           <div className="w-full bg-indigo-500 dark:bg-indigo-400 rounded-t-sm animate-pulse" style={{ height: `${h}%`, animationDelay: `${i * 150}ms` }}></div>
                        </div>
                     ))}
                  </div>
               </div>

               {/* Card 3 */}
               <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-4">Saúde da Malha Viária</h3>
                  <div className="flex items-baseline space-x-2">
                     <span className="text-5xl font-black text-rose-500 dark:text-rose-400 tracking-tighter">{incidentesAtivos}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Gargalos</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-5">
                     {Object.entries(edgeStatuses).slice(0, 3).map(([edgeId, status]) => (
                        <span key={edgeId} className={`text-[9px] uppercase font-black px-2.5 py-1 rounded-md text-white shadow-sm ${getStatusColor(status)}`}>
                           {status}
                        </span>
                     ))}
                     {incidentesAtivos === 0 && <span className="text-[10px] uppercase font-black text-emerald-600 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/40 rounded-md border border-emerald-200 dark:border-emerald-800">Caminho Livre</span>}
                  </div>
               </div>

               {/* Card 4 */}
               <div className="bg-white/80 dark:bg-slate-800/60 backdrop-blur-md p-6 rounded-3xl shadow-lg border border-slate-200 dark:border-slate-700/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <h3 className="text-slate-500 dark:text-slate-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center justify-between">
                     Auditoria de Fluxo
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  </h3>
                   <div className="space-y-4 h-full pr-1 overflow-hidden">
                     {auditLogs.length > 0 ? auditLogs.slice(0, 4).map(log => (
                        <div key={log.id} className="flex flex-col border-l-2 border-indigo-200 dark:border-indigo-500/30 pl-3">
                           <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{log.timestamp}</span>
                           <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate mt-0.5">{log.msg}</span>
                        </div>
                     )) : (
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-widest p-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl">Sem logs recentes</div>
                     )}
                   </div>
               </div>
            </div>
         </div>
      </div>

    </div>
  );
};

export default Metricas;

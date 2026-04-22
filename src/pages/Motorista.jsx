import React from 'react';
import MapComponent from '../components/MapComponent';
import FollowCameraButton from '../components/FollowCameraButton';
import { useGraph } from '../context/GraphContext';
import { useAuth } from '../context/AuthContext';

const Motorista = () => {
  const { 
    nodes, 
    activeOrder, 
    isMoving, 
    setIsMoving, 
    currentSpeed, 
    eta, 
    activePath, 
    distanceToNext, 
    nextWaypointLabel,
    vehicles,
    driverStatuses,
    updateDriverStatus,
    uTurnStatus,
    noPathAlert
  } = useGraph();
  
  const [isHudCollapsed, setIsHudCollapsed] = React.useState(false);
  const [followMode, setFollowMode] = React.useState(true);
  
  const { currentUser } = useAuth();
  
  const isActive = Boolean(activeOrder && activeOrder.origem && activeOrder.destino && activeOrder.assignedToUserId === currentUser?.matricula);
  const routeStart = activeOrder?.origem;
  const routeEnd = activeOrder?.destino;

  const myVehicle = vehicles.find(v => v.motoristaAtribuidoId === currentUser?.matricula);

  if (!myVehicle) {
     return (
       <div className="w-full min-h-[calc(100vh-64px)] flex-1 flex flex-col items-center justify-center bg-slate-900/95 z-50 text-white mt-16 relative">
          <svg className="w-16 h-16 text-slate-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          <h2 className="text-2xl font-bold mb-2">Acesso Restrito</h2>
          <p className="text-slate-400 max-w-sm text-center">Aguardando atribuição de veículo pela central. Você precisa de uma Frota designada para receber viagens.</p>
       </div>
     );
  }

  const myStatus = driverStatuses[currentUser?.matricula] || 'disponivel';

  return (
    <div className="absolute inset-0 flex bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
       
       <div className="absolute top-20 right-4 z-[1000] bg-white dark:bg-slate-900 p-2 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 flex flex-col items-center">
           <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-gray-400 mb-2 px-1">Seu Status Operacional</span>
           <div className="flex space-x-1">
               <button onClick={() => updateDriverStatus(currentUser.matricula, 'disponivel')} className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${myStatus === 'disponivel' ? 'bg-green-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>🟢 Disponível</button>
               <button onClick={() => updateDriverStatus(currentUser.matricula, 'pausa')} className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${myStatus === 'pausa' ? 'bg-yellow-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>🟡 Pausa</button>
               <button onClick={() => updateDriverStatus(currentUser.matricula, 'offline')} className={`px-2 py-1.5 rounded text-xs font-bold transition-all ${myStatus === 'offline' ? 'bg-red-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>🔴 Offline</button>
           </div>
       </div>

        {/* Toast de U-Turn (Alerta Vermelho) */}
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[10000] bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transition-all duration-500 max-w-sm ${uTurnStatus === 'warning' ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
           <div className="bg-white/20 p-2 rounded-full">
              <svg className="w-6 h-6 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
           </div>
           <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-0.5 text-red-100">⚠️ Alerta da Central</h4>
              <p className="text-xs font-medium leading-snug">Via bloqueada à frente. Retornando ao ponto seguro para recalcular rota.</p>
           </div>
        </div>

        {/* Toast de Rota Normalizada (Feedback Sucesso Verde) */}
        <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[10000] bg-emerald-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center space-x-3 transition-all duration-500 max-w-sm ${uTurnStatus === 'success' ? 'translate-y-0 opacity-100' : '-translate-y-20 opacity-0 pointer-events-none'}`}>
           <div className="bg-white/20 p-2 rounded-full">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
           </div>
           <div>
              <h4 className="font-bold text-sm uppercase tracking-wider mb-0.5 text-emerald-100">✅ Rota Normalizada</h4>
              <p className="text-xs font-medium leading-snug">Via liberada! Retomando trajeto original.</p>
           </div>
        </div>

        {/* Toast de Veículo Isolado (NoPath) */}
        <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-[10000] bg-slate-900 text-white px-8 py-5 rounded-2xl shadow-[0_0_40px_rgba(239,68,68,0.4)] flex items-center space-x-4 border-2 border-red-500 transition-all duration-700 ${noPathAlert ? 'scale-100 opacity-100 animate-bounce' : 'scale-90 opacity-0 pointer-events-none'}`}>
           <div className="bg-red-500 p-3 rounded-full shadow-lg shadow-red-500/50">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
           </div>
           <div>
              <h4 className="font-black text-lg uppercase tracking-tighter text-red-500 leading-none mb-1">Veículo Isolado</h4>
              <p className="text-sm font-bold text-slate-300 leading-tight">Rota inexistente para o destino. Aguarde liberação de vias pela central.</p>
           </div>
        </div>

       {isActive ? (
                    <div className={`absolute top-16 left-1/2 transform -translate-x-1/2 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-b-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center transition-all duration-500 ease-in-out w-[350px]`}>
            <div className={`w-full flex justify-between items-center ${isHudCollapsed ? 'mb-2' : 'mb-4'}`}>
               {!isHudCollapsed && <div className="flex-1"></div>}
               <h2 className={`text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest text-center transition-all duration-300 whitespace-nowrap ${isHudCollapsed ? 'text-[10px] w-full' : 'flex-1'}`}>
                  {isHudCollapsed ? 'HUD' : 'HUD do Caminhão'}
               </h2>
               <div className="flex-1 flex justify-end">
                  <button onClick={() => setIsHudCollapsed(!isHudCollapsed)} className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg transition-colors text-slate-500" title={isHudCollapsed ? "Expandir HUD" : "Recolher HUD"}>
                     <svg className={`w-4 h-4 transform transition-transform duration-300 ${isHudCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path></svg>
                  </button>
               </div>
            </div>
            
            <div className={`w-full flex flex-col items-center transition-all duration-300 origin-top overflow-hidden ${isHudCollapsed ? 'max-h-0 opacity-0 mb-0' : 'max-h-[500px] opacity-100 mb-6'}`}>
               <div className="flex w-full justify-between items-center bg-slate-50 dark:bg-slate-800 p-4 rounded-xl mb-6 shadow-sm dark:shadow-inner border border-slate-200 dark:border-slate-700 transition-colors">
                 <div className="flex flex-col items-center w-1/3">
                   <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Origem</span>
                   <span className="font-bold text-sm text-center text-slate-800 dark:text-gray-200">{nodes[routeStart]?.label || 'Start'}</span>
                 </div>
                 
                 <div className="flex flex-col items-center flex-1 justify-center relative h-full">
                   <div className="w-full h-px bg-slate-300 dark:bg-slate-600 block absolute"></div>
                   <svg className="w-6 h-6 text-indigo-500 relative bg-slate-50 dark:bg-slate-800 px-1 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                 </div>

                 <div className="flex flex-col items-center w-1/3">
                   <span className="text-[10px] uppercase text-slate-500 font-bold mb-1">Destino</span>
                   <span className="font-bold text-sm text-center text-green-600 dark:text-green-400">{nodes[routeEnd]?.label || 'End'}</span>
                 </div>
               </div>
               
               <div className="w-full bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 transition-colors text-left flex flex-col space-y-1">
                  <p className="text-xs text-slate-600 dark:text-gray-300"><strong className="text-slate-800 dark:text-white uppercase">🙋 Solicitado por:</strong> {activeOrder?.solicitadoPor || 'Centro de Comando'}</p>
                  <p className="text-xs text-slate-600 dark:text-gray-300"><strong className="text-slate-800 dark:text-white uppercase">📋 Motivo / Obs:</strong> {activeOrder?.motivo || 'Nenhuma observação informada.'}</p>
               </div>

               {/* Painel do Dijkstra de Segurança */}
               {activePath.length > 0 && (
                  <p className="text-xs text-center text-slate-500 dark:text-slate-400 mb-2 px-2 leading-relaxed">
                    Algoritmo ativo: {activePath.length} Waypoints calculado restantes. Atualizando Rota na central...
                  </p>
               )}
            </div>

            <button 
              onClick={() => setIsMoving(!isMoving)} 
              className={`w-full py-3 px-6 rounded-xl font-bold shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 text-sm uppercase tracking-wide
               ${isMoving 
                 ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/30' 
                 : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30'}
               ${isHudCollapsed ? 'py-1.5 px-3 text-[10px]' : ''}`}
            >
              {isMoving ? (isHudCollapsed ? 'Pausar' : 'Pausar Viagem') : (distanceToNext > 0 || currentSpeed > 0 ? 'Continuar' : 'Começar')}
            </button>
         </div>
       ) : (
           <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col items-center min-w-[340px] transition-colors duration-300">
             {myStatus === 'disponivel' ? (
                <>
                  <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6 shadow-inner border border-slate-200 dark:border-slate-700 animate-pulse">
                    <span className="text-3xl">📡</span>
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-1 text-center">Aguardando chamados de campo...</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 text-center max-w-xs leading-relaxed mb-4">Seu veículo ({myVehicle.modelo}) no momento encontra-se disponível. Fique atento às ordens vindas da Base de Operadores.</p>
                </>
             ) : myStatus === 'pausa' ? (
                <>
                  <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-yellow-200 dark:border-yellow-700">
                    <span className="text-3xl">☕</span>
                  </div>
                  <p className="text-sm font-bold text-yellow-700 dark:text-yellow-400 uppercase tracking-widest mb-1 text-center">Em horário de pausa.</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 text-center max-w-xs leading-relaxed mb-4">Nenhum chamado será recebido enquanto estiver neste regime. Bom descanso!</p>
                </>
             ) : (
                <>
                  <div className="w-16 h-16 bg-red-100 dark:bg-red-900/50 rounded-full flex items-center justify-center mb-6 shadow-inner border border-red-200 dark:border-red-700">
                    <span className="text-3xl">🔴</span>
                  </div>
                  <p className="text-sm font-bold text-red-700 dark:text-red-400 uppercase tracking-widest mb-1 text-center">Turno encerrado.</p>
                  <p className="text-xs text-slate-500 dark:text-gray-400 text-center max-w-xs leading-relaxed mb-4">Sistema offline. Retorne ao painel quando iniciar sua próxima jornada!</p>
                </>
             )}
           </div>
       )}

       {/* Waze-style GPS Panel */}
       {isActive && isMoving && distanceToNext > 0 && (
         <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-[9999] bg-emerald-500 dark:bg-emerald-600 px-8 py-4 rounded-3xl shadow-2xl flex items-center space-x-4 border-b-4 border-emerald-700 transition-colors duration-300">
            <svg className="w-10 h-10 text-white font-bold" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18"></path></svg>
            <div className="flex flex-col">
              <span className="text-emerald-50 font-bold text-xs uppercase tracking-wider mb-0.5 opacity-90">Siga para {nextWaypointLabel}</span>
              <span className="text-white font-extrabold text-3xl tracking-tight leading-none mb-1">a {distanceToNext} metros</span>
              {eta && (
                 <span className="text-emerald-100 font-bold text-xs">Chegada em: {eta}</span>
              )}
            </div>
         </div>
       )}

       {/* Velocímetro Circular Flutuante */}
       {isActive && isMoving && (
          <div className="fixed bottom-8 left-1/2 transform translate-x-32 ml-[6rem] z-[9999] w-20 h-20 rounded-full border-4 border-slate-200 dark:border-emerald-500 bg-white dark:bg-slate-900 shadow-[0_0_20px_rgba(16,185,129,0.4)] flex flex-col justify-center items-center transition-colors">
             <span className="text-2xl font-black text-slate-800 dark:text-white leading-none">{currentSpeed}</span>
             <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mt-0.5">km/h</span>
          </div>
       )}

       {/* Botão da Câmera Inteligente (Componente Reutilizável) */}
       {isActive && (
          <FollowCameraButton followMode={followMode} onToggle={() => setFollowMode(!followMode)} />
       )}

       <div className="w-full h-full relative z-0 pt-16">
          <MapComponent 
             isMotorista={true} 
             overridePath={isActive ? activePath : []}
             followMode={followMode}
             onFollowDisable={() => setFollowMode(false)}
          />
       </div>
    </div>
  );
};

export default Motorista;

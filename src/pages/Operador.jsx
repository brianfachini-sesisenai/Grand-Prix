import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import FollowCameraButton from '../components/FollowCameraButton';
import { useGraph } from '../context/GraphContext';
import { useAuth } from '../context/AuthContext';
import { dijkstra } from '../utils/dijkstra';
import { calculateDistance } from '../utils/haversine';

const Operador = () => {
  const { nodes, edges, setActiveOrder, activeOrder, eta, isMoving, categories, vehicles, addAuditLog, driverStatuses, addOperatorAlert, setNearestVehicleId } = useGraph();
  const { currentUser } = useAuth();
  const [destino, setDestino] = useState('');
  const [tipoVeiculo, setTipoVeiculo] = useState('');
  const [motivo, setMotivo] = useState('');
  const [contingencyAlert, setContingencyAlert] = useState(null);
  const [followMode, setFollowMode] = useState(true);

  const [destinoTab, setDestinoTab] = useState('lista'); // 'lista' | 'atual' | 'alfinete'
  const [mapCenter, setMapCenter] = useState(null);

  useEffect(() => {
     if(categories && categories.length > 0 && !tipoVeiculo) {
        setTipoVeiculo(categories[0].id);
     }
  }, [categories, tipoVeiculo]);

  // LOGICA DE RADAR: Encontrar veículo mais próximo sempre que as seleções mudarem
  useEffect(() => {
     if (!destino || !tipoVeiculo) {
        setNearestVehicleId(null);
        return;
     }

     const destinoNode = nodes[destino];
     if (!destinoNode) return;

     const availableNodes = vehicles
        .filter(v => v.categoriaId === tipoVeiculo)
        .filter(v => {
           const driverState = driverStatuses[v.motoristaAtribuidoId];
           return !driverState || driverState === 'disponivel';
        });

     let winnerId = null;
     let minDistance = Infinity;

     availableNodes.forEach(v => {
        const vNode = nodes[v.lastNodeId] || nodes[v.homeBaseNodeId] || Object.values(nodes)[0];
        if (vNode) {
           const dist = calculateDistance(vNode.lat, vNode.lng, destinoNode.lat, destinoNode.lng);
           if (dist < minDistance) {
              minDistance = dist;
              winnerId = v.id;
           }
        }
     });

     setNearestVehicleId(winnerId);
  }, [destino, tipoVeiculo, vehicles, nodes, driverStatuses]);

  const poiOptions = Object.values(nodes).filter(n => n.isPOI !== false).map(n => (
    <option key={n.id} value={n.id}>{n.label} (Nó {n.id})</option>
  ));

  const allNodeOptions = Object.values(nodes).map(n => (
    <option key={n.id} value={n.id}>{n.label} (Nó {n.id})</option>
  ));

  const findNearestNode = (lat, lng) => {
     let nearestId = null;
     let minDistance = Infinity;
     Object.values(nodes).forEach(n => {
        const d = calculateDistance(lat, lng, n.lat, n.lng);
        if (d < minDistance) { minDistance = d; nearestId = n.id; }
     });
     return nearestId;
  };

  const handleMapMoveEnd = (center) => {
     setMapCenter(center);
  };

  const handleConfirmPin = () => {
     if (mapCenter) {
        const nearest = findNearestNode(mapCenter.lat, mapCenter.lng);
        setDestino(nearest);
        setDestinoTab('lista');
     } else {
        const fallback = findNearestNode(-2.5647, -44.3725);
        setDestino(fallback);
        setDestinoTab('lista');
     }
  };

  const handleUseCurrentLocation = () => {
     const mockLat = -2.5640;
     const mockLng = -44.3730;
     const nearest = findNearestNode(mockLat, mockLng);
     setDestino(nearest);
     setDestinoTab('lista');
  };

  const handleSolicitar = () => {
    if (destino) {
      if(!tipoVeiculo) {
         alert("Selecione uma categoria de veículo.");
         return;
      }
      
      const availableVehicles = vehicles.filter(v => v.categoriaId === tipoVeiculo);
      if (availableVehicles.length === 0) {
         setContingencyAlert(`Indisponibilidade de Frota: Não há veículos cadastrados para a categoria selecionada no momento.`);
         return;
      }

      const assignedVehicles = availableVehicles.filter(v => v.motoristaAtribuidoId);
      if (assignedVehicles.length === 0) {
         setContingencyAlert(`Indisponibilidade de Frota: Existem veículos na categoria solicitada, porém nenhum logístico se encontra ancorado a eles.`);
         return;
      }
      
      const activeDrivers = assignedVehicles.filter(v => {
         const driverState = driverStatuses[v.motoristaAtribuidoId];
         return !driverState || driverState === 'disponivel';
      });

      if (activeDrivers.length === 0) {
         setContingencyAlert(`Indisponibilidade de Frota: Existem veículos alocados, porém nenhum motorista encontra-se 'Disponível' no momento (Pausa/Offline).`);
         return;
      }
      
      const destinoNode = nodes[destino];
      if (!destinoNode) return;
      
      let closestVehicle = null;
      let minDistance = Infinity;
      
      activeDrivers.forEach(v => {
         const vNode = nodes[v.lastNodeId] || nodes[v.homeBaseNodeId] || Object.values(nodes)[0];
         const dist = calculateDistance(vNode.lat, vNode.lng, destinoNode.lat, destinoNode.lng);
         if (dist < minDistance) {
            minDistance = dist;
            closestVehicle = v;
         }
      });
      
      if (!closestVehicle) return;

      const vNodeData = nodes[closestVehicle.lastNodeId] || nodes[closestVehicle.homeBaseNodeId] || Object.values(nodes)[0];

      setActiveOrder({ 
         origem: vNodeData.id, 
         destino, 
         tipoVeiculo, 
         status: 'aguardando',
         motivo: motivo || 'Nenhuma observação',
         solicitadoPor: currentUser?.nome || 'Operador Base',
         assignedVehicleId: closestVehicle.id,
         assignedToUserId: closestVehicle.motoristaAtribuidoId
      });
      setMotivo('');
    } else {
      alert("Selecione um Destino válido.");
    }
  };

  return (
    <div className="h-full relative w-full pt-16 bg-slate-50 dark:bg-slate-900 overflow-hidden transition-colors">
       <MapComponent isOperador={true} onMapMoveEnd={handleMapMoveEnd} followMode={followMode} onFollowDisable={() => setFollowMode(false)} />
       <FollowCameraButton followMode={followMode} onToggle={() => setFollowMode(!followMode)} />
       
       {destinoTab === 'alfinete' && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[1000] pointer-events-none drop-shadow-2xl">
             <div className="text-5xl animate-bounce">📍</div>
          </div>
       )}

       {destinoTab === 'alfinete' && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-[1000] flex space-x-4">
             <button onClick={() => setDestinoTab('lista')} className="bg-slate-800/90 text-white font-bold py-3 px-6 rounded-full shadow-lg backdrop-blur-sm hover:bg-slate-700 transition border border-slate-600">
               Cancelar
             </button>
             <button onClick={handleConfirmPin} className="bg-indigo-600/90 text-white font-bold py-3 px-8 rounded-full shadow-lg backdrop-blur-sm hover:bg-indigo-500 transition border border-indigo-400">
               Confirmar Local do Destino
             </button>
          </div>
       )}
       {/* Modal de Contingência */}
        {contingencyAlert && (
           <div className="absolute top-0 left-0 w-full h-full z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
             <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-8 rounded-xl shadow-2xl w-[400px] text-slate-800 dark:text-white transition-colors duration-300 relative">
               <button onClick={() => setContingencyAlert(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white transition">
                 <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
               </button>
               
               <div className="flex items-center mb-4">
                 <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center mr-3">
                   <span className="text-xl">🚨</span>
                 </div>
                 <h3 className="font-bold text-lg text-slate-800 dark:text-white">Alerta de Contingência</h3>
               </div>
               
               <p className="text-sm text-slate-600 dark:text-gray-300 mb-6 leading-relaxed bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg border border-slate-100 dark:border-slate-700">
                 {contingencyAlert} 
                 <br/><br/>
                 <strong className="text-slate-800 dark:text-slate-200">Deseja acionar a central de suporte para despacho manual?</strong>
               </p>
               
               <div className="flex space-x-3">
                 <button onClick={() => setContingencyAlert(null)} className="flex-1 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-bold rounded transition">
                    Cancelar
                 </button>
                 <button 
                    onClick={() => {
                        const catNome = categories.find(c => c.id === tipoVeiculo)?.nome || tipoVeiculo;
                        addAuditLog(`Acionamento de Contingência da Base (Frotas Indisponíveis para a categoria).`);
                        addOperatorAlert(`URGENTE: Operador solicitou a categoria [${catNome}], mas não há veículos/motoristas disponíveis.`);
                        setContingencyAlert(null);
                     }}
                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-lg shadow-red-500/20 transition uppercase text-sm tracking-wide"
                 >
                    Acionar Central
                 </button>
               </div>
             </div>
           </div>
        )}

       {/* Painel lateral do Operador - Dark Glass Aesthetic */}
       <div className={`absolute top-20 left-4 z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 text-slate-800 dark:text-slate-100 transition-colors duration-300 ${destinoTab === 'alfinete' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
         <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-slate-100">Visão Operador</h2>
         <p className="text-xs text-slate-600 dark:text-gray-400 mb-6">Controle de solicitações de campo.</p>
         
         <div className="flex flex-col space-y-4">
           <div>
             <label className="text-sm font-black text-red-600 dark:text-red-400 mb-2 block uppercase tracking-wider">🔴 Para Onde: (Destino)</label>
             
             {/* Tabs de Seleção */}
             <div className="flex bg-slate-200 dark:bg-slate-800 rounded-lg p-1 mb-2">
                <button onClick={() => setDestinoTab('lista')} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors ${destinoTab === 'lista' ? 'bg-white dark:bg-slate-600 shadow text-slate-800 dark:text-white' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>🏢 Lista de POIs</button>
                <button onClick={handleUseCurrentLocation} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300`}>📍 Meu Local</button>
                <button onClick={() => setDestinoTab('alfinete')} className={`flex-1 text-[11px] font-bold py-1.5 rounded-md transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300`}>📌 Alfinete</button>
             </div>

             <select 
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
               value={destino}
               onChange={(e) => setDestino(e.target.value)}
             >
               <option value="">-- Selecione o Destino --</option>
               {destinoTab === 'lista' ? poiOptions : allNodeOptions}
             </select>
           </div>
           
           <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
             <label className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-1 block">Tipo de Veículo (Categoria)</label>
             <select 
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors"
               value={tipoVeiculo}
               onChange={(e) => setTipoVeiculo(e.target.value)}
             >
               {categories && categories.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
               ))}
             </select>
           </div>
           
           <div>
             <label className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-1 block">Observações / Motivo (Opcional)</label>
             <textarea 
               className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded p-2 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
               rows="2"
               placeholder="Ex: Vazamento identificado no trecho..."
               value={motivo}
               onChange={(e) => setMotivo(e.target.value)}
             />
           </div>
           
           <button 
             onClick={handleSolicitar}
             className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 px-4 rounded transition-colors shadow-lg shadow-indigo-500/30 text-sm uppercase tracking-wide"
           >
             Solicitar Veículo de Apoio
           </button>
         </div>
       </div>

       {/* Painel de Status da Solicitação */}
       {activeOrder && (
         <div className="absolute bottom-8 right-8 z-40 bg-white dark:bg-slate-900 border-l-4 border-l-indigo-500 p-6 rounded-xl shadow-2xl w-80 text-slate-800 dark:text-white transition-colors duration-300">
            <div className="flex justify-between items-center mb-2">
               <h3 className="font-bold uppercase tracking-wider text-sm">Status da Solicitação</h3>
               <span className="flex h-3 w-3 relative">
                 <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isMoving ? 'bg-emerald-400' : 'bg-yellow-400'}`}></span>
                 <span className={`relative inline-flex rounded-full h-3 w-3 ${isMoving ? 'bg-emerald-500' : 'bg-yellow-500'}`}></span>
               </span>
            </div>
            {isMoving ? (
              <div className="mt-4 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                 <p className="text-xs text-emerald-800 dark:text-emerald-300 font-bold uppercase mb-1">Em Trânsito para {nodes[activeOrder.destino]?.label}</p>
                 <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 leading-none">{eta ? `Chegada em: ${eta}` : 'Calculando...'}</p>
                 {nodes[activeOrder.destino] && <span className="text-[10px] text-emerald-700 dark:text-emerald-500 block mt-1 tracking-wider uppercase font-bold">🎯 Coordenadas enviadas: {nodes[activeOrder.destino].lat.toFixed(4)}, {nodes[activeOrder.destino].lng.toFixed(4)}</span>}
              </div>
            ) : (
              <div className="mt-4 bg-yellow-50 dark:bg-yellow-900/30 p-3 rounded-lg border border-yellow-200 dark:border-yellow-800">
                 <p className="text-xs text-yellow-800 dark:text-yellow-300 font-bold uppercase mb-1">Aguardando Motorista na base</p>
                 <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Ordem enviada à frota.</p>
                 <p className="text-[10px] text-yellow-600 dark:text-yellow-500 uppercase mt-1">Nó Destino: {activeOrder.destino}</p>
              </div>
            )}
         </div>
       )}
    </div>
  );
};

export default Operador;

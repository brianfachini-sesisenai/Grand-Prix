import React, { useState, useEffect } from 'react';
import MapComponent from '../components/MapComponent';
import { useGraph } from '../context/GraphContext';
import { useAuth } from '../context/AuthContext';

const Gestor = () => {
  const { 
     nodes, originalEdges, addNode, updateNode, deleteNode, activeNodeId, setActiveNodeId, 
     selectedNodes, deleteMultipleNodes, pendingAlerts, updateEdgeStatus, rejectAlert, 
     edgeStatuses, tripHistory, auditLogs, simulationSpeed, setSimulationSpeed,
     categories, setCategories, vehicles, setVehicles, operatorAlerts, ackOperatorAlert, importData
  } = useGraph();
  
  const { users } = useAuth();
  
  const [formData, setFormData] = useState({ id: `N${Math.floor(Math.random()*1000)}`, label: '', lat: -2.5647, lng: -44.3725, isPOI: true });
  const [connectedNodes, setConnectedNodes] = useState([]);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [isAccordionOpen, setIsAccordionOpen] = useState(true);
  const [isSimulationAccordionOpen, setIsSimulationAccordionOpen] = useState(false);
  const [isFleetAccordionOpen, setIsFleetAccordionOpen] = useState(false);
  const [isCatAccordionOpen, setIsCatAccordionOpen] = useState(false);
  const [isVehAccordionOpen, setIsVehAccordionOpen] = useState(true);
  const [isHistoryAccordionOpen, setIsHistoryAccordionOpen] = useState(false);
  const [isAuditAccordionOpen, setIsAuditAccordionOpen] = useState(false);
  
  const [newVehicle, setNewVehicle] = useState({ nome: '', modelo: '', categoriaId: '', motoristaAtribuidoId: '' });
  const [activeVehicleId, setActiveVehicleId] = useState(null);
  
  const [newCategoryName, setNewCategoryName] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState(null);

  const [sidebarWidth, setSidebarWidth] = useState(380);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
     const handleMouseMove = (e) => {
         if (!isDragging) return;
         let newWidth = window.innerWidth - e.clientX;
         if (newWidth < 320) newWidth = 320;
         if (newWidth > window.innerWidth * 0.6) newWidth = window.innerWidth * 0.6;
         setSidebarWidth(newWidth);
     };
     const handleMouseUp = () => {
         setIsDragging(false);
         document.body.style.cursor = 'default';
     };
     
     if (isDragging) {
         window.addEventListener('mousemove', handleMouseMove);
         window.addEventListener('mouseup', handleMouseUp);
         document.body.style.cursor = 'col-resize';
     }
     return () => {
         window.removeEventListener('mousemove', handleMouseMove);
         window.removeEventListener('mouseup', handleMouseUp);
         document.body.style.cursor = 'default';
     };
  }, [isDragging]);

  const handleMouseDown = (e) => {
     e.preventDefault();
     setIsDragging(true);
  };

  const handleExport = () => {
     const data = { nodes, edges: originalEdges, categories, vehicles };
     const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
     const url = URL.createObjectURL(blob);
     const link = document.createElement('a');
     link.href = url;
     link.download = `tmpm_malha_${Date.now()}.json`;
     document.body.appendChild(link);
     link.click();
     document.body.removeChild(link);
     URL.revokeObjectURL(url);
  };

  const handleImport = (e) => {
     const file = e.target.files[0];
     if (!file) return;
     const reader = new FileReader();
     reader.onload = (evt) => {
        try {
           const data = JSON.parse(evt.target.result);
           importData(data);
           alert('Malha importada com sucesso!');
        } catch (err) {
           console.error(err);
           alert('Falha ao importar o arquivo JSON da malha.');
        }
     };
     reader.readAsText(file);
  };

  const handleSaveCategory = (e) => {
     if(e && e.preventDefault) e.preventDefault();
     console.log("Tentando salvar categoria com nome: ", newCategoryName);
     if(!newCategoryName) {
        console.warn("Nome vazio.");
        return;
     }
     if(activeCategoryId) {
        setCategories(prev => prev.map(c => c.id === activeCategoryId ? {...c, nome: newCategoryName} : c));
        setActiveCategoryId(null);
     } else {
        const uid = 'c_' + Date.now();
        setCategories(prev => [...prev, { id: uid, nome: newCategoryName }]);
     }
     setNewCategoryName('');
  };

  const handleAddVehicle = (e) => {
     e.preventDefault();
     if(newVehicle.nome && newVehicle.categoriaId) {
        if(activeVehicleId) {
           setVehicles(prev => prev.map(v => v.id === activeVehicleId ? { ...v, ...newVehicle } : v));
           setActiveVehicleId(null);
           alert("Veículo atualizado com sucesso!");
        } else {
           const generatedId = `V${Math.floor(Math.random() * 1000)}`;
           setVehicles(prev => [...prev, { ...newVehicle, id: generatedId }]);
           alert("Veículo atribuído com sucesso!");
        }
        setNewVehicle({ nome: '', modelo: '', categoriaId: '', motoristaAtribuidoId: '' });
     }
  };
  
  const [isAlertPanelOpen, setIsAlertPanelOpen] = useState(true);
  const [editingAlert, setEditingAlert] = useState(null);
  const [dirtyStatus, setDirtyStatus] = useState('normal');

  const openEditModal = (edgeId, currentStatus, isPending, id = null) => {
     setEditingAlert({ edgeId, currentStatus, isPending, id });
     setDirtyStatus(currentStatus);
  };

  const handleCloseModal = () => {
     if (dirtyStatus !== editingAlert.currentStatus) {
        if (!window.confirm("Deseja sair sem salvar as alterações?")) {
           return;
        }
     }
     setEditingAlert(null);
  };

  const handleSaveEdit = () => {
     updateEdgeStatus(editingAlert.edgeId, dirtyStatus);
     setEditingAlert(null);
  };

  const handleDeleteAlert = () => {
     if (editingAlert.isPending) {
        rejectAlert(editingAlert.id);
     } else {
        updateEdgeStatus(editingAlert.edgeId, 'normal');
     }
     setEditingAlert(null);
  };

  useEffect(() => {
    if (activeNodeId && nodes[activeNodeId]) {
      const node = nodes[activeNodeId];
      setFormData({
        id: node.id,
        label: node.label,
        lat: node.lat,
        lng: node.lng,
        isPOI: node.isPOI !== false
      });
      const connections = originalEdges[activeNodeId] ? Object.keys(originalEdges[activeNodeId]) : [];
      setConnectedNodes(connections);
      // Auto-open panel se clicar no modo editar
      setIsPanelOpen(true);
    } else {
      let now = Date.now().toString().slice(-4);
      setFormData({ id: `N${now}`, label: '', lat: -2.5647, lng: -44.3725, isPOI: true });
      setConnectedNodes([]);
    }
  }, [activeNodeId, nodes, originalEdges]);

  const handleToggleConnection = (targetId) => {
    setConnectedNodes(prev => 
      prev.includes(targetId) ? prev.filter(id => id !== targetId) : [...prev, targetId]
    );
  };

  const handleSaveNode = (e) => {
    e.preventDefault();
    if(formData.label && formData.lat && formData.lng) {
      if(activeNodeId) {
        updateNode(formData.id, {
          label: formData.label,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          isPOI: formData.isPOI !== false
        }, connectedNodes);
      } else {
        addNode({
          id: formData.id,
          label: formData.label,
          lat: parseFloat(formData.lat),
          lng: parseFloat(formData.lng),
          isPOI: formData.isPOI !== false
        }, connectedNodes);
      }
      setActiveNodeId(null);
    }
  };

  const handleDelete = () => {
    if(activeNodeId && window.confirm("Excluir este ponto e todas as suas rotas?")) {
      deleteNode(activeNodeId);
      setIsPanelOpen(false);
    }
  };

  const handleMultiDelete = () => {
    if(selectedNodes.length >= 2 && window.confirm(`Deseja realmente excluir todos os ${selectedNodes.length} pontos marcados e suas conexões permanentemente?`)) {
      deleteMultipleNodes(selectedNodes);
    }
  };

  return (
    <div className="absolute inset-0 flex overflow-hidden bg-white dark:bg-slate-900 transition-colors">
       
       <div className="w-full h-full relative z-0 pt-16">
         <MapComponent isGestor={true} />
       </div>

       {/* Centro de Controle de Alertas (Top Left) */}
       <div className={`absolute top-24 left-4 z-40 bg-white dark:bg-slate-900 p-6 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 w-80 text-slate-800 dark:text-slate-100 flex flex-col transition-all duration-300 ${isAlertPanelOpen ? 'max-h-[calc(100vh-8rem)]' : 'h-[76px] overflow-hidden'}`}>
         
         {/* Drawer Header */}
         <div className="flex justify-between items-center cursor-pointer mb-2" onClick={() => setIsAlertPanelOpen(!isAlertPanelOpen)}>
            <h2 className="text-xl font-bold flex items-center text-red-400">
               <span className="mr-2">🚨</span> Centro de Controle
            </h2>
            <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isAlertPanelOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>

         {/* Drawer Body */}
         <div className={`overflow-y-auto custom-scrollbar transition-opacity duration-300 flex-1 ${isAlertPanelOpen ? 'opacity-100 mt-2' : 'opacity-0 hidden'}`}>
             <p className="text-xs text-gray-400 mb-4">Aprovações e gestão de ocorrências</p>
             
             {/* Ocorrências do Operador */}
             {operatorAlerts && operatorAlerts.length > 0 && (
                <div className="mb-6">
                   <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest mb-3 animate-pulse">Despachos Críticos ({operatorAlerts.length})</h3>
                   <div className="flex flex-col space-y-3">
                     {operatorAlerts.map(alert => (
                        <div key={alert.id} className="bg-red-50 dark:bg-red-900/30 border-l-4 border-l-red-600 border border-red-200 dark:border-red-800 p-3 rounded shadow-md relative">
                           <div className="flex justify-between items-start mb-2">
                              <span className="text-xs font-bold text-red-700 dark:text-red-400 max-w-[80%]">{alert.msg}</span>
                              <button onClick={() => ackOperatorAlert(alert.id)} className="p-1 px-2 bg-red-600 hover:bg-red-500 rounded text-white transition shadow text-[10px] font-bold uppercase" title="Sinalizar Ciente">Ciente</button>
                           </div>
                           <p className="text-[9px] text-red-500 dark:text-red-300 font-medium">{alert.timestamp}</p>
                        </div>
                     ))}
                   </div>
                </div>
             )}
             
             {/* Pendentes */}
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Pendentes ({pendingAlerts.length})</h3>
             {pendingAlerts.length === 0 ? (
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 text-center mb-6 transition-colors">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">✅ Nenhum pendente</span>
                </div>
             ) : (
                <div className="flex flex-col space-y-3 mb-6">
                  {pendingAlerts.map(alert => (
                     <div key={alert.id} className="bg-slate-50 dark:bg-slate-800 border-l-4 border-l-orange-500 border border-slate-200 dark:border-slate-700 p-3 rounded shadow-md relative group">
                         <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 uppercase">{alert.reportedBy}</span>
                           <div className="flex space-x-1">
                              <button onClick={() => updateEdgeStatus(alert.edgeId, alert.status)} className="p-1 bg-green-600/80 hover:bg-green-500 rounded text-white transition shadow" title="Aprovar direto">✓</button>
                              <button onClick={() => rejectAlert(alert.id)} className="p-1 px-1.5 bg-red-600/80 hover:bg-red-500 rounded text-white transition shadow text-xs font-bold" title="Recusar direto">X</button>
                              <button onClick={() => openEditModal(alert.edgeId, alert.status, true, alert.id)} className="p-1 bg-slate-500 dark:bg-slate-700 hover:bg-slate-600 rounded text-white transition shadow" title="Editar">⚙</button>
                           </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                           Aresta <strong className="text-slate-900 dark:text-white">{alert.edgeId}</strong>: <strong className="text-orange-600 dark:text-orange-400 uppercase">{alert.status}</strong>
                        </p>
                     </div>
                  ))}
                </div>
             )}
             
             {/* Ativos */}
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 border-t border-slate-700 pt-4">Ativos na Malha ({Object.keys(edgeStatuses).length})</h3>
             {Object.keys(edgeStatuses).length === 0 ? (
                <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-4 text-center transition-colors">
                  <span className="text-xs font-bold text-green-600 dark:text-green-400">✅ Malha operando normalmente</span>
                </div>
             ) : (
                <div className="flex flex-col space-y-3">
                  {Object.entries(edgeStatuses).map(([edgeId, status]) => (
                     <div key={edgeId} className="bg-slate-50 dark:bg-slate-800 border-l-4 border-l-red-500 border border-slate-200 dark:border-slate-700 p-3 rounded shadow-md relative group">
                        <div className="flex justify-between items-center mb-1">
                           <span className="text-[10px] font-bold text-slate-500 dark:text-gray-400 uppercase">Via Comprometida</span>
                           <div className="flex space-x-1">
                              <button onClick={() => updateEdgeStatus(edgeId, 'normal')} className="p-1 px-1.5 bg-slate-500 dark:bg-slate-700 hover:bg-red-600/80 rounded text-white transition shadow text-xs font-bold" title="Remover Alerta">X</button>
                              <button onClick={() => openEditModal(edgeId, status, false)} className="p-1 bg-indigo-600/80 hover:bg-indigo-500 rounded text-white transition shadow" title="Editar">✏</button>
                           </div>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300">
                           Aresta <strong className="text-slate-900 dark:text-white">{edgeId}</strong>: <strong className="text-red-500 dark:text-red-400 uppercase">{status}</strong>
                        </p>
                     </div>
                  ))}
                </div>
             )}
         </div>
       </div>

       {/* Modal de Edição Avançado (Central) */}
       {editingAlert && (
         <div className="absolute top-0 left-0 w-full h-full z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-colors" onClick={handleCloseModal}>
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-2xl w-96 text-slate-900 dark:text-white transition-colors" onClick={(e) => e.stopPropagation()}>
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-bold text-lg text-indigo-600 dark:text-indigo-400">✏️ Editar Status da Via</h3>
                 <button onClick={handleCloseModal} className="text-slate-400 hover:text-slate-800 dark:hover:text-white transition text-xl">&times;</button>
               </div>
               
               <p className="text-sm text-slate-600 dark:text-gray-300 mb-6 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors">
                 Trecho Selecionado: <span className="font-bold text-slate-900 dark:text-white text-lg tracking-wider float-right">{editingAlert.edgeId}</span>
               </p>
               
               <label className="text-xs font-bold text-slate-500 dark:text-gray-400 mb-2 block uppercase tracking-wider">Novo Status de Tráfego</label>
               <select 
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-100 mb-6 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 shadow-sm dark:shadow-inner transition-colors"
                  value={dirtyStatus}
                  onChange={(e) => setDirtyStatus(e.target.value)}
               >
                  <option value="normal">✅ Liberada (Normal)</option>
                  <option value="ruim">🚧 Rua Ruim / Esburacada</option>
                  <option value="congestionado">🚥 Congestionamento</option>
                  <option value="interditado">❌ Via Interditada</option>
                  <option value="manutencao">🏗️ Em Obras / Manutenção</option>
               </select>
               
               <div className="flex space-x-3 mt-4">
                 <button 
                    onClick={handleSaveEdit}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg shadow-lg transition text-sm uppercase tracking-wide"
                 >Salvar Status</button>
                 <button 
                    onClick={handleDeleteAlert}
                    className="flex-1 bg-slate-700 hover:bg-red-600/80 text-white font-bold py-3 rounded-lg shadow-lg transition text-sm uppercase tracking-wide border border-slate-600 hover:border-red-500"
                 >Excluir Alerta</button>
               </div>
            </div>
         </div>
       )}

       {/* Floating Action Button para abrir o Painel */}
       <button 
          onClick={() => setIsPanelOpen(!isPanelOpen)} 
          className={`absolute top-24 z-50 bg-slate-800 glass p-3 rounded-l-xl text-white hover:text-indigo-400 shadow-xl border border-slate-600 border-r-0 flex items-center justify-center ${!isDragging ? 'transition-all duration-300' : ''}`}
          style={{ right: isPanelOpen ? `${sidebarWidth}px` : '0px' }}
          title="Infraestrutura de Malha Digital"
       >
          <svg className={`w-6 h-6 transition-transform duration-500 ${isPanelOpen ? 'rotate-90' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
       </button>

       {/* Painel Retrátil (Drawer) */}
       <div 
         className={`absolute top-16 right-0 h-[calc(100%-4rem)] z-40 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md text-slate-900 dark:text-slate-100 shadow-2xl border-l border-slate-200 dark:border-slate-700 overflow-y-auto custom-scrollbar ${!isDragging ? 'transform transition-all duration-300 ease-in-out' : ''}`}
         style={{ width: `${sidebarWidth}px`, transform: isPanelOpen ? 'translateX(0)' : `translateX(${sidebarWidth}px)` }}
       >
         
         {/* Alça de Redimensionamento */}
         <div 
           className="absolute top-0 left-0 w-1.5 h-full cursor-col-resize hover:bg-indigo-500 active:bg-indigo-600 transition-colors z-50 opacity-50 group-hover:opacity-100"
           onMouseDown={handleMouseDown}
         />
         
         {/* Alerta de Massa caso os pinos estejam marcados via SHIFT mas o gestor não selecionou 1 editar */}
         {selectedNodes.length >= 2 && !activeNodeId && (
            <div className="p-6 pb-0 animate-pulse">
                <button onClick={handleMultiDelete} className="w-full bg-red-600 hover:bg-red-700 text-slate-100 font-bold py-3 px-4 rounded transition-colors text-sm shadow-xl flex flex-col items-center justify-center border border-red-400">
                  <span>Excluir {selectedNodes.length} Marcados</span>
                  <span className="text-[10px] opacity-75 font-normal mt-1">Acionado via Shift+Click no mapa</span>
                </button>
            </div>
         )}

         <div 
           className="p-6 pb-4 border-b border-slate-200 dark:border-gray-600 mt-2 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           onClick={() => setIsAccordionOpen(!isAccordionOpen)}
         >
           <div>
             <h2 className="text-xl font-bold mb-1 text-slate-800 dark:text-slate-100">Infraestrutura de Malha Digital</h2>
             <p className="text-xs text-slate-500 dark:text-gray-300">Desenhe, exclua ou remodele a planta livremente.</p>
           </div>
           <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>
         
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isAccordionOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-4 flex justify-between gap-4">
              <button onClick={handleExport} className="flex-1 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 font-bold py-2 px-4 rounded text-sm transition-colors border border-indigo-200 dark:border-indigo-700 flex justify-center items-center">
                📥 Exportar Malha
              </button>
              <label className="flex-1 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-300 font-bold py-2 px-4 rounded text-sm transition-colors border border-indigo-200 dark:border-indigo-700 flex justify-center items-center cursor-pointer">
                📤 Importar Malha
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </div>
            <div className="p-6">
           <div className="flex justify-between items-center mb-4 text-slate-800 dark:text-slate-100">
             <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 flex items-center">
                 {activeNodeId ? '✏️ Modo Edição' : '➕ Novo Ponto'}
             </h3>
             {activeNodeId && (
               <button onClick={() => setActiveNodeId(null)} className="text-xs bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-white px-2 py-1 rounded hover:bg-slate-300 dark:hover:bg-slate-600 transition">
                 Cancelar
               </button>
             )}
           </div>

           <form onSubmit={handleSaveNode} className="flex flex-col space-y-3">
              <div>
                <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Nome Localização</label>
                <input required type="text" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors rounded p-2 text-sm outline-none focus:border-indigo-500" value={formData.label} onChange={(e) => setFormData({...formData, label: e.target.value})} placeholder="Nome..." />
              </div>
              
              <div className="flex items-center space-x-2 mt-1 mb-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-200 dark:border-slate-700">
                <input 
                   type="checkbox" 
                   id="isPOI"
                   className="w-4 h-4 text-indigo-600 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-indigo-500 cursor-pointer"
                   checked={formData.isPOI !== false}
                   onChange={(e) => setFormData({...formData, isPOI: e.target.checked})}
                />
                <label htmlFor="isPOI" className="text-[11px] text-slate-700 dark:text-slate-300 font-bold cursor-pointer select-none flex items-center">
                   <span className="mr-1">🌟</span> Definir como Localização Principal (POI)
                </label>
              </div>
              <div className="flex space-x-2">
                <div className="w-1/2">
                   <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Lat</label>
                   <input required type="number" step="any" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors rounded p-2 text-xs outline-none focus:border-indigo-500" value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} />
                </div>
                <div className="w-1/2">
                   <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Lng</label>
                   <input required type="number" step="any" className="w-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 transition-colors rounded p-2 text-xs outline-none focus:border-indigo-500" value={formData.lng} onChange={(e) => setFormData({...formData, lng: e.target.value})} />
                </div>
              </div>

              {activeNodeId && (
                <div className="mt-2 flex flex-col">
                   <label className="text-xs text-indigo-600 dark:text-indigo-300 font-bold block mb-1 mt-2">Puxar as Arestas com:</label>
                   <div className="max-h-60 overflow-y-auto bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded p-2 custom-scrollbar">
                     {Object.values(nodes).map(n => {
                       if(n.id === formData.id) return null;
                       return (
                         <label key={n.id} className="flex items-center space-x-2 mb-2 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 p-1 rounded transition-colors">
                           <input 
                              type="checkbox" 
                              className="w-4 h-4 text-indigo-500 rounded bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-0"
                              checked={connectedNodes.includes(n.id)}
                              onChange={() => handleToggleConnection(n.id)}
                           />
                           <span className="text-xs text-slate-700 dark:text-slate-300 flex-1 truncate" title={`Nó ${n.id}`}>Nó {n.id}: {n.label}</span>
                         </label>
                       );
                     })}
                   </div>
                </div>
              )}

              <div className="pt-3 flex flex-col space-y-2 mt-4">
                 <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-slate-100 font-bold py-2 px-4 rounded transition-colors text-sm">
                   {activeNodeId ? 'Salvar Edição' : 'Inserir Novo'}
                 </button>
                 
                 {activeNodeId && (
                   <button type="button" onClick={handleDelete} className="w-full bg-red-600 hover:bg-red-700 text-slate-100 font-bold py-2 px-4 rounded transition-colors text-sm">
                     Excluir Ponto
                   </button>
                 )}
              </div>
           </form>
         </div>
         </div>

         {/* Accordion Extra: Gerenciador de Frotas */}
         <div 
           className="p-4 border-b border-slate-200 dark:border-gray-600 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           onClick={() => setIsFleetAccordionOpen(!isFleetAccordionOpen)}
         >
           <div>
             <h2 className="text-md font-bold mb-0.5 text-slate-800 dark:text-slate-100 flex items-center">🏢 Gerenciador de Frotas</h2>
           </div>
           <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isFleetAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isFleetAccordionOpen ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}>
            <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex flex-col space-y-4">
               
               {/* Sub-Accordion: Gestão de Categorias */}
               <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition" onClick={() => setIsCatAccordionOpen(!isCatAccordionOpen)}>
                   <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center">🏷️ Gestão de Categorias</h3>
                   <svg className={`w-4 h-4 text-indigo-400 transition-transform duration-300 ${isCatAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
                 <div className={`transition-all duration-300 ease-in-out ${isCatAccordionOpen ? 'max-h-96 opacity-100 p-4' : 'max-h-0 opacity-0 p-0 overflow-hidden'}`}>
                   <div className="flex space-x-2 mb-4">
                      <input type="text" className="full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-indigo-500 w-full" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') handleSaveCategory(e); }} placeholder="Nova Categoria..." />
                      <button onClick={handleSaveCategory} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded text-sm transition-colors whitespace-nowrap">
                         {activeCategoryId ? 'Salvar' : 'Criar'}
                      </button>
                      {activeCategoryId && (
                         <button onClick={() => { setActiveCategoryId(null); setNewCategoryName(''); }} className="bg-slate-400 hover:bg-slate-500 text-white font-bold py-2 px-3 rounded text-sm transition-colors">X</button>
                      )}
                   </div>
                   <div className="max-h-40 overflow-y-auto custom-scrollbar flex flex-col space-y-2 pr-2">
                      {categories.map(c => (
                         <div key={c.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-200 dark:border-slate-700">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{c.nome}</span>
                            <div className="flex space-x-2">
                               <button onClick={() => { setActiveCategoryId(c.id); setNewCategoryName(c.nome); }} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase hover:underline">Editar</button>
                               <button onClick={() => setCategories(prev => prev.filter(cat => cat.id !== c.id))} className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase hover:underline">Deletar</button>
                            </div>
                         </div>
                      ))}
                   </div>
                 </div>
               </div>

               {/* Sub-Accordion: Gestão de Veículos */}
               <div className="bg-white dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/80 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition" onClick={() => setIsVehAccordionOpen(!isVehAccordionOpen)}>
                   <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest flex items-center">🚛 Gestão de Veículos</h3>
                   <svg className={`w-4 h-4 text-indigo-400 transition-transform duration-300 ${isVehAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                 </div>
                 <div className={`transition-all duration-500 ease-in-out ${isVehAccordionOpen ? 'max-h-[800px] opacity-100 p-4' : 'max-h-0 opacity-0 p-0 overflow-hidden'}`}>
                   
                   <div className="mb-6">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">{activeVehicleId ? '✏️ Editar Veículo' : '📝 Atribuir Veículo'}</h4>
                      <form onSubmit={handleAddVehicle} className="flex flex-col space-y-3">
                         <div>
                           <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Nome/ID do Veículo (Placa)</label>
                           <input required type="text" className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-indigo-500" value={newVehicle.nome} onChange={(e) => setNewVehicle({...newVehicle, nome: e.target.value})} placeholder="Ex: AXB-1234" />
                         </div>
                         <div>
                           <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Modelo Comercial</label>
                           <input required type="text" className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-indigo-500" value={newVehicle.modelo} onChange={(e) => setNewVehicle({...newVehicle, modelo: e.target.value})} placeholder="Ex: Mercedes Sprinter" />
                         </div>
                         <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-1">
                              <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Categoria Operacional</label>
                              <select required className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-indigo-500" value={newVehicle.categoriaId} onChange={(e) => setNewVehicle({...newVehicle, categoriaId: e.target.value})}>
                                 <option value="">Selecione a Categoria...</option>
                                 {categories.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block mb-1">Motorista Atribuído</label>
                              <select className="w-full bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-white border border-slate-300 dark:border-slate-700 rounded p-2 text-sm focus:outline-none focus:border-indigo-500" value={newVehicle.motoristaAtribuidoId || ''} onChange={(e) => setNewVehicle({...newVehicle, motoristaAtribuidoId: e.target.value})}>
                                 <option value="">Nenhum (Vago)</option>
                                 {users.filter(u => u.perfil !== 'Operador').map(u => <option key={u.matricula} value={u.matricula}>{u.nome} ({u.matricula})</option>)}
                              </select>
                            </div>
                         </div>
                         <div className="flex space-x-2 mt-2">
                           <button type="submit" className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded text-sm transition-colors uppercase">
                             {activeVehicleId ? 'Salvar Edição' : 'Cadastrar'}
                           </button>
                           {activeVehicleId && (
                              <button type="button" onClick={() => { setActiveVehicleId(null); setNewVehicle({ nome: '', modelo: '', categoriaId: '', motoristaAtribuidoId: '' }); }} className="bg-slate-400 hover:bg-slate-500 text-white font-bold py-2 px-4 rounded text-sm transition-colors">X</button>
                           )}
                         </div>
                      </form>
                   </div>

                   <div className="border-t border-slate-200 dark:border-slate-700 pt-4">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 px-1">Frotas Ativas na Matriz ({vehicles.length})</h3>
                      <div className="max-h-48 overflow-y-auto custom-scrollbar flex flex-col space-y-2 pr-2">
                         {vehicles.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">Nenhum veículo cadastrado.</p>
                         ) : vehicles.map(v => (
                            <div key={v.id} className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 p-3 rounded shadow-sm border-l-4 border-l-indigo-500 border border-slate-200 dark:border-slate-700">
                               <div>
                                  <p className="text-xs font-bold text-slate-800 dark:text-white uppercase"><span className="text-indigo-500">{v.nome}</span> - {v.modelo}</p>
                                  <p className="text-[9px] text-slate-400 dark:text-gray-500 uppercase">{categories.find(c => c.id === v.categoriaId)?.nome || 'Sem Categoria'}</p>
                                  <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-1">
                                     Condutor: <strong className="text-slate-700 dark:text-slate-300">{users.find(u => u.matricula === v.motoristaAtribuidoId)?.nome || <span className="text-yellow-600 dark:text-yellow-400 italic">Vago</span>}</strong>
                                  </p>
                               </div>
                               <div className="flex flex-col space-y-2">
                                  <button onClick={() => { 
                                     setNewVehicle({ nome: v.nome, modelo: v.modelo, categoriaId: v.categoriaId, motoristaAtribuidoId: v.motoristaAtribuidoId || '' });
                                     setActiveVehicleId(v.id);
                                     setIsVehAccordionOpen(true);
                                  }} className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold uppercase hover:underline">Editar</button>
                                  <button onClick={() => setVehicles(prev => prev.filter(ve => ve.id !== v.id))} className="text-[10px] text-red-600 dark:text-red-400 font-bold uppercase hover:underline">Deletar</button>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                 </div>
               </div>
            </div>
         </div>

         {/* Accordion Extra: Telemetria e Simulação */}
         <div 
           className="p-4 border-b border-slate-200 dark:border-gray-600 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           onClick={() => setIsSimulationAccordionOpen(!isSimulationAccordionOpen)}
         >
           <div>
             <h2 className="text-md font-bold mb-0.5 text-slate-800 dark:text-slate-100 flex items-center">⚡ Controle da Simulação</h2>
           </div>
           <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isSimulationAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isSimulationAccordionOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
           <div className="p-6 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
              <div className="flex flex-col space-y-4">
                <div className="flex justify-between items-center">
                   <label className="text-xs text-slate-600 dark:text-gray-400 font-bold block">Velocidade da Frota</label>
                   <span className="text-sm font-extrabold text-indigo-600 dark:text-indigo-400">{simulationSpeed}x</span>
                </div>
                <input 
                   type="range"
                   min="0.1" 
                   max="5" 
                   step="0.1"
                   className="w-full h-2 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
                   value={simulationSpeed}
                   onChange={(e) => setSimulationSpeed(parseFloat(e.target.value))}
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                   <span>Lenta</span>
                   <span>Normal</span>
                   <span>Rápida</span>
                </div>
              </div>
           </div>
         </div>

         {/* Accordion 2: Histórico de Viagens */}
         <div 
           className="p-4 border-b border-slate-200 dark:border-gray-600 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           onClick={() => setIsHistoryAccordionOpen(!isHistoryAccordionOpen)}
         >
           <div>
             <h2 className="text-md font-bold mb-0.5 text-slate-800 dark:text-slate-100 flex items-center">📜 Histórico de Viagens</h2>
           </div>
           <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isHistoryAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isHistoryAccordionOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
           <div className="p-4 bg-slate-50 dark:bg-slate-900/50 max-h-80 overflow-y-auto custom-scrollbar flex flex-col space-y-2 border-b border-slate-200 dark:border-slate-700">
              {tripHistory.length === 0 ? (
                 <p className="text-xs text-slate-500 dark:text-gray-500 italic text-center py-2">Nenhuma viagem registrada hoje.</p>
              ) : (
                 tripHistory.map(trip => (
                    <div key={trip.id} className="bg-white dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col space-y-2 shadow-sm">
                       <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-700/50 pb-2">
                          <div>
                            <p className="text-xs text-slate-800 dark:text-slate-300"><strong className="text-indigo-600 dark:text-indigo-400 uppercase">{trip.tipoVeiculo}</strong></p>
                            <p className="text-[10px] text-slate-500 dark:text-gray-400 mt-0.5">{trip.origem} → {trip.destino}</p>
                            {trip.assignedVehicleId && (
                               <p className="text-[10px] text-slate-500 dark:text-gray-400 font-bold bg-slate-50 dark:bg-slate-900/50 inline-block px-1 mt-1 rounded border border-slate-200 dark:border-slate-700 border-dashed">🚚 {vehicles.find(v => v.id === trip.assignedVehicleId)?.modelo || trip.assignedVehicleId}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-gray-500 bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-full whitespace-nowrap">
                             {(trip.startTime && trip.endTime) ? `Saída: ${trip.startTime} | Chegada: ${trip.endTime}` : trip.timestamp}
                          </span>
                       </div>
                       
                       <div className="flex flex-col space-y-1">
                          <p className="text-[10px] text-slate-500 dark:text-gray-400 flex justify-between">
                            <span><strong className="text-slate-700 dark:text-slate-300">Criado:</strong> {trip.solicitadoPor || 'N/A'}</span>
                            <span><strong className="text-slate-700 dark:text-slate-300">Conduzido:</strong> {trip.condutor || 'N/A'}</span>
                          </p>
                          {trip.motivo && (
                             <p className="text-[10px] text-slate-600 dark:text-gray-400 italic bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded mt-1 border-l-2 border-indigo-400">"{trip.motivo}"</p>
                          )}
                       </div>
                    </div>
                 ))
              )}
           </div>
         </div>

         {/* Accordion 3: Log de Auditoria */}
         <div 
           className="p-4 border-b border-slate-200 dark:border-gray-600 flex justify-between items-center cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
           onClick={() => setIsAuditAccordionOpen(!isAuditAccordionOpen)}
         >
           <div>
             <h2 className="text-md font-bold mb-0.5 text-slate-800 dark:text-slate-100 flex items-center">⚙️ Log de Auditoria</h2>
           </div>
           <svg className={`w-4 h-4 text-gray-400 transition-transform duration-300 ${isAuditAccordionOpen ? 'rotate-180' : 'rotate-0'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
         </div>
         <div className={`overflow-hidden transition-all duration-500 ease-in-out ${isAuditAccordionOpen ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0'}`}>
           <div className="p-4 bg-slate-50 dark:bg-slate-900/50 max-h-80 overflow-y-auto custom-scrollbar flex flex-col space-y-2">
              {auditLogs.length === 0 ? (
                 <p className="text-xs text-slate-500 dark:text-gray-500 italic text-center py-2">Sem rastro de auditoria.</p>
              ) : (
                 auditLogs.map(log => (
                    <div key={log.id} className="bg-white dark:bg-slate-800 p-2 rounded border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col">
                       <p className="text-xs text-slate-700 dark:text-gray-300 leading-tight">{log.msg}</p>
                       <span className="text-[9px] text-slate-500 dark:text-gray-500 mt-1 self-end">{log.timestamp}</span>
                    </div>
                 ))
              )}
           </div>
         </div>

       </div>

    </div>
  );
};

export default Gestor;

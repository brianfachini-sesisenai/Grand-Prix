import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useGraph } from '../context/GraphContext';
import { dijkstra } from '../utils/dijkstra';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Pinos default azul
const customNodeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjYiIGZpbGw9IiMxZTNhOGEiIHN0cm9rZT0iIzNiODJmNiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  tooltipAnchor: [0, -10]
});

// Pino Ativo (Editor Mode) amarelo
const customActiveNodeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjYiIGZpbGw9IiNlNWIxMWUiIHN0cm9rZT0iI2Y1OWUwYiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  tooltipAnchor: [0, -12]
});

// Pino Selecionado (Exclusão em Massa) laranja c borda branca
const customSelectedNodeIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxNiAxNiI+PGNpcmNsZSBjeD0iOCIgY3k9IjgiIHI9IjUiIGZpbGw9IiNmOTczMTYiIHN0cm9rZT0iI2ZmZmZmZiIgc3Ryb2tlLXdpZHRoPSIyIi8+PC9zdmc+',
  iconSize: [26, 26],
  iconAnchor: [13, 13],
  tooltipAnchor: [0, -13]
});

// Waypoint (Ponto de rota sem ser POI) cinza
const customWaypointIcon = new L.divIcon({
  className: 'custom-waypoint-icon bg-transparent',
  html: '<div style="width: 12px; height: 12px; background-color: #94a3b8; border: 2px solid #fff; border-radius: 50%; box-shadow: 0 0 2px rgba(0,0,0,0.5);"></div>',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
  tooltipAnchor: [0, -6]
});

const createTruckIcon = (color) => new L.Icon({
  iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1"><path d="M2 8h10v8H2z"/><path d="M12 8h4l3 3v5h-7z"/><circle cx="5" cy="18" r="2" /><circle cx="16" cy="18" r="2" /></svg>`)}`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

const truckIcons = {
  inspecao: createTruckIcon('#eab308'), 
  munck: createTruckIcon('#3b82f6'), 
  comboio: createTruckIcon('#10b981'), 
  resgate: createTruckIcon('#ef4444') 
};

// Ícone do Radar Pulsante
const pingIcon = new L.divIcon({
  className: 'radar-ping-icon',
  html: `
    <div class="relative flex h-12 w-12 items-center justify-center">
      <div class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></div>
      <div class="relative inline-flex rounded-full h-4 w-4 bg-indigo-600 border-2 border-white shadow-lg"></div>
    </div>
  `,
  iconSize: [48, 48],
  iconAnchor: [24, 24],
});

const getDynamicTruckIcon = (tipo) => truckIcons[tipo] || truckIcons.munck;

const getWarningIcon = (status) => {
   let color = status === 'interditado' || status === 'manutencao' ? '#ef4444' : '#f97316';
   let symbol = '';
   
   if(status === 'ruim') symbol = '<path d="M12 8v4M12 15h.01" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
   else if(status === 'congestionado') symbol = '<path d="M9 10h6v3H9zm-2 4h10v2H7z" fill="#fff"/>';
   else if(status === 'interditado') symbol = '<path d="M10 10l4 4M14 10l-4 4" stroke="#fff" stroke-width="2" stroke-linecap="round"/>';
   else if(status === 'manutencao') symbol = '<path d="M12 8l-3 7h6z" fill="#fff"/><path d="M10.2 12h3.6" stroke="#f97316" stroke-width="1"/>';
   
   const trianglePath = `<polygon points="12,2 2,21 22,21" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/><polygon points="12,4 4,19 20,19" fill="${color}" stroke="none"/>`;

   return new L.Icon({
     iconUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${trianglePath}${symbol}</svg>`)}`,
     iconSize: [32, 32],
     iconAnchor: [16, 16],
     tooltipAnchor: [0, -16],
   });
};

const centerPosition = [-2.5647, -44.3725];

const MapEventsHandler = ({ onMapMoveEnd }) => {
  useMapEvents({
     moveend: (e) => {
        if(onMapMoveEnd) onMapMoveEnd(e.target.getCenter());
     }
  });
  return null;
};

// Componente auxiliar para centralizar a câmera via FlyTo
const MapFlyTo = ({ position }) => {
   const map = useMap();
   useEffect(() => {
      if (position) {
         map.flyTo(position, 16, { animate: true, duration: 1.5 });
      }
   }, [position, map]);
   return null;
};

// Câmera Inteligente — Segue o veículo suavemente com panTo
// CONGELA quando o Popup do menu de contexto está aberto
const MapFollowVehicle = ({ position, followMode, onUserDrag, frozen }) => {
   const map = useMap();
   useEffect(() => {
      if (frozen) return; // TRAVA: Popup aberto = mapa estático
      if (followMode && position) {
         map.panTo(position, { animate: true, duration: 0.3 });
      }
   }, [position, followMode, map, frozen]);
   useMapEvents({
      dragstart: () => { if (onUserDrag) onUserDrag(); }
   });
   return null;
};

const DraggableNodeMarker = ({ node, isGestor, isActive, isSelected, toggleSelection, setActiveNodeId, updateNodePosition, getNodeIcon, showLabel = true }) => {
  const [position, setPosition] = React.useState({ lat: node.lat, lng: node.lng });
  
  React.useEffect(() => {
    setPosition({ lat: node.lat, lng: node.lng });
  }, [node.lat, node.lng]);

  return (
    <Marker 
      position={position} 
      icon={getNodeIcon(node)}
      draggable={isGestor && isActive}
      zIndexOffset={(isGestor && (isActive || isSelected)) ? 100 : 0}
      eventHandlers={{
        click: (e) => {
           if(isGestor) {
             if(e.originalEvent.shiftKey) toggleSelection(node.id);
             else setActiveNodeId(node.id);
           }
        },
        drag: (e) => {
          if(isGestor) {
             setPosition(e.target.getLatLng());
          }
        },
        dragend: (e) => {
          if(isGestor) {
            const pos = e.target.getLatLng();
            setPosition(pos);
            updateNodePosition(node.id, pos.lat, pos.lng);
            setActiveNodeId(node.id);
          }
        }
      }}
    >
      {showLabel && (
        <Tooltip direction="top" opacity={1}>
          <div className="font-bold text-sm">
             {isActive ? '✏️ ' : ''}
             {isSelected ? '🟠 ' : ''}
             {node.label}
          </div>
        </Tooltip>
      )}
    </Marker>
  );
};

const MapComponent = ({ isGestor = false, isMotorista = false, isOperador = false, vehiclePos = null, overridePath = null, onMapMoveEnd = null, followMode = false, onFollowDisable = null, followPosition = null }) => {
  const { 
    nodes, edges, originalEdges, edgeStatuses, updateEdgeStatus, removeEdgeEvent, 
    addPendingAlert, updateNodePosition, activeNodeId, setActiveNodeId, 
    selectedNodes, toggleNodeSelection, activeOrder, globalVehiclePos, 
    splitEdge, activePath, vehicles, nearestVehicleId, mapSettings 
  } = useGraph();
  const [selectedEdgeForReport, setSelectedEdgeForReport] = React.useState(null);
  const [edgeContextMenu, setEdgeContextMenu] = React.useState(null);

  const submitReport = (status) => {
     if(status === 'normal') {
        setSelectedEdgeForReport(null);
        return;
     }
     const reportSource = selectedEdgeForReport;
     const payload = {
        id: Date.now().toString() + Math.random().toString().slice(2,5),
        type: status,
        lat: reportSource.lat,
        lng: reportSource.lng
     };
     if(isGestor) {
        updateEdgeStatus(reportSource.edgeId, payload);
     } else {
        addPendingAlert({ edgeId: reportSource.edgeId, status, reportedBy: isMotorista ? 'Motorista' : 'Operador', lat: payload.lat, lng: payload.lng });
     }
     setSelectedEdgeForReport(null);
  };

  const graphPolylines = useMemo(() => {
    const lines = [];
    const drawn = new Set();

    for (const fromNode in originalEdges) {
      if(!nodes[fromNode]) continue;
      const fromCoords = [nodes[fromNode].lat, nodes[fromNode].lng];
      for (const toNode in originalEdges[fromNode]) {
        if(!nodes[toNode]) continue;
        const edgeId = [fromNode, toNode].sort().join('-');
        if (!drawn.has(edgeId)) {
          drawn.add(edgeId);
          const toCoords = [nodes[toNode].lat, nodes[toNode].lng];
          lines.push({ 
            id: edgeId, 
            positions: [fromCoords, toCoords],
            statusObj: edgeStatuses[edgeId] || { events: [] }
          });
        }
      }
    }
    return lines;
  }, [nodes, originalEdges, edgeStatuses]);

  const shortestPathNodes = useMemo(() => {
    if (overridePath) return overridePath;
    return (activeOrder && activePath) ? activePath : [];
  }, [overridePath, activeOrder, activePath]);

  const pathCoordinates = shortestPathNodes.map(nodeId => {
    if(nodes[nodeId]) return [nodes[nodeId].lat, nodes[nodeId].lng];
    return null;
  }).filter(Boolean);

  const getNodeIcon = (node) => {
    if (node.isPOI === false && node.id !== activeNodeId && !selectedNodes.includes(node.id)) return customWaypointIcon;
    if (selectedNodes.includes(node.id)) return customSelectedNodeIcon;
    if (node.id === activeNodeId) return customActiveNodeIcon;
    return customNodeIcon;
  };

  // Calcula a posição para o follow da câmera
  const cameraFollowPos = followPosition || (globalVehiclePos ? [globalVehiclePos.lat, globalVehiclePos.lng] : null);

  return (
    <div className="w-full h-full relative z-0 transition-all duration-500">
      <MapContainer center={centerPosition} zoom={15} className="w-full h-full" zoomControl={false}>
        <MapEventsHandler onMapMoveEnd={onMapMoveEnd} />
        
        {/* Câmera Inteligente — Segue o veículo (qualquer perfil) */}
        {cameraFollowPos && (
           <MapFollowVehicle 
             position={cameraFollowPos}
             followMode={followMode}
             onUserDrag={onFollowDisable}
             frozen={!!edgeContextMenu || !!selectedEdgeForReport}
           />
        )}
        
        {/* FlyTo automático para o radar do Operador */}
        {nearestVehicleId && isOperador && (
           <MapFlyTo 
             position={
               (() => {
                  const v = vehicles.find(vec => vec.id === nearestVehicleId);
                  const node = v ? nodes[v.lastNodeId] || nodes[v.homeBaseNodeId] || Object.values(nodes)[0] : null;
                  return node ? [node.lat, node.lng] : null;
               })()
             }
           />
        )}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {graphPolylines.map(line => {
           let strokeColor = '#64748b';
           let hasBlock = false;
           let hasBad = false;
           
           if (line.statusObj && line.statusObj.events) {
              line.statusObj.events.forEach(ev => {
                 if (ev.type === 'interditado' || ev.type === 'manutencao' || ev.type === 'bloqueio') hasBlock = true;
                 if (ev.type === 'ruim' || ev.type === 'congestionado') hasBad = true;
              });
           }
           if (hasBlock) strokeColor = '#ef4444';
           else if (hasBad) strokeColor = '#f97316';
           
           return (
             <React.Fragment key={line.id}>
               <Polyline 
                 positions={line.positions} 
                 color={strokeColor} 
                 weight={isGestor ? 8 : 4} 
                 opacity={1}
                 dashArray={(!hasBlock && !hasBad) ? "5, 5" : null} 
                 eventHandlers={{
                   click: (e) => {
                      if (isGestor) {
                         if (onFollowDisable) onFollowDisable();
                         setEdgeContextMenu({ edgeId: line.id, lat: e.latlng.lat, lng: e.latlng.lng });
                      } else {
                         setSelectedEdgeForReport({ edgeId: line.id, lat: e.latlng.lat, lng: e.latlng.lng });
                      }
                   }
                 }}
                 pathOptions={{ className: 'cursor-pointer transition-all' }}
               />
               {line.statusObj && line.statusObj.events && line.statusObj.events.map(ev => (
                 <Marker 
                   key={ev.id}
                   position={[ev.lat, ev.lng]} 
                   icon={getWarningIcon(ev.type)}
                   zIndexOffset={500}
                   eventHandlers={{
                      click: (e) => {
                         L.DomEvent.stopPropagation(e);
                         if(isGestor && window.confirm("Remover esta ocorrência?")) {
                            removeEdgeEvent(line.id, ev.id);
                         }
                      }
                   }}
                 >
                    <Tooltip direction="top" opacity={1}>
                      <div className="font-bold text-xs capitalize">Clique para Limpar: {ev.type}</div>
                    </Tooltip>
                 </Marker>
               ))}
             </React.Fragment>
           );
        })}

        {pathCoordinates.length > 0 && (
           <>
              <Polyline 
                positions={pathCoordinates} 
                color="#22c55e" 
                weight={6}
                opacity={isMotorista ? 0.9 : 0.6}
                className="pointer-events-none"
                interactive={false}
              />
           </>
        )}

        {/* Visão de Gestor/Operador dos Nós e Pinos do Porto */}
        {Object.values(nodes).filter(node => mapSettings?.showSubNodes !== false || node.isPOI !== false).map(node => (
           <DraggableNodeMarker 
              key={node.id}
              node={node}
              isGestor={isGestor}
              isActive={node.id === activeNodeId}
              isSelected={selectedNodes.includes(node.id)}
              toggleSelection={toggleNodeSelection}
              setActiveNodeId={setActiveNodeId}
              updateNodePosition={updateNodePosition}
              getNodeIcon={getNodeIcon}
              showLabel={mapSettings?.showNodeLabels !== false}
           />
        ))}

        {/* Marcador Dinâmico e Flutuante do Caminhão - Ativo na Viagem */}
        {(vehiclePos || globalVehiclePos) && activeOrder && (
           <Marker position={[(vehiclePos || globalVehiclePos).lat, (vehiclePos || globalVehiclePos).lng]} icon={getDynamicTruckIcon(activeOrder.tipoVeiculo)} zIndexOffset={9999}>
              <Popup autoPan={false}>
                 <div className="font-bold uppercase text-xs">
                   {activeOrder.tipoVeiculo} EM SERVIÇO
                 </div>
              </Popup>
           </Marker>
        )}

        {/* Visão de Radar para o Operador (Frota Disponível) */}
        {isOperador && vehicles.filter(v => {
            if (!mapSettings?.showIdleVehicles && v.homeBaseNodeId && v.lastNodeId === v.homeBaseNodeId) return false;
            return true;
         }).map(v => {
           const vNode = nodes[v.lastNodeId] || nodes[v.homeBaseNodeId] || Object.values(nodes)[0];
           if (!vNode) return null;
           const isNearest = v.id === nearestVehicleId;
           return (
              <React.Fragment key={v.id}>
                 {isNearest && (
                   <Marker position={[vNode.lat, vNode.lng]} icon={pingIcon} zIndexOffset={9997} interactive={false} />
                 )}
                 <Marker 
                    position={[vNode.lat, vNode.lng]} 
                    icon={getDynamicTruckIcon(v.categoriaId)}
                    opacity={isNearest ? 1 : 0.6}
                    zIndexOffset={isNearest ? 9998 : 9000}
                 >
                    <Popup>
                       <div className="text-xs font-bold uppercase p-1">
                          {v.id} ({v.modelo}) <br/>
                          <span className={isNearest ? 'text-indigo-600 font-black' : 'text-slate-500'}>
                             {isNearest ? '🎯 MELHOR OPÇÃO (RADAR)' : 'Frota Disponível'}
                          </span>
                       </div>
                    </Popup>
                 </Marker>
              </React.Fragment>
           );
        })}

      </MapContainer>

       {/* Menu de Contexto do Gestor — Overlay HTML Puro (sobrevive a re-renders) */}
       {edgeContextMenu && (
          <div className="fixed inset-0 z-[9998]" onClick={() => setEdgeContextMenu(null)}>
             <div
                className="absolute bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl p-3 min-w-[220px] z-[9999] animate-in"
                style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
                onClick={(e) => e.stopPropagation()}
             >
                <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">📍 Via {edgeContextMenu.edgeId}</p>
                   <button onClick={() => setEdgeContextMenu(null)} className="text-slate-400 hover:text-red-500 transition text-lg font-bold leading-none ml-3" title="Fechar">&times;</button>
                </div>
                <div className="flex flex-col space-y-1.5">
                   <button
                      onClick={() => { setSelectedEdgeForReport({ edgeId: edgeContextMenu.edgeId, lat: edgeContextMenu.lat, lng: edgeContextMenu.lng }); setEdgeContextMenu(null); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-900/30 dark:hover:bg-amber-800/50 text-amber-700 dark:text-amber-400 text-xs font-bold transition-colors border border-amber-200 dark:border-amber-700"
                   >⚠️ Reportar Ocorrência</button>
                   <button
                      onClick={() => { splitEdge(edgeContextMenu.edgeId, edgeContextMenu.lat, edgeContextMenu.lng); setEdgeContextMenu(null); }}
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-800/50 text-indigo-700 dark:text-indigo-400 text-xs font-bold transition-colors border border-indigo-200 dark:border-indigo-700"
                   >➕ Inserir Novo Nó</button>
                   <button
                      disabled
                      className="w-full text-left px-3 py-2.5 rounded-lg bg-slate-50 dark:bg-slate-800 text-slate-400 text-xs font-bold border border-slate-200 dark:border-slate-700 cursor-not-allowed opacity-60"
                   >⚙️ Configurações da Via</button>
                </div>
             </div>
          </div>
       )}

      {/* Report Modal (Operador/Motorista — ou Gestor via Menu de Contexto) */}
      {selectedEdgeForReport && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 rounded-xl shadow-2xl w-80 text-slate-800 dark:text-white transition-colors duration-300">
               <h3 className="font-bold text-lg mb-1 flex items-center">
                 <span className="text-yellow-500 mr-2">⚠️</span> Alerta de Condição
               </h3>
               <p className="text-slate-500 dark:text-gray-400 text-xs mb-4">Selecione o estado do trecho <span className="font-bold text-indigo-400">{selectedEdgeForReport.edgeId}</span>.</p>
               
               <div className="grid grid-cols-1 gap-2 mb-4">
                  <button onClick={() => submitReport('normal')} className="bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700 py-3 rounded text-sm transition font-bold shadow-sm dark:shadow-lg">✅ Liberada (Normal)</button>
                  <button onClick={() => submitReport('ruim')} className="bg-orange-50 dark:bg-orange-600/20 hover:bg-orange-100 dark:hover:bg-orange-600/40 text-orange-600 dark:text-orange-400 border border-orange-300 dark:border-orange-600/50 py-3 rounded text-sm transition font-bold shadow-sm dark:shadow-lg">🚧 Rua Ruim / Esburacada</button>
                  <button onClick={() => submitReport('congestionado')} className="bg-yellow-50 dark:bg-yellow-600/20 hover:bg-yellow-100 dark:hover:bg-yellow-600/40 text-yellow-600 dark:text-yellow-400 border border-yellow-300 dark:border-yellow-600/50 py-3 rounded text-sm transition font-bold shadow-sm dark:shadow-lg">🚥 Congestionamento</button>
                  <button onClick={() => submitReport('interditado')} className="bg-red-50 dark:bg-red-600/20 hover:bg-red-100 dark:hover:bg-red-600/40 text-red-600 dark:text-red-500 border border-red-300 dark:border-red-600/50 py-3 rounded text-sm transition font-bold shadow-sm dark:shadow-lg">❌ Via Interditada</button>
                  <button onClick={() => submitReport('manutencao')} className="bg-purple-50 dark:bg-purple-600/20 hover:bg-purple-100 dark:hover:bg-purple-600/40 text-purple-600 dark:text-purple-400 border border-purple-300 dark:border-purple-600/50 py-3 rounded text-sm transition font-bold shadow-sm dark:shadow-lg">🏗️ Em Obras / Manutenção</button>
               </div>
               
               <button onClick={() => setSelectedEdgeForReport(null)} className="w-full text-center text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-white transition py-2 text-sm uppercase tracking-wider font-bold">Cancelar</button>
            </div>
         </div>
      )}
    </div>
  );
};

export default MapComponent;

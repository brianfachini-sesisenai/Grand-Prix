import React, { createContext, useState, useContext, useEffect, useRef, useMemo } from 'react';
import { nodes as initialNodes, edges as initialEdges } from '../utils/graphData';
import L from 'leaflet';
import { dijkstra } from '../utils/dijkstra';
import { calculateDistance } from '../utils/haversine';
import { useAuth } from './AuthContext';
import { formatLogTime } from '../utils/formatLog';

const GraphContext = createContext();

export const useGraph = () => useContext(GraphContext);

export const GraphProvider = ({ children }) => {
  const { currentUser } = useAuth();

  // --- Estados de Malha e Base ---
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('tmpm_nodes');
    return saved ? JSON.parse(saved) : initialNodes;
  });
  const [edges, setEdges] = useState(() => {
    const saved = localStorage.getItem('tmpm_edges');
    return saved ? JSON.parse(saved) : initialEdges;
  });
  const [categories, setCategories] = useState(() => {
     const saved = localStorage.getItem('tmpm_categories');
     return saved ? JSON.parse(saved) : [
        { id: 'inspecao', nome: 'Viatura de Inspeção (Leve)' },
        { id: 'munck', nome: 'Caminhão de Manutenção (Médio)' },
        { id: 'comboio', nome: 'Comboio de Abastecimento (Pesado)' },
        { id: 'resgate', nome: 'Ambulância (Resgate)' }
     ];
  });
  const [vehicles, setVehicles] = useState(() => {
     const saved = localStorage.getItem('tmpm_vehicles');
     return saved ? JSON.parse(saved) : [];
  });

  // --- Telemetria e Gêmeo Digital ---
  const [activeOrder, setActiveOrder] = useState(null);
  const [globalVehiclePos, setGlobalVehiclePos] = useState(null);
  const [isMoving, setIsMoving] = useState(false);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [activePath, setActivePath] = useState([]);
  const [distanceToNext, setDistanceToNext] = useState(0);
  const [nextWaypointLabel, setNextWaypointLabel] = useState('');
  const [lastPassedNodeState, setLastPassedNodeState] = useState(null);
  const vehiclePosRef = useRef(null);
  const tripStartTimeRef = useRef(null);
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // --- Alertas e Inteligência ---
  const [uTurnStatus, setUTurnStatus] = useState(null); // null | 'warning' | 'success'
  const [noPathAlert, setNoPathAlert] = useState(false);
  const [nearestVehicleId, setNearestVehicleId] = useState(null);

  // --- Gestão Colaborativa de Vias ---
  const [edgeStatuses, setEdgeStatuses] = useState(() => {
    try {
      const saved = localStorage.getItem('tmpm_edgeStatuses');
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      const migrated = {};
      for (let edgeId in parsed) {
        if (typeof parsed[edgeId] === 'string') {
          migrated[edgeId] = { events: [{ id: Date.now().toString() + Math.random().toString().slice(2,5), type: parsed[edgeId], lat: -2.5647, lng: -44.3725 }] };
        } else {
          migrated[edgeId] = parsed[edgeId];
        }
      }
      return migrated;
    } catch(e) { return {}; }
  });
  const [pendingAlerts, setPendingAlerts] = useState(() => {
     const saved = localStorage.getItem('tmpm_pendingAlerts');
     return saved ? JSON.parse(saved) : [];
  });
  const [operatorAlerts, setOperatorAlerts] = useState(() => {
     const saved = localStorage.getItem('tmpm_operatorAlerts');
     return saved ? JSON.parse(saved) : [];
  });
  const [driverStatuses, setDriverStatuses] = useState(() => {
     const saved = localStorage.getItem('tmpm_driverStatuses');
     return saved ? JSON.parse(saved) : {};
  });
  const [tripHistory, setTripHistory] = useState(() => {
     const saved = localStorage.getItem('tmpm_tripHistory');
     return saved ? JSON.parse(saved) : [];
  });
  const [auditLogs, setAuditLogs] = useState(() => {
     const saved = localStorage.getItem('tmpm_auditLogs');
     return saved ? JSON.parse(saved) : [];
  });

  // --- UI State (Editor) ---
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [selectedNodes, setSelectedNodes] = useState([]);

  // --- Persistência de Dados ---
  useEffect(() => { localStorage.setItem('tmpm_nodes', JSON.stringify(nodes)); }, [nodes]);
  useEffect(() => { localStorage.setItem('tmpm_edges', JSON.stringify(edges)); }, [edges]);
  useEffect(() => { localStorage.setItem('tmpm_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('tmpm_vehicles', JSON.stringify(vehicles)); }, [vehicles]);
  useEffect(() => { localStorage.setItem('tmpm_edgeStatuses', JSON.stringify(edgeStatuses)); }, [edgeStatuses]);
  useEffect(() => { localStorage.setItem('tmpm_pendingAlerts', JSON.stringify(pendingAlerts)); }, [pendingAlerts]);
  useEffect(() => { localStorage.setItem('tmpm_operatorAlerts', JSON.stringify(operatorAlerts)); }, [operatorAlerts]);
  useEffect(() => { localStorage.setItem('tmpm_driverStatuses', JSON.stringify(driverStatuses)); }, [driverStatuses]);
  useEffect(() => { localStorage.setItem('tmpm_tripHistory', JSON.stringify(tripHistory)); }, [tripHistory]);
  useEffect(() => { localStorage.setItem('tmpm_auditLogs', JSON.stringify(auditLogs)); }, [auditLogs]);

  // --- Funções Auxiliares ---
  const addTripLog = (trip) => {
    setTripHistory(prev => [{...trip, timestamp: new Date().toLocaleTimeString(), id: Date.now()}, ...prev]);
  };
  const addAuditLog = (msg) => {
    const ts = formatLogTime();
    console.log(ts, msg);
    setAuditLogs(prev => [{msg: `${ts} ${msg}`, timestamp: ts, id: Date.now()}, ...prev]);
  };
  const addOperatorAlert = (msg) => {
    setOperatorAlerts(prev => [{ id: Date.now().toString(), msg, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev]);
  };
  const ackOperatorAlert = (id) => {
    setOperatorAlerts(prev => prev.filter(al => al.id !== id));
  };
  const updateDriverStatus = (matricula, status) => {
    setDriverStatuses(prev => ({ ...prev, [matricula]: status }));
  };
  const toggleNodeSelection = (id) => {
    setSelectedNodes(prev => prev.includes(id) ? prev.filter(nodeId => nodeId !== id) : [...prev, id] );
  };

  const updateNodePosition = (id, newLat, newLng) => {
    setNodes(prev => ({ ...prev, [id]: { ...prev[id], lat: newLat, lng: newLng } }));
    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      const movedNode = { ...nodes[id], lat: newLat, lng: newLng };
      if(newEdges[id]) {
        for(let targetId in newEdges[id]) {
          const targetNode = nodes[targetId];
          if(!targetNode) continue;
          const dist = Math.round(L.latLng(movedNode.lat, movedNode.lng).distanceTo(L.latLng(targetNode.lat, targetNode.lng)));
          newEdges[id][targetId] = dist;
          if(newEdges[targetId] && newEdges[targetId][id] !== undefined) newEdges[targetId][id] = dist;
        }
      }
      return newEdges;
    });
  };

  const updateEdgeStatus = (edgeId, eventPayload) => {
    setEdgeStatuses(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if (eventPayload === 'normal') delete copy[edgeId];
      else {
         if (!copy[edgeId]) copy[edgeId] = { events: [] };
         copy[edgeId].events.push(eventPayload);
      }
      return copy;
    });
    setPendingAlerts(prev => prev.filter(alert => alert.edgeId !== edgeId));
    addAuditLog(`Via ${edgeId} alterada com evento: ${eventPayload.type ? eventPayload.type.toUpperCase() : 'NORMAL'}`);
  };

  const removeEdgeEvent = (edgeId, eventId) => {
    setEdgeStatuses(prev => {
      const copy = JSON.parse(JSON.stringify(prev));
      if(copy[edgeId] && copy[edgeId].events) {
         copy[edgeId].events = copy[edgeId].events.filter(ev => ev.id !== eventId);
         if(copy[edgeId].events.length === 0) delete copy[edgeId];
      }
      return copy;
    });
    addAuditLog(`🗑️ Evento removido da via ${edgeId}`);
  };

  const addPendingAlert = (alert) => setPendingAlerts(prev => [...prev, { ...alert, id: Date.now().toString() }]);
  const rejectAlert = (id) => setPendingAlerts(prev => prev.filter(alert => alert.id !== id));

  const toggleEdgeStatus = (edgeId) => {
    const current = edgeStatuses[edgeId];
    if (current && current.events && current.events.length > 0) updateEdgeStatus(edgeId, 'normal');
    else updateEdgeStatus(edgeId, { id: Date.now().toString(), type: 'interditado', lat: -2.5647, lng: -44.3725 });
  };

  const syncNodeConnections = (nodeId, connectedIds, allNodesCopy) => {
    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      if(!newEdges[nodeId]) newEdges[nodeId] = {};
      for(let other in newEdges[nodeId]) { if(newEdges[other]) delete newEdges[other][nodeId]; }
      newEdges[nodeId] = {};
      connectedIds.forEach(targetId => {
         const nodeA = allNodesCopy[nodeId];
         const nodeB = allNodesCopy[targetId];
         if(nodeA && nodeB) {
            const dist = Math.round(L.latLng(nodeA.lat, nodeA.lng).distanceTo(L.latLng(nodeB.lat, nodeB.lng)));
            newEdges[nodeId][targetId] = dist;
            if(!newEdges[targetId]) newEdges[targetId] = {};
            newEdges[targetId][nodeId] = dist;
         }
      });
      return newEdges;
    });
  };

  const addNode = (nodeData, connectedIds) => {
    const isPOI = nodeData.isPOI !== undefined ? nodeData.isPOI : true;
    const newNodeObj = { ...nodeData, isPOI };
    setNodes(prev => ({ ...prev, [nodeData.id]: newNodeObj }));
    // Sincronizar arestas com os nós actualizados
    setNodes(currentNodes => {
      syncNodeConnections(nodeData.id, connectedIds, { ...currentNodes, [nodeData.id]: newNodeObj });
      return currentNodes;
    });
    addAuditLog(`Novo Nó Adicionado: ${nodeData.id}`);
  };

  const updateNode = (nodeId, nodeData, connectedIds) => {
    setNodes(prev => {
      const existing = prev[nodeId] || {};
      const updated = { ...existing, ...nodeData, id: nodeId };
      return { ...prev, [nodeId]: updated };
    });
    // Sincronizar arestas com os nós actualizados
    setNodes(currentNodes => {
      if (connectedIds) {
        syncNodeConnections(nodeId, connectedIds, currentNodes);
      }
      return currentNodes;
    });
    addAuditLog(`Nó Atualizado: ${nodeId} (${nodeData.label || nodeId})`);
  };

  const deleteNode = (id) => {
    if(activeNodeId === id) setActiveNodeId(null);
    setNodes(prev => { const n = {...prev}; delete n[id]; return n; });
    setEdges(prev => {
      const e = JSON.parse(JSON.stringify(prev));
      delete e[id];
      for(let o in e) if(e[o] && e[o][id] !== undefined) delete e[o][id];
      return e;
    });
    setEdgeStatuses(prev => {
      const s = {...prev};
      for(let k in s) if(k.split('-').includes(id)) delete s[k];
      return s;
    });
    setSelectedNodes(prev => prev.filter(n => n !== id));
  };

  const deleteMultipleNodes = (ids) => {
    ids.forEach(id => deleteNode(id));
    setSelectedNodes([]);
  };

  const splitEdge = (edgeId, lat, lng) => {
    const [nodeA, nodeB] = edgeId.split('-');
    const newId = `N${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
    setNodes(prev => ({ ...prev, [newId]: { id: newId, lat, lng, label: 'Novo Waypoint', isPOI: false } }));
    setEdges(prev => {
      const e = JSON.parse(JSON.stringify(prev));
      const nA = nodes[nodeA], nB = nodes[nodeB];
      if (nA && nB) {
         const distAM = Math.round(calculateDistance(nA.lat, nA.lng, lat, lng));
         const distMB = Math.round(calculateDistance(lat, lng, nB.lat, nB.lng));
         delete e[nodeA][nodeB]; delete e[nodeB][nodeA];
         if(!e[nodeA]) e[nodeA] = {}; e[nodeA][newId] = distAM;
         if(!e[newId]) e[newId] = {}; e[newId][nodeA] = distAM; e[newId][nodeB] = distMB;
         if(!e[nodeB]) e[nodeB] = {}; e[nodeB][newId] = distMB;
      }
      return e;
    });
    setEdgeStatuses(prev => { const c = {...prev}; delete c[edgeId]; return c; });
  };

  const importData = (data) => {
    if (data.nodes) setNodes(data.nodes);
    if (data.edges) setEdges(data.edges);
    if (data.categories) setCategories(data.categories);
    if (data.vehicles) setVehicles(data.vehicles);
  };

  // Helper para calcular o peso total de um caminho para tomada de decisão
  const getPathWeight = (path) => {
    if (!path || path.length < 2) return 0;
    let weight = 0;
    for (let i = 0; i < path.length - 1; i++) {
        const from = path[i];
        const to = path[i+1];
        const edgeWeight = simulatedEdges[from]?.[to];
        if (edgeWeight === undefined || edgeWeight === Infinity) return Infinity;
        weight += edgeWeight;
    }
    return weight;
  };

  // --- Motor Core (Modelo Matemático) ---
  const simulatedEdges = useMemo(() => {
    let simulated = {};
    for (let fromNode in edges) {
      simulated[fromNode] = {};
      for (let toNode in edges[fromNode]) {
        if(!nodes[fromNode] || !nodes[toNode]) continue;
        const edgeId = [fromNode, toNode].sort().join('-');
        let weight = edges[fromNode][toNode];
        const statusObj = edgeStatuses[edgeId];
        if (statusObj && statusObj.events && statusObj.events.length > 0) {
           let hasBlock = statusObj.events.some(ev => ['interditado', 'manutencao', 'bloqueio'].includes(ev.type));
           let hasBad = statusObj.events.some(ev => ['ruim', 'congestionado'].includes(ev.type));
           if (hasBlock) weight = Infinity;
           else if (hasBad) weight *= 3;
        }
        simulated[fromNode][toNode] = weight;
      }
    }
    return simulated;
  }, [edges, nodes, edgeStatuses]);

  // --- INÍCIO DO SIMULADOR GLOBAL ---
  const isActive = Boolean(activeOrder && activeOrder.origem && activeOrder.destino);
  const routeStart = activeOrder?.origem === 'closest' ? lastPassedNodeState : activeOrder?.origem;
  const routeEnd = activeOrder?.destino;

  // ============================================================
  // O CÉREBRO — useEffect reativo que controla a inteligência
  // de roteamento. Ele reage a mudanças na malha (bloqueios)
  // e reescreve o activePath. O motor (animate) é "burro" e
  // apenas interpola de activePath[0] para activePath[1].
  // ============================================================
  useEffect(() => {
     if (!isActive) {
       setActivePath([]);
       setNoPathAlert(false);
       return;
     }

     // 1. STANDBY / LARGADA — Veículo parado ou viagem não iniciada
     if (!isMoving || !vehiclePosRef.current) {
        const path = lastPassedNodeState ? dijkstra(simulatedEdges, lastPassedNodeState, routeEnd) : [];
        if (path.length === 0 && lastPassedNodeState) {
           setNoPathAlert(true);
        } else {
           setNoPathAlert(false);
        }
        setActivePath(path.filter((v,i,a) => v && v !== a[i-1]));
        return;
     }

     // 2. EM MOVIMENTO — O Cérebro reage a mudanças na malha viária
     if (activePath.length >= 2) {
        const currentNode = activePath[0]; // Nó de onde o veículo saiu (nas costas)
        const nextNode = activePath[1];     // Nó para onde o veículo está a ir (à frente)

        // A. BLOQUEIO SÚBITO — Aresta à frente tem peso Infinity
        if (simulatedEdges[currentNode]?.[nextNode] === Infinity) {
           // Calcular rota de fuga a partir do nó de trás
           const escapeRoute = dijkstra(simulatedEdges, currentNode, routeEnd);

           if (escapeRoute.length === 0) {
             setNoPathAlert(true);
             setIsMoving(false);
             return;
           }

           // INVERSÃO GEOMÉTRICA PURA:
           // [nextNode, currentNode, ...fuga] faz o motor "burro" ver que o
           // alvo imediato (activePath[1]) agora é currentNode, que fica
           // ATRÁS do veículo. Ele naturalmente faz marcha-atrás.
           const invertedPath = [nextNode, currentNode, ...escapeRoute.slice(1)];
           addAuditLog(`🔄 INVERSÃO DE ROTA: ${nextNode} → ${currentNode} (fuga via ${escapeRoute.slice(1).join(' → ')})`);

           setActivePath(invertedPath.filter((v,i,a) => v && v !== a[i-1]));
           setUTurnStatus('warning');
           setTimeout(() => setUTurnStatus(prev => prev === 'warning' ? null : prev), 6000);
           setNoPathAlert(false);
           return;
        }

        // B. RECÁLCULO DINÂMICO — Atualiza rota com base no estado atual da malha
        const freshRoute = dijkstra(simulatedEdges, nextNode, routeEnd);

        if (freshRoute.length === 0) {
           setNoPathAlert(true);
           setIsMoving(false);
           return;
        }

        const freshPath = [currentNode, ...freshRoute].filter((v,i,a) => v && v !== a[i-1]);

        if (JSON.stringify(freshPath) !== JSON.stringify(activePath)) {
           const currentWeight = getPathWeight(activePath);
           const freshWeight = getPathWeight(freshPath);

           // Toast de sucesso: veículo saiu de rota bloqueada para rota livre
           if (currentWeight === Infinity && freshWeight !== Infinity) {
             setUTurnStatus('success');
             setTimeout(() => setUTurnStatus(prev => prev === 'success' ? null : prev), 4000);
           }

            addAuditLog('✅ ROTA NORMALIZADA: via desbloqueada, retomando trajeto otimizado');
            setActivePath(freshPath);
        }
        setNoPathAlert(false);
     }
  }, [simulatedEdges, lastPassedNodeState, routeEnd, isActive, isMoving]);

  useEffect(() => {
    if (isActive && nodes[routeStart]) {
      if(!vehiclePosRef.current) {
        vehiclePosRef.current = { lat: nodes[routeStart].lat, lng: nodes[routeStart].lng };
        setGlobalVehiclePos(vehiclePosRef.current);
        setLastPassedNodeState(routeStart);
        setIsMoving(false);
        setCurrentSpeed(0);
        setEta(null);
        tripStartTimeRef.current = null;
      }
    } else {
      vehiclePosRef.current = null;
      setGlobalVehiclePos(null);
      setIsMoving(false);
      tripStartTimeRef.current = null;
    }
  }, [nodes, routeStart, isActive]);

  const animationRef = useRef();
  const lastTimeRef = useRef(null);

  useEffect(() => {
    if(!isMoving || !isActive || activePath.length < 2) {
       cancelAnimationFrame(animationRef.current);
       lastTimeRef.current = null;
       setCurrentSpeed(0);
       return;
    }

    const animate = (timestamp) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      if (!tripStartTimeRef.current) tripStartTimeRef.current = new Date().toLocaleTimeString('pt-BR');

      // MOTOR BURRO: Interpola cegamente de activePath[0] -> activePath[1]
      const targetNodeId = activePath[1]; 
      const targetNode = nodes[targetNodeId];
      if (!targetNode) return;

      const current = vehiclePosRef.current;
      const dx = targetNode.lng - current.lng;
      const dy = targetNode.lat - current.lat;
      const dist = Math.sqrt(dx*dx + dy*dy);
      
      const realDistToNext = calculateDistance(current.lat, current.lng, targetNode.lat, targetNode.lng);
      setDistanceToNext(realDistToNext);
      setNextWaypointLabel(targetNode.label);

      let totalRemainingDist = realDistToNext;
      for (let i = 1; i < activePath.length - 1; i++) {
         const nA = nodes[activePath[i]], nB = nodes[activePath[i+1]];
         if(nA && nB) totalRemainingDist += calculateDistance(nA.lat, nA.lng, nB.lat, nB.lng);
      }

      const speedDegreesPerMs = (0.000008 * simulationSpeed);
      const degreeTraveled = speedDegreesPerMs * deltaTime;

      if (dist < degreeTraveled) {
         // Chegou ao nó-alvo: avança para o próximo segmento
         vehiclePosRef.current = { lat: targetNode.lat, lng: targetNode.lng };
         setGlobalVehiclePos(vehiclePosRef.current);
         if (targetNodeId === routeEnd) {
             setIsMoving(false);
             addTripLog({
                 ...activeOrder,
                 condutor: currentUser?.nome || 'Motorista',
                 startTime: tripStartTimeRef.current,
                 endTime: new Date().toLocaleTimeString('pt-BR')
             });
             if (activeOrder.assignedVehicleId) {
                setVehicles(prev => prev.map(v => v.id === activeOrder.assignedVehicleId ? { ...v, lastNodeId: routeEnd } : v));
             }
             lastTimeRef.current = null;
             tripStartTimeRef.current = null;
             setTimeout(() => setActiveOrder(null), 3000);
             return;
         } else {
             // Sinaliza que passou pelo nó e remove-o do caminho
             setLastPassedNodeState(targetNodeId);
             setActivePath(prev => prev.slice(1));
         }
      } else {
         vehiclePosRef.current = {
            lat: current.lat + (dy/dist) * degreeTraveled,
            lng: current.lng + (dx/dist) * degreeTraveled
         };
         setGlobalVehiclePos({...vehiclePosRef.current});
         const baseKmH = 38 + (Math.random() * 4 - 2);
         const currentKmH = Math.round(baseKmH * simulationSpeed);
         setCurrentSpeed(currentKmH);
         const speedMs = currentKmH / 3.6;
         if (speedMs > 0) {
            const etaSeconds = Math.round(totalRemainingDist / speedMs);
            const etaMinutes = Math.max(1, Math.ceil(etaSeconds / 60));
            setEta(`${etaMinutes} min`);
         }
      }
      animationRef.current = requestAnimationFrame(animate);
    };
    animationRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [isMoving, activePath, nodes, isActive, routeEnd, simulationSpeed]);

  return (
    <GraphContext.Provider value={{
      nodes, edges: simulatedEdges, originalEdges: edges,
      edgeStatuses, updateEdgeStatus, removeEdgeEvent,
      addPendingAlert, rejectAlert, pendingAlerts,
      tripHistory, addTripLog, auditLogs, addAuditLog,
      updateNodePosition, toggleEdgeStatus, addNode, updateNode, deleteNode, deleteMultipleNodes, splitEdge,
      activeNodeId, setActiveNodeId, selectedNodes, toggleNodeSelection,
      activeOrder, setActiveOrder, globalVehiclePos, isMoving, setIsMoving,
      currentSpeed, eta, activePath, setActivePath, distanceToNext, nextWaypointLabel,
      uTurnStatus, setUTurnStatus,
      noPathAlert, setNoPathAlert,
      nearestVehicleId, setNearestVehicleId,
      categories, setCategories, vehicles, setVehicles,
      driverStatuses, updateDriverStatus,
      operatorAlerts, addOperatorAlert, ackOperatorAlert,
      importData, simulationSpeed, setSimulationSpeed
    }}>
      {children}
    </GraphContext.Provider>
  );
};

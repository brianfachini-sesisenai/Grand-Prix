import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { nodes as initialNodes, edges as initialEdges } from '../utils/graphData';
import L from 'leaflet';
import { dijkstra } from '../utils/dijkstra';
import { calculateDistance } from '../utils/haversine';
import { useAuth } from './AuthContext';

const GraphContext = createContext();

export const useGraph = () => useContext(GraphContext);

export const GraphProvider = ({ children }) => {
  const [nodes, setNodes] = useState(() => {
    const saved = localStorage.getItem('tmpm_nodes');
    return saved ? JSON.parse(saved) : initialNodes;
  });
  const [edges, setEdges] = useState(() => {
    const saved = localStorage.getItem('tmpm_edges');
    return saved ? JSON.parse(saved) : initialEdges;
  });
  const [blockedEdges, setBlockedEdges] = useState(new Set());
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [globalVehiclePos, setGlobalVehiclePos] = useState(null);
  const { currentUser } = useAuth();
  
  // Gestão de Frotas
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

  useEffect(() => { localStorage.setItem('tmpm_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('tmpm_vehicles', JSON.stringify(vehicles)); }, [vehicles]);
  
  // Telemetria Global e Gêmeo Digital
  const [isMoving, setIsMoving] = useState(false);
  const tripStartTimeRef = useRef(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [eta, setEta] = useState(null);
  const [activePath, setActivePath] = useState([]);
  const [distanceToNext, setDistanceToNext] = useState(0);
  const [nextWaypointLabel, setNextWaypointLabel] = useState('');
  
  const vehiclePosRef = useRef(null);
  const [lastPassedNodeState, setLastPassedNodeState] = useState('N1');
  
  // Novos estados para a Gestão Colaborativa de Vias
  const [edgeStatuses, setEdgeStatuses] = useState(() => {
     const saved = localStorage.getItem('tmpm_edgeStatuses');
     return saved ? JSON.parse(saved) : {};
  });
  const [pendingAlerts, setPendingAlerts] = useState(() => {
     const saved = localStorage.getItem('tmpm_pendingAlerts');
     return saved ? JSON.parse(saved) : [];
  });
  
  // Mensageria Operacional (Avisos de Contingência do Operador -> Gestor)
  const [operatorAlerts, setOperatorAlerts] = useState(() => {
     const saved = localStorage.getItem('tmpm_operatorAlerts');
     return saved ? JSON.parse(saved) : [];
  });
  const addOperatorAlert = (msg) => {
     setOperatorAlerts(prev => [{ id: Date.now().toString(), msg, timestamp: new Date().toLocaleTimeString('pt-BR') }, ...prev]);
  };
  const ackOperatorAlert = (id) => {
     setOperatorAlerts(prev => prev.filter(al => al.id !== id));
  };

  // Status Temporais de Jornada dos Motoristas
  const [driverStatuses, setDriverStatuses] = useState(() => {
     const saved = localStorage.getItem('tmpm_driverStatuses');
     return saved ? JSON.parse(saved) : {};
  });
  useEffect(() => { localStorage.setItem('tmpm_driverStatuses', JSON.stringify(driverStatuses)); }, [driverStatuses]);
  const updateDriverStatus = (matricula, status) => {
     setDriverStatuses(prev => ({ ...prev, [matricula]: status }));
  };
  
  const [tripHistory, setTripHistory] = useState(() => {
     const saved = localStorage.getItem('tmpm_tripHistory');
     return saved ? JSON.parse(saved) : [];
  });
  const [auditLogs, setAuditLogs] = useState(() => {
     const saved = localStorage.getItem('tmpm_auditLogs');
     return saved ? JSON.parse(saved) : [];
  });
  const [simulationSpeed, setSimulationSpeed] = useState(1);

  // Efetuar persistência sempre que malha ou logs mudarem
  useEffect(() => { localStorage.setItem('tmpm_edgeStatuses', JSON.stringify(edgeStatuses)); }, [edgeStatuses]);
  useEffect(() => { localStorage.setItem('tmpm_pendingAlerts', JSON.stringify(pendingAlerts)); }, [pendingAlerts]);
  useEffect(() => { localStorage.setItem('tmpm_operatorAlerts', JSON.stringify(operatorAlerts)); }, [operatorAlerts]);
  useEffect(() => { localStorage.setItem('tmpm_tripHistory', JSON.stringify(tripHistory)); }, [tripHistory]);
  useEffect(() => { localStorage.setItem('tmpm_auditLogs', JSON.stringify(auditLogs)); }, [auditLogs]);

  // Efetuar persistência sempre que malha mudar (nodes ou edges puros, ignorar status temporal)
  useEffect(() => {
     localStorage.setItem('tmpm_nodes', JSON.stringify(nodes));
  }, [nodes]);

  useEffect(() => {
     localStorage.setItem('tmpm_edges', JSON.stringify(edges));
  }, [edges]);

  const [selectedNodes, setSelectedNodes] = useState([]);

  const importData = (data) => {
    if (data.nodes) setNodes(data.nodes);
    if (data.edges) setEdges(data.edges);
    if (data.categories) setCategories(data.categories);
    if (data.vehicles) setVehicles(data.vehicles);
    addAuditLog('Dados importados com sucesso.');
  };

  const addTripLog = (trip) => {
    setTripHistory(prev => [{...trip, timestamp: new Date().toLocaleTimeString(), id: Date.now()}, ...prev]);
  };

  const addAuditLog = (msg) => {
    setAuditLogs(prev => [{msg, timestamp: new Date().toLocaleTimeString(), id: Date.now()}, ...prev]);
  };

  const toggleNodeSelection = (id) => {
    setSelectedNodes(prev => 
      prev.includes(id) ? prev.filter(nodeId => nodeId !== id) : [...prev, id]
    );
  };

  const updateNodePosition = (id, newLat, newLng) => {
    setNodes(prev => ({
      ...prev,
      [id]: { ...prev[id], lat: newLat, lng: newLng }
    }));
    
    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      const movedNode = { ...nodes[id], lat: newLat, lng: newLng };
      if(newEdges[id]) {
        for(let targetId in newEdges[id]) {
          const targetNode = nodes[targetId];
          if(!targetNode) continue;
          const dist = Math.round(L.latLng(movedNode.lat, movedNode.lng).distanceTo(L.latLng(targetNode.lat, targetNode.lng)));
          newEdges[id][targetId] = dist;
          if(newEdges[targetId] && newEdges[targetId][id] !== undefined) {
             newEdges[targetId][id] = dist;
          }
        }
      }
      return newEdges;
    });
  };

  const updateEdgeStatus = (edgeId, status) => {
    setEdgeStatuses(prev => {
      const copy = { ...prev };
      if (status === 'normal') {
         delete copy[edgeId];
      } else {
         copy[edgeId] = status;
      }
      return copy;
    });
    setPendingAlerts(prev => prev.filter(alert => alert.edgeId !== edgeId));
    addAuditLog(`Via ${edgeId} alterada para: ${status.toUpperCase()}`);
  };

  const addPendingAlert = (alert) => {
    setPendingAlerts(prev => [...prev, { ...alert, id: Date.now().toString() }]);
  };

  const rejectAlert = (id) => {
    setPendingAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const toggleEdgeStatus = (edgeId) => {
    const current = edgeStatuses[edgeId];
    if (current === 'interditado') {
       updateEdgeStatus(edgeId, 'normal');
    } else {
       updateEdgeStatus(edgeId, 'interditado');
    }
  };

  const syncNodeConnections = (nodeId, connectedIds, allNodesCopy) => {
    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      if(!newEdges[nodeId]) newEdges[nodeId] = {};
      
      for(let other in newEdges[nodeId]) {
         if(newEdges[other]) delete newEdges[other][nodeId];
      }
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
    setNodes(prev => {
      // Compatibility: Assume POI is true unless explicitly set to false
      const isPOI = nodeData.isPOI !== undefined ? nodeData.isPOI : true;
      const newNodes = { ...prev, [nodeData.id]: { ...nodeData, isPOI } };
      syncNodeConnections(nodeData.id, connectedIds, newNodes);
      return newNodes;
    });
    addAuditLog(`Novo Nó Adicionado à malha: ${nodeData.id} (${nodeData.label})`);
  };

  const updateNode = (id, nodeData, connectedIds) => {
    setNodes(prev => {
      const isPOI = nodeData.isPOI !== undefined ? nodeData.isPOI : (prev[id].isPOI !== false);
      const newNodes = { ...prev, [id]: { ...prev[id], ...nodeData, isPOI } };
      syncNodeConnections(id, connectedIds, newNodes);
      return newNodes;
    });
    addAuditLog(`Nó Editado na malha: ${id} (${nodeData.label})`);
  };

  const splitEdge = (edgeId, lat, lng) => {
    const [nodeA, nodeB] = edgeId.split('-');
    const newId = `N${Date.now().toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
    
    setNodes(prev => {
      const newNodes = {
          ...prev,
          [newId]: { id: newId, lat, lng, label: 'Novo Waypoint', isPOI: false }
      };
      return newNodes;
    });

    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      const nA = nodes[nodeA];
      const nB = nodes[nodeB];
      
      if (nA && nB) {
         const distAM = Math.round(calculateDistance(nA.lat, nA.lng, lat, lng));
         const distMB = Math.round(calculateDistance(lat, lng, nB.lat, nB.lng));
         
         if(newEdges[nodeA] && newEdges[nodeA][nodeB] !== undefined) delete newEdges[nodeA][nodeB];
         if(newEdges[nodeB] && newEdges[nodeB][nodeA] !== undefined) delete newEdges[nodeB][nodeA];
         
         if(!newEdges[nodeA]) newEdges[nodeA] = {};
         newEdges[nodeA][newId] = distAM;
         
         if(!newEdges[newId]) newEdges[newId] = {};
         newEdges[newId][nodeA] = distAM;
         newEdges[newId][nodeB] = distMB;
         
         if(!newEdges[nodeB]) newEdges[nodeB] = {};
         newEdges[nodeB][newId] = distMB;
      }
      return newEdges;
    });
    
    setEdgeStatuses(prev => {
       const copy = { ...prev };
       if(copy[edgeId]) delete copy[edgeId];
       return copy;
    });
    
    addAuditLog(`Aresta ${edgeId} subdividida (Novo Nó ${newId})`);
  };

  const deleteNode = (id) => {
    const nodeLabel = nodes[id]?.label;
    if(activeNodeId === id) setActiveNodeId(null);
    setNodes(prev => {
      const newNodes = { ...prev };
      delete newNodes[id];
      return newNodes;
    });
    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      delete newEdges[id];
      for(let other in newEdges) {
        if(newEdges[other] && newEdges[other][id] !== undefined) {
          delete newEdges[other][id];
        }
      }
      return newEdges;
    });
    setEdgeStatuses(prev => {
      const newObj = { ...prev };
      for (const edgeId in newObj) {
        if(edgeId.split('-').includes(id)) delete newObj[edgeId];
      }
      return newObj;
    });
    setSelectedNodes(prev => prev.filter(n => n !== id));
    addAuditLog(`Nó Excluído da malha: ${id} (${nodeLabel})`);
  };

  const deleteMultipleNodes = (ids) => {
    setNodes(prev => {
      const newNodes = { ...prev };
      ids.forEach(id => delete newNodes[id]);
      return newNodes;
    });
    setEdges(prev => {
      const newEdges = JSON.parse(JSON.stringify(prev));
      ids.forEach(id => {
        delete newEdges[id];
        for(let other in newEdges) {
          if(newEdges[other] && newEdges[other][id] !== undefined) {
            delete newEdges[other][id];
          }
        }
      });
      return newEdges;
    });
    setEdgeStatuses(prev => {
      const newObj = { ...prev };
      for (const edgeId in newObj) {
        const parts = edgeId.split('-');
        if(ids.includes(parts[0]) || ids.includes(parts[1])) delete newObj[edgeId];
      }
      return newObj;
    });
    if(ids.includes(activeNodeId)) setActiveNodeId(null);
    setSelectedNodes([]);
    addAuditLog(`${ids.length} Nós Excluídos em Massa.`);
  };

  // Motor Core: Cálculo dinâmico do modelo matemático
  const simulatedEdges = React.useMemo(() => {
    let simulated = {};
    for (let fromNode in edges) {
      simulated[fromNode] = {};
      for (let toNode in edges[fromNode]) {
        if(!nodes[fromNode] || !nodes[toNode]) continue;
        const edgeId = [fromNode, toNode].sort().join('-');
        
        let weight = edges[fromNode][toNode];
        const status = edgeStatuses[edgeId] || 'normal';
        
        if (status === 'ruim' || status === 'congestionado') {
            weight = weight * 3;
        } else if (status === 'interditado' || status === 'manutencao') {
            weight = Infinity;
        }
        
        simulated[fromNode][toNode] = weight;
      }
    }
    return simulated;
  }, [edges, nodes, edgeStatuses]);

  // ----- INÍCIO DO SIMULADOR GLOBAL -----
  const isActive = Boolean(activeOrder && activeOrder.origem && activeOrder.destino);
  const routeStart = activeOrder?.origem === 'closest' ? lastPassedNodeState : activeOrder?.origem;
  const routeEnd = activeOrder?.destino;

  useEffect(() => {
     if (!isActive) {
       setActivePath([]);
       return;
     }
     const path = dijkstra(simulatedEdges, lastPassedNodeState, routeEnd);
     setActivePath(path);
  }, [simulatedEdges, lastPassedNodeState, routeEnd, isActive]);

  useEffect(() => {
    if (isActive && nodes[routeStart]) {
      if(!vehiclePosRef.current) {
        vehiclePosRef.current = { lat: nodes[routeStart].lat, lng: nodes[routeStart].lng };
        setGlobalVehiclePos(vehiclePosRef.current);
        setLastPassedNodeState(routeStart);
        setIsMoving(false);
        setCurrentSpeed(0);
        setEta(null);
        tripStartTimeRef.current = null; // Reseta o relógio
      }
    } else {
      vehiclePosRef.current = null;
      setGlobalVehiclePos(null);
      setIsMoving(false);
      setCurrentSpeed(0);
      setEta(null);
      tripStartTimeRef.current = null;
    }
  }, [nodes, routeStart, isActive]); // Dependências básicas, evita re-setar se order contina

  // Engine Animation
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
      
      if (!tripStartTimeRef.current) {
         tripStartTimeRef.current = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      }

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

      // --- CÁLCULO DE ETA & VELOCIDADE (KM/H) ---
      let totalRemainingDist = realDistToNext;
      for (let i = 1; i < activePath.length - 1; i++) {
         const nA = nodes[activePath[i]];
         const nB = nodes[activePath[i+1]];
         if(nA && nB) totalRemainingDist += calculateDistance(nA.lat, nA.lng, nB.lat, nB.lng);
      }

      // Física do Veículo - Velocidade base simulada ~45km/h convertida p/ delta deg
      const speedDegreesPerMs = (0.000008 * simulationSpeed);
      const degreeTraveled = speedDegreesPerMs * deltaTime;

      if (dist < degreeTraveled) {
         vehiclePosRef.current = { lat: targetNode.lat, lng: targetNode.lng };
         setGlobalVehiclePos(vehiclePosRef.current);
         
         if (targetNodeId === routeEnd) {
             setIsMoving(false);
             setCurrentSpeed(0);
             setEta(null);
             addTripLog({
                 ...activeOrder,
                 condutor: currentUser?.nome || 'Motorista Desconhecido',
                 startTime: tripStartTimeRef.current || 'N/A',
                 endTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
             });
             
             // Atualiza a posição atual do veículo vencedor (estaciona ele na chegada)
             if (activeOrder.assignedVehicleId) {
                setVehicles(prev => prev.map(v => 
                   v.id === activeOrder.assignedVehicleId ? { ...v, lastNodeId: routeEnd } : v
                ));
             }
             
             lastTimeRef.current = null;
             tripStartTimeRef.current = null;
             setTimeout(() => setActiveOrder(null), 3000);
             return;
         } else {
             setLastPassedNodeState(targetNodeId);
         }
      } else {
         vehiclePosRef.current = {
            lat: current.lat + (dy/dist) * degreeTraveled,
            lng: current.lng + (dx/dist) * degreeTraveled
         };
         setGlobalVehiclePos({...vehiclePosRef.current});
         
         // Display Speed = speedDegreesPerMs traduzida p/ vida real: base 35km/h -> variavel 25-45
         // Vamos ser precisos: O deslocamento é puramente logico. Nós definimos que simulationSpeed 1.0 = ~40 km/h.
         const baseKmH = 38 + (Math.random() * 4 - 2); // 36 a 40 km/h natural
         const currentKmH = Math.round(baseKmH * simulationSpeed);
         setCurrentSpeed(currentKmH);
         
         // ETA (segundos) = Total M / (Km/H convert p/ m/s)
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
  // ----- FIM DO SIMULADOR GLOBAL -----

  return (
    <GraphContext.Provider value={{
      nodes, 
      edges: simulatedEdges, 
      originalEdges: edges,
      edgeStatuses, 
      updateEdgeStatus,
      addPendingAlert,
      rejectAlert,
      pendingAlerts,
      tripHistory,
      addTripLog,
      auditLogs,
      updateNodePosition, 
      toggleEdgeStatus, 
      addNode,
      updateNode,
      deleteNode,
      activeNodeId,
      setActiveNodeId,
      selectedNodes,
      toggleNodeSelection,
      deleteMultipleNodes,
      splitEdge,
      activeOrder,
      setActiveOrder,
      globalVehiclePos,
      setGlobalVehiclePos,
      categories,
      setCategories,
      vehicles,
      setVehicles,
      simulationSpeed,
      setSimulationSpeed,
      isMoving,
      setIsMoving,
      currentSpeed,
      eta,
      activePath,
      distanceToNext,
      nextWaypointLabel,
      driverStatuses,
      updateDriverStatus,
      operatorAlerts,
      addOperatorAlert,
      ackOperatorAlert,
      importData
    }}>
      {children}
    </GraphContext.Provider>
  );
};

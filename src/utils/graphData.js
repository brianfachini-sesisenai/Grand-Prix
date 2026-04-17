// Coordenadas próximas a [-2.5647, -44.3725] (Porto de Ponta da Madeira)
export const nodes = {
  N1: { id: 'N1', lat: -2.5550, lng: -44.3800, label: "Portaria Principal" },
  N2: { id: 'N2', lat: -2.5580, lng: -44.3770, label: "Rotatória de Acesso" },
  N3: { id: 'N3', lat: -2.5610, lng: -44.3750, label: "Virador de Vagões" },
  N4: { id: 'N4', lat: -2.5620, lng: -44.3775, label: "Balança" },
  N5: { id: 'N5', lat: -2.5640, lng: -44.3730, label: "Cruzamento Central" },
  N6: { id: 'N6', lat: -2.5660, lng: -44.3760, label: "Pátio de Minério Sul" },
  N7: { id: 'N7', lat: -2.5610, lng: -44.3700, label: "Pátio Norte" },
  N8: { id: 'N8', lat: -2.5665, lng: -44.3685, label: "Via Expressa de Carga" },
  N9: { id: 'N9', lat: -2.5680, lng: -44.3720, label: "Oficina de Manutenção" },
  N10: { id: 'N10', lat: -2.5630, lng: -44.3800, label: "Área Administrativa" },
  N11: { id: 'N11', lat: -2.5690, lng: -44.3650, label: "Acesso Píer I e II" },
  N12: { id: 'N12', lat: -2.5710, lng: -44.3620, label: "Píer I" },
  N13: { id: 'N13', lat: -2.5720, lng: -44.3650, label: "Píer II" },
  N14: { id: 'N14', lat: -2.5730, lng: -44.3680, label: "Acesso Píer III e IV" },
  N15: { id: 'N15', lat: -2.5760, lng: -44.3630, label: "Píer IV" }
};

// arestas com peso (distância simulada em metros)
export const edges = {
  N1: { N2: 200 },
  N2: { N1: 200, N3: 150, N4: 120, N10: 150 },
  N3: { N2: 150, N4: 100, N5: 200 },
  N4: { N2: 120, N3: 100, N10: 180 },
  N5: { N3: 200, N6: 250, N7: 300, N8: 300, N9: 350 },
  N6: { N5: 250, N9: 150 },
  N7: { N5: 300, N8: 400 },
  N8: { N5: 300, N7: 400, N9: 200, N11: 250 },
  N9: { N5: 350, N6: 150, N8: 200, N14: 400 },
  N10: { N2: 150, N4: 180 },
  N11: { N8: 250, N12: 150, N13: 180, N14: 300 },
  N12: { N11: 150 },
  N13: { N11: 180 },
  N14: { N9: 400, N11: 300, N15: 250 },
  N15: { N14: 250 }
};

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Gestor from './pages/Gestor';
import Metricas from './pages/Metricas';
import Motorista from './pages/Motorista';
import Operador from './pages/Operador';
import Login from './pages/Login';
import { GraphProvider } from './context/GraphContext';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <GraphProvider>
          <Router>
            <div className="h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-white flex flex-col transition-colors duration-300">
              <Navbar />
              <main className="flex-grow relative">
                <Routes>
                  <Route path="/operador" element={<Operador />} />
                  <Route path="/motorista" element={<Motorista />} />
                  <Route path="/gestor" element={<Gestor />} />
                  <Route path="/metricas" element={<Metricas />} />
                  <Route path="/" element={<Login />} />
                </Routes>
              </main>
            </div>
          </Router>
        </GraphProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;

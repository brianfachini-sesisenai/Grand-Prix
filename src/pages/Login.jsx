import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Login = () => {
  const [activeTab, setActiveTab] = useState('empregado'); // 'empregado' or 'visitante'
  
  const [loginId, setLoginId] = useState('');
  const [senha, setSenha] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [regData, setRegData] = useState({nome: '', matricula: '', cpf: '', senha: '', perfil: 'Operador'});
  
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const handleLogin = (e) => {
     e.preventDefault();
     setErrorMsg('');
     const user = login(loginId, senha);
     if (user) {
        navigate(`/${user.perfil.toLowerCase()}`);
     } else {
        setErrorMsg('Autenticação falhou. Verifique os dados inseridos.');
     }
  };

  const handleRegister = (e) => {
     e.preventDefault();
     register(regData);
     setIsRegisterModalOpen(false);
     setLoginId(regData.matricula);
     setSenha(regData.senha);
     alert("Conta Mock Criada com Sucesso! Faça o login.");
  };

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 bg-[url('https://images.unsplash.com/photo-1541888086425-d81bb19240f5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center z-[99999]">
       {/* Overlay escuro para imersão industrial */}
       <div className="absolute inset-0 bg-slate-900/85"></div>
       
       <div className="relative z-10 w-full max-w-md p-8 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-500">
          {/* Logo Placeholder */}
          <div className="flex flex-col items-center mb-8">
             <div className="w-16 h-16 bg-emerald-600 rounded-lg flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/20">
               <span className="text-4xl font-black text-amber-400 tracking-tighter">V</span>
             </div>
             <h1 className="text-xl font-bold text-slate-100 tracking-wide">TMPM</h1>
             <p className="text-xs text-amber-400 mt-1 uppercase tracking-widest font-semibold flex items-center">
               <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
               Roteirização Dinâmica
             </p>
          </div>

          <div className="transition-opacity duration-500 opacity-100">
             {/* Tabs */}
             <div className="flex w-full mb-6 relative">
                <div className="absolute bottom-0 left-0 w-full h-[1px] bg-slate-700"></div>
                <button 
                   type="button"
                   className={`flex-1 pb-3 text-sm font-semibold transition-all relative z-10 ${activeTab === 'empregado' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}
                   onClick={() => { setActiveTab('empregado'); setErrorMsg(''); }}
                >
                   Empregado / Terceiro
                </button>
                <button 
                   type="button"
                   className={`flex-1 pb-3 text-sm font-semibold transition-all relative z-10 ${activeTab === 'visitante' ? 'text-emerald-500 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-200'}`}
                   onClick={() => { setActiveTab('visitante'); setErrorMsg(''); }}
                >
                   Visitante
                </button>
             </div>

             <form onSubmit={handleLogin} className="space-y-4">
                {activeTab === 'empregado' ? (
                   <div className="animate-[fade-in_0.3s_ease-out]">
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">E-mail Corporativo ou Matrícula / CPF</label>
                        <input required type="text" className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner" placeholder="Ex: joao.silva@vale.com" value={loginId} onChange={(e) => setLoginId(e.target.value)} />
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Senha de Rede (SSO)</label>
                        <input required type="password" className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} />
                      </div>
                      {errorMsg && <p className="text-red-400 text-xs font-bold text-center">{errorMsg}</p>}
                      <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-emerald-600/30 mt-4 uppercase text-sm tracking-widest border border-emerald-500 hover:border-emerald-400">
                         Autenticar Acesso
                      </button>
                   </div>
                ) : (
                   <div className="animate-[fade-in_0.3s_ease-out]">
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Número do Crachá (VUSE)</label>
                        <input required type="text" className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner" placeholder="Ex: V1234567"/>
                      </div>
                      <div className="mb-4">
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 uppercase tracking-wide">Código do Anfitrião / PIN</label>
                        <input required type="password" className="w-full bg-slate-900/70 border border-slate-600 rounded-lg p-3 text-sm text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors shadow-inner" placeholder="••••••••"/>
                      </div>
                      <button type="button" onClick={() => alert("Acesso de Visitante Requer Autorização Biométrica Interna.")} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg shadow-emerald-600/30 mt-4 uppercase text-sm tracking-widest border border-emerald-500 hover:border-emerald-400">
                         Liberar Acesso Temporário
                      </button>
                   </div>
                )}
             </form>
          </div>

          {/* Footer Links & Mock Registrer */}
          <div className="mt-8 pt-6 border-t border-slate-700 flex flex-col space-y-4 items-center">
             <button onClick={() => setIsRegisterModalOpen(true)} className="text-[10px] text-amber-500/80 hover:text-amber-400 font-bold uppercase tracking-widest bg-amber-500/10 px-3 py-1.5 rounded transition shadow">🛠️ Criar Conta de Teste (Mock)</button>
             
             <div className="flex flex-col space-y-2 items-center">
                 <a href="#" className="text-[10px] text-gray-400 hover:text-emerald-400 transition-colors uppercase tracking-wider font-bold">Solicitar 2ª via de Crachá (ValeForms)</a>
                 <div className="flex space-x-4">
                    <a href="#" className="text-[10px] text-gray-500 hover:text-emerald-400 transition-colors">Esqueci minha senha</a>
                    <span className="text-gray-700 text-[10px]">|</span>
                    <a href="#" className="text-[10px] text-gray-500 hover:text-emerald-400 transition-colors">Suporte de TI Global</a>
                 </div>
             </div>
          </div>
       </div>

       {/* Mock Registration Modal */}
       {isRegisterModalOpen && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur z-[999999] flex items-center justify-center p-4">
             <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 w-full max-w-sm shadow-2xl relative">
                <h2 className="text-lg font-bold text-emerald-500 mb-4 flex items-center">
                   <span className="mr-2">⚙️</span> Ferramenta Mock de Usuário
                </h2>
                
                <form onSubmit={handleRegister} className="space-y-3">
                   <div>
                      <label className="text-xs text-gray-400 font-bold mb-1 block">Nome Completo</label>
                      <input required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-100" value={regData.nome} onChange={e => setRegData({...regData, nome: e.target.value})} placeholder="João da Silva" />
                   </div>
                   <div className="flex space-x-2">
                      <div className="w-1/2">
                         <label className="text-xs text-gray-400 font-bold mb-1 block">Matrícula (Login)</label>
                         <input required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-100" value={regData.matricula} onChange={e => setRegData({...regData, matricula: e.target.value})} placeholder="V12345" />
                      </div>
                      <div className="w-1/2">
                         <label className="text-xs text-gray-400 font-bold mb-1 block">CPF</label>
                         <input required className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-100" value={regData.cpf} onChange={e => setRegData({...regData, cpf: e.target.value})} placeholder="000.000.000-00" />
                      </div>
                   </div>
                   <div>
                      <label className="text-xs text-gray-400 font-bold mb-1 block">Senha (SSO Criptografado)</label>
                      <input required type="password" className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-100" value={regData.senha} onChange={e => setRegData({...regData, senha: e.target.value})} placeholder="••••••••" />
                   </div>
                   <div>
                      <label className="text-xs text-gray-400 font-bold mb-1 block">Perfil Habilitado no AD</label>
                      <select className="w-full bg-slate-800 border border-slate-600 rounded p-2 text-sm text-slate-100" value={regData.perfil} onChange={e => setRegData({...regData, perfil: e.target.value})}>
                         <option value="Operador">Operador (CCO)</option>
                         <option value="Motorista">Motorista (Frota)</option>
                         <option value="Gestor">Gestor de Malha (Engenharia)</option>
                      </select>
                   </div>
                   
                   <div className="flex space-x-3 pt-3">
                      <button type="button" onClick={() => setIsRegisterModalOpen(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white font-bold py-2 rounded transition text-sm">Cancelar</button>
                      <button type="submit" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded transition text-sm shadow">Criar Mock</button>
                   </div>
                </form>
             </div>
          </div>
       )}
    </div>
  );
};

export default Login;

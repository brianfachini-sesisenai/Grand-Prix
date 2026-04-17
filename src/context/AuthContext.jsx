import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Try to load from localStorage
    const savedUsers = JSON.parse(localStorage.getItem('tmpm_users')) || [];
    const savedSession = JSON.parse(localStorage.getItem('tmpm_session'));
    
    // Ensure default admin exists
    const hasAdmin = savedUsers.find(u => u.matricula === 'admin');
    if (!hasAdmin) {
       savedUsers.push({
          nome: 'Gestor Global',
          matricula: 'admin',
          cpf: '000.000.000-00',
          senha: 'admin',
          perfil: 'Gestor'
       });
       localStorage.setItem('tmpm_users', JSON.stringify(savedUsers));
    }
    
    setUsers(savedUsers);
    if(savedSession) {
       setCurrentUser(savedSession);
    }
  }, []);

  const login = (loginId, senha) => {
    // loginId can be matricula, email or cpf
    const user = users.find(u => 
       (u.matricula === loginId || u.cpf === loginId || u.email === loginId) && 
       u.senha === senha
    );
    if (user) {
       setCurrentUser(user);
       localStorage.setItem('tmpm_session', JSON.stringify(user));
       return user;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem('tmpm_session');
  };

  const register = (newUser) => {
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('tmpm_users', JSON.stringify(updatedUsers));
  };

  return (
    <AuthContext.Provider value={{ currentUser, users, login, logout, register }}>
      {children}
    </AuthContext.Provider>
  );
};

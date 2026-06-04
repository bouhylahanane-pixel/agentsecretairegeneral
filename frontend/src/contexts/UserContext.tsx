import React, { createContext, useContext, useState } from 'react';

const UserContext = createContext<any>(null);

export function UserProvider({ children }: { children: React.ReactNode }) {
  // Au départ, l'utilisateur est 'null' (donc déconnecté)
  const [user, setUser] = useState<any>(null); 

  // Cette fonction est déclenchée par la page de Login
  const login = (userData: any) => {
    setUser(userData); // On enregistre les infos (Nom, Rôle)
  };

  // Optionnel : pour créer un bouton déconnexion plus tard
  const logout = () => {
    setUser(null); 
  };

  return (
    <UserContext.Provider value={{ user, login, logout }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
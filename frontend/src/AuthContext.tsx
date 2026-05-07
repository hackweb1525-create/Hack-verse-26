import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type UserProfile = {
  name: string;
  phone: string;
  createdAt: string;
};

type Ctx = {
  user: UserProfile | null;
  loading: boolean;
  signIn: (name: string, phone: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<Ctx>({
  user: null,
  loading: true,
  signIn: async () => {},
  signOut: async () => {},
});

const KEY = "agrimind.user";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        if (raw) setUser(JSON.parse(raw));
      } catch {}
      setLoading(false);
    })();
  }, []);

  const signIn = async (name: string, phone: string) => {
    const profile: UserProfile = {
      name: name.trim(),
      phone: phone.trim(),
      createdAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(KEY, JSON.stringify(profile));
    setUser(profile);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

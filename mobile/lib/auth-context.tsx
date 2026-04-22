import React, { createContext, useContext, useEffect, useState } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import {
  login as apiLogin,
  register as apiRegister,
  getProfile,
  setToken,
  clearToken,
} from "./api";

interface User {
  id: number;
  username: string;
  avatar_url: string;
  is_verified: boolean;
  role: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (token: string, user: User) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  loginWithToken: async () => {},
  register: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token =
          Platform.OS === "web"
            ? localStorage.getItem("token")
            : await SecureStore.getItemAsync("token");
        if (token) {
          const profile = await getProfile();
          setUser(profile as unknown as User);
        }
      } catch {
        await clearToken();
      }
      setLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await apiLogin({ email, password });
    await setToken(res.token);
    setUser(res.user);
  };

  const loginWithToken = async (token: string, userData: User) => {
    await setToken(token);
    setUser(userData);
  };

  const register = async (
    username: string,
    email: string,
    password: string,
  ) => {
    const res = await apiRegister({ username, email, password });
    await setToken(res.token);
    setUser(res.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, login, loginWithToken, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);

import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { User, LoginData, PasswordResetData } from '@shared/schema';

interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (data: LoginData) => Promise<void>;
  logout: () => Promise<void>;
  setPassword: (data: PasswordResetData) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check current auth status
  const { data: user, isLoading, error } = useQuery<{ user: AuthUser } | null>({
    queryKey: ['/api/auth/me'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/auth/me', {
          credentials: 'include',
        });
        if (!response.ok) {
          if (response.status === 401) {
            return null; // User not authenticated
          }
          throw new Error('Failed to check auth status');
        }
        return await response.json();
      } catch (error) {
        console.error('Auth check error:', error);
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (loginData: LoginData) => {
      const response = await apiRequest('POST', '/api/auth/login', loginData);
      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['/api/auth/me'], data);
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta ao GymSync.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/auth/logout');
      return await response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['/api/auth/me'], null);
      queryClient.clear(); // Clear all cached data
      toast({
        title: "Logout realizado com sucesso!",
        description: "Até logo!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro no logout",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Set password mutation (for new users or password reset)
  const setPasswordMutation = useMutation({
    mutationFn: async (passwordData: PasswordResetData) => {
      const response = await apiRequest('POST', '/api/auth/definir-senha', passwordData);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha definida com sucesso!",
        description: "Agora você pode fazer login com sua nova senha.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao definir senha",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Request password reset mutation
  const requestPasswordResetMutation = useMutation({
    mutationFn: async (email: string) => {
      const response = await apiRequest('POST', '/api/auth/solicitar-reset', { email });
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada!",
        description: "Se o email existir em nosso sistema, você receberá instruções de redefinição de senha.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const login = async (data: LoginData) => {
    await loginMutation.mutateAsync(data);
  };

  const logout = async () => {
    await logoutMutation.mutateAsync();
  };

  const setPassword = async (data: PasswordResetData) => {
    await setPasswordMutation.mutateAsync(data);
  };

  const requestPasswordReset = async (email: string) => {
    await requestPasswordResetMutation.mutateAsync(email);
  };

  const contextValue: AuthContextType = {
    user: user?.user || null,
    isLoading,
    isAuthenticated: !!user?.user,
    login,
    logout,
    setPassword,
    requestPasswordReset,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
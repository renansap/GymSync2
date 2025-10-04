import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { 
  Building2, 
  Users, 
  UserCheck, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  BarChart3,
  Settings,
  LogOut,
  ChevronRight,
  Activity,
  Star,
  Clock,
  Target,
  CreditCard
} from 'lucide-react';
import { GymSwitcher } from '@/components/GymSwitcher';

interface HubData {
  academia: {
    id: string;
    name: string;
    address: string;
    phone: string;
    email: string;
    isActive: boolean;
  };
  dashboard: any;
  estatisticas: {
    totalAlunos: number;
    totalPersonais: number;
    engajamento: any;
    aniversariantes: number;
    renovacoes: number;
  };
  user: {
    id: string;
    name: string;
    userType: string;
  };
}

export default function HubAcademia() {
  const [, setLocation] = useLocation();
  const [hubData, setHubData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAcademia, setSelectedAcademia] = useState<string | null>(null);

  useEffect(() => {
    fetchHubData();
  }, [selectedAcademia]);

  const fetchHubData = async () => {
    try {
      setLoading(true);
      const url = selectedAcademia 
        ? `/api/hub-academia?gymId=${selectedAcademia}`
        : '/api/hub-academia';
      
      const response = await fetch(url, {
        credentials: 'include'
      });

      if (!response.ok) {
        if (response.status === 403) {
          setError('Acesso negado. Apenas academias e administradores podem acessar este hub.');
          return;
        }
        
        if (response.status === 400) {
          const data = await response.json();
          if (data.requiresGymSelection) {
            // Redirecionar para a página de seleção de academia
            setLocation('/select-gym');
            return;
          }
        }
        
        throw new Error('Erro ao carregar dados do hub');
      }

      const data = await response.json();
      setHubData(data);
    } catch (err) {
      console.error('Erro ao carregar hub:', err);
      setError('Erro ao carregar dados do hub');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
      .then(() => {
        setLocation('/login');
      })
      .catch(console.error);
  };

  const handleAcademiaSelect = (academiaId: string) => {
    setSelectedAcademia(academiaId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando Hub da Academia...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="bg-red-100 rounded-full p-3 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => setLocation('/login')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Voltar ao Login
          </button>
        </div>
      </div>
    );
  }

  if (!hubData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Nenhum dado encontrado</p>
        </div>
      </div>
    );
  }

  const { academia, estatisticas, user } = hubData;

  const quickActions = [
    {
      title: 'Dashboard',
      description: 'Visão geral da academia',
      icon: BarChart3,
      color: 'bg-blue-500',
      href: '/academia-dashboard'
    },
    {
      title: 'Alunos',
      description: 'Gerenciar alunos',
      icon: Users,
      color: 'bg-green-500',
      href: '/academia-alunos'
    },
    {
      title: 'Personais',
      description: 'Gerenciar personal trainers',
      icon: UserCheck,
      color: 'bg-purple-500',
      href: '/academia-personais'
    },
    {
      title: 'Planos',
      description: 'Gerenciar planos de assinatura',
      icon: CreditCard,
      color: 'bg-cyan-500',
      href: '/academia/planos'
    },
    {
      title: 'Engajamento',
      description: 'Métricas de engajamento',
      icon: TrendingUp,
      color: 'bg-orange-500',
      href: '/academia-engajamento'
    },
    {
      title: 'Aniversariantes',
      description: 'Alunos aniversariantes',
      icon: Calendar,
      color: 'bg-pink-500',
      href: '/academia-aniversariantes'
    },
    {
      title: 'Renovações',
      description: 'Contratos para renovar',
      icon: RefreshCw,
      color: 'bg-indigo-500',
      href: '/academia-renovacoes'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Building2 className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Hub da Academia</h1>
                <p className="text-sm text-gray-600">{academia.name}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <GymSwitcher />
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 capitalize">{user.userType}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                title="Sair"
                data-testid="button-logout"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estatísticas Principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total de Alunos</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.totalAlunos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Personal Trainers</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.totalPersonais}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Calendar className="w-6 h-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Aniversariantes</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.aniversariantes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <RefreshCw className="w-6 h-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Renovações</p>
                <p className="text-2xl font-bold text-gray-900">{estatisticas.renovacoes}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ações Rápidas */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Ações Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {quickActions.map((action) => {
              const IconComponent = action.icon;
              return (
                <button
                  key={action.title}
                  onClick={() => setLocation(action.href)}
                  className="bg-white rounded-lg shadow hover:shadow-md transition-shadow p-6 text-left group"
                >
                  <div className="flex items-center mb-4">
                    <div className={`p-3 ${action.color} rounded-lg mr-4`}>
                      <IconComponent className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                        {action.title}
                      </h3>
                      <p className="text-sm text-gray-600">{action.description}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Informações da Academia */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Informações da Academia</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados Básicos</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-gray-600">Nome</p>
                  <p className="text-gray-900">{academia.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Endereço</p>
                  <p className="text-gray-900">{academia.address || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Telefone</p>
                  <p className="text-gray-900">{academia.phone || 'Não informado'}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">Email</p>
                  <p className="text-gray-900">{academia.email || 'Não informado'}</p>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${academia.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-gray-900">
                    {academia.isActive ? 'Ativa' : 'Inativa'}
                  </span>
                </div>
                <div className="flex items-center">
                  <Activity className="w-4 h-4 text-gray-400 mr-3" />
                  <span className="text-gray-900">Sistema Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}




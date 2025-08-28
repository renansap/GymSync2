import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "../components/bottom-navigation";
import { Users, Shield, Database, Settings, Activity, UserCog, Mail, FileText, Cog, Building2 } from "lucide-react";
import { User } from "@shared/schema";
import { Link } from "wouter";

export default function AdminDashboard() {
  const { isAuthenticated, isLoading, user } = useAuth();

  // Check admin authentication
  const { data: adminAuth, isLoading: isLoadingAdminAuth } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  // Fetch all users for admin stats
  const { data: allUsers = [], isLoading: isLoadingUsers } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    enabled: adminAuth?.authenticated,
  });

  // Calculate stats
  const userStats = {
    total: allUsers.length,
    alunos: allUsers.filter(u => u.userType === 'aluno').length,
    personais: allUsers.filter(u => u.userType === 'personal').length,
    academias: allUsers.filter(u => u.userType === 'academia').length,
    withoutType: allUsers.filter(u => !u.userType || u.userType === '').length
  };

  if (isLoading || isLoadingAdminAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Redirect to admin login if not authenticated
  if (!adminAuth || !adminAuth.authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold mb-4">Acesso Administrativo Restrito</h2>
          <p className="text-muted-foreground mb-4">Você precisa fazer login como administrador para acessar esta área</p>
          <Button onClick={() => window.location.href = "/admin/login"}>
            Login Administrativo
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">
                ADMIN
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Administrador
              </span>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => {
                  fetch('/api/admin/logout', { method: 'POST' })
                    .then(() => window.location.href = '/admin/login')
                }}
                data-testid="button-admin-logout"
              >
                Sair Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Painel Administrativo</h2>
          <p className="text-muted-foreground">Gerencie todo o sistema GymSync</p>
        </div>

        {/* User Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Users className="text-blue-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-total-users">{userStats.total}</p>
                  <p className="text-muted-foreground">Total Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <Activity className="text-green-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-total-alunos">{userStats.alunos}</p>
                  <p className="text-muted-foreground">Alunos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <UserCog className="text-purple-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-purple-600" data-testid="text-total-personais">{userStats.personais}</p>
                  <p className="text-muted-foreground">Personal Trainers</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <Shield className="text-orange-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-total-academias">{userStats.academias}</p>
                  <p className="text-muted-foreground">Academias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg">
                  <Database className="text-red-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-users-without-type">{userStats.withoutType}</p>
                  <p className="text-muted-foreground">Sem Tipo</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Admin Functions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-4">Principais Funcionalidades</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link href="/admin/usuarios">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Users className="w-5 h-5 mr-2 text-blue-600" />
                    Gestão de Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Gerencie alunos, personal trainers e usuários
                  </p>
                  <Button size="sm" className="w-full" data-testid="button-manage-users">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/academias">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Building2 className="w-5 h-5 mr-2 text-emerald-600" />
                    Gestão de Academias
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Cadastre e configure academias do sistema
                  </p>
                  <Button size="sm" className="w-full" data-testid="button-manage-gyms">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Link>

            <Link href="/admin/configuracoes">
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center text-base">
                    <Cog className="w-5 h-5 mr-2 text-purple-600" />
                    Configurações Globais
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">
                    Templates de email e configurações do sistema
                  </p>
                  <Button size="sm" className="w-full" data-testid="button-settings">
                    Acessar
                  </Button>
                </CardContent>
              </Card>
            </Link>

          </div>
        </div>


        {/* System Status */}
        <Card>
          <CardHeader>
            <CardTitle>Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="font-medium">API</p>
                <p className="text-sm text-muted-foreground">Funcionando</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="font-medium">Banco de Dados</p>
                <p className="text-sm text-muted-foreground">Conectado</p>
              </div>
              <div className="text-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mx-auto mb-2"></div>
                <p className="font-medium">Autenticação</p>
                <p className="text-sm text-muted-foreground">Ativa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Warning for regular users */}
        {user?.userType !== 'academia' && user?.email !== 'renansap@gmail.com' && (
          <Card className="mt-6 border-yellow-200 bg-yellow-50">
            <CardContent className="p-6">
              <div className="flex items-center">
                <Shield className="w-6 h-6 text-yellow-600 mr-3" />
                <div>
                  <h3 className="font-medium text-yellow-800">Aviso de Acesso</h3>
                  <p className="text-sm text-yellow-700">
                    Você está acessando o painel administrativo. Algumas funcionalidades podem ser restritas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <BottomNavigation activeView="academia" />
    </div>
  );
}
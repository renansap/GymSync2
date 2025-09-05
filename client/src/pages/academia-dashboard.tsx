import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "../components/bottom-navigation";
import { Users, Bus, Dumbbell, Cake, Gift, UserPlus, QrCode, FolderSync, Activity, AlertTriangle, Settings } from "lucide-react";
import { User } from "@shared/schema";

export default function AcademiaDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean;
  };

  // Preview mode: allows opening the page without authentication when `?preview=1`
  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';
  const initialGym = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('gymId') : null;
  const [selectedGymId, setSelectedGymId] = useState<string | null>(initialGym);

  // Preview: load gyms to choose
  const { data: previewGyms = [] } = useQuery<any[]>({
    queryKey: ['/api/preview/gyms'],
    enabled: isPreview,
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (isPreview) return;
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast, isPreview]);

  // Fetch dashboard data
  const { data: dashboardData = {} } = useQuery<any>({
    queryKey: [
      isPreview && selectedGymId
        ? `/api/preview/gym/${selectedGymId}/dashboard`
        : "/api/academia/dashboard",
    ],
    enabled: (isAuthenticated) || (isPreview && !!selectedGymId),
  });

  // Fetch gym members
  const { data: members = [] } = useQuery<User[]>({
    queryKey: [
      isPreview && selectedGymId
        ? `/api/preview/gym/${selectedGymId}/alunos`
        : "/api/academia/alunos",
    ],
    enabled: (isAuthenticated) || (isPreview && !!selectedGymId),
  });

  // Fetch birthday members
  const { data: birthdayMembers = [] } = useQuery<User[]>({
    queryKey: [
      isPreview && selectedGymId
        ? `/api/preview/gym/${selectedGymId}/aniversariantes`
        : "/api/academia/aniversariantes",
    ],
    enabled: (isAuthenticated) || (isPreview && !!selectedGymId),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Não fazer early-return para manter o banner visível; mostraremos o placeholder dentro do layout

  const totalMembers = dashboardData.totalAlunos || members.length;
  const totalTrainers = dashboardData.totalPersonais || 0;
  const dailyWorkouts = dashboardData.treinosHoje || 0;
  const activeMembers = dashboardData.alunosAtivos || 0;

  const handleSendBirthdayMessage = (memberName: string) => {
    toast({
      title: "Parabéns enviado!",
      description: `Mensagem de aniversário enviada para ${memberName}`,
    });
  };

  const handleGenerateNewQR = () => {
    toast({
      title: "QR Code atualizado!",
      description: "Novo QR Code gerado para check-in",
    });
  };

  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
  const isAcademiaView = currentPath.startsWith('/academia');
  const isAlunoView = currentPath.startsWith('/aluno');
  const isPersonalView = currentPath.startsWith('/personal');

  return (
    <div className="min-h-screen bg-background pb-20">
      {isPreview && (
        <div className="sticky top-0 z-50 bg-amber-50 border-b border-amber-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between">
            <p className="text-sm text-amber-800">
              Você está no modo preview. Escolha uma visão e uma academia:
            </p>
            <div className="flex gap-2">
              {isAcademiaView && (
                <>
                  <button
                    className="px-3 py-1 text-xs rounded bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => (window.location.href = "/academia?preview=1")}
                  >
                    Academia
                  </button>
                  <select
                    className="px-2 py-1 text-xs border rounded bg-white"
                    value={selectedGymId ?? ''}
                    onChange={(e) => {
                      const id = e.target.value || null;
                      setSelectedGymId(id);
                      const params = new URLSearchParams(window.location.search);
                      if (id) params.set('gymId', id); else params.delete('gymId');
                      if (!params.get('preview')) params.set('preview', '1');
                      const newUrl = `/academia?${params.toString()}`;
                      window.history.replaceState({}, '', newUrl);
                    }}
                  >
                    <option value="">Selecione a academia</option>
                    {previewGyms.map((g: any) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </>
              )}
              {isAlunoView && (
                <button
                  className="px-3 py-1 text-xs rounded bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => (window.location.href = "/aluno?preview=1")}
                >
                  Aluno
                </button>
              )}
              {isPersonalView && (
                <button
                  className="px-3 py-1 text-xs rounded bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => (window.location.href = "/personal?preview=1")}
                >
                  Personal
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full" data-testid="text-user-type">
                Academia
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/admin"}
                data-testid="button-admin-panel"
              >
                <Settings className="w-4 h-4 mr-2" />
                Painel Admin
              </Button>
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/api/logout"}
                data-testid="button-logout"
              >
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {isPreview && !selectedGymId && (
          <div className="text-center mb-6">
            <p className="text-muted-foreground">Selecione uma academia no topo para visualizar os dados.</p>
          </div>
        )}
        {/* Gym Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="text-primary w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-total-members">{totalMembers}</p>
                  <p className="text-muted-foreground">Total de Alunos</p>
                  <p className="text-xs text-primary">{activeMembers} ativos (7 dias)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <Bus className="text-accent w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-total-trainers">{totalTrainers}</p>
                  <p className="text-muted-foreground">Personal Trainers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Dumbbell className="text-secondary w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-daily-workouts">{dailyWorkouts}</p>
                  <p className="text-muted-foreground">Treinos Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-destructive/10 p-3 rounded-lg">
                  <Cake className="text-destructive w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-birthdays">{birthdayMembers.length}</p>
                  <p className="text-muted-foreground">Aniversários</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Birthday Section */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Cake className="text-destructive mr-2 w-5 h-5" />
                Aniversariantes de Hoje
              </h3>
              <div className="space-y-3">
                {birthdayMembers.length > 0 ? (
                  birthdayMembers.map((member: User, index: number) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-destructive/10 rounded-full flex items-center justify-center mr-3">
                          <span className="font-medium text-destructive" data-testid={`text-birthday-initials-${index}`}>
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-birthday-name-${index}`}>
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-birthday-age-${index}`}>
                            Aniversário hoje
                          </p>
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        variant="destructive"
                        onClick={() => handleSendBirthdayMessage(`${member.firstName} ${member.lastName}`)}
                        data-testid={`button-birthday-message-${index}`}
                      >
                        <Gift className="mr-1 w-4 h-4" />Parabenizar
                      </Button>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <p>Nenhum aniversário hoje</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">QR Code Check-in</h3>
              <div className="text-center">
                <div className="w-48 h-48 bg-muted mx-auto mb-4 rounded-lg flex items-center justify-center">
                  <QrCode className="w-20 h-20 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Membros podem escanear para fazer check-in</p>
                <Button 
                  onClick={handleGenerateNewQR}
                  data-testid="button-generate-qr"
                >
                  <FolderSync className="mr-2 w-4 h-4" />Gerar Novo QR
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Navigation */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-4">Navegação Rápida</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => window.location.href = '/academia/engajamento'}
              data-testid="nav-engajamento"
            >
              <Activity className="w-6 h-6 mb-2" />
              <span className="text-sm">Engajamento</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => window.location.href = '/academia/aniversariantes'}
              data-testid="nav-aniversariantes"
            >
              <Cake className="w-6 h-6 mb-2" />
              <span className="text-sm">Aniversários</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => window.location.href = '/academia/renovacoes'}
              data-testid="nav-renovacoes"
            >
              <AlertTriangle className="w-6 h-6 mb-2" />
              <span className="text-sm">Renovações</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col"
              onClick={() => window.location.href = '/academia/alunos'}
              data-testid="nav-alunos"
            >
              <Users className="w-6 h-6 mb-2" />
              <span className="text-sm">Ver Todos</span>
            </Button>
          </div>
        </div>

        {/* Members and Trainers Management */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Membros Recentes</h3>
                <Button 
                  size="sm" 
                  onClick={() => {
                    if (isPreview) {
                      const params = new URLSearchParams();
                      params.set('preview', '1');
                      if (selectedGymId) params.set('gymId', selectedGymId);
                      window.location.href = `/academia/alunos?${params.toString()}`;
                    } else {
                      window.location.href = '/academia/alunos';
                    }
                  }}
                  data-testid="button-manage-members"
                >
                  <UserPlus className="mr-2 w-4 h-4" />Gerenciar Alunos
                </Button>
              </div>
              
              <div className="space-y-3">
                {members.length > 0 ? (
                  members.slice(0, 3).map((member: User, index: number) => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                          <span className="font-medium text-primary" data-testid={`text-member-initials-${index}`}>
                            {member.firstName?.[0]}{member.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-member-name-${index}`}>
                            {member.firstName} {member.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-member-plan-${index}`}>
                            Plano Premium • Ativo
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-accent" data-testid={`text-member-status-${index}`}>
                          Presente
                        </p>
                        <p className="text-xs text-muted-foreground" data-testid={`text-member-checkin-${index}`}>
                          14:30
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <p>Nenhum membro cadastrado</p>
                    <p className="text-sm">Adicione membros para começar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Personal Trainers</h3>
                <Button 
                  size="sm"
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  onClick={() => {
                    if (isPreview) {
                      const params = new URLSearchParams();
                      params.set('preview', '1');
                      if (selectedGymId) params.set('gymId', selectedGymId);
                      window.location.href = `/academia/personais?${params.toString()}`;
                    } else {
                      window.location.href = '/academia/personais';
                    }
                  }}
                  data-testid="button-manage-trainers"
                >
                  <UserPlus className="mr-2 w-4 h-4" />Gerenciar Personais
                </Button>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="font-medium text-secondary">MA</span>
                    </div>
                    <div>
                      <p className="font-medium" data-testid="text-trainer-name-0">Marcos Almeida</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-trainer-clients-0">18 clientes ativos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-accent" data-testid="text-trainer-rating-0">4.9⭐</p>
                    <p className="text-xs text-muted-foreground" data-testid="text-trainer-experience-0">5 anos exp.</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-secondary/10 rounded-full flex items-center justify-center mr-3">
                      <span className="font-medium text-secondary">PS</span>
                    </div>
                    <div>
                      <p className="font-medium" data-testid="text-trainer-name-1">Paula Silva</p>
                      <p className="text-sm text-muted-foreground" data-testid="text-trainer-clients-1">15 clientes ativos</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-accent" data-testid="text-trainer-rating-1">4.8⭐</p>
                    <p className="text-xs text-muted-foreground" data-testid="text-trainer-experience-1">3 anos exp.</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <BottomNavigation activeView="academia" />
    </div>
  );
}

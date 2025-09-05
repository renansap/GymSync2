import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "../components/bottom-navigation";
import { Users, CalendarCheck, Trophy, ChevronRight } from "lucide-react";
import { User } from "@shared/schema";

export default function PersonalDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean;
  };

  // Preview mode via ?preview=1
  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';

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

  // Fetch clients
  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/personal/clients"],
    enabled: isAuthenticated || isPreview,
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

  const clientCount = clients.length;
  const workoutsToday = 8; // Mock data
  const monthlyGoals = 92; // Mock data

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full" data-testid="text-user-type">
                Personal
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
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
        {/* Client Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="text-primary w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-client-count">{clientCount}</p>
                  <p className="text-muted-foreground">Clientes Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-accent/10 p-3 rounded-lg">
                  <CalendarCheck className="text-accent w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-workouts-today">{workoutsToday}</p>
                  <p className="text-muted-foreground">Treinos Hoje</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Trophy className="text-secondary w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-monthly-goals">{monthlyGoals}%</p>
                  <p className="text-muted-foreground">Metas do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Management */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Clientes Recentes</h3>
                <Button size="sm" data-testid="button-add-client">
                  <i className="fas fa-plus mr-2"></i>Novo Cliente
                </Button>
              </div>
              
              <div className="space-y-3">
                {clients.length > 0 ? (
                  clients.slice(0, 3).map((client: User, index: number) => (
                    <div key={client.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                          <span className="font-medium text-primary" data-testid={`text-client-initials-${index}`}>
                            {client.firstName?.[0]}{client.lastName?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-client-name-${index}`}>
                            {client.firstName} {client.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-client-last-workout-${index}`}>
                            Último treino: ontem
                          </p>
                        </div>
                      </div>
                      <button className="text-muted-foreground hover:text-foreground" data-testid={`button-view-client-${index}`}>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <p>Nenhum cliente cadastrado</p>
                    <p className="text-sm">Adicione clientes para começar</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Criar Ficha de Treino</h3>
              <div className="space-y-4">
                <select className="w-full px-3 py-2 border border-border rounded-md bg-input" data-testid="select-client">
                  <option>Selecionar Cliente</option>
                  {clients.map((client: User) => (
                    <option key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </option>
                  ))}
                </select>
                
                <select className="w-full px-3 py-2 border border-border rounded-md bg-input" data-testid="select-workout-type">
                  <option>Tipo de Treino</option>
                  <option>Hipertrofia</option>
                  <option>Emagrecimento</option>
                  <option>Força</option>
                </select>
                
                <div className="grid grid-cols-2 gap-4">
                  <select className="px-3 py-2 border border-border rounded-md bg-input" data-testid="select-days-week">
                    <option>Dias/semana</option>
                    <option>3 dias</option>
                    <option>4 dias</option>
                    <option>5 dias</option>
                  </select>
                  <select className="px-3 py-2 border border-border rounded-md bg-input" data-testid="select-level">
                    <option>Nível</option>
                    <option>Iniciante</option>
                    <option>Intermediário</option>
                    <option>Avançado</option>
                  </select>
                </div>
                
                <Button className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90" data-testid="button-create-plan">
                  <i className="fas fa-plus mr-2"></i>Criar Ficha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Performance Analytics */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Performance dos Clientes</h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 bg-accent/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <i className="fas fa-chart-line text-accent text-xl"></i>
                </div>
                <p className="text-2xl font-bold text-accent" data-testid="text-avg-progress">+15%</p>
                <p className="text-sm text-muted-foreground">Progresso Médio</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 bg-primary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <i className="fas fa-clock text-primary text-xl"></i>
                </div>
                <p className="text-2xl font-bold text-primary" data-testid="text-avg-duration">42 min</p>
                <p className="text-sm text-muted-foreground">Duração Média</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 bg-secondary/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <i className="fas fa-fire text-secondary text-xl"></i>
                </div>
                <p className="text-2xl font-bold text-secondary" data-testid="text-consistency">88%</p>
                <p className="text-sm text-muted-foreground">Consistência</p>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="w-12 h-12 bg-destructive/10 rounded-lg mx-auto mb-3 flex items-center justify-center">
                  <i className="fas fa-medal text-destructive text-xl"></i>
                </div>
                <p className="text-2xl font-bold text-destructive" data-testid="text-achievements">127</p>
                <p className="text-sm text-muted-foreground">Conquistas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation activeView="personal" />
    </div>
  );
}

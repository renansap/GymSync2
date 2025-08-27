import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNavigation from "../components/bottom-navigation";
import { Activity, Search, Calendar, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface EngajamentoUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  ultimoTreino: string | null;
  totalTreinos: number;
  diasSemTreino: number;
}

export default function AcademiaEngajamento() {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch engagement data
  const { data: engajamento = [], isLoading: isLoadingEngajamento } = useQuery<EngajamentoUser[]>({
    queryKey: ["/api/academia/engajamento"],
    enabled: isAuthenticated,
  });

  // Filter users based on search
  const filteredUsers = engajamento.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (diasSemTreino: number) => {
    if (diasSemTreino <= 3) return "text-green-600 bg-green-100";
    if (diasSemTreino <= 7) return "text-yellow-600 bg-yellow-100";
    if (diasSemTreino <= 14) return "text-orange-600 bg-orange-100";
    return "text-red-600 bg-red-100";
  };

  const getStatusText = (diasSemTreino: number) => {
    if (diasSemTreino === 0) return "Hoje";
    if (diasSemTreino === 1) return "Ontem";
    if (diasSemTreino <= 7) return "Esta semana";
    if (diasSemTreino <= 30) return "Este mês";
    return "Inativo";
  };

  const getStatusIcon = (diasSemTreino: number) => {
    if (diasSemTreino <= 7) return <TrendingUp className="w-4 h-4" />;
    if (diasSemTreino <= 30) return <Minus className="w-4 h-4" />;
    return <TrendingDown className="w-4 h-4" />;
  };

  // Stats
  const alunosAtivos = engajamento.filter(u => u.diasSemTreino <= 7).length;
  const alunosInativos = engajamento.filter(u => u.diasSemTreino > 30).length;
  const mediaFrequencia = engajamento.length > 0 
    ? (engajamento.reduce((acc, u) => acc + u.totalTreinos, 0) / engajamento.length).toFixed(1)
    : "0";

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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                Academia - Engajamento
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
        {/* Page Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground">Engajamento dos Alunos</h2>
          <p className="text-muted-foreground">Monitore a atividade e engajamento dos alunos da academia</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-green-100 p-3 rounded-lg">
                  <TrendingUp className="text-green-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-green-600" data-testid="text-alunos-ativos">{alunosAtivos}</p>
                  <p className="text-muted-foreground">Alunos Ativos</p>
                  <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg">
                  <TrendingDown className="text-red-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-alunos-inativos">{alunosInativos}</p>
                  <p className="text-muted-foreground">Alunos Inativos</p>
                  <p className="text-xs text-muted-foreground">Mais de 30 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-blue-100 p-3 rounded-lg">
                  <Activity className="text-blue-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-blue-600" data-testid="text-media-frequencia">{mediaFrequencia}</p>
                  <p className="text-muted-foreground">Média de Treinos</p>
                  <p className="text-xs text-muted-foreground">Por aluno</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar alunos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Engagement List */}
        <Card>
          <CardHeader>
            <CardTitle>Ranking de Atividade dos Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingEngajamento ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dados de engajamento...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="space-y-4">
                {filteredUsers.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                        <span className="text-sm font-medium text-primary">#{index + 1}</span>
                      </div>
                      <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mr-4">
                        <span className="font-medium text-muted-foreground" data-testid={`text-user-initials-${index}`}>
                          {user.firstName?.[0]}{user.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-user-name-${index}`}>
                          {user.firstName} {user.lastName}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          <Activity className="w-4 h-4 mr-1" />
                          <span data-testid={`text-user-total-treinos-${index}`}>
                            {user.totalTreinos} treinos realizados
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(user.diasSemTreino)}`}>
                        {getStatusIcon(user.diasSemTreino)}
                        <span className="ml-1" data-testid={`text-user-status-${index}`}>
                          {getStatusText(user.diasSemTreino)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-end">
                        <Calendar className="w-3 h-3 mr-1" />
                        <span data-testid={`text-user-ultimo-treino-${index}`}>
                          {user.ultimoTreino 
                            ? `${user.diasSemTreino} dia${user.diasSemTreino !== 1 ? 's' : ''} atrás`
                            : 'Nunca treinou'
                          }
                        </span>
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum aluno encontrado para sua busca" : "Nenhum dado de engajamento disponível"}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Os dados aparecerão conforme os alunos começarem a treinar
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation activeView="academia" />
    </div>
  );
}
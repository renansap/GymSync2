import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNavigation from "../components/bottom-navigation";
import { AlertTriangle, Search, Calendar, Mail, Phone, MessageSquare } from "lucide-react";
import { User } from "@shared/schema";

export default function AcademiaRenovacoes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch renewal candidates
  const { data: renovacoes = [], isLoading: isLoadingRenovacoes } = useQuery<User[]>({
    queryKey: ["/api/academia/renovacoes"],
    enabled: isAuthenticated || isPreview,
  });

  // Filter users based on search
  const filteredRenovacoes = renovacoes.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleContactMember = (userName: string, method: string) => {
    toast({
      title: "Contato realizado!",
      description: `${method} enviado para ${userName}`,
    });
  };

  const getDaysSinceJoined = (createdAt: Date) => {
    const today = new Date();
    const diffTime = today.getTime() - createdAt.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getPriorityLevel = (daysSinceJoined: number) => {
    if (daysSinceJoined > 90) return { level: "Alta", color: "bg-red-100 text-red-800", priority: 3 };
    if (daysSinceJoined > 60) return { level: "Média", color: "bg-orange-100 text-orange-800", priority: 2 };
    return { level: "Baixa", color: "bg-yellow-100 text-yellow-800", priority: 1 };
  };

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

  const prioritySorted = filteredRenovacoes
    .map(user => ({
      ...user,
      daysSinceJoined: user.createdAt ? getDaysSinceJoined(new Date(user.createdAt)) : 0,
      priority: user.createdAt ? getPriorityLevel(getDaysSinceJoined(new Date(user.createdAt))) : getPriorityLevel(0)
    }))
    .sort((a, b) => b.priority.priority - a.priority.priority);

  const highPriorityCount = renovacoes.filter(u => u.createdAt && getDaysSinceJoined(new Date(u.createdAt)) > 90).length;
  const mediumPriorityCount = renovacoes.filter(u => u.createdAt && getDaysSinceJoined(new Date(u.createdAt)) > 60 && getDaysSinceJoined(new Date(u.createdAt)) <= 90).length;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                Academia - Renovações
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
          <h2 className="text-2xl font-bold text-foreground">Alunos para Renovação</h2>
          <p className="text-muted-foreground">Alunos sem treinos registrados nos últimos 30 dias</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-red-100 p-3 rounded-lg">
                  <AlertTriangle className="text-red-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-red-600" data-testid="text-alta-prioridade">{highPriorityCount}</p>
                  <p className="text-muted-foreground">Alta Prioridade</p>
                  <p className="text-xs text-muted-foreground">Mais de 90 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-orange-100 p-3 rounded-lg">
                  <AlertTriangle className="text-orange-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-media-prioridade">{mediumPriorityCount}</p>
                  <p className="text-muted-foreground">Média Prioridade</p>
                  <p className="text-xs text-muted-foreground">60-90 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-yellow-100 p-3 rounded-lg">
                  <AlertTriangle className="text-yellow-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-yellow-600" data-testid="text-total-renovacoes">{renovacoes.length}</p>
                  <p className="text-muted-foreground">Total p/ Renovação</p>
                  <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
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
              placeholder="Buscar alunos para renovação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Renewals List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alunos para Renovação</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingRenovacoes ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando dados de renovação...</p>
              </div>
            ) : prioritySorted.length > 0 ? (
              <div className="space-y-4">
                {prioritySorted.map((user, index) => (
                  <div 
                    key={user.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center">
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
                          {user.email && (
                            <div className="flex items-center mr-4">
                              <Mail className="w-4 h-4 mr-1" />
                              <span data-testid={`text-user-email-${index}`}>{user.email}</span>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            <span data-testid={`text-user-days-${index}`}>
                              {user.daysSinceJoined} dias sem treinar
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right flex items-center space-x-3">
                      <div>
                        <span 
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.priority.color}`}
                          data-testid={`text-user-priority-${index}`}
                        >
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          {user.priority.level}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Membro desde {user.createdAt ? new Date(user.createdAt).toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 border-blue-200"
                          onClick={() => handleContactMember(`${user.firstName} ${user.lastName}`, "WhatsApp")}
                          data-testid={`button-whatsapp-${index}`}
                        >
                          <MessageSquare className="w-4 h-4" />
                        </Button>
                        {user.email && (
                          <Button 
                            size="sm"
                            variant="outline"
                            className="bg-green-50 hover:bg-green-100 text-green-600 border-green-200"
                            onClick={() => handleContactMember(`${user.firstName} ${user.lastName}`, "Email")}
                            data-testid={`button-email-${index}`}
                          >
                            <Mail className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertTriangle className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum aluno encontrado para sua busca" : "Nenhum aluno precisa de renovação"}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Ótimo! Todos os alunos estão ativos e treinando regularmente
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
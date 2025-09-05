import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BottomNavigation from "../components/bottom-navigation";
import { Cake, Gift, Search, Calendar, Mail } from "lucide-react";
import { User } from "@shared/schema";

export default function AcademiaAniversariantes() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch birthday members
  const { data: aniversariantes = [], isLoading: isLoadingAniversariantes } = useQuery<User[]>({
    queryKey: ["/api/academia/aniversariantes"],
    enabled: isAuthenticated || isPreview,
  });

  // Filter users based on search
  const filteredAniversariantes = aniversariantes.filter(user => 
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSendBirthdayMessage = (userName: string) => {
    toast({
      title: "Parabéns enviado!",
      description: `Mensagem de aniversário enviada para ${userName}`,
    });
  };

  const getDaysUntilBirthday = (birthDate: Date) => {
    const today = new Date();
    const birthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
    
    if (birthday < today) {
      birthday.setFullYear(today.getFullYear() + 1);
    }
    
    const diffTime = birthday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
  };

  const getBirthdayText = (birthDate: Date) => {
    const days = getDaysUntilBirthday(birthDate);
    if (days === 0) return "Hoje!";
    if (days === 1) return "Amanhã";
    return `Em ${days} dias`;
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

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                Academia - Aniversariantes
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
          <h2 className="text-2xl font-bold text-foreground">Aniversariantes da Semana</h2>
          <p className="text-muted-foreground">Alunos que fazem aniversário nos próximos 7 dias</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-pink-100 p-3 rounded-lg">
                  <Cake className="text-pink-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-pink-600" data-testid="text-total-aniversariantes">{aniversariantes.length}</p>
                  <p className="text-muted-foreground">Aniversariantes</p>
                  <p className="text-xs text-muted-foreground">Próximos 7 dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-purple-100 p-3 rounded-lg">
                  <Gift className="text-purple-600 w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold text-purple-600" data-testid="text-hoje">
                    {aniversariantes.filter(a => a.birthDate && getDaysUntilBirthday(new Date(a.birthDate)) === 0).length}
                  </p>
                  <p className="text-muted-foreground">Hoje</p>
                  <p className="text-xs text-muted-foreground">Fazendo aniversário</p>
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
              placeholder="Buscar aniversariantes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Birthday List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Aniversariantes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAniversariantes ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando aniversariantes...</p>
              </div>
            ) : filteredAniversariantes.length > 0 ? (
              <div className="space-y-4">
                {filteredAniversariantes
                  .sort((a, b) => {
                    if (!a.birthDate || !b.birthDate) return 0;
                    return getDaysUntilBirthday(new Date(a.birthDate)) - getDaysUntilBirthday(new Date(b.birthDate));
                  })
                  .map((user, index) => (
                    <div 
                      key={user.id} 
                      className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex items-center">
                        <div className="w-12 h-12 bg-pink-100 rounded-full flex items-center justify-center mr-4">
                          <Cake className="text-pink-600 w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-medium" data-testid={`text-aniversariante-name-${index}`}>
                            {user.firstName} {user.lastName}
                          </p>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            {user.email && (
                              <div className="flex items-center mr-4">
                                <Mail className="w-4 h-4 mr-1" />
                                <span data-testid={`text-aniversariante-email-${index}`}>{user.email}</span>
                              </div>
                            )}
                            {user.birthDate && (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span data-testid={`text-aniversariante-date-${index}`}>
                                  {new Date(user.birthDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right flex items-center space-x-3">
                        <div>
                          <span 
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              user.birthDate && getDaysUntilBirthday(new Date(user.birthDate)) === 0
                                ? 'bg-pink-100 text-pink-800'
                                : 'bg-purple-100 text-purple-800'
                            }`}
                            data-testid={`text-aniversariante-status-${index}`}
                          >
                            {user.birthDate ? getBirthdayText(new Date(user.birthDate)) : ""}
                          </span>
                        </div>
                        <Button 
                          size="sm"
                          variant="outline"
                          className="bg-pink-50 hover:bg-pink-100 text-pink-600 border-pink-200"
                          onClick={() => handleSendBirthdayMessage(`${user.firstName} ${user.lastName}`)}
                          data-testid={`button-send-message-${index}`}
                        >
                          <Gift className="mr-1 w-4 h-4" />
                          Parabenizar
                        </Button>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Cake className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum aniversariante encontrado para sua busca" : "Nenhum aniversário nos próximos 7 dias"}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Os aniversariantes aparecerão automaticamente quando se aproximarem as datas
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
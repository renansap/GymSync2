import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNavigation from "../components/bottom-navigation";
import { Users, Bus, Dumbbell, Cake, Gift, UserPlus, QrCode, FolderSync } from "lucide-react";
import { User } from "@shared/schema";

export default function AcademiaDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean;
  };

  // Redirect if not authenticated
  useEffect(() => {
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
  }, [isAuthenticated, isLoading, toast]);

  // Fetch gym members
  const { data: members = [] } = useQuery<User[]>({
    queryKey: ["/api/gym/members"],
    enabled: isAuthenticated,
  });

  // Fetch birthday members
  const { data: birthdayMembers = [] } = useQuery<User[]>({
    queryKey: ["/api/gym/birthdays"],
    enabled: isAuthenticated,
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

  const totalMembers = members.length;
  const totalTrainers = 12; // Mock data
  const dailyWorkouts = 89; // Mock data

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

  return (
    <div className="min-h-screen bg-background pb-20">
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
              <button 
                onClick={() => window.location.href = "/api/logout"}
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-logout"
              >
                <i className="fas fa-sign-out-alt text-lg"></i>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
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
                  <p className="text-muted-foreground">Membros Ativos</p>
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

        {/* Members and Trainers Management */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Membros Recentes</h3>
                <Button size="sm" data-testid="button-add-member">
                  <UserPlus className="mr-2 w-4 h-4" />Novo Membro
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
                  data-testid="button-add-trainer"
                >
                  <UserPlus className="mr-2 w-4 h-4" />Novo Personal
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

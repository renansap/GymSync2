import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import WorkoutTimer from "../components/workout-timer";
import BottomNavigation from "../components/bottom-navigation";
import { Dumbbell, Flame, Clock, Weight } from "lucide-react";
import { User, Workout, WorkoutSession } from "@shared/schema";

export default function AlunoDashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading, user } = useAuth() as { 
    isAuthenticated: boolean; 
    isLoading: boolean; 
    user: User | undefined;
  };
  const [objetivo, setObjetivo] = useState("hipertrofia");
  const [nivel, setNivel] = useState("iniciante");
  const [currentSet, setCurrentSet] = useState({ peso: "", reps: "" });

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

  // Fetch workouts
  const { data: workouts = [] } = useQuery<Workout[]>({
    queryKey: ["/api/workouts"],
    enabled: isAuthenticated,
  });

  // Fetch workout sessions
  const { data: sessions = [] } = useQuery<WorkoutSession[]>({
    queryKey: ["/api/workout-sessions"],
    enabled: isAuthenticated,
  });

  // Fetch active session
  const { data: activeSession, refetch: refetchActiveSession } = useQuery<WorkoutSession | null>({
    queryKey: ["/api/workout-sessions/active"],
    enabled: isAuthenticated,
  });

  // Generate AI workout mutation
  const generateWorkoutMutation = useMutation({
    mutationFn: async (data: { objetivo: string; nivel: string; diasPorSemana: number }) => {
      return await apiRequest("POST", "/api/ia/treino", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workouts"] });
      toast({
        title: "Treino gerado!",
        description: "Seu treino personalizado foi criado com IA.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Falha ao gerar treino. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Start workout mutation
  const startWorkoutMutation = useMutation({
    mutationFn: async (workoutId: string) => {
      return await apiRequest("POST", "/api/workout-sessions", {
        workoutId,
        startTime: new Date().toISOString(),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      refetchActiveSession();
      toast({
        title: "Treino iniciado!",
        description: "Bom treino!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Falha ao iniciar treino.",
        variant: "destructive",
      });
    },
  });

  // End workout mutation
  const endWorkoutMutation = useMutation({
    mutationFn: async (sessionId: string) => {
      return await apiRequest("PATCH", `/api/workout-sessions/${sessionId}`, {
        endTime: new Date().toISOString(),
        completed: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      refetchActiveSession();
      toast({
        title: "Treino finalizado!",
        description: "Parabéns pelo treino!",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Erro",
        description: "Falha ao finalizar treino.",
        variant: "destructive",
      });
    },
  });

  const handleGenerateWorkout = () => {
    generateWorkoutMutation.mutate({
      objetivo,
      nivel,
      diasPorSemana: 3,
    });
  };

  const handleStartWorkout = (workoutId: string) => {
    startWorkoutMutation.mutate(workoutId);
  };

  const handleEndWorkout = () => {
    if (activeSession?.id) {
      endWorkoutMutation.mutate(activeSession.id);
    }
  };

  const handleLogSet = () => {
    toast({
      title: "Série registrada!",
      description: `${currentSet.peso}kg x ${currentSet.reps} reps`,
    });
    setCurrentSet({ peso: "", reps: "" });
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

  const totalWorkouts = sessions.length;
  const streak = 7; // Mock data
  const totalTime = sessions.reduce((acc, session) => acc + (session.duration || 0), 0);
  const totalWeight = sessions.reduce((acc, session) => acc + (session.totalWeight || 0), 0);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full" data-testid="text-user-type">
                Aluno
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
        {/* Quick Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-primary/10 p-2 rounded-lg">
                  <Dumbbell className="text-primary w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Treinos</p>
                  <p className="text-lg font-semibold" data-testid="text-workout-count">{totalWorkouts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-accent/10 p-2 rounded-lg">
                  <Flame className="text-accent w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Sequência</p>
                  <p className="text-lg font-semibold" data-testid="text-streak">{streak} dias</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  <Clock className="text-secondary w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Tempo</p>
                  <p className="text-lg font-semibold" data-testid="text-total-time">{totalTime} min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="bg-destructive/10 p-2 rounded-lg">
                  <Weight className="text-destructive w-5 h-5" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-muted-foreground">Peso Total</p>
                  <p className="text-lg font-semibold" data-testid="text-total-weight">{(totalWeight / 1000).toFixed(1)} ton</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Workout Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Today's Workout */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Treino de Hoje</h3>
              <div className="space-y-3">
                {workouts.length > 0 ? (
                  <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mr-3">
                        <i className="fas fa-play text-primary"></i>
                      </div>
                      <div>
                        <p className="font-medium" data-testid="text-workout-name">{workouts[0]?.name}</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-workout-info">
                          {Array.isArray(workouts[0]?.exercises) ? (workouts[0].exercises as any[]).length : 0} exercícios • 45 min
                        </p>
                      </div>
                    </div>
                    <Button 
                      onClick={() => handleStartWorkout(workouts[0]?.id)}
                      disabled={!!activeSession || startWorkoutMutation.isPending}
                      data-testid="button-start-workout"
                    >
                      {startWorkoutMutation.isPending ? "Iniciando..." : "Iniciar"}
                    </Button>
                  </div>
                ) : (
                  <div className="text-center p-6 text-muted-foreground">
                    <p>Nenhum treino disponível</p>
                    <p className="text-sm">Gere um treino com IA abaixo</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* AI Workout Generation */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4">Criar Treino com IA</h3>
              <div className="space-y-4">
                <Select value={objetivo} onValueChange={setObjetivo}>
                  <SelectTrigger data-testid="select-objetivo">
                    <SelectValue placeholder="Selecione o objetivo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                    <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                    <SelectItem value="força">Força</SelectItem>
                    <SelectItem value="resistência">Resistência</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={nivel} onValueChange={setNivel}>
                  <SelectTrigger data-testid="select-nivel">
                    <SelectValue placeholder="Selecione o nível" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="iniciante">Iniciante</SelectItem>
                    <SelectItem value="intermediário">Intermediário</SelectItem>
                    <SelectItem value="avançado">Avançado</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  onClick={handleGenerateWorkout}
                  disabled={generateWorkoutMutation.isPending}
                  className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
                  data-testid="button-generate-workout"
                >
                  {generateWorkoutMutation.isPending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-robot mr-2"></i>Gerar Treino
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Workout Display */}
        {activeSession && (
          <Card className="mb-6 slide-up">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold" data-testid="text-active-workout">
                  Treino Ativo
                </h3>
                <div className="flex items-center space-x-4">
                  <WorkoutTimer startTime={activeSession.startTime.toString()} />
                  <Button 
                    onClick={handleEndWorkout}
                    disabled={endWorkoutMutation.isPending}
                    variant="destructive"
                    size="sm"
                    data-testid="button-end-workout"
                  >
                    {endWorkoutMutation.isPending ? "Finalizando..." : "Finalizar"}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="border border-border rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="w-20 h-20 bg-muted rounded-lg mr-4 flex items-center justify-center">
                      <i className="fas fa-play text-muted-foreground text-2xl"></i>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold" data-testid="text-exercise-name">Supino Reto</h4>
                      <p className="text-sm text-muted-foreground" data-testid="text-exercise-sets">4 séries x 12 repetições</p>
                    </div>
                    <Button variant="outline" size="sm" data-testid="button-exercise-demo">
                      <i className="fas fa-info-circle mr-1"></i>Demo
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-2 mb-3">
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">Série 1</p>
                      <p className="font-medium">80kg</p>
                      <p className="text-xs">12x</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">Série 2</p>
                      <p className="font-medium">80kg</p>
                      <p className="text-xs">12x</p>
                    </div>
                    <div className="text-center p-2 bg-muted/50 rounded">
                      <p className="text-xs text-muted-foreground">Série 3</p>
                      <p className="font-medium">85kg</p>
                      <p className="text-xs">10x</p>
                    </div>
                    <div className="text-center p-2 bg-accent/10 rounded border-2 border-accent">
                      <p className="text-xs text-muted-foreground">Série 4</p>
                      <p className="font-medium text-accent">Atual</p>
                      <p className="text-xs">--</p>
                    </div>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Input 
                      type="number" 
                      placeholder="Peso" 
                      value={currentSet.peso}
                      onChange={(e) => setCurrentSet(prev => ({ ...prev, peso: e.target.value }))}
                      className="flex-1"
                      data-testid="input-weight"
                    />
                    <Input 
                      type="number" 
                      placeholder="Reps" 
                      value={currentSet.reps}
                      onChange={(e) => setCurrentSet(prev => ({ ...prev, reps: e.target.value }))}
                      className="flex-1"
                      data-testid="input-reps"
                    />
                    <Button 
                      onClick={handleLogSet}
                      disabled={!currentSet.peso || !currentSet.reps}
                      className="bg-accent text-accent-foreground hover:bg-accent/90"
                      data-testid="button-log-set"
                    >
                      <i className="fas fa-check"></i>
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Progress History */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Histórico de Progresso</h3>
            <div className="space-y-4">
              {sessions.slice(0, 5).map((session: WorkoutSession, index: number) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mr-3">
                      <i className="fas fa-check text-accent"></i>
                    </div>
                    <div>
                      <p className="font-medium" data-testid={`text-session-name-${index}`}>
                        Treino {index + 1}
                      </p>
                      <p className="text-sm text-muted-foreground" data-testid={`text-session-date-${index}`}>
                        {session.duration || 0} min
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium" data-testid={`text-session-weight-${index}`}>
                      {((session.totalWeight || 0) / 1000).toFixed(1)} ton
                    </p>
                    <p className="text-sm text-muted-foreground">Concluído</p>
                  </div>
                </div>
              ))}
              
              {sessions.length === 0 && (
                <div className="text-center p-6 text-muted-foreground">
                  <p>Nenhum treino realizado ainda</p>
                  <p className="text-sm">Comece seu primeiro treino acima!</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <BottomNavigation activeView="aluno" />
    </div>
  );
}

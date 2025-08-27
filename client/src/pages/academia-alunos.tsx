import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import BottomNavigation from "../components/bottom-navigation";
import { Users, UserPlus, Search, Calendar, Mail, Phone } from "lucide-react";
import { User } from "@shared/schema";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

interface AlunoFormData {
  firstName: string;
  lastName: string;
  email: string;
  birthDate?: string;
}

export default function AcademiaAlunos() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const form = useForm<AlunoFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      birthDate: "",
    },
  });

  // Fetch alunos
  const { data: alunos = [], isLoading: isLoadingAlunos } = useQuery<User[]>({
    queryKey: ["/api/academia/alunos"],
    enabled: isAuthenticated,
  });

  // Create aluno mutation
  const createAlunoMutation = useMutation({
    mutationFn: (data: AlunoFormData) => apiRequest("/api/academia/alunos", {
      method: "POST",
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academia/alunos"] });
      queryClient.invalidateQueries({ queryKey: ["/api/academia/dashboard"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Aluno cadastrado!",
        description: "O aluno foi cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Erro ao cadastrar aluno",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AlunoFormData) => {
    createAlunoMutation.mutate(data);
  };

  // Filter alunos based on search
  const filteredAlunos = alunos.filter(aluno => 
    `${aluno.firstName} ${aluno.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    aluno.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                Academia - Alunos
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gestão de Alunos</h2>
            <p className="text-muted-foreground">Cadastre e gerencie os alunos da academia</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-aluno">
                <UserPlus className="mr-2 w-4 h-4" />
                Novo Aluno
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Aluno</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome</FormLabel>
                          <FormControl>
                            <Input placeholder="Nome" {...field} data-testid="input-first-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sobrenome</FormLabel>
                          <FormControl>
                            <Input placeholder="Sobrenome" {...field} data-testid="input-last-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="birthDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-birth-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createAlunoMutation.isPending}
                      data-testid="button-save"
                    >
                      {createAlunoMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Buscar alunos por nome ou email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="bg-primary/10 p-3 rounded-lg">
                  <Users className="text-primary w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-total-alunos">{alunos.length}</p>
                  <p className="text-muted-foreground">Total de Alunos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alunos List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Alunos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingAlunos ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando alunos...</p>
              </div>
            ) : filteredAlunos.length > 0 ? (
              <div className="space-y-4">
                {filteredAlunos.map((aluno, index) => (
                  <div 
                    key={aluno.id} 
                    className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mr-4">
                        <span className="font-medium text-primary" data-testid={`text-aluno-initials-${index}`}>
                          {aluno.firstName?.[0]}{aluno.lastName?.[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium" data-testid={`text-aluno-name-${index}`}>
                          {aluno.firstName} {aluno.lastName}
                        </p>
                        <div className="flex items-center text-sm text-muted-foreground mt-1">
                          {aluno.email && (
                            <div className="flex items-center mr-4">
                              <Mail className="w-4 h-4 mr-1" />
                              <span data-testid={`text-aluno-email-${index}`}>{aluno.email}</span>
                            </div>
                          )}
                          {aluno.birthDate && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              <span data-testid={`text-aluno-birth-${index}`}>
                                {new Date(aluno.birthDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Ativo
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">
                        Membro desde {aluno.createdAt ? new Date(aluno.createdAt).toLocaleDateString('pt-BR') : ''}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum aluno encontrado para sua busca" : "Nenhum aluno cadastrado"}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cadastre o primeiro aluno clicando no botão "Novo Aluno"
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
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import BottomNavigation from "../components/bottom-navigation";
import { Users, UserPlus, Search, Calendar, Mail, Dumbbell, Building2, Link2, Unlink } from "lucide-react";
import { User, Gym } from "@shared/schema";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";

interface PersonalWithGyms extends User {
  gyms?: Gym[];
}

interface PersonalFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  cref?: string;
  specializations?: string[];
  birthDate?: string;
  gymIds?: string[];
}

export default function AcademiaPersonais() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const [specializationsInput, setSpecializationsInput] = useState<string>("");

  const form = useForm<PersonalFormData>({
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      cref: "",
      birthDate: "",
    },
  });

  // Preview mode via ?preview=1
  const isPreview = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('preview') === '1';
  const currentGymId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('gymId') : null;

  // Fetch available gyms
  const { data: availableGyms = [] } = useQuery<Gym[]>({
    queryKey: ["/api/gyms/available"],
    enabled: isAuthenticated,
  });

  // Get current gym ID from user context or query param
  const gymId = currentGymId || (availableGyms.length > 0 ? availableGyms[0]?.id : null);

  // Fetch personais for current gym
  const { data: personais = [], isLoading: isLoadingPersonais } = useQuery<PersonalWithGyms[]>({
    queryKey: gymId ? ["/api/personals/gym", gymId] : ["/api/personals/gym", "default"],
    enabled: (isAuthenticated && !!gymId) || (isPreview && !!gymId),
  });

  // Create personal mutation
  const createPersonalMutation = useMutation({
    mutationFn: (data: PersonalFormData) => apiRequest("POST", "/api/personals", {
      ...data,
      gymIds: selectedGymIds.length > 0 ? selectedGymIds : (gymId ? [gymId] : []),
      specializations: specializationsInput ? specializationsInput.split(',').map(s => s.trim()) : []
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personals/gym", gymId] });
      queryClient.invalidateQueries({ queryKey: ["/api/academia/dashboard"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedGymIds([]);
      setSpecializationsInput("");
      toast({
        title: "Personal cadastrado!",
        description: "O personal trainer foi cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Erro ao cadastrar personal trainer",
        variant: "destructive",
      });
    },
  });

  // Link/unlink gym mutations
  const linkGymMutation = useMutation({
    mutationFn: ({ personalId, gymId }: { personalId: string, gymId: string }) =>
      apiRequest("POST", `/api/personals/${personalId}/gyms/${gymId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personals/gym", gymId] });
      toast({
        title: "Academia vinculada!",
        description: "Personal vinculado à academia com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao vincular",
        description: error.message || "Erro ao vincular personal à academia",
        variant: "destructive",
      });
    },
  });

  const unlinkGymMutation = useMutation({
    mutationFn: ({ personalId, gymId }: { personalId: string, gymId: string }) =>
      apiRequest("DELETE", `/api/personals/${personalId}/gyms/${gymId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personals/gym", gymId] });
      toast({
        title: "Academia desvinculada!",
        description: "Personal desvinculado da academia com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desvincular",
        description: error.message || "Erro ao desvincular personal da academia",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PersonalFormData) => {
    createPersonalMutation.mutate(data);
  };

  // Filter personais based on search
  const filteredPersonais = personais.filter(personal => 
    `${personal.firstName} ${personal.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    personal.email?.toLowerCase().includes(searchTerm.toLowerCase())
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
                Academia - Personal Trainers
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
            <h2 className="text-2xl font-bold text-foreground">Gestão de Personal Trainers</h2>
            <p className="text-muted-foreground">Cadastre e gerencie os personal trainers da academia</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-personal">
                <UserPlus className="mr-2 w-4 h-4" />
                Novo Personal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Personal Trainer</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto">
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
                        <FormLabel>Email *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@exemplo.com" {...field} data-testid="input-email" required />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input placeholder="(11) 98765-4321" {...field} data-testid="input-phone" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="cref"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CREF</FormLabel>
                          <FormControl>
                            <Input placeholder="123456-G/SP" {...field} data-testid="input-cref" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormItem>
                    <FormLabel>Especializações</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ex: Musculação, Pilates, Crossfit"
                        value={specializationsInput}
                        onChange={(e) => setSpecializationsInput(e.target.value)}
                        data-testid="input-specializations"
                      />
                    </FormControl>
                    <p className="text-sm text-muted-foreground">Separe por vírgula</p>
                  </FormItem>
                  
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
                  
                  {availableGyms.length > 1 && (
                    <FormItem>
                      <FormLabel>Academias</FormLabel>
                      <div className="space-y-2 mt-2">
                        {availableGyms.map((gym) => (
                          <div key={gym.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`gym-${gym.id}`}
                              checked={selectedGymIds.includes(gym.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedGymIds([...selectedGymIds, gym.id]);
                                } else {
                                  setSelectedGymIds(selectedGymIds.filter(id => id !== gym.id));
                                }
                              }}
                              data-testid={`checkbox-gym-${gym.id}`}
                            />
                            <label
                              htmlFor={`gym-${gym.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {gym.name}
                            </label>
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        Selecione as academias onde este personal atuará
                      </p>
                    </FormItem>
                  )}
                  
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
                      disabled={createPersonalMutation.isPending}
                      data-testid="button-save"
                    >
                      {createPersonalMutation.isPending ? "Salvando..." : "Salvar"}
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
              placeholder="Buscar personal trainers por nome ou email..."
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
                <div className="bg-secondary/10 p-3 rounded-lg">
                  <Dumbbell className="text-secondary w-6 h-6" />
                </div>
                <div className="ml-4">
                  <p className="text-2xl font-bold" data-testid="text-total-personais">{personais.length}</p>
                  <p className="text-muted-foreground">Personal Trainers</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Personais List */}
        <Card>
          <CardHeader>
            <CardTitle>Lista de Personal Trainers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingPersonais ? (
              <div className="text-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground">Carregando personal trainers...</p>
              </div>
            ) : filteredPersonais.length > 0 ? (
              <div className="space-y-4">
                {filteredPersonais.map((personal, index) => (
                  <div 
                    key={personal.id} 
                    className="p-4 bg-muted/50 rounded-lg border"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center flex-1">
                        <div className="w-12 h-12 bg-secondary/10 rounded-full flex items-center justify-center mr-4">
                          <span className="font-medium text-secondary" data-testid={`text-personal-initials-${index}`}>
                            {personal.firstName?.[0]}{personal.lastName?.[0]}
                          </span>
                        </div>
                        <div className="flex-1">
                          <p className="font-medium" data-testid={`text-personal-name-${index}`}>
                            {personal.firstName} {personal.lastName}
                          </p>
                          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                            {personal.email && (
                              <div className="flex items-center">
                                <Mail className="w-4 h-4 mr-1" />
                                <span data-testid={`text-personal-email-${index}`}>{personal.email}</span>
                              </div>
                            )}
                            {personal.cref && (
                              <div className="flex items-center">
                                <span className="font-medium mr-1">CREF:</span>
                                <span data-testid={`text-personal-cref-${index}`}>{personal.cref}</span>
                              </div>
                            )}
                            {personal.birthDate && (
                              <div className="flex items-center">
                                <Calendar className="w-4 h-4 mr-1" />
                                <span data-testid={`text-personal-birth-${index}`}>
                                  {new Date(personal.birthDate).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>
                          {personal.specializations && personal.specializations.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {personal.specializations.map((spec, specIndex) => (
                                <Badge key={specIndex} variant="outline" className="text-xs">
                                  {spec}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Ativo
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          Desde {personal.createdAt ? new Date(personal.createdAt).toLocaleDateString('pt-BR') : ''}
                        </p>
                      </div>
                    </div>
                    
                    {/* Gyms badges */}
                    {personal.gyms && personal.gyms.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap pt-3 border-t">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Academias:</span>
                        {personal.gyms.map((gym) => (
                          <Badge key={gym.id} variant="secondary" className="flex items-center gap-1">
                            {gym.name}
                            <button
                              onClick={() => unlinkGymMutation.mutate({ personalId: personal.id, gymId: gym.id })}
                              className="ml-1 hover:text-destructive"
                              data-testid={`button-unlink-gym-${gym.id}`}
                              title="Desvincular desta academia"
                            >
                              <Unlink className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                        {/* Show available gyms to link */}
                        {availableGyms
                          .filter(gym => !personal.gyms?.some(pg => pg.id === gym.id))
                          .map((gym) => (
                            <Button
                              key={gym.id}
                              variant="outline"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => linkGymMutation.mutate({ personalId: personal.id, gymId: gym.id })}
                              data-testid={`button-link-gym-${gym.id}`}
                            >
                              <Link2 className="w-3 h-3 mr-1" />
                              Vincular a {gym.name}
                            </Button>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Dumbbell className="mx-auto w-12 h-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchTerm ? "Nenhum personal trainer encontrado para sua busca" : "Nenhum personal trainer cadastrado"}
                </p>
                {!searchTerm && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Cadastre o primeiro personal trainer clicando no botão "Novo Personal"
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
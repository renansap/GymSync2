import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import BottomNavigation from "../components/bottom-navigation";
import { ArrowLeft, Plus, Edit, Trash2, Building2, Users, MapPin, Phone, Mail, Copy, Check, Shield } from "lucide-react";
import { Link } from "wouter";
import type { Gym, InsertGym } from "@shared/schema";

export default function AdminAcademias() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGym, setEditingGym] = useState<Gym | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const { toast } = useToast();

  // Check admin authentication
  const { data: adminAuth, isLoading: isLoadingAdminAuth } = useQuery<{ authenticated: boolean }>({
    queryKey: ["/api/admin/check"],
    retry: false,
  });

  // Fetch gyms
  const { data: gyms = [], isLoading: isLoadingGyms, refetch } = useQuery<Gym[]>({
    queryKey: ["/api/admin/gyms"],
    enabled: adminAuth?.authenticated,
  });

  if (isLoadingAdminAuth) {
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

  // Create gym mutation
  const createGymMutation = useMutation({
    mutationFn: async (gymData: InsertGym) => {
      const response = await apiRequest("POST", "/api/admin/gyms", gymData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gyms"] });
      setIsCreateOpen(false);
      toast({
        title: "Academia criada",
        description: "Academia criada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar academia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update gym mutation
  const updateGymMutation = useMutation({
    mutationFn: async ({ gymId, gymData }: { gymId: string; gymData: Partial<InsertGym> }) => {
      const response = await apiRequest("PUT", `/api/admin/gyms/${gymId}`, gymData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gyms"] });
      setEditingGym(null);
      toast({
        title: "Academia atualizada",
        description: "Academia atualizada com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar academia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete gym mutation
  const deleteGymMutation = useMutation({
    mutationFn: async (gymId: string) => {
      const response = await apiRequest("DELETE", `/api/admin/gyms/${gymId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/gyms"] });
      toast({
        title: "Academia excluída",
        description: "Academia excluída com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir academia",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const gymData: InsertGym = {
      name: formData.get("name") as string,
      cnpj: formData.get("cnpj") as string,
      email: formData.get("email") as string,
      phone: formData.get("phone") as string,
      address: formData.get("address") as string,
      city: formData.get("city") as string,
      state: formData.get("state") as string,
      zipCode: formData.get("zipCode") as string,
      description: formData.get("description") as string,
      website: formData.get("website") as string,
      maxMembers: parseInt(formData.get("maxMembers") as string) || 1000,
    };

    if (editingGym) {
      updateGymMutation.mutate({ gymId: editingGym.id, gymData });
    } else {
      createGymMutation.mutate(gymData);
    }
  };

  const copyInviteCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({
      title: "Código copiado",
      description: "Código de convite copiado para a área de transferência!",
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/admin" data-testid="button-back">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
                </Button>
              </Link>
              <div className="flex items-center">
                <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
                <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                  Gestão de Academias
                </span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-create-gym">
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Academia
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Cadastrar Nova Academia</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="name">Nome da Academia *</Label>
                        <Input id="name" name="name" required />
                      </div>
                      <div>
                        <Label htmlFor="cnpj">CNPJ</Label>
                        <Input id="cnpj" name="cnpj" placeholder="00.000.000/0001-00" />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input id="email" name="email" type="email" required />
                      </div>
                      <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" name="phone" placeholder="(11) 99999-9999" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="address">Endereço</Label>
                      <Input id="address" name="address" />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input id="city" name="city" />
                      </div>
                      <div>
                        <Label htmlFor="state">Estado</Label>
                        <Input id="state" name="state" placeholder="SP" />
                      </div>
                      <div>
                        <Label htmlFor="zipCode">CEP</Label>
                        <Input id="zipCode" name="zipCode" placeholder="00000-000" />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input id="website" name="website" placeholder="https://..." />
                    </div>
                    
                    <div>
                      <Label htmlFor="maxMembers">Limite de Membros</Label>
                      <Input id="maxMembers" name="maxMembers" type="number" defaultValue="1000" />
                    </div>
                    
                    <div>
                      <Label htmlFor="description">Descrição</Label>
                      <Textarea id="description" name="description" rows={3} />
                    </div>
                    
                    <div className="flex justify-end space-x-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateOpen(false)}
                      >
                        Cancelar
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createGymMutation.isPending}
                        data-testid="button-submit-gym"
                      >
                        {createGymMutation.isPending ? "Criando..." : "Criar Academia"}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
              
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
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Building2 className="w-8 h-8 text-primary mr-3" />
            <div>
              <h2 className="text-3xl font-bold text-foreground">Gestão de Academias</h2>
              <p className="text-muted-foreground">Cadastre e gerencie academias do sistema</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <Building2 className="w-4 h-4 mr-2 text-blue-600" />
                Total de Academias
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gyms.length}</div>
              <p className="text-xs text-muted-foreground">+{gyms.filter(g => g.isActive).length} ativas</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <Users className="w-4 h-4 mr-2 text-green-600" />
                Membros Totais
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{gyms.reduce((acc, gym) => acc + (gym.maxMembers || 0), 0)}</div>
              <p className="text-xs text-muted-foreground">Capacidade máxima</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-sm font-medium">
                <MapPin className="w-4 h-4 mr-2 text-purple-600" />
                Cidades
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(gyms.map(g => g.city).filter(Boolean)).size}
              </div>
              <p className="text-xs text-muted-foreground">Localizações únicas</p>
            </CardContent>
          </Card>
        </div>

        {/* Gyms List */}
        {isLoadingGyms ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando academias...</p>
          </div>
        ) : gyms.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhuma academia cadastrada</h3>
              <p className="text-muted-foreground mb-4">Comece criando sua primeira academia</p>
              <Button onClick={() => setIsCreateOpen(true)} data-testid="button-create-first-gym">
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Academia
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {gyms.map((gym) => (
              <Card key={gym.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{gym.name}</CardTitle>
                        <div className="flex items-center space-x-4 mt-2 text-sm text-muted-foreground">
                          {gym.city && (
                            <div className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {gym.city}, {gym.state}
                            </div>
                          )}
                          {gym.email && (
                            <div className="flex items-center">
                              <Mail className="w-3 h-3 mr-1" />
                              {gym.email}
                            </div>
                          )}
                          {gym.phone && (
                            <div className="flex items-center">
                              <Phone className="w-3 h-3 mr-1" />
                              {gym.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={gym.isActive ? "default" : "secondary"}>
                        {gym.isActive ? "Ativa" : "Inativa"}
                      </Badge>
                      <Badge variant="outline">
                        {gym.maxMembers} membros
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {gym.description && (
                    <p className="text-muted-foreground mb-4">{gym.description}</p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Código de Convite:</span>
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {gym.inviteCode}
                      </code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyInviteCode(gym.inviteCode!)}
                        data-testid={`button-copy-${gym.id}`}
                      >
                        {copiedCode === gym.inviteCode ? (
                          <Check className="w-3 h-3" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Dialog open={editingGym?.id === gym.id} onOpenChange={(open) => !open && setEditingGym(null)}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setEditingGym(gym)}>
                            <Edit className="w-3 h-3 mr-1" />
                            Editar
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Editar Academia</DialogTitle>
                          </DialogHeader>
                          <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-name">Nome da Academia *</Label>
                                <Input id="edit-name" name="name" defaultValue={gym.name} required />
                              </div>
                              <div>
                                <Label htmlFor="edit-cnpj">CNPJ</Label>
                                <Input id="edit-cnpj" name="cnpj" defaultValue={gym.cnpj || ""} />
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="edit-email">Email *</Label>
                                <Input id="edit-email" name="email" type="email" defaultValue={gym.email || ""} required />
                              </div>
                              <div>
                                <Label htmlFor="edit-phone">Telefone</Label>
                                <Input id="edit-phone" name="phone" defaultValue={gym.phone || ""} />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="edit-address">Endereço</Label>
                              <Input id="edit-address" name="address" defaultValue={gym.address || ""} />
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <Label htmlFor="edit-city">Cidade</Label>
                                <Input id="edit-city" name="city" defaultValue={gym.city || ""} />
                              </div>
                              <div>
                                <Label htmlFor="edit-state">Estado</Label>
                                <Input id="edit-state" name="state" defaultValue={gym.state || ""} />
                              </div>
                              <div>
                                <Label htmlFor="edit-zipCode">CEP</Label>
                                <Input id="edit-zipCode" name="zipCode" defaultValue={gym.zipCode || ""} />
                              </div>
                            </div>
                            
                            <div>
                              <Label htmlFor="edit-website">Website</Label>
                              <Input id="edit-website" name="website" defaultValue={gym.website || ""} />
                            </div>
                            
                            <div>
                              <Label htmlFor="edit-maxMembers">Limite de Membros</Label>
                              <Input id="edit-maxMembers" name="maxMembers" type="number" defaultValue={gym.maxMembers || 1000} />
                            </div>
                            
                            <div>
                              <Label htmlFor="edit-description">Descrição</Label>
                              <Textarea id="edit-description" name="description" rows={3} defaultValue={gym.description || ""} />
                            </div>
                            
                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="button" 
                                variant="outline" 
                                onClick={() => setEditingGym(null)}
                              >
                                Cancelar
                              </Button>
                              <Button 
                                type="submit" 
                                disabled={updateGymMutation.isPending}
                                data-testid="button-update-gym"
                              >
                                {updateGymMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                              </Button>
                            </div>
                          </form>
                        </DialogContent>
                      </Dialog>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                            <Trash2 className="w-3 h-3 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a academia "{gym.name}"? 
                              Esta ação não pode ser desfeita e todos os dados associados serão perdidos.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteGymMutation.mutate(gym.id)}
                              className="bg-red-600 hover:bg-red-700"
                              data-testid={`button-confirm-delete-${gym.id}`}
                            >
                              Excluir Academia
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation activeView="academia" />
    </div>
  );
}
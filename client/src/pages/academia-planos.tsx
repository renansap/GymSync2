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
import { CreditCard, Plus, Edit2, Trash2, DollarSign, Calendar, ArrowLeft } from "lucide-react";
import { GymPlan } from "@shared/schema";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Switch } from "@/components/ui/switch";

const planFormSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  price: z.number().min(0, "Preço deve ser maior ou igual a zero"),
  durationDays: z.number().min(1, "Duração deve ser de pelo menos 1 dia"),
  isActive: z.boolean().default(true),
});

type PlanFormData = z.infer<typeof planFormSchema>;

export default function AcademiaPlanos() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<GymPlan | null>(null);

  const form = useForm<PlanFormData>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: "",
      price: 0,
      durationDays: 30,
      isActive: true,
    },
  });

  const { data: planos = [], isLoading: isLoadingPlanos } = useQuery<GymPlan[]>({
    queryKey: ["/api/academia/planos"],
  });

  const createPlanoMutation = useMutation({
    mutationFn: (data: PlanFormData) => apiRequest("POST", "/api/academia/planos", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academia/planos"] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
      toast({
        title: "Plano cadastrado!",
        description: "O plano foi cadastrado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Erro ao cadastrar plano",
        variant: "destructive",
      });
    },
  });

  const updatePlanoMutation = useMutation({
    mutationFn: ({ planId, data }: { planId: string; data: PlanFormData }) => 
      apiRequest("PUT", `/api/academia/planos/${planId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academia/planos"] });
      setIsDialogOpen(false);
      setEditingPlan(null);
      form.reset();
      toast({
        title: "Plano atualizado!",
        description: "O plano foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Erro ao atualizar plano",
        variant: "destructive",
      });
    },
  });

  const deletePlanoMutation = useMutation({
    mutationFn: (planId: string) => apiRequest("DELETE", `/api/academia/planos/${planId}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/academia/planos"] });
      toast({
        title: "Plano excluído!",
        description: "O plano foi excluído com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir",
        description: error.message || "Erro ao excluir plano",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PlanFormData) => {
    if (editingPlan) {
      updatePlanoMutation.mutate({ planId: editingPlan.id, data });
    } else {
      createPlanoMutation.mutate(data);
    }
  };

  const handleEdit = (plan: GymPlan) => {
    setEditingPlan(plan);
    form.reset({
      name: plan.name,
      price: plan.price ?? 0,
      durationDays: plan.durationDays,
      isActive: plan.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = (planId: string) => {
    if (confirm("Tem certeza que deseja excluir este plano?")) {
      deletePlanoMutation.mutate(planId);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
    form.reset();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100);
  };

  const formatDuration = (days: number) => {
    if (days === 30 || days === 31) return "1 mês";
    if (days === 90) return "3 meses";
    if (days === 180) return "6 meses";
    if (days === 365) return "1 ano";
    return `${days} dias`;
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
      <header className="bg-card shadow-sm border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-primary" data-testid="app-title">GymSync</h1>
              <span className="ml-3 px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
                Academia - Planos
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline"
                size="sm"
                onClick={() => window.location.href = "/hub-academia"}
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
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
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Gestão de Planos</h2>
            <p className="text-muted-foreground">Cadastre e gerencie os planos de assinatura da academia</p>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingPlan(null); form.reset(); }} data-testid="button-add-plan">
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingPlan ? "Editar Plano" : "Cadastrar Novo Plano"}</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Plano</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            placeholder="Ex: Mensal, Trimestral, Anual" 
                            data-testid="input-plan-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preço (em centavos)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="Ex: 9900 (R$ 99,00)"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-plan-price"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duração (em dias)</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            placeholder="Ex: 30, 90, 365"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            data-testid="input-plan-duration"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isActive"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Plano Ativo</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            Plano disponível para novas assinaturas
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="switch-plan-active"
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleDialogClose}
                      data-testid="button-cancel"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createPlanoMutation.isPending || updatePlanoMutation.isPending}
                      data-testid="button-submit-plan"
                    >
                      {(createPlanoMutation.isPending || updatePlanoMutation.isPending) ? "Salvando..." : editingPlan ? "Atualizar" : "Cadastrar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoadingPlanos ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando planos...</p>
          </div>
        ) : planos.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum plano cadastrado</h3>
              <p className="text-muted-foreground mb-4">
                Comece cadastrando o primeiro plano de assinatura da sua academia
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planos.map((plano) => (
              <Card key={plano.id} className={!plano.isActive ? "opacity-60" : ""} data-testid={`card-plan-${plano.id}`}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {plano.name}
                        {!plano.isActive && (
                          <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">
                            Inativo
                          </span>
                        )}
                      </CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plano)}
                        data-testid={`button-edit-${plano.id}`}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plano.id)}
                        data-testid={`button-delete-${plano.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-2xl font-bold text-primary">
                      <DollarSign className="h-5 w-5 mr-1" />
                      {formatCurrency(plano.price ?? 0)}
                    </div>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDuration(plano.durationDays)}
                    </div>
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">
                        Criado em {new Date(plano.createdAt!).toLocaleDateString('pt-BR')}
                      </p>
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

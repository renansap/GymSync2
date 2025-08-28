import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { X, Plus } from "lucide-react";
import { User } from "@shared/schema";

// Schema de validação do formulário
const userFormSchema = z.object({
  firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  phone: z.string().optional(),
  userType: z.enum(["aluno", "personal", "academia"]),
  
  // Endereço
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  
  // Datas
  birthDate: z.string().optional(),
  
  // Dados físicos
  height: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  weight: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  fitnessGoal: z.string().optional(),
  fitnessLevel: z.string().optional(),
  
  // Dados profissionais
  cref: z.string().optional(),
  specializations: z.array(z.string()).optional(),
  
  // Planos
  membershipType: z.string().optional(),
  membershipStart: z.string().optional(),
  membershipEnd: z.string().optional(),
  
  // Outros
  medicalRestrictions: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userFormSchema>;

interface UserFormProps {
  user?: User;
  onSubmit: (data: UserFormData) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
  title?: string;
}

export function UserForm({ user, onSubmit, onCancel, isSubmitting = false, title = "Cadastrar Usuário" }: UserFormProps) {
  const [specializationInput, setSpecializationInput] = useState("");
  const [specializations, setSpecializations] = useState<string[]>(user?.specializations || []);
  
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      email: user?.email || "",
      phone: user?.phone || "",
      userType: user?.userType || "aluno",
      address: user?.address || "",
      city: user?.city || "",
      state: user?.state || "",
      zipCode: user?.zipCode || "",
      birthDate: user?.birthDate ? new Date(user.birthDate).toISOString().split('T')[0] : "",
      height: user?.height?.toString() || "",
      weight: user?.weight?.toString() || "",
      fitnessGoal: user?.fitnessGoal || "",
      fitnessLevel: user?.fitnessLevel || "",
      cref: user?.cref || "",
      specializations: user?.specializations || [],
      membershipType: user?.membershipType || "",
      membershipStart: user?.membershipStart ? new Date(user.membershipStart).toISOString().split('T')[0] : "",
      membershipEnd: user?.membershipEnd ? new Date(user.membershipEnd).toISOString().split('T')[0] : "",
      medicalRestrictions: user?.medicalRestrictions || "",
      notes: user?.notes || "",
      isActive: user?.isActive ?? true,
    },
  });

  const userType = watch("userType");

  const addSpecialization = () => {
    if (specializationInput.trim() && !specializations.includes(specializationInput.trim())) {
      const newSpecs = [...specializations, specializationInput.trim()];
      setSpecializations(newSpecs);
      setValue("specializations", newSpecs);
      setSpecializationInput("");
    }
  };

  const removeSpecialization = (spec: string) => {
    const newSpecs = specializations.filter(s => s !== spec);
    setSpecializations(newSpecs);
    setValue("specializations", newSpecs);
  };

  const onFormSubmit = (data: UserFormData) => {
    onSubmit({ ...data, specializations });
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
          {/* Informações Básicas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Informações Básicas</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  {...register("firstName")}
                  data-testid="input-first-name"
                />
                {errors.firstName && (
                  <p className="text-sm text-red-500 mt-1">{errors.firstName.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="lastName">Sobrenome *</Label>
                <Input
                  id="lastName"
                  {...register("lastName")}
                  data-testid="input-last-name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-500 mt-1">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  {...register("email")}
                  data-testid="input-email"
                />
                {errors.email && (
                  <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>
              
              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  {...register("phone")}
                  placeholder="(11) 99999-9999"
                  data-testid="input-phone"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="userType">Tipo de Usuário *</Label>
                <Select value={userType} onValueChange={(value) => setValue("userType", value as any)}>
                  <SelectTrigger data-testid="select-user-type">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aluno">Aluno</SelectItem>
                    <SelectItem value="personal">Personal Trainer</SelectItem>
                    <SelectItem value="academia">Academia/Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  {...register("birthDate")}
                  data-testid="input-birth-date"
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Endereço</h3>
            
            <div>
              <Label htmlFor="address">Endereço Completo</Label>
              <Input
                id="address"
                {...register("address")}
                placeholder="Rua, número, complemento"
                data-testid="input-address"
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="city">Cidade</Label>
                <Input
                  id="city"
                  {...register("city")}
                  data-testid="input-city"
                />
              </div>
              
              <div>
                <Label htmlFor="state">Estado</Label>
                <Input
                  id="state"
                  {...register("state")}
                  placeholder="SP"
                  data-testid="input-state"
                />
              </div>
              
              <div>
                <Label htmlFor="zipCode">CEP</Label>
                <Input
                  id="zipCode"
                  {...register("zipCode")}
                  placeholder="00000-000"
                  data-testid="input-zip-code"
                />
              </div>
            </div>
          </div>

          {/* Dados Físicos e Objetivos (apenas para alunos) */}
          {userType === "aluno" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Dados Físicos e Objetivos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="height">Altura (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    {...register("height")}
                    placeholder="175"
                    data-testid="input-height"
                  />
                </div>
                
                <div>
                  <Label htmlFor="weight">Peso (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    {...register("weight")}
                    placeholder="70"
                    data-testid="input-weight"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fitnessGoal">Objetivo</Label>
                  <Select value={watch("fitnessGoal")} onValueChange={(value) => setValue("fitnessGoal", value)}>
                    <SelectTrigger data-testid="select-fitness-goal">
                      <SelectValue placeholder="Selecione o objetivo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="emagrecimento">Emagrecimento</SelectItem>
                      <SelectItem value="hipertrofia">Hipertrofia</SelectItem>
                      <SelectItem value="resistencia">Resistência</SelectItem>
                      <SelectItem value="forca">Força</SelectItem>
                      <SelectItem value="condicionamento">Condicionamento</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="fitnessLevel">Nível de Condicionamento</Label>
                  <Select value={watch("fitnessLevel")} onValueChange={(value) => setValue("fitnessLevel", value)}>
                    <SelectTrigger data-testid="select-fitness-level">
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediario">Intermediário</SelectItem>
                      <SelectItem value="avancado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="medicalRestrictions">Restrições Médicas</Label>
                <Textarea
                  id="medicalRestrictions"
                  {...register("medicalRestrictions")}
                  placeholder="Lesões, limitações ou restrições médicas"
                  data-testid="textarea-medical-restrictions"
                />
              </div>
            </div>
          )}

          {/* Dados Profissionais (apenas para personal trainers) */}
          {userType === "personal" && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b pb-2">Dados Profissionais</h3>
              
              <div>
                <Label htmlFor="cref">CREF</Label>
                <Input
                  id="cref"
                  {...register("cref")}
                  placeholder="000000-G/SP"
                  data-testid="input-cref"
                />
              </div>
              
              <div>
                <Label>Especializações</Label>
                <div className="flex gap-2 mb-2">
                  <Input
                    value={specializationInput}
                    onChange={(e) => setSpecializationInput(e.target.value)}
                    placeholder="Digite uma especialização"
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
                    data-testid="input-specialization"
                  />
                  <Button type="button" onClick={addSpecialization} size="sm" data-testid="button-add-specialization">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {specializations.map((spec, index) => (
                    <Badge key={index} variant="secondary" className="flex items-center gap-1">
                      {spec}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeSpecialization(spec)}
                        data-testid={`remove-specialization-${index}`}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Plano de Assinatura */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Plano de Assinatura</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="membershipType">Tipo de Plano</Label>
                <Select value={watch("membershipType")} onValueChange={(value) => setValue("membershipType", value)}>
                  <SelectTrigger data-testid="select-membership-type">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mensal">Mensal</SelectItem>
                    <SelectItem value="trimestral">Trimestral</SelectItem>
                    <SelectItem value="semestral">Semestral</SelectItem>
                    <SelectItem value="anual">Anual</SelectItem>
                    <SelectItem value="personal">Personal Training</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="membershipStart">Início do Plano</Label>
                <Input
                  id="membershipStart"
                  type="date"
                  {...register("membershipStart")}
                  data-testid="input-membership-start"
                />
              </div>
              
              <div>
                <Label htmlFor="membershipEnd">Fim do Plano</Label>
                <Input
                  id="membershipEnd"
                  type="date"
                  {...register("membershipEnd")}
                  data-testid="input-membership-end"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold border-b pb-2">Observações</h3>
            
            <div>
              <Label htmlFor="notes">Notas Gerais</Label>
              <Textarea
                id="notes"
                {...register("notes")}
                placeholder="Observações, notas especiais, preferências..."
                data-testid="textarea-notes"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="isActive"
                checked={watch("isActive")}
                onCheckedChange={(checked) => setValue("isActive", !!checked)}
                data-testid="checkbox-is-active"
              />
              <Label htmlFor="isActive">Usuário ativo</Label>
            </div>
          </div>

          {/* Botões */}
          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button 
              type="button" 
              variant="outline" 
              onClick={onCancel}
              disabled={isSubmitting}
              data-testid="button-cancel"
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              data-testid="button-submit"
            >
              {isSubmitting ? "Salvando..." : user ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
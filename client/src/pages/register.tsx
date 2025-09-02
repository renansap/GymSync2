import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Shield, Zap, Loader2, Mail, Lock, Eye, EyeOff, User, Phone, MapPin, Calendar, Ruler, Weight, Target, GraduationCap, Building2, Check, X } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

interface RegisterForm {
  // Informações básicas
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  userType: string;
  
  // Endereço
  address: string;
  city: string;
  state: string;
  zipCode: string;
  
  // Datas
  birthDate: string;
  
  // Dados físicos
  height: string;
  weight: string;
  fitnessGoal: string;
  fitnessLevel: string;
  
  // Dados profissionais (para personal trainers)
  cref: string;
  specializations: string[];
  
  // Plano e academia
  membershipType: string;
  membershipStart: string;
  membershipEnd: string;
  inviteCode: string;
  
  // Outros
  medicalRestrictions: string;
  notes: string;
  isActive: boolean;
}

interface GymInfo {
  id: string;
  name: string;
  isValid: boolean;
}

export default function Register() {
  const [formData, setFormData] = useState<RegisterForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    userType: "aluno",
    address: "",
    city: "",
    state: "",
    zipCode: "",
    birthDate: "",
    height: "",
    weight: "",
    fitnessGoal: "",
    fitnessLevel: "",
    cref: "",
    specializations: [],
    membershipType: "",
    membershipStart: "",
    membershipEnd: "",
    inviteCode: "",
    medicalRestrictions: "",
    notes: "",
    isActive: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [gymInfo, setGymInfo] = useState<GymInfo | null>(null);
  const [isValidatingCode, setIsValidatingCode] = useState(false);
  const [specializationInput, setSpecializationInput] = useState("");
  const { toast } = useToast();

  const userTypes = [
    { value: "aluno", label: "Aluno", icon: Users, color: "text-blue-600" },
    { value: "personal", label: "Personal Trainer", icon: Shield, color: "text-purple-600" }
  ];

  const fitnessGoals = [
    { value: "emagrecimento", label: "Emagrecimento" },
    { value: "hipertrofia", label: "Hipertrofia (Ganho de Massa)" },
    { value: "resistencia", label: "Resistência Cardiovascular" },
    { value: "forca", label: "Força" },
    { value: "flexibilidade", label: "Flexibilidade" },
    { value: "saude", label: "Saúde Geral" }
  ];

  const fitnessLevels = [
    { value: "iniciante", label: "Iniciante" },
    { value: "intermediario", label: "Intermediário" },
    { value: "avancado", label: "Avançado" }
  ];

  const membershipTypes = [
    { value: "mensal", label: "Mensal" },
    { value: "trimestral", label: "Trimestral" },
    { value: "semestral", label: "Semestral" },
    { value: "anual", label: "Anual" }
  ];

  const validateInviteCode = async (code: string) => {
    if (!code.trim()) return;
    
    setIsValidatingCode(true);
    try {
      const response = await fetch(`/api/gyms/invite/${code}`);
      if (response.ok) {
        const data = await response.json();
        setGymInfo({
          id: data.gymId,
          name: data.gymName,
          isValid: true
        });
        toast({
          title: "Código válido!",
          description: `Academia: ${data.gymName}`,
        });
      } else {
        setGymInfo(null);
        toast({
          title: "Código inválido",
          description: "Verifique o código de convite e tente novamente",
          variant: "destructive"
        });
      }
    } catch (error) {
      setGymInfo(null);
      toast({
        title: "Erro ao validar código",
        description: "Tente novamente",
        variant: "destructive"
      });
    } finally {
      setIsValidatingCode(false);
    }
  };

  const addSpecialization = () => {
    if (specializationInput.trim() && !formData.specializations.includes(specializationInput.trim())) {
      setFormData(prev => ({
        ...prev,
        specializations: [...prev.specializations, specializationInput.trim()]
      }));
      setSpecializationInput("");
    }
  };

  const removeSpecialization = (index: number) => {
    setFormData(prev => ({
      ...prev,
      specializations: prev.specializations.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    // Validação final antes do submit
    if (!validateCurrentStep()) {
      return;
    }

    setIsLoading(true);

    try {
      // Preparar dados para envio
      const registrationData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
        userType: formData.userType,
        phone: formData.phone.trim() || undefined,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        zipCode: formData.zipCode.trim() || undefined,
        birthDate: formData.birthDate || undefined,
        height: formData.height.trim() ? parseInt(formData.height.trim()) : undefined,
        weight: formData.weight.trim() ? parseInt(formData.weight.trim()) : undefined,
        fitnessGoal: formData.fitnessGoal || undefined,
        fitnessLevel: formData.fitnessLevel || undefined,
        cref: formData.cref.trim() || undefined,
        specializations: formData.specializations.length > 0 ? formData.specializations : undefined,
        membershipType: formData.membershipType || undefined,
        membershipStart: formData.membershipStart || undefined,
        membershipEnd: formData.membershipEnd || undefined,
        gymId: gymInfo?.id || undefined,
        medicalRestrictions: formData.medicalRestrictions.trim() || undefined,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive
      };

      console.log('Dados sendo enviados:', registrationData);

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registrationData),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Conta criada com sucesso!",
          description: "Agora você pode fazer login com suas credenciais",
        });
        
        // Redirecionar para login
        window.location.href = '/login';
      } else {
        const errorData = await response.json();
        toast({
          title: "Erro no registro",
          description: errorData.message || "Ocorreu um erro ao criar sua conta. Tente novamente.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro no registro:', error);
      toast({
        title: "Erro no registro",
        description: "Ocorreu um erro ao processar seu registro. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterForm, value: string | boolean | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password || !formData.confirmPassword || !formData.userType) {
        toast({
          title: "Campos obrigatórios",
          description: "Por favor, preencha todos os campos obrigatórios do passo 1",
          variant: "destructive"
        });
        return false;
      }
      
      if (formData.password !== formData.confirmPassword) {
        toast({
          title: "Senhas não coincidem",
          description: "As senhas devem ser iguais",
          variant: "destructive"
        });
        return false;
      }

      if (formData.password.length < 6) {
        toast({
          title: "Senha muito curta",
          description: "A senha deve ter pelo menos 6 caracteres",
          variant: "destructive"
        });
        return false;
      }

      // Validação do código de convite para alunos
      if (formData.userType === "aluno" && !gymInfo?.isValid) {
        toast({
          title: "Código de convite obrigatório",
          description: "Para alunos, é necessário um código de convite válido",
          variant: "destructive"
        });
        return false;
      }
    }
    
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep() && currentStep < 3) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      <div className="flex items-center space-x-4">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              currentStep >= step 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-500'
            }`}>
              {step}
            </div>
            {step < 3 && (
              <div className={`w-12 h-0.5 mx-2 ${
                currentStep > step ? 'bg-blue-500' : 'bg-gray-200'
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Informações Básicas</h3>
      
      {/* Nome e Sobrenome */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName" className="text-slate-700 font-medium">
            Nome * <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="firstName"
              type="text"
              placeholder="Seu nome"
              value={formData.firstName}
              onChange={(e) => handleInputChange("firstName", e.target.value)}
              className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="lastName" className="text-slate-700 font-medium">
            Sobrenome * <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="lastName"
              type="text"
              placeholder="Seu sobrenome"
              value={formData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
      </div>

      {/* Email e Telefone */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 font-medium">
            Email * <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-slate-700 font-medium">
            Telefone
          </Label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="phone"
              type="tel"
              placeholder="(11) 99999-9999"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Senhas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 font-medium">
            Senha * <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Mínimo 6 caracteres"
              value={formData.password}
              onChange={(e) => handleInputChange("password", e.target.value)}
              className="h-11 pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 hover:bg-slate-100"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4 text-slate-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400" />
              )}
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 font-medium">
            Confirmar Senha * <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="Confirme sua senha"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
              className="h-11 pl-10 pr-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              required
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-9 w-9 p-0 hover:bg-slate-100"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? (
                <EyeOff className="w-4 h-4 text-slate-400" />
              ) : (
                <Eye className="w-4 h-4 text-slate-400" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Tipo de Usuário */}
      <div className="space-y-2">
        <Label htmlFor="userType" className="text-slate-700 font-medium">
          Tipo de Usuário * <span className="text-red-500">*</span>
        </Label>
        <Select
          value={formData.userType}
          onValueChange={(value) => handleInputChange("userType", value)}
          required
        >
          <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
            <SelectValue placeholder="Selecione seu tipo de usuário" />
          </SelectTrigger>
          <SelectContent>
            {userTypes.map((type) => {
              const IconComponent = type.icon;
              return (
                <SelectItem key={type.value} value={type.value}>
                  <div className="flex items-center space-x-2">
                    <IconComponent className={`w-4 h-4 ${type.color}`} />
                    <span>{type.label}</span>
                  </div>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      {/* Código de Convite */}
      <div className="space-y-2">
        <Label htmlFor="inviteCode" className="text-slate-700 font-medium">
          Código de Convite {formData.userType === "aluno" && <span className="text-red-500">*</span>}
        </Label>
        <div className="relative">
          <Building2 className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="inviteCode"
            type="text"
            placeholder="Digite o código de convite da academia"
            value={formData.inviteCode}
            onChange={(e) => handleInputChange("inviteCode", e.target.value)}
            className="h-11 pl-10 pr-20 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            required={formData.userType === "aluno"}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 px-3"
            onClick={() => validateInviteCode(formData.inviteCode)}
            disabled={isValidatingCode || !formData.inviteCode.trim()}
          >
            {isValidatingCode ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              "Validar"
            )}
          </Button>
        </div>
        {gymInfo?.isValid && (
          <div className="flex items-center space-x-2 text-green-600 text-sm">
            <Check className="w-4 h-4" />
            <span>Academia: {gymInfo.name}</span>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Informações Pessoais</h3>
      
      {/* Data de Nascimento */}
      <div className="space-y-2">
        <Label htmlFor="birthDate" className="text-slate-700 font-medium">
          Data de Nascimento
        </Label>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="birthDate"
            type="date"
            value={formData.birthDate}
            onChange={(e) => handleInputChange("birthDate", e.target.value)}
            className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Dados Físicos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="height" className="text-slate-700 font-medium">
            Altura (cm)
          </Label>
          <div className="relative">
            <Ruler className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="height"
              type="number"
              placeholder="170"
              value={formData.height}
              onChange={(e) => handleInputChange("height", e.target.value)}
              className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="weight" className="text-slate-700 font-medium">
            Peso (kg)
          </Label>
          <div className="relative">
            <Weight className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              id="weight"
              type="number"
              placeholder="70"
              value={formData.weight}
              onChange={(e) => handleInputChange("weight", e.target.value)}
              className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Objetivo e Nível */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="fitnessGoal" className="text-slate-700 font-medium">
            Objetivo Fitness
          </Label>
          <Select
            value={formData.fitnessGoal}
            onValueChange={(value) => handleInputChange("fitnessGoal", value)}
          >
            <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Selecione seu objetivo" />
            </SelectTrigger>
            <SelectContent>
              {fitnessGoals.map((goal) => (
                <SelectItem key={goal.value} value={goal.value}>
                  {goal.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="fitnessLevel" className="text-slate-700 font-medium">
            Nível de Fitness
          </Label>
          <Select
            value={formData.fitnessLevel}
            onValueChange={(value) => handleInputChange("fitnessLevel", value)}
          >
            <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
              <SelectValue placeholder="Selecione seu nível" />
            </SelectTrigger>
            <SelectContent>
              {fitnessLevels.map((level) => (
                <SelectItem key={level.value} value={level.value}>
                  {level.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Dados Profissionais (apenas para Personal Trainers) */}
      {formData.userType === "personal" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="cref" className="text-slate-700 font-medium">
              CREF (Registro Profissional)
            </Label>
            <div className="relative">
              <GraduationCap className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                id="cref"
                type="text"
                placeholder="000000-G/SP"
                value={formData.cref}
                onChange={(e) => handleInputChange("cref", e.target.value)}
                className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">
              Especializações
            </Label>
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Ex: Musculação, Pilates, CrossFit"
                value={specializationInput}
                onChange={(e) => setSpecializationInput(e.target.value)}
                className="flex-1"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSpecialization())}
              />
              <Button
                type="button"
                variant="outline"
                onClick={addSpecialization}
                disabled={!specializationInput.trim()}
              >
                Adicionar
              </Button>
            </div>
            {formData.specializations.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.specializations.map((spec, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{spec}</span>
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => removeSpecialization(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* Restrições Médicas */}
      <div className="space-y-2">
        <Label htmlFor="medicalRestrictions" className="text-slate-700 font-medium">
          Restrições Médicas
        </Label>
        <Textarea
          id="medicalRestrictions"
          placeholder="Descreva qualquer restrição médica ou condição de saúde relevante"
          value={formData.medicalRestrictions}
          onChange={(e) => handleInputChange("medicalRestrictions", e.target.value)}
          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          rows={3}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-800 mb-4">Endereço e Plano</h3>
      
      {/* Endereço */}
      <div className="space-y-2">
        <Label htmlFor="address" className="text-slate-700 font-medium">
          Endereço
        </Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            id="address"
            type="text"
            placeholder="Rua, número, complemento"
            value={formData.address}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className="h-11 pl-10 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Cidade, Estado e CEP */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city" className="text-slate-700 font-medium">
            Cidade
          </Label>
          <Input
            id="city"
            type="text"
            placeholder="São Paulo"
            value={formData.city}
            onChange={(e) => handleInputChange("city", e.target.value)}
            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="state" className="text-slate-700 font-medium">
            Estado
          </Label>
          <Input
            id="state"
            type="text"
            placeholder="SP"
            value={formData.state}
            onChange={(e) => handleInputChange("state", e.target.value)}
            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="zipCode" className="text-slate-700 font-medium">
            CEP
          </Label>
          <Input
            id="zipCode"
            type="text"
            placeholder="00000-000"
            value={formData.zipCode}
            onChange={(e) => handleInputChange("zipCode", e.target.value)}
            className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Plano (apenas para alunos) */}
      {formData.userType === "aluno" && (
        <>
          <div className="space-y-2">
            <Label htmlFor="membershipType" className="text-slate-700 font-medium">
              Tipo de Plano
            </Label>
            <Select
              value={formData.membershipType}
              onValueChange={(value) => handleInputChange("membershipType", value)}
            >
              <SelectTrigger className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Selecione o tipo de plano" />
              </SelectTrigger>
              <SelectContent>
                {membershipTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="membershipStart" className="text-slate-700 font-medium">
                Data de Início do Plano
              </Label>
              <Input
                id="membershipStart"
                type="date"
                value={formData.membershipStart}
                onChange={(e) => handleInputChange("membershipStart", e.target.value)}
                className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="membershipEnd" className="text-slate-700 font-medium">
                Data de Fim do Plano
              </Label>
              <Input
                id="membershipEnd"
                type="date"
                value={formData.membershipEnd}
                onChange={(e) => handleInputChange("membershipEnd", e.target.value)}
                className="h-11 border-slate-200 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>
        </>
      )}

      {/* Observações */}
      <div className="space-y-2">
        <Label htmlFor="notes" className="text-slate-700 font-medium">
          Observações
        </Label>
        <Textarea
          id="notes"
          placeholder="Informações adicionais ou observações"
          value={formData.notes}
          onChange={(e) => handleInputChange("notes", e.target.value)}
          className="border-slate-200 focus:border-blue-500 focus:ring-blue-500"
          rows={3}
        />
      </div>

      {/* Ativo */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="isActive"
          checked={formData.isActive}
          onCheckedChange={(checked) => handleInputChange("isActive", checked as boolean)}
        />
        <Label htmlFor="isActive" className="text-slate-700 font-medium">
          Conta ativa
        </Label>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl shadow-lg flex items-center justify-center">
                <Zap className="w-8 h-8 text-white" />
              </div>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
            GymSync
          </h1>
          <p className="text-slate-600">
            Crie sua conta para começar sua jornada fitness
          </p>
        </div>

        {/* Step Indicator */}
        {renderStepIndicator()}

        {/* Register Form */}
        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-xl text-slate-800">
              {currentStep === 1 && "Informações Básicas"}
              {currentStep === 2 && "Informações Pessoais"}
              {currentStep === 3 && "Endereço e Plano"}
            </CardTitle>
            <p className="text-sm text-slate-500">
              Passo {currentStep} de 3
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={prevStep}
                  disabled={currentStep === 1}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Anterior
                </Button>

                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={nextStep}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
                  >
                    Próximo
                    <ArrowLeft className="w-4 h-4 ml-2 rotate-180" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 mr-2" />
                        Criar Conta
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Login Link */}
            <div className="text-center mt-6">
              <p className="text-sm text-slate-600">
                Já tem uma conta?{" "}
                <Link href="/login">
                  <span className="text-blue-600 hover:text-blue-700 font-medium cursor-pointer">
                    Faça login
                  </span>
                </Link>
              </p>
            </div>

            {/* Back to Home */}
            <div className="text-center mt-4">
              <Link href="/">
                <Button variant="ghost" className="text-slate-500 hover:text-slate-700">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar ao Início
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-slate-500">
          <p>✨ Plataforma desenvolvida para maximizar resultados através da tecnologia</p>
        </div>
      </div>
    </div>
  );
} 
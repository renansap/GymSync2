import {
  users,
  gyms,
  exercises,
  workouts,
  workoutSessions,
  personalClients,
  gymMembers,
  emailTemplates,
  type User,
  type UpsertUser,
  type Gym,
  type InsertGym,
  type UpdateGym,
  type Exercise,
  type InsertExercise,
  type Workout,
  type InsertWorkout,
  type WorkoutSession,
  type InsertWorkoutSession,
  type PersonalClient,
  type InsertPersonalClient,
  type GymMember,
  type InsertGymMember,
  type EmailTemplate,
  type InsertEmailTemplate,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, desc, or } from "drizzle-orm";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  createUser(user: { name: string; email: string; userType: string }): Promise<User>;
  
  // Exercise operations
  getExercises(): Promise<Exercise[]>;
  getExercisesByMuscleGroup(muscleGroup: string): Promise<Exercise[]>;
  createExercise(exercise: InsertExercise): Promise<Exercise>;
  
  // Workout operations
  getWorkoutsByUser(userId: string): Promise<Workout[]>;
  getWorkout(id: string): Promise<Workout | undefined>;
  createWorkout(workout: InsertWorkout): Promise<Workout>;
  
  // Workout session operations
  getWorkoutSessionsByUser(userId: string): Promise<WorkoutSession[]>;
  getActiveWorkoutSession(userId: string): Promise<WorkoutSession | undefined>;
  createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession>;
  updateWorkoutSession(id: string, updates: Partial<WorkoutSession>): Promise<WorkoutSession>;
  
  // Personal trainer operations
  getPersonalClients(personalId: string): Promise<User[]>;
  addPersonalClient(data: InsertPersonalClient): Promise<PersonalClient>;
  
  // Gym operations
  getGymMembers(gymId: string): Promise<User[]>;
  addGymMember(data: InsertGymMember): Promise<GymMember>;
  getBirthdayMembers(gymId: string): Promise<User[]>;
  
  // Academia module operations
  getAcademiaDashboard(gymId: string): Promise<any>;
  getAcademiaAlunos(gymId: string): Promise<User[]>;
  createAcademiaAluno(data: any): Promise<User>;
  getAcademiaPersonais(gymId: string): Promise<User[]>;
  createAcademiaPersonal(data: any): Promise<User>;
  getAcademiaEngajamento(gymId: string): Promise<any[]>;
  getAcademiaAniversariantes(gymId: string): Promise<User[]>;
  getAcademiaRenovacoes(gymId: string): Promise<User[]>;
  
  // Admin operations
  getAllUsers(): Promise<User[]>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(userData: any): Promise<User>;
  updateUser(userId: string, userData: any): Promise<User | undefined>;
  deleteUser(userId: string): Promise<boolean>;
  
  // Gym/Academia admin operations
  getAllGyms(): Promise<Gym[]>;
  getGym(gymId: string): Promise<Gym | undefined>;
  createGym(gymData: InsertGym): Promise<Gym>;
  updateGym(gymId: string, gymData: UpdateGym): Promise<Gym | undefined>;
  deleteGym(gymId: string): Promise<boolean>;
  getGymByInviteCode(inviteCode: string): Promise<Gym | undefined>;
  updateUserType(userId: string, userType: string): Promise<User>;
  setUserPassword(userId: string, hashedPassword: string): Promise<User>;
  setPasswordResetToken(userId: string, token: string, expires: Date): Promise<User>;
  getUserByResetToken(token: string): Promise<User | undefined>;
  clearPasswordResetToken(userId: string): Promise<User>;
  
  // Email template operations
  getEmailTemplates(): Promise<EmailTemplate[]>;
  getEmailTemplateByType(userType: string, templateType: string): Promise<EmailTemplate | undefined>;
  createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate>;
  updateEmailTemplate(templateId: string, templateData: Partial<EmailTemplate>): Promise<EmailTemplate | undefined>;
  deleteEmailTemplate(templateId: string): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private exercises: Map<string, Exercise> = new Map();
  private workouts: Map<string, Workout> = new Map();
  private workoutSessions: Map<string, WorkoutSession> = new Map();
  private personalClients: Map<string, PersonalClient> = new Map();
  private gymMembers: Map<string, GymMember> = new Map();

  constructor() {
    this.seedData();
  }

  private seedData() {
    // Seed some default exercises
    const defaultExercises: Exercise[] = [
      {
        id: randomUUID(),
        name: "Supino Reto",
        description: "Exercício básico para peito",
        muscleGroup: "peito",
        equipment: "barra",
        instructions: "Deite no banco, segure a barra com pegada firme e execute o movimento",
        gifUrl: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Agachamento",
        description: "Exercício fundamental para pernas",
        muscleGroup: "pernas",
        equipment: "peso livre",
        instructions: "Mantenha as costas retas e desça até os joelhos formarem 90 graus",
        gifUrl: null,
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        name: "Remada Curvada",
        description: "Exercício para costas",
        muscleGroup: "costas",
        equipment: "barra",
        instructions: "Mantenha o tronco inclinado e puxe a barra até o abdômen",
        gifUrl: null,
        createdAt: new Date(),
      },
    ];

    defaultExercises.forEach(exercise => {
      this.exercises.set(exercise.id, exercise);
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = Array.from(this.users.values()).find(u => u.id === userData.id);
    
    if (existingUser) {
      const updatedUser: User = { 
        ...existingUser, 
        ...userData, 
        email: userData.email ?? existingUser.email,
        firstName: userData.firstName ?? existingUser.firstName,
        lastName: userData.lastName ?? existingUser.lastName,
        profileImageUrl: userData.profileImageUrl ?? existingUser.profileImageUrl,
        updatedAt: new Date() 
      };
      this.users.set(existingUser.id, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        ...userData,
        id: userData.id || randomUUID(),
        email: userData.email ?? null,
        firstName: userData.firstName ?? null,
        lastName: userData.lastName ?? null,
        profileImageUrl: userData.profileImageUrl ?? null,
        userType: userData.userType ?? "aluno",
        birthDate: userData.birthDate ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.users.set(newUser.id, newUser);
      return newUser;
    }
  }

  async getExercises(): Promise<Exercise[]> {
    return Array.from(this.exercises.values());
  }

  async getExercisesByMuscleGroup(muscleGroup: string): Promise<Exercise[]> {
    return Array.from(this.exercises.values()).filter(e => e.muscleGroup === muscleGroup);
  }

  async createExercise(exerciseData: InsertExercise): Promise<Exercise> {
    const exercise: Exercise = {
      ...exerciseData,
      id: randomUUID(),
      description: exerciseData.description ?? null,
      equipment: exerciseData.equipment ?? null,
      instructions: exerciseData.instructions ?? null,
      gifUrl: exerciseData.gifUrl ?? null,
      createdAt: new Date(),
    };
    this.exercises.set(exercise.id, exercise);
    return exercise;
  }

  async getWorkoutsByUser(userId: string): Promise<Workout[]> {
    return Array.from(this.workouts.values()).filter(w => w.userId === userId);
  }

  async getWorkout(id: string): Promise<Workout | undefined> {
    return this.workouts.get(id);
  }

  async createWorkout(workoutData: InsertWorkout): Promise<Workout> {
    const workout: Workout = {
      ...workoutData,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.workouts.set(workout.id, workout);
    return workout;
  }

  async getWorkoutSessionsByUser(userId: string): Promise<WorkoutSession[]> {
    return Array.from(this.workoutSessions.values())
      .filter(s => s.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getActiveWorkoutSession(userId: string): Promise<WorkoutSession | undefined> {
    return Array.from(this.workoutSessions.values())
      .find(s => s.userId === userId && !s.completed);
  }

  async createWorkoutSession(sessionData: InsertWorkoutSession): Promise<WorkoutSession> {
    const session: WorkoutSession = {
      ...sessionData,
      id: randomUUID(),
      duration: sessionData.duration ?? null,
      endTime: sessionData.endTime ?? null,
      totalWeight: sessionData.totalWeight ?? null,
      completed: sessionData.completed ?? false,
      exercises: sessionData.exercises ?? null,
      createdAt: new Date(),
    };
    this.workoutSessions.set(session.id, session);
    return session;
  }

  async updateWorkoutSession(id: string, updates: Partial<WorkoutSession>): Promise<WorkoutSession> {
    const session = this.workoutSessions.get(id);
    if (!session) {
      throw new Error("Workout session not found");
    }
    
    const updatedSession = { ...session, ...updates };
    this.workoutSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getPersonalClients(personalId: string): Promise<User[]> {
    const clientRelations = Array.from(this.personalClients.values())
      .filter(pc => pc.personalId === personalId);
    
    return clientRelations.map(relation => this.users.get(relation.clientId))
      .filter(Boolean) as User[];
  }

  async addPersonalClient(data: InsertPersonalClient): Promise<PersonalClient> {
    const relation: PersonalClient = {
      ...data,
      id: randomUUID(),
      createdAt: new Date(),
    };
    this.personalClients.set(relation.id, relation);
    return relation;
  }

  async getGymMembers(gymId: string): Promise<User[]> {
    const memberRelations = Array.from(this.gymMembers.values())
      .filter(gm => gm.gymId === gymId && gm.isActive);
    
    return memberRelations.map(relation => this.users.get(relation.memberId))
      .filter(Boolean) as User[];
  }

  async addGymMember(data: InsertGymMember): Promise<GymMember> {
    const member: GymMember = {
      ...data,
      id: randomUUID(),
      endDate: data.endDate ?? null,
      isActive: data.isActive ?? true,
      createdAt: new Date(),
    };
    this.gymMembers.set(member.id, member);
    return member;
  }

  async getBirthdayMembers(gymId: string): Promise<User[]> {
    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();
    
    const members = await this.getGymMembers(gymId);
    return members.filter(member => {
      if (!member.birthDate) return false;
      const birthDate = new Date(member.birthDate);
      return birthDate.getMonth() === todayMonth && birthDate.getDate() === todayDate;
    });
  }

  // Academia module implementations
  async getAcademiaDashboard(gymId: string): Promise<any> {
    const allUsers = Array.from(this.users.values());
    const totalAlunos = allUsers.filter(u => u.userType === 'aluno').length;
    const totalPersonais = allUsers.filter(u => u.userType === 'personal').length;
    
    // Calculate active users (last workout in 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const recentSessions = Array.from(this.workoutSessions.values())
      .filter(s => s.createdAt && new Date(s.createdAt) > sevenDaysAgo);
    
    const activeUserIds = new Set(recentSessions.map(s => s.userId));
    const alunosAtivos = allUsers.filter(u => u.userType === 'aluno' && activeUserIds.has(u.id)).length;
    
    return {
      totalAlunos,
      alunosAtivos,
      totalPersonais,
      treinosHoje: recentSessions.filter(s => {
        if (!s.createdAt) return false;
        const today = new Date();
        const sessionDate = new Date(s.createdAt);
        return sessionDate.toDateString() === today.toDateString();
      }).length
    };
  }

  async getAcademiaAlunos(gymId: string): Promise<User[]> {
    // Return all users with userType 'aluno'
    return Array.from(this.users.values()).filter(u => u.userType === 'aluno');
  }

  async createAcademiaAluno(data: any): Promise<User> {
    const aluno: User = {
      id: randomUUID(),
      email: data.email || null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      profileImageUrl: null,
      userType: 'aluno',
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(aluno.id, aluno);
    return aluno;
  }

  async getAcademiaPersonais(gymId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.userType === 'personal');
  }

  async createAcademiaPersonal(data: any): Promise<User> {
    const personal: User = {
      id: randomUUID(),
      email: data.email || null,
      firstName: data.firstName || null,
      lastName: data.lastName || null,
      profileImageUrl: null,
      userType: 'personal',
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(personal.id, personal);
    return personal;
  }

  async getAcademiaEngajamento(gymId: string): Promise<any[]> {
    const alunos = await this.getAcademiaAlunos(gymId);
    const sessions = Array.from(this.workoutSessions.values());
    
    return alunos.map(aluno => {
      const userSessions = sessions.filter(s => s.userId === aluno.id).sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
      
      const lastWorkout = userSessions[0]?.createdAt || null;
      const totalWorkouts = userSessions.length;
      
      return {
        ...aluno,
        ultimoTreino: lastWorkout,
        totalTreinos: totalWorkouts,
        diasSemTreino: lastWorkout ? Math.floor((Date.now() - new Date(lastWorkout).getTime()) / (1000 * 60 * 60 * 24)) : 999
      };
    }).sort((a, b) => a.diasSemTreino - b.diasSemTreino);
  }

  async getAcademiaAniversariantes(gymId: string): Promise<User[]> {
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const alunos = await this.getAcademiaAlunos(gymId);
    return alunos.filter(aluno => {
      if (!aluno.birthDate) return false;
      
      const birthDate = new Date(aluno.birthDate);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      return thisYearBirthday >= today && thisYearBirthday <= nextWeek;
    });
  }

  async getAcademiaRenovacoes(gymId: string): Promise<User[]> {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const alunos = await this.getAcademiaAlunos(gymId);
    const sessions = Array.from(this.workoutSessions.values());
    
    return alunos.filter(aluno => {
      const userSessions = sessions.filter(s => 
        s.userId === aluno.id && 
        s.createdAt && 
        new Date(s.createdAt) > thirtyDaysAgo
      );
      return userSessions.length === 0;
    });
  }

  // Admin module implementations
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(userData: any): Promise<User> {
    const user: User = {
      id: randomUUID(),
      email: userData.email ?? null,
      firstName: userData.firstName ?? null,
      lastName: userData.lastName ?? null,
      name: userData.name ?? `${userData.firstName || ''} ${userData.lastName || ''}`.trim(),
      profileImageUrl: userData.profileImageUrl ?? null,
      userType: userData.userType ?? "aluno",
      birthDate: userData.birthDate ?? null,
      phone: userData.phone ?? null,
      address: userData.address ?? null,
      city: userData.city ?? null,
      state: userData.state ?? null,
      zipCode: userData.zipCode ?? null,
      cref: userData.cref ?? null,
      specializations: userData.specializations ?? null,
      gymId: userData.gymId ?? null,
      membershipType: userData.membershipType ?? null,
      membershipStart: userData.membershipStart ?? null,
      membershipEnd: userData.membershipEnd ?? null,
      height: userData.height ?? null,
      weight: userData.weight ?? null,
      fitnessGoal: userData.fitnessGoal ?? null,
      fitnessLevel: userData.fitnessLevel ?? null,
      medicalRestrictions: userData.medicalRestrictions ?? null,
      isActive: userData.isActive ?? true,
      notes: userData.notes ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(user.id, user);
    return user;
  }

  async updateUser(userId: string, userData: any): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) {
      return undefined;
    }

    const updatedUser: User = {
      ...user,
      ...userData,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async deleteUser(userId: string): Promise<boolean> {
    return this.users.delete(userId);
  }

  async updateUserType(userId: string, userType: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      userType,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async setUserPassword(userId: string, hashedPassword: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      password: hashedPassword,
      emailVerified: true,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      passwordResetToken: token,
      passwordResetExpires: expires,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => 
      u.passwordResetToken === token && 
      u.passwordResetExpires && 
      u.passwordResetExpires > new Date()
    );
  }

  async clearPasswordResetToken(userId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updatedUser: User = {
      ...user,
      passwordResetToken: null,
      passwordResetExpires: null,
      updatedAt: new Date(),
    };

    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  // Email template operations (memory)
  private emailTemplates: Map<string, EmailTemplate> = new Map();

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    return Array.from(this.emailTemplates.values());
  }

  async getEmailTemplateByType(userType: string, templateType: string): Promise<EmailTemplate | undefined> {
    return Array.from(this.emailTemplates.values())
      .find(t => t.userType === userType && t.templateType === templateType && t.isActive);
  }

  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    const template: EmailTemplate = {
      ...templateData,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.emailTemplates.set(template.id, template);
    return template;
  }

  async updateEmailTemplate(templateId: string, templateData: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    const template = this.emailTemplates.get(templateId);
    if (!template) {
      return undefined;
    }

    const updatedTemplate: EmailTemplate = {
      ...template,
      ...templateData,
      updatedAt: new Date(),
    };

    this.emailTemplates.set(templateId, updatedTemplate);
    return updatedTemplate;
  }

  async deleteEmailTemplate(templateId: string): Promise<boolean> {
    return this.emailTemplates.delete(templateId);
  }
}

export class DatabaseStorage implements IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(user: UpsertUser): Promise<User> {
    if (!db) throw new Error("Database not available");
    
    const [existingUser] = await db.select().from(users).where(eq(users.id, user.id));
    
    if (existingUser) {
      const [updatedUser] = await db
        .update(users)
        .set({ ...user, updatedAt: new Date() })
        .where(eq(users.id, user.id))
        .returning();
      return updatedUser;
    } else {
      const [newUser] = await db
        .insert(users)
        .values({ ...user, createdAt: new Date(), updatedAt: new Date() })
        .returning();
      return newUser;
    }
  }

  // Exercise operations
  async getExercises(): Promise<Exercise[]> {
    if (!db) return [];
    return await db.select().from(exercises);
  }

  async getExercisesByMuscleGroup(muscleGroup: string): Promise<Exercise[]> {
    if (!db) return [];
    return await db.select().from(exercises).where(eq(exercises.muscleGroup, muscleGroup));
  }

  async createExercise(exercise: InsertExercise): Promise<Exercise> {
    if (!db) throw new Error("Database not available");
    const [newExercise] = await db
      .insert(exercises)
      .values({ ...exercise, id: randomUUID(), createdAt: new Date() })
      .returning();
    return newExercise;
  }

  // Workout operations
  async getWorkoutsByUser(userId: string): Promise<Workout[]> {
    if (!db) return [];
    return await db.select().from(workouts).where(eq(workouts.userId, userId));
  }

  async getWorkout(id: string): Promise<Workout | undefined> {
    if (!db) return undefined;
    const [workout] = await db.select().from(workouts).where(eq(workouts.id, id));
    return workout || undefined;
  }

  async createWorkout(workout: InsertWorkout): Promise<Workout> {
    if (!db) throw new Error("Database not available");
    const [newWorkout] = await db
      .insert(workouts)
      .values({ ...workout, id: randomUUID(), createdAt: new Date() })
      .returning();
    return newWorkout;
  }

  // Workout session operations
  async getWorkoutSessionsByUser(userId: string): Promise<WorkoutSession[]> {
    if (!db) return [];
    return await db.select().from(workoutSessions).where(eq(workoutSessions.userId, userId));
  }

  async getActiveWorkoutSession(userId: string): Promise<WorkoutSession | undefined> {
    if (!db) return undefined;
    const [session] = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), eq(workoutSessions.completed, false)));
    return session || undefined;
  }

  async createWorkoutSession(session: InsertWorkoutSession): Promise<WorkoutSession> {
    if (!db) throw new Error("Database not available");
    const [newSession] = await db
      .insert(workoutSessions)
      .values({ ...session, id: randomUUID(), createdAt: new Date() })
      .returning();
    return newSession;
  }

  async updateWorkoutSession(id: string, updates: Partial<WorkoutSession>): Promise<WorkoutSession> {
    if (!db) throw new Error("Database not available");
    const [updatedSession] = await db
      .update(workoutSessions)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(workoutSessions.id, id))
      .returning();
    return updatedSession;
  }

  // Personal trainer operations
  async getPersonalClients(personalId: string): Promise<User[]> {
    if (!db) return [];
    const clients = await db
      .select({ user: users })
      .from(personalClients)
      .innerJoin(users, eq(personalClients.clientId, users.id))
      .where(eq(personalClients.personalId, personalId));
    return clients.map((c: any) => c.user);
  }

  async addPersonalClient(data: InsertPersonalClient): Promise<PersonalClient> {
    if (!db) throw new Error("Database not available");
    const [newClient] = await db
      .insert(personalClients)
      .values({ ...data, id: randomUUID(), createdAt: new Date() })
      .returning();
    return newClient;
  }

  // Gym operations
  async getGymMembers(gymId: string): Promise<User[]> {
    if (!db) return [];
    const members = await db
      .select({ user: users })
      .from(gymMembers)
      .innerJoin(users, eq(gymMembers.memberId, users.id))
      .where(eq(gymMembers.gymId, gymId));
    return members.map((m: any) => m.user);
  }

  async addGymMember(data: InsertGymMember): Promise<GymMember> {
    if (!db) throw new Error("Database not available");
    const [newMember] = await db
      .insert(gymMembers)
      .values({ ...data, id: randomUUID(), createdAt: new Date() })
      .returning();
    return newMember;
  }

  async getBirthdayMembers(gymId: string): Promise<User[]> {
    if (!db) return [];
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);
    
    const members = await this.getGymMembers(gymId);
    return members.filter(member => {
      if (!member.birthDate) return false;
      
      const birthDate = new Date(member.birthDate);
      const thisYearBirthday = new Date(today.getFullYear(), birthDate.getMonth(), birthDate.getDate());
      
      return thisYearBirthday >= today && thisYearBirthday <= nextWeek;
    });
  }

  // Academia module operations (simplified for database version)
  async getAcademiaDashboard(gymId: string): Promise<any> {
    if (!db) return { totalAlunos: 0, totalPersonais: 0, alunosAtivos: 0, sessoesSemana: 0 };
    
    const alunos = await this.getAcademiaAlunos(gymId);
    const personais = await this.getAcademiaPersonais(gymId);
    
    return {
      totalAlunos: alunos.length,
      totalPersonais: personais.length,
      alunosAtivos: alunos.filter(a => a.userType === 'aluno').length,
      sessoesSemana: 0 // Simplified for now
    };
  }

  async getAcademiaAlunos(gymId: string): Promise<User[]> {
    if (!db) return [];
    const members = await this.getGymMembers(gymId);
    return members.filter(m => m.userType === 'aluno');
  }

  async createAcademiaAluno(data: any): Promise<User> {
    if (!db) throw new Error("Database not available");
    
    const userData = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      userType: 'aluno',
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newUser] = await db.insert(users).values(userData).returning();
    
    // Add to gym members
    await this.addGymMember({
      gymId: data.gymId,
      memberId: newUser.id,
      membershipType: 'aluno',
      startDate: new Date(),
    });
    
    return newUser;
  }

  async getAcademiaPersonais(gymId: string): Promise<User[]> {
    if (!db) return [];
    const members = await this.getGymMembers(gymId);
    return members.filter(m => m.userType === 'personal');
  }

  async createAcademiaPersonal(data: any): Promise<User> {
    if (!db) throw new Error("Database not available");
    
    const userData = {
      id: randomUUID(),
      name: data.name,
      email: data.email,
      userType: 'personal',
      birthDate: data.birthDate ? new Date(data.birthDate) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newUser] = await db.insert(users).values(userData).returning();
    
    // Add to gym members
    await this.addGymMember({
      gymId: data.gymId,
      memberId: newUser.id,
      membershipType: 'personal',
      startDate: new Date(),
    });
    
    return newUser;
  }

  async getAcademiaEngajamento(gymId: string): Promise<any[]> {
    if (!db) return [];
    // Simplified implementation for database version
    const alunos = await this.getAcademiaAlunos(gymId);
    return alunos.map(aluno => ({
      id: aluno.id,
      nome: aluno.name || aluno.firstName || 'Nome não informado',
      ultimoTreino: null, // Would need to calculate from sessions
      diasSemTreino: 0,
      nivel: 'baixo'
    }));
  }

  async getAcademiaAniversariantes(gymId: string): Promise<User[]> {
    return await this.getBirthdayMembers(gymId);
  }

  async getAcademiaRenovacoes(gymId: string): Promise<User[]> {
    if (!db) return [];
    // Simplified implementation - would need more complex logic
    return await this.getAcademiaAlunos(gymId);
  }

  // Admin operations
  async getAllUsers(): Promise<User[]> {
    if (!db) return [];
    return await db.select().from(users);
  }

  async createUser(userData: any): Promise<User> {
    if (!db) throw new Error("Database not available");
    
    const userToInsert = {
      ...userData,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newUser] = await db.insert(users).values(userToInsert).returning();
    return newUser;
  }

  async updateUser(userId: string, userData: any): Promise<User | undefined> {
    if (!db) throw new Error("Database not available");
    
    const updateData = {
      ...userData,
      updatedAt: new Date(),
    };

    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    return updatedUser || undefined;
  }

  async deleteUser(userId: string): Promise<boolean> {
    if (!db) throw new Error("Database not available");
    
    const result = await db
      .delete(users)
      .where(eq(users.id, userId))
      .returning();
    
    return result.length > 0;
  }

  async updateUserType(userId: string, userType: string): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [updatedUser] = await db
      .update(users)
      .set({ userType, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async setUserPassword(userId: string, hashedPassword: string): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [updatedUser] = await db
      .update(users)
      .set({ 
        password: hashedPassword, 
        emailVerified: true,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async setPasswordResetToken(userId: string, token: string, expires: Date): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [updatedUser] = await db
      .update(users)
      .set({ 
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  async getUserByResetToken(token: string): Promise<User | undefined> {
    if (!db) return undefined;
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.passwordResetToken, token),
          // Token ainda válido
          eq(users.passwordResetExpires, users.passwordResetExpires)
        )
      );
    return user || undefined;
  }

  async clearPasswordResetToken(userId: string): Promise<User> {
    if (!db) throw new Error("Database not available");
    const [updatedUser] = await db
      .update(users)
      .set({ 
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }

  // Email template operations
  async getEmailTemplates(): Promise<EmailTemplate[]> {
    if (!db) return [];
    return await db.select().from(emailTemplates).orderBy(desc(emailTemplates.createdAt));
  }

  async getEmailTemplateByType(userType: string, templateType: string): Promise<EmailTemplate | undefined> {
    if (!db) return undefined;
    const [template] = await db
      .select()
      .from(emailTemplates)
      .where(
        and(
          eq(emailTemplates.userType, userType),
          eq(emailTemplates.templateType, templateType),
          eq(emailTemplates.isActive, true)
        )
      );
    return template || undefined;
  }

  async createEmailTemplate(templateData: InsertEmailTemplate): Promise<EmailTemplate> {
    if (!db) throw new Error("Database not available");
    
    const templateToInsert = {
      ...templateData,
      id: randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newTemplate] = await db.insert(emailTemplates).values(templateToInsert).returning();
    return newTemplate;
  }

  async updateEmailTemplate(templateId: string, templateData: Partial<EmailTemplate>): Promise<EmailTemplate | undefined> {
    if (!db) throw new Error("Database not available");
    
    const updateData = {
      ...templateData,
      updatedAt: new Date(),
    };

    const [updatedTemplate] = await db
      .update(emailTemplates)
      .set(updateData)
      .where(eq(emailTemplates.id, templateId))
      .returning();
    
    return updatedTemplate || undefined;
  }

  async deleteEmailTemplate(templateId: string): Promise<boolean> {
    if (!db) throw new Error("Database not available");
    
    const result = await db
      .delete(emailTemplates)
      .where(eq(emailTemplates.id, templateId))
      .returning();
    
    return result.length > 0;
  }

  // Gym/Academia admin operations
  async getAllGyms(): Promise<Gym[]> {
    if (!db) throw new Error("Database not available");
    
    const gymList = await db.select().from(gyms).orderBy(desc(gyms.createdAt));
    return gymList;
  }

  async getGym(gymId: string): Promise<Gym | undefined> {
    if (!db) throw new Error("Database not available");
    
    const [gym] = await db.select().from(gyms).where(eq(gyms.id, gymId));
    return gym || undefined;
  }

  async createGym(gymData: InsertGym): Promise<Gym> {
    if (!db) throw new Error("Database not available");
    
    // Generate unique invite code
    const inviteCode = this.generateInviteCode();
    
    const gymToInsert = {
      ...gymData,
      id: randomUUID(),
      inviteCode,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newGym] = await db.insert(gyms).values(gymToInsert).returning();
    return newGym;
  }

  async updateGym(gymId: string, gymData: UpdateGym): Promise<Gym | undefined> {
    if (!db) throw new Error("Database not available");
    
    const updateData = {
      ...gymData,
      updatedAt: new Date(),
    };

    const [updatedGym] = await db
      .update(gyms)
      .set(updateData)
      .where(eq(gyms.id, gymId))
      .returning();
    
    return updatedGym || undefined;
  }

  async deleteGym(gymId: string): Promise<boolean> {
    if (!db) throw new Error("Database not available");
    
    const result = await db
      .delete(gyms)
      .where(eq(gyms.id, gymId))
      .returning();
    
    return result.length > 0;
  }

  async getGymByInviteCode(inviteCode: string): Promise<Gym | undefined> {
    if (!db) throw new Error("Database not available");
    
    const [gym] = await db.select().from(gyms).where(eq(gyms.inviteCode, inviteCode));
    return gym || undefined;
  }

  private generateInviteCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
}

// Storage implementation - will be initialized dynamically
export let storage: IStorage;

// Initialize storage based on database availability
export function initializeStorage() {
  if (db) {
    storage = new DatabaseStorage();
    console.log("📊 Using DatabaseStorage with PostgreSQL");
  } else {
    storage = new MemStorage();
    console.log("💾 Using MemStorage (in-memory)");
  }
}

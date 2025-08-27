import {
  users,
  exercises,
  workouts,
  workoutSessions,
  personalClients,
  gymMembers,
  type User,
  type UpsertUser,
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
} from "@shared/schema";
import { randomUUID } from "crypto";

// Interface for storage operations
export interface IStorage {
  // User operations (IMPORTANT: mandatory for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
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
      const updatedUser = { ...existingUser, ...userData, updatedAt: new Date() };
      this.users.set(existingUser.id, updatedUser);
      return updatedUser;
    } else {
      const newUser: User = {
        ...userData,
        id: userData.id || randomUUID(),
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
      if (!member.createdAt) return false;
      const memberDate = new Date(member.createdAt);
      return memberDate.getMonth() === todayMonth && memberDate.getDate() === todayDate;
    });
  }
}

export const storage = new MemStorage();

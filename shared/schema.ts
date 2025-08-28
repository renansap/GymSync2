import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users: any = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  name: varchar("name"), // For display name
  profileImageUrl: varchar("profile_image_url"),
  userType: varchar("user_type").notNull().default("aluno"), // aluno, personal, academia
  birthDate: timestamp("birth_date"), // For birthday tracking
  
  // Dados de contato
  phone: varchar("phone", { length: 20 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 15 }),
  
  // Dados profissionais/específicos
  cref: varchar("cref", { length: 20 }), // Registro do personal trainer
  specializations: text("specializations").array(), // Especializações do personal
  gymId: varchar("gym_id"), // Academia que o usuário pertence
  membershipType: varchar("membership_type"), // Tipo de plano (mensal, anual, etc)
  membershipStart: timestamp("membership_start"),
  membershipEnd: timestamp("membership_end"),
  
  // Dados físicos e objetivos
  height: integer("height"), // altura em cm
  weight: integer("weight"), // peso em kg
  fitnessGoal: varchar("fitness_goal"), // objetivo: emagrecimento, hipertrofia, resistência
  fitnessLevel: varchar("fitness_level"), // nível: iniciante, intermediário, avançado
  medicalRestrictions: text("medical_restrictions"), // restrições médicas
  
  // Status e configurações
  isActive: boolean("is_active").default(true),
  notes: text("notes"), // observações gerais
  
  // Autenticação
  password: varchar("password", { length: 255 }), // hash da senha
  passwordResetToken: varchar("password_reset_token", { length: 255 }),
  passwordResetExpires: timestamp("password_reset_expires"),
  emailVerified: boolean("email_verified").default(false),
  emailVerificationToken: varchar("email_verification_token", { length: 255 }),
  lastLogin: timestamp("last_login"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Gyms/Academias table
export const gyms = pgTable("gyms", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 200 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }).unique(),
  email: varchar("email", { length: 255 }).unique(),
  phone: varchar("phone", { length: 20 }),
  
  // Endereço
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zip_code", { length: 15 }),
  
  // Configurações da academia
  logo: varchar("logo_url"),
  website: varchar("website"),
  socialMedia: jsonb("social_media"), // Instagram, Facebook, etc
  description: text("description"),
  
  // Configurações de planos
  membershipPlans: jsonb("membership_plans"), // Array of plan objects
  
  // Horários de funcionamento
  openingHours: jsonb("opening_hours"), // Horários por dia da semana
  
  // Status e configurações
  isActive: boolean("is_active").default(true),
  maxMembers: integer("max_members").default(1000),
  inviteCode: varchar("invite_code", { length: 50 }).unique(), // Código para convites
  
  // Admin da academia (usuário responsável)
  adminUserId: varchar("admin_user_id"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  muscleGroup: varchar("muscle_group").notNull(),
  equipment: varchar("equipment"),
  instructions: text("instructions"),
  gifUrl: varchar("gif_url"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const workouts = pgTable("workouts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  type: varchar("type").notNull(), // hipertrofia, emagrecimento, força, resistência
  level: varchar("level").notNull(), // iniciante, intermediário, avançado
  exercises: jsonb("exercises").notNull(), // Array of exercise objects with sets/reps
  createdAt: timestamp("created_at").defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  workoutId: varchar("workout_id").notNull().references(() => workouts.id),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),
  duration: integer("duration"), // in minutes
  totalWeight: integer("total_weight"), // in kg
  completed: boolean("completed").default(false),
  exercises: jsonb("exercises"), // Actual performance data
  createdAt: timestamp("created_at").defaultNow(),
});

// Email templates table
export const emailTemplates = pgTable("email_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userType: varchar("user_type").notNull(), // aluno, personal, academia
  templateType: varchar("template_type").notNull(), // welcome, password_reset, etc
  subject: text("subject").notNull(),
  content: text("content").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const personalClients = pgTable("personal_clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  personalId: varchar("personal_id").notNull().references(() => users.id),
  clientId: varchar("client_id").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const gymMembers = pgTable("gym_members", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  gymId: varchar("gym_id").notNull().references(() => users.id),
  memberId: varchar("member_id").notNull().references(() => users.id),
  membershipType: varchar("membership_type").notNull(),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  password: true, // Será definida após o email de boas-vindas
  passwordResetToken: true,
  passwordResetExpires: true,
  emailVerificationToken: true,
  lastLogin: true,
}).extend({
  birthDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  membershipStart: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  membershipEnd: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  height: z.number().min(50).max(250).optional(),
  weight: z.number().min(20).max(300).optional(),
  specializations: z.array(z.string()).optional(),
  email: z.string().email("Email inválido"),
});

// Login schema
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
});

export type LoginData = z.infer<typeof loginSchema>;

export const updateUserSchema = insertUserSchema.partial();

export const insertEmailTemplateSchema = createInsertSchema(emailTemplates).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const updateEmailTemplateSchema = insertEmailTemplateSchema.partial();

// Types
export type EmailTemplate = typeof emailTemplates.$inferSelect;
export type InsertEmailTemplate = z.infer<typeof insertEmailTemplateSchema>;
export type UpdateEmailTemplate = z.infer<typeof updateEmailTemplateSchema>;

// Password reset schema
export const passwordResetSchema = z.object({
  token: z.string().min(1, "Token é obrigatório"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export type PasswordResetData = z.infer<typeof passwordResetSchema>;

export const insertExerciseSchema = createInsertSchema(exercises).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSchema = createInsertSchema(workouts).omit({
  id: true,
  createdAt: true,
});

export const insertWorkoutSessionSchema = createInsertSchema(workoutSessions).omit({
  id: true,
  createdAt: true,
});

export const insertPersonalClientSchema = createInsertSchema(personalClients).omit({
  id: true,
  createdAt: true,
});

export const insertGymMemberSchema = createInsertSchema(gymMembers).omit({
  id: true,
  createdAt: true,
});

export const insertGymSchema = createInsertSchema(gyms).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  membershipPlans: z.array(z.object({
    name: z.string(),
    price: z.number(),
    duration: z.number(), // in months
    description: z.string().optional(),
  })).optional(),
  socialMedia: z.object({
    instagram: z.string().optional(),
    facebook: z.string().optional(),
    youtube: z.string().optional(),
  }).optional(),
  openingHours: z.object({
    monday: z.object({ open: z.string(), close: z.string() }).optional(),
    tuesday: z.object({ open: z.string(), close: z.string() }).optional(),
    wednesday: z.object({ open: z.string(), close: z.string() }).optional(),
    thursday: z.object({ open: z.string(), close: z.string() }).optional(),
    friday: z.object({ open: z.string(), close: z.string() }).optional(),
    saturday: z.object({ open: z.string(), close: z.string() }).optional(),
    sunday: z.object({ open: z.string(), close: z.string() }).optional(),
  }).optional(),
});

export const updateGymSchema = insertGymSchema.partial();

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertExercise = z.infer<typeof insertExerciseSchema>;
export type Exercise = typeof exercises.$inferSelect;
export type InsertWorkout = z.infer<typeof insertWorkoutSchema>;
export type Workout = typeof workouts.$inferSelect;
export type InsertWorkoutSession = z.infer<typeof insertWorkoutSessionSchema>;
export type WorkoutSession = typeof workoutSessions.$inferSelect;
export type InsertPersonalClient = z.infer<typeof insertPersonalClientSchema>;
export type PersonalClient = typeof personalClients.$inferSelect;
export type InsertGymMember = z.infer<typeof insertGymMemberSchema>;
export type GymMember = typeof gymMembers.$inferSelect;
export type InsertGym = z.infer<typeof insertGymSchema>;
export type UpdateGym = z.infer<typeof updateGymSchema>;
export type Gym = typeof gyms.$inferSelect;

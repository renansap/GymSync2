# GymSync - Intelligent Workout Management Platform

## Overview

GymSync is a comprehensive fitness platform that serves three distinct user types: students (alunos), personal trainers, and gyms. The application provides AI-powered workout generation, session tracking, and management features tailored to each user role. Built as a full-stack web application with a modern React frontend and Express.js backend, it integrates OpenAI for intelligent workout recommendations and uses PostgreSQL for data persistence.

## User Preferences

Preferred communication style: Simple, everyday language.

**Data Management**: 
- NEVER use mock/placeholder data in the application
- Always use real data from the PostgreSQL database
- Avoid in-memory storage or fake data generators
- All features must interact with the actual database through Drizzle ORM

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom design system variables
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Forms**: React Hook Form with Zod validation

The frontend follows a role-based dashboard pattern with three main views (aluno, personal, academia) and implements responsive design with mobile-first approach. Bottom navigation is used for mobile devices while maintaining desktop compatibility.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Replit Auth integration with OpenID Connect
- **Session Management**: Express sessions with PostgreSQL storage
- **AI Integration**: OpenAI API for workout generation
- **API Design**: RESTful endpoints with proper error handling and logging

The backend implements a service-oriented architecture with separate modules for authentication, AI services, and data storage operations.

### Data Storage Solutions
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Management**: Centralized schema definitions in shared directory
- **Session Storage**: PostgreSQL-backed session store for authentication persistence

The database schema supports multi-tenant architecture with user types, workout management, exercise libraries, and session tracking.

### Authentication and Authorization
- **Provider**: Replit Auth using OpenID Connect
- **Session Management**: Server-side sessions with secure cookie configuration
- **User Types**: Role-based access control for aluno, personal trainer, and gym
- **Security**: HTTPS-only cookies, CSRF protection, and proper session timeout

The authentication system is mandatory for Replit deployment and provides seamless integration with the platform's user management.

## External Dependencies

### Third-Party Services
- **OpenAI API**: GPT-powered workout generation and personalization
- **Neon Database**: Serverless PostgreSQL hosting
- **Replit Auth**: Authentication provider and user management

### Key Libraries and Frameworks
- **UI Components**: Radix UI primitives, Shadcn/ui component system
- **State Management**: TanStack React Query for server state
- **Database**: Drizzle ORM, Neon serverless adapter
- **Validation**: Zod schema validation, Drizzle-Zod integration
- **Styling**: Tailwind CSS, Class Variance Authority
- **Development**: Vite, TypeScript, PostCSS

### Development and Build Tools
- **Build System**: Vite for frontend, ESBuild for backend
- **Package Management**: NPM with lockfile for dependency management
- **Code Quality**: TypeScript strict mode, ESLint configuration
- **Development Environment**: Hot module replacement, runtime error overlay

The architecture prioritizes type safety, developer experience, and scalability while maintaining compatibility with Replit's hosting environment.
import { Request } from "express";
import { User as SchemaUser } from "@shared/schema";

// Extend the Express User interface to match our schema
declare global {
  namespace Express {
    interface User extends SchemaUser {}
  }
}

// Use Express Request with user property
export interface AuthenticatedRequest extends Request {
  user?: SchemaUser;
}

// Re-export User type for consistency
export type User = SchemaUser;
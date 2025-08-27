import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { User } from "@shared/schema";

export default function Home() {
  const { user } = useAuth() as { user: User | undefined };
  const [, navigate] = useLocation();

  useEffect(() => {
    if (user?.userType) {
      // Redirect to appropriate dashboard based on user type
      navigate(`/${user.userType}`);
    }
  }, [user, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </div>
  );
}

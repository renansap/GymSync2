import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  // Check if we're on admin or test routes by looking at window.location
  const isAdminRoute = typeof window !== 'undefined' && 
    (window.location.pathname.startsWith('/admin') || window.location.pathname === '/test-gifs');
  
  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    enabled: !isAdminRoute, // Only run query if not on admin routes
    refetchInterval: false, // Disable automatic refetching
    refetchOnWindowFocus: false, // Disable refetch on window focus
  });

  return {
    user,
    isLoading: isAdminRoute ? false : isLoading,
    isAuthenticated: isAdminRoute ? false : !!user,
  };
}

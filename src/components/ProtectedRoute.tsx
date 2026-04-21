import { ReactNode } from 'react';
import { ShieldAlert, Loader2 } from 'lucide-react';
import { useAuth } from '@/src/context/AuthContext';

type Role = 'admin' | 'consultant' | 'accountant';

interface ProtectedRouteProps {
  allowed: Role[];
  children: ReactNode;
  fallback?: ReactNode;
}

/**
 * Declarative RBAC wrapper for admin sub-routes.
 * Shows fallback when profile role is not in the `allowed` list.
 * Defense-in-depth on top of sidebar tab filtering.
 */
export function ProtectedRoute({ allowed, children, fallback }: ProtectedRouteProps) {
  const { profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
        <p className="text-muted-foreground text-sm">იტვირთება...</p>
      </div>
    );
  }

  if (!profile || !allowed.includes(profile.role as Role)) {
    return (
      fallback ?? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ShieldAlert className="h-12 w-12 text-destructive/70 mb-4" />
          <h3 className="text-lg font-semibold text-foreground">წვდომა შეზღუდულია</h3>
          <p className="text-muted-foreground mt-2 text-sm">
            თქვენ არ გაქვთ ამ განყოფილების ნახვის უფლება
          </p>
        </div>
      )
    );
  }

  return <>{children}</>;
}

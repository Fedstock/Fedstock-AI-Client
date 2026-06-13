import { useEffect, type ReactNode } from "react";
import { getAccessToken } from "../../api/token";

type ProtectedRouteProps = {
  children: ReactNode;
  redirectTo?: string;
};

export function ProtectedRoute({ children, redirectTo = "/login" }: ProtectedRouteProps) {
  const hasAccessToken = Boolean(getAccessToken());

  useEffect(() => {
    if (!hasAccessToken && window.location.pathname !== redirectTo) {
      window.location.replace(redirectTo);
    }
  }, [hasAccessToken, redirectTo]);

  if (!hasAccessToken) return null;

  return children;
}

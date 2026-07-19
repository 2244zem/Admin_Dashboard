import React from "react";
import { useAuth } from "../../hooks/useAuth";
import type { UserRole } from "../../types/auth";

interface CanProps {
  permission?: string;
  roles?: UserRole[];
  anyOf?: boolean;
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

export const Can: React.FC<CanProps> = ({
  permission,
  roles,
  anyOf = false,
  fallback = null,
  children,
}) => {
  // UX-only gate. Otorisasi sejati harus dienforce di backend.
  const { hasPermission, hasRole } = useAuth();

  const permissionOk = permission ? hasPermission(permission) : true;
  const roleOk = roles ? hasRole(...roles) : true;

  const isAuthorized = anyOf ? permissionOk || roleOk : permissionOk && roleOk;

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;

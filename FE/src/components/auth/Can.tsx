import React from "react";
import { useAuth } from "../../context/AuthContext";
import type { UserRole } from "../../types/auth";

interface CanProps {
  permission?: string;
  roles?: UserRole[];
  fallback?: React.ReactNode; // default null (sembunyikan)
  children: React.ReactNode;
}

/**
 * PENTING: RBAC (Role-Based Access Control) di frontend INI HANYA UNTUK KEBUTUHAN UX (menyembunyikan yang tidak relevan).
 * JANGAN PERNAH menganggap ini sebagai satu-satunya lapisan keamanan.
 * Backend WAJIB tetap memvalidasi permission/role pada setiap API endpoint (Defense in Depth).
 */
export const Can: React.FC<CanProps> = ({
  permission,
  roles,
  fallback = null,
  children,
}) => {
  const { hasPermission, hasRole } = useAuth();

  let isAuthorized = true;

  if (permission && !hasPermission(permission)) {
    isAuthorized = false;
  }

  if (roles && !hasRole(...roles)) {
    isAuthorized = false;
  }

  if (!isAuthorized) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;

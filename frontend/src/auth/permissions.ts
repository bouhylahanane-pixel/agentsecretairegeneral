export type UserRole = "admin" | "secretaire" | "employe" | "stagiaire";

export const PERMISSIONS = {
  // --- Admin resources ---
  users: ["admin"],
  apiKeys: ["admin"],
  auditLogs: ["admin"],

  // --- Secrétariat resources ---
  dashboard: ["secretaire"],
  reunions: ["secretaire"],
  ia_pv: ["secretaire"],
  gabarits: ["secretaire"],
  demandes_secretaire: ["secretaire"],

  // --- Employé resources ---
  calendrier: ["employe"],
  mes_documents: ["employe"],
  chat_ia_restreint: ["employe", "stagiaire"],
  nouvelle_demande: ["employe"],

  // --- Stagiaire resources ---
  espace_stage: ["stagiaire"],
  docs_stage_lecture: ["stagiaire"],
} as const;

export type PermissionResource = keyof typeof PERMISSIONS;

export const hasPermission = (role: UserRole | undefined | string, resource: PermissionResource): boolean => {
  if (!role) return false;
  // Handle typo mapping "employee" to "employe" if it still exists in some places
  const normalizedRole = role.toLowerCase() === 'employee' ? 'employe' : role.toLowerCase();
  return (PERMISSIONS[resource] as readonly string[]).includes(normalizedRole);
};

/** Returns the default landing route for a given role */
export const getDefaultRoute = (role: UserRole | undefined | string): string => {
  if (!role) return '/login';
  const normalizedRole = role.toLowerCase() === 'employee' ? 'employe' : role.toLowerCase();
  
  if (normalizedRole === 'admin') return '/users';
  if (normalizedRole === 'secretaire') return '/dashboard';
  if (normalizedRole === 'employe') return '/calendrier';
  if (normalizedRole === 'stagiaire') return '/espace-stage';
  
  return '/login';
};

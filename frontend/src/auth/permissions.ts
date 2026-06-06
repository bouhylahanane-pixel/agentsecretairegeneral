export type UserRole = "admin" | "secretaire" | "employee" | "stagiaire";

export const PERMISSIONS = {
  dashboard: ["admin", "secretaire", "employee", "stagiaire"],
  documents: ["admin", "secretaire", "employee", "stagiaire"],
  procesVerbaux: ["admin", "secretaire"],
  reunions: ["admin", "secretaire"],
  users: ["admin"],
  historique: ["admin", "secretaire"]
} as const;

export type PermissionResource = keyof typeof PERMISSIONS;

export const hasPermission = (role: UserRole | undefined | string, resource: PermissionResource): boolean => {
  if (!role) return false;
  return (PERMISSIONS[resource] as readonly string[]).includes(role.toLowerCase());
};

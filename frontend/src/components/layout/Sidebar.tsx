import { Link, useLocation } from 'react-router-dom';
import { 
  Users, KeyRound, ScrollText, // Admin
  LayoutDashboard, Calendar, Mic, FileText, Inbox, // Secretaire
  CalendarDays, FolderOpen, MessageSquareText, PlusCircle, // Employe
  GraduationCap, FolderLock, // Stagiaire
  User, LogOut, ShieldCheck, Building2
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../auth/permissions';
import type { PermissionResource } from '../../auth/permissions';

type SidebarRoute = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  resource: PermissionResource;
};

// --- Rôles et Routes Exactes Spécifiées ---
const tabsByRole: Record<string, SidebarRoute[]> = {
  admin: [
    { path: '/users', label: 'Gestion des Comptes', icon: Users, resource: 'users' },
    { path: '/api-keys', label: 'Configuration Clés d\'API', icon: KeyRound, resource: 'apiKeys' },
    { path: '/audit-logs', label: 'Journaux d\'Audit', icon: ScrollText, resource: 'auditLogs' }
  ],
  secretaire: [
    { path: '/dashboard', label: 'Tableau de bord', icon: LayoutDashboard, resource: 'dashboard' },
    { path: '/reunions', label: 'Gestion des Réunions', icon: Calendar, resource: 'reunions' },
    { path: '/ia-pv', label: 'Transcription & IA (PV)', icon: Mic, resource: 'ia_pv' },
    { path: '/gabarits', label: 'Générateur d\'Attestations', icon: FileText, resource: 'gabarits' },
    { path: '/demandes-attente', label: 'Demandes en Attente', icon: Inbox, resource: 'demandes_secretaire' }
  ],
  employe: [
    { path: '/calendrier', label: 'Mon Calendrier', icon: CalendarDays, resource: 'calendrier' },
    { path: '/mes-documents', label: 'Mes Documents', icon: FolderOpen, resource: 'mes_documents' },
    { path: '/chat-restreint', label: 'Assistant IA Restreint', icon: MessageSquareText, resource: 'chat_ia_restreint' },
    { path: '/nouvelle-demande', label: 'Nouvelle Demande', icon: PlusCircle, resource: 'nouvelle_demande' }
  ],
  stagiaire: [
    { path: '/espace-stage', label: 'Mon Espace Stage', icon: GraduationCap, resource: 'espace_stage' },
    { path: '/mes-docs-stage', label: 'Mes Documents (Lecture seule)', icon: FolderLock, resource: 'docs_stage_lecture' },
    { path: '/chat-restreint', label: 'Assistant IA Restreint', icon: MessageSquareText, resource: 'chat_ia_restreint' }
  ]
};

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const role = user?.role?.toLowerCase() === 'employee' ? 'employe' : (user?.role?.toLowerCase() || 'employe');
  const isAdmin = role === 'admin';
  const isSecretaire = role === 'secretaire';
  const isEmploye = role === 'employe';
  const isStagiaire = role === 'stagiaire';

  // Get active routes based on role and double check with permissions.ts
  const allRoutes = tabsByRole[role] || [];
  const routes = allRoutes.filter(route => hasPermission(role, route.resource));

  // ─── Theming Unifié Premium ───
  // Nous utilisons une palette cohérente et haut de gamme (Indigo/Slate) pour tous les rôles
  const accentGradient = 'bg-gradient-to-tr from-indigo-600 to-indigo-500 shadow-indigo-500/30';
  const accentText = 'text-indigo-600 dark:text-indigo-400';
  const activeBg = 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-white border-indigo-500 shadow-sm';
  
  let portalName = 'PORTAIL GENERAL';
  let sectionName = 'Espace de travail';

  if (isAdmin) {
    portalName = 'PANNEAU ADMIN';
    sectionName = 'Administration';
  } else if (isSecretaire) {
    portalName = 'SECRETARIAT GENERAL';
    sectionName = 'Bureau Secrétariat';
  } else if (isEmploye) {
    portalName = 'ESPACE EMPLOYE';
    sectionName = 'Mon Espace';
  } else if (isStagiaire) {
    portalName = 'ESPACE STAGIAIRE';
    sectionName = 'Mon Stage';
  }

  return (
    <aside className="w-72 bg-white dark:bg-[#0B1120]/80 backdrop-blur-2xl text-slate-800 dark:text-slate-200 flex flex-col justify-between p-5 border-r border-slate-200 dark:border-white/5 shrink-0 shadow-sm dark:shadow-2xl z-20 transition-all duration-500 overflow-y-auto">
      <div>
        {/* ─── Header / Logo ─── */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
          <div className={`p-2.5 rounded-xl text-white shadow-lg ${accentGradient}`}>
            {isAdmin ? <ShieldCheck className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-900 dark:text-white tracking-widest uppercase transition-colors duration-300">
              {isAdmin ? 'ADMINISTRATION' : 'SMART ORG'}
            </h1>
            <p className={`text-[9px] font-bold tracking-wider uppercase transition-colors duration-300 ${accentText}`}>
              {portalName}
            </p>
          </div>
        </div>

        {/* ─── Section label ─── */}
        <p className="px-4 mb-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600">
          {sectionName}
        </p>

        {/* ─── Navigation links ─── */}
        <nav className="space-y-1.5">
          {routes.map((route) => {
            const isActive = location.pathname === route.path;

            return (
              <Link
                key={route.path}
                to={route.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-semibold transition-all duration-300 relative group overflow-hidden ${
                  isActive
                    ? `border-l-2 ${activeBg}`
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:translate-x-1 border-l-2 border-transparent'
                }`}
              >
                <span>{route.label}</span>
                {!isActive && (
                  <span className={`absolute left-0 top-0 bottom-0 w-0.5 transition-all duration-300 ${accentGradient} opacity-0 group-hover:opacity-100`}></span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* ─── User profile card ─── */}
      <div className="mt-8 p-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center gap-3 transition-all duration-300 group">
        <div className="w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 transition-colors duration-300 bg-indigo-100 text-indigo-600 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800/50">
          <User className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate transition-colors duration-300">{user?.name || user?.nom || 'Utilisateur'}</p>
            <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Se déconnecter">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <p className={`text-[10px] font-bold truncate transition-colors duration-300 uppercase ${accentText}`}>
             {role}
             <ShieldCheck className="inline ml-1 w-3.5 h-3.5 text-emerald-500 dark:text-emerald-450 transition-colors duration-300" />
          </p>
        </div>
      </div>
    </aside>
  );
}
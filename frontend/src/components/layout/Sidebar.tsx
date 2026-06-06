import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  FileAudio, 
  FolderLock, 
  User, 
  ShieldCheck,
  Building2,
  FileText,
  Users,
  LogOut
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { hasPermission } from '../../auth/permissions';

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const allRoutes = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, resource: 'dashboard' as const },
    { path: '/documents', label: 'Documents', icon: FileText, resource: 'documents' as const },
    { path: '/proces-verbaux', label: 'Procès-Verbaux', icon: FileAudio, resource: 'procesVerbaux' as const },
    { path: '/reunions', label: 'Réunions', icon: Calendar, resource: 'reunions' as const },
    { path: '/users', label: 'Utilisateurs', icon: Users, resource: 'users' as const },
    { path: '/historique', label: 'Historique', icon: FolderLock, resource: 'historique' as const },
  ];

  const routes = allRoutes.filter(route => hasPermission(user?.role, route.resource));

  return (
    <aside className="w-64 bg-white dark:bg-slate-900/60 backdrop-blur-xl text-slate-800 dark:text-slate-200 flex flex-col justify-between p-5 border-r border-slate-200 dark:border-slate-800/80 shrink-0 shadow-sm dark:shadow-2xl z-20 transition-colors duration-300">
      <div>
        {/* Company Header / Logo */}
        <div className="flex items-center gap-3 px-2 py-4 mb-6 border-b border-slate-200 dark:border-slate-800/60 transition-colors duration-300">
          <div className="p-2 bg-gradient-to-tr from-indigo-600 to-purple-650 rounded-xl text-white shadow-lg shadow-indigo-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-900 dark:text-white tracking-widest uppercase transition-colors duration-300">
              SECRETARIAT
            </h1>
            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 tracking-wider transition-colors duration-300">
              GENERAL PORTAL
            </p>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="space-y-1.5">
          {routes.map((route) => {
            const Icon = route.icon;
            const isActive = location.pathname === route.path;
            return (
              <Link
                key={route.path}
                to={route.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-[12px] font-semibold transition-all duration-300 relative group overflow-hidden ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-gradient-to-r dark:from-indigo-650/20 dark:to-purple-650/10 text-indigo-700 dark:text-white border-l-2 border-indigo-600 dark:border-indigo-500 shadow-sm dark:shadow-md dark:shadow-indigo-550/5'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:translate-x-1'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-colors duration-300 ${
                  isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400'
                }`} />
                <span>{route.label}</span>
                {!isActive && (
                  <span className="absolute left-0 top-0 bottom-0 w-0.5 bg-indigo-500/0 group-hover:bg-indigo-200 dark:group-hover:bg-indigo-550/60 transition-all duration-300"></span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User profile bottom card */}
      <div className="p-3 bg-slate-50 dark:bg-slate-950/45 border border-slate-200 dark:border-slate-800/60 rounded-xl flex items-center gap-3 transition-all duration-300 group">
        <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-gradient-to-tr dark:from-indigo-900/30 dark:to-purple-900/30 border border-indigo-200 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 transition-colors duration-300">
          <User className="w-4 h-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1.5">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate transition-colors duration-300">{user?.name || 'Utilisateur'}</p>
            <button onClick={logout} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Se déconnecter">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-slate-500 truncate font-semibold transition-colors duration-300 capitalize">
             {user?.role || ''}
             <ShieldCheck className="inline ml-1 w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450 transition-colors duration-300" />
          </p>
        </div>
      </div>
    </aside>
  );
}
import React, { useState, useEffect } from 'react';
import { 
  Users, Search, UserPlus, Edit, Key, UserCheck, UserX, 
  X, Loader2, AlertCircle, Filter, ShieldCheck, Mail, Lock
} from 'lucide-react';
import { usersApi } from '../api/usersApi';
import type { UserResponse, UserRole } from '../api/usersApi';
import { useAuth } from '../contexts/AuthContext';

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<boolean | ''>('');
  
  // Modals
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  
  // Form State
  const [editingUser, setEditingUser] = useState<UserResponse | null>(null);
  const [formData, setFormData] = useState({
    nom: '', email: '', role: 'employee' as UserRole, password: '', is_active: true
  });
  const [resetData, setResetData] = useState({ new_password: '', confirm_password: '' });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  
  // Success Message
  const [successMessage, setSuccessMessage] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await usersApi.getUsers({ search, role: roleFilter, is_active: statusFilter });
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || "Erreur lors du chargement des utilisateurs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, statusFilter]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormData({ nom: '', email: '', role: 'employee', password: '', is_active: true });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openEditModal = (u: UserResponse) => {
    setEditingUser(u);
    setFormData({ nom: u.nom, email: u.email, role: u.role, password: '', is_active: u.is_active });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const openResetModal = (u: UserResponse) => {
    setEditingUser(u);
    setResetData({ new_password: '', confirm_password: '' });
    setFormError('');
    setIsResetModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    
    if (!formData.nom || !formData.email || !formData.role) {
      setFormError('Veuillez remplir tous les champs obligatoires.');
      return;
    }
    if (!editingUser && formData.password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    setFormLoading(true);
    try {
      if (editingUser) {
        await usersApi.updateUser(editingUser.id, {
          nom: formData.nom,
          email: formData.email,
          role: formData.role,
          is_active: formData.is_active
        });
        showSuccess("Utilisateur modifié avec succès.");
      } else {
        await usersApi.createUser({
          nom: formData.nom,
          email: formData.email,
          role: formData.role,
          password: formData.password,
          is_active: formData.is_active
        });
        showSuccess("Utilisateur créé avec succès.");
      }
      setIsFormModalOpen(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Une erreur est survenue.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    if (resetData.new_password.length < 6) {
      setFormError('Le mot de passe doit contenir au moins 6 caractères.');
      return;
    }
    if (resetData.new_password !== resetData.confirm_password) {
      setFormError('Les mots de passe ne correspondent pas.');
      return;
    }
    
    setFormLoading(true);
    try {
      await usersApi.resetUserPassword(editingUser!.id, resetData);
      showSuccess("Mot de passe réinitialisé.");
      setIsResetModalOpen(false);
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Une erreur est survenue.");
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (user: UserResponse) => {
    const isSelf = currentUser?.email === user.email;
    if (isSelf) return;

    if (!window.confirm(`Voulez-vous vraiment ${user.is_active ? 'désactiver' : 'activer'} le compte de ${user.email} ?`)) return;

    try {
      await usersApi.updateUserStatus(user.id, !user.is_active);
      showSuccess(`Utilisateur ${user.is_active ? 'désactivé' : 'activé'}.`);
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Une erreur est survenue.");
    }
  };

  const isEditingSelf = editingUser?.email === currentUser?.email;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Gestion des utilisateurs
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">Administration des comptes applicatifs et droits d'accès.</p>
        </div>
        <button onClick={openCreateModal} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md">
          <UserPlus className="w-4 h-4" /> Nouvel utilisateur
        </button>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 text-emerald-600 border border-emerald-200 p-3 rounded-xl text-xs font-bold">
          {successMessage}
        </div>
      )}

      {error && (
        <div className="bg-rose-50 text-rose-600 border border-rose-200 p-3 rounded-xl text-xs font-bold flex gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-900/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Rechercher par nom ou email..." 
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
          />
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-2.5 w-3 h-3 text-slate-400" />
            <select 
              value={roleFilter} 
              onChange={e => setRoleFilter(e.target.value as any)}
              className="pl-8 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
            >
              <option value="">Tous les rôles</option>
              <option value="admin">Admin</option>
              <option value="secretaire">Secrétaire</option>
              <option value="employee">Employé</option>
              <option value="stagiaire">Stagiaire</option>
            </select>
          </div>
          <select 
            value={statusFilter === '' ? '' : (statusFilter ? 'true' : 'false')} 
            onChange={e => setStatusFilter(e.target.value === '' ? '' : e.target.value === 'true')}
            className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none appearance-none"
          >
            <option value="">Tous les statuts</option>
            <option value="true">Actif</option>
            <option value="false">Inactif</option>
          </select>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Utilisateur</th>
                <th className="px-6 py-4">Rôle</th>
                <th className="px-6 py-4">Statut</th>
                <th className="px-6 py-4">Dernière connexion</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Chargement...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 italic">Aucun utilisateur trouvé.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800 dark:text-slate-200">{u.nom}</div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1 mt-0.5"><Mail className="w-3 h-3"/> {u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-bold text-[10px] rounded border border-indigo-100 dark:border-indigo-800/50 uppercase">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {u.is_active ? (
                        <span className="flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase"><UserCheck className="w-3 h-3"/> Actif</span>
                      ) : (
                        <span className="flex items-center gap-1 text-rose-500 font-bold text-[10px] uppercase"><UserX className="w-3 h-3"/> Inactif</span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-500">
                      {u.last_login ? new Date(u.last_login).toLocaleString() : 'Jamais'}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 flex justify-end">
                      <button onClick={() => openEditModal(u)} className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 rounded-lg transition-colors" title="Modifier">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => openResetModal(u)} className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 hover:bg-amber-100 rounded-lg transition-colors" title="Mot de passe">
                        <Key className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toggleStatus(u)} 
                        disabled={currentUser?.email === u.email}
                        className={`p-1.5 rounded-lg transition-colors ${u.is_active ? 'bg-rose-50 text-rose-600 hover:bg-rose-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        title={u.is_active ? "Désactiver" : "Activer"}
                      >
                        {u.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">{editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}</h3>
              <button onClick={() => setIsFormModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-5 space-y-4">
              {formError && <div className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg">{formError}</div>}
              {isEditingSelf && <div className="text-[10px] font-bold text-amber-600 bg-amber-50 p-2 rounded-lg flex items-center gap-2"><ShieldCheck className="w-3 h-3"/> Vous modifiez votre propre compte. Certaines actions sont bloquées.</div>}
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nom complet</label>
                <input required value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Email</label>
                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              
              {!editingUser && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Mot de passe provisoire</label>
                  <input required minLength={6} type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Rôle</label>
                  <select disabled={isEditingSelf} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                    <option value="admin">Admin</option>
                    <option value="secretaire">Secrétaire</option>
                    <option value="employee">Employé</option>
                    <option value="stagiaire">Stagiaire</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Statut</label>
                  <select disabled={isEditingSelf} value={formData.is_active ? 'true' : 'false'} onChange={e => setFormData({...formData, is_active: e.target.value === 'true'})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50">
                    <option value="true">Actif</option>
                    <option value="false">Inactif</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsFormModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Annuler</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {formLoading && <Loader2 className="w-3 h-3 animate-spin"/>}
                  {editingUser ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isResetModalOpen && editingUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2"><Lock className="w-4 h-4"/> Réinitialiser mot de passe</h3>
              <button onClick={() => setIsResetModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5"/></button>
            </div>
            <form onSubmit={handleResetSubmit} className="p-5 space-y-4">
              <p className="text-[10px] text-slate-500">Nouveau mot de passe pour <strong className="dark:text-slate-300">{editingUser.email}</strong></p>
              {formError && <div className="text-[10px] font-bold text-rose-600 bg-rose-50 p-2 rounded-lg">{formError}</div>}
              
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nouveau mot de passe</label>
                <input required minLength={6} type="password" value={resetData.new_password} onChange={e => setResetData({...resetData, new_password: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Confirmer mot de passe</label>
                <input required minLength={6} type="password" value={resetData.confirm_password} onChange={e => setResetData({...resetData, confirm_password: e.target.value})} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              <div className="pt-4 flex justify-end gap-2">
                <button type="button" onClick={() => setIsResetModalOpen(false)} className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Annuler</button>
                <button type="submit" disabled={formLoading} className="px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2">
                  {formLoading && <Loader2 className="w-3 h-3 animate-spin"/>} Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

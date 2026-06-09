import React, { useState, useEffect } from 'react';
import { KeyRound, Eye, EyeOff, Save, CheckCircle, AlertTriangle, ShieldCheck, RotateCcw, Loader2 } from 'lucide-react';
import { configApi } from '../api/configApi';
import type { ConfigKey } from '../api/configApi';

interface ApiKeyField {
  id: string;
  label: string;
  description: string;
  placeholder: string;
  value: string;
  saved: boolean;
  hasExistingValue: boolean;
  maskedValue: string;
}

const KEY_META: Record<string, { label: string; description: string; placeholder: string }> = {
  groq_api_key: {
    label: 'Clé API Groq (LLaMA)',
    description: "Utilisée pour les appels IA (génération de PV, analyse d'email, structuration).",
    placeholder: 'gsk_xxxxxxxxxxxxxxxxxxxxx',
  },
  smtp_password: {
    label: 'Mot de passe SMTP',
    description: "Utilisé pour l'envoi des convocations et invitations par e-mail.",
    placeholder: '••••••••••••••••',
  },
  smtp_email: {
    label: 'Adresse SMTP (Expéditeur)',
    description: "L'adresse e-mail utilisée comme expéditeur pour les envois.",
    placeholder: 'secretariat@example.com',
  },
  jwt_secret: {
    label: 'Clé secrète JWT',
    description: "Utilisée pour signer les jetons d'authentification (sessions utilisateurs).",
    placeholder: 'secret_jwt_xxxxxxxxxx',
  },
};

export default function AdminApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyField[]>([]);
  const [loading, setLoading] = useState(true);
  const [visibleKeys, setVisibleKeys] = useState<Record<string, boolean>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  // Load existing keys from backend
  useEffect(() => {
    const loadKeys = async () => {
      try {
        const serverKeys = await configApi.getKeys();
        const fields: ApiKeyField[] = serverKeys.map((sk: ConfigKey) => {
          const meta = KEY_META[sk.key_id] || { label: sk.key_id, description: '', placeholder: '' };
          return {
            id: sk.key_id,
            label: meta.label,
            description: meta.description,
            placeholder: meta.placeholder,
            value: '',
            saved: sk.has_value,
            hasExistingValue: sk.has_value,
            maskedValue: sk.masked_value,
          };
        });
        setKeys(fields);
      } catch (err: any) {
        setErrorMessage("Impossible de charger la configuration depuis le serveur.");
      } finally {
        setLoading(false);
      }
    };
    loadKeys();
  }, []);

  const toggleVisibility = (id: string) => {
    setVisibleKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const updateValue = (id: string, value: string) => {
    setKeys(prev => prev.map(k => k.id === id ? { ...k, value, saved: false } : k));
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage('');
    setTimeout(() => setSuccessMessage(''), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  const handleSave = async (id: string) => {
    const key = keys.find(k => k.id === id);
    if (!key || !key.value) return;

    setSavingId(id);
    try {
      await configApi.updateKey(id, key.value);
      setKeys(prev => prev.map(k => k.id === id ? { ...k, saved: true, hasExistingValue: true, maskedValue: k.value.slice(0, 4) + '••••••••' + k.value.slice(-4) } : k));
      showSuccess(`Configuration "${key.label}" enregistrée avec succès dans le fichier .env.`);
    } catch (err: any) {
      showError(err.response?.data?.detail || "Erreur lors de la sauvegarde.");
    } finally {
      setSavingId(null);
    }
  };

  const handleSaveAll = async () => {
    const updates = keys.filter(k => k.value).map(k => ({ key_id: k.id, value: k.value }));
    if (updates.length === 0) {
      showError("Aucune valeur à enregistrer. Remplissez au moins un champ.");
      return;
    }

    setSavingId('all');
    try {
      await configApi.updateAllKeys(updates);
      setKeys(prev => prev.map(k => {
        if (k.value) {
          return { ...k, saved: true, hasExistingValue: true, maskedValue: k.value.slice(0, 4) + '••••••••' + k.value.slice(-4) };
        }
        return k;
      }));
      showSuccess('Toutes les configurations ont été enregistrées dans le fichier .env.');
    } catch (err: any) {
      showError(err.response?.data?.detail || "Erreur lors de la sauvegarde.");
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 max-w-4xl mx-auto flex items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" /> Chargement de la configuration...
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white uppercase tracking-tight flex items-center gap-2">
            <KeyRound className="w-6 h-6 text-indigo-600" />
            Configuration des Clés d'API
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Gestion sécurisée des clés d'authentification et d'intégration de services externes.
          </p>
        </div>
        <button
          onClick={handleSaveAll}
          disabled={savingId === 'all'}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50"
        >
          {savingId === 'all' ? (
            <RotateCcw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Tout enregistrer
        </button>
      </div>

      {/* Security notice */}
      <div className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 p-4 rounded-xl text-xs font-bold flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 shrink-0 mt-0.5" />
        <div>
          <strong>Sécurité :</strong> Les clés sont enregistrées directement dans le fichier <code className="bg-amber-100 dark:bg-amber-900/40 px-1 py-0.5 rounded">.env</code> du serveur. 
          Les modifications prennent effet immédiatement sans redémarrage.
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {successMessage}
        </div>
      )}

      {/* Error message */}
      {errorMessage && (
        <div className="bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {errorMessage}
        </div>
      )}

      {/* API Key cards */}
      <div className="space-y-4">
        {keys.map((key) => (
          <div
            key={key.id}
            className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm transition-all hover:shadow-md"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <label htmlFor={key.id} className="text-sm font-bold text-slate-800 dark:text-slate-200">
                    {key.label}
                  </label>
                  {key.hasExistingValue && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800/50">
                      <CheckCircle className="w-3 h-3" /> Configuré
                    </span>
                  )}
                  {key.saved && key.value && (
                    <span className="flex items-center gap-1 text-[9px] font-black uppercase text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800/50">
                      <CheckCircle className="w-3 h-3" /> Sauvé
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 font-medium">{key.description}</p>
                {key.hasExistingValue && !key.value && (
                  <p className="text-[10px] text-slate-400 font-mono mt-1">
                    Valeur actuelle : {key.maskedValue}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  id={key.id}
                  type={visibleKeys[key.id] ? 'text' : 'password'}
                  value={key.value}
                  onChange={(e) => updateValue(key.id, e.target.value)}
                  placeholder={key.hasExistingValue ? 'Laisser vide pour conserver la valeur actuelle' : key.placeholder}
                  className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 transition-all pr-10"
                />
                <button
                  onClick={() => toggleVisibility(key.id)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                  title={visibleKeys[key.id] ? 'Masquer' : 'Afficher'}
                >
                  {visibleKeys[key.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={() => handleSave(key.id)}
                disabled={!key.value || savingId === key.id}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition-all disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {savingId === key.id ? (
                  <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                Sauver
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Warning */}
      <div className="p-4 bg-rose-50 dark:bg-rose-900/10 border border-rose-200 dark:border-rose-800/30 rounded-xl flex gap-3 text-xs text-slate-600 dark:text-slate-400 items-start">
        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800 dark:text-slate-300">Avertissement :</strong> La rotation des clés d'API 
          peut entraîner une interruption temporaire des services. Planifiez les changements en dehors des heures 
          de production.
        </div>
      </div>
    </div>
  );
}

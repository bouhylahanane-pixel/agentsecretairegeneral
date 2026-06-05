import { Calendar, FileClock, FileCheck, BrainCircuit } from 'lucide-react';

interface KPICardsProps {
  totalRequests: number;
  urgentRequests: number;
  extractedDecisions: number;
  averageResponseTime: string;
}

export default function KPICards({ totalRequests, urgentRequests, extractedDecisions, averageResponseTime }: KPICardsProps) {
  const items = [
    {
      title: 'Total Requêtes IA',
      val: totalRequests,
      icon: Calendar,
      color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-500/20',
      glow: 'shadow-indigo-500/5',
    },
    {
      title: 'Urgences Détectées',
      val: urgentRequests,
      icon: FileClock,
      color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/20',
      glow: 'shadow-amber-500/5',
    },
    {
      title: 'Décisions Extraites',
      val: extractedDecisions,
      icon: FileCheck,
      color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/20',
      glow: 'shadow-emerald-500/5',
    },
    {
      title: 'Temps de Réponse IA',
      val: averageResponseTime,
      icon: BrainCircuit,
      color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-500/20',
      glow: 'shadow-purple-500/5',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {items.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`p-5 bg-white dark:bg-slate-900/30 backdrop-blur-xl border border-slate-200 dark:border-slate-800/80 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:border-slate-300 dark:hover:border-slate-700/60 shadow-sm hover:shadow-md dark:shadow-none dark:hover:shadow-lg ${item.glow}`}
          >
            <div className={`p-3 rounded-xl border transition-colors duration-300 ${item.color}`}>
              <Icon className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase transition-colors duration-300">
                {item.title}
              </p>
              <h4 className="text-xl font-black text-slate-800 dark:text-white mt-1 tracking-tight transition-colors duration-300">
                {item.val}
              </h4>
            </div>
          </div>
        );
      })}
    </div>
  );
}
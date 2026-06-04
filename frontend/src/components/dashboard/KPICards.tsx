import { Calendar, FileClock, FileCheck, BrainCircuit } from 'lucide-react';

interface KPICardsProps {
  totalMeetings: number;
  pendingMinutes: number;
  extractedDecisions: number;
  aiEfficiency: string;
}

export default function KPICards({ totalMeetings, pendingMinutes, extractedDecisions, aiEfficiency }: KPICardsProps) {
  const items = [
    {
      title: 'Total Meetings',
      val: totalMeetings,
      icon: Calendar,
      color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/20',
      glow: 'shadow-indigo-500/5',
    },
    {
      title: 'Pending Minutes',
      val: pendingMinutes,
      icon: FileClock,
      color: 'text-amber-400 bg-amber-950/40 border-amber-500/20',
      glow: 'shadow-amber-500/5',
    },
    {
      title: 'Extracted Decisions',
      val: extractedDecisions,
      icon: FileCheck,
      color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/20',
      glow: 'shadow-emerald-500/5',
    },
    {
      title: 'AI Processing Efficiency',
      val: aiEfficiency,
      icon: BrainCircuit,
      color: 'text-purple-400 bg-purple-950/40 border-purple-500/20',
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
            className={`p-5 bg-slate-900/30 backdrop-blur-xl border border-slate-800/80 rounded-2xl flex items-center gap-4 transition-all duration-300 hover:border-slate-700/60 hover:shadow-lg ${item.glow}`}
          >
            <div className={`p-3 rounded-xl border ${item.color}`}>
              <Icon className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 tracking-widest uppercase">
                {item.title}
              </p>
              <h4 className="text-xl font-black text-white mt-1 tracking-tight">
                {item.val}
              </h4>
            </div>
          </div>
        );
      })}
    </div>
  );
}
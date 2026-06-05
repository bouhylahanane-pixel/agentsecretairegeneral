import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ActionChartProps {
  data: { name: string; value: number }[];
}

export default function ActionChart({ data }: ActionChartProps) {
  // Glow gradient colors for bar chart
  const colors = ['#6366f1', '#f43f5e', '#10b981', '#a855f7'];

  return (
    <div className="bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-5 shadow-sm dark:shadow-lg h-80 transition-colors duration-300">
      <h3 className="text-[10px] font-bold tracking-widest text-slate-500 uppercase mb-4 transition-colors duration-300">
        Volume de production par type d'acte
      </h3>
      <div className="h-64 w-full">
        {data.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-slate-500 italic transition-colors duration-300">
            Aucune donnée d'activité disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ left: -20, right: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
              <XAxis 
                dataKey="name" 
                fontSize={10} 
                stroke="#64748b" 
                tickLine={false}
                dy={8}
              />
              <YAxis 
                fontSize={10} 
                stroke="#64748b" 
                tickLine={false} 
                dx={-8}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#0f172a',
                  borderRadius: '12px', 
                  border: '1px solid #334155',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  fontSize: '11px',
                  color: '#f1f5f9'
                }} 
              />
              <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={35}>
                {data.map((_, i) => (
                  <Cell key={`cell-${i}`} fill={colors[i % colors.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
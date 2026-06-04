import { useState, useEffect } from 'react';
import { api } from '../api/endpoints';
import type { AnalyticsStats, ActivityLog } from '../types';
import { useApiError } from '../contexts/ApiErrorContext';

export function useAnalytics() {
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [chartData, setChartData] = useState<{ name: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const { setBackendOffline } = useApiError();

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [sRes, lRes, cRes] = await Promise.all([
        api.getStats(),
        api.getLogs(),
        api.getChartData(),
      ]);
      setStats(sRes.data);
      setLogs(lRes.data);
      setBackendOffline(false); // Success! Reset offline flag
      
      // Transformation des clés d'objet snake_case en libellés propres pour le graphique
      setChartData(
        Object.entries(cRes.data).map(([key, val]) => ({
          name: key.replace(/_/g, ' '),
          value: val,
        }))
      );
    } catch (err: any) {
      console.error("Erreur lors de la récupération des analytics:", err);
      if (!err.response || err.code === 'ERR_NETWORK' || err.message.includes('Network Error')) {
        setBackendOffline(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  return { stats, logs, chartData, loading, refresh: fetchAnalytics };
}
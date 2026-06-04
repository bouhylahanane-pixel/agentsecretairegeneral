import { useState, useEffect } from 'react';
import { api } from '../api/endpoints';
import type { Meeting, PVHistory } from '../types';

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [history, setHistory] = useState<PVHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDate, setSearchDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [mRes, hRes] = await Promise.all([
        api.getMeetings(),
        api.getPVHistory()
      ]);
      setMeetings(mRes);
      setHistory(hRes);
    } catch (err) {
      console.error("Erreur lors du chargement des données de réunion :", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteMeeting = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette réunion du registre ?")) return;
    try {
      await api.deleteMeeting(id);
      await loadData(); // Rechargement automatique après suppression
    } catch (err) {
      console.error("Erreur lors de la suppression de la réunion :", err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Application du filtre par date sur les réunions
  const filteredMeetings = meetings.filter(
    (m) => !searchDate || m.date === searchDate
  );

  return {
    meetings: filteredMeetings,
    history,
    loading,
    searchDate,
    setSearchDate,
    deleteMeeting,
    refresh: loadData,
  };
}
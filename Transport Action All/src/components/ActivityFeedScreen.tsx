import React, { useState, useEffect } from 'react';
import { Activity, Search } from 'lucide-react';
import { ScreenId } from '../types';
import { getActivityFeed, ActivityFeedEntry } from '../services/api';

interface Props { onNavigate: (screen: ScreenId) => void; }

const fmtTime = (d: string) => { if (!d) return '-'; try { return new Date(d).toLocaleString('it-IT'); } catch { return d; } };

const EVENT_COLORS: Record<string, string> = {
  'service': 'bg-blue-50 text-blue-700',
  'rapportino': 'bg-purple-50 text-purple-700',
  'invoice': 'bg-emerald-50 text-emerald-700',
  'payment': 'bg-green-50 text-green-700',
  'expense': 'bg-red-50 text-red-700',
  'user': 'bg-gray-100 text-gray-700',
  'default': 'bg-surface-container text-on-surface-variant',
};

function getEventColor(eventType: string): string {
  for (const [key, color] of Object.entries(EVENT_COLORS)) {
    if (eventType.startsWith(key)) return color;
  }
  return EVENT_COLORS.default;
}

export default function ActivityFeedScreen({ onNavigate }: Props) {
  const [activities, setActivities] = useState<ActivityFeedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setIsLoading(true);
    try { setActivities(await getActivityFeed(200)); } finally { setIsLoading(false); }
  };

  const filtered = activities.filter(a => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return a.description.toLowerCase().includes(q) || a.entityType.toLowerCase().includes(q) || a.user.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 w-full max-w-[1280px] mx-auto space-y-4 p-4 md:p-6 overflow-y-auto h-full pb-8">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shrink-0 sticky top-0 py-2 z-30 bg-background/90 backdrop-blur-md">
        <div>
          <h2 className="font-headline-lg-mobile md:font-headline-lg text-on-surface">Activity Feed</h2>
          <p className="text-[12px] text-on-surface-variant mt-0.5">{filtered.length} event{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </header>

      <div className="relative w-full sm:w-64 px-1">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
        <input type="text" placeholder="Search activity..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-lowest border border-outline-variant pl-8 pr-3 py-1.5 text-[12px] rounded-lg focus:outline-none focus:border-primary text-on-surface" />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-3 flex items-start gap-3 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2"><div className="h-5 w-20 bg-surface-dim rounded" /><div className="h-4 w-24 bg-surface-dim rounded" /></div>
                  <div className="h-3 w-3/4 bg-surface-dim rounded" />
                  <div className="h-3 w-1/3 bg-surface-dim rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 border border-dashed border-outline-variant rounded-xl">
            <Activity className="w-10 h-10 text-outline" /><span className="text-[13px] text-on-surface-variant">No activity found</span>
          </div>
        ) : filtered.map(a => (
          <div key={a.id} className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${getEventColor(a.eventType)}`}>{a.eventType}</span>
                <span className="text-[10px] text-on-surface-variant">{a.entityType} #{a.entityId}</span>
              </div>
              <p className="text-[13px] text-on-surface mt-1">{a.description}</p>
              <div className="flex items-center gap-3 mt-1 text-[11px] text-on-surface-variant">
                <span>{fmtTime(a.timestamp)}</span>
                {a.user && <span>· {a.user}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

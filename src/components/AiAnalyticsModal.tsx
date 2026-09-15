import React, { useEffect, useState } from 'react';
import { BarChart3, X, RefreshCw } from 'lucide-react';

interface CommandCounts {
  mine: number; chop: number; build: number; stockpiles: number; zones: number; orders: number;
}
interface LogEntry {
  ts: string; cycleId: string; source: string; model: string; latencyMs: number;
  ok: boolean; error: string | null; directive: string; statusSummary: string;
  commandCounts: CommandCounts;
}
interface Aggregates {
  totalCycles: number;
  bySource: Record<string, number>;
  errorRate: number;
  latency: { avg: number; p50: number; p95: number };
  statusDistribution: Record<string, number>;
  avgCommandsPerCycle: CommandCounts;
  topDirectives: { directive: string; count: number }[];
}
interface LogsResponse { date: string; entries: LogEntry[]; aggregates: Aggregates; }

interface Props {
  isOpen: boolean;
  onClose: () => void;
  lang: 'ua' | 'en';
}

export const AiAnalyticsModal: React.FC<Props> = ({ isOpen, onClose, lang }) => {
  const [data, setData] = useState<LogsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/df-ai/logs?limit=100');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e?.message || 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (isOpen) load(); }, [isOpen]);

  if (!isOpen) return null;

  const t = (ua: string, en: string) => (lang === 'ua' ? ua : en);
  const agg = data?.aggregates;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-stone-900 border border-amber-800/70 rounded-lg shadow-2xl text-stone-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-amber-900/60 bg-stone-950/70">
          <div className="flex items-center gap-2 font-cinzel">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <span className="font-bold">{t('Аналітика рішень Gemini', 'Gemini Decision Analytics')}</span>
            {data && <span className="text-xs text-stone-500">({data.date})</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={load} className="p-1.5 rounded hover:bg-stone-800 text-amber-300" title={t('Оновити', 'Refresh')}>
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-stone-800 text-stone-400">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {error && <div className="text-red-400 text-sm">{t('Помилка завантаження:', 'Load error:')} {error}</div>}
          {!error && !agg && <div className="text-stone-400 text-sm">{t('Завантаження…', 'Loading…')}</div>}

          {agg && agg.totalCycles === 0 && (
            <div className="text-stone-400 text-sm">
              {t('Ще немає записів за сьогодні. Запустіть кілька AI-кроків.', 'No cycles logged today yet. Run a few AI steps.')}
            </div>
          )}

          {agg && agg.totalCycles > 0 && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Stat label={t('Циклів', 'Cycles')} value={String(agg.totalCycles)} />
                <Stat label={t('Помилок', 'Error rate')} value={`${(agg.errorRate * 100).toFixed(0)}%`} />
                <Stat label={t('Латентність (сер.)', 'Latency avg')} value={`${agg.latency.avg}ms`} />
                <Stat label="p95" value={`${agg.latency.p95}ms`} />
              </div>

              <Section title={t('Джерела рішень', 'Decision sources')}>
                <KeyVals map={agg.bySource} />
              </Section>

              <Section title={t('Розподіл статусів', 'Status distribution')}>
                <KeyVals map={agg.statusDistribution} />
              </Section>

              <Section title={t('Сер. команд за цикл', 'Avg commands / cycle')}>
                <KeyVals map={Object.fromEntries(
                  Object.entries(agg.avgCommandsPerCycle).map(([k, v]) => [k, Number(v).toFixed(2)]),
                )} />
              </Section>

              <Section title={t('Останні цикли', 'Recent cycles')}>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-stone-500 text-left">
                      <tr>
                        <th className="py-1 pr-3">{t('Час', 'Time')}</th>
                        <th className="py-1 pr-3">{t('Джерело', 'Source')}</th>
                        <th className="py-1 pr-3">{t('Статус', 'Status')}</th>
                        <th className="py-1 pr-3">ms</th>
                        <th className="py-1 pr-3">{t('Команди (d/c/b)', 'Cmds (d/c/b)')}</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono">
                      {data!.entries.map(e => (
                        <tr key={e.cycleId} className="border-t border-stone-800/60">
                          <td className="py-1 pr-3 text-stone-400">{e.ts.slice(11, 19)}</td>
                          <td className={`py-1 pr-3 ${e.ok ? 'text-emerald-400' : 'text-red-400'}`}>{e.source}</td>
                          <td className="py-1 pr-3 text-amber-300">{e.statusSummary}</td>
                          <td className="py-1 pr-3 text-stone-400">{e.latencyMs}</td>
                          <td className="py-1 pr-3 text-stone-300">
                            {e.commandCounts.mine}/{e.commandCounts.chop}/{e.commandCounts.build}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const Stat: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="bg-stone-950/70 border border-stone-800 rounded p-2">
    <div className="text-[10px] uppercase text-stone-500">{label}</div>
    <div className="text-lg font-bold text-amber-300 font-mono">{value}</div>
  </div>
);

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div>
    <div className="text-[11px] uppercase font-bold text-stone-400 mb-1">{title}</div>
    {children}
  </div>
);

const KeyVals: React.FC<{ map: Record<string, string | number> }> = ({ map }) => (
  <div className="flex flex-wrap gap-1.5">
    {Object.entries(map).map(([k, v]) => (
      <span key={k} className="text-xs bg-stone-950/70 border border-stone-800 rounded px-2 py-0.5 font-mono">
        <span className="text-stone-400">{k}</span> <span className="text-amber-300 font-semibold">{String(v)}</span>
      </span>
    ))}
  </div>
);

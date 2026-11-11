import { useQuery } from '@tanstack/react-query';
import { formatCategory } from '../../lib/format';

interface Cat {
  category: string;
  pnl: number;
  markets: number;
}

export function CategoryPnl({ kalshiUsername }: { kalshiUsername: string }) {
  const enc = encodeURIComponent(kalshiUsername);
  const { data, isLoading } = useQuery<{ categories: Cat[] }>({
    queryKey: ['/api/kalshi', kalshiUsername, 'categories'],
    queryFn: async () => {
      const r = await fetch(`/api/kalshi/${enc}/categories`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 1_800_000,
    retry: false,
  });
  const { data: change } = useQuery<{ change?: { categories?: { category: string; change: number }[] } }>({
    queryKey: ['/api/kalshi', kalshiUsername, 'category-change'],
    queryFn: async () => {
      const r = await fetch(`/api/kalshi/${enc}/category-change`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    staleTime: 600_000,
    retry: false,
  });

  const movers = (change?.change?.categories ?? []).slice(0, 3);
  const rows = (data?.categories ?? []).filter((c) => Math.abs(c.pnl) >= 1 || c.markets > 0);
  if (!isLoading && rows.length === 0) return null;
  const max = Math.max(1, ...rows.map((c) => Math.abs(c.pnl)));

  return (
    <div className="bg-card border border-border rounded-lg p-4" data-testid="category-pnl">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm text-muted-foreground">P&amp;L by Category</h2>
        <span className="text-xs text-muted-foreground">Kalshi · all-time · markets traded</span>
      </div>
      {movers.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
          <span className="text-xs text-muted-foreground">Last 24h</span>
          {movers.map((m) => (
            <span key={m.category} className="tabular-nums">
              {m.category} <span className={m.change >= 0 ? 'text-green-500' : 'text-red-500'}>{formatCategory(m.change)}</span>
            </span>
          ))}
        </div>
      )}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-5 bg-muted rounded animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5">
          {rows.map((c) => (
            <div
              key={c.category}
              className="grid grid-cols-[minmax(0,10rem)_1fr_4.5rem] sm:grid-cols-[13rem_1fr_6rem] items-center gap-3 text-sm leading-tight"
            >
              <div className="truncate" title={c.category}>
                {c.category}
                {c.markets > 0 && <span className="ml-1.5 text-xs text-muted-foreground tabular-nums">{c.markets.toLocaleString('en-US')}</span>}
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${c.pnl >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.max(2, (Math.abs(c.pnl) / max) * 100)}%` }}
                />
              </div>
              <div className={`text-right tabular-nums ${c.pnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{formatCategory(c.pnl)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

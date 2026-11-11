import { useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useEvalReport } from '../lib/evalReport';
import { useTitle } from '../lib/seo';

/**
 * Drag-to-compare: original screenshot underneath, replica on top, clipped at
 * the slider. A third mode shows the pixelmatch diff (red = differing pixels).
 * Screenshots come from the last `npm run eval:visual` run, taken seconds apart
 * against the same API data so content differences do not pollute the diff.
 */
export default function Compare() {
  useTitle('Compare · Interview replica');
  const { data: report, isLoading } = useEvalReport();
  const [caseId, setCaseId] = useState<string | null>(null);
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState<'slider' | 'diff'>('slider');
  const cases = report?.visual ?? [];
  const c = cases.find((x) => x.id === caseId) ?? cases[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader width="max-w-6xl" />
      <main className="max-w-6xl mx-auto px-4 py-6 text-sm">
        <h1 className="text-2xl font-bold mb-1">Original vs replica</h1>
        <p className="text-muted-foreground mb-4">Left of the line: original (predicting.top). Right: this replica.</p>
        {isLoading && <p className="text-muted-foreground">Loading…</p>}
        {!isLoading && !c && <p className="text-muted-foreground">No screenshots published yet. Run npm run eval:visual.</p>}
        {c && (
          <>
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <select
                value={c.id}
                onChange={(e) => setCaseId(e.target.value)}
                className="bg-background border border-border rounded px-2 py-1 text-sm"
                aria-label="Case"
                data-testid="compare-case"
              >
                {cases.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.page} · {x.viewport} · {x.theme} · {x.matchPercent.toFixed(2)}%
                  </option>
                ))}
              </select>
              {(['slider', 'diff'] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2.5 py-1 text-xs rounded ${mode === m ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}`}
                >
                  {m === 'slider' ? 'Slider' : 'Diff mask'}
                </button>
              ))}
              {mode === 'slider' && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pos}
                  onChange={(e) => setPos(Number(e.target.value))}
                  className="w-48"
                  aria-label="Slider position"
                  data-testid="compare-slider"
                />
              )}
            </div>
            {mode === 'slider' ? (
              <div className="relative w-full border border-border rounded-lg overflow-hidden select-none" data-testid="compare-stage">
                <img src={c.replica} alt="Replica screenshot" className="block w-full" />
                <div className="absolute inset-0 overflow-hidden" style={{ width: `${pos}%` }}>
                  <img src={c.original} alt="Original screenshot" className="block max-w-none" style={{ width: `${10000 / Math.max(pos, 0.0001)}%` }} />
                </div>
                <div className="absolute top-0 bottom-0 w-0.5 bg-yellow-400" style={{ left: `${pos}%` }} />
              </div>
            ) : (
              <img src={c.diff} alt="Pixel diff" className="block w-full border border-border rounded-lg" />
            )}
          </>
        )}
      </main>
    </div>
  );
}

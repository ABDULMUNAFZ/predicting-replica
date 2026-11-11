import { PageHeader } from '../components/PageHeader';
import { useEvalReport } from '../lib/evalReport';
import { useTitle } from '../lib/seo';

const pct = (n: number) => `${n.toFixed(2)}%`;

/** About this replica: disclosure, data credit, and the latest eval results. */
export default function Replica() {
  useTitle('About this replica · Interview assignment');
  const { data: report, isLoading } = useEvalReport();
  const visualPass = report?.visual.filter((v) => v.pass).length ?? 0;
  const dataPass = report?.data.filter((d) => d.pass).length ?? 0;
  const parity = report?.parity ?? [];
  const parityPass = parity.filter((d) => d.pass).length;
  const real = report?.visual.filter((v) => !v.control) ?? [];
  const avg = real.length ? real.reduce((s, v) => s + v.matchPercent, 0) / real.length : 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader width="max-w-4xl" />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8 text-sm">
        <section>
          <h1 className="text-2xl font-bold mb-2">About this replica</h1>
          <p className="text-muted-foreground">
            This site is a replica of{' '}
            <a href="https://predicting.top" className="underline" target="_blank" rel="noopener noreferrer">
              predicting.top
            </a>{' '}
            built for a hiring assignment (AI-Native Builder, Elcara LLC-FZ). It is not predicting.top, is not affiliated with it, and is kept out of
            search engines.
          </p>
        </section>

        <section className="bg-card border border-border rounded-lg p-4">
          <h2 className="font-semibold mb-2">Data credit</h2>
          <p className="text-muted-foreground">
            Trader data comes from predicting.top's{' '}
            <a href="https://predicting.top/api-docs" className="underline" target="_blank" rel="noopener noreferrer">
              free public API
            </a>
            , which asks users to credit predicting.top and link back. The replica's own <code>/api/*</code> routes forward an allow-listed set of
            those endpoints with edge caching (to stay well under the published rate limits) and fall back to a bundled snapshot if the upstream is
            down. Polymarket P&amp;L is cross-checked independently against Polymarket's official data API.
          </p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold">Latest eval run</h2>
            <a href="/compare" className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-xs font-medium">
              Open side-by-side compare
            </a>
          </div>
          {isLoading && <p className="text-muted-foreground">Loading report…</p>}
          {!isLoading && !report && <p className="text-muted-foreground">No eval report published yet. Run npm run eval.</p>}
          {report && (
            <>
              <p className="text-xs text-muted-foreground mb-4">
                Generated {new Date(report.generatedAt).toLocaleString()} · original {report.originalUrl} · replica {report.replicaUrl}
              </p>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6" data-testid="eval-summary">
                <Stat label="Visual match (avg, excl. control)" value={pct(avg)} />
                <Stat label="Visual cases passing" value={`${visualPass} / ${report.visual.length}`} />
                <Stat label="Functional parity" value={`${parityPass} / ${parity.length}`} />
                <Stat label="Data checks passing" value={`${dataPass} / ${report.data.length}`} />
                <Stat label="Unit tests" value={report.unit ? `${report.unit.passed} / ${report.unit.total}` : '–'} />
              </div>

              <h3 className="font-medium mb-2">Visual diff (pixel match vs. the live original, same viewport, same data moment)</h3>
              <table className="w-full text-xs mb-6">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 font-normal">Page</th>
                    <th className="p-2 font-normal">Viewport</th>
                    <th className="p-2 font-normal">Theme</th>
                    <th className="p-2 font-normal text-right">Match</th>
                    <th className="p-2 font-normal text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.visual.map((v) => (
                    <tr key={v.id} className="border-b border-border">
                      <td className="p-2">
                        {v.page}
                        {v.control && <span className="ml-1 text-muted-foreground">(must fail: proves the diff catches a 2px shift)</span>}
                      </td>
                      <td className="p-2">{v.viewport}</td>
                      <td className="p-2">{v.theme}</td>
                      <td className="p-2 text-right tabular-nums">{pct(v.matchPercent)}</td>
                      <td className={`p-2 text-right ${v.pass ? 'text-green-500' : 'text-red-500'}`}>
                        {v.pass ? 'PASS' : 'FAIL'} ({v.control ? '<' : '≥'}
                        {v.threshold}%)
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-medium mb-2">Functional parity (same clicks on both sites, same data: what each page shows must be identical)</h3>
              <table className="w-full text-xs mb-6">
                <tbody>
                  {parity.map((d) => (
                    <tr key={d.id} className="border-b border-border align-top">
                      <td className="p-2">{d.description.replace(/^Parity: /, '')}</td>
                      <td className="p-2 font-mono break-all text-muted-foreground">{d.expected}</td>
                      <td className={`p-2 text-right ${d.pass ? 'text-green-500' : 'text-red-500'}`}>{d.pass ? 'IDENTICAL' : 'DIFFERS'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <h3 className="font-medium mb-2">Data checks (proxy fidelity + Polymarket official API as ground truth)</h3>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="p-2 font-normal">Check</th>
                    <th className="p-2 font-normal">Expected</th>
                    <th className="p-2 font-normal">Actual</th>
                    <th className="p-2 font-normal text-right">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {report.data.map((d) => (
                    <tr key={d.id} className="border-b border-border align-top">
                      <td className="p-2">{d.description}</td>
                      <td className="p-2 font-mono break-all">{d.expected}</td>
                      <td className="p-2 font-mono break-all">{d.actual}</td>
                      <td className={`p-2 text-right ${d.pass ? 'text-green-500' : 'text-red-500'}`}>{d.pass ? 'PASS' : 'FAIL'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>

        <section className="text-muted-foreground">
          <h2 className="font-semibold text-foreground mb-2">Intentional differences</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>A small "Interview replica" badge on every page (masked out of the pixel diff, and reported as such).</li>
            <li>Pages are noindex. Outbound Polymarket and Kalshi links carry no affiliate or referral codes.</li>
            <li>The Get listed form validates exactly like the original but does not send anything.</li>
            <li>The Terms page keeps the layout but uses replica-specific text.</li>
            <li>No analytics or tracking scripts.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-card border border-border rounded-lg p-3">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

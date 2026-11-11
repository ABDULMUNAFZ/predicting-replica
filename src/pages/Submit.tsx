import { useState, type ChangeEvent, type FormEvent } from 'react';
import { PageHeader } from '../components/PageHeader';
import { useTitle } from '../lib/seo';
import { validateSubmission, type Submission } from '../lib/submit';

const FIELD = 'w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40';
const EMPTY: Submission = { x_handle: '', account: '', platform: 'polymarket', pnl: '', website: '' };

/**
 * Same form, fields and validation as the reference. Intentional difference:
 * a valid entry is NOT forwarded to predicting.top (this replica has no right
 * to submit on anyone's behalf), so the confirmation says so instead.
 */
export default function Submit() {
  useTitle('Submit Your Entry — Prediction Market Leaderboard');
  const [form, setForm] = useState<Submission>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<'idle' | 'sent'>('idle');
  const bind = (k: keyof Submission) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const err = validateSubmission(form);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setState('sent');
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader width="max-w-xl" />
      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Predicting Top Leaderboard — Entry Submission</h1>
        <p className="text-sm text-muted-foreground mb-8">
          Submit your details to be added to the Predicting Top Leaderboard. We will verify your information before adding you.
        </p>
        {state === 'sent' ? (
          <div className="bg-card border border-border rounded-lg p-6" data-testid="submit-done">
            <h2 className="text-lg font-semibold mb-1">Entry looks valid.</h2>
            <p className="text-sm text-muted-foreground">
              This is an interview replica, so nothing was sent. To get listed for real, use the form on predicting.top.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-5" noValidate data-testid="submit-form">
            <div>
              <label htmlFor="x_handle" className="block text-sm font-medium mb-1">
                X / Twitter Handle <span className="text-red-500">*</span>
              </label>
              <input id="x_handle" className={FIELD} value={form.x_handle} onChange={bind('x_handle')} placeholder="@yourhandle" maxLength={100} autoComplete="off" required />
            </div>
            <div>
              <label htmlFor="platform" className="block text-sm font-medium mb-1">
                Platform
              </label>
              <select id="platform" className={FIELD} value={form.platform} onChange={bind('platform')}>
                <option value="polymarket">Polymarket</option>
                <option value="kalshi">Kalshi</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label htmlFor="account" className="block text-sm font-medium mb-1">
                Polymarket Wallet Address / Kalshi Account Name <span className="text-red-500">*</span>
              </label>
              <input
                id="account"
                className={FIELD}
                value={form.account}
                onChange={bind('account')}
                placeholder="0x… or your Kalshi username"
                maxLength={200}
                autoComplete="off"
                required
              />
            </div>
            <div>
              <label htmlFor="pnl" className="block text-sm font-medium mb-1">
                PnL (Profit &amp; Loss) <span className="text-red-500">*</span>
              </label>
              <input id="pnl" className={FIELD} value={form.pnl} onChange={bind('pnl')} placeholder="$125,000" maxLength={40} autoComplete="off" required />
            </div>
            <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
              <label htmlFor="website">Website</label>
              <input id="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={bind('website')} />
            </div>
            {error && (
              <p className="text-sm text-red-500" role="alert">
                {error}
              </p>
            )}
            <button type="submit" className="w-full px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:opacity-90 disabled:opacity-60">
              Submit
            </button>
          </form>
        )}
      </main>
    </div>
  );
}

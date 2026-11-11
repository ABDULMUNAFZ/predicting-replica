import { PageHeader } from '../components/PageHeader';
import { useTitle } from '../lib/seo';

/**
 * Same layout and section structure as the reference Terms page. Intentional
 * difference: the body text is this replica's own, because predicting.top's
 * legal terms bind predicting.top's operators, not an interview project.
 */
const SECTIONS: [string, string][] = [
  ['1. Acceptance of Terms', 'By using this replica ("the Site") you accept these terms. The Site is a hiring-assignment project and is not predicting.top.'],
  ['2. Informational Purposes Only', 'The Site shows publicly available prediction market data for demonstration only. It is not financial, investment, legal or tax advice.'],
  ['3. No Financial Advice', 'Nothing here is a recommendation to buy, sell or hold anything. Past results of any trader shown do not predict future results.'],
  ['4. No Warranty', 'The Site is provided as-is. Data comes from third-party public APIs and may be late, incomplete or wrong.'],
  ['5. Limitation of Liability', 'The author of this replica is not liable for any loss arising from use of the Site.'],
  ['6. Third-Party Links', 'The Site links to third-party sites such as Polymarket, Kalshi, X and predicting.top. Their terms apply there.'],
  ['7. Assumption of Risk', 'Prediction markets carry a real risk of losing money. Any trading decision is yours alone.'],
  ['8. User Conduct', 'Do not use the Site for unlawful purposes or try to overload it or the upstream APIs it reads from.'],
  ['9. Intellectual Property', 'Trader data, names and platform logos belong to their owners. The original design belongs to predicting.top. This replica exists only for evaluation.'],
  ['10. Indemnification', 'You agree not to hold the replica author responsible for claims arising from your use of the Site.'],
  ['11. Modifications', 'These terms may change while the assignment is being reviewed.'],
  ['12. Governing Law', 'These terms follow applicable law, without regard to conflict-of-law rules.'],
  ['13. Severability', 'If any part of these terms is unenforceable, the rest still applies.'],
];

export default function Terms() {
  useTitle('Terms of Service');
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PageHeader />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: November 11, 2026</p>
        <div className="space-y-6 text-sm leading-relaxed">
          {SECTIONS.map(([h, p]) => (
            <section key={h}>
              <h2 className="text-lg font-semibold mb-2">{h}</h2>
              <p className="text-muted-foreground">{p}</p>
            </section>
          ))}
          <section className="pt-4 border-t border-border">
            <p className="text-muted-foreground">By using this replica, you confirm you have read these terms.</p>
          </section>
        </div>
      </main>
      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Predicting.top</p>
        </div>
      </footer>
    </div>
  );
}

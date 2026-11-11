import { useQuery } from '@tanstack/react-query';

/** Shape of public/evals/report.json, written by `npm run eval:visual` and `npm run eval:data`. */
export interface VisualCase {
  control?: boolean;
  id: string;
  page: string;
  viewport: string;
  theme: 'dark' | 'light';
  matchPercent: number;
  threshold: number;
  pass: boolean;
  original: string;
  replica: string;
  diff: string;
}

export interface DataCheck {
  id: string;
  description: string;
  expected: string;
  actual: string;
  pass: boolean;
}

export interface EvalReport {
  generatedAt: string;
  replicaUrl: string;
  originalUrl: string;
  visual: VisualCase[];
  data: DataCheck[];
  parity?: DataCheck[];
  unit?: { passed: number; failed: number; total: number };
}

export function useEvalReport() {
  return useQuery<EvalReport | null>({
    queryKey: ['eval-report'],
    queryFn: async () => {
      const r = await fetch('/evals/report.json', { cache: 'no-store' });
      if (!r.ok) return null;
      return r.json();
    },
    staleTime: Infinity,
  });
}

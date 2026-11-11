import { useEffect } from 'react';

/** Sets the document title. Robots stay `noindex` site-wide (index.html + X-Robots-Tag). */
export function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

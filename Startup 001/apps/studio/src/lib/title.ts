import { useEffect } from 'react';

/**
 * The browser tab.
 *
 * Small thing, noticed constantly: somebody with six tabs open sees only the first
 * twenty characters, so the *specific* part has to come first and the product name
 * last. "Projects · Motion" tells you which tab this is; "Motion — Projects" does not.
 *
 * A middle dot rather than a dash: dashes are wide, look like a subtitle, and turn a
 * tab strip into a row of lines.
 */
const APP = 'Motion';

export const useTitle = (page?: string): void => {
  useEffect(() => {
    document.title = page ? `${page} · ${APP}` : APP;

    return () => {
      document.title = APP;
    };
  }, [page]);
};

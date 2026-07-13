import { useEffect, useState } from 'react';
import { parseHashRoute } from '../config/routes';

export function useHashRoute() {
  const [route, setRoute] = useState(parseHashRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(parseHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return route;
}

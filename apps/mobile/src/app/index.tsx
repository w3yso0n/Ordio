import { useEffect, useState } from 'react';
import { Redirect, type Href } from 'expo-router';
import { hasStoredSession } from '../lib/api';

export default function Index() {
  const [href, setHref] = useState<Href | null>(null);

  useEffect(() => {
    void (async () => {
      if (await hasStoredSession('cashier')) {
        setHref('/sale');
        return;
      }
      if (await hasStoredSession('device')) {
        setHref('/pin');
        return;
      }
      setHref('/pair');
    })();
  }, []);

  if (!href) return null;
  return <Redirect href={href} />;
}

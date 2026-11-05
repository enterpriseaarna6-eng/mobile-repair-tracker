'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportsPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect directly to Pending to Repair where CSV/Excel downloads are built-in!
    router.replace('/pending');
  }, [router]);

  return null;
}

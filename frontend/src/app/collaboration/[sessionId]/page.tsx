'use client';

import { useParams } from 'next/navigation';
import { Collaboration } from '@/components/ui/collaboration';

export default function Page() {
  const { sessionId } = useParams();
  return <Collaboration sessionId={sessionId as string} />;
}

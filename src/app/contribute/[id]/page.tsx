'use client';

import { useParams } from 'next/navigation';
import ContributeFlow from '@/components/ContributeFlow';

export default function ContributePage() {
  const { id } = useParams<{ id: string }>();
  return <ContributeFlow itemId={id} />;
}

'use client';

import { useActivityLogger } from '@/lib/hooks/use-activity-logger';

export default function ActivityLogger() {
  useActivityLogger();
  return null;
}


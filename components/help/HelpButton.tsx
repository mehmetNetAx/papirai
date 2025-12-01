'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import HelpDialog from './HelpDialog';

interface HelpButtonProps {
  module: string;
  variant?: 'default' | 'outline' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showLabel?: boolean;
}

export default function HelpButton({
  module,
  variant = 'outline',
  size = 'default',
  className,
  showLabel = true,
}: HelpButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={() => setOpen(true)}
        className={className}
        title="Yardım"
      >
        <span className="material-symbols-outlined text-lg">help</span>
        {showLabel && <span className="ml-2">Yardım</span>}
      </Button>
      <HelpDialog module={module} open={open} onOpenChange={setOpen} />
    </>
  );
}


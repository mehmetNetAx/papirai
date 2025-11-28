import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LogoProps {
  showText?: boolean;
  className?: string;
  href?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeMap = {
  sm: { icon: 24, text: 'text-lg' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 48, text: 'text-2xl' },
};

export default function Logo({ 
  showText = true, 
  className,
  href = '/',
  size = 'md'
}: LogoProps) {
  const { icon: iconSize, text: textSize } = sizeMap[size];
  
  // Calculate logo dimensions based on size
  const logoWidth = size === 'sm' ? 120 : size === 'md' ? 150 : 180;
  const logoHeight = iconSize;
  
  const logoContent = (
    <div className={cn('flex items-center', className)}>
      <div className="relative" style={{ width: showText ? logoWidth : iconSize, height: logoHeight }}>
        <Image
          src="/logo.svg"
          alt="PapirAi Logo"
          width={logoWidth}
          height={logoHeight}
          priority
          className="object-contain"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-block">
        {logoContent}
      </Link>
    );
  }

  return logoContent;
}


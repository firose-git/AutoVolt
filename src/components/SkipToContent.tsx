import { useEffect, useState } from 'react';
import { Button } from './ui/button';

/**
 * Skip to Content Link
 * Provides a skip link for keyboard users to bypass navigation
 * Only visible when focused via keyboard (Tab key)
 */
export function SkipToContent() {
  const [isVisible, setIsVisible] = useState(false);

  const handleSkip = () => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      mainContent.focus();
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <Button
      onClick={handleSkip}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
      className={`
        fixed top-4 left-4 z-[9999]
        transition-transform duration-200
        ${isVisible ? 'translate-y-0' : '-translate-y-20'}
      `}
      variant="secondary"
      size="sm"
    >
      Skip to main content
    </Button>
  );
}

/**
 * Skip Links Component
 * Provides multiple skip links for different sections
 */
interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

interface SkipLinksProps {
  links?: SkipLink[];
}

export function SkipLinks({ links }: SkipLinksProps) {
  const defaultLinks: SkipLink[] = [
    { id: 'skip-main', label: 'Skip to main content', targetId: 'main-content' },
    { id: 'skip-nav', label: 'Skip to navigation', targetId: 'navigation' },
    { id: 'skip-footer', label: 'Skip to footer', targetId: 'footer' },
  ];

  const skipLinks = links || defaultLinks;
  const [focusedLink, setFocusedLink] = useState<string | null>(null);

  const handleSkip = (targetId: string) => {
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav
      aria-label="Skip links"
      className="sr-only focus-within:not-sr-only focus-within:fixed focus-within:top-4 focus-within:left-4 focus-within:z-[9999]"
    >
      <ul className="flex flex-col gap-2 bg-background border rounded-lg p-2 shadow-lg">
        {skipLinks.map((link) => (
          <li key={link.id}>
            <Button
              onClick={() => handleSkip(link.targetId)}
              onFocus={() => setFocusedLink(link.id)}
              onBlur={() => setFocusedLink(null)}
              variant="ghost"
              size="sm"
              className="w-full justify-start"
            >
              {link.label}
            </Button>
          </li>
        ))}
      </ul>
    </nav>
  );
}

'use client';

import { useEffect } from 'react';
import { playButtonTapSound, initAudioUnlock } from '@/lib/sound';

/**
 * GlobalButtonSound Provider
 * Automatically attaches instant zero-delay tactile audio feedback to every button,
 * link button, and clickable control across the application.
 * Uses pointerdown in passive capture mode to guarantee 0ms latency without interfering
 * with any React synthetic events, forms, or business logic.
 */
export default function GlobalButtonSound() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Ensure audio context is ready on first touch
    initAudioUnlock();

    const handlePointerDown = (e: PointerEvent) => {
      // Ignore right clicks or non-primary pointers
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      const target = (e.target as HTMLElement | null)?.closest?.(
        'button, [role="button"], input[type="button"], input[type="submit"], a.btn, [data-sound-trigger="true"]'
      ) as HTMLElement | null;

      if (!target) return;

      // Ignore disabled buttons
      if (
        target.hasAttribute('disabled') ||
        target.getAttribute('aria-disabled') === 'true' ||
        target.classList.contains('disabled') ||
        target.classList.contains('opacity-50') && target.hasAttribute('disabled')
      ) {
        return;
      }

      // Ignore elements explicitly marked to have no sound
      if (target.getAttribute('data-no-sound') === 'true') {
        return;
      }

      // Determine sound variant from attributes, classes, or roles
      const explicitVariant = target.getAttribute('data-sound') as 'tap' | 'pop' | 'success' | 'delete' | null;
      if (explicitVariant) {
        playButtonTapSound(explicitVariant);
        return;
      }

      const className = typeof target.className === 'string' ? target.className : '';

      if (
        className.includes('bg-red-') ||
        className.includes('bg-rose-') ||
        className.includes('text-red-') ||
        className.includes('text-rose-') ||
        className.includes('hover:bg-rose')
      ) {
        playButtonTapSound('delete');
      } else if (
        className.includes('bg-emerald-') ||
        className.includes('bg-green-') ||
        className.includes('text-emerald-') ||
        className.includes('pay-btn') ||
        className.includes('btn-checkout')
      ) {
        playButtonTapSound('success');
      } else if (
        className.includes('tab') ||
        className.includes('pill') ||
        className.includes('rounded-full')
      ) {
        playButtonTapSound('pop');
      } else {
        playButtonTapSound('tap');
      }
    };

    window.addEventListener('pointerdown', handlePointerDown, { capture: true, passive: true });

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    };
  }, []);

  return null;
}

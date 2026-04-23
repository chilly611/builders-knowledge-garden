'use client';

import React, { useEffect, useRef, useState } from 'react';
import '../animations/scroll-timeline.css';

/**
 * ScrollStage
 * ===========
 * Wrapper component that uses CSS scroll-driven animations (animation-timeline: view())
 * to drive child fade/slide-in transitions as the section scrolls into view.
 *
 * Features:
 * - Native CSS scroll-timeline support for modern browsers
 * - Intersection Observer fallback for browsers without scroll-timeline
 * - Full prefers-reduced-motion support
 * - Optional onEnter callback fires once when section becomes 40% visible
 *
 * Usage:
 *   <ScrollStage stageId={1} onEnter={() => console.log('Entered!')}>
 *     <div className="scroll-fade-in">Fades in on scroll</div>
 *     <div className="scroll-slide-in">Slides in on scroll</div>
 *   </ScrollStage>
 */

interface ScrollStageProps {
  /** Stage ID for analytics/semantics; doesn't affect visuals */
  stageId?: number;
  /** Children that should animate in */
  children: React.ReactNode;
  /** Optional callback when this section becomes primarily visible */
  onEnter?: () => void;
  /** Additional className */
  className?: string;
}

export default function ScrollStage({
  stageId,
  children,
  onEnter,
  className = '',
}: ScrollStageProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const hasCalledRef = useRef(false);

  // Intersection Observer for fallback and callback
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Update visibility for fallback animations at 40% threshold
          if (entry.intersectionRatio >= 0.4) {
            setIsVisible(true);

            // Fire onEnter callback once per mount
            if (!hasCalledRef.current && onEnter) {
              hasCalledRef.current = true;
              onEnter();
            }
          }
        });
      },
      {
        threshold: 0.4, // Trigger at 40% visibility
      }
    );

    observer.observe(section);

    return () => {
      observer.disconnect();
    };
  }, [onEnter]);

  const dataAttr = stageId !== undefined ? { [`data-scroll-stage`]: stageId } : {};

  return (
    <section
      ref={sectionRef}
      {...dataAttr}
      data-visible={isVisible ? 'true' : 'false'}
      className={className}
      style={{
        position: 'relative',
        width: '100%',
      }}
    >
      {children}
    </section>
  );
}

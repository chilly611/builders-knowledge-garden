'use client';

import React, { ReactNode } from 'react';

interface StaggerChildrenProps {
  children: ReactNode;
  /** CSS class to apply to each child (e.g., 'bkg-fade-up') */
  animation?: string;
  /** Optional: customize the stagger index start (default: 0). Useful if you have multiple stagger groups. */
  startIndex?: number;
}

/**
 * StaggerChildren — wraps children and automatically applies sequential .bkg-stagger-N classes.
 *
 * Example:
 * ```jsx
 * <StaggerChildren animation="bkg-fade-up">
 *   <Card>1</Card>
 *   <Card>2</Card>
 *   <Card>3</Card>
 * </StaggerChildren>
 * ```
 *
 * Renders:
 * ```jsx
 * <Card className="bkg-fade-up bkg-stagger-1">1</Card>
 * <Card className="bkg-fade-up bkg-stagger-2">2</Card>
 * <Card className="bkg-fade-up bkg-stagger-3">3</Card>
 * ```
 *
 * Supports prefers-reduced-motion automatically via CSS.
 */
export function StaggerChildren({
  children,
  animation = 'bkg-fade-up',
  startIndex = 0,
}: StaggerChildrenProps) {
  return (
    <>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;

        // Calculate stagger index (1–6 cycle)
        const staggerIndex = ((index + startIndex) % 6) + 1;
        const staggerClass = `bkg-stagger-${staggerIndex}`;

        // Merge with existing className
        const existingClass = (child.props as any)?.className || '';
        const newClassName = `${animation} ${staggerClass} ${existingClass}`.trim();

        return React.cloneElement(child as React.ReactElement<any>, { className: newClassName });
      })}
    </>
  );
}

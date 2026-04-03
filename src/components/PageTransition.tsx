"use client";

import { motion, AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";

/**
 * PageTransition Wrapper
 *
 * Wraps page content with smooth fade and slide animations.
 * Uses usePathname to detect route changes and animate transitions.
 *
 * Features:
 * - Fade in/out (opacity: 0 → 1)
 * - Slide up on enter (y: 10 → 0)
 * - Slide down on exit (y: -8)
 * - 300ms duration with easeInOut timing
 * - Waits for exit animation before starting entry (mode="wait")
 *
 * Usage:
 * ```tsx
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 * ```
 */

export default function PageTransition({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

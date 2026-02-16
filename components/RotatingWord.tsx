"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type RotatingWordProps = {
  words: string[];
  intervalMs?: number; // default 3000
  className?: string;  // wrapper class
  wordClassName?: string; // word class
};

/**
 * RotatingWord
 * - Cycles through `words` on an interval
 * - Uses AnimatePresence for smooth enter/exit
 * - Respects prefers-reduced-motion
 * - Keeps layout stable by setting minWidth to the longest word
 */
export function RotatingWord({
  words,
  intervalMs = 3000,
  className = "",
  wordClassName = "text-navy-600",
}: RotatingWordProps) {
  const shouldReduceMotion = useReducedMotion();
  const [index, setIndex] = React.useState(0);

  // Compute a stable min width so the headline doesn't "jump" as words change
  const maxLen = React.useMemo(
    () => (words?.length ? Math.max(...words.map((w) => w.length)) : 0),
    [words]
  );

  React.useEffect(() => {
    if (!words?.length) return;
    if (shouldReduceMotion) return;

    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % words.length);
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [words, intervalMs, shouldReduceMotion]);

  const current = words?.length ? words[index] : "";

  return (
    <span className={className}>
      <span
        className="relative inline-block align-baseline text-left whitespace-nowrap"
        style={{ 
          minWidth: maxLen ? `${maxLen * 0.6}ch` : undefined,
          width: maxLen ? `${maxLen * 0.6}ch` : undefined
        }}
      >
        {shouldReduceMotion ? (
          <span className={`${wordClassName} whitespace-nowrap`}>{words?.[0] ?? ""}</span>
        ) : (
          <AnimatePresence mode="wait">
            <motion.span
              key={current}
              className={`${wordClassName} inline-block whitespace-nowrap`}
              initial={{ opacity: 0, y: 10, filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -10, filter: "blur(2px)" }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              aria-hidden="true"
            >
              {current}
            </motion.span>
          </AnimatePresence>
        )}
      </span>
      {/* Screen-reader friendly static text (avoids announcing every 3s) */}
      <span className="sr-only">{words?.[0] ?? ""}</span>
    </span>
  );
}

"use client"

// From @aceternity/text-generate-effect, adapted: typography comes from the
// caller (no hard-coded size, weight or colours), the stagger is a prop, the
// reveal can be completed early, it reports completion, it honours
// prefers-reduced-motion, and each line of `words` is its own paragraph (the
// stagger runs across them in reading order).
import { useEffect, useMemo } from "react"

import { passageParagraphs } from "@/lib/passage"
import {
  motion,
  stagger as staggerBy,
  useAnimate,
  useReducedMotion,
} from "motion/react"

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
  stagger = 0.2,
  instant = false,
  onComplete,
}: {
  words: string
  className?: string
  filter?: boolean
  /** Seconds each word takes to appear. */
  duration?: number
  /** Seconds between one word starting and the next. */
  stagger?: number
  /** Show everything now (skip, or reduced motion). */
  instant?: boolean
  onComplete?: () => void
}) => {
  const [scope, animate] = useAnimate()
  const reduced = useReducedMotion()
  const paragraphs = useMemo(
    () => passageParagraphs(words).map((paragraph) => paragraph.split(" ")),
    [words]
  )
  const now = instant || !!reduced

  useEffect(() => {
    const controls = animate(
      "[data-word]",
      { opacity: 1, filter: filter ? "blur(0px)" : "none" },
      now ? { duration: 0 } : { duration, delay: staggerBy(stagger) }
    )
    let cancelled = false
    controls.then(() => {
      if (!cancelled) onComplete?.()
    })
    return () => {
      cancelled = true
    }
    // onComplete is a callback; re-running the animation when it changes identity would restart the reveal.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animate, duration, filter, now, stagger, words])

  return (
    <span ref={scope} className={className}>
      {paragraphs.map((paragraphWords, p) => (
        <span key={p} className="block not-first:mt-4">
          {paragraphWords.map((word, idx) => (
            <motion.span
              key={word + idx}
              data-word
              className="opacity-0"
              style={{ filter: filter ? "blur(10px)" : "none" }}
            >
              {word}{" "}
            </motion.span>
          ))}
        </span>
      ))}
    </span>
  )
}

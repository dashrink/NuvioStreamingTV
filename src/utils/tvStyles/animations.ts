/**
 * TV Animation Configuration
 *
 * Provides optimized animation timing and spring configurations
 * tuned for smooth 60fps on TV hardware.
 */

/**
 * TV-optimized animation configurations
 */
export const TV_ANIMATIONS = {
  // Focus animations should be snappy on TV
  focusSpring: {
    damping: 18,
    stiffness: 180,
    mass: 0.8,
  },

  // Carousel transitions
  carouselTiming: {
    duration: 400,
  },

  // Page transitions
  pageTiming: {
    duration: 350,
  },

  // Scroll deceleration
  scrollDeceleration: 'normal' as const,
} as const;

/**
 * Common animation durations
 */
export const TV_ANIMATION_DURATIONS = {
  // Quick feedback animations
  instant: 100,
  fast: 150,
  normal: 200,
  slow: 300,
  verySlow: 400,
} as const;

/**
 * Spring physics for different animation types
 */
export const TV_SPRING_CONFIGS = {
  // Snappy, high-energy spring
  snappy: {
    damping: 20,
    stiffness: 200,
    mass: 0.7,
  },

  // Smooth, medium-energy spring
  smooth: {
    damping: 15,
    stiffness: 150,
    mass: 0.8,
  },

  // Soft, low-energy spring
  soft: {
    damping: 10,
    stiffness: 100,
    mass: 1.0,
  },

  // Very bouncy spring
  bouncy: {
    damping: 8,
    stiffness: 200,
    mass: 0.7,
  },
} as const;

export type TVAnimationConfig = typeof TV_ANIMATIONS;
export type TVAnimationDuration = typeof TV_ANIMATION_DURATIONS;
export type TVSpringConfig = typeof TV_SPRING_CONFIGS;

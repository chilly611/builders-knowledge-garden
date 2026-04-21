# Motion System

A lightweight, CSS-only motion system for BKG. Brings surfaces to life with entrance animations, hover states, and page transitions—without the noise or library overhead.

## Core Principles

1. **No Layout Shift**: All animations use `transform` (translate, scale) and `opacity` only. No width, height, margin, or padding changes during animation.
2. **Reduced Motion Respect**: Every animation is guarded by `@media (prefers-reduced-motion: reduce)`. Users who prefer no motion see none.
3. **Pure CSS**: No JavaScript dependencies, no framer-motion or react-spring. Just utility classes you add to markup.

## Utility Classes

### Entrance Animations

These classes trigger on mount or whenever an element enters the viewport. Apply directly to the element.

- **`.bkg-fade-up`** (280ms, springy)
  - Fades in while sliding up 8px.
  - Use for cards, modals, section intros.
  - Example: `<Card className="bkg-fade-up" />`

- **`.bkg-fade-in`** (240ms, ease-out)
  - Simple opacity fade. For backgrounds, overlays, subtle content.
  - Example: `<Overlay className="bkg-fade-in" />`

- **`.bkg-scale-in`** (220ms, springy)
  - Fades in while scaling from 96% to 100%.
  - Use for buttons, badges, focal-point elements.
  - Example: `<Button className="bkg-scale-in" />`

### Stagger Classes

Apply to children in a list to cascade animations. Pair with an entrance class on each child.

- **`.bkg-stagger-1` through `.bkg-stagger-6`**
  - Delays: 40ms, 80ms, 120ms, 160ms, 200ms, 240ms.
  - Example:
    ```jsx
    {items.map((item, i) => (
      <CardItem key={item.id} className={`bkg-fade-up bkg-stagger-${i % 6 + 1}`} />
    ))}
    ```

### Hover Interactions

These classes add smooth transitions on hover. Pair with entrance animations.

- **`.bkg-hover-lift`** (180ms, ease-out)
  - Lifts element 2px on hover, adds subtle shadow.
  - Use on cards, buttons, links.
  - Example: `<Card className="bkg-fade-up bkg-hover-lift" />`

### Hero Animations

Slower, more dramatic. Use sparingly for key page elements.

- **`.bkg-hero-mark`** (900ms, springy)
  - Fades in, scales from 92% to 100%, slides up 12px.
  - Use once per page—product name, logo, hero headline.
  - Example: `<h1 className="bkg-hero-mark">Welcome</h1>`

## Timing Guidelines

| Element | Animation | Duration | Ease |
|---------|-----------|----------|------|
| Cards | fade-up | 280ms | springy |
| Buttons | scale-in | 220ms | springy |
| Modals | fade-up | 280ms | springy |
| Hovers | hover-lift | 180ms | ease-out |
| Hero | hero-mark | 900ms | springy |

## Reduced Motion

All animations automatically disable for users with `prefers-reduced-motion: reduce` set in their OS settings. No special handling needed on your end—the guard is built into the CSS.

## For Inline Styles

If you need to reference durations/easings in JavaScript, import from `@/design-system/motion/tokens`:

```ts
import { MOTION } from '@/design-system/motion/tokens';

const style = {
  animation: `myAnimation ${MOTION.entranceDuration}ms ${MOTION.entranceEase} both`,
};
```

## What NOT to Do

- **Don't animate layout properties** (width, height, margin, padding). Use transform instead.
- **Don't stack multiple entrance animations** on the same element. Pick one.
- **Don't animate on every interaction**. Focus on high-value moments: page load, hover, focus, state change.
- **Don't use easing other than the tokens.** They're tuned for the system's feel.

## Future Expansion

This system is minimal and additive. Future agents can:
- Add more entrance variants (fade-left, zoom-in, rotate-in) following the same pattern.
- Add page transition keyframes under a `@media (prefers-reduced-motion: reduce)` guard.
- Build a React component library on top (e.g., `<AnimatedCard entrance="fade-up" />`).
- Add CSS Spring physics via Popmotion or custom cubic-bezier curves.

Always respect the "no layout shift" rule and the "prefer reduced motion" guard.

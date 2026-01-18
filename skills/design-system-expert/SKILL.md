---
name: Design System Expert
description: Expert in designing and implementing premium, scalable design systems. Focused on visual excellence, consistency, and modern UI/UX principles across Web, Mobile, and TV.
---

# Design System Expert

This skill embodies the principles of high-end design, focusing on creating a cohesive visual language that elevates the user experience through premium aesthetics.

## Design Philosophy
1. **Premium First**: Avoid generic "Material" or generic "Bootstrap" looks. Use curated palettes, sophisticated typography, and depth (shadows, glassmorphism).
2. **Atomic Structure**: Build from foundations (tokens) upwards to atoms, molecules, and organisms.
3. **Motion is Meaning**: Use animations not just for flair, but to provide feedback and guide the user's eye.

## Core System Pillars

### 1. Design Tokens (Foundations)
- **Colors**: Use HSL or OKLCH for better color manipulation. Define semantic layers (primary, elevation-1, surface-low).
- **Typography**: Scale based on accessibility and hierarchy. Prefer variable fonts like 'Inter' or 'Outfit'.
- **Spacing**: Use a strictly enforced 4pt or 8pt grid.
- **Glassmorphism**: Define levels of backdrop-blur and border-opacity for modern "layered" UIs.

### 2. Component Architecture
- **Stateless Tokens**: Components should consume tokens, never hardcoded values.
- **Accessibility**: ARIA roles, focus management (especially for TV), and high-contrast considerations.
- **Responsive & Adaptive**: Components should work across small mobile screens, large desktops, and 10ft TV experiences.

### 3. TV-Specific Design
- **Safe Zones**: Ensure content isn't cut off by physical TV bezels.
- **Focus Indicators**: Use scale, glow, or high-contrast borders to clearly indicate the "focused" state.
- **Navigation**: Support D-Pad navigation patterns (Up, Down, Left, Right, Select).

## Aesthetics & Polish
- **Subtle Gradients**: Use wide-gamut colors and smooth transitions (basing gradients on perceived lightness).
- **Micro-Animations**: Hover states, press effects, and loading transitions should feel fluid (use Spring physics).
- **Iconography**: Consistent stroke weights and optical sizing.

## Implementation Guidelines
- **CSS-in-JS or Modern CSS**: Maintain tokens in a central theme provider or CSS variables.
- **Storybook/Documentation**: Every component must be documented with its variants and props.
- **Visual Regression Testing**: Ensure changes don't break the system's integrity.

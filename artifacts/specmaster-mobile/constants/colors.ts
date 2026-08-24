/**
 * Semantic design tokens for the mobile app.
 *
 * These tokens mirror the naming conventions used in web artifacts (index.css)
 * so that multi-artifact projects share a cohesive visual identity.
 *
 * Replace the placeholder values below with values that match the project's
 * brand. If a sibling web artifact exists, read its index.css and convert the
 * HSL values to hex so both artifacts use the same palette.
 *
 * To add dark mode, add a `dark` key with the same token names.
 * The useColors() hook will automatically pick it up.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: '#111827',
    tint: '#D4A72C',

    // Core surfaces
    background: '#FFFFFF',
    foreground: '#111827',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#111827',

    // Primary action color (buttons, links, active states)
    primary: '#111827',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#F8F9FA',
    secondaryForeground: '#111827',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#F8F9FA',
    mutedForeground: '#6B7280',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#F3E7B2',
    accentForeground: '#111827',

    // Destructive actions (delete, error states)
    destructive: '#B91C1C',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#E5E7EB',
    input: '#D1D5DB',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;

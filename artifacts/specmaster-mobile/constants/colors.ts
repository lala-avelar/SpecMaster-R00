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
    text: '#1F1F1F',
    tint: '#0075DE',

    // Core surfaces
    background: '#F6F6F6',
    foreground: '#1F1F1F',

    // Cards / elevated surfaces
    card: '#FFFFFF',
    cardForeground: '#1F1F1F',

    // Primary action color (buttons, links, active states)
    primary: '#0075DE',
    primaryForeground: '#FFFFFF',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#FFFFFF',
    secondaryForeground: '#1F1F1F',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#EDEEEC',
    mutedForeground: '#6B6B6B',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#02093A',
    accentForeground: '#FFFFFF',

    // Destructive actions (delete, error states)
    destructive: '#E03E3E',
    destructiveForeground: '#FFFFFF',
    success: '#0F7B6C',
    warning: '#DFAB01',
    danger: '#E03E3E',

    // Borders and input outlines
    border: '#EDEEEC',
    input: '#D1D5DB',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;

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
    text: '#17352d',
    tint: '#c26a3a',

    // Core surfaces
    background: '#f7f8f4',
    foreground: '#17352d',

    // Cards / elevated surfaces
    card: '#ffffff',
    cardForeground: '#17352d',

    // Primary action color (buttons, links, active states)
    primary: '#c26a3a',
    primaryForeground: '#ffffff',

    // Secondary / less-emphasis interactive surfaces
    secondary: '#e9eee8',
    secondaryForeground: '#17352d',

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: '#edf0eb',
    mutedForeground: '#687a72',

    // Accent highlights (badges, selected items, focus rings)
    accent: '#dfeade',
    accentForeground: '#17352d',

    // Destructive actions (delete, error states)
    destructive: '#b95552',
    destructiveForeground: '#ffffff',

    // Borders and input outlines
    border: '#dce4dc',
    input: '#dce4dc',
  },

  // Border radius (in px). Sync from the sibling web artifact's --radius
  // CSS variable. This value applies to cards, buttons, inputs, and modals.
  radius: 8,
};

export default colors;

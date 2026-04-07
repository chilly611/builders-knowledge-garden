/**
 * Builder's Knowledge Garden — Blueprint Design System
 * =====================================================
 *
 * Usage:
 *   // Import design tokens
 *   import blueprint, { colors, fonts, spacing } from '../design-system';
 *
 *   // Import components
 *   import { Button, Card, Badge, Input, Modal, Panel, BlueprintBackground } from '../design-system/components';
 *
 *   // Import globals.css in your layout
 *   import '../design-system/globals.css';
 */

// Re-export everything from the design system
export {
  default,
  colors,
  fonts,
  fontSizes,
  fontWeights,
  lineHeights,
  letterSpacing,
  spacing,
  borders,
  radii,
  shadows,
  transitions,
  zIndex,
  breakpoints,
  blueprintStyles,
  cssVariables,
  fontImportUrl,
  blueprintGridBackground,
  blueprintGridSize,
  parchmentTexture,
  cornerMark,
} from './designSystem';

// Re-export components
export {
  BlueprintBackground,
  Button,
  Card,
  Badge,
  Input,
  Textarea,
  Modal,
  Panel,
  Divider,
  Tooltip,
} from './components';


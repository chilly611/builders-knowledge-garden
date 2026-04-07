/**
 * Blueprint Design System — Color Palette
 * Blue ink on cream paper, sci-fi accents
 */

export const colors = {
  ink: {
    900: '#0B1D33',
    800: '#122B4A',
    700: '#1B3A5C',
    600: '#24507A',
    500: '#2E6699',
    400: '#4A89BE',
    300: '#7BAAD4',
    200: '#A8CAE8',
    100: '#D4E5F4',
    50:  '#EBF2FA',
  },
  paper: {
    white:   '#FEFEFE',
    cream:   '#FDF8F0',
    warm:    '#FAF3E8',
    aged:    '#F5EDDF',
    antique: '#EDE4D3',
    fold:    '#E5DCC9',
    shadow:  '#D9CFB8',
    border:  '#C9BFAA',
  },
  cyan: {
    glow:   '#00F5FF',
    bright: '#00D4E8',
    main:   '#00B8D4',
    mid:    '#0097A7',
    deep:   '#00796B',
  },
  amber: {
    glow:   '#FFD54F',
    bright: '#FFCA28',
    main:   '#FFA726',
    mid:    '#F57C00',
    deep:   '#E65100',
  },
  status: {
    success:     '#2E7D32',
    successLight:'#E8F5E9',
    warning:     '#E65100',
    warningLight:'#FFF3E0',
    error:       '#C62828',
    errorLight:  '#FFEBEE',
    info:        '#1565C0',
    infoLight:   '#E3F2FD',
  },
  phase: {
    dream:   '#D85A30',
    design:  '#7F77DD',
    plan:    '#1B3A5C',
    build:   '#378ADD',
    deliver: '#BA7517',
    grow:    '#2E7D32',
  },
  transparent: 'transparent',
  overlay: 'rgba(11, 29, 51, 0.6)',
  gridLine: 'rgba(27, 58, 92, 0.08)',
  gridLineMajor: 'rgba(27, 58, 92, 0.15)',
} as const;


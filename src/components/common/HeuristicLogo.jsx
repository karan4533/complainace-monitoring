import React from 'react';
import { Box } from '@mui/material';
import logoLight from '../../assets/heuristic-labs-logo-light.png';
import logoDark from '../../assets/heuristic-labs-logo-dark.png';

/**
 * Heuristic Labs logo with transparent background.
 * - variant="light" → white mark for dark UI (sidebar)
 * - variant="dark"  → brand-dark mark for light UI (login)
 */
export default function HeuristicLogo({
  size = 40,
  variant = 'dark',
  sx = {},
  alt = 'Heuristic Labs',
}) {
  return (
    <Box
      component="img"
      src={variant === 'light' ? logoLight : logoDark}
      alt={alt}
      sx={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        ...sx,
      }}
    />
  );
}

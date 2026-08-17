import type { SeverityLevel } from '../schemas/review.schema';

/**
 * Severity level metadata — display labels, colors, and ordering weight.
 */
export const SEVERITY_CONFIG: Record<SeverityLevel, {
  label: string;
  emoji: string;
  cssColor: string;
  weight: number;
  isBlocking: boolean;
}> = {
  INFO: {
    label: 'Info',
    emoji: 'ℹ️',
    cssColor: '#3b82f6',
    weight: 0,
    isBlocking: false,
  },
  WARNING: {
    label: 'Warning',
    emoji: '⚠️',
    cssColor: '#f59e0b',
    weight: 1,
    isBlocking: false,
  },
  ERROR: {
    label: 'Error',
    emoji: '❌',
    cssColor: '#ef4444',
    weight: 2,
    isBlocking: true,
  },
  CRITICAL: {
    label: 'Critical',
    emoji: '🚨',
    cssColor: '#dc2626',
    weight: 3,
    isBlocking: true,
  },
};

/**
 * Ordered severity levels from least to most severe.
 */
export const SEVERITY_ORDER: SeverityLevel[] = ['INFO', 'WARNING', 'ERROR', 'CRITICAL'];

/**
 * Check if a severity level meets or exceeds a threshold.
 */
export function meetsThreshold(severity: SeverityLevel, threshold: SeverityLevel): boolean {
  return SEVERITY_CONFIG[severity].weight >= SEVERITY_CONFIG[threshold].weight;
}

import { StyleSheet } from 'react-native';
import { Colors } from './theme';

export const shared = StyleSheet.create({
  // ── Cards ──────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
  },
  cardHover: {
    shadowOpacity: 0.06,
    shadowRadius: 30,
    elevation: 4,
  },

  // ── Typography ─────────────────────────────────────────────────
  headlineLg: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.4,
    color: Colors.onSurface,
    fontFamily: 'Geist_700Bold',
  },
  headlineMd: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.onSurface,
    fontFamily: 'Geist_600SemiBold',
  },
  bodyMd: {
    fontSize: 16,
    fontWeight: '400',
    color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  bodySm: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.onSurfaceVariant,
    fontFamily: 'Inter_400Regular',
  },
  labelMd: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    color: Colors.onSurface,
    fontFamily: 'Geist_600SemiBold',
  },
  labelSm: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.outline,
    fontFamily: 'Geist_700Bold',
  },

  // ── Chip / badge ───────────────────────────────────────────────
  chip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    fontFamily: 'Geist_700Bold',
  },

  // ── Form fields ────────────────────────────────────────────────
  fieldInput: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1.5,
    borderColor: Colors.surfaceContainer,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: Colors.onSurface,
    fontFamily: 'Inter_400Regular',
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    color: Colors.outline,
    marginBottom: 6,
    paddingLeft: 2,
    fontFamily: 'Geist_700Bold',
  },

  // ── Progress bar ───────────────────────────────────────────────
  progressBarTrack: {
    height: 6,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 999,
    overflow: 'hidden' as const,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: Colors.secondary,
  },

  // ── Task accent borders ────────────────────────────────────────
  taskAccentHabit: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  taskAccentGoal: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.secondary,
  },
  taskAccentEvent: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.tertiary,
  },

  // ── Stat tile ──────────────────────────────────────────────────
  statTile: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center' as const,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(193,200,200,0.15)',
  },

  // ── Buttons ────────────────────────────────────────────────────
  primaryButton: {
    backgroundColor: Colors.primary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 6,
  },
  primaryButtonText: {
    color: Colors.onPrimary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontFamily: 'Geist_600SemiBold',
  },
  secondaryButton: {
    backgroundColor: Colors.secondary,
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 6,
  },
  secondaryButtonText: {
    color: Colors.onSecondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.1,
    fontFamily: 'Geist_600SemiBold',
  },
});

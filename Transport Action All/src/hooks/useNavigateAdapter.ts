// ============================================================================
// NavigateAdapter — Wraps React Router navigate as old onNavigate callback
// Allows gradual migration from useState-based to router-based navigation
// ============================================================================

import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ScreenId } from '../types';
import { screenToRoute } from '../routes';

/**
 * Returns an onNavigate callback compatible with existing screen components.
 * Use this in App.tsx route wrappers to maintain backward compatibility.
 */
export function useNavigateAdapter() {
  const routerNavigate = useNavigate();

  const handleNavigate = useCallback((screen: ScreenId, _transition?: 'none' | 'slide_up' | 'push' | 'push_back') => {
    const route = screenToRoute[screen];
    if (route) {
      routerNavigate(route);
    }
  }, [routerNavigate]);

  return handleNavigate;
}

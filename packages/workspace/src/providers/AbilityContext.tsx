'use client';

/**
 * AbilityContext — React context for CASL AppAbility.
 *
 * Provides the current user's CASL ability instance to all workspace
 * components. Using context avoids prop-drilling through Dockview's
 * rendering pipeline (e.g., PanelTab cannot receive ability as a prop
 * via Dockview's IDockviewPanelHeaderProps API).
 *
 * Usage:
 *   // Provider (in WorkspaceShell):
 *   <AbilityProvider ability={resolvedAbility}>...</AbilityProvider>
 *
 *   // Consumer (in ModeSwitch, SidebarNav, etc.):
 *   const ability = useAbility();
 */

import React, { createContext, useContext } from 'react';
import { defineAbilitiesFor, type AppAbility } from '@vastu/shared/permissions';

/** No-permissions ability used as the default when no provider is present. */
function createNoOpAbility(): AppAbility {
  return defineAbilitiesFor({ roles: [] });
}

const AbilityContext = createContext<AppAbility>(createNoOpAbility());

export interface AbilityProviderProps {
  ability: AppAbility;
  children: React.ReactNode;
}

/** Provides the CASL ability instance to all descendant components. */
export function AbilityProvider({ ability, children }: AbilityProviderProps) {
  return <AbilityContext.Provider value={ability}>{children}</AbilityContext.Provider>;
}

/**
 * Returns the CASL ability for the current user.
 * Falls back to a no-permissions ability if used outside an AbilityProvider.
 */
export function useAbility(): AppAbility {
  return useContext(AbilityContext);
}

'use client';

/**
 * DockviewHost — wraps DockviewReact with Vastu's panel registry integration.
 *
 * Responsibilities:
 * - Registers all panel type components with Dockview
 * - Provides the custom PanelTab renderer for all tabs
 * - Shows WelcomePanel when no panels are open
 * - Wires Dockview lifecycle events to the panelStore
 * - Exposes the DockviewApi via the panelStore for external panel management
 *
 * Panel operations (open/close/focus) are initiated via panelStore actions.
 * Layout persistence is handled by usePanelPersistence hook.
 *
 * Floating panels get --v-shadow-md (applied via CSS overrides in DockviewHost.module.css).
 *
 * Dockview CSS is imported here (required for the library to function).
 */

import React, { useCallback, useMemo } from 'react';
import { DockviewReact } from 'dockview-react';
import type {
  DockviewReadyEvent,
  IDockviewPanelProps,
  IWatermarkPanelProps,
} from 'dockview-react';
import { getAllPanels } from '../../panels/registry';
import { WelcomePanel } from '../../panels/WelcomePanel';
import { usePanelStore } from '../../stores/panelStore';
import { usePanelPersistence } from '../../hooks/usePanelPersistence';
import { PanelTab } from './PanelTab';
import classes from './DockviewHost.module.css';

// Import Dockview's required stylesheet.
// This must be imported in the component that mounts DockviewReact.
import 'dockview-react/dist/styles/dockview.css';

/**
 * Watermark component — shown when Dockview has no panels.
 * Renders the WelcomePanel centered in the empty content area.
 */
function DockviewWatermark(_props: IWatermarkPanelProps) {
  return <WelcomePanel />;
}

/**
 * Wrapper component that maps Dockview's IDockviewPanelProps to each registered
 * panel component. We build a mapping dynamically from the registry.
 */
function createPanelWrapper(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- Dockview params are generic
  WrappedComponent: React.ComponentType<{ params: any }>,
): React.FunctionComponent<IDockviewPanelProps> {
  function PanelWrapper(props: IDockviewPanelProps): React.ReactElement {
    return <WrappedComponent params={props.params} />;
  }
  PanelWrapper.displayName = `PanelWrapper(${WrappedComponent.displayName ?? WrappedComponent.name ?? 'Unknown'})`;
  return PanelWrapper;
}

export function DockviewHost() {
  const setApi = usePanelStore((state) => state.setApi);
  const restoreLayout = usePanelStore((state) => state.restoreLayout);

  // Build the components map from the registered panel definitions.
  // Memoized so it doesn't regenerate on every render.
  const components = useMemo<Record<string, React.FunctionComponent<IDockviewPanelProps>>>(() => {
    const map: Record<string, React.FunctionComponent<IDockviewPanelProps>> = {};
    for (const definition of getAllPanels()) {
      map[definition.id] = createPanelWrapper(definition.component);
    }
    return map;
  }, []);

  // Custom tab component used for all panel types.
  // tabComponents is not needed when using defaultTabComponent for all panels.
  // We pass PanelTab directly as defaultTabComponent below.

  // Activate persistence hook — handles save/restore to localStorage
  usePanelPersistence();

  const onReady = useCallback(
    (event: DockviewReadyEvent) => {
      const api = event.api;
      // Expose the Dockview API to the store so other components can open panels
      setApi(api);
      // Restore persisted layout (if any)
      restoreLayout(api);
    },
    [setApi, restoreLayout],
  );

  return (
    <div className={classes.host}>
      <DockviewReact
        components={components}
        defaultTabComponent={PanelTab}
        watermarkComponent={DockviewWatermark}
        onReady={onReady}
        className={classes.host}
      />
    </div>
  );
}

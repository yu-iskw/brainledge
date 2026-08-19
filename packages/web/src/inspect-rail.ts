const INSPECT_RAIL_PANES = ['dossier', 'extract', 'facts', 'episodes'] as const;

export type InspectRailPane = (typeof INSPECT_RAIL_PANES)[number];

export function isInspectRailPane(value: string): value is InspectRailPane {
  return (INSPECT_RAIL_PANES as readonly string[]).includes(value);
}

export function adjacentInspectRailPane(current: InspectRailPane, delta: -1 | 1): InspectRailPane {
  switch (current) {
    case 'dossier': {
      return delta === 1 ? 'extract' : 'episodes';
    }
    case 'extract': {
      return delta === 1 ? 'facts' : 'dossier';
    }
    case 'facts': {
      return delta === 1 ? 'episodes' : 'extract';
    }
    case 'episodes': {
      return delta === 1 ? 'dossier' : 'facts';
    }
    default: {
      const exhaustive: never = current;
      return exhaustive;
    }
  }
}

export function activateInspectRail(pane: InspectRailPane): void {
  for (const candidate of INSPECT_RAIL_PANES) {
    const tab = document.getElementById(`rail-${candidate}`);
    const panel = document.getElementById(`rail-panel-${candidate}`);
    const selected = candidate === pane;
    if (tab instanceof HTMLButtonElement) {
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    }
    if (panel instanceof HTMLElement) {
      panel.hidden = !selected;
    }
  }
}

export function bindInspectRailTabs(onActivate?: (pane: InspectRailPane) => void): void {
  const tablist = document.getElementById('inspect-rail-tabs');
  if (!(tablist instanceof HTMLElement)) {
    return;
  }
  tablist.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const pane = target.dataset.rail;
    if (pane === undefined || !isInspectRailPane(pane)) {
      return;
    }
    activateInspectRail(pane);
    onActivate?.(pane);
  });
  tablist.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const current = target.dataset.rail;
    if (current === undefined || !isInspectRailPane(current)) {
      return;
    }
    let next: InspectRailPane | undefined;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown': {
        next = adjacentInspectRailPane(current, 1);
        break;
      }
      case 'ArrowLeft':
      case 'ArrowUp': {
        next = adjacentInspectRailPane(current, -1);
        break;
      }
      case 'Home': {
        next = 'dossier';
        break;
      }
      case 'End': {
        next = 'episodes';
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        activateInspectRail(current);
        onActivate?.(current);
        return;
      }
      default: {
        return;
      }
    }
    event.preventDefault();
    const nextTab = document.getElementById(`rail-${next}`);
    nextTab?.focus();
  });
}

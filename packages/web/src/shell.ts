import { modeHeading } from './display.js';

const WORKBENCH_MODES = ['capture', 'recall', 'inspect'] as const;

type WorkbenchMode = (typeof WORKBENCH_MODES)[number];

export function isWorkbenchMode(value: string): value is WorkbenchMode {
  return (WORKBENCH_MODES as readonly string[]).includes(value);
}

export function adjacentMode(current: WorkbenchMode, delta: -1 | 1): WorkbenchMode {
  switch (current) {
    case 'capture': {
      return delta === 1 ? 'recall' : 'inspect';
    }
    case 'recall': {
      return delta === 1 ? 'inspect' : 'capture';
    }
    case 'inspect': {
      return delta === 1 ? 'capture' : 'recall';
    }
    default: {
      const exhaustive: never = current;
      return exhaustive;
    }
  }
}

export function activateMode(mode: WorkbenchMode): void {
  const heading = document.getElementById('overview-heading');
  if (heading instanceof HTMLElement) {
    heading.textContent = modeHeading(mode);
  }
  for (const candidate of WORKBENCH_MODES) {
    const tab = document.getElementById(`tab-${candidate}`);
    const panel = document.getElementById(`panel-${candidate}`);
    const selected = candidate === mode;
    if (tab instanceof HTMLButtonElement) {
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    }
    if (panel instanceof HTMLElement) {
      panel.hidden = !selected;
    }
  }
}

export function bindWorkbenchTabs(onActivate?: (mode: WorkbenchMode) => void): void {
  const tablist = document.getElementById('workbench-tabs');
  if (!(tablist instanceof HTMLElement)) {
    return;
  }
  tablist.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const mode = target.dataset.mode;
    if (mode === undefined || !isWorkbenchMode(mode)) {
      return;
    }
    activateMode(mode);
    onActivate?.(mode);
  });
  tablist.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) {
      return;
    }
    const current = target.dataset.mode;
    if (current === undefined || !isWorkbenchMode(current)) {
      return;
    }
    let next: WorkbenchMode | undefined;
    switch (event.key) {
      case 'ArrowRight': {
        next = adjacentMode(current, 1);
        break;
      }
      case 'ArrowLeft': {
        next = adjacentMode(current, -1);
        break;
      }
      case 'Home': {
        next = 'capture';
        break;
      }
      case 'End': {
        next = 'inspect';
        break;
      }
      case 'Enter':
      case ' ': {
        event.preventDefault();
        activateMode(current);
        onActivate?.(current);
        return;
      }
      default: {
        return;
      }
    }
    event.preventDefault();
    const nextTab = document.getElementById(`tab-${next}`);
    nextTab?.focus();
  });
}

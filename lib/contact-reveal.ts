export type ContactRevealState = {
  expanded: ReadonlySet<string>;
  dismissed: ReadonlySet<string>;
};
type ContactRevealAction = { type: 'reveal' | 'toggle'; id: string };

export function createContactRevealState(): ContactRevealState {
  return { expanded: new Set(), dismissed: new Set() };
}

export function contactRevealReducer(state: ContactRevealState, action: ContactRevealAction): ContactRevealState {
  if (!action.id) return state;
  if (action.type === 'reveal') {
    if (state.expanded.has(action.id) || state.dismissed.has(action.id)) return state;
    return { ...state, expanded: new Set(state.expanded).add(action.id) };
  }
  const expanded = new Set(state.expanded);
  const dismissed = new Set(state.dismissed);
  if (expanded.has(action.id)) {
    expanded.delete(action.id);
    dismissed.add(action.id);
  } else {
    expanded.add(action.id);
    dismissed.delete(action.id);
  }
  return { expanded, dismissed };
}

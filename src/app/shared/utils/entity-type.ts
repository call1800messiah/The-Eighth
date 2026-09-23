const ENTITY_TYPE_MAP: Record<string, string> = {
  people: 'person',
  places: 'place',
  quests: 'quest',
  projects: 'project',
  achievements: 'achievement',
  inventory: 'inventory',
  notes: 'note',
  rolls: 'roll',
  flows: 'flow',
  timelines: 'timeline',
  historic_events: 'historic_event',
  info_boxes: 'info_box',
};

export function getEntityType(collection: string): string {
  return ENTITY_TYPE_MAP[collection] || collection;
}

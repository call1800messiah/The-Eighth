-- Enable Supabase Realtime for all tables watched by RealtimeService.
--
-- Without this, postgres_changes events never fire and the realtime
-- subscriptions in the Angular app do nothing — changes only appear
-- after a full page reload.

ALTER PUBLICATION supabase_realtime ADD TABLE
  users,
  user_roles,
  document_access,
  people,
  places,
  quests,
  projects,
  project_milestones,
  project_requirements,
  achievements,
  inventory,
  notes,
  rolls,
  flows,
  flow_items,
  rules,
  info_boxes,
  timelines,
  historic_events,
  campaign,
  combat_sessions,
  combatants,
  combatant_attributes,
  combatant_states;

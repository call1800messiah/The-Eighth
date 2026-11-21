export interface EditTagsProps {
  tags: string[];
  /**
   * Persists the edited list and resolves to whether that worked. Supplied by
   * the owning feature, because tags live in a per-entity junction table
   * (e.g. `person_tags`) rather than a column the shared editor could write.
   */
  save: (tags: string[]) => Promise<boolean>;
}

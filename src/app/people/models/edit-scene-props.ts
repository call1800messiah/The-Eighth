import type { Scene } from './scene';

export interface EditSceneProps {
  /** Set when editing; omitted when creating */
  scene?: Scene;
  /** Preselected person when creating from a person page */
  personId?: string;
}

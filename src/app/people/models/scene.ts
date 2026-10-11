export interface Scene {
  id: string;
  /** Public URL of the image */
  image: string;
  caption: string;
  owner: string;
  /** Ids of the people tagged in the scene */
  people: string[];
}

export interface Scene {
  id: string;
  /** Rendered URL of the image, large size */
  image: string;
  /** Rendered URL of the image, thumb size, for the grid */
  imageThumb: string;
  caption: string;
  owner: string;
  /** Ids of the people tagged in the scene */
  people: string[];
}

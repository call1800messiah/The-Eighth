export interface Scene {
  id: string;
  /**
   * URL of the stored file, for the "open image" link: a link has no
   * fallback, and older scenes may be too large to render.
   */
  image: string;
  /** Rendered URL of the image, thumb size, for the grid */
  imageThumb: string;
  caption: string;
  owner: string;
  /** Ids of the people tagged in the scene */
  people: string[];
}

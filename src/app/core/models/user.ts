export interface User {
  id: string;
  isGM: boolean;
  /** An agent such as Claude (role `assistant`): never a sharing target. */
  isAssistant?: boolean;
  name: string;
  viewBanner: boolean;
  viewName: boolean;
  viewTitle: boolean;
}

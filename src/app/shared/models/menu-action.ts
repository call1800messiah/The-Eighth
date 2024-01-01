export interface MenuAction {
  label: string;
  action: () => void;
  restricted?: boolean;
}

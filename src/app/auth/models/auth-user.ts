import type { User } from '../../core/models/user';

export interface AuthUser extends User {
  id: string;
  email: string;
}

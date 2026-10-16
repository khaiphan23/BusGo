import type { User } from '@supabase/supabase-js';

export interface AuthUser {
  id: string;
  email?: string;
  fullName?: string;
  avatarUrl?: string;
}

export function toAuthUser(user: User | null): AuthUser | null {
  if (!user) {
    return null;
  }

  const metadata = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? undefined,
    fullName: typeof metadata.full_name === 'string' ? metadata.full_name : undefined,
    avatarUrl: typeof metadata.avatar_url === 'string' ? metadata.avatar_url : undefined,
  };
}

import { cookies } from 'next/headers';
import { UserProfile, UserRole } from './types';
import { DatabaseService } from './db';

const SESSION_COOKIE_NAME = 'repair_session_token';

interface SystemAccount {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  passwords: string[];
  aliases: string[];
}

const SYSTEM_ACCOUNTS: SystemAccount[] = [
  {
    id: 'f2ccc007-2a4b-47f0-a540-ae3a4201b832',
    email: 'sangeet@repairtrack.com',
    full_name: 'SANGEET SHAW',
    role: 'admin',
    passwords: ['Ank933967@', 'admin123'],
    aliases: ['sangeet shaw', 'sangeet', 'admin1', 'admin1@repairtrack.com', 'sangeet@repairtrack.com'],
  },
  {
    id: 'ebbb9cc0-ed0f-4717-bda2-756a9d7d4558',
    email: 'ayush@repairtrack.com',
    full_name: 'AYUSH GUPTA',
    role: 'admin',
    passwords: ['Ank933967@', 'admin123'],
    aliases: ['ayush gupta', 'ayush', 'admin2', 'admin2@repairtrack.com', 'ayush@repairtrack.com'],
  },
  {
    id: 'b9f09921-454b-4706-8c04-e9d0b50379c8',
    email: 'ankit@repairtrack.com',
    full_name: 'ANKIT GUPTA',
    role: 'admin',
    passwords: ['Ank933967@', 'admin123'],
    aliases: ['ankit gupta', 'ankit', 'admin3', 'admin3@repairtrack.com', 'ankit@repairtrack.com'],
  },
  {
    id: '562b298c-7f9f-42bc-bda8-91177bdce61d',
    email: 'rohan@repairtrack.com',
    full_name: 'ROHAN',
    role: 'technician',
    passwords: ['9330929105', 'tech123'],
    aliases: ['rohan', 'technician', '9330929105', 'rohan@repairtrack.com', 'technician@repairtrack.com'],
  },
];

export class AuthService {
  /**
   * Validate credentials by email, name, or phone number/ID
   */
  static async verifyCredentials(identifier: string, password: string): Promise<UserProfile | null> {
    const rawId = identifier.trim().toLowerCase();
    const cleanPass = password.trim();

    const account = SYSTEM_ACCOUNTS.find(
      (acc) =>
        acc.email.toLowerCase() === rawId ||
        acc.full_name.toLowerCase() === rawId ||
        acc.aliases.some((a) => a.toLowerCase() === rawId)
    );

    if (!account) {
      return null;
    }

    if (!account.passwords.includes(cleanPass)) {
      return null;
    }

    // Try to fetch latest live profile from database or return system profile
    const profile = await DatabaseService.getProfileById(account.id);
    if (profile) return profile;

    return {
      id: account.id,
      email: account.email,
      full_name: account.full_name,
      role: account.role,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Create an encoded token string from a profile
   */
  static createToken(profile: UserProfile): string {
    const sessionPayload = JSON.stringify({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name,
      created_at: profile.created_at,
    });
    return Buffer.from(sessionPayload).toString('base64');
  }

  /**
   * Set user session in cookies
   */
  static async setSessionCookie(profile: UserProfile): Promise<void> {
    const cookieStore = await cookies();
    const encoded = this.createToken(profile);

    cookieStore.set(SESSION_COOKIE_NAME, encoded, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  }

  /**
   * Clear session cookie
   */
  static async clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  /**
   * Get current authenticated user (supports cookies, query token, and Authorization header)
   */
  static async getCurrentUser(req?: Request): Promise<UserProfile | null> {
    try {
      let rawToken: string | undefined;

      // 1. Check Request query parameter or header if provided
      if (req) {
        try {
          const url = new URL(req.url);
          rawToken = url.searchParams.get('token') || url.searchParams.get('auth') || undefined;
        } catch {
          // ignore url parse error
        }

        if (!rawToken) {
          const authHeader = req.headers.get('Authorization');
          if (authHeader && authHeader.startsWith('Bearer ')) {
            rawToken = authHeader.substring(7).trim();
          }
        }

        if (!rawToken) {
          const cookieHeader = req.headers.get('cookie');
          if (cookieHeader) {
            const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE_NAME}=([^;]+)`));
            if (match) {
              rawToken = decodeURIComponent(match[1]);
            }
          }
        }
      }

      // 2. Check Next.js cookie store
      if (!rawToken) {
        try {
          const cookieStore = await cookies();
          rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
        } catch {
          // outside request context
        }
      }

      if (!rawToken) return null;

      // 3. Try decoding base64 session payload
      try {
        const decoded = Buffer.from(rawToken, 'base64').toString('utf8');
        const parsed = JSON.parse(decoded) as UserProfile;
        if (parsed && parsed.id && parsed.role) {
          const profile = await DatabaseService.getProfileById(parsed.id);
          return profile || parsed;
        }
      } catch {
        // Not a JSON base64 token, continue to fallback checks
      }

      // 4. Fallback: Check if token matches a system password or admin ID
      const systemAccount = SYSTEM_ACCOUNTS.find(
        (a) => a.id === rawToken || a.passwords.includes(rawToken) || a.email.toLowerCase() === rawToken?.toLowerCase()
      );
      if (systemAccount) {
        return {
          id: systemAccount.id,
          email: systemAccount.email,
          full_name: systemAccount.full_name,
          role: systemAccount.role,
          created_at: new Date().toISOString(),
        };
      }

      return null;
    } catch {
      return null;
    }
  }

  /**
   * Guard for API routes requiring authenticated user
   */
  static async requireUser(req?: Request): Promise<UserProfile> {
    const user = await this.getCurrentUser(req);
    if (!user) {
      throw new Error('Unauthorized: Authentication required');
    }
    return user;
  }

  /**
   * Guard for API routes requiring specific role
   */
  static async requireRole(role: UserRole, req?: Request): Promise<UserProfile> {
    const user = await this.requireUser(req);
    if (user.role !== role) {
      throw new Error(`Forbidden: Access restricted to ${role}s`);
    }
    return user;
  }
}


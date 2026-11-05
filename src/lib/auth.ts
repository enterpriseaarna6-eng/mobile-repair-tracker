import { cookies } from 'next/headers';
import { UserProfile, UserRole } from './types';
import { DatabaseService } from './db';

const SESSION_COOKIE_NAME = 'repair_session_token';

// Preset credentials for the 4 accounts
const ACCOUNT_PASSWORDS: Record<string, string> = {
  'admin1@repairtrack.com': 'admin123',
  'admin2@repairtrack.com': 'admin123',
  'admin3@repairtrack.com': 'admin123',
  'technician@repairtrack.com': 'tech123',
};

export class AuthService {
  /**
   * Validate credentials and return user profile
   */
  static async verifyCredentials(email: string, password: string): Promise<UserProfile | null> {
    const normalizedEmail = email.toLowerCase().trim();
    const expectedPassword = ACCOUNT_PASSWORDS[normalizedEmail];

    if (!expectedPassword || expectedPassword !== password) {
      return null;
    }

    const profile = await DatabaseService.getProfileByEmail(normalizedEmail);
    return profile;
  }

  /**
   * Set user session in cookies
   */
  static async setSessionCookie(profile: UserProfile): Promise<void> {
    const cookieStore = await cookies();
    const sessionPayload = JSON.stringify({
      id: profile.id,
      email: profile.email,
      role: profile.role,
      full_name: profile.full_name,
      created_at: profile.created_at,
    });

    const encoded = Buffer.from(sessionPayload).toString('base64');

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
   * Get current authenticated user
   */
  static async getCurrentUser(): Promise<UserProfile | null> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      if (!token) return null;

      const decoded = Buffer.from(token, 'base64').toString('utf8');
      const parsed = JSON.parse(decoded) as UserProfile;

      // Verify that user still exists in database
      const profile = await DatabaseService.getProfileById(parsed.id);
      return profile || parsed;
    } catch {
      return null;
    }
  }

  /**
   * Guard for API routes requiring authenticated user
   */
  static async requireUser(): Promise<UserProfile> {
    const user = await this.getCurrentUser();
    if (!user) {
      throw new Error('Unauthorized: Authentication required');
    }
    return user;
  }

  /**
   * Guard for API routes requiring specific role
   */
  static async requireRole(role: UserRole): Promise<UserProfile> {
    const user = await this.requireUser();
    if (user.role !== role) {
      throw new Error(`Forbidden: Access restricted to ${role}s`);
    }
    return user;
  }
}


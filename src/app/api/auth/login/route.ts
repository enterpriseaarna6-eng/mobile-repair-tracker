import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const profile = await AuthService.verifyCredentials(email, password);
    if (!profile) {
      return NextResponse.json(
        { error: 'Invalid credentials. Only the 4 authorized accounts may access the system.' },
        { status: 401 }
      );
    }

    await AuthService.setSessionCookie(profile);

    return NextResponse.json({
      success: true,
      user: profile,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


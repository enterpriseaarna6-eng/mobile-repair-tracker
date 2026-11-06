import { NextResponse } from 'next/server';
import { AuthService } from '@/lib/auth';

export async function GET(req: Request) {
  const user = await AuthService.getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ user: null, token: null });
  }
  const token = AuthService.createToken(user);
  return NextResponse.json({ user, token });
}


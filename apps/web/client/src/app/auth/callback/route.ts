import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { api } from '~/trpc/server';
import { Routes } from '@/utils/constants';
import { trackEvent } from '@/utils/analytics/server';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');

    if (!code) {
      console.error("Missing code in callback");
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error || !data?.user) {
      console.error("Error exchanging code:", error);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    const user = await api.user.upsert({ id: data.user.id });

    if (!user) {
      console.error(`Failed to upsert user: ${data.user.id}`);
      return NextResponse.redirect(`${origin}/auth/auth-code-error`);
    }

    const redirectUrl = process.env.NEXT_PUBLIC_URL || origin;
    const finalUrl = `${redirectUrl}${Routes.AUTH_REDIRECT || '/dashboard'}`;

    console.log("Redirecting user to:", finalUrl);
    return NextResponse.redirect(finalUrl);

  } catch (err) {
    console.error("Callback failed:", err);
    return NextResponse.redirect(`/auth/auth-code-error`);
  }
}

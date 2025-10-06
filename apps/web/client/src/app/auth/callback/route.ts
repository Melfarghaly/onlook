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

    // Safe tracking
    try {
      await trackEvent({
        distinctId: data.user.id,
        event: 'user_signed_in',
        properties: {
          name: data.user.user_metadata?.name,
          email: data.user.email,
          avatar_url: data.user.user_metadata?.avatar_url,
          $set_once: { signup_date: new Date().toISOString() }
        }
      });
    } catch (err) {
      console.error("TrackEvent failed:", err);
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

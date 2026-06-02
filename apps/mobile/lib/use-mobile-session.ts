import { useEffect, useState } from "react";
import { useRouter, type Href } from "expo-router";
import { supabase } from "@/lib/supabase";

export function useRequireMobileSession(redirectHref: Href = "/account"): boolean {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    let mounted = true;

    void supabase.auth.getSession().then((response) => {
      if (!mounted) return;
      const authenticated = Boolean(response.data.session?.user);
      setIsAuthed(authenticated);
      setReady(true);
      if (!authenticated) {
        router.replace(redirectHref);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      const authenticated = Boolean(session?.user);
      setIsAuthed(authenticated);
      setReady(true);
      if (!authenticated) {
        router.replace(redirectHref);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [redirectHref, router]);

  return ready && isAuthed;
}

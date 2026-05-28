'use client';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useStore } from '@/lib/store';

export default function SignOutButton() {
  const router = useRouter();
  const reset = useStore((s) => s.reset);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    reset();
    router.push('/login');
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded border border-zinc-300 px-2 py-0.5 text-xs text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
    >
      Sign out
    </button>
  );
}

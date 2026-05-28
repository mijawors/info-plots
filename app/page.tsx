import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import MapView from '@/components/MapView';
import DetailsPane from '@/components/DetailsPane';
import AppBootstrap from '@/components/AppBootstrap';
import SignOutButton from '@/components/SignOutButton';

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <>
      <AppBootstrap />
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950">
        <span className="font-semibold">info-plots</span>
        <div className="flex items-center gap-3">
          <span className="text-zinc-500">{user.email}</span>
          <SignOutButton />
        </div>
      </header>
      <div className="flex flex-1 flex-col sm:flex-row">
        <div className="relative flex-1 min-h-[60vh] sm:min-h-0">
          <MapView />
        </div>
        <DetailsPane />
      </div>
    </>
  );
}

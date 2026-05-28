'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

type Mode = 'signin' | 'signup';
type Status = 'idle' | 'submitting' | 'confirm' | 'error';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus('submitting');
    setErrorMsg('');
    const supabase = createClient();

    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
    } else {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        setStatus('error');
        setErrorMsg(error.message);
        return;
      }
      // When "Confirm email" is enabled in Supabase, signUp returns no session
      // — the user must click a link in their inbox first.
      if (!data.session) {
        setStatus('confirm');
        return;
      }
    }

    router.push('/');
    router.refresh();
  }

  function switchMode(next: Mode) {
    setMode(next);
    setStatus('idle');
    setErrorMsg('');
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-3 rounded border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <h1 className="text-lg font-semibold">
          {mode === 'signin' ? 'Sign in' : 'Create account'}
        </h1>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputCls}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete={
              mode === 'signin' ? 'current-password' : 'new-password'
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputCls}
          />
        </label>

        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {status === 'submitting'
            ? mode === 'signin'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'signin'
              ? 'Sign in'
              : 'Sign up'}
        </button>

        {status === 'confirm' && (
          <p className="text-sm text-green-600">
            Check your inbox to confirm your email, then sign in.
          </p>
        )}
        {status === 'error' && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}

        <p className="pt-2 text-center text-xs text-zinc-500">
          {mode === 'signin' ? (
            <>
              No account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Create one
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="font-medium text-zinc-700 underline hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-zinc-100"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </form>
    </div>
  );
}

const inputCls =
  'w-full rounded border border-zinc-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900';

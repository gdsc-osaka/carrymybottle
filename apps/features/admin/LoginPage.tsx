'use client';

import { useActionState } from 'react';
import { Droplet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { loginAction } from './actions';

export function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await loginAction(formData);
      if (!result.success) return { error: result.error };
      return null;
    },
    null
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm space-y-6 rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="space-y-2">
          <span className="flex size-11 items-center justify-center rounded-full bg-teal-50">
            <Droplet className="size-6 fill-teal-600 text-teal-600" />
          </span>
          <h1 className="text-2xl font-semibold text-slate-900">
            管理者ログイン
          </h1>
          <p className="text-sm text-slate-500">キャリボト管理者専用</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
            />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button
            type="submit"
            className="w-full bg-teal-600 text-white hover:bg-teal-700"
            disabled={pending}
          >
            {pending ? '確認中...' : 'ログイン'}
          </Button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "./actions";

export function LoginPage() {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const result = await loginAction(formData);
      if (!result.success) return { error: result.error };
      return null;
    },
    null,
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40">
      <div className="w-full max-w-sm space-y-6 p-8 bg-background rounded-lg border shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold">管理者ログイン</h1>
          <p className="text-sm text-muted-foreground">キャリボト管理者専用</p>
        </div>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">パスワード</Label>
            <Input id="password" name="password" type="password" autoComplete="current-password" />
          </div>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "確認中..." : "ログイン"}
          </Button>
        </form>
      </div>
    </div>
  );
}

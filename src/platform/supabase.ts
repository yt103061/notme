// Supabase クライアント（遅延ロード）。
// 環境変数（VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY）が設定されている時だけ、
// 必要になった時点で supabase-js を動的 import する（初期バンドルを軽く保つ）。
// 未設定なら常に null を返し、wallet.ts が localStorage フォールバックで動作する。

import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let clientPromise: Promise<SupabaseClient | null> | null = null;

export function getSupabaseClient(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) =>
      createClient(url!, anonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          // 匿名ユーザーのセッションを端末に保持し、再訪時に同じアカウントへ復帰する
          storageKey: 'notme_auth',
        },
      }),
    );
  }
  return clientPromise;
}

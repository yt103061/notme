# not me（ノットミー）

自分のカード、1枚だけ見えないポーカー。

インディアンポーカーの要素を組み込んだ、カジュアルなテキサスホールデム風カードゲームです。手札2枚と場札2枚は自分にも見えますが、切り札「not me」1枚だけは自分から見えません。相手には見えているので、相手の反応から自分の本当の強さを逆算する読み合いが生まれます。役は5枚から自由に選んだ4枚で作ります（4枚勝負なのでスリーカードがフラッシュより強い、など序列に独自のひねりがあります）。

詳しいルールと商業展開の設計は [docs/design.md](docs/design.md) を参照してください。

## 遊び方

1. 依存関係をインストール：`npm install`
2. 開発サーバーを起動：`npm run dev`
3. ブラウザで表示された URL を開く

vs AI 3人（強気・堅実・トリッキーの3人格）と対戦する、1ゲーム4ハンド・約5分のカジュアルゲームです。スマホ縦持ちでの利用を想定しています。

## スクリプト

- `npm run dev` — 開発サーバー起動
- `npm run build` — 型チェック＋本番ビルド（`dist/` に出力）
- `npm run preview` — ビルド済みアプリをローカルでプレビュー
- `npm test` — Vitest によるユニットテスト（役判定・進行・得点・AI判断）

## プロジェクト構成

```
src/
├── engine/       # UI から独立した純 TypeScript のゲームロジック（カード・役判定・進行・AI）
├── components/   # React UI コンポーネント
├── platform/     # チップウォレット（Supabase 同期＋localStorage フォールバック）・Supabase クライアント／広告・計測の抽象（広告・計測は no-op）
├── audio/        # WebAudio による軽量効果音
└── strings.ts    # UI 文言（日本語）
supabase/migrations/  # DB スキーマ（profiles テーブル・RLS・自動作成トリガー）
docs/design.md        # ルール裁定・マネタイズ・プラットフォーム戦略
```

`src/engine/` は UI から完全に分離されており、Phase 2 で計画しているサーバー権威型のオンライン対戦（not me をクライアントに送らない構造）にそのまま移植できる設計にしています。

## バックエンド（Supabase・任意）

アカウント・サーバー管理のチップ残高・プロフィールは Supabase（認証＋Postgres）で提供します。**環境変数が未設定なら localStorage のみで完全に動作する**ため、バックエンドなしでもそのまま遊べます。

有効化する場合：

1. Supabase プロジェクトを作成し、`supabase/migrations/` の SQL を適用（`profiles` テーブル・RLS・自動作成トリガー）
2. Authentication → Sign In / Providers で **Anonymous を有効化**（ゼロ摩擦の匿名アカウント）
3. `.env`（`.env.example` 参照）に `VITE_SUPABASE_URL` と `VITE_SUPABASE_ANON_KEY`（公開鍵）を設定。デプロイ先（Vercel 等）にも同じ環境変数を設定する

## デプロイ

Vite の静的ビルド（PWA 対応）なので、`dist/` を任意の静的ホスティングにデプロイできます。

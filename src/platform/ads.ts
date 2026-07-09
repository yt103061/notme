// 広告の薄い抽象インターフェース。Phase 1 では広告 SDK を組み込まず no-op。
// マネタイズ実装時は、この2関数の中身をリワード広告/インタースティシャル SDK 呼び出しに差し替える。
// 呼び出し側（App.tsx）は変更不要な設計にしている。

export const ads = {
  /** ゲーム終了時などに表示するインタースティシャル。頻度は呼び出し側で制御する。 */
  async showInterstitial(): Promise<void> {
    return Promise.resolve();
  },

  /** リワード広告。視聴完了で true を返す想定のインターフェース。 */
  async showRewarded(): Promise<boolean> {
    return Promise.resolve(true);
  },
};

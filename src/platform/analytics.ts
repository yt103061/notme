// 計測用の薄い抽象インターフェース。Phase 1 は no-op（コンソール出力のみ）。
// Phase 2/3 で実 SDK（GA4 / Amplitude 等）に差し替える際、この関数群の中身だけを変更すればよい。

export type AnalyticsEvent =
  | 'home_start_ai'
  | 'home_start_online_room'
  | 'home_start_random_match'
  | 'matchmaking_start'
  | 'matchmaking_success'
  | 'matchmaking_cancel'
  | 'game_start'
  | 'hand_start'
  | 'fold'
  | 'stay'
  | 'bet'
  | 'exchange_deck'
  | 'exchange_steal'
  | 'exchange_pass'
  | 'showdown'
  | 'game_end'
  | 'share_clicked';

export const analytics = {
  track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[analytics]', event, props ?? {});
    }
  },
};

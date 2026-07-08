// UI 文言はここに集約（将来の多言語化に備える）。

export const APP_NAME = 'not me';
export const APP_SUBTITLE = 'ノットミー';
export const HOOK_LINE = '自分のカード、1枚だけ見えないポーカー。';

export const TITLE_START = 'はじめる';
export const TITLE_RULES_BLURB =
  '手札2枚と場札2枚は見える。でも「not me」1枚だけは自分に見えない。相手の反応から、自分の本当の強さを読め。';

// --- チップウォレット ---
export const CHIP_ICON = '🪙';
export const CHIP_BALANCE_LABEL = (n: number) => `${CHIP_ICON} ${n.toLocaleString()}`;
export const BUY_IN_LABEL = (n: number) => `参加費 ${n}${CHIP_ICON}`;
export const INSUFFICIENT_CHIPS_TITLE = 'チップが足りません';
export const INSUFFICIENT_CHIPS_BODY = 'デイリーボーナスを受け取るか、明日また挑戦しよう。';
export const DAILY_BONUS_BUTTON = 'デイリーボーナス';
export const DAILY_BONUS_CLAIMED_TITLE = 'デイリーボーナス！';
export const DAILY_BONUS_CLAIMED_BODY = (amount: number, streak: number) =>
  `+${amount}${CHIP_ICON} 獲得（${streak}日連続）`;
export const DAILY_BONUS_ALREADY_CLAIMED = '本日は受け取り済み';
export const RESULT_CHIP_DELTA = (delta: number) => `${delta >= 0 ? '+' : ''}${delta}${CHIP_ICON}`;
export const RESULT_NEW_BALANCE = (n: number) => `残高 ${CHIP_BALANCE_LABEL(n)}`;
export const HELP_CHIPS_SECTION = 'チップ';
export const HELP_CHIPS_LINES = [
  'ゲーム開始には参加費がかかる。最終スコアに応じてチップが増減する（1点＝50チップ換算）。',
  '1日1回、デイリーボーナスでチップを受け取れる。連続で受け取るほどボーナス額が増える。',
];

export const TUTORIAL_STEPS: { title: string; body: string }[] = [
  {
    title: '① 自分の1枚だけ見えない',
    body: '5枚で役を作る。手札2枚と場札2枚は自分にも見えるが、「not me」1枚だけは自分から見えない。',
  },
  {
    title: '② 相手のは見えている',
    body: '相手のnot meはあなたに見えている。逆にあなたのnot meは相手全員に見えている。',
  },
  {
    title: '③ 残るか、降りるか',
    body: '相手の反応や行動から、自分のnot meがどれくらい強いか逆算しよう。勝てば+2点、負けたら-1点、降りれば0点。',
  },
];
export const TUTORIAL_NEXT = 'つぎへ';
export const TUTORIAL_START = 'ゲームを始める';
export const TUTORIAL_SKIP = 'スキップ';

export const HAND_LABEL = (n: number, total: number) => `ハンド ${n} / ${total}`;
export const SUDDEN_DEATH_BADGE = 'サドンデス';

export const ACTION_STAY = '残る';
export const ACTION_FOLD = '降りる';
export const ACTION_EXCHANGE_DECK = '山札と交換';
export const ACTION_EXCHANGE_STEAL = 'not meを奪う';
export const ACTION_EXCHANGE_PASS = '交換しない';
export const ACTION_BACK = 'もどる';
export const PICK_STEAL_TARGET = '誰から奪う？';

export const YOUR_TURN_DECIDE = 'あなたの番：残る？降りる？';
export const YOUR_TURN_EXCHANGE = 'あなたの番：not meを交換する？';
export const WAITING_FOR_OTHERS = '相手の様子を見ている…';

export const SHOWDOWN_TITLE = 'ショーダウン！';
export const YOUR_NOT_ME_REVEAL = 'あなたのnot me、正体は…';
export const WALKOVER_PEEK = 'ちなみに、あなたのnot meは…';
export const CONTINUE_NEXT_HAND = '次のハンドへ';
export const SEE_RESULT = '結果を見る';

export const BADGE_STAY = '残る！';
export const BADGE_FOLD = '降りる…';
export const DECISION_REVEAL_BANNER = 'せーの！';
export const YOU_WIN_STAMP = 'WIN!';
export const YOU_LOSE_STAMP = 'まけ…';
export const DRAW_STAMP = '引き分け';

export const RESULT_TITLE = 'ゲーム結果';
export const RESULT_WINNER = (name: string) => `${name} の勝利！`;
export const RESULT_DRAW = '引き分け！';
export const PLAY_AGAIN = 'もう一度あそぶ';
export const SHARE_BUTTON = '結果をシェア';
export const SHARE_TEXT = (score: number) =>
  `『not me』で${score}点でした！自分のカード、1枚だけ見えないポーカー、あなたも読み合ってみて。`;

// HandCategory の並び順と対応させる（enum の数値インデックス通り）
export const CATEGORY_LABELS = [
  'ハイカード',
  '3枚ストレート',
  '3枚フラッシュ',
  '4枚ストレート',
  '3枚ストレートフラッシュ',
  '4枚フラッシュ',
  '4枚ストレートフラッシュ',
  'ワンペア',
  'ツーペア',
  'スリーカード',
  'ストレート',
  'フラッシュ',
  'フルハウス',
  'フォーカード',
  'ストレートフラッシュ',
];
export const HIDDEN_HAND_NOTE = 'お宝役：ハイカードの中に隠れた3〜4枚の役を発見した特別な結果';

export const MUTE_ON = '音を消す';
export const MUTE_OFF = '音を出す';

export const HELP_BUTTON_LABEL = '役とルールを確認';
export const HELP_TITLE = '役とルール';
export const HELP_HANDS_SECTION = '役の強さ（上ほど強い）';
export const HELP_ROYAL_NOTE = '※ 同スートの A-K-Q-J-10 はロイヤルストレートフラッシュ（最強）';
export const HELP_RULES_SECTION = 'ルール早見';
export const HELP_RULE_LINES = [
  '5枚（手札2＋not me 1＋場札2）の中から、組める役の中で一番強いものが採用される（テキサスホールデム方式）。',
  '5枚全体がハイカードの時だけ、隠れた3〜4枚のストレート／フラッシュがないか自動で探し、あればそれが「お宝役」として採用される。',
  '「not me」は自分だけ見えない。相手のnot meはあなたに見えている。',
  '配札時、自分のnot meについてのヒントが1つ必ずもらえる（偶数/奇数、7以上/以下など）。',
  '相手の反応と行動、そしてヒントから、自分のnot meの強さを逆算しよう。',
  '流れ：配札（場札1枚目公開）→ ①残る/降りる → 交換（山札交換/奪う/パス を1回まで）→ 場札2枚目公開 → ②残る/降りる → ショーダウン。',
  '「奪う」は相手のnot meを一方的に奪う。奪われた側は山札から新しいnot me＋ヒントを補充、奪った側は手札1枚がランダムで山札と交換される（見ずに引き替え）。',
  '同じハンドでお互いに奪い合った場合（A→Bの後にB→A）は、そのまま単純にnot meを交換する形で決着する。',
];
export const HELP_SCORING_SECTION = '得点';
export const HELP_SCORE_ROWS: [string, string][] = [
  ['ショーダウンで勝ち', '+2点'],
  ['引き分け（完全同値）', '+1点'],
  ['不戦勝（全員降りた）', '+1点'],
  ['残って負け', '-1点'],
  ['降りる', '0点'],
];
export const HELP_SOUND_SECTION = '設定';
export const HELP_SOUND_LABEL = '効果音';
export const HELP_CLOSE = '閉じる';

// --- 交換フェーズの事件演出（ExchangeEvent） ---
// 通常時：一方的な略奪（デフォルト仕様）
export const EVENT_STEAL_TITLE = '強奪！';
export const EVENT_STEAL_FROM_YOU = (actor: string) => `${actor}が、あなたのnot meを奪った！`;
export const EVENT_STEAL_LINE = (actor: string, target: string) => `${actor}が${target}のnot meを奪った！`;
export const EVENT_HINT_GAINED = 'ヒント獲得';
export const EVENT_PENALTY_LABEL = 'ペナルティ：手札の1枚が山札と交換された';
export const EVENT_MYSTERY_NOTE = '（自分のnot meはまだ見えない）';
// 特殊時：お互い奪い合い（A→B の後の B→A）は相殺してただの交換になる
export const EVENT_RECIPROCAL_TITLE = 'おたがい様！';
export const EVENT_RECIPROCAL_FROM_YOU = (actor: string) => `${actor}と、not meが入れ替わった！`;
export const EVENT_RECIPROCAL_LINE_YOU = (target: string) => `${target}と、not meが入れ替わった！`;
export const EVENT_RECIPROCAL_LINE = (actor: string, target: string) =>
  `${actor}と${target}のnot meが入れ替わった（お互い様）`;
export const EVENT_YOUR_OLD_CARD = 'あなたの元のnot me、正体は…';
export const EVENT_SWAP_TITLE = '山札交換';
export const EVENT_SWAP_LINE = (actor: string) => `${actor}が山札とnot meを交換した`;
export const EVENT_SWAP_LINE_YOU = 'あなたは山札とnot meを交換した（中身は見えないまま）';

export const FOLD_LOG = (name: string) => `${name}が降りた`;
export const EXCHANGE_PASS_LOG = (name: string) => `${name}は交換しなかった`;
export const EXCHANGE_DECK_LOG = (name: string) => `${name}が山札とnot meを交換した`;
export const EXCHANGE_STEAL_LOG = (actor: string, target: string) =>
  `${actor}が${target}のnot meを奪った`;
export const RECIPROCAL_STEAL_LOG = (actor: string, target: string) =>
  `${actor}と${target}のnot meが入れ替わった`;
export const WALKOVER_LOG = (name: string) => `${name}の不戦勝！`;
export const MUTUAL_FOLD_LOG = '全員降りて流局';

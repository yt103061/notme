// UI 文言はここに集約（将来の多言語化に備える）。

export const APP_NAME = 'not me';
export const APP_SUBTITLE = 'ノットミー';
export const HOOK_LINE = '自分のカード、1枚だけ見えないポーカー。';

export const TITLE_START = 'はじめる';
export const TITLE_RULES_BLURB =
  '手札2枚と場札2枚は見える。でも「not me」1枚だけは自分に見えない。相手の反応から、自分の本当の強さを読め。';

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

export const SHOWDOWN_TITLE = 'ショーダウン';
export const YOUR_NOT_ME_REVEAL = 'あなたのnot me、正体は…';
export const CONTINUE_NEXT_HAND = '次のハンドへ';
export const SEE_RESULT = '結果を見る';

export const RESULT_TITLE = 'ゲーム結果';
export const RESULT_WINNER = (name: string) => `${name} の勝利！`;
export const RESULT_DRAW = '引き分け！';
export const PLAY_AGAIN = 'もう一度あそぶ';
export const SHARE_BUTTON = '結果をシェア';
export const SHARE_TEXT = (score: number) =>
  `『not me』で${score}点でした！自分のカード、1枚だけ見えないポーカー、あなたも読み合ってみて。`;

export const CATEGORY_LABELS = [
  'ハイカード',
  'ワンペア',
  'ツーペア',
  'スリーカード',
  'ストレート',
  'フラッシュ',
  'フルハウス',
  'フォーカード',
  'ストレートフラッシュ',
];

export const MUTE_ON = '音を消す';
export const MUTE_OFF = '音を出す';

export const FOLD_LOG = (name: string) => `${name}が降りた`;
export const EXCHANGE_PASS_LOG = (name: string) => `${name}は交換しなかった`;
export const EXCHANGE_DECK_LOG = (name: string) => `${name}が山札とnot meを交換した`;
export const EXCHANGE_STEAL_LOG = (actor: string, target: string) =>
  `${actor}が${target}のnot meを奪った`;
export const WALKOVER_LOG = (name: string) => `${name}の不戦勝！`;
export const MUTUAL_FOLD_LOG = '全員降りて流局';

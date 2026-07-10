// UI 文言はここに集約（将来の多言語化に備える）。

export const APP_NAME = 'not me';
export const APP_SUBTITLE = 'ノットミー';
export const HOOK_LINE = '自分のカード、1枚だけ見えないポーカー。';

export const TITLE_START = 'はじめる';
export const TITLE_START_AI = 'すぐ遊ぶ（AI戦）';
export const TITLE_RANDOM_MATCH = 'ランダム対戦';
export const TITLE_FRIEND_MATCH = '友だちと対戦';
export const TITLE_RULES_BLURB =
  '手札2枚と場札2枚は見える。でも「not me」1枚だけは自分に見えない。相手の反応から、自分の本当の強さを読め。';

// --- チップウォレット ---
export const CHIP_ICON = '🪙';
export const CHIP_BALANCE_LABEL = (n: number) => `${CHIP_ICON} ${n.toLocaleString()}`;
export const BUY_IN_LABEL = (n: number) => `持ち込みチップ ${n}${CHIP_ICON}（残りは終了時に払い戻し）`;
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
  'ゲーム開始時にウォレットから300チップを持ち込んで着席する。終了時に残りチップを払い戻す（キャッシュアウト）。',
  '各ハンドは全員のアンティで始まり、①②の賭けのタイミングでポットにチップを積む。ショーダウンの勝者がポットを総取り。',
  '大きく賭けるほど勝てば大きく、負ければ大きく失う。自信とブラフの読み合い。',
  '1日1回、デイリーボーナスでチップを受け取れる。連続で受け取るほどボーナス額が増える。',
];

// --- ランキング ---
export const RANKING_BUTTON = '🏆 ランキング';
export const RANKING_TITLE = 'チップランキング';
export const RANKING_EMPTY = 'ランキングを表示できません（通信環境を確認してください）';
export const RANKING_LOADING = '読み込み中…';
export const RANKING_GAMES_PLAYED = (n: number) => `${n}ゲーム`;
export const RANKING_CLOSE = '閉じる';

// --- アカウント ---
export const ACCOUNT_BUTTON = 'アカウントを保存';
export const ACCOUNT_TITLE = 'アカウントを保存';
export const ACCOUNT_BLURB =
  'メールアドレスを登録すると、機種変更やブラウザのデータ削除後も同じ進行状況（チップ・記録）を引き継げます。';
export const ACCOUNT_EMAIL_LABEL = 'メールアドレス';
export const ACCOUNT_PASSWORD_LABEL = 'パスワード（6文字以上）';
// --- オンライン対戦（ルームコード） ---
export const ONLINE_BUTTON = '🌐 オンライン対戦';
export const ONLINE_TITLE = 'オンライン対戦';
export const ONLINE_RANDOM_MATCH = 'ランダム対戦を探す';
export const ONLINE_RANDOM_BLURB = 'コード入力なしで、待機中の相手と自動マッチします。';
export const ONLINE_MATCHMAKING_BLURB = 'ランダム対戦の相手を探しています…';
export const ONLINE_MATCHMAKING_INVITE = '待っている間、このコードで友だちを招待することもできます。';
export const ONLINE_CANCEL_MATCHMAKING = 'マッチングをやめる';
export const ONLINE_CREATE_ROOM = 'ルームを作る';
export const ONLINE_JOIN_ROOM = 'ルームコードで参加';
export const ONLINE_JOIN_BLURB = '相手から教えてもらった6文字のコードを入力してね。';
export const ONLINE_CODE_PLACEHOLDER = 'ABCDEF';
export const ONLINE_JOIN_SUBMIT = '参加する';
export const ONLINE_SHARE_CODE = 'このコードを相手に伝えて参加してもらおう';
export const ONLINE_YOU_TAG = '（あなた）';
export const ONLINE_WAITING_FOR_PLAYERS = '参加を待っています…';
export const ONLINE_WAITING_FOR_HOST = 'ホストの開始を待っています…';
export const ONLINE_START = 'このメンバーで始める';
export const ONLINE_LOADING = '読み込み中…';
export const ONLINE_MATCH_OVER = '対戦終了！';
export const ONLINE_ROOM_NOT_FOUND = 'そのコードのルームが見つかりません';
export const ONLINE_ERROR_GENERIC = '通信エラーが発生しました。もう一度お試しください。';

export const ACCOUNT_SUBMIT = '登録する';
export const ACCOUNT_CLOSE = '閉じる';
export const ACCOUNT_SUBMITTING = '送信中…';
export const ACCOUNT_TAB_REGISTER = '新規登録';
export const ACCOUNT_TAB_SIGNIN = 'ログイン';
export const ACCOUNT_SIGNIN_BLURB =
  'すでにメールアドレスを登録済みの場合はこちらでログインすると、そのアカウントのチップ・記録をこの端末に引き継げます。';
export const ACCOUNT_SIGNIN_SUBMIT = 'ログインする';
export const ACCOUNT_SIGNIN_SUBMITTING = 'ログイン中…';

export const TUTORIAL_STEPS: { title: string; body: string }[] = [
  {
    title: '① 自分の1枚だけ見えない',
    body: '5枚から好きな4枚を選んで役を作る。手札2枚と場札2枚は自分にも見えるが、「not me」1枚だけは自分から見えない。',
  },
  {
    title: '② 相手のは見えている',
    body: '相手のnot meはあなたに見えている。逆にあなたのnot meは相手全員に見えている。',
  },
  {
    title: '③ 賭けるか、降りるか',
    body: '相手の反応やヒントから自分のnot meの強さを逆算し、いくら賭けるか決めよう。勝てばポット総取り、負ければ賭けた分を失う。降りれば損失なし。',
  },
];
export const TUTORIAL_NEXT = 'つぎへ';
export const TUTORIAL_START = 'ゲームを始める';
export const TUTORIAL_SKIP = 'スキップ';

export const HAND_LABEL = (n: number, total: number) => `ハンド ${n} / ${total}`;
export const SUDDEN_DEATH_BADGE = 'サドンデス';
export const PHASE_DEAL_TITLE = '配札';
export const PHASE_DEAL_BODY = '相手の反応とヒントから、自分のnot meを推理しよう';
export const PHASE_BET1_TITLE = 'ベット1';
export const PHASE_BET1_BODY = '場札1枚を見て、降りるか勝負するか決めよう';
export const PHASE_EXCHANGE_TITLE = '交換';
export const PHASE_EXCHANGE_BODY = '自分のnot meを変えるか、相手から奪うか選ぼう';
export const PHASE_BET2_TITLE = 'ベット2';
export const PHASE_BET2_BODY = '場札2枚が揃った。最後の賭けどころ';
export const PHASE_SHOWDOWN_TITLE = 'ショーダウン';
export const PHASE_SHOWDOWN_BODY = '見えなかった1枚を開いて勝敗を確認しよう';

export const ACTION_FOLD = '降りる';
export const ACTION_STAY = 'ステイ';
export const ACTION_RAISE = 'レイズ';
export const ACTION_BIG = '大勝負';
export const ACTION_EXCHANGE_DECK = '山札と交換';
export const ACTION_EXCHANGE_STEAL = 'not meを奪う';
export const ACTION_EXCHANGE_PASS = '交換しない';
export const ACTION_BACK = 'もどる';
export const ACTION_HOME = 'ホームへ';
export const PICK_STEAL_TARGET = '誰から奪う？';
export const ACTION_DOCK_DECISION_LABEL = 'コマンド';
export const ACTION_FOLD_HELP = '損失を増やさず撤退';
export const ACTION_STAY_HELP = '小さく参加';
export const ACTION_RAISE_HELP = '強さを主張';
export const ACTION_BIG_HELP = '最大圧でブラフも狙う';
export const ACTION_DOCK_EXCHANGE_LABEL = 'not me アクション';
export const ACTION_EXCHANGE_DECK_HELP = '自分のnot meを引き直し、ヒント更新';
export const ACTION_EXCHANGE_STEAL_HELP = '相手の見えているnot meを奪う。手札ペナルティあり';
export const ACTION_EXCHANGE_PASS_HELP = '状態を変えずに次へ';
export const ACTION_TARGET_STEAL_HELP = 'このnot meを奪う';

export const YOUR_TURN_DECIDE = 'いくら賭ける？（降りれば損失なし）';
export const YOUR_TURN_EXCHANGE = 'あなたの番：not meを交換する？';
export const WAITING_FOR_OTHERS = '相手の様子を見ている…';
export const POT_LABEL = 'ポット';
export const STACK_LOW_HINT = 'チップが少ない…';
export const BET_LOG = (name: string, amount: number) => `${name}が${amount}${CHIP_ICON}賭けた`;

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
export const PLAY_RANDOM_MATCH = 'ランダム対戦へ';
export const SHARE_BUTTON = '結果をシェア';
export const SHARE_TEXT = (chipDelta: number) =>
  `『not me』で${chipDelta >= 0 ? '+' : ''}${chipDelta}チップ！自分のカード、1枚だけ見えないポーカー、あなたも読み合ってみて。`;

// HandCategory の並び順と対応させる（enum の数値インデックス通り）
export const CATEGORY_LABELS = [
  'ハイカード',
  'ワンペア',
  'ツーペア',
  'ストレート',
  'フラッシュ',
  'スリーカード',
  'ストレートフラッシュ',
  'フォーカード',
];
export const FOUR_CARD_NOTE =
  '役は5枚から選んだ4枚で作る。4枚勝負ではスリーカードが滅多に出ないため、フラッシュやストレートより強い。';
export const SHOWDOWN_UNUSED_NOTE = '暗い札は役に使わなかった1枚';

export const MUTE_ON = '音を消す';
export const MUTE_OFF = '音を出す';

export const HELP_BUTTON_LABEL = '役とルールを確認';
export const HELP_TITLE = '役とルール';
export const HELP_HANDS_SECTION = '役の強さ（上ほど強い）';
export const HELP_ROYAL_NOTE = '※ 同スートの A-K-Q-J はロイヤル（最強）';
export const HELP_RULES_SECTION = 'ルール早見';
export const HELP_RULE_LINES = [
  '役は4枚で作る。5枚（手札2＋not me 1＋場札2）から自由に4枚を選び、組める中で一番強い役が自動で採用される。',
  '4枚勝負ではスリーカードが滅多に出ないため、スリーカードはフラッシュやストレートより強い。',
  '「not me」は自分だけ見えない。相手のnot meはあなたに見えている。',
  '配札時、自分のnot meについてのヒントが1つ必ずもらえる（偶数/奇数、7以上/以下など）。',
  '相手の反応と行動、そしてヒントから、自分のnot meの強さを逆算しよう。',
  '流れ：配札（場札1枚目公開）→ ①残る/降りる → 交換（山札交換/奪う/パス を1回まで）→ 場札2枚目公開 → ②残る/降りる → ショーダウン。',
  '「奪う」は相手のnot meを一方的に奪う。奪われた側は山札から新しいnot me＋ヒントを補充、奪った側は手札1枚がランダムで山札と交換される（見ずに引き替え）。',
  '同じハンドでお互いに奪い合った場合（A→Bの後にB→A）は、そのまま単純にnot meを交換する形で決着する。',
];
export const HELP_SCORING_SECTION = '賭けと勝敗';
export const HELP_SCORE_ROWS: [string, string][] = [
  ['ハンド開始のアンティ', '全員 10🪙'],
  ['ステイ', '+15🪙'],
  ['レイズ', '+40🪙'],
  ['大勝負', '+90🪙'],
  ['ショーダウン勝者', 'ポット総取り'],
];
export const HELP_SOUND_SECTION = '設定';
export const HELP_SOUND_LABEL = '効果音';
export const HELP_CLOSE = '閉じる';

// --- 交換フェーズの一時トースト（カードフライト演出に添える補足情報） ---
export const EVENT_HINT_GAINED = 'ヒント獲得';
export const EVENT_PENALTY_LABEL = '手札1枚が山札と交換された';
export const REVEAL_WAITING = '結果を確認中…';

export const FOLD_LOG = (name: string) => `${name}が降りた`;
export const EXCHANGE_PASS_LOG = (name: string) => `${name}は交換しなかった`;
export const EXCHANGE_DECK_LOG = (name: string) => `${name}が山札とnot meを交換した`;
export const EXCHANGE_STEAL_LOG = (actor: string, target: string) =>
  `${actor}が${target}のnot meを奪った`;
export const RECIPROCAL_STEAL_LOG = (actor: string, target: string) =>
  `${actor}と${target}のnot meが入れ替わった`;
export const WALKOVER_LOG = (name: string) => `${name}の不戦勝！`;
export const MUTUAL_FOLD_LOG = '全員降りて流局';

import { useCallback, useEffect, useRef, useState } from "react";
import { buildDeck, type CardInstance } from "../../data/cards";

export type Side = "player" | "opponent";

export interface PlayerState {
  life: number;
  deck: CardInstance[];
  hand: CardInstance[];
  board: (CardInstance | null)[];
  discard: CardInstance[];
}

export type GameEvent =
  | { type: "draw"; side: Side; uid: string }
  | { type: "play"; side: Side; uid: string; slot: number }
  | { type: "buff"; side: Side; sourceUid: string; targetUid: string }
  | { type: "damageCreature"; side: Side; attackerUid: string; targetUid: string; amount: number; destroyed: boolean }
  | { type: "damageFace"; side: Side; attackerUid: string; amount: number; big: boolean }
  | { type: "turnChange"; active: Side; round: number }
  | { type: "gameOver"; winner: Side };

export interface GameState {
  round: number;
  active: Side;
  mana: number;
  player: PlayerState;
  opponent: PlayerState;
  gameOver: Side | null;
  lastHighlightUid: string | null;
}

const BOARD_SIZE = 3;
const START_HAND = 3;
const MAX_HAND = 7;

function makePlayer(): PlayerState {
  const deck = buildDeck();
  return { life: 20, deck, hand: [], board: [null, null, null], discard: [] };
}

function drawCard(state: PlayerState): { state: PlayerState; drawn: CardInstance | null } {
  if (state.deck.length === 0 || state.hand.length >= MAX_HAND) return { state, drawn: null };
  const [drawn, ...rest] = state.deck;
  return { state: { ...state, deck: rest, hand: [...state.hand, drawn] }, drawn };
}

function initialState(): GameState {
  let player = makePlayer();
  let opponent = makePlayer();
  for (let i = 0; i < START_HAND; i++) {
    player = drawCard(player).state;
    opponent = drawCard(opponent).state;
  }
  return { round: 1, active: "player", mana: 1, player, opponent, gameOver: null, lastHighlightUid: null };
}

function opposite(side: Side): Side {
  return side === "player" ? "opponent" : "player";
}

export function affordableAndPlayable(hand: CardInstance[], mana: number, board: (CardInstance | null)[]) {
  const playable = new Set<string>();
  const disabled = new Set<string>();
  for (const card of hand) {
    const canAfford = card.def.cost <= mana;
    const hasTarget = card.def.kind === "creature" ? board.some((s) => s === null) : board.some((s) => s !== null);
    if (canAfford && hasTarget) playable.add(card.uid);
    else disabled.add(card.uid);
  }
  return { playable, disabled };
}

export function useGameEngine() {
  const [state, setState] = useState<GameState>(() => initialState());
  const [events, setEvents] = useState<GameEvent[]>([]);
  const aiTimer = useRef<number | null>(null);

  const emit = useCallback((evs: GameEvent[]) => {
    setEvents((prev) => [...prev, ...evs]);
  }, []);

  const consumeEvents = useCallback(() => {
    setEvents([]);
  }, []);

  const playCard = useCallback(
    (side: Side, uid: string, slotIndex: number) => {
      setState((prev) => {
        if (prev.gameOver || prev.active !== side) return prev;
        const key = side;
        const actor = { ...prev[key] };
        const card = actor.hand.find((c) => c.uid === uid);
        if (!card || card.def.cost > prev.mana) return prev;

        const evs: GameEvent[] = [];

        if (card.def.kind === "creature") {
          if (actor.board[slotIndex] !== null) return prev;
          actor.hand = actor.hand.filter((c) => c.uid !== uid);
          actor.board = actor.board.map((s, i) => (i === slotIndex ? card : s));
          evs.push({ type: "play", side, uid, slot: slotIndex });
        } else {
          // buff: 指定スロットの自軍クリーチャーを強化する
          const target = actor.board[slotIndex];
          if (!target) return prev;
          actor.hand = actor.hand.filter((c) => c.uid !== uid);
          actor.discard = [...actor.discard, card];
          actor.board = actor.board.map((s) =>
            s && s.uid === target.uid
              ? { ...s, currentAttack: (s.currentAttack ?? 0) + 2, currentHp: (s.currentHp ?? 0) + 1 }
              : s,
          );
          evs.push({ type: "buff", side, sourceUid: uid, targetUid: target.uid });
        }

        emit(evs);
        return { ...prev, [key]: actor, lastHighlightUid: uid };
      });
    },
    [emit],
  );

  const endTurn = useCallback(() => {
    setState((prev) => {
      if (prev.gameOver) return prev;
      const attackerSide = prev.active;
      const defenderSide = opposite(attackerSide);
      let attacker = { ...prev[attackerSide] };
      let defender = { ...prev[defenderSide] };
      const evs: GameEvent[] = [];

      attacker.board.forEach((creature, i) => {
        if (!creature) return;
        const amount = creature.currentAttack ?? 0;
        const defenderCreature = defender.board[i];
        if (defenderCreature) {
          const remainingHp = (defenderCreature.currentHp ?? 0) - amount;
          const destroyed = remainingHp <= 0;
          evs.push({ type: "damageCreature", side: attackerSide, attackerUid: creature.uid, targetUid: defenderCreature.uid, amount, destroyed });
          if (destroyed) {
            defender = {
              ...defender,
              board: defender.board.map((s, si) => (si === i ? null : s)),
              discard: [...defender.discard, defenderCreature],
            };
          } else {
            defender = {
              ...defender,
              board: defender.board.map((s, si) => (si === i ? { ...s!, currentHp: remainingHp } : s)),
            };
          }
        } else {
          defender = { ...defender, life: Math.max(0, defender.life - amount) };
          evs.push({ type: "damageFace", side: attackerSide, attackerUid: creature.uid, amount, big: amount >= 5 });
        }
      });

      let gameOver: Side | null = null;
      if (defender.life <= 0) gameOver = attackerSide;

      const nextActive = defenderSide;
      const nextRound = nextActive === "player" ? prev.round + 1 : prev.round;
      const { state: drawnDefender, drawn } = gameOver ? { state: defender, drawn: null } : drawCard(defender);
      if (drawn) evs.push({ type: "draw", side: nextActive, uid: drawn.uid });
      evs.push({ type: "turnChange", active: nextActive, round: nextRound });
      if (gameOver) evs.push({ type: "gameOver", winner: gameOver });

      emit(evs);

      return {
        ...prev,
        [attackerSide]: attacker,
        [defenderSide]: drawnDefender,
        active: nextActive,
        round: nextRound,
        mana: gameOver ? prev.mana : Math.min(6, nextRound),
        gameOver,
        lastHighlightUid: null,
      };
    });
  }, [emit]);

  // 簡易AI: 相手ターンになったら少し間を置いてから、出せるカードをランダムに1枚出し、ターンを終える。
  useEffect(() => {
    if (state.gameOver || state.active !== "opponent") return;
    aiTimer.current = window.setTimeout(() => {
      setState((prev) => {
        if (prev.active !== "opponent" || prev.gameOver) return prev;
        const { playable } = affordableAndPlayable(prev.opponent.hand, prev.mana, prev.opponent.board);
        if (playable.size > 0) {
          const uid = Array.from(playable)[Math.floor(Math.random() * playable.size)];
          const card = prev.opponent.hand.find((c) => c.uid === uid)!;
          const slots = prev.opponent.board
            .map((s, i) => (card.def.kind === "creature" ? (s === null ? i : -1) : s ? i : -1))
            .filter((i) => i >= 0);
          const slot = slots[Math.floor(Math.random() * slots.length)];
          window.setTimeout(() => playCard("opponent", uid, slot), 10);
        }
        return prev;
      });
      window.setTimeout(() => endTurn(), 900);
    }, 700);
    return () => {
      if (aiTimer.current) window.clearTimeout(aiTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.active, state.gameOver, state.round]);

  const restart = useCallback(() => setState(initialState()), []);

  return { state, events, consumeEvents, playCard, endTurn, restart, BOARD_SIZE };
}

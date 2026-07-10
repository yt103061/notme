import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CardFan } from "../layouts/CardFan";
import { CardStack } from "../layouts/CardStack";
import { BoardSlot } from "../layouts/BoardSlot";
import { Card, type CardHandle } from "../card/Card";
import type { CardInstance } from "../../data/cards";
import { affordableAndPlayable, useGameEngine, type GameEvent, type Side } from "./gameEngine";
import { fxQueue } from "../../core/fxQueue";
import { pushHistory } from "../../core/historyLog";
import { playCardSound } from "../../core/sound";
import { vibrate } from "../../core/haptics";
import { getSettings } from "../../core/settings";
import "./GameBoard.css";

export interface GameBoardProps {
  onOpenDetail?: (instance: CardInstance, rect: DOMRect) => void;
  onGameOver?: (winner: Side, highlightCard: CardInstance | null) => void;
}

const CARD_NAME = (uid: string, all: CardInstance[]): string => all.find((c) => c.uid === uid)?.def.name ?? "カード";

export function GameBoard({ onOpenDetail, onGameOver }: GameBoardProps) {
  const { state, events, consumeEvents, playCard, endTurn, BOARD_SIZE } = useGameEngine();
  const handles = useRef(new Map<string, CardHandle>());
  const [tone, setTone] = useState(0); // 8章: 終盤ほど照明をわずかにドラマチックにする環境光

  const registerHandle = useCallback((uid: string, handle: CardHandle | null) => {
    if (handle) handles.current.set(uid, handle);
    else handles.current.delete(uid);
  }, []);

  const allCards = useMemo(
    () => [
      ...state.player.hand,
      ...state.player.board.filter((c): c is CardInstance => !!c),
      ...state.player.discard,
      ...state.opponent.hand,
      ...state.opponent.board.filter((c): c is CardInstance => !!c),
      ...state.opponent.discard,
    ],
    [state],
  );

  // ゲームイベントをfxQueueへ変換して直列再生する(6.3)。同時多発でも1件ずつ語る。
  useEffect(() => {
    if (events.length === 0) return;
    const fxEvents = events.map((ev) => toFxEvent(ev, handles.current, allCards));
    fxQueue.pushAll(fxEvents);
    consumeEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [events]);

  useEffect(() => {
    if (state.gameOver) {
      const highlight = allCards.find((c) => c.uid === state.lastHighlightUid) ?? null;
      window.setTimeout(() => onGameOver?.(state.gameOver as Side, highlight), 900);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.gameOver, state.lastHighlightUid, onGameOver]);

  useEffect(() => {
    const lowestLife = Math.min(state.player.life, state.opponent.life);
    setTone(Math.max(0, Math.min(1, (20 - lowestLife) / 20)));
  }, [state.player.life, state.opponent.life]);

  const { playable, disabled } = affordableAndPlayable(state.player.hand, state.mana, state.player.board);
  const isPlayerTurn = state.active === "player" && !state.gameOver;

  // 7.2: 何もせず数秒経ったら、出せるカードの呼吸光をわずかに強める(急かさない範囲のナッジ)
  const [nudge, setNudge] = useState(false);
  useEffect(() => {
    setNudge(false);
    if (!isPlayerTurn || playable.size === 0) return;
    const id = window.setTimeout(() => {
      if (getSettings().nudgesOn) setNudge(true);
    }, 6000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlayerTurn, state.player.hand.length, state.mana]);

  const handlePlay = (uid: string, zoneId: string) => {
    const [side, idxStr] = zoneId.split("-");
    if (side !== "player") {
      playCardSound("invalid", 0.4);
      return;
    }
    playCard("player", uid, Number(idxStr));
  };

  const handleTapHand = (uid: string, rect: DOMRect) => {
    const card = state.player.hand.find((c) => c.uid === uid) ?? state.opponent.hand.find((c) => c.uid === uid);
    if (card) onOpenDetail?.(card, rect);
  };

  const handleTapBoard = (card: CardInstance, rect: DOMRect) => onOpenDetail?.(card, rect);

  return (
    <div className="game-board" style={{ ["--tension" as string]: tone }}>
      <div className="game-board__side game-board__side--opponent">
        <div className="game-board__piles">
          <CardStack count={state.opponent.deck.length} label="山札" />
          <CardStack count={state.opponent.discard.length} label="捨札" faceUp topCard={state.opponent.discard.at(-1)} />
        </div>
        <div className="game-board__hand game-board__hand--opponent">
          <CardFan cards={state.opponent.hand} faceUp={false} interactive={false} size="sm" align="top" />
        </div>
        <div className="game-board__life">相手 ライフ {state.opponent.life}</div>
      </div>

      <div className="game-board__lanes">
        <div className="game-board__row">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <BoardSlot key={`opponent-${i}`} id={`opponent-${i}`} accepts={() => false}>
              {state.opponent.board[i] && (
                <Card
                  ref={(h) => registerHandle(state.opponent.board[i]!.uid, h)}
                  instance={state.opponent.board[i]!}
                  size="sm"
                  interactive
                  draggable={false}
                  onTap={(rect) => handleTapBoard(state.opponent.board[i]!, rect)}
                />
              )}
            </BoardSlot>
          ))}
        </div>
        <div className="game-board__turn-banner" data-active={state.active}>
          {state.gameOver ? "対戦終了" : `第${state.round}ターン ${isPlayerTurn ? "あなたの番" : "相手の番"}(マナ ${state.mana})`}
        </div>
        <div className="game-board__row">
          {Array.from({ length: BOARD_SIZE }).map((_, i) => (
            <BoardSlot
              key={`player-${i}`}
              id={`player-${i}`}
              accepts={(uid) => {
                if (!isPlayerTurn) return false;
                const card = state.player.hand.find((c) => c.uid === uid);
                if (!card || card.def.cost > state.mana) return false;
                const slot = state.player.board[i];
                if (card.def.kind === "creature") return slot === null;
                return slot !== null;
              }}
            >
              {state.player.board[i] && (
                <Card
                  ref={(h) => registerHandle(state.player.board[i]!.uid, h)}
                  instance={state.player.board[i]!}
                  size="sm"
                  interactive
                  draggable={false}
                  onTap={(rect) => handleTapBoard(state.player.board[i]!, rect)}
                />
              )}
            </BoardSlot>
          ))}
        </div>
      </div>

      <div className="game-board__side game-board__side--player">
        <div className="game-board__life">あなた ライフ {state.player.life}</div>
        <div className={`game-board__hand ${nudge ? "game-board__hand--nudge" : ""}`}>
          <CardFan
            cards={state.player.hand}
            playableIds={playable}
            disabledIds={disabled}
            interactive={isPlayerTurn}
            size="md"
            registerHandle={registerHandle}
            onPlay={handlePlay}
            onTapCard={handleTapHand}
          />
        </div>
        <div className="game-board__piles">
          <CardStack count={state.player.deck.length} label="山札" />
          <CardStack count={state.player.discard.length} label="捨札" faceUp topCard={state.player.discard.at(-1)} />
        </div>
        <button className="game-board__end-turn" disabled={!isPlayerTurn} onClick={endTurn}>
          ターン終了
        </button>
      </div>
    </div>
  );
}

function toFxEvent(
  ev: GameEvent,
  handleMap: Map<string, CardHandle>,
  allCards: CardInstance[],
): { kind: string; level: "L2" | "L3"; duration: number; run: () => void } {
  switch (ev.type) {
    case "draw":
      return {
        kind: "draw",
        level: "L2",
        duration: 260,
        run: () => {
          playCardSound("fan", 0.4);
          pushHistory(`${ev.side === "player" ? "あなた" : "相手"}がカードを引いた`);
        },
      };
    case "play":
      return {
        kind: "play",
        level: "L2",
        duration: 220,
        run: () => {
          playCardSound("land", 0.5);
          vibrate("medium");
          pushHistory(`${ev.side === "player" ? "あなた" : "相手"}が${CARD_NAME(ev.uid, allCards)}を場に出した`);
        },
      };
    case "buff":
      return {
        kind: "buff",
        level: "L2",
        duration: 260,
        run: () => {
          handleMap.get(ev.targetUid)?.pulse("buff");
          playCardSound("rare", 0.3);
          pushHistory(`${ev.side === "player" ? "あなた" : "相手"}が強化を使った`);
        },
      };
    case "damageCreature":
      return {
        kind: "damageCreature",
        level: "L2",
        duration: 320,
        run: () => {
          handleMap.get(ev.targetUid)?.pulse(ev.destroyed ? "destroy" : "damage");
          playCardSound("land", 0.6);
          vibrate("heavy");
          pushHistory(
            `${CARD_NAME(ev.attackerUid, allCards)}が${CARD_NAME(ev.targetUid, allCards)}に${ev.amount}ダメージ${ev.destroyed ? "(撃破)" : ""}`,
          );
        },
      };
    case "damageFace":
      return {
        kind: "damageFace",
        level: ev.big ? "L3" : "L2",
        duration: 300,
        run: () => {
          playCardSound(ev.big ? "rare" : "land", 0.7);
          vibrate("heavy");
          pushHistory(`${CARD_NAME(ev.attackerUid, allCards)}が${ev.side === "player" ? "相手" : "あなた"}に${ev.amount}ダメージ`);
        },
      };
    case "turnChange":
      return {
        kind: "turnChange",
        level: "L2",
        duration: 200,
        run: () => pushHistory(`第${ev.round}ターン: ${ev.active === "player" ? "あなた" : "相手"}の番`),
      };
    case "gameOver":
      return {
        kind: "gameOver",
        level: "L3",
        duration: 0,
        run: () => {
          playCardSound(ev.winner === "player" ? "victory" : "invalid", 1);
          pushHistory(`${ev.winner === "player" ? "あなた" : "相手"}の勝利`);
        },
      };
  }
}

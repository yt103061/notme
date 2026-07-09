import { describe, it, expect } from 'vitest';
import {
  initMatch,
  submitBet,
  submitExchange,
  continueMatch,
  redactForSeat,
  loadGame,
} from './orchestration.ts';

function play2PlayerHandToShowdown(match: ReturnType<typeof initMatch>) {
  match = submitBet(match, 0, 'stay');
  match = submitBet(match, 1, 'stay');
  match = submitExchange(match, match.exchangeQueue![0], { type: 'pass' });
  match = submitExchange(match, match.exchangeQueue![0], { type: 'pass' });
  match = submitBet(match, 0, 'stay');
  match = submitBet(match, 1, 'stay');
  return match;
}

describe('online orchestration', () => {
  it('deals an initial hand with names applied and decision1 phase', () => {
    const match = initMatch(42, { 0: 'Alice', 1: 'Bob' });
    const game = loadGame(match);
    expect(game.phase).toBe('decision1');
    expect(game.players).toHaveLength(2);
    expect(game.players[0].name).toBe('Alice');
    expect(game.players[1].name).toBe('Bob');
    expect(game.players.every((p) => p.isHuman)).toBe(true);
  });

  it('buffers bets until all active players decide, then advances to exchange', () => {
    let match = initMatch(1, { 0: 'A', 1: 'B' });
    match = submitBet(match, 0, 'stay');
    expect(loadGame(match).phase).toBe('decision1'); // まだ1人分
    match = submitBet(match, 1, 'raise');
    const game = loadGame(match);
    expect(game.phase).toBe('exchange');
    expect(match.exchangeQueue).toEqual(expect.arrayContaining([0, 1]));
  });

  it('rejects an action from a seat that is not their turn or already decided', () => {
    let match = initMatch(2, { 0: 'A', 1: 'B' });
    match = submitBet(match, 0, 'stay');
    const afterDup = submitBet(match, 0, 'raise'); // 二重投票は無視
    expect(afterDup).toEqual(match);
  });

  it('runs a full 2-player hand through showdown and chip settlement', () => {
    let match = initMatch(7, { 0: 'A', 1: 'B' });
    match = play2PlayerHandToShowdown(match);
    const game = loadGame(match);
    expect(game.phase).toBe('handEnd');
    expect(game.lastResult).not.toBeNull();
    expect(game.lastResult!.winnerIds.length).toBeGreaterThan(0);
  });

  it('advances hands via continueMatch until game over', () => {
    let match = initMatch(9, { 0: 'A', 1: 'B' });
    let done = false;
    for (let i = 0; i < 20 && !done; i++) {
      match = play2PlayerHandToShowdown(match);
      const result = continueMatch(match);
      match = result.match;
      done = result.done;
    }
    expect(done).toBe(true);
    expect(loadGame(match).phase).toBe('gameEnd');
  });

  it('redacts the viewers own notMe but reveals opponents notMe during play', () => {
    const match = initMatch(3, { 0: 'A', 1: 'B' });
    const game = loadGame(match);
    const viewAs0 = redactForSeat(game, 0);
    expect(viewAs0.players[0].notMe.rank).toBe(0); // 自分の not me は隠す
    expect(viewAs0.players[1].notMe.rank).not.toBe(0); // 相手の not me は見える
    expect(viewAs0.players[1].hole.every((c) => c.rank === 0)).toBe(true); // 相手の手札は隠す
    expect(viewAs0.players[0].hole.every((c) => c.rank !== 0)).toBe(true); // 自分の手札は見える
    expect(viewAs0.deck).toHaveLength(0);
  });

  it('reveals everything once the hand ends (showdown)', () => {
    let match = initMatch(11, { 0: 'A', 1: 'B' });
    match = play2PlayerHandToShowdown(match);
    const game = loadGame(match);
    const viewAs0 = redactForSeat(game, 0);
    expect(viewAs0.players[0].notMe.rank).not.toBe(0);
    expect(viewAs0.players[1].hole.every((c) => c.rank !== 0)).toBe(true);
  });
});

import expect, { createSpy } from 'expect';
import createCah, {
  ALREADY_IN_GAME,
  COUNTDOWN_TO_GAME,
  DECK_CHANGE,
  GAME_IS_FULL,
  PLAYER_ADDED,
  WAITING_FOR_PLAYERS,
} from '../src';

describe('cah', () => {
  it('should start as WAITING_FOR_PLAYERS', () => {
    const cah = createCah();
    expect(cah.getState().status).toBe(WAITING_FOR_PLAYERS);
  });

  describe('addPlayer', () => {
    const playerId = 123;

    let cah;

    afterEach(() => {
      if (cah) {
        cah.destroy();
      }
    });

    it('should add the id to the playerIds array', () => {
      cah = createCah();
      cah.addPlayer(playerId);
      const state = cah.getState();

      expect(state.playerIds.length).toBe(1);
      expect(state.playerIds[0]).toBe(playerId);
    });

    it('should generate a deck of 10 cards for the player', () => {
      cah = createCah();
      cah.addPlayer(playerId);
      const state = cah.getState();

      expect(state.playerDecks.has(playerId)).toBe(true);
      expect(state.playerDecks.get(playerId).size).toBe(10);
    });

    it('should set the players score to 0', () => {
      cah = createCah();
      cah.addPlayer(playerId);
      const state = cah.getState();

      expect(state.playerScores.has(playerId)).toBe(true);
      expect(state.playerScores.get(playerId)).toBe(0);
    });

    it('should reject if the player is already in the game', () => {
      cah = createCah();
      cah.addPlayer(playerId).then(
        () => (
          cah.addPlayer(playerId).then(
            () => { throw new Error('Expected rejection'); },
            err => expect(err.message).toBe(ALREADY_IN_GAME)
          )
        ),
        () => { throw new Error('Expected resolution.'); },
      );
    });

    it('should reject if game is full', () => {
      cah = createCah({ maxPlayers: 2 });
      cah.addPlayer(playerId);

      return (
        cah.addPlayer(playerId + 1).then(
          () => (
            cah.addPlayer(playerId + 2).then(
              () => { throw new Error('Expected rejection'); },
              err => expect(err.message).toBe(GAME_IS_FULL)
            )
          ),
          () => { throw new Error('Expected resolution.'); },
        )
      );
    });

    it('should dispatch a PLAYER_ADDED event', () => {
      cah = createCah();
      const spy = createSpy();

      cah.subscribe(spy);

      return cah.addPlayer(playerId).then(
        () => {
          expect(spy).toHaveBeenCalledWith({
            type: PLAYER_ADDED,
            payload: playerId,
          });
        },
        () => { throw new Error('Expected resolve'); }
      );
    });

    it('should dispatch a DECK_CHANGE event', () => {
      cah = createCah();
      const spy = createSpy();

      cah.subscribe(spy);

      return cah.addPlayer(playerId).then(
        () => {
          const { playerDecks } = cah.getState();
          const deck = Array.from(playerDecks.get(playerId).values());

          expect(spy).toHaveBeenCalledWith({
            type: DECK_CHANGE,
            payload: { deck, playerId },
          });
        },
        () => { throw new Error('Expected resolve'); }
      );
    });

    it('should set to COUNTDOWN_TO_GAME if the length is > minPlayers ', () => {
      const countdownTo = createSpy();
      cah = createCah({ countdownTo, minPlayers: 3 });
      cah.addPlayer(playerId);
      expect(cah.getState().status).toBe(WAITING_FOR_PLAYERS);
      expect(countdownTo).toNotHaveBeenCalled();

      cah.addPlayer(playerId + 1);
      expect(cah.getState().status).toBe(WAITING_FOR_PLAYERS);
      expect(countdownTo).toNotHaveBeenCalled();

      cah.addPlayer(playerId + 2);
      const state = cah.getState();
      expect(state.status).toBe(COUNTDOWN_TO_GAME);
      expect(countdownTo).toHaveBeenCalled();
      expect(countdownTo.calls[0].arguments[0].name).toBe('startGame');
    });
  });
});

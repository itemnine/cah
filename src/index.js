import { shuffle } from 'lodash';
import createId from 'node-uuid';
import createDispatcher from 'create-dispatcher';
import findNextCzar from './findNextCzar';
import pickBlackCard from './pickBlackCard';
import pickWhiteCard from './pickWhiteCard';

import DEFAULT_BLACK_DECK from './blackDeck';
import DEFAULT_WHITE_DECK from './whiteDeck';

export const CZAR_LEFT = 'The card czar left the game';
export const ALREADY_IN_GAME = 'That player is already in the game';
export const GAME_IS_FULL = 'There is no room in the game';

export const DECK_CHANGE = 'ttn/cah/events/DECK_CHANGE';
export const PLAYER_ADDED = 'ttn/cah/events/PLAYER_ADDED';
export const PLAYER_REMOVED = 'ttn/cah/events/PLAYER_REMOVED';
export const PLAYER_SCORED = 'ttn/cah/events/PLAYER_SCORED';
export const PLAYER_SKIPPED = 'ttn/cah/events/PLAYER_SKIPPED';
export const STATE_CHANGED = 'ttn/cah/events/STATE_CHANGED';

export const WAITING_FOR_PLAYERS = 'ttn/cah/state/WAITING_FOR_PLAYERS';
export const COUNTDOWN_TO_GAME = 'ttn/cah/state/COUNTDOWN_TO_GAME';
export const GAME_PLAYING = 'ttn/cah/state/GAME_PLAYING';
export const CZAR_PICKING = 'ttn/cah/state/CZAR_PICKING';
export const CZAR_PICKED = 'ttn/cah/state/CZAR_PICKED';

const CZAR_DEPENDENT_STATES = [GAME_PLAYING, CZAR_PICKING];
export const DEFAULT_COUNTDOWNS = {
  countdownToGame: 15,
  czarPicking: 60,
  gameDuration: 60,
  winnerPicked: 15,
};

export default function createCah({
  whiteDeck = DEFAULT_WHITE_DECK,
  blackDeck = DEFAULT_BLACK_DECK,
  countdowns = DEFAULT_COUNTDOWNS,
  minPlayers = 2,
  maxPlayers = Math.floor(whiteDeck.length / 10),
  countdownTo = setTimeout,
  verbose = false,
} = {}) {
  const { dispatch, subscribe } = createDispatcher();

  if (countdowns !== DEFAULT_COUNTDOWNS) {
    Object.assign(countdowns, DEFAULT_COUNTDOWNS, countdowns);
  }

  if (!blackDeck || !blackDeck.length) {
    throw new Error('you must provide a blackDeck array');
  }

  if (!whiteDeck || (maxPlayers * 10) > whiteDeck.length) {
    throw new Error(`there is not enough cards in the whiteDeck to support ${maxPlayers} players`);
  }

  const log = (...args) => verbose && global.console.log('[cah]', ...args);

  const state = {
    minPlayers,
    maxPlayers,
    whiteDeck: shuffle(whiteDeck),
    blackDeck: shuffle(blackDeck),
    blackCard: null,
    czarId: null,
    playerIds: [],
    playerDecks: new Map(),
    playerScores: new Map(),
    status: WAITING_FOR_PLAYERS,
    submittedCards: null,
    submittedPlayers: null,
    winner: null,
  };

  let countdown;

  /*
   * Card decks
   */
  const buildWhiteDeck = () => Array(10).fill().map(() => {
    const { deck: newDeck, card } = pickWhiteCard(state.whiteDeck, whiteDeck);
    state.whiteDeck = newDeck;
    return card;
  }).reduce((map, card) => {
    map.set(card.id, card);
    return map;
  }, new Map());

  function dropWhiteCard({ text }) {
    state.whiteDeck.push(text);
  }

  /**
   * State management
   */
  function setState(newState, { silent = false } = {}) {
    Object.assign(state, newState);

    if (!silent) {
      dispatch({ type: STATE_CHANGED, payload: state });
    }
  }

  function cancelCountdown() {
    if (countdown) {
      clearTimeout(countdown);
      state.countdownFn = null;
      state.countdownUntil = null;
      countdown = null;
    }
  }

  function startCountdown(fn, seconds) {
    cancelCountdown();
    const unix = seconds * 1000;
    countdown = countdownTo(fn, unix);
    state.countdownFn = fn;
    state.countdownUntil = new Date(Date.now() + unix);
  }

  /**
   * Game state mutators
   */
  function resetGame(reason = null) {
    log('Resetting game...', reason ? reason : undefined); // eslint-disable-line

    // restart game with a countdown
    cancelCountdown();

    state.blackCard = null;
    state.submittedCards = null;
    state.submittedPlayers = null;
    state.reason = reason;

    if (state.playerIds.length >= minPlayers) {
      log('Countdown to start...'); // eslint-disable-line
      setState({ status: COUNTDOWN_TO_GAME });
      startCountdown(startGame, countdowns.countdownToGame);
    } else if (state.status !== WAITING_FOR_PLAYERS) {
      log('Wait for players...'); // eslint-disable-line
      setState({ status: WAITING_FOR_PLAYERS });
    }
  }

  function setCzarPicking() {
    log('Setting state to czar picking...');

    state.status = CZAR_PICKING;

    state.playerIds.forEach((playerId) => {
      if (playerId !== state.czarId && !state.submittedPlayers.has(playerId)) {
        dispatch({ type: PLAYER_SKIPPED, payload: playerId });
      }
    });

    if (state.status !== CZAR_PICKING) {
      return;
    }

    if (state.submittedPlayers.size < (minPlayers - 1)) {
      resetGame('Too many players were skipped.');
      return;
    }

    startCountdown(skipCzar, countdowns.czarPicking);
    setState();
  }

  function startGame() {
    log('Starting game...');

    if (!state.czarId) {
      state.czarId = findNextCzar(state);
    }

    const { deck, card } = pickBlackCard(state.blackDeck, blackDeck);

    state.blackCard = card;
    state.blackDeck = deck;
    state.reason = null;
    state.status = GAME_PLAYING;
    state.submittedCards = new Map();
    state.submittedPlayers = new Map();
    state.winner = null;

    startCountdown(setCzarPicking, countdowns.gameDuration);
    setState();
  }

  function ensureGameValid(newState) {
    if (newState.playerIds.length < minPlayers && state.status !== WAITING_FOR_PLAYERS) {
      log('Waiting for players...');
      cancelCountdown();
      newState.blackCard = null;
      newState.czarId = null;
      newState.status = WAITING_FOR_PLAYERS;
      newState.submittedCards = null;
      newState.submittedPlayers = null;
    }

    return newState;
  }

  function skipCzar() {
    log('Skipping czar...');
    dispatch({ type: PLAYER_SKIPPED, payload: state.czarId });
    const czarId = findNextCzar(state);
    resetGame('The czar was skipped.');
    state.czarId = czarId;
  }

  /*
   * public API
   */

  function addPlayer(playerId) {
    if (state.playerIds.indexOf(playerId) > -1) {
      return Promise.reject(new Error(ALREADY_IN_GAME));
    }

    if (state.playerIds.length === maxPlayers) {
      return Promise.reject(new Error(GAME_IS_FULL));
    }

    log('Adding player...', playerId);

    const deck = buildWhiteDeck();

    state.playerIds.push(playerId);
    state.playerDecks.set(playerId, deck);
    state.playerScores.set(playerId, 0);

    dispatch({
      type: PLAYER_ADDED,
      payload: playerId,
    });

    dispatch({
      type: DECK_CHANGE,
      payload: { deck: Array.from(deck.values()), playerId },
    });

    if (state.status === WAITING_FOR_PLAYERS) {
      resetGame();
    }

    return Promise.resolve();
  }

  function removePlayer(playerId) {
    if (state.playerIds.indexOf(playerId) === -1) {
      return Promise.reject(new Error('player is not in the game'));
    }

    log('Removing player...', playerId);

    function removeId() {
      const index = state.playerIds.indexOf(playerId);
      state.playerIds.splice(index, 1);
      state.playerScores.delete(playerId);
      state.playerDecks.delete(playerId);
      dispatch({ type: PLAYER_REMOVED, payload: playerId });
    }

    if (state.czarId === playerId) {
      if (CZAR_DEPENDENT_STATES.includes(state.status)) {
        state.czarId = findNextCzar(state);
        removeId();
        resetGame(CZAR_LEFT);

        return Promise.resolve();
      }

      if (state.status === COUNTDOWN_TO_GAME) {
        state.czarId = findNextCzar(state);
        removeId();
        setState(ensureGameValid(state));

        return Promise.resolve();
      }
    }

    removeId();
    ensureGameValid(state);

    if (state.status !== CZAR_PICKED) {
      if (state.submittedPlayers && state.submittedPlayers.has(playerId)) {
        const submissionId = state.submittedPlayers.get(playerId);
        state.submittedPlayers.delete(playerId);
        state.submittedCards.delete(submissionId);
      }
    }

    if (state.status === GAME_PLAYING) {
      if ((state.playerIds.length - 1) === state.submittedPlayers.size) { // don't count czar
        setCzarPicking();
        return Promise.resolve();
      }
    }

    setState(state);

    return Promise.resolve();
  }

  function pickWinner(submissionId) {
    if (state.status !== CZAR_PICKING) {
      return Promise.reject(new Error('A winner cannot be picked currently.'));
    }

    if (!state.submittedCards.has(submissionId)) {
      return Promise.reject(new Error('A submitted set of cards does not exist with that id.'));
    }

    log('Picking winner...');

    cancelCountdown();

    state.status = CZAR_PICKED;
    state.czarId = findNextCzar(state);
    state.winner = {
      ...state.submittedCards.get(submissionId),
      blackCard: state.blackCard,
    };

    const existingScore = state.playerScores.get(state.winner.playerId);
    const newScore = existingScore + 1;

    state.playerScores.set(state.winner.playerId, newScore);

    dispatch({
      type: PLAYER_SCORED,
      payload: { playerId: state.winner.playerId, score: newScore },
    });

    state.submittedCards.forEach(({ cardIds: submittedCardIds, playerId }) => {
      const playerDeck = state.playerDecks.get(playerId);
      const addedToDeck = submittedCardIds.reduce((newCards, submittedCardId) => {
        const submittedCard = playerDeck.get(submittedCardId);
        const { deck: newWhiteDeck, card: newCard } = pickWhiteCard(state.whiteDeck, whiteDeck);

        state.whiteDeck = newWhiteDeck;

        dropWhiteCard(submittedCard);

        playerDeck.delete(submittedCardId);
        playerDeck.set(newCard.id, newCard);

        newCards.push(newCard.text);

        return newCards;
      }, []);

      dispatch({
        type: DECK_CHANGE,
        payload: {
          deck: Array.from(playerDeck.values()),
          addedToDeck,
          playerId,
        },
      });
    });

    startCountdown(resetGame, countdowns.winnerPicked);
    setState(state);

    return Promise.resolve();
  }

  function submitCards(playerId, cardIds) {
    if (state.status !== GAME_PLAYING) {
      return Promise.reject(new Error('A card cannot be submitted currently.'));
    }

    if (!state.playerIds.includes(playerId)) {
      return Promise.reject(new Error('player is not in game'));
    }

    if (state.submittedPlayers.has(playerId)) {
      return Promise.reject(new Error('player has already submitted cards'));
    }

    if (!Array.isArray(cardIds)) {
      return Promise.reject(new Error('cardIds must be an array of ids'));
    }

    log('Submitting cards...');

    const playerDeck = state.playerDecks.get(playerId);

    if (cardIds.find(cardId => !playerDeck.has(cardId))) {
      return Promise.reject(new Error('cardIds contains a card that the user does not have'));
    }

    const submissionId = createId();

    state.submittedPlayers.set(playerId, submissionId);
    state.submittedCards.set(submissionId, {
      id: submissionId,
      cards: cardIds.map(cardId => playerDeck.get(cardId)),
      submittedAt: new Date(),
      playerId,
      cardIds,
    });

    if ((state.playerIds.length - 1) === state.submittedPlayers.size) { // don't count czar
      setCzarPicking();
    } else {
      setState(state);
    }

    return Promise.resolve();
  }

  function destroy() {
    cancelCountdown();
  }

  const getState = () => state;

  return {
    addPlayer,
    destroy,
    getState,
    removePlayer,
    submitCards,
    pickWinner,
    setState,
    subscribe,
  };
}

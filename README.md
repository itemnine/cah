# CAH

A simple CAH (short for Cards Against Humanity) implementation in JavaScript.

## Installation

```
npm install @ttn/cah --save
```

## API

```js
import createCah, {
  // events
  DECK_CHANGE,
  PLAYER_ADDED,
  PLAYER_REMOVED,
  PLAYER_SCORED,
  PLAYER_SKIPPED,
  STATE_CHANGED,

  // game states
  WAITING_FOR_PLAYERS,
  COUNTDOWN_TO_GAME,
  GAME_PLAYING,
  CZAR_PICKING,
  CZAR_PICKED,
} from '@ttn/cah';

// all arguments to the constructor are optional
const cah = createCah({
  // minimum # of players to require before starting a game
  minPlayers: Number | Infinity,
  // maximum # of players
  maxPlayers: Number | Infinity,
  // object of numbers for state change countdowns
  countdowns: {
     // # of seconds to wait before a game starts
    countdownToGame: Number,
    // # of seconds that players can submit a card in
    gameDuration: Number,
    // # of seconds to wait for a czar to pick a winner before skipping
    czarPicking: Number,
    // # of seconds to wait before creating a new game
    winnerPicked: Number,
  },
  // blackDeck should be an array of arrays containing strings
  blackDeck: [[String]],
  // whiteDeck should be a flat array of strings, the length of which should be at least minPlayers * 10
  whiteDeck: [String],
});

/*
 * Events are dispatched as the game's state changes, which you can observe by calling
 * subscribe().
 *
 * The `receiver` function provided to `subscribe` should accept one argument of an object
 * with `type` and `payload` properties.
 *
 * `type` will be one of:
 *    DECK_CHANGE | PLAYER_ADDED | PLAYER_REMOVED | PLAYER_SCORED | PLAYER_SKIPPED | STATE_CHANGED
 * `payload` will be a mixed type, depending on the event
 */
const unsubscribe = cah.subscribe(receiver: Function) : Function

cah.getState() : Object
cah.addPlayer(playerId: String) : Promise
cah.removePlayer(playerId: String) : Promise
cah.submitCards(playerId: String, [cardId: String]) : Promise
cah.pickWinner(cardId: String) : Promise
```

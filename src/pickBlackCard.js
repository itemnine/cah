import { shuffle } from 'lodash';

export default function pickBlackCard(currentDeck, fullDeck) {
  const card = currentDeck.shift();

  if (currentDeck.length === 0) {
    return { deck: shuffle(fullDeck), card };
  }

  return { deck: currentDeck, card };
}

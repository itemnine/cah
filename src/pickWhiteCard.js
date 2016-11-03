import createId from 'node-uuid';
import { shuffle } from 'lodash';

export default function pickWhiteCard(currentDeck, fullDeck) {
  const text = currentDeck.shift();
  const card = { id: createId(), text };

  if (currentDeck.length === 0) {
    return {
      deck: shuffle(fullDeck),
      card,
    };
  }

  return { deck: currentDeck, card };
}

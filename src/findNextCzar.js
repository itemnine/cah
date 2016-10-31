export default function findNextCzar(state) {
  if (state.playerIds.length <= 1) {
    return null;
  }

  if (!state.czarId) {
    return state.playerIds[0];
  }

  const index = state.playerIds.indexOf(state.czarId);

  if (index === -1) {
    return state.playerIds[0];
  }

  if (index >= state.playerIds.length - 1) {
    return state.playerIds[0];
  }

  return state.playerIds[index + 1];
}

import expect, { createSpy } from 'expect';
import findNextCzar from '../src/findNextCzar';

describe('findNextCzar', () => {
  describe('playerIds.length <= 1', () => {
    it('should return null', () => {
      expect(findNextCzar({
        playerIds: [],
      })).toBe(null);

      expect(findNextCzar({
        playerIds: [1],
      })).toBe(null);
    });
  });

  describe('playerIds.length > 1', () => {
    describe('the czarId is null', () => {
      it('should return the first item in the playerIds array', () => {
        expect(findNextCzar({
          czarId: null,
          playerIds: [1, 2, 3],
        })).toBe(1);
      });
    });

    describe('the czarId is not the last item', () => {
      it('should return the next item in the playerIds array', () => {
        expect(findNextCzar({
          czarId: 1,
          playerIds: [1, 2],
        })).toBe(2);

        expect(findNextCzar({
          czarId: 1,
          playerIds: [1, 2, 3],
        })).toBe(2);

        expect(findNextCzar({
          czarId: 2,
          playerIds: [1, 2, 3],
        })).toBe(3);
      });
    });

    describe('the czarId is the last item', () => {
      it('should return the first item in the playerIds array', () => {
        expect(findNextCzar({
          czarId: 4,
          playerIds: [1, 2, 3, 4],
        })).toBe(1);
      });
    });
  });
});

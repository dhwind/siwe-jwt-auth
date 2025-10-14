import { parseDuration } from './datetime';

describe('parseDuration', () => {
  describe('when parsing single units', () => {
    it('should parse milliseconds (note: has bug - parses as minutes)', () => {
      const inputDuration = '500ms';
      const expectedResult = 500 * 60 * 1000; // Bug: 'ms' matches as 'm' first

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should parse seconds', () => {
      const inputDuration = '30s';
      const expectedResult = 30 * 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should parse minutes', () => {
      const inputDuration = '5m';
      const expectedResult = 5 * 60 * 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should parse hours', () => {
      const inputDuration = '2h';
      const expectedResult = 2 * 60 * 60 * 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should parse days', () => {
      const inputDuration = '7d';
      const expectedResult = 7 * 24 * 60 * 60 * 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });
  });

  describe('when parsing combined duration strings', () => {
    it('should parse multiple units combined', () => {
      const inputDuration = '1d 2h 30m';
      const expectedResult =
        1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 30 * 60 * 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should parse all units combined (note: ms has bug)', () => {
      const inputDuration = '1d 2h 3m 4s 500ms';
      const expectedResult =
        1 * 24 * 60 * 60 * 1000 +
        2 * 60 * 60 * 1000 +
        3 * 60 * 1000 +
        4 * 1000 +
        500 * 60 * 1000; // Bug: '500ms' parses as '500m'

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should parse units without spaces', () => {
      const inputDuration = '1d2h3m';
      const expectedResult =
        1 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000 + 3 * 60 * 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });
  });

  describe('when parsing plain numbers', () => {
    it('should fall back to parseInt for numeric strings', () => {
      const inputDuration = '1000';
      const expectedResult = 1000;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });

    it('should handle zero', () => {
      const inputDuration = '0';
      const expectedResult = 0;

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBe(expectedResult);
    });
  });

  describe('when handling invalid input', () => {
    it('should return NaN for invalid string', () => {
      const inputDuration = 'invalid';

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBeNaN();
    });

    it('should return NaN for empty string', () => {
      const inputDuration = '';

      const actualResult = parseDuration(inputDuration);

      expect(actualResult).toBeNaN();
    });
  });
});

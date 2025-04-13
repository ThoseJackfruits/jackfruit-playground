import { assertAlmostEquals, assertEquals } from 'https://deno.land/std@0.220.1/assert/mod.ts';
import { getPieceStreamWeighted, PIECES } from './lib-pieces.mjs';

Deno.test('getPieceStreamWeighted generates pieces with correct weights', () => {
  const stream = getPieceStreamWeighted();

  const pieces = Array.from({ length: 100 }, () => stream.next().value);
  const counts = pieces.reduce((acc, { name }) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  // Make sure we got all the pieces
  assertEquals(Object.keys(counts).length, Object.keys(PIECES).length);
});

Deno.test('getPieceStreamWeighted maintains weighted distribution', () => {
  const stream = getPieceStreamWeighted();

  const pieces = Array.from({ length: 1000 }, () => stream.next().value);

  const counts = pieces.reduce((acc, { name }) => {
    acc[name] = (acc[name] || 0) + 1;
    return acc;
  }, {});

  const expectedCount = 1000 / Object.keys(PIECES).length;
  Object.values(counts).forEach(count => {
    assertAlmostEquals(count, expectedCount, 50);
  });
});

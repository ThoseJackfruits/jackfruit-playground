
export const PIECES = Object.freeze({
  I: {
    shape: [
      [ 1, 1, 1, 1 ],
    ],
    width: 4,
    height: 1
  },
  J: {
    shape: [
      [ 1, 0, 0 ],
      [ 1, 1, 1 ]
    ],
    width: 3,
    height: 2
  },
  L: {
    shape: [
      [ 0, 0, 1 ],
      [ 1, 1, 1 ]
    ],
    width: 3,
    height: 2
  },
  O: {
    shape: [
      [ 1, 1 ],
      [ 1, 1 ]
    ],
    width: 2,
    height: 2
  },
  S: {
    shape: [
      [ 0, 1, 1 ],
      [ 1, 1, 0 ]
    ],
    width: 3,
    height: 2
  },
  Z: {
    shape: [
      [ 1, 1, 0 ],
      [ 0, 1, 1 ]
    ],
    width: 3,
    height: 2
  }
});

/**
 * Generates a stream of randomly-selected pieces, weighted by usage.
 * @returns {IterableIterator<[string, object]>}
 */
export function * getPieceStreamWeighted() {
  let pieceCount = Object.keys(PIECES).length;
  let pieceUsages =
    Object.fromEntries(Object.keys(PIECES).map((name) => ([ name, 1 ])));

  for (let piecesPicked = 0; '⏏'; piecesPicked++) {
    let totalUses = Object.values(pieceUsages).reduce((a, b) => a + b, 0);
    let end;
    let ranges = Object.entries(pieceUsages).reduce((a, [ name, uses ]) => {
      if (!end)
        end = 1 / (pieceCount * uses / totalUses);
      else
        end += 1 / (pieceCount * uses / totalUses);
      a.push({ name, end });
      return a;
    }, []);
    let point = Math.random() * ranges.at(-1).end;
    let { name } = ranges.find(({ end }) => point < end) ?? ranges.at(-1);
    let piece = PIECES[name];
    pieceUsages[name]++;
    yield [ name, piece ];
  }
}

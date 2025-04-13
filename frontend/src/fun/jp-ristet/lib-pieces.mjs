
export const PIECES = deepFreeze({
  I: {
    shape: [
      [ 1, 1, 1, 1 ],
    ],
  },
  J: {
    shape: [
      [ 1, 0, 0 ],
      [ 1, 1, 1 ]
    ],
  },
  L: {
    shape: [
      [ 0, 0, 1 ],
      [ 1, 1, 1 ]
    ],
  },
  O: {
    shape: [
      [ 1, 1 ],
      [ 1, 1 ]
    ],
  },
  S: {
    shape: [
      [ 0, 1, 1 ],
      [ 1, 1, 0 ]
    ],
  },
  Z: {
    shape: [
      [ 1, 1, 0 ],
      [ 0, 1, 1 ]
    ],
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
    yield { name, ...piece };
  }
}

export function pieceWidth(piece) {
  return piece.shape[0].length;
}

export function pieceHeight(piece) {
  return piece.shape.length;
}

function deepFreeze(obj) {
  if (Array.isArray(obj))
    return Object.freeze(obj.map(deepFreeze));

  if (typeof obj !== 'object' || obj === null)
    return obj;

  return Object.freeze(
    Object.fromEntries(Object.entries(obj).map(([key, value]) => [
      key,
      typeof value === 'object' && value !== null
        ? deepFreeze(value)
        : value
    ]))
  );
}

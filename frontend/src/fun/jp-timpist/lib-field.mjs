const TAU = 2 * Math.PI;

/**
 * @typedef {Object} FieldLineRadius
 * @property {number} outer
 * @property {number} inner
 */

/**
 * @typedef {Object} FieldLine
 * @property {number} xOuter x-coordinate of the outer edge of the line
 * @property {number} yOuter y-coordinate of the outer edge of the line
 * @property {number} xInner x-coordinate of the inner edge of the line
 * @property {number} yInner y-coordinate of the inner edge of the line
 */

/**
 * @typedef {function(number, number): FieldLineRadius} FieldLineRadiusGetter
 */

/**
 * @param {number} n
 * @param {Object} opts
 * @param {FieldLineRadiusGetter} opts.getRadius
 *   Calculates the inner and outer radius for a point at index `i`.
 * @param {number} opts.offset
 *   The offset of the first point, in units of full turns.
 * @returns {Iterable<FieldLine>}
 */
export function * getFieldPoints(n, {
  getRadius=(angle, i) => ({ outer: 40, inner: 5 }),
  offset=0
}={}) {
  const shiftPerPoint = TAU / n;
  const offsetScaled = offset * shiftPerPoint;
  for (let i = 0; i < n; i++) {
    let angle = i * shiftPerPoint + offsetScaled;
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);
    let { outer, inner } = getRadius(angle, i);

    angle = angle.toFixed(2);
    let
      rOuter = outer.toFixed(2),
      xOuter = (50 + sin * outer).toFixed(2),
      yOuter = (50 + cos * outer).toFixed(2),
      rInner = inner.toFixed(2),
      xInner = (50 + sin * inner).toFixed(2),
      yInner = (50 + cos * inner).toFixed(2);

    yield {
      angle,
      angleN: +angle,
      rOuter,
      rOuterN: +rOuter,
      xOuter,
      xOuterN: +xOuter,
      yOuter,
      yOuterN: +yOuter,
      rInner,
      rInnerN: +rInner,
      xInner,
      xInnerN: +xInner,
      yInner,
      yInnerN: +yInner,
    }
  }
}

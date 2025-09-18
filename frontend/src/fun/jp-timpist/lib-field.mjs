const TAU = 2 * Math.PI;

/**
 * @typedef {Object} FieldLineRadius
 * @property {number} outer
 * @property {number} inner
 */

/**
 * @typedef {Object} FieldLine
 * @property {number} angle   angle of the point from center, as number
 * @property {string} angleF  angle of the point from center, as fixed
 *
 * @property {string} xInnerF x-coordinate of the inner edge, as fixed
 * @property {number} xInner  x-coordinate of the inner edge, as number
 * @property {string} yInnerF y-coordinate of the inner edge, as fixed
 * @property {number} yInner  y-coordinate of the inner edge, as number
 *
 * @property {string} xOuterF x-coordinate of the outer edge, as fixed
 * @property {number} xOuter  x-coordinate of the outer edge, as number
 * @property {string} yOuterF y-coordinate of the outer edge, as fixed
 * @property {number} yOuter  y-coordinate of the outer edge, as number
 */

/**
 * @typedef {function(number, number): FieldLineRadius} FieldLineRadiusGetter
 */

/**
 * @param {number} n
 * @param {Object} opts
 * @param {FieldLineRadiusGetter} opts.getRadius
 *   Calculates the inner and outer radius for a point at index `i`.
 * @param {number} opts.offsetAngular
 *   The offset of the first point, in units of full turns.
 * @returns {Iterable<FieldLine>}
 */
export function * getFieldPoints(n, {
  getRadius=(angle, i) => ({ outer: 40, inner: 5 }),
  offsetAngular=0
}={}) {
  const shiftPerPoint = TAU / n;
  const offsetScaled = offsetAngular * shiftPerPoint;
  for (let i = 0; i < n; i++) {
    let angle = i * shiftPerPoint + offsetScaled;
    let sin = Math.sin(angle);
    let cos = Math.cos(angle);
    let { outer, inner, innerOffsetY } = getRadius(angle, i);

    angle = angle.toFixed(2);
    let
      rOuterF = (outer + sin * innerOffsetY).toFixed(2),
      xOuterF = (50 + sin * outer).toFixed(2),
      yOuterF = (50 + cos * outer).toFixed(2),
      rInnerF = inner.toFixed(2),
      xInnerF = (50 + sin * inner).toFixed(2),
      yInnerF = (50 + innerOffsetY + cos * inner).toFixed(2);

    yield {
      angle:  +angle,
      angleF:  angle,

      rOuter: +rOuterF,
      rOuterF,
      xOuter: +xOuterF,
      xOuterF,
      yOuter: +yOuterF,
      yOuterF,

      rInner: +rInnerF,
      rInnerF,
      xInner: +xInnerF,
      xInnerF,
      yInner: +yInnerF,
      yInnerF,
    }
  }
}

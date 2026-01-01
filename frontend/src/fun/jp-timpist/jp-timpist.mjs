import { LitElement, html, css, svg } from 'lit';
import { eventOptions } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import * as field from './lib-field.mjs';
import * as stage from './lib-stage.mjs';
import * as util from './lib-util.mjs';

const LSKEY_WHEEL_SCALE = 'jp-timpist-wheel-scale'

const FIELD_TYPE_OPTIONS = Object.freeze([
  { label: 'Circle', value: 'circle' },
  { label: 'Ellipse', value: 'ellipse' },
  { label: 'Peanut', value: 'peanut' },
  { label: 'Square (rounded)', value: 'square-rounded' },
  { label: 'Square (sharp)', value: 'square-sharp' },
  { label: 'Star', value: 'star' },
]);

const ENEMY_VINE_CHUNKS      =     5;
const ENEMY_VINE_GROW_TIME   = 2_000;
const LASER_BLOB_TRAVEL_TIME =   800;

const SHIP_BASE_OFFSETS = Object.freeze([ 1, -1 ]);
const STATE = Object.freeze({
  PREVIEW: 'preview',
  PAUSE: 'pause',
  PLAY: 'play'
});

const jpKeysPressed = Symbol('keysPressed');

class JPTimpistElement extends LitElement {
  static properties = {
    data: { state: true },
    gsEnemyVines: { state: true },
    gsFieldLaneCount: { state: true, type: Number },
    gsFieldType: { state: true },
    gsLaserBlobs: { state: true },
    gsShip: { state: true },
    gsShipFloor: { state: true, type: Number },
    gsShipIndex: { state: true, type: Number },
    state: { type: String, reflect: true },
    updateToggle: { state: true },
    wheelScale: { state: true }
  };

  static styles = css`
    :host {
      display: flex;
      box-sizing: border-box;
      flex-direction: column;
      flex-shrink: 1;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
      padding: 0 var(--jp-common-padding) var(--jp-common-padding);
    }

    @media (min-width: 500px) {
      :host {
        flex-direction: row;
        gap: var(--jp-common-padding);
      }
    }

    form {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
      max-width: var(--jp-common-max-width);
    }

    form .field {
      display: grid;
      grid-template:
        'label select' 1fr /
        1fr 1fr;
      column-gap: var(--jp-common-padding);
    }

    form .field + .field {
      margin-top: var(--jp-common-padding);
    }

    kbd {
      all: unset;
      box-shadow:
        0 1px 1px rgba(0, 0, 0, 0.2),
        0 2px 0 0 var(--jp-color-shadow) inset;
      border-radius: var(--jp-common-border-radius);
      border: 1px solid var(--jp-color-accent);
      font-family: var(--jp-font-family-mono);
      padding: 0.1em 0.2em;
    }

    svg {
      max-width: 100%;
      max-height: 100%;
      margin-top: var(--jp-common-padding);
      stroke-linecap: round;
      flex-shrink: 1;
      aspect-ratio: 1;
      border-radius: var(--jp-common-border-radius);
    }

    svg:focus-visible {
      outline: 1px solid var(--jp-color-primary);
      outline-offset: 0px;
    }

    .note {
      line-height: 2.5;
      font-size: var(--jp-font-size-note);
    }

    svg circle.enemy.vine {
      color: forestgreen;
    }

    svg line.enemy.vine {
      color: lawngreen;
    }

    svg .field:not(.ship) {
      stroke: var(--jp-color-text);
    }

    svg .laserblob {
      color: salmon;
    }

    svg .ship {
      color: goldenrod;
    }

    @media (prefers-color-scheme: dark) {
      svg .laserblob {
        color: pink;
      }

      svg .ship {
        color: gold;
      }
    }
  `;

  [jpKeysPressed] = new Set;

  rsNowLast;
  rsNow;
  wheelScaleFound;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  constructor() {
    super();
    this.state = STATE.PREVIEW;
    let usp = new URLSearchParams(location.search);
    let wheelScale = localStorage.getItem(LSKEY_WHEEL_SCALE);
    this.wheelScaleFound = !!wheelScale;
    Object.assign(this, {
      gsLaserBlobs: new Set,
      gsEnemyVines: new Set,
      gsFieldLaneCount: usp.get('preview-line-count') || 11,
      gsFieldType: usp.get('preview-type') || 'circle',
      gsShip: 0,
      gsShipFloor: 0,
      gsShipIndex: 0,
      wheelScale: wheelScale || 10
    });
    Object.assign(this, this.getFieldLaneData());
  }

  connectedCallback() {
    super.connectedCallback();
    this.rafIndex = this.raffertyDownToBakerStreet();

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
    this.updateComplete.then(() => {
      this.svgElement = this.shadowRoot.querySelector('svg');
      setTimeout(() => this.svgElement.focus());
      this.runStage(stage.one);
    })
  }

  disconnectedCallback() {
    if (this.rafIndex != null)
      this.rafIndex = cancelAnimationFrame(this.rafIndex);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.data = null;
    this.state = null;
    super.disconnectedCallback();
  }

  // EVENT HANDLERS //////////////////////////////////////////////////////////

  handleFieldLaneCountChange(event) {
    let fieldLaneCount = +event.target.value;
    let diff = fieldLaneCount - this.gsFieldLaneCount;
    this.gsFieldLaneCount = fieldLaneCount;
    // Try to maintain (generally) same ship position as we add/remove lanes
    this.gsShip += this.gsShip / fieldLaneCount * diff;
    for (let blob of this.gsLaserBlobs)
      if (blob.index >= fieldLaneCount || blob.index < 0)
        this.gsLaserBlobs.delete(blob);
    Object.assign(this, this.getFieldLaneData())
    Object.assign(this, this.getShipData());

    let usp = new URLSearchParams(location.search);
    usp.set('preview-line-count', fieldLaneCount);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

  handleFieldTypeChange(event) {
    let fieldType = event.target.value;
    this.gsFieldType = fieldType;
    Object.assign(this, this.getFieldLaneData());

    let usp = new URLSearchParams(location.search);
    usp.set('preview-type', fieldType);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

  handleWheelScaleChange(event) {
    let scale = +event.target.value;
    this.setWheelScale(scale);
  }

  handleKeyDown = event => {
    if (!this.shouldHandleKeyEvent(event))
      return;
    switch (event.key) {
      case ' ':
        this.handleKeyDownSpace(event)
        break;
    }
  };

  handleKeyDownSpace(event) {
    event.preventDefault()
    if (this[jpKeysPressed].has(event.key))
      return;
    this[jpKeysPressed].add(event.key);
    let index = this.gsShipIndex;
    let now = Date.now();
    let key = `${ index }-${ now }`
    this.gsLaserBlobs.add({
      key,
      index,
      time: now
    });

    let gcTime = now - LASER_BLOB_TRAVEL_TIME * 2;
    let firstLB = this.gsLaserBlobs.values().next().value;

    // NaN abuse alert. Only trigger cleanup run if first lb is v old
    if (firstLB?.time < gcTime)
      for (let lb of this.gsLaserBlobs)
        if (lb.time < now - LASER_BLOB_TRAVEL_TIME)
          this.gsLaserBlobs.delete(lb);

    this.updateToggle = !this.updateToggle;
  }

  handleKeyUp = event => {
    if (!this.shouldHandleKeyEvent(event))
      return;
    this[jpKeysPressed].delete(event.key);
  };

  handleWheel(event) {
    let dist = event.deltaY;

    if (!this.wheelScaleFound) {
      this.setWheelScale((() => {
        switch (event.deltaMode) {
          case WheelEvent.DOM_DELTA_LINE:  return 1;
          case WheelEvent.DOM_DELTA_PAGE:  return 10;
          case WheelEvent.DOM_DELTA_PIXEL: return -120;
          default:                         return 10;
        }
      })());
    }

    if (this.wheelScale > 0) {
      dist *= this.wheelScale;
    } else {
      dist /= -this.wheelScale;
    }

    this.gsShip += dist;
    Object.assign(this, this.getShipData());
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  // API ///////////////////////////////////////////////////////////////////////

  checkCollisionBulletVine = (() => {
    let lbR, lbTT, lbX, lbY,  // laserBlob values
      eR=2, eX, eY, eTT,      // enemy values
      dist, meta;

    return (laserBlob, vine) => {
      if (vine.index && laserBlob.index !== vine.index)
        return false;
      eTT = Math.min(1, ((vine.damagedAt ?? this.rsNow) - vine.time) / vine.growTime);
      lbTT = (this.rsNow - laserBlob.time) / LASER_BLOB_TRAVEL_TIME;

      if (eTT >= 1 || lbTT >= 1)
        return false;

      ({ meta } = this.gsFieldLanePointPairs.at(vine.index));
      eX  = util.lerp(meta.xInner, meta.xOuter,  eTT);
      eY  = util.lerp(meta.yInner, meta.yOuter,  eTT);
      lbX = util.lerp(meta.xOuter, meta.xInner, lbTT);
      lbY = util.lerp(meta.yOuter, meta.yInner, lbTT);
      lbR = util.lerp(2,           0.5,         lbTT);

      dist = Math.sqrt((eX-lbX)**2 + (eY-lbY)**2);
      return dist <= lbR + eR;
    }
  })();

  checkCollisions = (() => {
    let vine, laserBlob, vineLoss;
    return () => {
      for (laserBlob of this.gsLaserBlobs)
        for (vine of this.gsEnemyVines)
          if (this.checkCollisionBulletVine(laserBlob, vine)) {
            vineLoss = vine.growTime / ENEMY_VINE_CHUNKS;
            laserBlob.time = 0;
            if (vine.damagedAt)
              vine.damagedAt -= vineLoss;
            else
              vine.damagedAt = this.rsNow;
            if ((vine.damagedAt - vineLoss/2) <= vine.time)
              this.gsEnemyVines.delete(vine); // remove if just a stub left
          }
    };
  })();

  * generateEnemies({ avoid, enemyType, placement, quantity }) {
    let index;
    let indexIterator =
      stage.PLACEMENT_FN[placement](this.gsFieldLaneCount, quantity, avoid)();
    for (let i = 0; i < quantity; i++) {
      index = indexIterator.next().value;
      if ('string' === typeof index)
        throw new Error(`got string index: ${ index }`);
      yield {
        type: enemyType,
        index
      };
    }
  }

  getFieldLaneData() {
    const [ ...gsFieldLanePoints ] = field.getPoints(this.gsFieldLaneCount, {
      getRadius: this.getRadiusGetter(),
      offset: 0.5
    });
    const [ ...gsFieldLanePointPairs ] = util.pairs(gsFieldLanePoints);

    let pair, fl0, fl1,
        rOuterF, rOuter, rInnerF, rInner,
        xOuterF, xOuter, yOuterF, yOuter,
        xInnerF, xInner, yInnerF, yInner;

    for (pair of gsFieldLanePointPairs) {
      [ fl0, fl1 ] = pair;
      rOuterF = util.avg2(fl0.rOuter, fl1.rOuter).toFixed(2),
      rOuter  = +rOuterF,
      xOuterF = util.avg2(fl0.xOuter, fl1.xOuter).toFixed(2),
      xOuter  = +xOuterF,
      yOuterF = util.avg2(fl0.yOuter, fl1.yOuter).toFixed(2),
      yOuter  = +yOuterF,
      rInnerF = util.avg2(fl0.rInner, fl1.rInner).toFixed(2),
      rInner  = +rInnerF,
      xInnerF = util.avg2(fl0.xInner, fl1.xInner).toFixed(2),
      xInner = +xInnerF,
      yInnerF = util.avg2(fl0.yInner, fl1.yInner).toFixed(2),
      yInner = +yInnerF;

      pair.meta = {
        rInner,
        rInnerF,
        xInner,
        xInnerF,
        yInner,
        yInnerF,
        rOuter,
        rOuterF,
        xOuter,
        xOuterF,
        yOuter,
        yOuterF,
      };
    }

    return {
      gsFieldLanePoints,
      gsFieldLanePointPairs
    };
  }

  getRadiusGetter() {
    switch (this.gsFieldType) {
      case 'circle':
        return (angle, i) => ({ outer: 40, inner: 5, innerOffsetY: 10 });
      case 'ellipse':
      let outer;
        return (angle, i) => {
          outer = 30 + 15 * (1 - Math.abs(Math.cos(angle)));
          return {
            outer,
            inner: Math.sqrt(outer) * 2
          };
        };
      case 'peanut':
        return (angle, i) => ({
            outer:
              30 +
              15 * Math.abs(Math.sin(angle)) ** 1.2 -
              15 * Math.abs(Math.cos(angle)) ** 1.8,
            inner: 5,
            innerOffsetY: 3
        });
      case 'star':
        return (angle, i) => ({
          outer: i % 2 === 0 ? 20 : 40,
          inner: i % 2 === 0 ? 3.5 : 5,
          innerOffsetY: 3
        });
      case 'square-rounded':
        return (angle, i) => ({
          outer: 40 * (Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle))),
          inner: 5,
          innerOffsetY: 20
        });
      case 'square-sharp':
        let maxComponent;
        return (angle, i) => {
          maxComponent = Math.max(
            Math.abs(Math.cos(angle)),
            Math.abs(Math.sin(angle)));

          return {
            outer: maxComponent > 0 ? 40 / maxComponent : 40,
            inner: 5,
            innerOffsetY: 20
          };
        };
    }
  }

  getShipData() {
    let gsShipFloor = Math.floor(this.gsShip);
    let gsShipIndex = gsShipFloor % this.gsFieldLanePointPairs.length;
    if (gsShipIndex < 0)
      gsShipIndex += this.gsFieldLanePointPairs.length;
    return {
      gsShipFloor,
      gsShipIndex
    };
  }

  raffertyDownToBakerStreet() {
    let loop = () => {
      this.checkCollisions();
      this.updateToggle = !this.updateToggle;
      requestAnimationFrame(loop);
    };

    return requestAnimationFrame(loop);
  }

  async runStage(stage) {
    for await (let action of stage()) {
      await this.runAction(action);
    }
  }

  async runAction(action) {
    console.debug('ACTION RUN', action.type);

    switch (action.type) {
      case stage.ACTION.SPAWN_ENEMY:
        this.runActionSpawnEnemy(action);
        break;
      case stage.ACTION.STAGE_END:
        this.runActionStageEnd(action);
        break;
      case stage.ACTION.WAIT:
        await new Promise(resolve => setTimeout(resolve, action.duration));
        break;
      default:
        console.warn('ACTION UNH', action.type);
    }
  }

  runActionSpawnEnemy(action) {
    let { enemyType } = action;
    let now = Date.now();

    switch (enemyType) {
      case stage.ENEMY.VINE:
        action.avoid = this.gsEnemyVines.values().map(vine => vine.index);
        for (let vine of this.generateEnemies(action)) {
          vine.time = now;
          // 75–125% of base grow time
          vine.growTime = ENEMY_VINE_GROW_TIME * (Math.random() * 0.5 + 0.75);
          this.gsEnemyVines.add(vine);
        }
        break;
    }
  }

  runActionStageEnd(action) {
    if (action.next)
      this.runStage(action.next);
  }

  setWheelScale(scale) {
    this.wheelScaleFound ||= true;
    scale ||= 1; // if 0
    localStorage.setItem(LSKEY_WHEEL_SCALE, scale);
    this.wheelScale = scale;
  }

  shouldHandleKeyEvent(event) {
    return (
      event.target === this.svgElement ||
      event.target === this ||
      event.target === document.body
    );
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    this.rsNowLast = this.rsNow;
    this.rsNow = Date.now();

    return html`
      <div class="config">
        <form @submit=${ this.handleSubmit }>
          <div class="field">
            <label for="field-type">Field type</label>
            <select @change=${ this.handleFieldTypeChange } id="field-type">
              ${ repeat(
                FIELD_TYPE_OPTIONS,
                ({ label, value }) => html`
                  <option
                    ?selected=${ this.gsFieldType === value }
                    value="${ value }">${ label }</option>
                `
              ) }
            </select>
          </div>
          <div class="field">
            <label for="field-lane-count">Side count</label>
            <input
              type="range"
              min="3"
              max="20"
              step="1"
              @input=${ this.handleFieldLaneCountChange}
              id="field-lane-count"
              value="${ this.gsFieldLaneCount }">
          </div>
          <div class="field">
            <label for="wheel-scale">Scroll scale</label>
            <input
              type="range"
              min="-200"
              max="200"
              value="${ this.wheelScale }"
              @change=${ this.handleWheelScaleChange }
              id="wheel-scale">
          </div>
        </form>

        <p id="instructions">
          scroll and <kbd>&nbsp;&nbsp;&nbsp;space&nbsp;&nbsp;&nbsp;</kbd>
          <br/>
          <span class="note">(scroll devices with inertia work best)</span>
        </p>
      </div>
      <svg
        @keydown="${ this.handleKeyDown }"
        @keyup="${ this.handleKeyUp }"
        @wheel="${ this.handleWheel }"
        aria-describedby="instructions"
        tabindex="0"
        viewBox="0 0 100 100">
        ${ this.renderField() }
        ${ this.renderLaserBlobs() }
        ${ this.renderEnemyVines() }
        ${ this.renderShip() }
      </svg>
    `;
  }

  renderField = (() => {
    let points, pointPairs, shipIndex,
        flShip0, flShip1, pair, point;

    return function * () {
      ({
        gsFieldLanePoints: points,
        gsFieldLanePointPairs: pointPairs,
        gsShipIndex: shipIndex
      } = this);

      [ flShip0, flShip1 ] = pointPairs.at(shipIndex);

      for (pair of pointPairs) { ///////////////////////////////////// INSIDE PATH
        yield svg`
          <line
            class="field"
            x1="${ pair[0].xInnerF }"
            y1="${ pair[0].yInnerF }"
            x2="${ pair[1].xInnerF }"
            y2="${ pair[1].yInnerF }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>
        `;
      }

      for (point of points) { /////////////////////////////// INSIDE-OUTSIDE LINES
        yield svg`
          <line
            class="${ classMap({
              field: true,
              ship: point === flShip0 || point === flShip1
            }) }"
            x1="${ point.xInnerF }"
            y1="${ point.yInnerF }"
            x2="${ point.xOuterF }"
            y2="${ point.yOuterF }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>
        `;
      }

      for (pair of pointPairs) { //////////////////////////////////// OUTSIDE PATH
        yield svg`
          <line
            class="field"
            x1="${ pair[0].xOuterF }"
            y1="${ pair[0].yOuterF }"
            x2="${ pair[1].xOuterF }"
            y2="${ pair[1].yOuterF }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>
        `;
      }
    }
  })();

  renderEnemyVines = (() => {
    let meta, vine, tt, now, pointPairs;

    return function * () {
      ({ gsFieldLanePointPairs: pointPairs } = this);

      now = Date.now();

      for (vine of this.gsEnemyVines) {
        if (vine.growTime <= 0)
          continue;

        // TODO this should be a lose-a-life scenario if it's >=1
        tt = Math.min(1, ((vine.damagedAt ?? now) - vine.time) / vine.growTime);
        ({ meta } = pointPairs.at(vine.index));

        yield svg`
          <line
            class="enemy vine"
            x1="${ util.lerp(meta.xInner, meta.xOuter, tt) }"
            y1="${ util.lerp(meta.yInner, meta.yOuter, tt) }"
            x2="${ meta.xInner }"
            y2="${ meta.yInner }"
            fill="none"
            stroke="currentColor">
          </line>
        `;

        if (!vine.damagedAt)
          yield svg`<circle
            class="enemy vine"
            cx="${ util.lerp(meta.xInner, meta.xOuter, tt) }"
            cy="${ util.lerp(meta.yInner, meta.yOuter, tt) }"
            r="2"
            fill="currentColor"
            stroke="none">
          </circle>
        `;
      }
    }
  })();

  renderLaserBlobs = (() => {
    let blob, meta, pointPairs, now, tt;

    return function * () {
      ({ gsFieldLanePointPairs: pointPairs, rsNow: now } = this);

      for (blob of this.gsLaserBlobs) {
        ({ meta } = pointPairs.at(blob.index));
        tt = (now - blob.time) / LASER_BLOB_TRAVEL_TIME;
        if (tt >= 1)
          continue;

        yield svg`
          <circle
            class="laserblob"
            cx="${ util.lerp(meta.xOuter, meta.xInner, tt) }"
            cy="${ util.lerp(meta.yOuter, meta.yInner, tt) }"
            r="${  util.lerp(2,           0.5,         tt) }"
            fill="currentColor"
            stroke="none">
          </circle>
        `;
      }
    };
  })();

  renderShip = (() => {
    let pointPairs, ship, shipFloor, shipIndex,
        shipT, shipPair, shipX, shipY,
        shipAngle, shipAngleC, shipAngleS,
        armLength, offset;

    return function * () {
      ({
        gsFieldLanePointPairs: pointPairs,
        gsShip: ship,
        gsShipFloor: shipFloor,
        gsShipIndex: shipIndex
      } = this);

      shipT = ship - shipFloor;
      shipPair = pointPairs.at(shipIndex);
      shipX = util.lerp(
        shipPair[0].xShip,
        shipPair[1].xShip,
        shipT
      );
      shipY = util.lerp(
        shipPair[0].yShip,
        shipPair[1].yShip,
        shipT
      );
      shipAngle = util.lerp(
        shipPair[0].angleActual,
        shipPair[1].angleActual,
        shipT
      );

      shipAngleC = Math.cos(shipAngle);
      shipAngleS = Math.sin(shipAngle);
      armLength = shipPair.meta.rOuter / 7;

      for (offset of SHIP_BASE_OFFSETS) {
        yield svg`
          <line
            class="ship"
            x1="${ shipPair[0].xOuterF }"
            y1="${ shipPair[0].yOuterF }"
            x2="${ shipX+shipAngleC*offset }"
            y2="${ shipY-shipAngleS*offset }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>

          <line
            class="ship"
            x1="${ shipPair[1].xOuterF }"
            y1="${ shipPair[1].yOuterF }"
            x2="${ shipX-shipAngleC*offset }"
            y2="${ shipY+shipAngleS*offset }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>
        `;
      }

      return yield svg`
        <!-- Ship arms -->

        <line
          class="ship"
          x1="${ shipPair[1].xOuterF }"
          y1="${ shipPair[1].yOuterF }"
          x2="${ (
            shipPair[1].xOuter +
            armLength * Math.cos(shipPair[1].angle + 0.75*Math.PI)
          ).toFixed(2) }"
          y2="${ (
            shipPair[1].yOuter -
            armLength * Math.sin(shipPair[1].angle + 0.65*Math.PI)
          ).toFixed(2) }"
          stroke="currentColor"
          stroke-width="0.5px">
        </line>

        <line
          class="ship"
          x1="${ shipPair[0].xOuterF }"
          y1="${ shipPair[0].yOuterF }"
          x2="${ (
            shipPair[0].xOuter +
            armLength * Math.cos(shipPair[0].angle + 0.25*Math.PI)
          ).toFixed(2) }"
          y2="${ (
            shipPair[0].yOuter -
            armLength * Math.sin(shipPair[0].angle + 0.35*Math.PI)
          ).toFixed(2) }"
          stroke="currentColor"
          stroke-width="0.5px">
        </line>
      `;
    }
  })();
}

// It's just Object.assign under the hood. lit seems to pick up options directly
// from the handler function's properties.
eventOptions({ passive: true })(JPTimpistElement.prototype.handleWheel);

customElements.define('jp-timpist', JPTimpistElement);

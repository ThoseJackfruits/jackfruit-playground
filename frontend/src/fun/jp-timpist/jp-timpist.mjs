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

const LASER_BLOB_TRAVEL_TIME = 800;

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
    gsFieldLaneCount: { state: true },
    gsFieldType: { state: true },
    gsLaserBlobs: { state: true },
    gsShip: { state: true },
    gsShipFloor: { state: true },
    gsShipIndex: { state: true },
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
      max-width: var(--jp-common-max-width);
    }

    form {
      flex-shrink: 0;
      display: flex;
      flex-direction: column;
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
      overflow: hidden;
      flex-shrink: 1;
    }

    .note {
      line-height: 2.5;
      font-size: var(--jp-font-size-note);
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

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  constructor() {
    super();
    this.state = STATE.PREVIEW
    let usp = new URLSearchParams(location.search);
    Object.assign(this, {
      gsLaserBlobs: [],
      gsEnemyVines: [],
      gsFieldLaneCount: usp.get('preview-line-count') || 11,
      gsFieldType: usp.get('preview-type') || 'circle',
      gsShip: 0,
      gsShipFloor: 0,
      gsShipIndex: 0,
      wheelScale: localStorage.getItem(LSKEY_WHEEL_SCALE) || 120
    });
    Object.assign(this, this.getFieldLaneData());
  }

  connectedCallback() {
    super.connectedCallback();
    let updated;
    this.rafIndex = this.raffertyDownToBakerStreet();

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
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

  firstUpdated() {
    this.svgElement = this.shadowRoot.querySelector('svg');
    this.runStage(stage.one);
  }

  // EVENT HANDLERS //////////////////////////////////////////////////////////

  handleFieldLaneCountChange(event) {
    let fieldLaneCount = +event.target.value;
    let diff = fieldLaneCount - this.gsFieldLaneCount;
    this.gsFieldLaneCount = fieldLaneCount;
    // Try to maintain (generally) same ship position as we add/remove lanes
    this.gsShip += this.gsShip / fieldLaneCount * diff;
    Object.assign(this, this.getFieldLaneData())
    Object.assign(this, this.getShipData());
    this.gsLaserBlobs = this.gsLaserBlobs
      .filter(laserBlob => Math.abs(laserBlob.index) < fieldLaneCount);

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
    localStorage.setItem(LSKEY_WHEEL_SCALE, scale);
    this.wheelScale = scale;
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
    let time = Date.now();
    let key = `${ index }-${ time }`
    this.gsLaserBlobs.push({
      key,
      index,
      time
    });

    let gcTime = time - LASER_BLOB_TRAVEL_TIME * 2;

    if (this.gsLaserBlobs[0]?.time < gcTime)  // NaN abuse alert
      this.gsLaserBlobs = this.gsLaserBlobs
        .filter(blob => blob.time > gcTime);

    this.updateToggle = !this.updateToggle;
  }

  handleKeyUp = event => {
    if (!this.shouldHandleKeyEvent(event))
      return;
    this[jpKeysPressed].delete(event.key);
  };

  handleWheel(event) {
    let dist = event.deltaY;

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

  * generateEnemies({ enemyType, placement, quantity }) {
    let getIndex = stage.PLACEMENT_FN[placement](this.gsFieldLaneCount, quantity);
    let index;
    for (let i = 0; i < quantity; i++) {
      index = getIndex(i).value;
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

    for (let pair of gsFieldLanePointPairs) {
      let [ fl0, fl1 ] = pair;
      let
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
        return (angle, i) => {
          let outer = 30 + 15 * (1 - Math.abs(Math.cos(angle)));
          let inner = Math.sqrt(outer) * 2;
          return { outer, inner };
        };
      case 'peanut':
        return (angle, i) => {
          let outer =
            30 +
            15 * Math.abs(Math.sin(angle)) ** 1.2 -
            15 * Math.abs(Math.cos(angle)) ** 1.8;
          let inner = 5;
          return { outer, inner, innerOffsetY: 3 };
        };
      case 'star':
        return (angle, i) => {
          let outer = 40;
          let inner = 5;
          if (i % 2 === 0) {
            outer = 20;
            inner = 3.5;
          }
          return { outer, inner, innerOffsetY: 3 };
        };
      case 'square-rounded':
        return (angle, i) => {
          let outer = 40;
          let inner = 5;

          outer *= Math.abs(Math.cos(angle)) + Math.abs(Math.sin(angle));

          return { outer, inner, innerOffsetY: 20 };
        };
      case 'square-sharp':
        return (angle, i) => {
          let maxComponent = Math.max(
            Math.abs(Math.cos(angle)),
            Math.abs(Math.sin(angle)));
          let outer = maxComponent > 0 ? 40 / maxComponent : 40;
          let inner = 5;

          return { outer, inner, innerOffsetY: 20 };
        };
    }
  }

  getShipData() {
    let gsShipFloor = Math.floor(this.gsShip);
    return {
      gsShipFloor,
      gsShipIndex: gsShipFloor % this.gsFieldLanePointPairs.length
    };
  }

  raffertyDownToBakerStreet() {
    let updated;
    let loop = () => {
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
    switch (action.enemyType) {
      case stage.ENEMY.VINE:
        this.gsEnemyVines = [
          ...this.gsEnemyVines,
          ...this.generateEnemies(action)
        ];
        break;
    }
  }

  runActionStageEnd(action) {
    if (action.next)
      this.runStage(action.next);
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
          <input type="range" min="-200" max="200" value="${ this.wheelScale }" @change=${ this.handleWheelScaleChange } id="wheel-scale">
        </div>
      </form>

      <p id="instructions">
        scroll and <kbd>&nbsp;&nbsp;&nbsp;space&nbsp;&nbsp;&nbsp;</kbd>
        <br/>
        <span class="note">(scroll devices with inertia work best)</span>
      </p>
      <svg
        @keydown="${ this.handleKeyDown }"
        @keyup="${ this.handleKeyUp }"
        @wheel="${ this.handleWheel }"
        aria-describedby="instructions"
        tabindex="0"
        viewBox="0 0 100 100">
        ${ this.renderField() }
        ${ this.renderLaserBlobs() }
        ${ this.renderShip() }
      </svg>
    `;
  }

  * renderField() {
    const {
      gsFieldLanePoints: points,
      gsFieldLanePointPairs: pointPairs,
      gsShipIndex: shipIndex
    } = this;

    let [ flShip0, flShip1 ] = pointPairs.at(shipIndex);
    let pair, point;

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

  * renderLaserBlobs() {
    let {
      gsFieldLanePointPairs: pointPairs,
      rsNow: now
    } = this;
    let meta, tt

    for (let blob of this.gsLaserBlobs) {
      ({ meta } = pointPairs.at(blob.index));
      tt = (now - blob.time) / LASER_BLOB_TRAVEL_TIME;
      if (tt >= 1)
        continue;

      yield svg`
        <circle
          class="laserblob"
          cx="${ util.lerp(meta.xOuter, meta.xInner, tt) }"
          cy="${ util.lerp(meta.yOuter, meta.yInner, tt) }"
          r="${  util.lerp(2,           0.5,           tt) }"
          fill="currentColor"
          stroke="none">
        </circle>
      `;
    }
  }

  * renderShip() {
    const {
      gsFieldLanePointPairs: pointPairs,
      gsShip: ship,
      gsShipFloor: shipFloor,
      gsShipIndex: shipIndex
    } = this;

    let shipT = ship - shipFloor;
    let shipPair = pointPairs.at(shipIndex);
    let shipX = util.lerp(
      shipPair[0].xShip,
      shipPair[1].xShip,
      shipT
    );
    let shipY = util.lerp(
      shipPair[0].yShip,
      shipPair[1].yShip,
      shipT
    );
    let shipAngle = util.lerp(
      shipPair[0].angleActual,
      shipPair[1].angleActual,
      shipT
    );

    let shipAngleC = Math.cos(shipAngle);
    let shipAngleS = Math.sin(shipAngle);
    let armLength = shipPair.meta.rOuter / 7;
    let offset;

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
}

const keyOnIndex = (_, index) => index;

// It's just Object.assign under the hood. lit seems to pick up options directly
// from the handler function's properties.
eventOptions({ passive: true })(JPTimpistElement.prototype.handleWheel);

customElements.define('jp-timpist', JPTimpistElement);

import { LitElement, html, css, svg } from 'lit';
import { eventOptions } from 'lit/decorators.js';
import { classMap } from 'lit/directives/class-map.js';
import { repeat } from 'lit/directives/repeat.js';
import { getFieldPoints } from './lib-field.mjs';
import * as util from './lib-util.mjs';

const FIELD_TYPE_OPTIONS = Object.freeze([
  { label: 'Circle', value: 'circle' },
  { label: 'Ellipse', value: 'ellipse' },
  { label: 'Peanut', value: 'peanut' },
  { label: 'Square (rounded)', value: 'square-rounded' },
  { label: 'Square (sharp)', value: 'square-sharp' },
  { label: 'Star', value: 'star' },
]);

const LASER_BLOB_TRAVEL_TIME = 800;

const STATE = Object.freeze({
  PREVIEW: 'preview',
  PAUSE: 'pause',
  PLAY: 'play'
});

const jpKeysPressed = Symbol('keysPressed');

class JPTimpistElement extends LitElement {
  static properties = {
    data: { state: true },
    gsFieldLineCount: { state: true },
    gsFieldType: { state: true },
    gsLaserBlobs: { state: true },
    gsShip: { state: true },
    gsShipFloor: { state: true },
    gsShipIndex: { state: true },
    state: { type: String, reflect: true },
    updateToggle: { state: true }
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

    svg {
      max-width: 100%;
      max-height: 100%;
      margin-top: var(--jp-common-padding);
      stroke-linecap: round;
      overflow: hidden;
      flex-shrink: 1;
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

  rsNow;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  constructor() {
    super();
    this.state = STATE.PREVIEW
    let usp = new URLSearchParams(location.search);
    Object.assign(this, {
      gsLaserBlobs: [],
      gsFieldLineCount: usp.get('preview-line-count') || 11,
      gsFieldType: usp.get('preview-type') || 'circle',
      gsShip: 0,
      gsShipFloor: 0,
      gsShipIndex: 0
    });
    Object.assign(this, this.getFieldLineData());
  }

  connectedCallback() {
    super.connectedCallback();

    document.addEventListener('keydown', this.handleKeyDown);
    document.addEventListener('keyup', this.handleKeyUp);
  }

  disconnectedCallback() {
    // if (this.rafIndex != null)
      // this.rafIndex = cancelAnimationFrame(this.rafIndex);
    document.removeEventListener('keydown', this.handleKeyDown);
    document.removeEventListener('keyup', this.handleKeyUp);
    this.data = null;
    this.state = null;
    super.disconnectedCallback();
  }

  firstUpdated() {
    this.svgElement = this.shadowRoot.querySelector('svg');
  }

  updated() {
    requestAnimationFrame(() => this.updateToggle = !this.updateToggle);
  }

  // EVENT HANDLERS //////////////////////////////////////////////////////////

  handleFieldLineCountChange(event) {
    let fieldLineCount = event.target.value;
    this.gsFieldLineCount = fieldLineCount;

    Object.assign(this, this.getFieldLineData());
    let usp = new URLSearchParams(location.search);
    usp.set('preview-line-count', fieldLineCount);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

  handleFieldTypeChange(event) {
    let fieldType = event.target.value;
    this.data = { ...this.data, fieldType };
    Object.assign(this, this.getFieldLineData());
    let usp = new URLSearchParams(location.search);
    usp.set('preview-type', fieldType);
    history.replaceState({}, '', `?${ usp.toString() }`);
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
    let { gsFieldLinePointPairs } = this;
    let index = Math.floor(this.gsShip) % gsFieldLinePointPairs.length;
    let time = Date.now();
    let key = `${ index }-${ time }`
    let [ fl1, fl2 ] = gsFieldLinePointPairs.at(index)
    this.gsLaserBlobs.push({
      key,
      index,
      time
    });

    let fTime = time - LASER_BLOB_TRAVEL_TIME * 2;

    if (this.gsLaserBlobs[0]?.time < fTime)  // NaN abuse alert
      this.gsLaserBlobs= this.gsLaserBlobs
        .filter(blob => blob.time > fTime);

    this.updateToggle = !this.updateToggle;
  }

  handleKeyUp = event => {
    if (!this.shouldHandleKeyEvent(event))
      return;
    this[jpKeysPressed].delete(event.key);
  };

  handleWheel(event) {
    let dist = event.deltaY;
    switch (event.deltaMode) {
      case WheelEvent.DOM_DELTA_PIXEL:
        dist /= 120;
      case WheelEvent.DOM_DELTA_LINE:
        break;
      case WheelEvent.DOM_DELTA_PAGE:
        dist *= 100;
        break;
    }

    this.gsShip += dist;
    this.gsShipFloor = Math.floor(this.gsShip);
    this.gsShipIndex = this.gsShipFloor % this.gsFieldLinePointPairs.length;
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  // API ///////////////////////////////////////////////////////////////////////

  getFieldLineData() {
    const [ ...gsFieldLinePoints ] = getFieldPoints(this.gsFieldLineCount, {
      getRadius: this.getRadiusGetter(),
      offset: 0.5
    });
    const [ ...gsFieldLinePointPairs ] = util.pairs(gsFieldLinePoints);

    for (let pair of gsFieldLinePointPairs) {
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
      gsFieldLinePoints,
      gsFieldLinePointPairs
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

  shouldHandleKeyEvent(event) {
    return (
      event.target === this.svgElement ||
      event.target === this ||
      event.target === document.body
    );
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
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
          <label for="field-line-count">Side count</label>
          <input
            type="range"
            min="3"
            max="20"
            step="1"
            @input=${ this.handleFieldLineCountChange}
            id="field-line-count"
            value="${ this.gsFieldLineCount }">
        </div>
      </form>
      <svg
        @keydown="${ this.handleKeyDown }"
        @keyup="${ this.handleKeyUp }"
        @wheel="${ this.handleWheel }"
        tabindex="0"
        viewBox="0 0 100 100">
        ${ this.renderField() }
        ${ this.renderLaserBlobs() }
        ${ this.renderShip() }
      </svg>
    `;
  }

  renderField() {
    const {
      gsFieldLinePoints: points,
      gsFieldLinePointPairs: pointPairs,
      gsShipIndex: shipIndex
    } = this;

    let [ flShip0, flShip1 ] = pointPairs.at(shipIndex);

    return svg`
      <!-- Inside path -->
      ${ repeat(
        pointPairs,
        pair => pair[0].angleF,
        pair => svg`
          <line
            class="field"
            x1="${ pair[0].xInnerF }"
            y1="${ pair[0].yInnerF }"
            x2="${ pair[1].xInnerF }"
            y2="${ pair[1].yInnerF }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>
        `
      ) }

      <!-- Inside-outside lines -->
      ${ repeat(
        points,
        point => point.angleF,
        point => svg`
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
        `
      ) }

      <!-- Outside path -->
      ${ repeat(
        pointPairs,
        pair => pair[0].angleF,
        pair => svg`
          <line
            class="field"
            x1="${ pair[0].xOuterF }"
            y1="${ pair[0].yOuterF }"
            x2="${ pair[1].xOuterF }"
            y2="${ pair[1].yOuterF }"
            stroke="currentColor"
            stroke-width="0.5px">
          </line>
        `
      ) }
    `;
  }

  renderLaserBlobs() {
    let {
      gsFieldLinePointPairs: pointPairs,
      rsNow: now
    } = this;
    let laserBlobs = this.gsLaserBlobs;

    return repeat(
      laserBlobs,
      blob => blob.key,
      blob => {
        let { meta } = pointPairs.at(blob.index);
        let tt = (now - blob.time) / LASER_BLOB_TRAVEL_TIME;
        if (tt >= 1)
          return '';
        return svg`
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
    )
  }

  renderShip() {
    const {
      gsFieldLinePoints: points,
      gsFieldLinePointPairs: pointPairs,
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
    let armLength = shipPair.meta.rOuter / 5;

    return svg`
      <!-- Ship base -->

      ${ repeat(
        [ 1, -1 ],
        offset => offset,
        offset => svg`
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
      `) }

      <!-- Ship arms -->

      <line
        class="ship"
        x1="${ shipPair[1].xOuterF }"
        y1="${ shipPair[1].yOuterF }"
        x2="${ shipPair[1].xOuter + armLength * Math.cos(shipPair[1].angle + 0.75*Math.PI) }"
        y2="${ shipPair[1].yOuter - armLength * Math.sin(shipPair[1].angle + 0.75*Math.PI) }"
        stroke="currentColor"
        stroke-width="0.5px">
      </line>

      <line
        class="ship"
        x1="${ shipPair[0].xOuterF }"
        y1="${ shipPair[0].yOuterF }"
        x2="${ shipPair[0].xOuter + armLength * Math.cos(shipPair[0].angle + 0.25*Math.PI) }"
        y2="${ shipPair[0].yOuter - armLength * Math.sin(shipPair[0].angle + 0.25*Math.PI) }"
        stroke="currentColor"
        stroke-width="0.5px">
      </line>
    `;
  }
}

// It's just Object.assign under the hood. lit seems to pick up options directly
// from the handler function's properties.
eventOptions({ passive: true })(JPTimpistElement.prototype.handleWheel);

customElements.define('jp-timpist', JPTimpistElement);

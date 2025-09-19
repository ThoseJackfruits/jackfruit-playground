import { LitElement, html, css, svg } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { getFieldPoints } from './lib-field.mjs';
import { lerp, pairs } from './lib-util.mjs';

const FIELD_TYPE_OPTIONS = Object.freeze([
  { label: 'Circle', value: 'circle' },
  { label: 'Ellipse', value: 'ellipse' },
  { label: 'Peanut', value: 'peanut' },
  { label: 'Square (rounded)', value: 'square-rounded' },
  { label: 'Square (sharp)', value: 'square-sharp' },
  { label: 'Star', value: 'star' },
]);

const STATE = Object.freeze({
  PREVIEW: 'preview',
  PAUSE: 'pause',
  PLAY: 'play'
});

class JPTimpistElement extends LitElement {
  static properties = {
    state: { type: String, reflect: true },
    data: { state: true },
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
      stroke: var(--jp-color-text);
      stroke-linecap: round;
      overflow: hidden;
      flex-shrink: 1;
    }
  `;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    this.state = STATE.PREVIEW
    let usp = new URLSearchParams(location.search);
    let fieldLineCount = usp.get('preview-line-count') || 11
    this.data = {
      fieldLineCount,
      fieldType: usp.get('preview-type') || 'circle',
      ship: 0
    };

    Object.assign(this.data, this.getFieldLineData());

    this.rafStart();
  }

  disconnectedCallback() {
    this.data = null;
    this.state = null;
    super.disconnectedCallback();
  }

  // EVENT HANDLERS //////////////////////////////////////////////////////////

  handleFieldLineCountChange(event) {
    let fieldLineCount = event.target.value;

    this.data = {
      ...this.data,
      fieldLineCount
    };

    Object.assign(this.data, this.getFieldLineData());
    let usp = new URLSearchParams(location.search);
    usp.set('preview-line-count', fieldLineCount);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

  handleFieldTypeChange(event) {
    let fieldType = event.target.value;
    this.data = { ...this.data, fieldType };
    Object.assign(this.data, this.getFieldLineData());
    let usp = new URLSearchParams(location.search);
    usp.set('preview-type', fieldType);
    history.replaceState({}, '', `?${ usp.toString() }`);
  }

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

    this.data.ship += dist;
    this.data = { ...this.data };
  }

  handleSubmit(event) {
    event.preventDefault();
  }

  // API ///////////////////////////////////////////////////////////////////////

  getFieldLineData() {
    const [ ...fieldLinePoints ] = getFieldPoints(this.data.fieldLineCount, {
      getRadius: this.getRadiusGetter(),
      offset: 0.5
    });
    const [ ...fieldLinePointPairs ] = pairs(fieldLinePoints);

    return {
      fieldLinePoints,
      fieldLinePointPairs
    };
  }

  getRadiusGetter() {
    switch (this.data.fieldType) {
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

  moveShip = () => {
    this.data = {
      ...this.data,
      ship: this.data.ship + 0.01
    }
  };

  rafStart = () => {
    if (!this.isConnected)
      return;

    try {
      // this.moveShip();
    } finally {
      requestAnimationFrame(this.rafStart);
    }
  };

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    if (!this.data) {
      return '';
    }

    return html`
      <form @submit=${ this.handleSubmit }>
        <div class="field">
          <label for="field-type">Field type</label>
          <select @change=${ this.handleFieldTypeChange } id="field-type">
            ${ repeat(
              FIELD_TYPE_OPTIONS,
              ({ label, value }) => html`
                <option
                  ?selected=${ this.data.fieldType === value }
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
            value="${ this.data.fieldLineCount }">
        </div>
      </form>
      <svg
        @wheel="${ this.handleWheel }"
        viewBox="0 0 100 100">
        ${ this.renderField() }
        ${ this.renderShip() }
      </svg>
    `;
  }

  renderField() {
    const { fieldLinePoints: points, fieldLinePointPairs: pointPairs } = this.data;

    return svg`
      <!-- Inside path -->
      ${ repeat(
        pointPairs,
        pair => pair[0].angleF,
        pair => svg`
          <line
            x1="${ pair[0].xInnerF }"
            y1="${ pair[0].yInnerF }"
            x2="${ pair[1].xInnerF }"
            y2="${ pair[1].yInnerF }"
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
            x1="${ point.xInnerF }"
            y1="${ point.yInnerF }"
            x2="${ point.xOuterF }"
            y2="${ point.yOuterF }"
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
            x1="${ pair[0].xOuterF }"
            y1="${ pair[0].yOuterF }"
            x2="${ pair[1].xOuterF }"
            y2="${ pair[1].yOuterF }"
            stroke-width="0.5px">
          </line>
        `
      ) }
    `;
  }

  renderShip() {
    const { fieldLinePoints: points, fieldLinePointPairs: pointPairs } = this.data;
    let shipFloor = Math.floor(this.data.ship);
    let shipIndex = shipFloor % pointPairs.length;
    let shipT = this.data.ship - shipFloor;
    let shipPair = pointPairs.at(shipIndex);
    let shipX = lerp(
      shipPair[0].xShip,
      shipPair[1].xShip,
      shipT
    );
    let shipY = lerp(
      shipPair[0].yShip,
      shipPair[1].yShip,
      shipT
    );
    let shipAngle = lerp(
      shipPair[0].angleActual,
      shipPair[1].angleActual,
      shipT
    );

    let shipAngleC = Math.cos(shipAngle);
    let shipAngleS = Math.sin(shipAngle);

    return svg`
      <!-- Ship base -->

      ${ repeat(
        [ 1, -1 ],
        offset => offset,
        offset => svg`
          <line
            x1="${ shipPair[0].xOuterF }"
            y1="${ shipPair[0].yOuterF }"
            x2="${ shipX+shipAngleC*offset }"
            y2="${ shipY-shipAngleS*offset }"
            stroke="yellow"
            stroke-width="0.5px">
          </line>

          <line
            x1="${ shipPair[1].xOuterF }"
            y1="${ shipPair[1].yOuterF }"
            x2="${ shipX-shipAngleC*offset }"
            y2="${ shipY+shipAngleS*offset }"
            stroke="yellow"
            stroke-width="0.5px">
          </line>
      `) }

      <!-- Ship arms -->

      <line
        x1="${ shipPair[1].xOuterF }"
        y1="${ shipPair[1].yOuterF }"
        x2="${ shipPair[1].xOuter + 8 * Math.cos(shipPair[1].angle + 0.75*Math.PI) }"
        y2="${ shipPair[1].yOuter - 8 * Math.sin(shipPair[1].angle + 0.75*Math.PI) }"
        stroke="yellow"
        stroke-width="0.5px">
      </line>

      <line
        x1="${ shipPair[0].xOuterF }"
        y1="${ shipPair[0].yOuterF }"
        x2="${ shipPair[0].xOuter + 8 * Math.cos(shipPair[0].angle + 0.25*Math.PI) }"
        y2="${ shipPair[0].yOuter - 8 * Math.sin(shipPair[0].angle + 0.25*Math.PI) }"
        stroke="yellow"
        stroke-width="0.5px">
      </line>
    `;
  }
}

customElements.define('jp-timpist', JPTimpistElement);

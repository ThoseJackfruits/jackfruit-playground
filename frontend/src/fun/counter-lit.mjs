import { css, LitElement, html } from 'lit';

class CounterLitElement extends LitElement {
  static properties = {
    count: { type: BigInt }
  };

  static styles = css`
    :host {
      display: block;
      padding: 0 var(--jp-common-padding) var(--jp-common-padding);
      border: var(--jp-common-border-width) solid var(--jp-color-accent);
      border-radius: var(--jp-common-border-radius);
      width: max-content;
    }

    button {
      all: unset;
      font-size: 1.5rem;
      background-color: var(--jp-color-bg-1);
      color: var(--jp-color-text);
      padding: calc(var(--jp-common-padding) / 2) var(--jp-common-padding);
      border-radius: var(--jp-common-border-radius);
      border: var(--jp-common-border-width) solid var(--jp-color-accent);
    }

    button:disabled {
      opacity: 0.8;
    }

    button:hover {
      background-color: var(--jp-color-bg-2);
    }

    #count-value {
      font-size: 3rem;
      font-weight: 100;
    }

    #count {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
    }
  `;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    addEventListener('ws-message-counter', this.handleCounterChange);
    this.loadCount(); // purposeful no-await
  }

  disconnectedCallback() {
    removeEventListener('ws-message-counter', this.handleCounterChange);
    super.disconnectedCallback();
  }

  // API ///////////////////////////////////////////////////////////////////////

  async incrementCount() {
    const response = await fetch('/api/counter', { method: 'PUT', });
    const { value } = await response.json();
    this.count = value;
  }

  async loadCount() {
    const response = await fetch('/api/counter', { method: 'GET', });
    const { value } = await response.json();
    if (this.isConnected)
      this.count = BigInt(value);
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  async handleClick() {
    await this.incrementCount();
  }

  // Make rapid clicks work better on touch devices
  handleTouchStart = async event => {
    // Prevent the touch from triggering a click event
    event.preventDefault();
    await this.incrementCount();
  }

  handleCounterChange = (event) => {
    this.count = event.detail.data.count;
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <h2>Counter Lit</h2>
      <p id="count">
        <span>Count:</span>
        <span id="count-value">${
          this.count == null ? '' : this.count
        }</span></p>
      <button
        id="button"
        @click=${ this.handleClick }
        @touchstart=${ this.handleTouchStart }>
        Increment${ '!'.repeat(this.updating) }
      </button>
    `;
  }
}

customElements.define('counter-lit', CounterLitElement);

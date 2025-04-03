import { css, LitElement, html } from 'lit';

class CounterLitElement extends LitElement {
  static properties = {
    count: { type: BigInt },
    updating: { type: Boolean }
  };

  static styles = css`
    :host {
      display: block;
      padding: 0 var(--jp-common-padding) var(--jp-common-padding);
      border: var(--jp-common-border-width) solid var(--jp-color-accent);
      border-radius: var(--jp-common-border-radius);
    }

    button {
      all: unset;
      background-color: var(--jp-color-bg-1);
      color: var(--jp-color-text);
      padding: calc(var(--jp-common-padding) / 2) var(--jp-common-padding);
      border-radius: var(--jp-common-border-radius);
    }

    button:disabled {
      opacity: 0.8;
    }

    button:hover {
      background-color: var(--jp-color-bg-2);
    }

    p {
      margin-bottom: 0;
    }
  `;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    addEventListener('ws-message-counter', this.handleCounterChange);
    (async () => {
      try {
        this.updating = true;
        const response = await fetch('/api/counter', { method: 'GET', });
        const { value } = await response.json();
        if (this.isConnected)
          this.count = BigInt(value);
      } finally {
        this.updating = false;
      }
    })();
  }

  disconnectedCallback() {
    removeEventListener('ws-message-counter', this.handleCounterChange);
    super.disconnectedCallback();
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  async handleClick() {
    try {
      this.updating = true;
      const response = await fetch('/api/counter', { method: 'PUT', });
      const { value } = await response.json();
      this.count = value;
    } finally {
      this.updating = false;
    }
  }

  handleCounterChange = (event) => {
    this.count = event.detail.data.count;
  }

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <h2>Counter Lit</h2>
      <button
        id="button"
        @click=${ this.handleClick }
        ?disabled=${ this.updating }>
        Increment
      </button>
      <p id="count">Count: ${
        this.count == null ? '' : this.count
      }</p>
    `;
  }
}

customElements.define('counter-lit', CounterLitElement);

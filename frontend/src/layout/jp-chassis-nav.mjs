import { css, LitElement, html } from 'lit';

class JPChassisNavElement extends LitElement {
  static properties = {
    currentRoute: {
      attribute: false,
      type: String
    }
  };

  static styles = css`
    nav {
      display: flex;
      flex-direction: row;
      font-family: var(--jp-font-face-header);
      font-size: var(--jp-font-size-nav);
      gap: var(--jp-common-padding);
      padding: calc(var(--jp-common-padding) / 2);
    }

    a:link {
      color: inherit;
      padding: calc(var(--jp-common-padding) / 2);
      text-decoration: none;
    }

    a:link.in {
      text-decoration: underline;
      text-underline-position: from-font;
      text-underline-offset: from-font;
      text-decoration-thickness: from-font;
    }

    a:link:hover {
      color: var(--jp-color-primary);
    }

    a:visited {
      color: var(--jp-color-text);
    }

    a:link:focus-visible {
      outline: 0.1rem solid var(--jp-color-primary);
      border-radius: var(--jp-common-border-radius);
    }
  `;

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  connectedCallback() {
    super.connectedCallback();
    addEventListener('route-changed', this.handleRouteChange);
  }

  disconnectedCallback() {
    removeEventListener('route-changed', this.handleRouteChange);
    super.disconnectedCallback();
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleRouteChange = event => {
    this.currentRoute = event.detail.path;
  };

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <nav>
        <a ?in=${ this.currentRoute === '/' } href="/">Home</a>
        <a ?in=${ this.currentRoute === '/about' } href="/about">About</a>
        <div></div>
      </nav>
    `;
  }
}

customElements.define('jp-chassis-nav', JPChassisNavElement);
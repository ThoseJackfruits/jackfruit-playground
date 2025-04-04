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
      color: var(--jp-color-text);
      padding: calc(var(--jp-common-padding) / 2);
      text-decoration: none;
    }

    a:link.in {
      text-decoration: underline;
      text-underline-position: from-font;
      text-underline-offset: calc(var(--jp-common-padding) / 4);
      text-decoration-thickness: calc(var(--jp-common-padding) / 3);
    }

    a:link:hover {
      color: var(--jp-color-primary);
      text-decoration-color: var(--jp-color-primary);
    }

    a:visited:not(:hover) {
      color: var(--jp-color-text);
    }

    a:visited:hover {
      color: var(--jp-color-primary);
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
        <a class="${ !this.currentRoute || this.currentRoute === '/' ? 'in' : '' }" href="/">Home</a>
        <a class="${ this.currentRoute === '/about' ? 'in' : '' }" href="/about">About</a>
        <div></div>
      </nav>
    `;
  }
}

customElements.define('jp-chassis-nav', JPChassisNavElement);
import { css, LitElement, html } from 'lit';

class JPChassisNavElement extends LitElement {
  static properties = {
    currentRoute: {
      attribute: false,
      type: String
    }
  };

  static styles = css`
    :host {
      display: block;
    }

    nav {
      display: flex;
      flex-direction: row;
      font-family: var(--jp-font-face-header);
      font-size: var(--jp-font-size-nav);
      gap: var(--jp-common-padding);
      padding: calc(var(--jp-common-padding) / 2);
      margin-bottom: calc(var(--jp-common-padding) / 2);
      scrollbar-width: thin;
      overflow-x: auto;
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
    this.currentRoute = window.location.pathname;
    addEventListener('route-changed', this.handleRouteChange);
  }

  disconnectedCallback() {
    removeEventListener('route-changed', this.handleRouteChange);
    super.disconnectedCallback();
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleRouteChange = async event => {
    this.currentRoute = event.detail.path;
    await this.updateComplete;
    this.shadowRoot.querySelector('a.in')?.scrollIntoView({
      behavior: 'smooth',
      // Make sure we're snapping the viewport vertically to the top of the
      // scroll container, rather than lining up the top of the viewport with
      // the top of the target anchor, which could cause the page to scroll
      // down slightly.
      block: 'end',
      inline: 'nearest'
    });
  };

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    return html`
      <nav>
        <a class="${ this.renderClass('/') }" href="/">Home</a>
        <a class="${ this.renderClass('/ristet') }" href="/ristet">Ristet</a>
        <a class="${ this.renderClass('/timpist') }" href="/timpist">Timpist</a>
        <a class="${ this.renderClass('/about') }" href="/about">About</a>
        <div></div>
      </nav>
    `;
  }

  renderClass(path) {
    return this.currentRoute === path ? 'in' : '';
  }
}

customElements.define('jp-chassis-nav', JPChassisNavElement);
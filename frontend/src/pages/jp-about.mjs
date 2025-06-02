import { LitElement, html, css } from 'lit';

class JPAboutElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      margin: var(--jp-common-padding);
    }

    a {
      display: inline-flex;
      color: var(--jp-color-accent);
    }

    a:visited {
      color: var(--jp-color-accent);
    }
  `;

  render() {
    return html`
      <p>This is a web sandbox for <a href="https://github.com/jackgeralddavis">
        <span>@jackgeralddavis</span>
      </a> and <a href="https://github.com/ThoseGrapefruits">
        <span>@ThoseGrapefruits</span>
      </a></p>
    `;
  }
}

customElements.define('jp-about', JPAboutElement);
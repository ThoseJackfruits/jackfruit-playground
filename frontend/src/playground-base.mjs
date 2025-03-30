class PlaygroundBaseElement extends HTMLElement {
  static observedAttributes = [ 'count' ];

  get count() {
    return +(this.getAttribute('count') ?? '0');
  } 

  set count(value) {
    this.setAttribute('count', `${ value }`);
  }

  // LIFECYCLE /////////////////////////////////////////////////////////////////

  // CustomElement
  connectedCallback() {
    this.render();
  }

  disconnectedCallback() {
    this.querySelector('button')?.removeEventListener('click', this.handleClick);
  }

  // CustomElement
  attributeChangedCallback() {
    this.render();
  }

  // EVENT HANDLERS ////////////////////////////////////////////////////////////

  handleClick = () => {
    this.count++;
  };

  // RENDER ////////////////////////////////////////////////////////////////////

  render() {
    if (!this.querySelector('button')) {
      let button = document.createElement('button');
      button.textContent = 'Click me';
      button.addEventListener('click', this.handleClick);
      this.appendChild(button);
    }

    let paragraph = this.querySelector('p');

    if (!paragraph) {
      paragraph = document.createElement('p');
      this.appendChild(paragraph);
    }

    paragraph.textContent = `Count: ${ this.count }`;
  }
}

customElements.define('playground-base', PlaygroundBaseElement);

document.body.innerHTML = '<playground-base></playground-base>';

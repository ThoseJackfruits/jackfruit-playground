class CounterDOMElement extends HTMLElement {
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
    this.innerHTML = '';
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
    let header = this.querySelector('#header');
    let button = this.querySelector('#button');
    let paragraph = this.querySelector('#count');

    if (!header) {
      header = document.createElement('h2');
      header.id = 'header';
      header.textContent = 'Counter DOM';
      this.appendChild(header);
    }

    if (!button) {
      button = document.createElement('button');
      button.id = 'button';
      button.textContent = 'Click me';
      button.addEventListener('click', this.handleClick);
      this.appendChild(button);
    }

    if (!paragraph) {
      paragraph = document.createElement('p');
      paragraph.id = 'count';
      this.appendChild(paragraph);
    }

    paragraph.textContent = `Count: ${ this.count }`;
  }
}

customElements.define('counter-dom', CounterDOMElement);

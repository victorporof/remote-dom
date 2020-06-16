export class EventPreventers {
  start() {
    document.addEventListener("submit", this._onSubmit.bind(this), true);
    document.addEventListener("click", this._onClick.bind(this), true);
  }

  _onSubmit(e) {
    // Prevent submit on forms.
    e.preventDefault();
  }

  _onClick(e) {
    // Prevent click and enter key on links.
    e.preventDefault();
  }
}

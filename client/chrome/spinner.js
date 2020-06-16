export class Spinner {
  _getOrCreateSpinner() {
    // Be careful here. The spinner lives in the same body as the baked DOM
    // received from the agent. Nuking the body will also nuke the spinner.
    let node = document.querySelector(".spinner");
    if (node) {
      return node;
    }
    node = document.createElement("img");
    node.className = "spinner";
    node.src = "/client/spinner.svg";
    node.setAttribute("width", "100");
    node.setAttribute("height", "100");
    document.body.appendChild(node);
    return node;
  }

  show() {
    const node = this._getOrCreateSpinner();
    node.removeAttribute("hidden");
  }

  hide() {
    const node = this._getOrCreateSpinner();
    node.setAttribute("hidden", "true");
  }
}

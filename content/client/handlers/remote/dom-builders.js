import config from "../../../../config";

export class DOMBuilders {
  constructor(renderer) {
    this._renderer = renderer;
  }

  start() {
    window.addEventListener("message", this._onMessage.bind(this));
  }

  _onMessage({ data: { type, ...message } }) {
    if (type == "bakedDOM") {
      this._onBakedDOM(message);
    } else if (type == "mutations") {
      this._onMutations(message);
    }
  }

  _onBakedDOM({ bakedDOM }) {
    this._renderer.nukeTree();
    this._renderer.setBody({ bakedDOM });
    window.scrollTo(0, 0);
  }

  _onMutations({ mutations }) {
    for (const mutation of mutations) {
      this._handleRemovedNodes(mutation);
      this._handleAddedNodes(mutation);
      this._handleCharacterDataChanged(mutation);
      this._handleUpdates(mutation);
    }
  }

  _handleAddedNodes({ added }) {
    for (const virtualNode of added) {
      if (config.logging.verbose) {
        console.info("Adding", virtualNode);
      }
      this._renderer.addNode({ virtualNode });
    }
  }

  _handleRemovedNodes({ removed }) {
    for (const virtualNode of removed) {
      if (config.logging.verbose) {
        console.info("Removing", virtualNode);
      }
      this._renderer.removeNode({ virtualNode });
    }
  }

  _handleCharacterDataChanged({ wrote }) {
    for (const virtualNode of wrote) {
      if (config.logging.verbose) {
        console.info("Updating text", virtualNode);
      }
      this._renderer.updateTextNode({ virtualNode });
    }
  }

  _handleUpdates({ updates }) {
    for (const { virtualNode } of updates) {
      if (config.logging.verbose) {
        console.info("Updating element", virtualNode);
      }
      this._renderer.updateElementNode({ virtualNode });
    }
  }
}

import EventEmitter from "events";

import config from "../../../config";

export class DOMBuilders extends EventEmitter {
  constructor(renderer) {
    super();
    this._renderer = renderer;
    this._renderer.on("message", (data) => this.emit("message", data));
  }

  nukeTree() {
    this._renderer.nukeTree();
    window.scrollTo(0, 0);
  }

  buildBakedDom({ bakedDOM }) {
    this._renderer.setBody({ bakedDOM });
  }

  applyMutations({ mutations }) {
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

import { DOMRegistrar } from "./dom-registrar";
import config from "../../../config";

export class DOMRenderer {
  constructor() {
    this._registrar = new DOMRegistrar();
  }

  getRemoteIDForNode(node) {
    return this._registrar.getRemoteIDForNode(node);
  }

  getPeerConnectionFromRemoteID(id) {
    return this._registrar.getPeerConnectionFromRemoteID(id);
  }

  nukeTree() {
    this.setEmptyHead();
    this.setEmptyBody();
    this._registrar.nuke();
  }

  setEmptyHead() {
    for (const stylesheet of this._registrar.stylesheets()) {
      stylesheet.remove();
    }
  }

  setEmptyBody() {
    const newBody = document.createElement("body");
    document.body.parentNode.replaceChild(newBody, document.body);
  }

  setBody({ bakedDOM }) {
    const bodyTree = bakedDOM.children.find((e) => e.tag == "body");
    if (!bodyTree) {
      // It can happen that the page has no body on `domcontentloaded`.
      return;
    }
    const newBody = this._createElementIfNeeded({ virtualNode: bodyTree });
    document.body.parentNode.replaceChild(newBody, document.body);
  }

  addNode({ virtualNode }) {
    const parentNode = this._registrar.getNodeFromRemoteID(virtualNode.parentID);
    if (!parentNode) {
      console.error(`Parent ${virtualNode.id} missing for node ${virtualNode.parentID}.`);
      return null;
    }
    const node = this._createElementIfNeeded({ virtualNode });
    if (!node) {
      // Node is of unknown type.
      return null;
    }
    // TODO: Use sibling to properly order.
    parentNode.appendChild(node);
    return node;
  }

  _addStylesheet({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (!node) {
      console.error(`No node to style with id ${virtualNode.id}.`);
      return null;
    }
    const stylesheet = this._createStylesheetIfNeeded({ virtualNode });
    if (stylesheet.parentNode) {
      // Don't re-append to maintain same index. Useful for debugging.
      return stylesheet;
    }
    document.head.appendChild(stylesheet);
    return stylesheet;
  }

  _addPeerConnection({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (!node) {
      console.error(`No node to stream with id ${virtualNode.id}.`);
      return null;
    }
    return this._createPeerConnectionIfNeeded({ virtualNode });
  }

  removeNode({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (!node) {
      console.error(`No node to remove with id ${virtualNode.id}.`);
      return;
    }
    this._removeStylesheet({ virtualNode });
    this._removeDescendantStylesheets({ virtualNode });
    this._removePeerConnection({ virtualNode });
    node.remove();
    this._registrar.deregisterNode(virtualNode.id);
  }

  _removeStylesheet({ virtualNode }) {
    const stylesheet = this._registrar.getStylesheetFromRemoteID(virtualNode.id);
    if (!stylesheet) {
      // Node has no styles.
      return;
    }
    stylesheet.remove();
    this._registrar.deregisterStylesheet(virtualNode.id);
  }

  _removeDescendantStylesheets({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (!node) {
      console.error(`No node to remove stylesheets with id ${virtualNode.id}.`);
      return;
    }
    if (node.nodeType == Node.TEXT_NODE) {
      // Text nodes never have any descendats or any styles.
      return;
    }
    for (const childNode of node.querySelectorAll("*")) {
      const id = parseInt(childNode.id.match(/remote-(.*)/).pop());
      this._removeStylesheet({ virtualNode: { id } });
    }
  }

  _removePeerConnection({ virtualNode }) {
    const peerConnection = this._registrar.getPeerConnectionFromRemoteID(virtualNode.id);
    if (!peerConnection) {
      console.error(`No pc to close with id ${virtualNode.id}.`);
      return;
    }
    peerConnection.close();
    this._registrar.deregisterPeerConnection(virtualNode.id);
  }

  updateTextNode({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (!node) {
      console.error(`No text node to update with id ${virtualNode.id}.`);
      return;
    }
    node.data = virtualNode.data;
  }

  updateElementNode({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (!node) {
      console.error(`No element node to update with id ${virtualNode.id}.`);
      return;
    }
    this._updateElementAttributes(node, { virtualNode });
    this._updateElementProperties(node, { virtualNode });
    this._updateElementStyles(node, { virtualNode });
  }

  _createElementIfNeeded({ virtualNode }) {
    const node = this._registrar.getNodeFromRemoteID(virtualNode.id);
    if (node) {
      if (config.logging.verbose) {
        console.warn(`Reusing node with id ${virtualNode.id}.`, virtualNode);
      }
      return node;
    }
    if (virtualNode.isStreamable) {
      return this._createStreamedNode({ virtualNode });
    }
    if (virtualNode.nodeType == Node.TEXT_NODE) {
      return this._createTextNode({ virtualNode });
    }
    if (virtualNode.nodeType == Node.ELEMENT_NODE) {
      return this._createElementNode({ virtualNode });
    }
    console.error("Ignoring node of unknown type", virtualNode);
    return null;
  }

  _createStylesheetIfNeeded({ virtualNode }) {
    const stylesheet = this._registrar.getStylesheetFromRemoteID(virtualNode.id);
    if (stylesheet) {
      if (config.logging.verbose) {
        console.warn(`Reusing stylesheet with id ${virtualNode.id}.`, virtualNode);
      }
      return stylesheet;
    }
    return this._createStylesheetNode({ virtualNode });
  }

  _createPeerConnectionIfNeeded({ virtualNode }) {
    const peerConnection = this._registrar.getPeerConnectionFromRemoteID(virtualNode.id);
    if (peerConnection) {
      if (config.logging.verbose) {
        console.warn(`Reusing pc with id ${virtualNode.id}.`, virtualNode);
      }
      return peerConnection;
    }
    return this._createPeerConnection({ virtualNode });
  }

  _createTextNode({ virtualNode }) {
    const node = document.createTextNode(virtualNode.data);
    this._registrar.registerNode(virtualNode.id, node);
    return node;
  }

  _createElementNode({ virtualNode }) {
    const node = document.createElement(virtualNode.tag);
    this._registrar.registerNode(virtualNode.id, node);
    node.id = `remote-${virtualNode.id}`;
    this._appendElementChildren(node, { virtualNode });
    this.updateElementNode({ virtualNode });
    return node;
  }

  _createStylesheetNode({ virtualNode }) {
    const stylesheet = document.createElement("style");
    this._registrar.registerStylesheet(virtualNode.id, stylesheet);
    return stylesheet;
  }

  _createPeerConnection({ virtualNode }) {
    const peerConnection = new RTCPeerConnection(config.rtc);
    peerConnection.onicecandidate = ({ candidate }) => {
      const id = virtualNode.id;
      const info = JSON.parse(JSON.stringify(candidate));
      parent.postMessage({ is: "rtc:ice-candidate", id, candidate: info }, "*");
    };
    this._registrar.registerPeerConnection(virtualNode.id, peerConnection);
    return peerConnection;
  }

  _createStreamedNode({ virtualNode }) {
    const node = document.createElement("video");
    this._registrar.registerNode(virtualNode.id, node);
    node.id = `remote-${virtualNode.id}`;
    node.setAttribute("autoplay", "");
    node.setAttribute("playsinline", "");
    this.updateElementNode({ virtualNode });
    const peerConnection = this._addPeerConnection({ virtualNode });
    peerConnection.ontrack = ({ streams }) => (node.srcObject = streams[0]);
    return node;
  }

  _appendElementChildren(node, { virtualNode }) {
    for (const virtualChild of virtualNode.children) {
      node.appendChild(this._createElementIfNeeded({ virtualNode: virtualChild }));
    }
  }

  _updateElementAttributes(node, { virtualNode }) {
    if (virtualNode.isStreamable) {
      return;
    }
    // First remove attributes. This could be optimized by doing a diff of the
    // previous virtualNode (if any) and the one passed in here.
    for (const key of Object.values(node.attributes)) {
      node.removeAttribute(key);
    }
    for (const [key, value] of Object.entries(virtualNode.attributes || {})) {
      node.setAttribute(key, value);
    }
  }

  _updateElementProperties(node, { virtualNode }) {
    if (virtualNode.isStreamable) {
      return;
    }
    for (const [key, value] of Object.entries(virtualNode.properties || {})) {
      node[key] = value;
    }
  }

  _updateElementStyles(node, { virtualNode }) {
    const styles = [];
    const pseudoStyles = [];
    for (const [key, value] of Object.entries(virtualNode.styleRules || {})) {
      if (!value) {
        continue;
      }
      if (key == "elementStyles") {
        styles.push(value);
      } else {
        pseudoStyles.push(`#remote-${virtualNode.id}:${key} { ${value} }`);
      }
    }
    if (!styles.length) {
      node.removeAttribute("style");
    } else {
      node.setAttribute("style", styles.join(""));
    }
    if (!pseudoStyles.length) {
      this._removeStylesheet({ virtualNode });
    } else {
      const stylesheet = this._addStylesheet({ virtualNode });
      stylesheet.textContent = pseudoStyles.join("\n");
    }
  }
}

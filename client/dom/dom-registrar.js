export class DOMRegistrar {
  constructor() {
    this._idsToNodes = new Map();
    this._idsToStyles = new Map();
    this._idsToPeerConnections = new Map();
    this._nodesToIds = new WeakMap();
  }

  registerNode(id, node) {
    if (this._idsToNodes.has(id) || this._nodesToIds.has(node)) {
      console.error(`May not overwrite already registered node id ${id}.`, node);
      return;
    }
    this._idsToNodes.set(id, node);
    this._nodesToIds.set(node, id);
  }

  registerStylesheet(id, style) {
    if (this._idsToStyles.has(id)) {
      console.error(`May not overwrite already registered stylesheet id ${id}.`, style);
      return;
    }
    this._idsToStyles.set(id, style);
  }

  registerPeerConnection(id, peerConnection) {
    if (this._idsToStyles.has(id)) {
      console.error(`May not overwrite already registered pc id ${id}.`, peerConnection);
      return;
    }
    this._idsToPeerConnections.set(id, peerConnection);
  }

  deregisterNode(id) {
    const node = this._idsToNodes.get(id);
    if (!node) {
      console.error(`No existing node with ${id} to deregister.`);
      return;
    }
    this._idsToNodes.delete(id);
    this._nodesToIds.delete(node);
  }

  deregisterStylesheet(id) {
    if (!this._idsToStyles.has(id)) {
      console.error(`No existing stylesheet with ${id} to deregister.`);
      return;
    }
    this._idsToStyles.delete(id);
  }

  deregisterPeerConnection(id) {
    if (!this._idsToPeerConnections.has(id)) {
      console.error(`No existing pc with ${id} to deregister.`);
      return;
    }
    this._idsToPeerConnections.delete(id);
  }

  getRemoteIDForNode(node) {
    return this._nodesToIds.get(node);
  }

  getNodeFromRemoteID(id) {
    return this._idsToNodes.get(id);
  }

  getStylesheetFromRemoteID(id) {
    return this._idsToStyles.get(id);
  }

  getPeerConnectionFromRemoteID(id) {
    return this._idsToPeerConnections.get(id);
  }

  stylesheets() {
    return this._idsToStyles.values();
  }

  peerConnections() {
    return this._idsToPeerConnections.values();
  }

  nuke() {
    this._idsToNodes = new Map();
    this._idsToStyles = new Map();
    this._nodesToIds = new WeakMap();
  }
}

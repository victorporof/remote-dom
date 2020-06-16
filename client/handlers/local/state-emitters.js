import EventEmitter from "events";

export class StateEmitters extends EventEmitter {
  constructor(renderer) {
    super();
    this._renderer = renderer;
  }

  start() {
    document.addEventListener("selectionchange", this._onSelection.bind(this), true);
    document.addEventListener("focusin", this._onFocus.bind(this), true);
    document.addEventListener("change", this._onChange.bind(this), true);
    document.addEventListener("scroll", this._onScroll.bind(this), true);
  }

  _onSelection(e) {
    const selection = window.getSelection();
    const ranges = [];
    for (let i = 0; i < selection.rangeCount; i++) {
      const range = selection.getRangeAt(i);
      const startContainer = this._renderer.getRemoteIDForNode(range.startContainer);
      const endContainer = this._renderer.getRemoteIDForNode(range.endContainer);
      const startOffset = range.startOffset;
      const endOffset = range.endOffset;
      ranges.push({ startContainer, startOffset, endContainer, endOffset });
    }
    this.emit("state", { is: "select", ranges });
  }

  _onFocus(e) {
    const type = e.type;
    const target = this._renderer.getRemoteIDForNode(e.target);
    const relatedTarget = this._renderer.getRemoteIDForNode(e.relatedTarget);
    this.emit("state", { is: "focus", type, target, relatedTarget });
  }

  _onChange(e) {
    if (!(e.target instanceof HTMLSelectElement)) {
      return;
    }
    const type = e.type;
    const target = this._renderer.getRemoteIDForNode(e.target);
    const value = e.target.value;
    this.emit("state", { is: "change", type, target, value });
  }

  _onScroll(e) {
    if (e.target == document) {
      const target = "document";
      const pos = { scrollX: window.scrollX, scrollY: window.scrollY };
      this.emit("state", { is: "scroll", target, ...pos });
    } else {
      const target = this._renderer.getRemoteIDForNode(e.target);
      const pos = { scrollX: e.target.scrollLeft, scrollY: e.target.scrollTop };
      this.emit("state", { is: "scroll", target, ...pos });
    }
  }
}

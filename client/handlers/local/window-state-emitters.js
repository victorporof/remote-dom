import EventEmitter from "events";

export class WindowStateEmitters extends EventEmitter {
  constructor(history) {
    super();
    this._history = history;
  }

  start() {
    window.addEventListener("resize", this._onResize.bind(this));
    window.addEventListener("popstate", this._onPopState.bind(this));
    window.addEventListener("unload", this._onUnload.bind(this));
  }

  _onResize() {
    const size = { width: window.innerWidth, height: window.innerHeight };
    this.emit("resize", { ...size });
  }

  _onPopState() {
    const { url } = this._history.current();
    this.emit("popstate", { url });
  }

  _onUnload() {
    this.emit("unload");
  }
}

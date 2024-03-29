import EventEmitter from "events";
import pick from "lodash/pick";

const MOUSE_EVENT_PROPS = [
  "clientX",
  "clientY",
  "ctrlKey",
  "shiftKey",
  "altKey",
  "metaKey",
  "button",
  "buttons",
];

const KEY_EVENT_PROPS = [
  "key",
  "code",
  "location",
  "ctrlKey",
  "shiftKey",
  "altKey",
  "metaKey",
  "repeat",
  "isComposing",
];

export class InputEmitters extends EventEmitter {
  constructor(renderer) {
    super();
    this._renderer = renderer;
  }

  start() {
    document.addEventListener("click", this._onMouse.bind(this), true);
    document.addEventListener("dblclick", this._onMouse.bind(this), true);
    document.addEventListener("mousedown", this._onMouse.bind(this), true);
    document.addEventListener("mouseup", this._onMouse.bind(this), true);
    document.addEventListener("mousemove", this._onMouse.bind(this), true);
    document.addEventListener("mouseenter", this._onMouse.bind(this), true);
    document.addEventListener("mouseleave", this._onMouse.bind(this), true);
    document.addEventListener("mouseover", this._onMouse.bind(this), true);
    document.addEventListener("mouseout", this._onMouse.bind(this), true);
    document.addEventListener("keydown", this._onKey.bind(this), true);
    document.addEventListener("keyup", this._onKey.bind(this), true);
  }

  _onMouse(e) {
    const type = e.type;
    const target = this._renderer.getRemoteIDForNode(e.target);
    const relatedTarget = this._renderer.getRemoteIDForNode(e.relatedTarget);
    const props = pick(e, MOUSE_EVENT_PROPS);
    this.emit("input", { is: "mouse", type, target, relatedTarget, ...props });
  }

  _onKey(e) {
    const type = e.type;
    const target = this._renderer.getRemoteIDForNode(e.target);
    const props = pick(e, KEY_EVENT_PROPS);
    this.emit("input", { is: "key", type, target, ...props });
  }
}

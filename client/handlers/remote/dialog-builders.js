import EventEmitter from "events";

export class DialogBuilders extends EventEmitter {
  buildDialog({ dialog }) {
    if (dialog.type == "alert") {
      this._onAlert({ dialog });
    } else if (dialog.type == "confirm") {
      this._onConfirm({ dialog });
    } else if (dialog.type == "prompt") {
      this._onPrompt({ dialog });
    } else if (dialog.type == "beforeunload") {
      // TODO
    }
  }

  _onAlert({ dialog }) {
    window.alert(dialog.message);
    this.emit("input", { is: "dialog", type: dialog.type });
  }

  _onConfirm({ dialog }) {
    const value = window.confirm(dialog.message);
    this.emit("input", { is: "dialog", type: dialog.type, value });
  }

  _onPrompt({ dialog }) {
    const value = window.prompt(dialog.message);
    this.emit("input", { is: "dialog", type: dialog.type, value });
  }
}

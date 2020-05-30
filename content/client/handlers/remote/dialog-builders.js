export class DialogBuilders {
  start() {
    window.addEventListener("message", this._onMessage.bind(this));
  }

  _onMessage({ data: { type, ...message } }) {
    if (type == "dialog") {
      this._onDialog(message);
    }
  }

  _onDialog({ dialog }) {
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
    parent.postMessage({ is: "dialog", type: dialog.type }, "*");
  }

  _onConfirm({ dialog }) {
    const value = window.confirm(dialog.message);
    parent.postMessage({ is: "dialog", type: dialog.type, value }, "*");
  }

  _onPrompt({ dialog }) {
    const value = window.prompt(dialog.message);
    parent.postMessage({ is: "dialog", type: dialog.type, value }, "*");
  }
}

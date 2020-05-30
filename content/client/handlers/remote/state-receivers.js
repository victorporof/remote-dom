export class StateReceivers {
  start() {
    window.addEventListener("message", this._onMessage.bind(this));
  }

  _onMessage({ data: { type, ...message } }) {
    if (type == "events") {
      this._onEvents(message);
    }
  }

  _onEvents({ events }) {
    for (const event of events) {
      if (event.type == "focus") {
        this._onFocus({ event });
      } else if (event.type == "blur") {
        this._onBlur({ event });
      } else if (event.type == "change") {
        this._onChange({ event });
      } else if (event.type == "input") {
        this._onInput({ event });
      }
    }
  }

  _onFocus({ event }) {
    // TODO
  }

  _onBlur({ event }) {
    // TODO
  }

  _onChange({ event }) {
    // TODO
  }

  _onInput({ event }) {
    // TODO
  }
}

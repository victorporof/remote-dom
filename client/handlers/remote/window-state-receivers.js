export class WindowStateReceivers {
  constructor(history, favicon) {
    this._history = history;
    this._favicon = favicon;
  }

  receiveNavigation({ title, url }) {
    this._history.push({ title, url });
    this._favicon.set({ url });
  }
}

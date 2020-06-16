export class Favicon {
  constructor() {
    this._icon = document.querySelector("link[rel=icon]");
  }

  set({ url }) {
    this._icon.href = `/favicon.ico?url=${url}`;
  }
}

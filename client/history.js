export class History {
  current() {
    const title = document.title;
    const url = `${location.pathname.slice(1)}${location.search}`;
    return { title, url };
  }

  push({ title, url }) {
    const current = this.current();
    if (title != current.title) {
      document.title = title;
    }
    if (url != current.url && url != `${current.url}/`) {
      history.pushState(null, title, `/${url}`);
    }
  }
}

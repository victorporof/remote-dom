export const getMetadata = () => {
  return { title: document.title, url: document.location.href };
};

export const renderClientHtml = (clientjs) => {
  // This is hacky and incorrect for now.
  // The generated HTML shouldn't be a stripped down version of the existing DOM,
  // but this is good enough for the prototype.

  // Add a `remote-id` data attribute for all nodes on the client. Note that
  // the DOM won't be altered on the server.
  const originalNodes = document.documentElement.querySelectorAll("*");
  for (const node of originalNodes) {
    node.dataset.remoteId = window.$nodesToIds.get(node);
  }

  const clone = document.documentElement.cloneNode(true);

  // Cleanup `remote-id` data attribute added above.
  for (const node of originalNodes) {
    delete node.dataset.remoteId;
  }

  // Remove scripts.
  const scripts = clone.querySelectorAll('script:not([type="application/ld+json"])');
  for (const script of scripts) {
    script.parentNode.removeChild(script);
  }

  // Remove imports.
  const imports = clone.querySelectorAll("link[rel=import]");
  for (const link of imports) {
    link.parentNode.removeChild(link);
  }

  // Remove inline listeners.
  const nodes = clone.querySelectorAll("*");
  const listeners = Object.keys(HTMLElement.prototype).filter((e) => e.startsWith("on"));
  for (const node of nodes) {
    for (const listener of listeners) {
      node.removeAttribute(listener);
    }
  }

  // Inject client code.
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.textContent = clientjs;
  const head = clone.querySelector("head");
  head.appendChild(script);

  // Some subresources might not be available due to CORS disputes, so they
  // should all be inlined or proxied. So far just handling styles seems to be
  // enough for a prototype, but a real solution would need superpowers which
  // aren't available in puppeteer. For now:

  // Remove stylesheets.
  const stylesheets = clone.querySelectorAll("style, link[rel=stylesheet]");
  for (const stylesheet of stylesheets) {
    stylesheet.parentNode.removeChild(stylesheet);
  }

  // Generate flat css.
  const css = [...document.styleSheets].flatMap((e) => {
    const href = e.href;
    try {
      return [...e.cssRules].map((e) => e.cssText).join("");
    } catch (e) {
      // Access to stylesheet is denied.
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.type = "text/css";
      link.href = href;
      head.appendChild(link);
      return [];
    }
  });

  // Inline styles.
  const style = document.createElement("style");
  style.textContent = css.join("");
  head.appendChild(style);

  // Serialize doctype. It isn't part of the document root.
  const doctype = new XMLSerializer().serializeToString(document.doctype);

  return `${doctype}${clone.outerHTML}`;
};

export const registerNodes = () => {
  window.$registerNodes();
};

export const registerMutationObserver = () => {
  window.$registerMutationObserver();
};

export const simulateClick = ({ target, relatedTarget, ...options }) => {
  target = window.$idsToNodes.get(target);
  relatedTarget = window.$idsToNodes.get(relatedTarget);

  // The DOM has changed locally (on the server) since the remote click happened
  // (on the client). Fundamentally the same problem can arise when streaming
  // video as well, where the click event on the client is visually perceived to
  // be over a certain element, but the streaming has lagged behind. However, in
  // the case of streaming the DOM, accessibility semantics are not lost, so
  // this situation is handled more gracefully and the click can still happen if
  // the event target has moved (for example).
  if (!target) {
    return;
  }

  target.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      view: window,
      target,
      relatedTarget,
      ...options,
    })
  );
};

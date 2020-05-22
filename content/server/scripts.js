export const getMetadata = () => {
  return { title: document.title, url: document.location.href };
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

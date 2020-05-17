import pick from "lodash/pick";

const onSubmit = (e) => {
  // Prevent submit on forms.
  e.preventDefault();
};

const onClick = (e) => {
  // Prevent click and enter key on links.
  e.preventDefault();

  // Synthesize click event on the server, on any type of element.
  const target = e.target.dataset.remoteId;
  const relatedTarget = e.relatedTarget ? e.relatedTarget.dataset.remoteId : null;
  const position = pick(e, ["clientX", "clientY"]);
  const meta = pick(e, ["ctrlKey", "shiftKey", "altKey", "metaKey", "button", "buttons"]);
  parent.postMessage({ type: "click", target, relatedTarget, ...position, ...meta }, "*");
};

const onMessage = ({ data: { type, ...message } }) => {
  if (type == "mutations") {
    onMutations(message);
  }
};

const onMutations = ({ mutations }) => {
  for (const mutation of mutations) {
    console.log("mutation", mutation);
    const root = document.documentElement;
    let target;
    if (mutation.target.id == "root") {
      target = root;
    } else {
      target = root.querySelector(`[data-remote-id="${mutation.target.id}"]`);
    }
    handleAddedNodes(target, mutation);
    handleRemovedNodes(mutation);
    handleCharacterDataChanged(mutation);
  }
};

const handleAddedNodes = (target, { added }) => {
  const fragment = new DocumentFragment();
  for (const { id, html } of added) {
    const template = document.createElement("template");
    template.innerHTML = html;
    fragment.appendChild(template.content);
    fragment.lastChild.dataset.remoteId = id;
  }
  target.appendChild(fragment);
};

const handleRemovedNodes = ({ removed }) => {
  for (const { id } of removed) {
    const node = document.querySelector(`[data-remote-id="${id}"]`);
    node.parentNode.removeChild(node);
  }
};

const handleCharacterDataChanged = ({ wrote }) => {
  for (const { id, text } of wrote) {
    const node = document.querySelector(`[data-remote-id="${id}"]`);
    node.textContent = text;
  }
};

document.documentElement.addEventListener("submit", onSubmit, true);
document.documentElement.addEventListener("click", onClick, true);
window.addEventListener("message", onMessage);

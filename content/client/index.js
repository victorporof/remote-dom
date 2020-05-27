import pick from "lodash/pick";

const $idsToNodes = new Map();
const $nodesToIds = new WeakMap();

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

const onSubmit = (e) => {
  // Prevent submit on forms.
  e.preventDefault();
};

const onClick = (e) => {
  // Prevent click and enter key on links.
  e.preventDefault();
  onMouseEvent(e);
};

const onMouseEvent = (e) => {
  const target = e.target.dataset.remoteId;
  const relatedTarget = e.relatedTarget ? e.relatedTarget.dataset.remoteId : null;
  const meta = pick(e, MOUSE_EVENT_PROPS);
  parent.postMessage({ is: "mouse", type: e.type, target, relatedTarget, ...meta }, "*");
};

const onKeyEvent = (e) => {
  const target = e.target.dataset.remoteId;
  const meta = pick(e, KEY_EVENT_PROPS);
  parent.postMessage({ is: "key", type: e.type, target, ...meta }, "*");
};

const onMessage = ({ data: { type, ...message } }) => {
  if (type == "bakedDOM") {
    buildBakedDOM(message);
  } else if (type == "mutations") {
    onMutations(message);
  }
};

const onMutations = ({ mutations }) => {
  for (const mutation of mutations) {
    const target = $idsToNodes.get(mutation.target.id);
    if (!target) {
      console.error(`No existing node for ${mutation.target.id}`, mutation);
    } else {
      handleAddedNodes(target, mutation);
      handleRemovedNodes(mutation);
      handleCharacterDataChanged(mutation);
      handleUpdates(target, mutation);
    }
  }
};

const handleAddedNodes = (target, { added }) => {
  for (const virtualNode of added) {
    if ($nodesToIds.has(virtualNode.id)) {
      console.error(`Existing node attempted to be added with id ${virtualNode.id}`);
    }
    createElement(virtualNode);
  }
};

const handleRemovedNodes = ({ removed }) => {
  for (const { id } of removed) {
    const node = $nodesToIds.get(id);
    if (!node) {
      console.error(`No node to remove at id ${id}`);
    } else {
      deregisterNode(id);
      node.remove();
    }
  }
};

const handleCharacterDataChanged = ({ wrote }) => {
  for (const { id, data } of wrote) {
    // This is a text node:
    const target = $idsToNodes.get(id);
    target.data = data;
  }
};

const handleUpdates = (target, { updates }) => {
  // When an attribute or something else changes that affects
  // the semantics or layout of a node, we want to do a shallow update
  // of it (don't recreate children).
  // This could possibly be merged together with characterData if we make
  // updateElement able to work with text nodes.
  for (const { virtualNode } of updates) {
    updateElement(target, virtualNode);
  }
};

const deregisterNode = (id) => {
  const node = $idsToNodes.get(id);
  if (node) {
    $idsToNodes.delete(id);
    $nodesToIds.delete(node);
  }
};

const registerNode = (id, node) => {
  $idsToNodes.set(id, node);
  $nodesToIds.set(node, id);
  return id;
};

const updateElement = (el, bakedNode) => {
  // First remove attributes. XXX This could be optimized by doing
  // a diff of the previous bakedNode (if any) and the one passed in here.
  // eslint-disable-next-line guard-for-in
  for (const attr in el.attributes) {
    el.removeAttribute(attr);
  }
  // eslint-disable-next-line guard-for-in
  for (const attr in bakedNode.attributes) {
    el.setAttribute(attr, bakedNode.attributes[attr]);
  }
  // Stick the ID on the DOM for easier debugging:
  el.dataset.remoteId = bakedNode.id;
};

const createElement = (bakedNode) => {
  if (bakedNode.nodeType == 3) {
    const node = document.createTextNode(bakedNode.data);
    registerNode(bakedNode.id, node);
    return node;
  }
  const el = document.createElement(bakedNode.tag);
  updateElement(el, bakedNode);
  registerNode(bakedNode.id, el);

  bakedNode.children.map(createElement).forEach(el.appendChild.bind(el));
  return el;
};

const buildBakedDOM = function ({ bakedDOM }) {
  const docElemTree = bakedDOM;
  const bodyTree = bakedDOM.children.filter((n) => n.tag == "body")[0];
  const newBody = createElement(bodyTree);

  // Don't replace the documentElement.. just set attrs
  updateElement(document.documentElement, docElemTree);
  // We are controlling the window size, so we shouldn't _need_ to
  // sync this, but I wouldn't be surprised if we do for some reason ultimately.
  // document.documentElement.style.width = docElemTree.size.width;
  // document.documentElement.style.height = docElemTree.size.height;
  document.body.parentNode.replaceChild(newBody, document.body);
};

document.documentElement.addEventListener("submit", onSubmit, true);
document.documentElement.addEventListener("click", onClick, true);
document.documentElement.addEventListener("dblclick", onMouseEvent, true);
document.documentElement.addEventListener("mousedown", onMouseEvent, true);
document.documentElement.addEventListener("mouseup", onMouseEvent, true);
document.documentElement.addEventListener("mousemove", onMouseEvent, true);
document.documentElement.addEventListener("keydown", onKeyEvent, true);
document.documentElement.addEventListener("keyup", onKeyEvent, true);

window.addEventListener("message", onMessage);

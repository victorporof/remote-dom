import shortid from "shortid";

window.$idsToNodes = new Map();
window.$nodesToIds = new Map();

const registerNode = (node) => {
  // Script nodes don't exist on the client.
  if (node.nodeName == "SCRIPT") {
    return null;
  }
  // Text nodes don't have to be directly changed on the client.
  if (node.nodeName == "#text") {
    return null;
  }
  const id = shortid.generate();
  window.$idsToNodes.set(id, node);
  window.$nodesToIds.set(node, id);
  return id;
};

const deregisterNode = (node) => {
  const id = window.$nodesToIds.get(node);
  if (!id) {
    return null;
  }
  window.$idsToNodes.delete(id);
  window.$nodesToIds.delete(node);
  return id;
};

const handleAddedNodes = ({ addedNodes }, bucket) => {
  // TODO: Should all added nodes be appended? Not sure how mutation observers work.
  for (const node of addedNodes) {
    const id = registerNode(node);
    if (id) {
      bucket.added.push({ id, name: node.nodeName, html: node.outerHTML });
    }
  }
};

const handleRemovedNodes = ({ removedNodes }, bucket) => {
  for (const node of removedNodes) {
    const id = deregisterNode(node);
    if (id) {
      bucket.removed.push({ id, name: node.nodeName });
    }
  }
};

const handleCharacterDataChanged = ({ target }, bucket) => {
  const node = target.parentNode;
  const id = window.$nodesToIds.get(node);
  bucket.wrote.push({ id, name: node.nodeName, text: node.textContent });
};

const handleMutation = (mutation) => {
  let target;
  if (mutation.target == document.documentElement) {
    target = {
      id: "root",
      name: mutation.target.nodeName,
    };
  } else {
    target = {
      id: window.$nodesToIds.get(mutation.target),
      name: mutation.target.nodeName,
    };
  }
  const bucket = { target, added: [], removed: [], wrote: [] };
  switch (mutation.type) {
    case "childList":
      handleAddedNodes(mutation, bucket);
      handleRemovedNodes(mutation, bucket);
      break;
    case "attributes":
      break;
    case "characterData":
      handleCharacterDataChanged(mutation, bucket);
      break;
  }
  if (bucket.added.length || bucket.removed.length || bucket.wrote.length) {
    return [bucket];
  }
  return [];
};

const onMutations = (mutationList) => {
  console.log(mutationList);

  const mutations = mutationList.flatMap(handleMutation);
  if (mutations.length) {
    window.$message({ type: "mutations", mutations });
  }
};

window.$registerNodes = () => {
  const nodes = document.documentElement.querySelectorAll("*");
  for (const node of nodes) {
    registerNode(node);
  }
};

window.$registerMutationObserver = () => {
  const observer = new MutationObserver(onMutations);
  observer.observe(document.documentElement, {
    childList: true,
    attributes: true,
    characterData: true,
    subtree: true,
  });
};

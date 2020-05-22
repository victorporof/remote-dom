import socketio from "socket.io-client";

let id = null;

const set = ({ title, url }) => {
  document.title = title;
  history.pushState(null, title, `/${url}`);
  const icon = document.querySelector("link[rel=icon]");
  icon.href = `/favicon.ico?url=${url}`;
};

const create = () => {
  const url = `${location.pathname.slice(1)}${location.search}`;
  const size = { width: window.innerWidth, height: window.innerHeight };
  set({ title: url, url });
  io.emit("page/create", { url, ...size });
};

const onContentResize = () => {
  const size = { width: window.innerWidth, height: window.innerHeight };
  io.emit("page/resize", { id, ...size });
};

const onContentUnload = () => {
  io.emit("page/delete", { id });
};

const onContentMessage = ({ data }) => {
  io.emit("page/message", { id, data });
};

const onRemotePageCreated = ({ title, url, ...page }) => {
  id = page.id;
  set({ title, url });
  io.emit("page/render", { id });
};

const buildBakedDOM = function (doc, bakedDOM) {
  function createElement(node) {
    if (typeof node === "string") {
      return doc.createTextNode(node);
    }
    const el = doc.createElement(node.tag);
    for (let attr in node.attributes) {
      el.setAttribute(attr, node.attributes[attr]);
    }

    node.children.map(createElement).forEach(el.appendChild.bind(el));
    return el;
  }
  const docElemTree = bakedDOM;
  location.origin + location.pathname;

  doc.documentElement.innerHTML = "<head></head><body></body>";

  // Inject <base> for loading relative resources.
  // This results in double fetching: once in the serving browser (server), and
  // once on the receiving renderer (client). Better solutions involve:
  // - basing on a proxy that lives on the server and has cached resources, or
  // - retrieving the resources on demand from inside the browsing context
  const base = doc.createElement("base");
  base.href = docElemTree.base;
  doc.head.append(base);

  const bodyTree = bakedDOM.children.filter((n) => n.tag == "body")[0];
  const newBody = createElement(bodyTree);

  // Don't replace the documentElement.. just set attrs
  for (let attr in docElemTree.attributes) {
    doc.documentElement.setAttribute(attr, docElemTree.attributes[attr]);
  }
  doc.documentElement.style.width = docElemTree.size.width;
  doc.documentElement.style.height = docElemTree.size.height;
  doc.body.parentNode.replaceChild(newBody, doc.body);
};

const onRemotePageRendered = ({ bakedDOM }) => {
  const content = document.querySelector(".content");
  const spinner = document.querySelector(".spinner");
  if (bakedDOM) {
    buildBakedDOM(content.contentDocument, bakedDOM);
    spinner.setAttribute("hidden", "true");
  }
};

const onRemotePageMutated = ({ mutations }) => {
  const content = document.querySelector(".content");
  content.contentWindow.postMessage({ type: "mutations", mutations }, "*");
};

window.addEventListener("resize", onContentResize);
window.addEventListener("unload", onContentUnload);
window.addEventListener("message", onContentMessage);

const io = socketio.connect(`ws://${location.host}`);
io.on("page/created", onRemotePageCreated);
io.on("page/rendered", onRemotePageRendered);
io.on("page/mutated", onRemotePageMutated);

create();

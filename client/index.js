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

const onRemotePageRendered = ({ bakedDOM }) => {
  const content = document.querySelector(".content");
  const spinner = document.querySelector(".spinner");
  if (bakedDOM) {
    content.contentWindow.postMessage({ type: "bakedDOM", bakedDOM }, "*");
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

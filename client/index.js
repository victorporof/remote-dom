import socketio from "socket.io-client";

let id = null;

const set = ({ title, url }) => {
  document.title = title;
  const pathname = `/${url}`;
  if (pathname !== window.location.pathname) {
    history.pushState(null, title, pathname);
  }
  const icon = document.querySelector("link[rel=icon]");
  icon.href = `/favicon.ico?url=${url}`;
};

window.onpopstate = function (event) {
  // From http://localhost:3000/http://localhost:3001/
  // get "http://localhost:3001/":
  const url = window.location.pathname.split("/").slice(1).join("/");
  io.emit("page/navigate", { id, url });
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

const onRemotePageCreated = (page) => {
  id = page.id;
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

const onRemotePageEvented = ({ events }) => {
  const content = document.querySelector(".content");
  content.contentWindow.postMessage({ type: "events", events }, "*");
};

const onRemotePageDialoged = ({ dialog }) => {
  const content = document.querySelector(".content");
  content.contentWindow.postMessage({ type: "dialog", dialog }, "*");
};

const onRemotePageNavigated = ({ title, url }) => {
  set({ title, url });
};

window.addEventListener("resize", onContentResize);
window.addEventListener("unload", onContentUnload);
window.addEventListener("message", onContentMessage);

const io = socketio.connect(`ws://${location.host}`);
io.on("page/created", onRemotePageCreated);
io.on("page/rendered", onRemotePageRendered);
io.on("page/mutated", onRemotePageMutated);
io.on("page/evented", onRemotePageEvented);
io.on("page/dialoged", onRemotePageDialoged);
io.on("page/navigated", onRemotePageNavigated);

create();

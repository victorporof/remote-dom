import socketio from "socket.io-client";

let id = null;

const getLocation = () => {
  const title = document.title;
  const url = `${location.pathname.slice(1)}${location.search}`;
  return { title, url };
};

const setLocation = ({ title, url }) => {
  const current = getLocation();
  if (title != current.title) {
    document.title = title;
  }
  if (url != current.url && url != `${current.url}/`) {
    history.pushState(null, title, `/${url}`);
    setFavicon({ url });
  }
};

const setFavicon = ({ url }) => {
  const icon = document.querySelector("link[rel=icon]");
  icon.href = `/favicon.ico?url=${url}`;
};

const create = () => {
  const { url } = getLocation();
  const size = { width: window.innerWidth, height: window.innerHeight };
  setLocation({ title: url, url });
  io.emit("page/create", { url, ...size });
};

const onClientPopState = (event) => {
  const { url } = getLocation();
  io.emit("page/navigate", { id, url });
};

const onClientResize = () => {
  const size = { width: window.innerWidth, height: window.innerHeight };
  io.emit("page/resize", { id, ...size });
};

const onClientUnload = () => {
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
  if (!bakedDOM) {
    console.error("No baked dom received.");
    return;
  }
  const content = document.querySelector(".content");
  const spinner = document.querySelector(".spinner");
  content.contentWindow.postMessage({ type: "bakedDOM", bakedDOM }, "*");
  spinner.setAttribute("hidden", "true");
};

const onRemotePageMutated = ({ mutations }) => {
  if (!mutations) {
    console.error("No mutations received.");
    return;
  }
  const content = document.querySelector(".content");
  content.contentWindow.postMessage({ type: "mutations", mutations }, "*");
};

const onRemotePageEvented = ({ events }) => {
  if (!events) {
    console.error("No events received.");
    return;
  }
  const content = document.querySelector(".content");
  content.contentWindow.postMessage({ type: "events", events }, "*");
};

const onRemotePageDialoged = ({ dialog }) => {
  if (!dialog) {
    console.error("No dialog received.");
    return;
  }
  const content = document.querySelector(".content");
  content.contentWindow.postMessage({ type: "dialog", dialog }, "*");
};

const onRemotePageNavigated = ({ title, url }) => {
  setLocation({ title, url });
};

window.addEventListener("popstate", onClientPopState);
window.addEventListener("resize", onClientResize);
window.addEventListener("unload", onClientUnload);
window.addEventListener("message", onContentMessage);

const io = socketio.connect(`ws://${location.host}`);
io.on("page/created", onRemotePageCreated);
io.on("page/rendered", onRemotePageRendered);
io.on("page/mutated", onRemotePageMutated);
io.on("page/evented", onRemotePageEvented);
io.on("page/dialoged", onRemotePageDialoged);
io.on("page/navigated", onRemotePageNavigated);

create();

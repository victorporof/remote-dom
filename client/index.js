import socketio from "socket.io-client";

import { History } from "./history";

import { Favicon } from "./chrome/favicon";
import { Spinner } from "./chrome/spinner";

import { DOMRenderer } from "./dom/dom-renderer";

import { EventPreventers } from "./handlers/local/event-preventers";
import { InputEmitters } from "./handlers/local/input-emitters";
import { StateEmitters } from "./handlers/local/state-emitters";
import { WindowStateEmitters } from "./handlers/local/window-state-emitters.js";

import { DialogBuilders } from "./handlers/remote/dialog-builders";
import { DOMBuilders } from "./handlers/remote/dom-builders";
import { RtcReceivers } from "./handlers/remote/rtc-receivers";
import { StateReceivers } from "./handlers/remote/state-receivers";
import { WindowStateReceivers } from "./handlers/remote/window-state-receivers";

window.addEventListener("DOMContentLoaded", (event) => {
  let id = null;
  const io = socketio.connect(`ws://${location.host}`);

  const spinner = new Spinner();
  const favicon = new Favicon();
  const history = new History();

  const renderer = new DOMRenderer();

  const eventPreventers = new EventPreventers();
  eventPreventers.start();

  const inputEmitters = new InputEmitters(renderer);
  inputEmitters.start();
  inputEmitters.on("input", (data) => {
    io.emit("page/message", { id, data });
  });

  const stateEmitters = new StateEmitters(renderer);
  stateEmitters.start();
  stateEmitters.on("state", (data) => {
    io.emit("page/message", { id, data });
  });

  const windowStateEmitters = new WindowStateEmitters(history);
  windowStateEmitters.start();
  windowStateEmitters.on("resize", (data) => {
    io.emit("page/resize", { id, data });
  });
  windowStateEmitters.on("popstate", (data) => {
    spinner.show();
    io.emit("page/navigate", { id, data });
  });
  windowStateEmitters.on("unload", () => {
    io.emit("page/delete", { id });
  });

  const dialogBuilders = new DialogBuilders();
  io.on("page/dialoged", (data) => {
    dialogBuilders.buildDialog(data);
  });
  dialogBuilders.on("input", (data) => {
    io.emit("page/message", { id, data });
  });

  const domBuilders = new DOMBuilders(renderer);
  io.on("page/will-navigate", () => {
    domBuilders.nukeTree();
    spinner.show();
  });
  io.on("page/rendered", (data) => {
    spinner.hide();
    domBuilders.buildBakedDom(data);
  });
  io.on("page/mutated", (data) => {
    domBuilders.applyMutations(data);
  });
  domBuilders.on("message", (data) => {
    io.emit("page/message", { id, data });
  });

  const rtcReceivers = new RtcReceivers(renderer);
  io.on("page/streamed/rtc:ice-candidate", (data) => {
    rtcReceivers.receiveIceCandidate(data);
  });
  io.on("page/streamed/rtc:offer", (data) => {
    rtcReceivers.receiveOffer(data);
  });
  rtcReceivers.on("message", (data) => {
    io.emit("page/message", { id, data });
  });

  const stateReceivers = new StateReceivers(history, favicon);
  io.on("page/evented", (data) => {
    stateReceivers.receiveEvents(data);
  });

  const windowStateReceivers = new WindowStateReceivers(history, favicon);
  io.on("page/navigated", (data) => {
    windowStateReceivers.receiveNavigation(data);
  });

  const { url } = history.current();
  const size = { width: window.innerWidth, height: window.innerHeight };
  spinner.show();
  favicon.set({ url });
  history.push({ title: url, url });

  // Try to reuse an existing page. This may not work (if the server has been restarted
  // or the page has gone away for another reason). That's fine, the server will call
  // "page/created" either way, with the correct ID so we can update it.
  const existingID = sessionStorage.getItem("pageID");
  io.emit("page/create", { url, id: existingID, ...size });

  io.once("page/created", (page) => {
    id = page.id;
    sessionStorage.setItem("pageID", id);
    io.emit("page/render", { id });
  });
});

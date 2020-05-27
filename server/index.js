import http from "http";
import path from "path";
import socketio from "socket.io";
import url, { URL } from "url";

import express from "express";
import morgan from "morgan";
import puppeteer from "puppeteer";
import shortid from "shortid";

import * as Scripts from "../content/server/scripts.js";
import * as Utils from "./utils.js";

const dir = path.dirname(url.fileURLToPath(import.meta.url));

const browser = puppeteer.launch({
  headless: false,
  product: "firefox",

  // Options to improve debugging changes to firefox:
  args: ["--jsconsole"],
  dumpio: true,

  executablePath:
    "/Users/bgrins/Code/mozilla-central/objdir.noindex/dist/Nightly.app/Contents/MacOS/firefox",
});
const pages = new Map();

const app = express();
const server = http.createServer(app);
const io = socketio.listen(server);
const port = 3000;

app.use(morgan("tiny"));

app.use("/client", express.static("client"));
app.use("/content", express.static("content"));
app.use("/dist", express.static("dist"));

app.get("/favicon.ico", (req, res) => {
  let url;
  try {
    url = new URL(req.query.url);
  } catch (e) {
    res.sendStatus(400);
    return;
  }
  res.redirect(`${url.origin}/favicon.ico`);
});

app.get("*", async (req, res) => {
  const url = req.url.slice(1);
  if (!url) {
    res.redirect("/localhost:3001");
    return;
  }
  const fixed = await Utils.fixUrl(url);
  if (url != fixed) {
    res.redirect(`/${fixed}`);
  } else {
    res.sendFile(path.join(dir, "../client/index.html"));
  }
});

const onMessageFromAgent = (socket, { overriddenType, data }) => {
  if (overriddenType == "mutations") {
    socket.emit("page/mutated", { mutations: data });
  } else if (overriddenType == "bakedDOM") {
    socket.emit("page/rendered", { bakedDOM: data });
  }
  // Add more handlers here (focus changed, value changed, scroll changed, etc)
};

/*
  This is gross, but we took over page.cookies() to message to the
  agent.

  You can add a new message like:

  await messageToAgent(page, "click", {
  remoteID: 1234
  });

  And then handle it over in Network.jsm in the patch at https://github.com/bgrins/firefox-patches/blob/master/remote-changes
*/
const messageToAgent = async (page, messageName, data) => {
  const result = await page.cookies(messageName, data);
  return result[0];
};

io.on("connection", (socket) => {
  socket.on("page/create", async ({ width, height, url }) => {
    const id = shortid.generate();
    let page = null;
    let meta = null;
    try {
      page = await (await browser).newPage();

      page.on("dialog", (dialog) => {
        // We are "borrowing" this event for our own purposes
        if (dialog.type() == "beforeunload" && dialog.message().overriddenType) {
          onMessageFromAgent(socket, dialog.message());
        } else {
          // We should actually forward the dialog to the client
          dialog.dismiss();
        }
      });
      await page.setViewport({ width, height });
      await page.goto(url, { waitUntil: "load" });
      meta = await page.evaluate(Scripts.getMetadata);
    } catch (e) {
      console.error(e);
      return;
    }
    pages.set(id, page);
    socket.emit("page/created", { id, ...meta });
  });

  socket.on("page/delete", async ({ id }) => {
    const page = pages.get(id);
    if (!page) {
      return;
    }
    try {
      await page.close();
    } catch (e) {
      console.error(e);
      return;
    }
    pages.delete(id);
  });

  socket.on("page/render", async ({ id }) => {
    const page = pages.get(id);
    if (!page) {
      return;
    }
    let bakedDOM = null;
    try {
      bakedDOM = await messageToAgent(page, "bakedDOM");
    } catch (e) {
      console.error(e);
      return;
    }
    socket.emit("page/rendered", { bakedDOM: bakedDOM });
  });

  socket.on("page/resize", async ({ id, width, height }) => {
    const page = pages.get(id);
    if (!page) {
      return;
    }
    try {
      await page.setViewport({ width, height });
    } catch (e) {
      console.error(e);
      return;
    }
  });

  socket.on("page/message", async ({ id, data: { is, ...message } }) => {
    const page = pages.get(id);
    if (!page) {
      return;
    }
    console.log(is, message);
    try {
      if (is == "mouse") {
        await messageToAgent(page, "agentClick", message); // TODO: change to `agentMouse`
      } else if (is == "key") {
        await messageToAgent(page, "agentKey", message);
      }
    } catch (e) {
      console.error(e);
      return;
    }
  });
});

server.listen(port, () => console.log(`Listening at http://localhost:${port}`));

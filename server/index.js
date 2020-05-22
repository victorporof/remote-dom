import { promises as fs } from "fs";
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
  executablePath:
    "/Users/bgrins/Code/mozilla-central/objdir.noindex/dist/Nightly.app/Contents/MacOS/firefox",
});
const pages = new Map();

const app = express();
const server = http.createServer(app);
const io = socketio.listen(server);
const port = 3000;

app.use(morgan("tiny"));

app.use("/static", express.static("client"));
app.use("/dist/client", express.static("dist/client"));
app.use("/dist/content", express.static("dist/content"));

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
  const fixed = await Utils.fixUrl(url);
  if (url != fixed) {
    res.redirect(`/${fixed}`);
  } else {
    res.sendFile(path.join(dir, "../client/index.html"));
  }
});

const onMessage = (socket, { type, ...message }) => {
  if (type == "mutations") {
    onMutations(socket, message);
  }
};
const onMutations = (socket, { mutations }) => {
  socket.emit("page/mutated", { mutations });
};

io.on("connection", (socket) => {
  socket.on("page/create", async (data) => {
    const id = shortid.generate();
    let page = null;
    let meta = null;
    try {
      page = await (await browser).newPage();
      page.on("dialog", (dialog) => {
        // We are "borrowing" this event for our own purposes
        if (dialog.type() == "beforeunload") {
          onMutations(socket, {
            mutations: dialog.message(),
          });
        } else {
          dialog.dismiss();
        }
      });
      // page.on("dialog", (dialog) => dialog.dismiss());
      await page.setViewport({ width: data.width, height: data.height });
      await page.goto(data.url, { waitUntil: "load" });
      meta = await page.evaluate(Scripts.getMetadata);
    } catch (e) {
      console.error(e);
      return;
    }
    pages.set(id, page);
    socket.emit("page/created", { id, ...meta });
  });

  socket.on("page/delete", async (data) => {
    const page = pages.get(data.id);
    if (!page) {
      return;
    }
    try {
      await page.close();
    } catch (e) {
      console.error(e);
      return;
    }
    pages.delete(data.id);
  });

  socket.on("page/render", async (data) => {
    const page = pages.get(data.id);
    if (!page) {
      return;
    }
    let bakedDOM = null;
    try {
      // This is gross, but we took over page.cookies() to deliver
      // the initial payload of the baked dom. There's probably also a way
      // to not require a JSON.parse.
      bakedDOM = (await page.cookies())[0];
    } catch (e) {
      console.error(e);
      return;
    }
    socket.emit("page/rendered", { bakedDOM });
  });

  socket.on("page/resize", async (data) => {
    const page = pages.get(data.id);
    if (!page) {
      return;
    }
    try {
      await page.setViewport({ width: data.width, height: data.height });
    } catch (e) {
      console.error(e);
      return;
    }
  });

  socket.on("page/message", async (data) => {
    const page = pages.get(data.id);
    if (!page) {
      return;
    }
    const { type, ...message } = data.data;
    try {
      if (type == "click") {
        // TODO: Add support to puppeteer to handle this instead of a
        // selector.
        // await page.click(`REMOTEID-${message.target}`);
        await page.evaluate(Scripts.simulateClick, message);
      }
    } catch (e) {
      console.error(e);
      return;
    }
  });
});

server.listen(port, () => console.log(`Listening at http://localhost:${port}`));

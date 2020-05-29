import puppeteer from "puppeteer";
import shortid from "shortid";

import * as Scripts from "../content/server/scripts.js";
import config from "../config.js";

const openBrowser = async () => {
  const browser = await puppeteer.launch({
    headless: false,
    product: "firefox",
    args: config.puppeteer.args || [],
    dumpio: config.puppeteer.dumpio || false,
    executablePath: config.puppeteer.executablePath,
  });

  // TODO: Handle lifecycle events
  browser.on("disconnected", (e) => {
    console.log("puppeteer disconnected");
  });
  browser.on("targetchanged", (e) => {
    console.log("puppeteer targetchanged");
  });
  browser.on("targetcreated", (e) => {
    console.log("puppeteer targetcreated");
  });
  browser.on("targetdestroyed", (e) => {
    console.log("puppeteer targetdestroyed");
  });

  return browser;
};

const browser = openBrowser();
const pages = new Map();

const onPageNavigated = async (socket, { page }) => {
  const meta = await page.evaluate(Scripts.getMetadata);
  socket.emit("page/navigated", { ...meta });
};

const onPageDialog = (socket, { dialog }) => {
  const type = dialog.type();
  const message = dialog.message();
  socket.emit("page/dialoged", { type, message });
};

const onMessageFromAgent = (socket, { overriddenType, data }) => {
  if (overriddenType == "mutations") {
    socket.emit("page/mutated", { mutations: data });
  } else if (overriddenType == "events") {
    socket.emit("page/evented", { events: data });
  } else if (overriddenType == "bakedDOM") {
    socket.emit("page/rendered", { bakedDOM: data });
  }
};

const messageToAgent = async (page, messageName, data) => {
  const result = await page.cookies(messageName, data);
  return result[0];
};

export const createPage = async (socket, { width, height, url }) => {
  const id = shortid.generate();
  let page = null;
  try {
    page = await (await browser).newPage();
    page.on("domcontentloaded", () => {
      onPageNavigated(socket, { page });
    });
    page.on("dialog", (dialog) => {
      if ("overriddenType" in dialog.message()) {
        onMessageFromAgent(socket, dialog.message());
      } else {
        onPageDialog(socket, { dialog });
      }
    });
    await page.setViewport({ width, height });
    await page.goto(url, { waitUntil: "load" });
  } catch (e) {
    console.error(e);
    return;
  }
  pages.set(id, page);
  socket.emit("page/created", { id });
};

export const deletePage = async (socket, { id }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to remove with id ${id}`);
    return;
  }
  try {
    await page.close();
  } catch (e) {
    console.error(e);
    return;
  }
  pages.delete(id);
};

export const renderPage = async (socket, { id }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to render with id ${id}`);
    return;
  }
  let bakedDOM = null;
  try {
    bakedDOM = await messageToAgent(page, "bakedDOM");
  } catch (e) {
    console.error(e);
    return;
  }
  socket.emit("page/rendered", { bakedDOM });
};

export const resizePage = async (socket, { id, width, height }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to resize with id ${id}`);
    return;
  }
  try {
    await page.setViewport({ width, height });
  } catch (e) {
    console.error(e);
    return;
  }
};

export const messagePage = async (socket, { id, data: { is, ...message } }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to message with id ${id}`);
    return;
  }
  try {
    if (is == "focus") {
      await messageToAgent(page, "agentFocus", message);
    } else if (is == "mouse") {
      await messageToAgent(page, "agentMouse", message);
    } else if (is == "key") {
      await messageToAgent(page, "agentKey", message);
    } else if (is == "scroll") {
      await messageToAgent(page, "agentScroll", message);
    }
  } catch (e) {
    console.error(e);
    return;
  }
};

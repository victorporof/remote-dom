import puppeteer from "puppeteer";
import shortid from "shortid";

import config from "../config.js";

const openBrowser = async () => {
  const browser = await puppeteer.launch({
    product: "firefox",
    headless: config.puppeteer.headless ?? true,
    args: config.puppeteer.args ?? [],
    dumpio: config.puppeteer.dumpio ?? false,
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
const dialogs = new WeakMap();

const onPageWillNavigateFromAgent = async (socket, { frame }) => {
  socket.emit("page/will-navigate");
};

const onPageNavigatedFromAgent = async (socket, { page }) => {
  const meta = await page.evaluate(() => {
    // eslint-disable-next-line no-undef
    return { title: document.title, url: document.location.href };
  });
  socket.emit("page/navigated", { ...meta });
};

const onPageDialogedFromAgent = (socket, { page, dialog }) => {
  const type = dialog.type();
  const message = dialog.message();
  socket.emit("page/dialoged", { dialog: { type, message } });
  dialogs.set(page, dialog);
};

const onPageDialogedFromClient = ({ page, message }) => {
  const dialog = dialogs.get(page);
  if (message.type == "alert") {
    dialog.dismiss();
  } else if (message.type == "confirm" && message.value == true) {
    dialog.accept();
  } else if (message.type == "confirm" && message.value == false) {
    dialog.dismiss();
  } else if (message.type == "prompt") {
    dialog.accept(message.value);
  } else if (message.type == "beforeunload") {
    // TODO
  }
  dialogs.delete(page);
};

const onMessageFromAgent = (socket, { overriddenType, data }) => {
  if (overriddenType == "bakedDOM") {
    socket.emit("page/rendered", { bakedDOM: data });
  } else if (overriddenType == "mutations") {
    socket.emit("page/mutated", { mutations: data });
  } else if (overriddenType == "events") {
    socket.emit("page/evented", { events: data });
  } else if (overriddenType == "rtc:ice-candidate") {
    socket.emit(`page/streamed/${overriddenType}`, data);
  } else if (overriddenType == "rtc:offer") {
    socket.emit(`page/streamed/${overriddenType}`, data);
  }
};

const messageToAgent = async (page, messageName, data) => {
  const result = await page.cookies(messageName, data);
  return result[0];
};

export const createPage = async (socket, { width, height, url }) => {
  const id = shortid.generate();
  let page = null;
  let current = null;
  try {
    page = await (await browser).newPage();
    page.on("domcontentloaded", () => {
      current = page.url();
      onPageNavigatedFromAgent(socket, { page });
    });
    page.on("framenavigated", (frame) => {
      if (frame == page.mainFrame() && frame.url() != current) {
        onPageWillNavigateFromAgent(socket, { frame });
      }
    });
    page.on("dialog", (dialog) => {
      if (dialog.message().overriddenType) {
        onMessageFromAgent(socket, dialog.message());
      } else {
        onPageDialogedFromAgent(socket, { page, dialog });
      }
    });
    await page.setViewport({ width, height });
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (e) {
    console.error(e);
    return;
  }
  pages.set(id, page);
  socket.emit("page/created", { id });
};

export const navigatePage = async (socket, { id, data: { url } }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to navigate with id ${id}.`);
    return;
  }
  try {
    await page.goto(url, { waitUntil: "domcontentloaded" });
  } catch (e) {
    console.error(e);
    return;
  }
};

export const deletePage = async (socket, { id }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to remove with id ${id}.`);
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
    console.error(`No page to render with id ${id}.`);
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

export const resizePage = async (socket, { id, data: { width, height } }) => {
  const page = pages.get(id);
  if (!page) {
    console.error(`No page to resize with id ${id}.`);
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
    console.error(`No page to message with id ${id}.`);
    return;
  }
  try {
    if (is == "dialog") {
      onPageDialogedFromClient({ page, message });
    } else if (is == "select") {
      await messageToAgent(page, "agentSelect", message);
    } else if (is == "focus") {
      await messageToAgent(page, "agentFocus", message);
    } else if (is == "change") {
      await messageToAgent(page, "agentChange", message);
    } else if (is == "mouse") {
      await messageToAgent(page, "agentMouse", message);
    } else if (is == "key") {
      await messageToAgent(page, "agentKey", message);
    } else if (is == "scroll") {
      await messageToAgent(page, "agentScroll", message);
    } else if (is == "rtc:ice-candidate") {
      await messageToAgent(page, "agentRtcIceCandidate", message);
    } else if (is == "rtc:answer") {
      await messageToAgent(page, "agentRtcAnswer", message);
    }
  } catch (e) {
    console.error(e);
    return;
  }
};

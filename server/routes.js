import path from "path";
import url, { URL } from "url";

import * as Utils from "./utils.js";

const dir = path.dirname(url.fileURLToPath(import.meta.url));

export const favicon = (req, res) => {
  let url;
  try {
    url = new URL(req.query.url);
  } catch (e) {
    res.sendStatus(400);
    return;
  }
  res.redirect(`${url.origin}/favicon.ico`);
};

export const index = async (req, res) => {
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
};

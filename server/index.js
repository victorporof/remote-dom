import http from "http";
import socketio from "socket.io";

import express from "express";
import morgan from "morgan";

import * as Agent from "./agent.js";
import * as Routes from "./routes.js";

const app = express();
const server = http.createServer(app);
const io = socketio.listen(server);
const port = 3000;

app.use(morgan("tiny"));

app.use("/client", express.static("client"));
app.use("/content", express.static("content"));
app.use("/dist", express.static("dist"));

app.get("/favicon.ico", Routes.favicon);
app.get("*", Routes.index);

io.on("connection", (socket) => {
  socket.on("page/create", (...args) => Agent.createPage(socket, ...args));
  socket.on("page/delete", (...args) => Agent.deletePage(socket, ...args));
  socket.on("page/render", (...args) => Agent.renderPage(socket, ...args));
  socket.on("page/resize", (...args) => Agent.resizePage(socket, ...args));
  socket.on("page/message", (...args) => Agent.messagePage(socket, ...args));
});

server.listen(port, () => console.log(`Listening at http://localhost:${port}`));

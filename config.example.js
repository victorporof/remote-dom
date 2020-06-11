/**
 * Copy this to config.js and replace with you environment specific settings
 */
const config = {
  puppeteer: {},
  rtc: {},
  urls: {},
  logging: {},
};

config.puppeteer.executablePath = process.env.EXECUTABLE_PATH || "path/to/firefox";
config.puppeteer.args = ["--jsconsole"];
config.puppeteer.headless = true;
config.puppeteer.dumpio = true;

config.rtc.iceServers = [
  { urls: ["stun:stun.services.mozilla.com:3478"] },
  { urls: ["stun:stun.l.google.com:19302"] },
];

config.urls.home = "localhost:3001";
config.urls.search = "https://www.google.com/search?q=";

config.logging.verbose = false;

export default config;

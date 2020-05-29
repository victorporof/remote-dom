/*
Copy this to config.js and replace with you environment specific settings
*/
const config = {
  puppeteer: {},
};

config.puppeteer.args = ["--jsconsole"];
config.puppeteer.dumpio = true;
config.puppeteer.executablePath =
  process.env.EXECUTABLE_PATH ||
  "/Users/bgrins/Code/mozilla-central/objdir.noindex/dist/Nightly.app/Contents/MacOS/firefox";

module.exports = config;

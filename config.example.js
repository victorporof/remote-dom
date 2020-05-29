/**
 * Copy this to config.js and replace with you environment specific settings
 */
const config = {
  puppeteer: {},
};

config.puppeteer.executablePath = process.env.EXECUTABLE_PATH || "path/to/firefox";
config.puppeteer.args = ["--jsconsole"];
config.puppeteer.dumpio = true;

export default config;

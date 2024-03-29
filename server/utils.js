import isReachable from "is-reachable";
import normalizeUrl from "normalize-url";

export const fixUrl = async (url) => {
  let fixed;
  try {
    // Attempt to convert the user input into an url. Throws if impossible.
    fixed = normalizeUrl(url, { stripWWW: false });
  } catch (e) {
    return null;
  }
  // Certain inputs might be ambiguous: `foo` normalizes to `http://foo`,
  // which may or may not be a real website.
  if (!url.includes(".") && !(await isReachable(fixed))) {
    return null;
  }
  return fixed;
};

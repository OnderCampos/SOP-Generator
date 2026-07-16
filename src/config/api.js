const appEnv = import.meta.env.VITE_APP_ENV;
const devUrl = import.meta.env.VITE_API_URL_DEV;
const prodUrl = import.meta.env.VITE_API_URL_PROD;

if (!appEnv || !devUrl || !prodUrl) {
  throw new Error(
    "Missing frontend API configuration. Expected VITE_APP_ENV, VITE_API_URL_DEV, and VITE_API_URL_PROD.",
  );
}

if (appEnv !== "development" && appEnv !== "production") {
  throw new Error(
    `Unsupported VITE_APP_ENV value "${appEnv}". Use "development" or "production".`,
  );
}

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, "");
}

const generateSopUrl = stripTrailingSlash(
  appEnv === "production" ? prodUrl : devUrl,
);

function replaceGeneratePath(url, nextPath) {
  return url.replace(/\/generate$/, nextPath);
}

export const parseSopUrl = replaceGeneratePath(generateSopUrl, "/parse");
export const analyzeChunkSopUrl = replaceGeneratePath(generateSopUrl, "/analyze_chunk");
export const consolidateSopUrl = replaceGeneratePath(generateSopUrl, "/consolidate");
export const analyzeSopUrl = replaceGeneratePath(generateSopUrl, "/analyze");
export const documentSopUrl = replaceGeneratePath(generateSopUrl, "/document");
export { generateSopUrl };

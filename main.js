// =============================================================================
// Chrome Built-in AI API Codelab - Main script (starter)
// -----------------------------------------------------------------------------
// This file uses four of Chrome's built-in AI APIs:
//   - Summarizer API       : Summarizes text (key-point extraction)
//   - Language Detector API: Detects the language of the input text
//   - Translator API       : Translates between languages (Japanese -> English here)
//   - Prompt API           : General-purpose conversation (LanguageModel)
//
// In this starter, every spot that calls an AI API is left as a TODO comment.
// Follow the instructions in the comments to fill in the code.
// =============================================================================

// -----------------------------------------------------------------------------
// Obtain references to DOM elements
// -----------------------------------------------------------------------------
// Grab every element we will manipulate up front. The script is loaded with
// `<script defer>`, so the DOM is already built at this point.
const startButton = document.getElementById("start-button");
const downloadingMessage = document.getElementById("downloading-message");
const downloadProgress = document.getElementById("download-progress");
const mainContent = document.getElementById("main-content");
const inputMessage = document.getElementById("input-message");
const formatButton = document.getElementById("format-button");
const businessMessage = document.getElementById("business-message");
const outputMessage = document.getElementById("output-message");
const analyzeButton = document.getElementById("analyze-button");
const summaryResult = document.getElementById("summary-result");
const emotionResult = document.getElementById("emotion-result");

// -----------------------------------------------------------------------------
// Variables that hold AI API instances
// -----------------------------------------------------------------------------
// Each instance created by `create()` is stored at module scope so that any
// button handler can reach it. Before initialization the values are `undefined`.
let summarizer; // Summarizer API instance
let languageDetector; // Language Detector API instance
let translatorJaEn; // Translator API instance (Japanese -> English)
let languageModel; // Prompt API (LanguageModel) instance

// -----------------------------------------------------------------------------
// Download progress tracking
// -----------------------------------------------------------------------------
// Each of the four APIs downloads its own model file. We keep the progress
// (a number in the range 0..1) for each API in an array and show the average
// value on screen.
const progresses = [0, 0, 0, 0];

// Convert the average of the four progress values to a percentage (0..100)
// and reflect it on screen.
const updateProgress = () => {
  const average = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
  downloadProgress.textContent = (average * 100).toFixed(0);
};

// Factory function for the `monitor` callback.
// Generating the callback passed to each `create()` with an index lets us tell
// which API the progress event came from, so we can write the value to the
// right slot of the `progresses` array.
//
// Usage:
//   Summarizer.create({ monitor: makeMonitor(0) });
//   -> m.addEventListener('downloadprogress', e => progresses[0] = e.loaded)
const makeMonitor = (index) => (m) => {
  m.addEventListener("downloadprogress", (e) => {
    progresses[index] = e.loaded;
    updateProgress();
  });
};

// -----------------------------------------------------------------------------
// Helper to control a button's loading state
// -----------------------------------------------------------------------------
// Shared logic for switching a button into a "working" state around an async
// operation:
//   - On start: set disabled = true to block double-clicks, change the label.
//   - On end  : restore the original state (the finally block runs even if an
//               exception is thrown, so the button is always restored).
//
// In the CSS we define a spinner animation on `button:disabled::after`, so the
// spinner spins automatically whenever the button becomes disabled.
const withLoading = async (button, loadingLabel, fn) => {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = loadingLabel;
  try {
    await fn();
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
};

// -----------------------------------------------------------------------------
// Initialize all four AI API instances together
// -----------------------------------------------------------------------------
// `Promise.all` downloads / creates all four in parallel. Any model that has
// not been downloaded yet will start downloading automatically.
//
// Note: when calling `create()` while the model is not yet downloaded, a user
// gesture (click, etc.) must be the entry point, or a NotAllowedError is
// thrown.
const initializeInstances = async () => {
  [summarizer, languageDetector, translatorJaEn, languageModel] =
    await Promise.all([
      // TODO: Call Summarizer.create() to create the Summarizer instance.
      //   - type: "key-points" (key-point extraction mode)
      //   - expectedInputLanguages: ["en"]
      //   - outputLanguage: "en"
      //   - monitor: makeMonitor(0)
      // TODO: Call LanguageDetector.create() to create the Language Detector
      //       instance.
      //   - monitor: makeMonitor(1)
      // TODO: Call Translator.create() to create a Japanese -> English
      //       Translator instance.
      //   - sourceLanguage: "ja"
      //   - targetLanguage: "en"
      //   - monitor: makeMonitor(2)
      // TODO: Call LanguageModel.create() to create the LanguageModel
      //       instance.
      //   - monitor: makeMonitor(3)
    ]);
};

// -----------------------------------------------------------------------------
// "Start preparing AI models" button: click to begin downloading the models
// -----------------------------------------------------------------------------
// This button appears only when the availability check below determines that
// the models are not yet downloaded. The click is the user gesture that
// authorizes Chrome's AI APIs to start downloading the models.
startButton.addEventListener("click", async () => {
  startButton.hidden = true;
  downloadingMessage.hidden = false;
  await initializeInstances();
  downloadingMessage.hidden = true;
  mainContent.hidden = false;
});

// -----------------------------------------------------------------------------
// "Format as business writing" button: use the Prompt API to refine the text
// -----------------------------------------------------------------------------
// If a received message (outputMessage) is present, the rewrite is performed
// as a "reply" that respects the context. Otherwise the message is formatted
// on its own.
formatButton.addEventListener("click", () =>
  withLoading(formatButton, "Converting", async () => {
    // Clear any previous result immediately so stale output is not displayed.
    businessMessage.value = "";

    const receivedText = outputMessage.value.trim();

    // Switch prompts depending on whether a received message exists.
    //   - Present: reply mode (passes the received message as context).
    //   - Absent : standalone mode (formats just the outgoing message).
    // The phrase "output only the rewritten text" instructs the model not to
    // add any preamble or explanation.
    const prompt = receivedText
      ? `Rewrite the following "reply message" as a polite, business-appropriate response in English to the "received message" below. Output only the rewritten reply; no preamble or explanation is needed.

Received message:
${receivedText}

Reply message:
${inputMessage.value}`
      : `Rewrite the following message as a polite, business-appropriate text in English. Output only the rewritten text; no preamble or explanation is needed.

Message:
${inputMessage.value}`;

    // TODO: Call languageModel.prompt(prompt) and assign the result to
    //       businessMessage.value. prompt() returns a Promise that resolves
    //       to a string.
  }),
);

// -----------------------------------------------------------------------------
// "Analyze" button: analyze the received message step by step
// -----------------------------------------------------------------------------
// Processing flow:
//   1. Detect the language with the Language Detector.
//   2. If the message is detected as Japanese, translate it to English with
//      the Translator.
//   3. Run summarization (Summarizer) and emotion detection (Prompt API) in
//      parallel.
analyzeButton.addEventListener("click", () =>
  withLoading(analyzeButton, "Analyzing", async () => {
    // Clear the previous results.
    summaryResult.value = "";
    emotionResult.textContent = "";

    // Original received message. Emotion analysis keeps the nuance of the
    // original wording, so we feed it the pre-translation value.
    const received = outputMessage.value;

    // Text used for summarization. If the original was Japanese we replace it
    // with the translated version.
    let text = received;

    // TODO: Call languageDetector.detect(text) and destructure the first
    //       element (the most confident candidate) of the returned array
    //       into topResult.
    //       Return shape: [{ detectedLanguage: 'ja', confidence: 0.98 }, ...]

    // TODO: When topResult.detectedLanguage is "ja", translate the text to
    //       English with translatorJaEn.translate(text) and assign the
    //       result back to text.

    // Prompt for emotion detection.
    //   - Insists strictly on "a single emoji character".
    //   - Provides few-shot examples to convey the expected output shape.
    //   - "Do not include any explanation, symbols, whitespace, or newlines"
    //     suppresses extra characters.
    const emotionPrompt = `From the message below, express the sender's emotion using a single emoji character only.

Examples: 😊 / 😢 / 😡 / 😴 / 😐 / 🤔 / 😍 / 😨

Output only the emoji. Do not include any explanation, symbols, whitespace, or newlines.

Message:
${received}`;

    // TODO: Run summarizer.summarize(text) and
    //       languageModel.prompt(emotionPrompt) in parallel with Promise.all
    //       and destructure the results into summary and emotion. After
    //       that, reflect them on the screen like this:
    //         summaryResult.value = summary;
    //         emotionResult.textContent = emotion.trim();
  }),
);

// -----------------------------------------------------------------------------
// Initialization on page load (IIFE)
// -----------------------------------------------------------------------------
// We run the startup logic inside an Immediately Invoked Function Expression
// because top-level await is unavailable in classic scripts.
//
// Processing flow:
//   1. Check availability for all four APIs in parallel.
//   2. If everything is 'available' (already downloaded), create the instances
//      and show the main UI immediately.
//   3. If at least one model is not downloaded, show the "Start" button and
//      wait for a user gesture.
(async () => {
  // availability() returns one of:
  //   'unavailable'  : not usable in this environment
  //   'downloadable' : usable but not downloaded (requires user gesture)
  //   'downloading'  : currently downloading
  //   'available'    : ready to use immediately
  //
  // For some APIs the availability depends on the options that would be
  // passed to create(), so we mirror the same options here.

  // TODO: Check availability() for all four APIs in parallel with
  //       Promise.all and assign the result to availabilities.
  //   - Summarizer.availability({ expectedInputLanguages: ["en"], outputLanguage: "en" })
  //   - LanguageDetector.availability()
  //   - Translator.availability({ sourceLanguage: "ja", targetLanguage: "en" })
  //   - LanguageModel.availability()
  const availabilities = [];

  // If every API is 'available', we can instantiate without a user gesture.
  const allAvailable = availabilities.every((a) => a === "available");

  if (allAvailable) {
    // Models are ready: instantiate transparently and reveal the main UI.
    await initializeInstances();
    mainContent.hidden = false;
  } else {
    // At least one model is not downloaded: show the "Start" button and wait
    // for the user gesture.
    startButton.hidden = false;
  }
})();

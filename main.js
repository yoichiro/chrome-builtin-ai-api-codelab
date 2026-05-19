// =============================================================================
// Chrome Built-in AI API Codelab - メインスクリプト (スターター)
// -----------------------------------------------------------------------------
// このファイルでは、Chrome の組み込み AI API を 4 つ使用します:
//   - Summarizer API       : テキストの要約 (要点抽出)
//   - Language Detector API: 入力テキストの言語判定
//   - Translator API       : 言語間の翻訳 (今回は英語 → 日本語)
//   - Prompt API           : 汎用の対話 (LanguageModel)
//
// このスターターでは AI API を呼び出している箇所がすべて TODO コメントに
// なっています。コメントの指示に従ってコードを埋めていきましょう。
// =============================================================================

// -----------------------------------------------------------------------------
// DOM 要素の取得
// -----------------------------------------------------------------------------
// ページ内で操作する要素を最初にまとめて取得しておく。
// `<script defer>` で読み込んでいるため、この時点で DOM は構築済み。
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
// AI API インスタンスの保持変数
// -----------------------------------------------------------------------------
// `create()` で生成した各 API のインスタンスを、ボタンハンドラから参照できるよう
// モジュールスコープに保持する。初期化前は `undefined`。
let summarizer; // Summarizer API のインスタンス
let languageDetector; // Language Detector API のインスタンス
let translatorEnJa; // Translator API のインスタンス (英語 → 日本語)
let languageModel; // Prompt API (LanguageModel) のインスタンス

// -----------------------------------------------------------------------------
// ダウンロード進捗の管理
// -----------------------------------------------------------------------------
// 4 つの API はそれぞれモデルファイルをダウンロードする。
// 各 API ごとの進捗 (0 〜 1 の範囲) を配列で保持し、平均値を画面に表示する。
const progresses = [0, 0, 0, 0];

// 4 つの進捗の平均をパーセント (0 〜 100) に変換して画面に反映する関数。
const updateProgress = () => {
  const average = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
  downloadProgress.textContent = (average * 100).toFixed(0);
};

// `monitor` コールバック用のファクトリ関数。
// 各 API の `create()` に渡す関数を index 付きで生成することで、
// どの API の進捗イベントなのかを区別して progresses 配列に書き込める。
//
// 使い方:
//   Summarizer.create({ monitor: makeMonitor(0) });
//   → m.addEventListener('downloadprogress', e => progresses[0] = e.loaded)
const makeMonitor = (index) => (m) => {
  m.addEventListener("downloadprogress", (e) => {
    progresses[index] = e.loaded;
    updateProgress();
  });
};

// -----------------------------------------------------------------------------
// ボタンのローディング状態を制御するヘルパー
// -----------------------------------------------------------------------------
// 非同期処理の前後でボタンを「処理中」状態に切り替えるための共通ロジック。
//   - 開始時: disabled = true にして二重クリックを防止、ラベルを変更
//   - 終了時: 元の状態に戻す (例外が発生しても finally で必ず復帰)
//
// CSS 側で `button:disabled::after` にスピナーアニメーションを定義しているため、
// disabled になると自動的にスピナーが回る仕組み。
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
// 4 つの AI API インスタンスをまとめて初期化
// -----------------------------------------------------------------------------
// `Promise.all` で 4 つを並列にダウンロード / 生成する。
// それぞれ未ダウンロード状態なら自動的にダウンロードが開始される。
//
// 注意: モデル未ダウンロード時に `create()` を呼ぶ場合、ユーザー操作
// (クリックなど) を起点にしないと NotAllowedError が発生する。
const initializeInstances = async () => {
  [summarizer, languageDetector, translatorEnJa, languageModel] =
    await Promise.all([
      // TODO: Summarizer.create() を呼び出して Summarizer インスタンスを生成してください。
      //   - type: "key-points" (要点抽出モード)
      //   - expectedInputLanguages: ["ja"]
      //   - outputLanguage: "ja"
      //   - monitor: makeMonitor(0)
      // TODO: LanguageDetector.create() を呼び出して Language Detector インスタンスを
      //       生成してください。
      //   - monitor: makeMonitor(1)
      // TODO: Translator.create() を呼び出して 英語 → 日本語の Translator インスタンスを
      //       生成してください。
      //   - sourceLanguage: "en"
      //   - targetLanguage: "ja"
      //   - monitor: makeMonitor(2)
      // TODO: LanguageModel.create() を呼び出して LanguageModel インスタンスを
      //       生成してください。
      //   - monitor: makeMonitor(3)
    ]);
};

// -----------------------------------------------------------------------------
// 「AIモデルの準備を開始」ボタン: クリックでモデルのダウンロードを開始
// -----------------------------------------------------------------------------
// 後述の availability チェックで、モデルが未ダウンロードだった場合のみ
// このボタンが表示される。クリックがユーザー操作の起点となり、
// Chrome の AI API がモデルダウンロードを許可するようになる。
startButton.addEventListener("click", async () => {
  startButton.hidden = true;
  downloadingMessage.hidden = false;
  await initializeInstances();
  downloadingMessage.hidden = true;
  mainContent.hidden = false;
});

// -----------------------------------------------------------------------------
// 「ビジネス文書化」ボタン: Prompt API で送信メッセージを整形
// -----------------------------------------------------------------------------
// 受信メッセージ (outputMessage) が入力されている場合は「返信」として
// 文脈を踏まえた整形を行い、未入力の場合は単独でビジネス文書化する。
formatButton.addEventListener("click", () =>
  withLoading(formatButton, "変換中", async () => {
    // 直前の結果を即座にクリア (古い表示が残らないようにする)
    businessMessage.value = "";

    const receivedText = outputMessage.value.trim();

    // 受信メッセージの有無でプロンプトを切り替える。
    //   - あり: 返信モード (受信メッセージを文脈として渡す)
    //   - なし: 単独モード (送信メッセージのみを整形)
    // 「書き直した文面のみを出力」と明示することで、
    // モデルが余計な前置きや説明を付けないようにしている。
    const prompt = receivedText
      ? `以下に示す「受信メッセージ」に対する返信として、「返信メッセージ」をビジネス文書としてふさわしい丁寧な日本語の文面に書き直してください。書き直した返信文のみを出力し、説明や前置きは不要です。

受信メッセージ:
${receivedText}

返信メッセージ:
${inputMessage.value}`
      : `次のメッセージを、ビジネス文書としてふさわしい丁寧な日本語の文面に書き直してください。書き直した文面のみを出力し、説明や前置きは不要です。

メッセージ:
${inputMessage.value}`;

    // TODO: languageModel.prompt(prompt) を呼び出して、結果を businessMessage.value に
    //       代入してください。prompt() は文字列を返す Promise です。
  }),
);

// -----------------------------------------------------------------------------
// 「解析する」ボタン: 受信メッセージを段階的に解析
// -----------------------------------------------------------------------------
// 処理の流れ:
//   1. Language Detector で言語を判定
//   2. 英語と判定されたら Translator で日本語に翻訳
//   3. 要約 (Summarizer) と 感情判定 (Prompt API) を並列実行
analyzeButton.addEventListener("click", () =>
  withLoading(analyzeButton, "解析中", async () => {
    // 直前の結果をクリア
    summaryResult.value = "";
    emotionResult.textContent = "";

    // 元の受信メッセージ。感情解析は原文のニュアンスを保つため
    // 翻訳前のこの値を使う。
    const received = outputMessage.value;

    // 要約用のテキスト。英語だった場合は翻訳後に置き換える。
    let text = received;

    // TODO: languageDetector.detect(text) を呼び出して、戻り値の配列から
    //       先頭 (最も信頼度の高い候補) を分割代入で topResult に取り出してください。
    //       戻り値の形式: [{ detectedLanguage: 'en', confidence: 0.98 }, ...]

    // TODO: topResult.detectedLanguage が "en" のとき、
    //       translatorEnJa.translate(text) で日本語に翻訳し、text に代入してください。

    // 感情解析用のプロンプト。
    //   - 「絵文字一文字だけ」と厳密に指示
    //   - 例 (few-shot) を提示して出力イメージを伝える
    //   - 「説明や記号、空白、改行は含めない」で余計な文字を抑制
    const emotionPrompt = `以下のメッセージから読み取れる送信者の感情を、絵文字一文字だけで表現してください。

例: 😊 / 😢 / 😡 / 😴 / 😐 / 🤔 / 😍 / 😨

絵文字のみを出力し、説明や記号、空白、改行は一切含めないでください。

メッセージ:
${received}`;

    // TODO: summarizer.summarize(text) と languageModel.prompt(emotionPrompt) を
    //       Promise.all で並列実行し、結果を summary と emotion に分割代入してください。
    //       取得後は以下のように画面に反映します:
    //         summaryResult.value = summary;
    //         emotionResult.textContent = emotion.trim();
  }),
);

// -----------------------------------------------------------------------------
// ページ読み込み時の初期化処理 (IIFE)
// -----------------------------------------------------------------------------
// 即時実行関数 (Immediately Invoked Function Expression) で起動処理を実行。
// クラシックスクリプトではトップレベル await が使えないためこの形にしている。
//
// 処理の流れ:
//   1. 4 つの API の availability を並列にチェック
//   2. 全部 'available' (ダウンロード済み) ならインスタンスを生成して即メイン表示
//   3. ひとつでも未ダウンロードがあれば「開始」ボタンを表示し、ユーザー操作を待つ
(async () => {
  // availability() は以下のいずれかを返す:
  //   'unavailable'  : この環境では利用不可
  //   'downloadable' : 利用可能だが未ダウンロード (要ユーザー操作)
  //   'downloading'  : 現在ダウンロード中
  //   'available'    : すぐに使える状態
  //
  // `create()` 時のオプションによって availability が変わる API もあるため、
  // ここでも create() と同じオプションで揃えてチェックする。

  // TODO: 4 つの API の availability() を Promise.all で並列にチェックし、
  //       結果を availabilities に代入してください。
  //   - Summarizer.availability({ expectedInputLanguages: ["ja"], outputLanguage: "ja" })
  //   - LanguageDetector.availability()
  //   - Translator.availability({ sourceLanguage: "en", targetLanguage: "ja" })
  //   - LanguageModel.availability()
  const availabilities = [];

  // 全部 'available' なら、ユーザー操作なしで即インスタンス化できる。
  const allAvailable = availabilities.every((a) => a === "available");

  if (allAvailable) {
    // モデル準備済み: 透過的にインスタンス生成してメイン画面へ
    await initializeInstances();
    mainContent.hidden = false;
  } else {
    // 未ダウンロードあり: 「開始」ボタンを表示してユーザー操作を待つ
    startButton.hidden = false;
  }
})();

/*
  FEELIE — распознавание Smile / Sad через Teachable Machine.
  Когда пришлёшь ссылку на свою модель, вставим её вместо MODEL_URL.
*/
const MODEL_URL = "https://teachablemachine.withgoogle.com/models/tX7kNMupm/";

const startButton = document.getElementById("startButton");
const stopButton = document.getElementById("stopButton");
const cameraStatus = document.getElementById("cameraStatus");
const cameraPlaceholder = document.getElementById("cameraPlaceholder");
const webcamContainer = document.getElementById("webcam-container");
const cameraLabel = document.getElementById("cameraLabel");
const emotionResult = document.getElementById("emotionResult");
const emotionIllustration = document.getElementById("emotionIllustration");
const emotionName = document.getElementById("emotionName");
const emotionMessage = document.getElementById("emotionMessage");
const confidenceText = document.getElementById("confidenceText");
const confidenceFill = document.getElementById("confidenceFill");
const livePill = document.querySelector(".live-pill");

let model = null;
let webcam = null;
let animationId = null;
let running = false;

function setResult(type, confidence) {
  const percent = Math.round(confidence * 100);
  emotionResult.classList.remove("is-smile", "is-sad");

  if (type === "smile") {
    emotionResult.classList.add("is-smile");
    emotionIllustration.textContent = "☺";
    emotionName.textContent = "Smile — радость";
    emotionMessage.textContent = "Похоже, ты улыбаешься! Пусть день будет приятным ♡";
  } else if (type === "sad") {
    emotionResult.classList.add("is-sad");
    emotionIllustration.textContent = "☹";
    emotionName.textContent = "Sad — грусть";
    emotionMessage.textContent = "Возможно, тебе грустно. Будь к себе бережна ♡";
  } else {
    emotionIllustration.textContent = "♡";
    emotionName.textContent = "Пока не знаю";
    emotionMessage.textContent = "Модель пока не уверена в результате.";
  }

  confidenceText.textContent = `${percent}%`;
  confidenceFill.style.width = `${percent}%`;
}

async function startCamera() {
  if (!MODEL_URL) {
    alert("Не найдена ссылка на модель Teachable Machine. Проверь настройку MODEL_URL в script.js.");
    return;
  }

  startButton.disabled = true;
  startButton.textContent = "Загрузка…";

  try {
    const modelURL = MODEL_URL + "model.json";
    const metadataURL = MODEL_URL + "metadata.json";
    model = await tmImage.load(modelURL, metadataURL);

    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    webcam = new tmImage.Webcam(480, 360, true);
    await webcam.setup();

    webcamContainer.innerHTML = "";
    if (isIOS) {
      // iOS Safari needs the underlying video element attached to the page.
      webcamContainer.appendChild(webcam.webcam);
      webcam.webcam.setAttribute("playsinline", "true");
      webcam.webcam.muted = true;
      webcam.webcam.style.width = "100%";
      webcam.webcam.style.height = "100%";
      webcam.webcam.style.objectFit = "cover";
    } else {
      webcamContainer.appendChild(webcam.canvas);
    }
    await webcam.play();

    cameraPlaceholder.style.display = "none";
    webcamContainer.style.display = "flex";
    cameraLabel.style.display = "none";

    running = true;
    stopButton.disabled = false;
    cameraStatus.textContent = "работает";
    livePill.classList.add("is-live");
    startButton.innerHTML = "<span>✓</span> Камера включена";
    startButton.disabled = true;

    window.requestAnimationFrame(loop);
  } catch (error) {
    console.error(error);
    alert("Не удалось запустить камеру. Проверь ссылку на модель и разрешение на использование камеры. Обычно камера работает на HTTPS или localhost.");
    startButton.disabled = false;
    startButton.innerHTML = "<span>▶</span> Попробовать снова";
    if (webcam) {
      try { webcam.stop(); } catch (_) {}
      webcam = null;
    }
  }
}

async function loop() {
  if (!running || !webcam || !model) return;
  webcam.update();
  await predictEmotion();
  if (running) animationId = window.requestAnimationFrame(loop);
}

async function predictEmotion() {
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const predictions = await model.predict(isIOS ? webcam.webcam : webcam.canvas);
  if (!predictions.length) return;

  // Ищем классы по названию: Smile и Sad (без учёта регистра).
  const smileClass = predictions.find(p => /smile|happy|улыб/i.test(p.className));
  const sadClass = predictions.find(p => /sad|груст/i.test(p.className));

  let chosen = null;
  let type = "unknown";

  if (smileClass && sadClass) {
    chosen = smileClass.probability >= sadClass.probability ? smileClass : sadClass;
    type = chosen === smileClass ? "smile" : "sad";
  } else {
    chosen = predictions.reduce((best, item) => item.probability > best.probability ? item : best, predictions[0]);
    if (/smile|happy|улыб/i.test(chosen.className)) type = "smile";
    if (/sad|груст/i.test(chosen.className)) type = "sad";
  }

  setResult(type, chosen.probability);
}

function stopCamera() {
  running = false;
  if (animationId) window.cancelAnimationFrame(animationId);
  if (webcam) {
    webcam.stop();
    webcam = null;
  }

  webcamContainer.innerHTML = "";
  webcamContainer.style.display = "none";
  cameraPlaceholder.style.display = "flex";
  cameraLabel.style.display = "block";
  cameraStatus.textContent = "не запущена";
  livePill.classList.remove("is-live");
  startButton.disabled = false;
  startButton.innerHTML = "<span>▶</span> Включить камеру";
  stopButton.disabled = true;
  setResult("unknown", 0);
}

startButton.addEventListener("click", startCamera);
stopButton.addEventListener("click", stopCamera);
window.addEventListener("beforeunload", () => {
  if (webcam) webcam.stop();
});

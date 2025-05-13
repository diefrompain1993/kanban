// server.js
require("dotenv").config();            // обязательно в начале
const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

const app = express();
app.use(cors());
app.use(express.json());

const SHEET_URL = process.env.SHEET_WEBAPP_URL;
if (!SHEET_URL) {
  console.error("❌ Ошибка: переменная SHEET_WEBAPP_URL не задана");
  process.exit(1);
}

/**
 * Вспомогательная функция для вызова Google Apps Script
 */
async function callSheetAPI(body) {
  const resp = await axios.post(
    SHEET_URL,
    body,
    { headers: { "Content-Type": "application/json" } }
  );
  return resp.data;
}

let tasksCache = [];

/**
 * Обновляет локальный кэш из Google Sheet
 */
async function refreshCache() {
  try {
    const data = await callSheetAPI({ action: "get" });
    if (data.tasks && Array.isArray(data.tasks)) {
      tasksCache = data.tasks;
      console.log(`✅ Кэш обновлён: ${tasksCache.length} задач`);
    } else {
      throw new Error("Неверный формат ответа от Sheet API");
    }
  } catch (e) {
    console.error("❌ refreshCache failed:", e.toString());
  }
}

// сразу поднять кэш
refreshCache();
// и потом каждые 5 минут
setInterval(refreshCache, 5 * 60 * 1000);


// ----- Эндпоинты -----

// 1) Получить доску
app.get("/api/board", (req, res) => {
  res.json({ tasks: tasksCache });
});

// 2) Добавить карточку
app.post("/api/addTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "add", payload: card });
    await refreshCache();
    res.json({ success: true });
  } catch (e) {
    console.error("addTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 3) Обновить только статус (Drag&Drop)
app.post("/api/updateTask", async (req, res) => {
  try {
    const { card } = req.body;               // получаем весь объект карточки
    await callSheetAPI({ action: "update", payload: card });
    await refreshCache();
    res.json({ success: true });
  } catch (e) {
    console.error("updateTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 4) Полностью отредактировать карточку (даты, теги, чеклист и т.п.)
app.post("/api/editTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "update", payload: card });
    await refreshCache();
    res.json({ success: true });
  } catch (e) {
    console.error("editTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 5) Удалить карточку
app.post("/api/deleteTask", async (req, res) => {
  try {
    const { id } = req.body;
    await callSheetAPI({ action: "delete", payload: { id } });
    await refreshCache();
    res.json({ success: true });
  } catch (e) {
    console.error("deleteTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// ----- Запуск -----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

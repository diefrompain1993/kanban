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

let tasksCache = [];

/**
 * Запрашивает у Google Apps Script весь список тасок
 * и обновляет локальный кэш.
 */
async function refreshCache() {
  try {
    const resp = await axios.post(
      SHEET_URL,
      { action: "get" },
      { headers: { "Content-Type": "application/json" } }
    );
    if (resp.data && Array.isArray(resp.data.tasks)) {
      tasksCache = resp.data.tasks;
      console.log(`✅ Кэш обновлён: ${tasksCache.length} задач`);
    } else {
      throw new Error("Неверный формат ответа от Google Sheet");
    }
  } catch (err) {
    console.error("❌ Не удалось загрузить задачи из Sheet:", err.toString());
  }
}

// При старте подгружаем кэш
refreshCache();
// Обновляем каждые 5 минут (5 * 60 * 1000 ms)
setInterval(refreshCache, 5 * 60 * 1000);


/**
 * Прокси к Google Apps Script
 */
async function callSheetAPI(body) {
  const resp = await axios.post(
    SHEET_URL,
    body,
    { headers: { "Content-Type": "application/json" } }
  );
  return resp.data;
}


// ----- Эндпоинты для фронта -----

// 1) Отдаем доску (из кэша)
app.get("/api/board", (req, res) => {
  res.json({ tasks: tasksCache });
});

// 2) Добавить задачу
app.post("/api/addTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "add", payload: card });
    await refreshCache();
    res.json({ success: true });
  } catch (err) {
    console.error("addTask error:", err.toString());
    res.status(500).json({ error: err.toString() });
  }
});

// 3) Обновить задачу (статус)
app.post("/api/updateTask", async (req, res) => {
  try {
    const { id, status } = req.body;
    await callSheetAPI({ action: "update", payload: { id, status } });
    await refreshCache();
    res.json({ success: true });
  } catch (err) {
    console.error("updateTask error:", err.toString());
    res.status(500).json({ error: err.toString() });
  }
});

// 4) Полностью отредактировать карточку
app.post("/api/editTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "update", payload: card });
    await refreshCache();
    res.json({ success: true });
  } catch (err) {
    console.error("editTask error:", err.toString());
    res.status(500).json({ error: err.toString() });
  }
});

// 5) Удалить задачу
app.post("/api/deleteTask", async (req, res) => {
  try {
    const { id } = req.body;
    await callSheetAPI({ action: "delete", payload: { id } });
    await refreshCache();
    res.json({ success: true });
  } catch (err) {
    console.error("deleteTask error:", err.toString());
    res.status(500).json({ error: err.toString() });
  }
});


// ----- Запуск сервера -----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

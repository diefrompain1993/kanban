require("dotenv").config();
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

// Функция для POST-запроса к вашему Apps Script WebApp
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
 * Обновляет локальный кэш из Google Sheet.
 * Все ошибки ловим и логируем, чтобы сервер не упал.
 */
async function refreshCache() {
  try {
    const data = await callSheetAPI({ action: "get" });
    if (data.tasks && Array.isArray(data.tasks)) {
      tasksCache = data.tasks;
      console.log(`✅ [${new Date().toLocaleTimeString()}] Кэш обновлён: ${tasksCache.length} задач`);
    } else {
      throw new Error("Неверный формат ответа от Sheet API");
    }
  } catch (e) {
    console.error("❌ refreshCache failed:", e.toString());
  }
}

// 1) Поднять кэш сразу при старте
refreshCache();

// 2) Обновлять кэш каждые 30 секунд (можете поставить любую частоту: 10 сек или 5 сек)
setInterval(refreshCache, 30 * 1000);


// ----- Эндпоинты для фронта -----


// 1) Получить доску из кэша (всё, что у нас есть следующим refreshCache)
app.get("/api/board", (req, res) => {
  res.json({ tasks: tasksCache });
});


// 2) Добавить карточку
app.post("/api/addTask", async (req, res) => {
  try {
    const { card } = req.body;

    // Просто отсылаем "action: 'add'" и сразу отвечаем клиенту OK
    await callSheetAPI({ action: "add", payload: card })
      .catch(err => {
        // Если Google Script вернул ошибку, то кинем её дальше
        throw new Error("SheetAPI(add) error: " + err.toString());
      });

    // Оптимистически добавим карточку в локальный кэш (на короткое время, пока не придёт настоящий refresh):
    // Можно проверить, что у card есть уникальное поле ID (например, card.id), чтобы не было дублей.
    tasksCache.push(card);

    // Немедленно отвечаем клиенту, чтобы он видел «успех» без долгого ожидания get-запроса
    res.json({ success: true });
    
    // Не ждём здесь refreshCache. Полный get придёт просто по расписанию.
  } catch (e) {
    console.error("addTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});


// 3) Обновить только статус (Drag&Drop)
app.post("/api/updateTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "update", payload: card })
      .catch(err => { throw new Error("SheetAPI(update) error: " + err.toString()); });

    // В локальном кэше найдём задачу по ID и поменяем статус (оптимистично):
    const idx = tasksCache.findIndex(t => t.id === card.id);
    if (idx > -1) {
      tasksCache[idx] = { ...tasksCache[idx], ...card };
    } else {
      // если вдруг нет в кэше (редкий случай), просто запустим refreshCache
      refreshCache().catch(_=>{});
    }

    res.json({ success: true });
    // Полный refreshCache придёт по таймеру максимум через 30 сек.
  } catch (e) {
    console.error("updateTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});


// 4) Полностью отредактировать карточку (даты, теги, чеклист и т.п.)
app.post("/api/editTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "update", payload: card })
      .catch(err => { throw new Error("SheetAPI(edit) error: " + err.toString()); });

    // Оптимистично обновляем кэш
    const idx = tasksCache.findIndex(t => t.id === card.id);
    if (idx > -1) {
      tasksCache[idx] = { ...tasksCache[idx], ...card };
    } else {
      refreshCache().catch(_=>{});
    }

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
    await callSheetAPI({ action: "delete", payload: { id } })
      .catch(err => { throw new Error("SheetAPI(delete) error: " + err.toString()); });

    // Оптимистично убираем из локального кэша (если там есть)
    tasksCache = tasksCache.filter(t => t.id !== id);

    res.json({ success: true });
  } catch (e) {
    console.error("deleteTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});


// ----- Запуск API -----
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

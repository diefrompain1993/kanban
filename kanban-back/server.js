require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const SHEET_URL = process.env.SHEET_WEBAPP_URL;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

if (!SHEET_URL) {
  console.error("❌ Ошибка: переменная SHEET_WEBAPP_URL не задана");
  process.exit(1);
}

// ======== Вспомогательные ========

async function callSheetAPI(body) {
  const resp = await axios.post(SHEET_URL, body, {
    headers: { "Content-Type": "application/json" },
  });
  return resp.data;
}

let tasksCache = [];
let usersCache = [];

async function refreshCache() {
  try {
    const data = await callSheetAPI({ action: "get" });
    if (Array.isArray(data.tasks)) {
      tasksCache = data.tasks;
      console.log(`✅ [${new Date().toLocaleTimeString()}] Кэш обновлён: ${tasksCache.length} задач`);
    } else throw new Error("Неверный формат данных от Sheet API");
  } catch (e) {
    console.error("❌ refreshCache error:", e.toString());
  }
}

async function refreshUsersCache() {
  try {
    const data = await callSheetAPI({ action: "getUsers" });
    if (Array.isArray(data.users)) {
      usersCache = data.users;
      console.log(`✅ Users cache updated: ${usersCache.length} users`);
    } else throw new Error("Неверный формат данных от Sheet API");
  } catch (e) {
    console.error("❌ refreshUsersCache error:", e.toString());
  }
}

// Сразу обновим кэши и запустим обновление по расписанию
refreshCache();
refreshUsersCache();
setInterval(refreshCache, 30 * 1000);
setInterval(refreshUsersCache, 60 * 1000);

// ======== Middleware авторизации ========

function authMiddleware(req, res, next) {
  if (req.path === "/api/login") return next();
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Invalid token" });
  }
}

app.use("/api", authMiddleware);

// ======== Эндпоинты ========

// 1. Авторизация
app.post("/api/login", async (req, res) => {
  const { login, password } = req.body || {};
  try {
    if (!usersCache.length) await refreshUsersCache();

    const user = usersCache.find(
      (u) => u.login === login && u.password === password
    );
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ login }, JWT_SECRET);
    res.json({ token });
  } catch (e) {
    console.error("Login error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 2. Получить доску
app.get("/api/board", (req, res) => {
  res.json({ tasks: tasksCache });
});

// 3. Добавить задачу
app.post("/api/addTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "add", payload: card });
    tasksCache.push(card);
    res.json({ success: true });
  } catch (e) {
    console.error("addTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 4. Обновить статус задачи
app.post("/api/updateTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "update", payload: card });

    const idx = tasksCache.findIndex((t) => t.id === card.id);
    if (idx > -1) {
      tasksCache[idx] = { ...tasksCache[idx], ...card };
    } else {
      refreshCache().catch(() => {});
    }

    res.json({ success: true });
  } catch (e) {
    console.error("updateTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 5. Полное редактирование задачи
app.post("/api/editTask", async (req, res) => {
  try {
    const { card } = req.body;
    await callSheetAPI({ action: "update", payload: card });

    const idx = tasksCache.findIndex((t) => t.id === card.id);
    if (idx > -1) {
      tasksCache[idx] = { ...tasksCache[idx], ...card };
    } else {
      refreshCache().catch(() => {});
    }

    res.json({ success: true });
  } catch (e) {
    console.error("editTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// 6. Удаление задачи
app.post("/api/deleteTask", async (req, res) => {
  try {
    const { id } = req.body;
    await callSheetAPI({ action: "delete", payload: { id } });
    tasksCache = tasksCache.filter((t) => t.id !== id);
    res.json({ success: true });
  } catch (e) {
    console.error("deleteTask error:", e.toString());
    res.status(500).json({ error: e.toString() });
  }
});

// ======== Запуск ========
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

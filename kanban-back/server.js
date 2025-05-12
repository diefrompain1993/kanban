// server.js
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());            // разрешает любые Origin
app.use(express.json());

let tasksInMemory = [];      // временное хранилище

// 1) CRUD для фронта
app.get("/api/board", (req, res) => {
  res.json({ tasks: tasksInMemory });
});

app.post("/api/addTask", (req, res) => {
  const { card } = req.body;
  tasksInMemory.push({ ...card });
  res.json({ success: true });
});

app.post("/api/updateTask", (req, res) => {
  const { id, status } = req.body;
  const task = tasksInMemory.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.status = status;
  res.json({ success: true });
});

app.post("/api/editTask", (req, res) => {
  const { card } = req.body;
  const idx = tasksInMemory.findIndex(t => t.id === card.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  tasksInMemory[idx] = { ...card };
  res.json({ success: true });
});

app.post("/api/deleteTask", (req, res) => {
  const { id } = req.body;
  const before = tasksInMemory.length;
  tasksInMemory = tasksInMemory.filter(t => t.id !== id);
  if (tasksInMemory.length === before)
    return res.status(404).json({ error: "Task not found" });
  res.json({ success: true });
});

// 2) Прокси в Google Apps Script
const SHEET_WEBAPP_URL =
  "https://script.google.com/macros/s/AKfycbzFb8y_Plq17Oh5lklGqfpvgZsjl8nmeylXBx_ty4uMEjI_6TbrXRpKmxiz8MIBPQ2C/exec";

app.post("/api/sheet", async (req, res) => {
  console.log("→ /api/sheet:", req.body);
  try {
    const response = await axios.post(
      SHEET_WEBAPP_URL,
      req.body,
      { headers: { "Content-Type": "application/json" } }
    );
    res.json(response.data);
  } catch (err) {
    console.error("Sheet proxy error:", err.toString());
    res.status(500).json({ error: "Sheet proxy failed", details: err.toString() });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// server.js
require("dotenv").config();              // загружаем .env перед всеми остальными require
const express = require("express");
const cors    = require("cors");
const axios   = require("axios");

console.log("→ ENV → SHEET_WEBAPP_URL =", process.env.SHEET_WEBAPP_URL);

const app = express();
app.use(cors());
app.use(express.json());

let tasksInMemory = [];

// 1) CRUD для фронта
app.get("/api/board", async (req, res) => {
  try {
    const url = process.env.SHEET_WEBAPP_URL;
    if (!url) throw new Error("SHEET_WEBAPP_URL is not defined");

    const response = await axios.post(
      url,
      { action: "get" },
      { headers: { "Content-Type": "application/json" } }
    );

    res.json({ tasks: response.data.tasks });
  } catch (err) {
    console.error("Error fetching sheet:", err.toString());
    res.status(500).json({ error: "Failed to load tasks from sheet" });
  }
});

app.post("/api/addTask", (req, res) => {
  const { card } = req.body;
  tasksInMemory.push({ ...card });
  axios
    .post("/api/sheet", { action: "add", payload: card })
    .catch(console.error);
  res.json({ success: true });
});

app.post("/api/updateTask", (req, res) => {
  const { id, status } = req.body;
  const task = tasksInMemory.find(t => t.id === id);
  if (!task) return res.status(404).json({ error: "Task not found" });
  task.status = status;
  axios
    .post("/api/sheet", { action: "update", payload: { id, status } })
    .catch(console.error);
  res.json({ success: true });
});

app.post("/api/editTask", (req, res) => {
  const { card } = req.body;
  const idx = tasksInMemory.findIndex(t => t.id === card.id);
  if (idx === -1) return res.status(404).json({ error: "Task not found" });
  tasksInMemory[idx] = { ...card };
  axios
    .post("/api/sheet", { action: "update", payload: card })
    .catch(console.error);
  res.json({ success: true });
});

app.post("/api/deleteTask", (req, res) => {
  const { id } = req.body;
  const before = tasksInMemory.length;
  tasksInMemory = tasksInMemory.filter(t => t.id !== id);
  if (tasksInMemory.length === before)
    return res.status(404).json({ error: "Task not found" });
  axios
    .post("/api/sheet", { action: "delete", payload: { id } })
    .catch(console.error);
  res.json({ success: true });
});

// 2) Прокси в Google Apps Script
app.post("/api/sheet", async (req, res) => {
  console.log("→ /api/sheet:", req.body);
  try {
    const url = process.env.SHEET_WEBAPP_URL;
    if (!url) throw new Error("SHEET_WEBAPP_URL is not defined");

    const response = await axios.post(
      url,
      req.body,
      { headers: { "Content-Type": "application/json" } }
    );
    res.json(response.data);
  } catch (err) {
    console.error("Sheet proxy error:", err.toString());
    res
      .status(500)
      .json({ error: "Sheet proxy failed", details: err.toString() });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

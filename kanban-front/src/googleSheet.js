// src/googleSheet.js

/**
 * Вспомогательная функция для POST в Google Apps Script через ваш сервер.
 * Все запросы идут на /api/sheet вашего Express-прокси.
 */
const SHEET_API_URL = "/api/sheet";

async function postToSheet(action, payload) {
  const res = await fetch(SHEET_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Sheet API error ${res.status}: ${text}`);
  }
  return res.json();
}

/**
 * @typedef {{ text: string, color: string }} TaskLabel
 * @typedef {{ id: number, text: string, completed: boolean }} SubTask
 * @typedef {{
 *   id: string,
 *   title: string,
 *   description?: string,
 *   status: string,
 *   startDate?: string,
 *   dueDate?: string,
 *   priority?: string,
 *   labels?: TaskLabel[],
 *   tasks?: SubTask[]
 * }} SheetTask
 */

/**
 * Добавить новую задачу в Google Sheets
 * @param {SheetTask} task
 */
export function addTaskToSheet(task) {
  // Шлём весь объект: даты, чек-лист, теги с цветом
  return postToSheet("add", task);
}

/**
 * Обновить существующую задачу в Google Sheets
 * @param {SheetTask} task
 */
export function updateTaskInSheet(task) {
  return postToSheet("update", task);
}

/**
 * Удалить задачу из Google Sheets по ID
 * @param {string|number} id
 */
export function deleteTaskFromSheet(id) {
  return postToSheet("delete", { id });
}

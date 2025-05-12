// src/googleSheet.js

// Адрес твоего Node-прокси (Express с cors), который запущен на порту 3001
const SHEET_API_URL = (process.env.REACT_APP_API_URL || "") + "/api/sheet";


/**
 * Вспомогательная функция для POST в Google Apps Script через твой сервер.
 * @param {"add"|"update"|"delete"} action
 * @param {object} payload
 */
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
 * Добавить новую задачу в Google Sheets
 * @param {{id:string, title:string, description?:string, status:string, startDate?:string, dueDate?:string, priority?:string, labels?:{text:string}[]}} task
 */
export function addTaskToSheet(task) {
  return postToSheet("add", task);
}

/**
 * Обновить существующую задачу в Google Sheets
 * @param {{id:string, title:string, description?:string, status:string, startDate?:string, dueDate?:string, priority?:string, labels?:{text:string}[]}} task
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

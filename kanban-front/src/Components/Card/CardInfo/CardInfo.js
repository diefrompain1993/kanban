// src/Components/CardInfo/CardInfo.js

import React, { useEffect, useState, useRef } from "react";
import debounce from "lodash/debounce";
import { X } from "react-feather";
import { Plus, Trash, Clock } from "lucide-react";

import Modal from "../../Modal/Modal";
import Editable from "../../Editabled/Editable";
import "./CardInfo.css";



function CardInfo(props) {
  const addTaskRef = useRef(null);
  const {
    id,
    title,
    description,
    date,        // исходное поле с датой завершения
    labels,
    tasks,
    status,
    startDate: initStart,
  } = props.card;

  const [localValues, setLocalValues] = useState({
    title: title || "",
    description: description || "",
    status: status || "На проверке",
    startDate: initStart || new Date().toISOString().split("T")[0],
    dueDate: date || "",
    priority: "Неизвестно",
    labels: labels || [],
    tasks: tasks || [],
  });

  const debouncedSave = useRef(
  debounce(values => {
    props.updateCard(
      props.boardId,
      id,
      { ...props.card, ...values, date: values.dueDate }
    );
  }, 500)
);

// При любых изменениях localValues вызываем одну и ту же функцию
useEffect(() => {
  debouncedSave.current(localValues);
  // при размонтировании — «довызываем» всё, что ещё висит в debounce
  return () => {
    debouncedSave.current.flush();
  };
}, [localValues]);

const handleClose = () => {
  // сразу сбросить остатки debounce и сделать финальный save
  debouncedSave.current.flush();
  // и уже закрыть модалку
  props.onClose();
};


  // пересчет приоритета
  const computePriority = (start, due) => {
    if (!due) return "Неизвестно";
    const sd = new Date(start), dd = new Date(due);
    const diff = (dd - sd) / (1000 * 60 * 60 * 24);
    if (diff <= 3) return "Срочный";
    if (diff <= 7) return "Высокий";
    if (diff <= 14) return "Средний";
    return "Низкий";
  };
  useEffect(() => {
    const p = computePriority(localValues.startDate, localValues.dueDate);
    if (p !== localValues.priority) {
      setLocalValues(v => ({ ...v, priority: p }));
    }
  }, [localValues.startDate, localValues.dueDate]);

  // обновление дат
  const updateStartDate = v => setLocalValues(p => ({ ...p, startDate: v }));
  const updateDueDate   = v => setLocalValues(p => ({ ...p, dueDate: v }));

  // стили статуса/приоритета
  const getStatusStyles = val => {
    switch (val) {
      case "Очередь":     return { backgroundColor: "var(--yellow-300)", color: "var(--yellow-700)" };
      case "В работе":    return { backgroundColor: "var(--blue-300)",   color: "var(--blue-700)" };
      case "На проверке":
      case "Срочный":     return { backgroundColor: "var(--red-300)",    color: "var(--red-700)" };
      case "Высокий":     return { backgroundColor: "var(--yellow-300)", color: "var(--yellow-700)" };
      case "Средний":     return { backgroundColor: "var(--blue-300)",   color: "var(--blue-700)" };
      case "Низкий":      return { backgroundColor: "var(--green-300)",  color: "var(--green-700)" };
      case "Готово":      return { backgroundColor: "var(--green-300)",  color: "var(--green-700)" };
      default:            return { backgroundColor: "var(--secondary-background)", color: "var(--text-muted)" };
    }
  };

  // теги
  const [newLabelText, setNewLabelText]   = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [labelError, setLabelError]       = useState("");

  const addLabel = () => {
    if (!newLabelText.trim()) return;
    if (!selectedColor) {
      setLabelError("Выберите цвет тега");
      return;
    }
    const lab = { text: newLabelText.trim(), color: selectedColor };
    setLocalValues(v => ({ ...v, labels: [...v.labels, lab] }));
    setNewLabelText("");
    setSelectedColor("");
    setLabelError("");
  };

  const removeLabel = idx => {
    const updated = [...localValues.labels];
    updated.splice(idx, 1);
    setLocalValues(v => ({ ...v, labels: updated }));
  };

  // чеклист
  const [taskKey, setTaskKey] = useState(0);

 const addTask = text => {
  if (!text.trim()) return;
  setLocalValues(v => ({
    ...v,
    tasks: [...v.tasks, { id: Date.now(), text, completed: false }]
  }));
  // сброс и фокус
  addTaskRef.current.clear();
  addTaskRef.current.focus();
};

  const toggleTask = id => {
    const updated = localValues.tasks.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
    setLocalValues(v => ({ ...v, tasks: updated }));
  };

 const removeTask = id => {
    // 1) пометить таску «на удаление»
    setLocalValues(v => ({
      ...v,
      tasks: v.tasks.map(t =>
        t.id === id ? { ...t, isRemoving: true } : t
      )
    }));
    // 2) через 300ms окончательно убрать
    setTimeout(() => {
      setLocalValues(v => ({
        ...v,
        tasks: v.tasks.filter(t => t.id !== id)
      }));
    }, 300);
  };

  const tasksCount     = localValues.tasks.length;
  const tasksCompleted = localValues.tasks.filter(t => t.completed).length;
  const progressPercent= tasksCount ? Math.round(tasksCompleted / tasksCount * 100) : 0;

 let progressColor = "#e74c3c"; // <33% — красный
if (progressPercent >= 33 && progressPercent <= 50) {
  progressColor = "#f1c40f";  // 33–50% — жёлтый
} else if (progressPercent > 50 && progressPercent < 100) {
  progressColor = "#3498db";  // 51–99% — синий
} else if (progressPercent === 100) {
  progressColor = "#2ecc71";  // 100% — зелёный
}


  return (
    <Modal onClose={handleClose}>
      <div className="cardinfo_container">
        <div className="cardinfo_close-btn" onClick={handleClose}>
          <X size={24} />
        </div>

        {/* Заголовок и описание */}
        <h2 className="cardinfo_title--static">{localValues.title}</h2>
        <p className="cardinfo_description--static">{localValues.description}</p>

        {/* Основные поля */}
        <div className="cardinfo_table-fields">
          {/* Статус */}
          <div className="row">
            <div className="row_label">Статус</div>
            <div
              className="row_value cardinfo_static-value"
              style={getStatusStyles(localValues.status)}
            >
              {localValues.status}
            </div>
          </div>

          {/* Дата начала */}
          <div className="row row-date">
  <div className="row_label">Дата начала</div>
  <div className="row_value date-picker">
    <input
      type="date"
      value={localValues.startDate}
      onChange={e => updateStartDate(e.target.value)}
      min="1900-01-01"
      max="9999-12-31"
    />
  </div>
</div>

          {/* Дата завершения */}
          <div className="row row-date">
  <div className="row_label">Дата завершения</div>
  <div className="row_value date-picker">
    <input
      type="date"
      value={localValues.dueDate}
      onChange={e => updateDueDate(e.target.value)}
      min="1900-01-01"
      max="9999-12-31"
    />
  </div>
</div>

          {/* Приоритет */}
          <div className="row">
            <div className="row_label">Приоритет</div>
            <div
              className="row_value cardinfo_static-value"
              style={getStatusStyles(localValues.priority)}
            >
              {localValues.priority === "Срочный" && <Clock size={14} />}
              {localValues.priority}
            </div>
          </div>

          {/* Теги */}
          <div className="row row-tags">
            <div className="row_label">Теги</div>
            <div className="row_value cardinfo_tags">
              <div className="cardinfo_label-input">
                <input
                  className="editable_input"
                  type="text"
                  placeholder="Введите тег"
                  value={newLabelText}
                  onChange={e => {
                    setNewLabelText(e.target.value);
                    setLabelError("");
                  }}
                />
                <div className="cardinfo_label-colors">
                  {["yellow", "blue", "green", "red"].map(color => (
                    <div
                      key={color}
                      className={`cardinfo_color-circle${selectedColor === color ? " selected" : ""}`}
                      style={{ backgroundColor: `var(--${color}-300)` }}
                      onClick={() => {
                        setSelectedColor(color);
                        setLabelError("");
                      }}
                    />
                  ))}
                </div>
                 <button className="btn-add" onClick={addLabel}>
   Добавить 
   </button>
              </div>
              {labelError && <div className="label-error">{labelError}</div>}
              <div className="cardinfo_labels-list">
                {localValues.labels.map((lab, i) => (
                  <div
                    key={i}
                    className="cardinfo_label-pill"
                    style={{
                      color: `var(--${lab.color}-700)`,
                      backgroundColor: `var(--${lab.color}-300)`,
                    }}
                  >
                    <span>{lab.text}</span>
                    <Trash
                      className="cardinfo_label-remove"
                      size={14}
                      onClick={() => removeLabel(i)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Вкладки */}
        <div className="cardinfo_tabs">
          <span className="cardinfo_tab-active">Чеклист</span>
          <span className="cardinfo_tab">Файлы</span>
          <span className="cardinfo_tab">Комментарии</span>
          <span className="cardinfo_tab">Активность</span>
        </div>

        {/* Чеклист */}
        <div className="cardinfo_checklist-header">
          <h3>Чеклист ({tasksCompleted}/{tasksCount})</h3>
        </div>
        <div className="cardinfo_progress-bar">
          <div
            className="cardinfo_progress-fill"
            style={{ width: `${progressPercent}%`, backgroundColor: progressColor }}
          />
        </div>
        <div className="cardinfo_tasks">
          {localValues.tasks.map(task => (
            <div
  key={task.id}
  className={`cardinfo_task-item${task.isRemoving ? " removing" : ""}`}
>
              <label className="custom-checkbox">
                <input
                  type="checkbox"
                  checked={task.completed}
                  onChange={() => toggleTask(task.id)}
                />
                <span className="checkmark" />
              </label>
                <span className={`task-text${task.completed ? ' completed' : ''}`}>
      {task.text}
     </span>
              <Trash
                className="cardinfo_task-remove"
                size={14}
                onClick={() => removeTask(task.id)}
              />
            </div>
          ))}
        </div>

        {/* Добавить задачу */}
         <Editable
        ref={addTaskRef}
        defaultValue=""
        placeholder="Добавить задачу"
        onSubmit={addTask}
        autoFocus
      />
      </div>
    </Modal>
  );
}

export default CardInfo;

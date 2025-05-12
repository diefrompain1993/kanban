// src/Components/Board/Board.js
import React, { useState } from "react";
import { Droppable } from "react-beautiful-dnd";
import { Plus } from "lucide-react";

import Card from "../Card/Card";
import Modal from "../Modal/Modal";
import "./Board.css";

function Board(props) {
  const { board, addCard, removeCard, updateCard, darkTheme } = props;

  const [showAddModal, setShowAddModal] = useState(false);
  const [newCard, setNewCard] = useState({
    title: "",
    description: "",
    startDate: new Date().toISOString().split("T")[0],
    dueDate: "",
    tasks: [],
    taskInput: "",
  });

  const addTask = () => {
    const text = newCard.taskInput.trim();
    if (!text) return;
    setNewCard(c => ({
      ...c,
      tasks: [...c.tasks, { id: Date.now(), text }],
      taskInput: "",
    }));
  };

 const removeTask = id => {
  // 1) Отмечаем таску isRemoving: true
  setNewCard(c => ({
    ...c,
    tasks: c.tasks.map(t =>
      t.id === id ? { ...t, isRemoving: true } : t
    ),
  }));

  // 2) Через 300мс окончательно её убираем из массива
  setTimeout(() => {
    setNewCard(c => ({
      ...c,
      tasks: c.tasks.filter(t => t.id !== id),
    }));
  }, 300);
};
  const handleSave = () => {
    if (!newCard.title.trim()) {
      alert("Пожалуйста, заполните заголовок");
      return;
    }
    if (!newCard.description.trim()) {
      alert("Пожалуйста, заполните описание");
      return;
    }
    addCard(board.id, {
      id: `${Date.now()}-${Math.random()}`,
      title: newCard.title.trim(),
      description: newCard.description.trim(),
      status: board.title,
      startDate: newCard.startDate,
      dueDate: newCard.dueDate,
      tasks: newCard.tasks,
      labels: [],
      date: newCard.dueDate,
    });
    setNewCard({
      title: "",
      description: "",
      startDate: new Date().toISOString().split("T")[0],
      dueDate: "",
      tasks: [],
      taskInput: "",
    });
    setShowAddModal(false);
  };

  return (
    <div className={`board ${darkTheme ? "dark" : ""}`}>
      <div className="board_header">
        <h3>
          {board.title} ({board.cards.length})
        </h3>
      </div>

      <div className="board_body">
        <div
          className="board_add-card-btn"
          onClick={() => setShowAddModal(true)}
        >
          <Plus size={20} />
          <span>Добавить карточку</span>
        </div>

        {showAddModal && (
          <Modal onClose={() => setShowAddModal(false)}>
            <div className="add-card-modal">
              <h3>Новая карточка</h3>

              <input
                type="text"
                placeholder="Заголовок"
                value={newCard.title}
                onChange={e =>
                  setNewCard(c => ({ ...c, title: e.target.value }))
                }
              />

              <textarea
                placeholder="Описание"
                rows={3}
                value={newCard.description}
                onChange={e =>
                  setNewCard(c => ({ ...c, description: e.target.value }))
                }
              />

              <div className="field-label">Дата начала</div>
              <input
  type="date"
  value={newCard.startDate}
  onChange={e =>
    setNewCard(c => ({ ...c, startDate: e.target.value }))
  }
  className="field-input date-small"
/>


              <div className="field-label">Дата завершения</div>
              <input
                type="date"
                value={newCard.dueDate}
                onChange={e =>
                  setNewCard(c => ({ ...c, dueDate: e.target.value }))
                }
                className="field-input date-small"
              />

              <div className="tasks-section">
                <h4>Задачи</h4>
               {newCard.tasks.map(t => (
  <div
    key={t.id}
    className={`task-item${t.isRemoving ? " removing" : ""}`}
  >
    <span>{t.text}</span>
    <button
      type="button"
      className="task-remove-btn"
      onClick={() => removeTask(t.id)}
    >
      ×
    </button>
  </div>
))}

                <div className="add-task">
                  <input
                    type="text"
                    placeholder="Новая задача"
                    value={newCard.taskInput}
                    onChange={e =>
                      setNewCard(c => ({ ...c, taskInput: e.target.value }))
                    }
                    onKeyDown={e => e.key === "Enter" && addTask()}
                  />
                  <button
                    type="button"
                    className="btn-add"
                    onClick={addTask}
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-save"
                  onClick={handleSave}
                >
                  Сохранить
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => setShowAddModal(false)}
                >
                  Отмена
                </button>
              </div>
            </div>
          </Modal>
        )}

        <Droppable droppableId={board.id}>
          {(provided, snapshot) => (
            <div
              className={`board_cards ${
                snapshot.isDraggingOver ? "dragover" : ""
              }`}
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {board.cards.map((card, index) => (
                <Card
                  key={card.id}
                  card={card}
                  index={index}
                  boardId={board.id}
                  removeCard={removeCard}
                  updateCard={updateCard}
                  darkTheme={darkTheme}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </div>
    </div>
  );
}

export default Board;

// src/Components/Card/Card.js
import React, { useState } from "react";
import { Draggable } from "react-beautiful-dnd";
import { Grip, Calendar, ListChecks } from "lucide-react";
import CardInfo from "./CardInfo/CardInfo";
import "./Card.css";

function Card(props) {
  const [showModal, setShowModal] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const { id, title, labels, date, tasks } = props.card;

  const tasksCount = tasks?.length || 0;
  const tasksCompleted = tasks?.filter((t) => t.completed).length || 0;
  const progress =
    tasksCount > 0 ? Math.round((tasksCompleted / tasksCount) * 100) : 0;

let progressColor = "#e74c3c"; // <33% — красный
if (progress >= 33 && progress <= 50) {
  progressColor = "#f1c40f";   // 33–50% — жёлтый
} else if (progress > 50 && progress < 100) {
  progressColor = "#3498db";   // 51–99% — синий
} else if (progress === 100) {
  progressColor = "#2ecc71";   // 100% — зелёный
}


  // Русское форматирование даты
  const formatDateRU = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (isNaN(d)) return value;
    return new Intl.DateTimeFormat("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  };

  const handleDelete = () => {
    props.removeCard(props.boardId, id);
    setShowMenu(false);
  };

  return (
    <>
      {showModal && (
        <CardInfo
          onClose={() => setShowModal(false)}
          card={props.card}
          boardId={props.boardId}
          updateCard={props.updateCard}
        />
      )}

      <Draggable draggableId={id} index={props.index}>
        {(provided, snapshot) => (
          <div
            className={`card ${snapshot.isDragging ? "dragging" : ""}`}
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            onClick={() => setShowModal(true)}
            onMouseLeave={() => setShowMenu(false)}
          >
            <div className="card_header">
              <div className="card_header_labels">
                {labels?.map((lab, i) => (
                  <span
                    key={i}
                    className="card_label"
                    style={{
                      color: `var(--${lab.color}-700)`,
                      backgroundColor: `var(--${lab.color}-300)`,
                    }}
                  >
                    {lab.text}
                  </span>
                ))}
              </div>

              <div className="card_more_wrapper">
                <Grip
                  size={20}
                  className="card_more_icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu((v) => !v);
                  }}
                />
                {showMenu && (
                  <div className="card_menu">
                    <button className="card_menu_item" onClick={handleDelete}>
                      Удалить карточку
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="card_title">{title || "Без названия"}</div>

            {date && (
              <div className="card_due-date">
                <Calendar size={14} style={{ marginRight: 4 }} />
                {formatDateRU(date)}
              </div>
            )}

            <div className="card_progress">
              <div className="card_progress_text">
                <ListChecks size={14} style={{ marginRight: 4 }} />
                <span>
                  {tasksCompleted}/{tasksCount}
                </span>
              </div>
              <div className="card_progress_bar">
                <div
                  className="card_progress_fill"
                  style={{
                    width: `${progress}%`,
                    backgroundColor: progressColor,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </Draggable>
    </>
  );
}

export default Card;

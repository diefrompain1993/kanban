// 1) Все импорты подряд, без пропусков и кода между ними
import React, { useEffect, useState, useRef } from "react";
import axios from "axios";
import {
  addTaskToSheet,
  updateTaskInSheet,
  deleteTaskFromSheet
} from "./googleSheet";
import { DragDropContext } from "react-beautiful-dnd";
import { Sun, Moon } from "lucide-react";
import Board from "./Components/Board/Board";
import "./App.css";

axios.defaults.baseURL = process.env.REACT_APP_API_URL || "";


export default function App() {
  const [boards, setBoards] = useState([]);
  const [darkTheme, setDarkTheme] = useState(
    localStorage.getItem("kanban-theme") === "dark"
  );

  // фильтр/сорт/поиск
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortValue, setSortValue] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);

  const statuses = ["Очередь", "В работе", "На проверке", "Готово"];
   const sortLabels = {
    none:      "Все",                   // вместо «None»
    titleAsc:  "Название А→Я",
    titleDesc: "Название Я→А",
    dateAsc:   "По дате ↑",
    dateDesc:  "По дате ↓",
  };

const menuRef = useRef(null);;

  // при клике вне sortRef и filterRef прячем оба меню
  useEffect(() => {
  const handleClickOutside = (e) => {
    // если menuRef задан и клик был не внутри него
    if (menuRef.current && !menuRef.current.contains(e.target)) {
      setShowSortMenu(false);
      setShowFilterMenu(false);
    }
  };
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, []);


  // 1) Начальная загрузка: localStorage или API
  useEffect(() => {
    const saved = localStorage.getItem("kanban-boards");
    if (saved) {
      setBoards(JSON.parse(saved));
    } else {
      axios
        .get("/api/board")
        .then((res) => {
          const tasks = res.data.tasks || [];
          const grouped = statuses.map((st, i) => ({
            id: `${i + 1}`,
            title: st,
            cards: tasks.filter((t) => t.status === st),
          }));
          setBoards(grouped);
        })
        .catch((err) => console.error("Ошибка загрузки:", err));
    }
  }, []);

  // 2) Сохраняем тему
  useEffect(() => {
    localStorage.setItem("kanban-theme", darkTheme ? "dark" : "light");
  }, [darkTheme]);

  // 3) Сохраняем доски в localStorage при любых изменениях
  useEffect(() => {
    localStorage.setItem("kanban-boards", JSON.stringify(boards));
  }, [boards]);

  // фильтрация / поиск / сортировка
  const applyFilterSearchSort = (cards) => {
    let result = [...cards];
    if (filterStatus !== "all") {
      result = result.filter((c) => c.status === filterStatus);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q)
      );
    }
    if (sortValue === "titleAsc") {
      result.sort((a, b) => (a.title > b.title ? 1 : -1));
    } else if (sortValue === "titleDesc") {
      result.sort((a, b) => (a.title < b.title ? 1 : -1));
    } else if (sortValue === "dateAsc") {
      result.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(a.date) - new Date(b.date);
      });
    } else if (sortValue === "dateDesc") {
      result.sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return new Date(b.date) - new Date(a.date);
      });
    }
    return result;
  };

  const displayedBoards = boards.map((b) => ({
    ...b,
    cards: applyFilterSearchSort(b.cards),
  }));

  // меню сортировки / фильтра
  const handleSortClick = () => {
    setShowSortMenu((v) => !v);
    setShowFilterMenu(false);
  };
  const handleFilterClick = () => {
    setShowFilterMenu((v) => !v);
    setShowSortMenu(false);
  };
  const setSort = (val) => {
    setSortValue(val);
    setShowSortMenu(false);
  };
  const setFilter = (val) => {
    setFilterStatus(val);
    setShowFilterMenu(false);
  };

  // CRUD карточек
  // … внутри функции App **не** через “кортеж” (`,`), а просто как блок:

const addCardHandler = (boardId, cardData) => {
  // 1) обновляем локально
  setBoards(bs =>
    bs.map(b =>
      b.id === boardId
        ? { ...b, cards: [...b.cards, { ...cardData, status: b.title }] }
        : b
    )
  );

  // 2) сохраняем на наш сервер
  axios.post("/api/addTask", { card: cardData }).catch(console.error);

  // 3) и пушим в Google Sheets
  addTaskToSheet({
    id:          cardData.id,
    title:       cardData.title,
    description: cardData.description,
    status:      cardData.status,
    startDate:   cardData.startDate,
    dueDate:     cardData.dueDate,
    priority:    cardData.priority,
    labels:      cardData.labels
  }).catch(console.error);
};

const updateCard = (boardId, cardId, updatedCard) => {
  setBoards(bs =>
    bs.map(b =>
      b.id === boardId
        ? {
            ...b,
            cards: b.cards.map(c =>
              c.id === cardId ? updatedCard : c
            )
          }
        : b
    )
  );
  axios.post("/api/editTask", { card: updatedCard }).catch(console.error);
  updateTaskInSheet({
    id:          updatedCard.id,
    title:       updatedCard.title,
    description: updatedCard.description,
    status:      updatedCard.status,
    startDate:   updatedCard.startDate,
    dueDate:     updatedCard.dueDate,
    priority:    updatedCard.priority,
    labels:      updatedCard.labels
  }).catch(console.error);
};

const removeCard = (boardId, cardId) => {
  setBoards(bs =>
    bs.map(b =>
      b.id === boardId
        ? { ...b, cards: b.cards.filter(c => c.id !== cardId) }
        : b
    )
  );
  axios.post("/api/deleteTask", { id: cardId }).catch(console.error);
  deleteTaskFromSheet(cardId).catch(console.error);
};


  // Drag & Drop
  const onDragEnd = (result) => {
  const { source, destination, draggableId } = result;
  if (!destination) return;

  const srcId = source.droppableId;
  const dstId = destination.droppableId;

  // 1) Перемещение внутри того же столбца — просто ре-порядок
  if (srcId === dstId) {
    setBoards((prev) =>
      prev.map((b) => {
        if (b.id !== srcId) return b;
        const cards = Array.from(b.cards);
        const [movedCard] = cards.splice(source.index, 1);
        cards.splice(destination.index, 0, movedCard);
        return { ...b, cards };
      })
    );
    return;
  }

  // 2) Перемещение в другой столбец — меняем статус и синхронизируем
  // Извлечём movedCard заранее из текущего стейта
  const srcBoard = boards.find((b) => b.id === srcId);
  const dstBoard = boards.find((b) => b.id === dstId);
  const srcCards = Array.from(srcBoard.cards);
  // Удаляем карточку из src
  const [movedCard] = srcCards.splice(source.index, 1);
  // Обновляем статус
  movedCard.status = dstBoard.title;
  // Вставляем в dst
  const dstCards = Array.from(dstBoard.cards);
  dstCards.splice(destination.index, 0, movedCard);

  // 3) Обновляем локальный стейт
  setBoards((prev) =>
    prev.map((b) => {
      if (b.id === srcId) return { ...b, cards: srcCards };
      if (b.id === dstId) return { ...b, cards: dstCards };
      return b;
    })
  );

  // 4) Сохраняем в своё API (Express)
  axios
    .post("/api/updateTask", {
      id: draggableId,
      status: movedCard.status, // уже текстовый заголовок колонны
    })
    .catch(console.error);

  // 5) Пушим обновлённую карточку в Google Sheets
  updateTaskInSheet({
    id:          movedCard.id,
    title:       movedCard.title,
    description: movedCard.description,
    status:      movedCard.status,
    startDate:   movedCard.startDate,
    dueDate:     movedCard.dueDate,
    priority:    movedCard.priority,
    labels:      movedCard.labels,
  }).catch(console.error);
};


  return (
    <div className={`app ${darkTheme ? "dark" : ""}`}>
      <div className="app_nav">
        <h1>Kanban Board</h1>
        <div
          className="theme-toggle"
          onClick={() => setDarkTheme((d) => !d)}
        >
          {darkTheme ? <Sun size={20} /> : <Moon size={20} />}
        </div>
      </div>

      <div className="board-menu" ref={menuRef}>
        <div className="menu-left">
         <div className="menu-item" onClick={handleSortClick}>
  Сортировка {sortValue !== "none" && `(${sortLabels[sortValue]})`}
  {showSortMenu && (
    <div className="dropdown-menu">
      {[
        { key: "none",      label: "Нет"      },
        { key: "titleAsc",  label: "Название А→Я" },
        { key: "titleDesc", label: "Название Я→А" },
        { key: "dateAsc",   label: "По дате ↑"   },
        { key: "dateDesc",  label: "По дате ↓"   },
      ].map(({ key, label }) => (
        <div
          key={key}
          className="dropdown-item"
          onClick={() => setSort(key)}
        >
          {label}
        </div>
      ))}
    </div>
  )}
</div>

{/* --- Меню фильтра --- */}
<div className="menu-item" onClick={handleFilterClick}>
  Фильтр {filterStatus !== "all" && `(${filterStatus === "all" ? "Все" : filterStatus})`}
  {showFilterMenu && (
    <div className="dropdown-menu">
      {[
        { key: "all",    label: "Все"      },
        ...statuses.map(s => ({ key: s, label: s }))
      ].map(({ key, label }) => (
        <div
          key={key}
          className="dropdown-item"
          onClick={() => setFilter(key)}
        >
          {label}
        </div>
      ))}
    </div>
  )}
</div>
          
        </div>
        <div className="menu-right">
          <div className="search-container">
            <svg
              className="search-icon"
              width="16"
              height="16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Поиск..."
              className="search-no-border"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="app_boards_container">
          <div className="app_boards">
            {displayedBoards.map((board) => (
              <Board
                key={board.id}
                board={board}
                addCard={addCardHandler}
                updateCard={updateCard}
                removeCard={removeCard}
                darkTheme={darkTheme}
              />
            ))}
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}

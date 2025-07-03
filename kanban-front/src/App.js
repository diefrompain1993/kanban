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

export default function App() {
  // === Существующие стейты/рефы ===
  const [boards, setBoards] = useState([]);
  const [darkTheme, setDarkTheme] = useState(
    localStorage.getItem("kanban-theme") === "dark"
  );

  // фильтр/сорт/поиск
  const [filterStatus, setFilterStatus] = useState("all");
  const [sortValue, setSortValue] = useState("none");
  const [searchQuery, setSearchQuery] = useState("");     // ← поиск по названию (правый)
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchTagsQuery, setSearchTagsQuery] = useState(""); // ← поиск по тегам (левый)

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 640);

  const statuses = ["Очередь", "В работе", "На проверке", "Готово", "В архиве"];
  const sortLabels = {
    none:      "Все",
    titleAsc:  "Название А→Я",
    titleDesc: "Название Я→А",
    dateAsc:   "По дате ↑",
    dateDesc:  "По дате ↓",
  };

  const menuRef = useRef(null);

  // → ДОБАВИТЬ: ref для контейнера досок (нужно для drag-to-scroll)
  const boardsContainerRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // === Закрытие меню при клике вне ===
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setShowSortMenu(false);
        setShowFilterMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // → ДОБАВИТЬ: useEffect для drag-to-scroll на ПК,
  //             с проверкой, чтобы внутри .modal не скроллилось
  useEffect(() => {
    const container = boardsContainerRef.current;
    if (!container) return;

    let isDragging = false;
    let startX = 0;
    let scrollLeftStart = 0;

    const onMouseDown = (e) => {
      // Если клик внутри модального окна — не запускаем scroll
      if (e.target.closest(".modal")) {
        return;
      }
      // Если клик пришёлся на карточку (.card) — не скроллим, чтобы работал DnD
      if (e.target.closest(".card")) {
        return;
      }
      // Иначе: начинаем drag-to-scroll
      isDragging = true;
      startX = e.pageX - container.offsetLeft;
      scrollLeftStart = container.scrollLeft;
      container.style.cursor = "grabbing";
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const x = e.pageX - container.offsetLeft;
      const walk = x - startX;
      container.scrollLeft = scrollLeftStart - walk;
    };

    const onMouseUp = () => {
      isDragging = false;
      container.style.cursor = "default";
    };

    container.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      container.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // === Загрузка данных (API) ===
  useEffect(() => {
   axios.get("/api/board")
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
  }, []);

  // === Сохранение темы в localStorage ===
  useEffect(() => {
    localStorage.setItem("kanban-theme", darkTheme ? "dark" : "light");
    document.body.classList.toggle("dark", darkTheme);
  }, [darkTheme]);

  // === Сохранение boards в localStorage при изменениях ===
  useEffect(() => {
    localStorage.setItem("kanban-boards", JSON.stringify(boards));
  }, [boards]);

  // === Логика фильтра/поиска/сортировки ===
  const applyFilterSearchSort = (cards) => {
    let result = [...cards];

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

    if (filterStatus !== "all") {
      result = result.filter((c) => c.status === filterStatus);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q)
      );
    }

    if (searchTagsQuery.trim()) {
      const q = searchTagsQuery.toLowerCase();
      result = result.filter((c) => {
        if (!Array.isArray(c.labels)) return false;
        return c.labels.some((label) => {
          const lblStr = JSON.stringify(label);
          return lblStr.toLowerCase().includes(q);
        });
      });
    }

    return result;
  };

  const displayedBoards = boards
    .map((b) => ({
      ...b,
      cards: applyFilterSearchSort(b.cards),
    }))
    .filter((b) =>
      isMobile && filterStatus !== "all" ? b.title === filterStatus : true
    );

  // === Обработчики Sort/Filter меню ===
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

  // === CRUD карточек ===
  const addCardHandler = (boardId, cardData) => {
    setBoards((bs) =>
      bs.map((b) =>
        b.id === boardId
          ? { ...b, cards: [...b.cards, { ...cardData, status: b.title }] }
          : b
      )
    );
    axios.post("/api/addTask", { card: cardData })
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
    setBoards((bs) =>
      bs.map((b) =>
        b.id === boardId
          ? {
              ...b,
              cards: b.cards.map((c) =>
                c.id === cardId ? updatedCard : c
              )
            }
          : b
      )
    );
    axios.post("/api/editTask", { card: updatedCard })
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
    setBoards((bs) =>
      bs.map((b) =>
        b.id === boardId
          ? { ...b, cards: b.cards.filter((c) => c.id !== cardId) }
          : b
      )
    );
    axios.post("/api/deleteTask", { id: cardId })
    deleteTaskFromSheet(cardId).catch(console.error);
  };

  // === Drag & Drop из react-beautiful-dnd ===
  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    const srcId = source.droppableId;
    const dstId = destination.droppableId;

    // Перемещение внутри того же столбца
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

    // Перенос карточки в другой столбец
    const srcBoard = boards.find((b) => b.id === srcId);
    const dstBoard = boards.find((b) => b.id === dstId);
    const srcCards = Array.from(srcBoard.cards);
    const [movedCard] = srcCards.splice(source.index, 1);
    movedCard.status = dstBoard.title;
    const dstCards = Array.from(dstBoard.cards);
    dstCards.splice(destination.index, 0, movedCard);

    setBoards((prev) =>
      prev.map((b) => {
        if (b.id === srcId) return { ...b, cards: srcCards };
        if (b.id === dstId) return { ...b, cards: dstCards };
        return b;
      })
    );

    axios.post("/api/updateTask", { card: movedCard })
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

  // === JSX страницы ===
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
          {/* 1) Кнопка «Сортировка» */}
          <div className="menu-item" onClick={handleSortClick}>
            Сортировка {sortValue !== "none" && `(${sortLabels[sortValue]})`}
            {showSortMenu && (
              <div className="dropdown-menu">
                {[
                  { key: "none",      label: "Нет" },
                  { key: "titleAsc",  label: "Название А→Я" },
                  { key: "titleDesc", label: "Название Я→А" },
                  { key: "dateAsc",   label: "По дате ↑" },
                  { key: "dateDesc",  label: "По дате ↓" },
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

          {/* 2) Кнопка «Фильтр» */}
          <div className="menu-item" onClick={handleFilterClick}>
            Фильтр {filterStatus !== "all" && `(${filterStatus === "all" ? "Все" : filterStatus})`}
            {showFilterMenu && (
              <div className="dropdown-menu">
                {[
                  { key: "all", label: "Все" },
                  ...statuses.map((s) => ({ key: s, label: s })),
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

          {/* 3) Левый input: «Поиск по тегам…» */}
          <div className="menu-item">
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
              placeholder="Поиск по тегам..."
              className="search-no-border"
              value={searchTagsQuery}
              onChange={(e) => setSearchTagsQuery(e.target.value)}
              onFocus={() => {
                setShowSortMenu(false);
                setShowFilterMenu(false);
              }}
            />
          </div>
        </div>

        {/* 4) Правый input: «Поиск…» */}
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
              onFocus={() => {
                setShowSortMenu(false);
                setShowFilterMenu(false);
              }}
            />
          </div>
        </div>
      </div>

      {/* Добавлен ref={boardsContainerRef} для контейнера досок */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="app_boards_container" ref={boardsContainerRef}>
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

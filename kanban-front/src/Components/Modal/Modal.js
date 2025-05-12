import React, { useEffect, useState } from "react";
import "./Modal.css";

function Modal({ children, onClose }) {
  const [visible, setVisible] = useState(false);

  // при маунте включаем анимацию появления
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // по Escape — запускаем закрытие
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") startClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const startClose = () => {
    setVisible(false);
    // ждём окончания анимации (минимальное время — 200ms)
    setTimeout(() => {
      onClose && onClose();
    }, 200);
  };

  const handleOverlayClick = () => {
    startClose();
  };

  const handleContentClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      className={`modal ${visible ? "show" : "hide"}`}
      onClick={handleOverlayClick}
    >
      <div
        className={`modal_content ${visible ? "show" : "hide"}`}
        onClick={handleContentClick}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;

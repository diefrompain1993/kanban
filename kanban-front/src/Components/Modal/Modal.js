import React, { useEffect, useState } from "react";
import "./Modal.css";

function Modal({ children, onClose }) {
  const [visible, setVisible] = useState(false);

  // при маунте включаем анимацию появления
  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  // блокируем прокрутку фона, пока модалка открыта
  useEffect(() => {
    const scrollY = window.scrollY || window.pageYOffset;
    const originalOverflow = document.body.style.overflow;
    const originalTop = document.body.style.top;
    document.body.classList.add("modal-open");
    document.body.style.overflow = "hidden";
    document.body.style.top = `-${scrollY}px`;
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.classList.remove("modal-open");
      document.body.style.top = originalTop;
      window.scrollTo(0, scrollY);
    };
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

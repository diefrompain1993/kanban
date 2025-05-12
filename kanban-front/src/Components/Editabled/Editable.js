// src/Components/Editabled/Editable.js
import React, {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle
} from "react";
import { SquarePen } from "lucide-react";
import "./Editable.css";

const Editable = forwardRef(({
  text = "",
  defaultValue = "",
  placeholder = "",
  onSubmit,
  shortLine = false,
}, ref) => {
  const [value, setValue] = useState(defaultValue || text || "");
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // клики вне — завершаем редактирование
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isEditing &&
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        finishEdit();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isEditing]);

  // при входе в режим редактирования — фокус и курсор в конец
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      const len = inputRef.current.value.length;
      inputRef.current.setSelectionRange(len, len);
    }
  }, [isEditing]);

  // делегируем методы наружу
  useImperativeHandle(ref, () => ({
    focus: () => {
      setIsEditing(true);
      // фокус после переключения
      setTimeout(() => inputRef.current?.focus(), 0);
    },
    clear: () => {
      setValue("");
      if (inputRef.current) inputRef.current.value = "";
    },
    get value() {
      return value;
    },
    set value(v) {
      setValue(v);
      if (inputRef.current) inputRef.current.value = v;
    }
  }), [value]);

  const startEdit = e => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const finishEdit = () => {
    setIsEditing(false);
    onSubmit && onSubmit(value.trim());
  };

  const handleKeyDown = e => {
    if (e.key === "Enter") {
      e.preventDefault();
      finishEdit();
    }
  };

  return (
    <div
      className={`editable_line ${shortLine ? "short" : ""}`}
      ref={containerRef}
      onClick={!isEditing ? startEdit : e => e.stopPropagation()}
    >
      <SquarePen className="editable_icon" />

      {!isEditing ? (
        <span className={`editable_text ${!value ? "placeholder" : ""}`}>
          {value || placeholder}
        </span>
      ) : (
        <input
          ref={inputRef}
          type="text"
          className={`editable_input ${shortLine ? "short" : ""}`}
          value={value}
          onChange={e => setValue(e.target.value)}
          onBlur={finishEdit}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
        />
      )}
    </div>
  );
});

export default Editable;

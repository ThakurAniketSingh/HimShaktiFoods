// ToastContext — small, themed notifications for admin actions
// (product saved, deleted, imported, etc.). No new dependency: just a
// context + a fixed-position stack, styled with the site's own palette.
import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);
let idCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const notify = useCallback(
    (message, type = 'success') => {
      const id = ++idCounter;
      setToasts((prev) => [...prev, { id, message, type }]);
      timers.current[id] = setTimeout(() => dismiss(id), 3400);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="fixed bottom-5 right-4 z-[100] flex flex-col gap-2 max-w-[90vw] sm:max-w-sm pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            onClick={() => dismiss(t.id)}
            role="status"
            className={`pointer-events-auto cursor-pointer rounded-xl px-4 py-3 shadow-lg text-[13.5px] font-semibold text-white
              animate-fade-up flex items-center gap-2.5
              ${t.type === 'error' ? 'bg-red-600' : t.type === 'info' ? 'bg-forest' : 'bg-sage'}`}
          >
            <span>{t.type === 'error' ? '⚠️' : t.type === 'info' ? 'ℹ️' : '✅'}</span>
            <span className="leading-snug">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

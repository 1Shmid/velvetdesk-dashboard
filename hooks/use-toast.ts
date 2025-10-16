import { useState } from "react";

interface Toast {
  title: string;
  description?: string;
  variant?: "default" | "destructive";
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (props: Toast) => {
    // Простая реализация - показываем alert (временно)
    // TODO: Заменить на красивый toast компонент
    alert(`${props.title}\n${props.description || ""}`);
  };

  return { toast, toasts };
}
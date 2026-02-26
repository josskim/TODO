"use client";

import { useEffect, useState } from "react";

type TodoCategory = "PENSION" | "CART" | "PROGRAM" | "ETC";

interface Todo {
  id: number;
  title: string;
  completed: boolean;
  category: TodoCategory;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_OPTIONS: Array<{ value: TodoCategory; label: string }> = [
  { value: "PENSION", label: "펜션" },
  { value: "CART", label: "마트" },
  { value: "PROGRAM", label: "개발" },
  { value: "ETC", label: "기타" },
];

function categoryLabel(category: TodoCategory): string {
  return CATEGORY_OPTIONS.find((c) => c.value === category)?.label ?? category;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const yy = String(d.getFullYear()).slice(2);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${min}`;
}

function TrashIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}

export default function Home() {
  const [deviceId, setDeviceId] = useState("");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loadError, setLoadError] = useState("");
  const [localMode, setLocalMode] = useState(false);
  const [input, setInput] = useState("");
  const [selectedCategory, setSelectedCategory] =
    useState<TodoCategory>("ETC");
  const [activeCategory, setActiveCategory] = useState<"ALL" | TodoCategory>(
    "ALL"
  );
  const [isLoading, setIsLoading] = useState(true);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  function generateDeviceId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function ensureDeviceId() {
    if (deviceId) return deviceId;

    const nextId = generateDeviceId();
    setDeviceId(nextId);
    try {
      localStorage.setItem("device_id", nextId);
    } catch (err) {
      console.error(err);
    }
    return nextId;
  }

  function localTodosKey(id: string) {
    return `todos_local_${id}`;
  }

  function readLocalTodos(id: string): Todo[] {
    if (!id) return [];
    try {
      const raw = localStorage.getItem(localTodosKey(id));
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Todo[]) : [];
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  function writeLocalTodos(id: string, items: Todo[]) {
    if (!id) return;
    try {
      localStorage.setItem(localTodosKey(id), JSON.stringify(items));
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    let id = "";
    try {
      id = localStorage.getItem("device_id") ?? "";
    } catch (err) {
      console.error(err);
    }

    if (!id) {
      id = generateDeviceId();
      try {
        localStorage.setItem("device_id", id);
      } catch (err) {
        console.error(err);
      }
    }

    setDeviceId(id);
    fetchTodos(id);
  }, []);

  async function fetchTodos(id: string) {
    try {
      setLoadError("");
      const res = await fetch("/api/todos", {
        headers: { "X-Device-Id": id },
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error ?? "Failed to fetch todos");
      }
      if (!Array.isArray(data)) {
        throw new Error("Invalid todos response");
      }
      setTodos(data);
      setLocalMode(false);
    } catch (err) {
      console.error(err);
      setTodos(readLocalTodos(id));
      setLocalMode(true);
      setLoadError("서버 연결이 불안정해 로컬 모드로 동작 중입니다.");
    } finally {
      setIsLoading(false);
    }
  }

  async function addTodo() {
    const trimmed = input.trim();
    if (!trimmed) return;
    const currentDeviceId = ensureDeviceId();

    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Device-Id": currentDeviceId },
        body: JSON.stringify({ title: trimmed, category: selectedCategory }),
      });

      if (!res.ok) throw new Error("Failed to create todo");
      const newTodo: Todo = await res.json();
      setTodos((prev) => [newTodo, ...prev]);
      setInput("");
      setLocalMode(false);
    } catch (err) {
      console.error(err);
      const now = new Date().toISOString();
      const localTodo: Todo = {
        id: Date.now(),
        title: trimmed,
        completed: false,
        category: selectedCategory,
        createdAt: now,
        updatedAt: now,
      };
      setTodos((prev) => {
        const next = [localTodo, ...prev];
        writeLocalTodos(currentDeviceId, next);
        return next;
      });
      setInput("");
      setLocalMode(true);
    }
  }

  async function toggleTodo(id: number, completed: boolean) {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "X-Device-Id": deviceId },
        body: JSON.stringify({ completed: !completed }),
      });

      if (!res.ok) throw new Error("Failed to update todo");
      const updated: Todo = await res.json();
      setTodos((prev) => prev.map((t) => (t.id === id ? updated : t)));
      setLocalMode(false);
    } catch (err) {
      console.error(err);
      const currentDeviceId = ensureDeviceId();
      setTodos((prev) => {
        const next = prev.map((t) =>
          t.id === id ? { ...t, completed: !completed, updatedAt: new Date().toISOString() } : t
        );
        writeLocalTodos(currentDeviceId, next);
        return next;
      });
      setLocalMode(true);
    }
  }

  async function deleteTodo(id: number) {
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: "DELETE",
        headers: { "X-Device-Id": deviceId },
      });
      if (!res.ok && res.status !== 204) throw new Error("Failed to delete todo");
      setTodos((prev) => prev.filter((t) => t.id !== id));
      setLocalMode(false);
    } catch (err) {
      console.error(err);
      const currentDeviceId = ensureDeviceId();
      setTodos((prev) => {
        const next = prev.filter((t) => t.id !== id);
        writeLocalTodos(currentDeviceId, next);
        return next;
      });
      setLocalMode(true);
    }
  }

  const completedCount = todos.filter((t) => t.completed).length;
  const allCount = todos.length;
  const countByCategory = todos.reduce(
    (acc, todo) => {
      acc[todo.category] = (acc[todo.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<TodoCategory, number>
  );
  const visibleTodos =
    activeCategory === "ALL"
      ? todos
      : todos.filter((t) => t.category === activeCategory);

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex flex-col items-center pt-16 pb-16 px-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-800">
            나의 할일
          </h1>
        </div>

        {/* Input */}
        <div className="mb-2 flex items-center gap-2">
          <p className="text-xs font-semibold text-slate-600">카테고리</p>
          <div className="flex flex-wrap gap-1 rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm">
            {CATEGORY_OPTIONS.map((opt) => {
              const active = selectedCategory === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedCategory(opt.value)}
                  className={`rounded-xl px-3 py-1 text-xs font-semibold transition ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={"할일을 입력하세요\n(여러 줄 입력 가능)"}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm resize-none"
            style={{ minHeight: "9rem" }}
          />
          <button
            onClick={addTodo}
            disabled={!input.trim()}
            className="self-stretch flex items-center justify-center rounded-xl bg-indigo-600 px-5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition"
          >
            추가
          </button>
        </div>

        {/* Category Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {(
            [
              { value: "ALL" as const, label: "전체" },
              ...CATEGORY_OPTIONS.map((c) => ({ value: c.value, label: c.label })),
            ] as Array<{ value: "ALL" | TodoCategory; label: string }>
          ).map((tab) => {
            const active = activeCategory === tab.value;
            const count =
              tab.value === "ALL"
                ? allCount
                : countByCategory[tab.value as TodoCategory] ?? 0;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveCategory(tab.value)}
                className={`rounded-full border px-4 py-2 text-sm font-semibold shadow-sm transition relative ${
                  active
                    ? "border-indigo-200 bg-indigo-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span className="relative inline-flex items-center">
                  <span>{tab.label}</span>
                  <span
                    className={`absolute -top-2 -right-3 inline-flex min-w-[16px] items-center justify-center rounded-full px-1.5 py-[2px] text-[10px] font-bold ${
                      active
                        ? "bg-white text-indigo-600"
                        : "bg-indigo-500 text-white"
                    }`}
                  >
                    {count}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        <div className="rounded-2xl bg-slate-50 p-4 shadow-inner border border-slate-100">
          {localMode && (
            <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
              서버 DB 연결 전이라 현재 기기에만 저장됩니다.
            </div>
          )}
          {loadError && (
            <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {loadError}
            </div>
          )}
          {isLoading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : (
            <ul>
              {visibleTodos.length === 0 ? (
                <li className="py-10 text-center text-sm text-slate-500">
                  {activeCategory === "ALL"
                    ? "할일이 없습니다."
                    : `${categoryLabel(activeCategory)} 카테고리에 할일이 없습니다.`}
                </li>
              ) : null}

              {visibleTodos.map((todo) => (
                <li
                  key={todo.id}
                  className={`mb-3 flex items-start gap-3 rounded-2xl border px-5 py-4 shadow-md transition-all hover:-translate-y-1 hover:shadow-xl
                  ${
                    todo.completed
                      ? "bg-indigo-50 border-indigo-100"
                      : "bg-white border-slate-200"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={todo.completed}
                    onChange={() => toggleTodo(todo.id, todo.completed)}
                    className="mt-1 h-4 w-4 accent-indigo-600"
                  />

                  <div className="flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                        {categoryLabel(todo.category)}
                      </span>
                      {todo.completed && (
                        <p className="text-xs text-indigo-400">
                          완료일 : {formatDate(todo.updatedAt)}
                        </p>
                      )}
                    </div>

                    <span
                      className={`text-sm whitespace-pre-wrap break-words ${
                        todo.completed
                          ? "text-slate-300 line-through"
                          : "text-slate-700"
                      }`}
                    >
                      {todo.title}
                    </span>

                    <p className="mt-2 text-right text-xs text-slate-400">
                      {formatDate(todo.createdAt)}
                    </p>
                  </div>

                  <button
                    onClick={() => setConfirmId(todo.id)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <TrashIcon />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Delete Modal */}
      {confirmId !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-xl">
            <p>삭제 하시겠습니까?</p>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setConfirmId(null)}>취소</button>
              <button
                onClick={() => {
                  deleteTodo(confirmId);
                  setConfirmId(null);
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

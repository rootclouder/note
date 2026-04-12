import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, addDays } from 'date-fns';

export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';

export interface Todo {
  id: string;
  title: string;
  quadrant: Quadrant;
  date: string; // YYYY-MM-DD
  completed: boolean;
}

export interface Diary {
  id: string;
  date: string; // YYYY-MM-DD
  content: string; // Markdown
  mood: string;
  weather: string;
  images: string[];
}

interface AppState {
  todos: Todo[];
  diaries: Diary[];
  
  // Todo actions
  addTodo: (todo: Omit<Todo, 'id'>) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  moveTodo: (id: string, newQuadrant: Quadrant) => void;
  postponeTodo: (id: string) => void;

  // Diary actions
  saveDiary: (diary: Diary) => void;
  deleteDiary: (date: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      todos: [],
      diaries: [],

      addTodo: (todo) => set((state) => ({
        todos: [...state.todos, { ...todo, id: crypto.randomUUID() }]
      })),

      updateTodo: (id, updates) => set((state) => ({
        todos: state.todos.map(t => t.id === id ? { ...t, ...updates } : t)
      })),

      deleteTodo: (id) => set((state) => ({
        todos: state.todos.filter(t => t.id !== id)
      })),

      moveTodo: (id, newQuadrant) => set((state) => ({
        todos: state.todos.map(t => t.id === id ? { ...t, quadrant: newQuadrant } : t)
      })),

      postponeTodo: (id) => set((state) => {
        const todo = state.todos.find(t => t.id === id);
        if (!todo) return state;
        const nextDate = format(addDays(new Date(todo.date), 1), 'yyyy-MM-dd');
        return {
          todos: state.todos.map(t => t.id === id ? { ...t, date: nextDate } : t)
        };
      }),

      saveDiary: (diary) => set((state) => {
        const existingIndex = state.diaries.findIndex(d => d.date === diary.date);
        if (existingIndex >= 0) {
          const newDiaries = [...state.diaries];
          newDiaries[existingIndex] = diary;
          return { diaries: newDiaries };
        }
        return { diaries: [...state.diaries, diary] };
      }),

      deleteDiary: (date) => set((state) => ({
        diaries: state.diaries.filter(d => d.date !== date)
      })),
    }),
    {
      name: 'light-diary-storage',
    }
  )
);

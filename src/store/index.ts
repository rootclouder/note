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

export interface UserData {
  password?: string;
  todos: Todo[];
  diaries: Diary[];
}

interface AppState {
  todos: Todo[]; // Guest data
  diaries: Diary[]; // Guest data
  users: Record<string, UserData>; // Registered users data
  currentUser: string | null; // null means Guest
  
  theme: 'light' | 'dark';
  hasSeenWelcome: boolean;
  
  // Theme actions
  toggleTheme: () => void;
  setHasSeenWelcome: (value?: boolean) => void;

  // Auth actions
  login: (username: string, password?: string) => boolean;
  register: (username: string, password?: string) => boolean;
  logout: () => void;

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
      users: {},
      currentUser: null,
      theme: 'light',
      hasSeenWelcome: false,

      toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
      setHasSeenWelcome: (value = true) => set({ hasSeenWelcome: value }),

      login: (username, password) => {
        const state = get();
        const user = state.users[username];
        if (user && user.password === password) {
          set({ currentUser: username });
          return true;
        }
        return false;
      },

      register: (username, password) => {
        const state = get();
        if (state.users[username]) {
          return false; // Already exists
        }
        set({
          currentUser: username,
          users: {
            ...state.users,
            [username]: { password, todos: [], diaries: [] }
          }
        });
        return true;
      },

      logout: () => set({ currentUser: null }),

      addTodo: (todo) => set((state) => {
        const newTodo = { ...todo, id: crypto.randomUUID() };
        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                todos: [...userData.todos, newTodo]
              }
            }
          };
        }
        return { todos: [...state.todos, newTodo] };
      }),

      updateTodo: (id, updates) => set((state) => {
        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                todos: userData.todos.map(t => t.id === id ? { ...t, ...updates } : t)
              }
            }
          };
        }
        return { todos: state.todos.map(t => t.id === id ? { ...t, ...updates } : t) };
      }),

      deleteTodo: (id) => set((state) => {
        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                todos: userData.todos.filter(t => t.id !== id)
              }
            }
          };
        }
        return { todos: state.todos.filter(t => t.id !== id) };
      }),

      moveTodo: (id, newQuadrant) => set((state) => {
        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                todos: userData.todos.map(t => t.id === id ? { ...t, quadrant: newQuadrant } : t)
              }
            }
          };
        }
        return { todos: state.todos.map(t => t.id === id ? { ...t, quadrant: newQuadrant } : t) };
      }),

      postponeTodo: (id) => set((state) => {
        const updateDate = (todos: Todo[]) => {
          const todo = todos.find(t => t.id === id);
          if (!todo) return todos;
          const nextDate = format(addDays(new Date(todo.date), 1), 'yyyy-MM-dd');
          return todos.map(t => t.id === id ? { ...t, date: nextDate } : t);
        };

        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                todos: updateDate(userData.todos)
              }
            }
          };
        }
        return { todos: updateDate(state.todos) };
      }),

      saveDiary: (diary) => set((state) => {
        const updateDiaries = (diaries: Diary[]) => {
          const existingIndex = diaries.findIndex(d => d.date === diary.date);
          if (existingIndex >= 0) {
            const newDiaries = [...diaries];
            newDiaries[existingIndex] = diary;
            return newDiaries;
          }
          return [...diaries, diary];
        };

        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                diaries: updateDiaries(userData.diaries)
              }
            }
          };
        }
        return { diaries: updateDiaries(state.diaries) };
      }),

      deleteDiary: (date) => set((state) => {
        if (state.currentUser) {
          const userData = state.users[state.currentUser] || { todos: [], diaries: [] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: {
                ...userData,
                diaries: userData.diaries.filter(d => d.date !== date)
              }
            }
          };
        }
        return { diaries: state.diaries.filter(d => d.date !== date) };
      }),
    }),
    {
      name: 'light-diary-storage',
    }
  )
);

export const useUserData = () => {
  const state = useStore();
  const isGuest = state.currentUser === null;
  const userData = isGuest ? null : (state.users[state.currentUser!] || { todos: [], diaries: [] });

  return {
    todos: isGuest ? state.todos : userData!.todos,
    diaries: isGuest ? state.diaries : userData!.diaries,
  };
};

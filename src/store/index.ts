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

export interface Notebook {
  id: string;
  name: string;
  parentId: string | null;
  createdAt: number;
}

export interface Note {
  id: string;
  notebookId: string;
  title: string;
  content: string;
  updatedAt: number;
}

export interface UserData {
  password?: string;
  todos: Todo[];
  diaries: Diary[];
  notebooks: Notebook[];
  notes: Note[];
}

interface AppState {
  todos: Todo[]; // Guest data
  diaries: Diary[]; // Guest data
  notebooks: Notebook[]; // Guest data
  notes: Note[]; // Guest data
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

  // Notebook actions
  createNotebook: (payload: { name: string; parentId?: string | null }) => string;
  updateNotebook: (id: string, updates: Partial<Omit<Notebook, 'id'>>) => void;
  deleteNotebook: (id: string) => void;
  moveNotebook: (id: string, parentId: string | null) => void;

  // Note actions
  createNote: (notebookId: string) => string;
  updateNote: (id: string, updates: Partial<Omit<Note, 'id' | 'notebookId'>>) => void;
  deleteNote: (id: string) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      todos: [],
      diaries: [],
      notebooks: [],
      notes: [],
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
            [username]: { password, todos: [], diaries: [], notebooks: [], notes: [] }
          }
        });
        return true;
      },

      logout: () => set({ currentUser: null }),

      addTodo: (todo) => set((state) => {
        const newTodo = { ...todo, id: crypto.randomUUID() };
        if (state.currentUser) {
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
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

      createNotebook: ({ name, parentId = null }) => {
        const id = crypto.randomUUID();
        const notebook: Notebook = { id, name, parentId, createdAt: Date.now() };
        set((state) => {
          if (state.currentUser) {
            const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
            return {
              users: {
                ...state.users,
                [state.currentUser]: {
                  ...userData,
                  notebooks: [...userData.notebooks, notebook]
                }
              }
            };
          }
          return { notebooks: [...state.notebooks, notebook] };
        });
        return id;
      },

      updateNotebook: (id, updates) => set((state) => {
        const apply = (notebooks: Notebook[]) => notebooks.map(n => n.id === id ? { ...n, ...updates } : n);
        if (state.currentUser) {
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: { ...userData, notebooks: apply(userData.notebooks) }
            }
          };
        }
        return { notebooks: apply(state.notebooks) };
      }),

      moveNotebook: (id, parentId) => set((state) => {
        const apply = (notebooks: Notebook[]) => notebooks.map(n => n.id === id ? { ...n, parentId } : n);
        if (state.currentUser) {
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
          return {
            users: {
              ...state.users,
              [state.currentUser]: { ...userData, notebooks: apply(userData.notebooks) }
            }
          };
        }
        return { notebooks: apply(state.notebooks) };
      }),

      deleteNotebook: (id) => set((state) => {
        const collect = (notebooks: Notebook[], targetId: string) => {
          const ids = new Set<string>();
          const stack = [targetId];
          while (stack.length) {
            const current = stack.pop()!;
            if (ids.has(current)) continue;
            ids.add(current);
            for (const n of notebooks) {
              if (n.parentId === current) stack.push(n.id);
            }
          }
          return ids;
        };

        const apply = (notebooks: Notebook[], notes: Note[]) => {
          const ids = collect(notebooks, id);
          return {
            notebooks: notebooks.filter(n => !ids.has(n.id)),
            notes: notes.filter(note => !ids.has(note.notebookId))
          };
        };

        if (state.currentUser) {
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
          const next = apply(userData.notebooks, userData.notes);
          return {
            users: {
              ...state.users,
              [state.currentUser]: { ...userData, ...next }
            }
          };
        }
        return apply(state.notebooks, state.notes);
      }),

      createNote: (notebookId) => {
        const id = crypto.randomUUID();
        const note: Note = { id, notebookId, title: '未命名笔记', content: '', updatedAt: Date.now() };
        set((state) => {
          if (state.currentUser) {
            const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
            return {
              users: {
                ...state.users,
                [state.currentUser]: { ...userData, notes: [note, ...userData.notes] }
              }
            };
          }
          return { notes: [note, ...state.notes] };
        });
        return id;
      },

      updateNote: (id, updates) => set((state) => {
        const apply = (notes: Note[]) => notes.map(n => n.id === id ? { ...n, ...updates, updatedAt: Date.now() } : n);
        if (state.currentUser) {
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
          return {
            users: { ...state.users, [state.currentUser]: { ...userData, notes: apply(userData.notes) } }
          };
        }
        return { notes: apply(state.notes) };
      }),

      deleteNote: (id) => set((state) => {
        const apply = (notes: Note[]) => notes.filter(n => n.id !== id);
        if (state.currentUser) {
          const userData = { todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser] };
          return {
            users: { ...state.users, [state.currentUser]: { ...userData, notes: apply(userData.notes) } }
          };
        }
        return { notes: apply(state.notes) };
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
  const userData = isGuest ? null : ({ todos: [], diaries: [], notebooks: [], notes: [], ...state.users[state.currentUser!] });

  return {
    todos: isGuest ? state.todos : userData!.todos,
    diaries: isGuest ? state.diaries : userData!.diaries,
    notebooks: isGuest ? state.notebooks : userData!.notebooks,
    notes: isGuest ? state.notes : userData!.notes,
  };
};

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronRight, FileText, Folder, Plus, Search, Trash2, Pencil, ArrowRight, X, Check } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { useStore, useUserData } from '../store';
import { cn } from '../utils/cn';

export default function Notes() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialNotebookId = searchParams.get('notebookId');
  const initialNoteId = searchParams.get('noteId');

  const { notebooks, notes } = useUserData();
  const theme = useStore((s) => s.theme);
  const {
    createNotebook,
    updateNotebook,
    deleteNotebook,
    createNote,
    updateNote,
    moveNote,
    deleteNote,
    moveNotebook
  } = useStore();

  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(initialNotebookId);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNoteId);
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(() => new Set());
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(() => new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [isNotebookSheetOpen, setIsNotebookSheetOpen] = useState(false);

  const notebookById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; parentId: string | null }>();
    for (const nb of notebooks) map.set(nb.id, nb);
    return map;
  }, [notebooks]);

  const getNotebookPath = useMemo(() => {
    return (notebookId: string) => {
      const names: string[] = [];
      let cur = notebookById.get(notebookId);
      const guard = new Set<string>();
      while (cur && !guard.has(cur.id)) {
        guard.add(cur.id);
        names.unshift(cur.name);
        cur = cur.parentId ? notebookById.get(cur.parentId) : undefined;
      }
      return names.join(' / ');
    };
  }, [notebookById]);

  const getRootShelfId = useMemo(() => {
    return (notebookId: string) => {
      let cur = notebookById.get(notebookId);
      const guard = new Set<string>();
      while (cur?.parentId && !guard.has(cur.id)) {
        guard.add(cur.id);
        cur = notebookById.get(cur.parentId);
      }
      return cur?.id ?? notebookId;
    };
  }, [notebookById]);

  const shelves = useMemo(() => {
    return notebooks
      .filter((nb) => nb.parentId === null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [notebooks]);

  const notebooksByShelf = useMemo(() => {
    const map = new Map<string, { id: string; name: string; parentId: string | null }[]>();
    for (const nb of notebooks) {
      if (!nb.parentId) continue;
      const list = map.get(nb.parentId) ?? [];
      list.push(nb);
      map.set(nb.parentId, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    }
    return map;
  }, [notebooks]);

  const currentNotebookNotes = useMemo(() => {
    if (!selectedNotebookId) return [];
    return notes
      .filter(n => n.notebookId === selectedNotebookId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedNotebookId]);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);

  const [draftContent, setDraftContent] = useState('');
  const [draftTitle, setDraftTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  const [dialog, setDialog] = useState<
    | null
    | {
        mode: 'createNotebook' | 'renameNotebook' | 'createNote' | 'renameNote';
        title: string;
        subtitle?: string;
        value: string;
        notebookId?: string;
        parentId?: string | null;
        noteId?: string;
      }
  >(null);
  const [dialogError, setDialogError] = useState('');
  const dialogInputRef = useRef<HTMLInputElement>(null);

  const [moveDialog, setMoveDialog] = useState<null | { noteId: string; targetNotebookId: string }>(null);

  const notebookOptions = useMemo(() => {
    return notebooks
      .map((nb) => ({ id: nb.id, label: getNotebookPath(nb.id) }))
      .sort((a, b) => a.label.localeCompare(b.label, 'zh-CN'));
  }, [notebooks, getNotebookPath]);

  useEffect(() => {
    if (selectedNotebookId) return;
    const firstShelf = shelves[0]?.id ?? null;
    if (!firstShelf) return;
    const firstChild = notebooksByShelf.get(firstShelf)?.[0]?.id ?? null;
    setSelectedShelfId(firstShelf);
    setExpandedShelves((prev) => new Set(prev).add(firstShelf));
    setSelectedNotebookId(firstChild ?? firstShelf);
  }, [selectedNotebookId, shelves, notebooksByShelf]);

  useEffect(() => {
    if (selectedNote) {
      setDraftContent(selectedNote.content);
      setDraftTitle(selectedNote.title || '');
      setLastSavedAt(selectedNote.updatedAt || null);
      return;
    }
    setDraftContent('');
    setDraftTitle('');
    setLastSavedAt(null);
  }, [selectedNote]);

  useEffect(() => {
    if (!selectedNote) return;
    if (draftContent === selectedNote.content) return;
    setIsSaving(true);
    const t = window.setTimeout(() => {
      updateNote(selectedNote.id, { content: draftContent });
      setIsSaving(false);
      setLastSavedAt(Date.now());
    }, 450);
    return () => window.clearTimeout(t);
  }, [draftContent, selectedNote, updateNote]);

  useEffect(() => {
    if (!selectedNote) return;
    if (draftTitle === (selectedNote.title || '')) return;
    const t = window.setTimeout(() => {
      updateNote(selectedNote.id, { title: draftTitle.trim() || '未命名笔记' });
      setLastSavedAt(Date.now());
    }, 450);
    return () => window.clearTimeout(t);
  }, [draftTitle, selectedNote, updateNote]);

  useEffect(() => {
    if (!dialog) return;
    setDialogError('');
    const t = window.setTimeout(() => dialogInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [dialog]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!selectedNotebookId) return;
    const shelfId = getRootShelfId(selectedNotebookId);
    setSelectedShelfId(shelfId);
    setExpandedShelves((prev) => new Set(prev).add(shelfId));
  }, [selectedNotebookId, getRootShelfId]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return notes
      .filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12);
  }, [notes, searchQuery]);

  const openCreateNotebook = (parentId: string | null) => {
    const isShelf = parentId === null;
    setDialog({
      mode: 'createNotebook',
      title: isShelf ? '新建书架' : '新建笔记本',
      subtitle: isShelf ? '用于分类管理笔记本' : `书架：${getNotebookPath(parentId)}`,
      value: '',
      parentId
    });
  };

  const openRenameNotebook = (id: string, currentName: string) => {
    const isShelf = notebookById.get(id)?.parentId === null;
    setDialog({
      mode: 'renameNotebook',
      title: isShelf ? '重命名书架' : '重命名笔记本',
      subtitle: isShelf ? '让分类更清晰一点' : '让结构更清晰一点',
      value: currentName,
      notebookId: id
    });
  };

  const openCreateNote = () => {
    if (!selectedNotebookId) {
      openCreateNotebook(null);
      return;
    }
    setDialog({
      mode: 'createNote',
      title: '新建笔记',
      subtitle: `笔记本：${getNotebookPath(selectedNotebookId)}`,
      value: ''
    });
  };

  const openRenameNote = (id: string, currentTitle: string) => {
    setDialog({
      mode: 'renameNote',
      title: '编辑标题',
      subtitle: '让它更容易被搜索到',
      value: currentTitle,
      noteId: id
    });
  };

  const closeDialog = () => setDialog(null);

  const submitDialog = () => {
    if (!dialog) return;
    const v = dialog.value.trim();
    if (!v) {
      setDialogError('请输入名称');
      return;
    }

    if (dialog.mode === 'createNotebook') {
      const parentId = dialog.parentId ?? null;
      const id = createNotebook({ name: v, parentId });
      setSelectedNotebookId(id);
      const shelfId = parentId ?? id;
      setSelectedShelfId(shelfId);
      setExpandedShelves((prev) => new Set(prev).add(shelfId));
      closeDialog();
      return;
    }

    if (dialog.mode === 'renameNotebook') {
      if (!dialog.notebookId) return;
      updateNotebook(dialog.notebookId, { name: v });
      closeDialog();
      return;
    }

    if (dialog.mode === 'createNote') {
      if (!selectedNotebookId) return;
      const id = createNote(selectedNotebookId);
      updateNote(id, { title: v });
      setSelectedNoteId(id);
      closeDialog();
      return;
    }

    if (dialog.mode === 'renameNote') {
      if (!dialog.noteId) return;
      updateNote(dialog.noteId, { title: v });
      closeDialog();
    }
  };

  const removeNotebook = (id: string) => {
    const name = notebookById.get(id)?.name || '该笔记本';
    if (!window.confirm(`确定删除「${name}」及其子笔记本和笔记吗？`)) return;
    deleteNotebook(id);
    if (selectedNotebookId === id) setSelectedNotebookId(null);
    if (selectedNoteId && notes.find(n => n.id === selectedNoteId)?.notebookId === id) setSelectedNoteId(null);
  };

  const createNewNote = () => openCreateNote();

  const removeNote = (id: string) => {
    if (!window.confirm('确定删除这条笔记吗？')) return;
    const next = selectedNotebookId
      ? notes
          .filter((n) => n.notebookId === selectedNotebookId && n.id !== id)
          .sort((a, b) => b.updatedAt - a.updatedAt)[0]?.id ?? null
      : null;
    deleteNote(id);
    if (selectedNoteId === id) {
      setSelectedNoteId(next);
    }
  };

  const toggleShelfExpanded = (shelfId: string) => {
    setExpandedShelves((prev) => {
      const next = new Set(prev);
      if (next.has(shelfId)) next.delete(shelfId);
      else next.add(shelfId);
      return next;
    });
  };

  const toggleNotebookExpanded = (notebookId: string) => {
    setExpandedNotebooks((prev) => {
      const next = new Set(prev);
      if (next.has(notebookId)) next.delete(notebookId);
      else next.add(notebookId);
      return next;
    });
  };

  const selectNotebook = (notebookId: string, shelfId: string) => {
    setSelectedShelfId(shelfId);
    setExpandedShelves((prev) => new Set(prev).add(shelfId));
    setSelectedNotebookId(notebookId);
    setIsNotebookSheetOpen(false);
  };

  const moveSelectedNotebookToRoot = () => {
    if (!selectedNotebookId) return;
    moveNotebook(selectedNotebookId, null);
  };

  const openMoveSelectedNote = () => {
    if (!selectedNote) return;
    setMoveDialog({ noteId: selectedNote.id, targetNotebookId: selectedNote.notebookId });
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 overscroll-contain">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeDialog}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="relative w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/50 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white truncate">{dialog.title}</h3>
                    {dialog.subtitle && (
                      <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">{dialog.subtitle}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/70 transition-colors"
                    aria-label="关闭"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                    {dialog.mode === 'createNote' || dialog.mode === 'renameNote' ? '笔记标题' : '笔记本名称'}
                  </label>
                  <input
                    ref={dialogInputRef}
                    value={dialog.value}
                    onChange={(e) => setDialog((prev) => prev ? { ...prev, value: e.target.value } : prev)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') closeDialog();
                      if (e.key === 'Enter') submitDialog();
                    }}
                    aria-label={dialog.mode === 'createNote' || dialog.mode === 'renameNote' ? '笔记标题' : '笔记本名称'}
                    name="dialogName"
                    autoComplete="off"
                    className="mt-2 w-full px-4 py-3 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                    placeholder={dialog.mode === 'createNote' || dialog.mode === 'renameNote' ? '例如：产品需求整理' : '例如：学习 / 项目 / 灵感'}
                  />
                  <AnimatePresence>
                    {dialogError && (
                      <motion.p
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-2 text-sm text-red-500 font-medium"
                      >
                        {dialogError}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/70 dark:hover:bg-zinc-950/60 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={submitDialog}
                    className="group px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      确定
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {moveDialog && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 overscroll-contain">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMoveDialog(null)}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 18 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 12 }}
              className="relative w-full max-w-md bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-white/50 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
              <div className="p-6 sm:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white truncate">移动笔记</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">选择一个目标笔记本</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMoveDialog(null)}
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/70 transition-colors"
                    aria-label="关闭"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">目标笔记本</label>
                  <select
                    value={moveDialog.targetNotebookId}
                    onChange={(e) => setMoveDialog((prev) => prev ? { ...prev, targetNotebookId: e.target.value } : prev)}
                    aria-label="目标笔记本"
                    name="targetNotebookId"
                    className="mt-2 w-full px-4 py-3 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-zinc-900 dark:text-white"
                  >
                    {notebookOptions.map((opt) => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div className="mt-6 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setMoveDialog(null)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/70 dark:hover:bg-zinc-950/60 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      moveNote(moveDialog.noteId, moveDialog.targetNotebookId);
                      setSelectedNotebookId(moveDialog.targetNotebookId);
                      setSelectedNoteId(moveDialog.noteId);
                      setMoveDialog(null);
                    }}
                    className="group px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <ArrowRight className="w-4 h-4" />
                      移动
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <header className="flex flex-col gap-4 mb-5">
        <div className="flex items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">笔记</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 truncate">
              {selectedNotebookId ? getNotebookPath(selectedNotebookId) : '先选择或创建一个书架'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNotebookSheetOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
            >
              <BookOpen className="w-4 h-4" />
              <span>书架</span>
            </button>
            <button
              type="button"
              onClick={createNewNote}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">新建笔记</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full">
          <div ref={searchRef} className="relative w-full sm:max-w-[420px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
              onFocus={() => setIsSearchOpen(true)}
              aria-label="搜索全部笔记"
              name="noteSearch"
              autoComplete="off"
              placeholder="搜索全部笔记…"
              className="w-full pl-9 pr-4 py-2.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
            />

            <AnimatePresence>
              {isSearchOpen && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full mt-2 w-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/40 dark:border-zinc-800/50 overflow-hidden z-50"
                >
                  {searchResults.length ? (
                    <div className="max-h-72 overflow-y-auto p-2">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedNotebookId(r.notebookId);
                            setSelectedNoteId(r.id);
                            setSearchQuery('');
                            setIsSearchOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-white/60 dark:hover:bg-zinc-800/60 transition-colors"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{r.title || '未命名笔记'}</span>
                            <span className="text-xs text-zinc-400 dark:text-zinc-500 shrink-0">{getNotebookPath(r.notebookId)}</span>
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                            {(r.content || '').replace(/[#*`_>]/g, '').trim() || '（无内容）'}
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">未找到相关内容</div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex-1 min-h-0 bg-white/60 dark:bg-zinc-950/50 backdrop-blur-2xl rounded-[2.5rem] border border-white/40 dark:border-zinc-800/50 shadow-sm overflow-hidden">
        <div className="grid grid-cols-1 h-full min-h-0">
          <section className="flex flex-col min-h-0">
            {selectedNote ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-white/40 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <input
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      aria-label="笔记标题"
                      name="noteTitle"
                      autoComplete="off"
                      className="flex-1 min-w-0 px-3 py-2 bg-white/60 dark:bg-zinc-950/30 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 rounded-xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-zinc-900 dark:text-zinc-100 font-semibold truncate"
                      placeholder="未命名笔记"
                    />
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="hidden sm:block text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                      {isSaving ? '正在保存…' : (lastSavedAt ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}` : '')}
                    </div>
                    <button
                      type="button"
                      onClick={openMoveSelectedNote}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                      aria-label="移动笔记"
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span className="hidden sm:inline">移动</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => removeNote(selectedNote.id)}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                      aria-label="删除笔记"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">删除</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0" data-color-mode={theme}>
                  <MDEditor
                    value={draftContent}
                    onChange={(val) => setDraftContent(val || '')}
                    preview="live"
                    previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                    height="100%"
                    className="!border-0 !shadow-none !rounded-none h-full"
                    textareaProps={{ placeholder: '写下你的想法…（支持 Markdown）' }}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 gap-4">
                <div className="w-16 h-16 rounded-3xl bg-white/50 dark:bg-zinc-950/30 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 flex items-center justify-center">
                  <FileText className="w-8 h-8" />
                </div>
                <p className="text-sm">选择或新建一条笔记开始编辑</p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsNotebookSheetOpen(true)}
                    className="px-5 py-2.5 rounded-full bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-700 dark:text-zinc-200 font-medium text-sm shadow-sm"
                  >
                    选择书架
                  </button>
                  <button
                    type="button"
                    onClick={createNewNote}
                    className="px-6 py-2.5 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
                  >
                    新建笔记
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>

      <AnimatePresence>
        {isNotebookSheetOpen && (
          <div className="fixed inset-0 z-[105] flex items-end justify-center p-3">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotebookSheetOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 dark:bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: 32, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="relative w-full max-w-lg bg-white/85 dark:bg-zinc-900/85 backdrop-blur-2xl border border-white/50 dark:border-zinc-800 rounded-[2rem] shadow-2xl overflow-hidden"
            >
              <div className="p-4 border-b border-white/40 dark:border-zinc-800/60 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  <span>书架</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotebookSheetOpen(false)}
                  className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/70 transition-colors"
                  aria-label="关闭"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openCreateNotebook(null)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>新建书架</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!selectedShelfId) return;
                    openCreateNotebook(selectedShelfId);
                  }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                >
                  <Folder className="w-4 h-4" />
                  <span>新建笔记本</span>
                </button>
              </div>

              {selectedNotebookId && notebookById.get(selectedNotebookId)?.parentId !== null && (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={moveSelectedNotebookToRoot}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-950/30 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-800/50 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-950/50 transition-all"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>提升为书架</span>
                  </button>
                </div>
              )}

              <div className="max-h-[70vh] overflow-y-auto px-4 pb-5 space-y-1">
                {shelves.length ? (
                  shelves.map((shelf) => {
                    const children = notebooksByShelf.get(shelf.id) ?? [];
                    const isExpanded = expandedShelves.has(shelf.id);
                    const isActive = shelf.id === selectedShelfId;
                    return (
                      <div
                        key={shelf.id}
                        className={cn(
                          "rounded-[1.75rem] border overflow-hidden bg-white/55 dark:bg-zinc-950/30 backdrop-blur-md transition-colors",
                          isActive ? "border-teal-400/50 dark:border-teal-500/40" : "border-white/40 dark:border-zinc-800/60"
                        )}
                      >
                        <div className="flex items-stretch gap-2 p-3">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedShelfId(shelf.id);
                              if (children.length) toggleShelfExpanded(shelf.id);
                              else selectNotebook(shelf.id, shelf.id);
                            }}
                            className="flex-1 min-w-0 flex items-center gap-3 text-left rounded-2xl px-2 py-2 hover:bg-white/60 dark:hover:bg-zinc-900/60 transition-colors"
                            aria-label="展开书架"
                          >
                            <div className={cn(
                              "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border",
                              isActive ? "bg-teal-500/15 border-teal-500/30" : "bg-white/50 dark:bg-zinc-950/40 border-white/40 dark:border-zinc-800/60"
                            )}>
                              <BookOpen className={cn("w-5 h-5", isActive ? "text-teal-700 dark:text-teal-300" : "text-teal-600 dark:text-teal-400")} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{shelf.name}</div>
                              <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                                {children.length ? `${children.length} 本笔记本` : '暂无笔记本'}
                              </div>
                            </div>
                          </button>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); openRenameNotebook(shelf.id, shelf.name); }}
                              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                              aria-label="重命名书架"
                              title="重命名"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); removeNotebook(shelf.id); }}
                              className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-900/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                              aria-label="删除书架"
                              title="删除"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                            {children.length ? (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); toggleShelfExpanded(shelf.id); }}
                                className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-900/60 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                                aria-label={isExpanded ? '收起书架' : '展开书架'}
                              >
                                {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <AnimatePresence initial={false}>
                          {children.length > 0 && isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="px-4 pb-4"
                            >
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {children.map((nb) => {
                                  const isCurrent = nb.id === selectedNotebookId;
                                  return (
                                    <button
                                      key={nb.id}
                                      type="button"
                                      onClick={() => selectNotebook(nb.id, shelf.id)}
                                      className={cn(
                                        "group text-left rounded-2xl border px-3 py-3 transition-colors",
                                        isCurrent
                                          ? "bg-zinc-900/90 dark:bg-white/90 border-transparent text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                                          : "bg-white/50 dark:bg-zinc-950/30 border-white/40 dark:border-zinc-800/60 hover:bg-white/70 dark:hover:bg-zinc-950/50"
                                      )}
                                      aria-label="选择笔记本"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={cn(
                                          "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                                          isCurrent ? "bg-white/10 dark:bg-black/10" : "bg-teal-500/10"
                                        )}>
                                          <Folder className={cn("w-5 h-5", isCurrent ? "text-white dark:text-zinc-900" : "text-teal-600 dark:text-teal-400")} />
                                        </div>
                                        <div className="min-w-0 flex-1">
                                          <div className={cn("text-sm font-semibold truncate", isCurrent ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100")}>
                                            {nb.name}
                                          </div>
                                          <div className={cn("text-xs mt-0.5 truncate", isCurrent ? "text-white/70 dark:text-zinc-700" : "text-zinc-400 dark:text-zinc-500")}>
                                            {getNotebookPath(nb.id)}
                                          </div>
                                        </div>
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="mt-3">
                                <button
                                  type="button"
                                  onClick={() => openCreateNotebook(shelf.id)}
                                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-950/30 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-800/50 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-950/50 transition-all"
                                >
                                  <Plus className="w-4 h-4" />
                                  <span>在此书架新建笔记本</span>
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">还没有书架</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

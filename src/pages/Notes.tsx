import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronRight, FileText, Folder, Plus, Search, Trash2, Pencil, ArrowRight, X, Check } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { useStore, useUserData } from '../store';
import { cn } from '../utils/cn';

type TreeNode = {
  id: string;
  name: string;
  parentId: string | null;
  children: TreeNode[];
};

function buildTree(items: { id: string; name: string; parentId: string | null }[]) {
  const map = new Map<string, TreeNode>();
  for (const item of items) {
    map.set(item.id, { ...item, children: [] });
  }
  const roots: TreeNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) {
      map.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sort = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
    for (const n of nodes) sort(n.children);
  };
  sort(roots);
  return roots;
}

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
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [noteQuery, setNoteQuery] = useState('');
  const [mobilePane, setMobilePane] = useState<'list' | 'editor'>(() => (initialNoteId ? 'editor' : 'list'));
  const [isNotebookSheetOpen, setIsNotebookSheetOpen] = useState(false);

  const tree = useMemo(() => buildTree(notebooks), [notebooks]);

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

  const currentNotebookNotes = useMemo(() => {
    if (!selectedNotebookId) return [];
    return notes
      .filter(n => n.notebookId === selectedNotebookId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedNotebookId]);

  const filteredNotebookNotes = useMemo(() => {
    const q = noteQuery.trim().toLowerCase();
    if (!q) return currentNotebookNotes;
    return currentNotebookNotes.filter((n) => ((n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q)));
  }, [currentNotebookNotes, noteQuery]);

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
    if (!selectedNotebookId) {
      const first = tree[0]?.id ?? null;
      if (first) setSelectedNotebookId(first);
    }
  }, [selectedNotebookId, tree]);

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
    setExpanded((prev) => {
      const next = new Set(prev);
      let cur = notebookById.get(selectedNotebookId);
      const guard = new Set<string>();
      while (cur?.parentId && !guard.has(cur.id)) {
        guard.add(cur.id);
        next.add(cur.parentId);
        cur = notebookById.get(cur.parentId);
      }
      return next;
    });
  }, [selectedNotebookId, notebookById]);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return notes
      .filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 12);
  }, [notes, searchQuery]);

  const openCreateNotebook = (parentId: string | null) => {
    setDialog({
      mode: 'createNotebook',
      title: '新建笔记本',
      subtitle: parentId ? `父级：${getNotebookPath(parentId)}` : '创建在根目录',
      value: '',
      parentId
    });
  };

  const openRenameNotebook = (id: string, currentName: string) => {
    setDialog({
      mode: 'renameNotebook',
      title: '重命名笔记本',
      subtitle: '让结构更清晰一点',
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
      setExpanded((prev) => {
        const next = new Set(prev);
        next.add(id);
        if (parentId) next.add(parentId);
        return next;
      });
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
      setMobilePane('editor');
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
      setMobilePane(next ? 'editor' : 'list');
    }
  };

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const moveSelectedNotebookToRoot = () => {
    if (!selectedNotebookId) return;
    moveNotebook(selectedNotebookId, null);
  };

  const openMoveSelectedNote = () => {
    if (!selectedNote) return;
    setMoveDialog({ noteId: selectedNote.id, targetNotebookId: selectedNote.notebookId });
  };

  const TreeRow = ({ node, depth }: { node: TreeNode; depth: number }) => {
    const isSelected = node.id === selectedNotebookId;
    const isExpanded = expanded.has(node.id);
    const hasChildren = node.children.length > 0;

    return (
      <div className="select-none">
        <div
          className={cn(
            "group w-full flex items-center gap-2 rounded-2xl px-3 py-2 transition-all duration-300 cursor-pointer border border-transparent",
            isSelected
              ? "bg-zinc-900/90 dark:bg-white/90 text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
              : "text-zinc-600 dark:text-zinc-300 hover:bg-white/60 dark:hover:bg-zinc-900/60 hover:shadow-sm"
          )}
          style={{ paddingLeft: 12 + depth * 12 }}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) toggleExpanded(node.id);
            }}
            className={cn(
              "w-6 h-6 flex items-center justify-center rounded-lg transition-colors",
              hasChildren ? "opacity-100" : "opacity-0",
              isSelected ? "hover:bg-white/10 dark:hover:bg-black/10" : "hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
            )}
            aria-label={isExpanded ? "Collapse notebook" : "Expand notebook"}
          >
            {hasChildren ? (
              isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
            ) : null}
          </button>

          <button
            type="button"
              onClick={() => {
                setSelectedNotebookId(node.id);
                setIsNotebookSheetOpen(false);
                setMobilePane('list');
              }}
            className="flex items-center gap-2 flex-1 min-w-0 text-left"
          >
            <Folder className={cn("w-4 h-4 shrink-0", isSelected ? "text-white dark:text-zinc-900" : "text-teal-600 dark:text-teal-400")} />
            <span className="flex-1 text-sm font-medium truncate">{node.name}</span>
          </button>

          <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", isSelected && "opacity-100")}>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); openRenameNotebook(node.id, node.name); }}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                isSelected ? "hover:bg-white/10 dark:hover:bg-black/10" : "hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
              )}
              title="重命名"
              aria-label="Rename notebook"
            >
              <Pencil className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeNotebook(node.id); }}
              className={cn(
                "p-1.5 rounded-xl transition-colors",
                isSelected ? "hover:bg-white/10 dark:hover:bg-black/10" : "hover:bg-zinc-100/80 dark:hover:bg-zinc-800/80"
              )}
              title="删除"
              aria-label="Delete notebook"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {node.children.map((child) => (
              <TreeRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </div>
        )}
      </div>
    );
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
              {selectedNotebookId ? getNotebookPath(selectedNotebookId) : '先选择或创建一个笔记本'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsNotebookSheetOpen(true)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
            >
              <Folder className="w-4 h-4" />
              <span>笔记本</span>
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
                            setMobilePane('editor');
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
        <div className="grid grid-cols-1 lg:grid-cols-[420px_1fr] h-full min-h-0">
          <section className={cn("flex flex-col min-h-0 lg:border-r border-white/40 dark:border-zinc-800/60", mobilePane === 'editor' && "hidden lg:flex")}>
            <div className="p-4 border-b border-white/40 dark:border-zinc-800/60 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {selectedNotebookId ? getNotebookPath(selectedNotebookId) : '笔记列表'}
                </div>
                <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  {selectedNotebookId ? `${currentNotebookNotes.length} 条` : '先选择一个笔记本'}
                </div>
              </div>
              <button
                type="button"
                onClick={createNewNote}
                className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                aria-label="新建笔记"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-white/30 dark:border-zinc-800/50">
              <input
                value={noteQuery}
                onChange={(e) => setNoteQuery(e.target.value)}
                aria-label="筛选当前笔记本"
                name="noteFilter"
                autoComplete="off"
                placeholder="筛选当前笔记本…"
                className="w-full px-4 py-2.5 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-2">
              {selectedNotebookId ? (
                filteredNotebookNotes.length ? (
                  filteredNotebookNotes.map((n) => {
                    const isActive = n.id === selectedNoteId;
                    return (
                      <div
                        key={n.id}
                        className={cn(
                          "group flex items-start gap-3 px-3 py-3 rounded-2xl border transition-all cursor-pointer",
                          isActive
                            ? "bg-zinc-900/90 dark:bg-white/90 border-transparent text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                            : "bg-white/50 dark:bg-zinc-950/30 border-white/40 dark:border-zinc-800/50 hover:bg-white/70 dark:hover:bg-zinc-950/50 hover:shadow-sm"
                        )}
                      >
                        <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", isActive ? "bg-white/10 dark:bg-black/10" : "bg-teal-500/10")}>
                          <FileText className={cn("w-5 h-5", isActive ? "text-white dark:text-zinc-900" : "text-teal-600 dark:text-teal-400")} />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedNoteId(n.id);
                            setMobilePane('editor');
                          }}
                          className="flex-1 min-w-0 text-left"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className={cn("text-sm font-semibold truncate", isActive ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100")}>
                              {n.title || '未命名笔记'}
                            </div>
                            <div className={cn("text-[11px] font-medium shrink-0", isActive ? "text-white/70 dark:text-zinc-700" : "text-zinc-400 dark:text-zinc-500")}>
                              {new Date(n.updatedAt).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                            </div>
                          </div>
                          <div className={cn("text-xs mt-1 line-clamp-2 leading-relaxed", isActive ? "text-white/70 dark:text-zinc-700" : "text-zinc-500 dark:text-zinc-400")}>
                            {(n.content || '').replace(/[#*`_>]/g, '').trim() || '（无内容）'}
                          </div>
                        </button>

                        <div className={cn("flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity", isActive && "opacity-100")}>
                          <button
                            type="button"
                            onClick={() => openRenameNote(n.id, n.title || '未命名笔记')}
                            className={cn(
                              "p-1.5 rounded-xl transition-colors",
                              isActive ? "hover:bg-white/10 dark:hover:bg-black/10" : "hover:bg-white/70 dark:hover:bg-zinc-800/70"
                            )}
                            title="编辑标题"
                            aria-label="编辑标题"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeNote(n.id)}
                            className={cn(
                              "p-1.5 rounded-xl transition-colors",
                              isActive ? "hover:bg-white/10 dark:hover:bg-black/10" : "hover:bg-white/70 dark:hover:bg-zinc-800/70"
                            )}
                            title="删除"
                            aria-label="删除笔记"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">没有匹配的笔记</div>
                )
              ) : (
                <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">先创建一个笔记本再开始</div>
              )}
            </div>
          </section>

          <section className={cn("flex flex-col min-h-0", mobilePane === 'list' && "hidden lg:flex")}>
            {selectedNote ? (
              <div className="flex-1 flex flex-col min-h-0">
                <div className="p-4 border-b border-white/40 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <button
                      type="button"
                      onClick={() => setMobilePane('list')}
                      className="lg:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white/60 dark:bg-zinc-950/40 border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-600 dark:text-zinc-300 hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                      aria-label="返回列表"
                    >
                      <ArrowRight className="w-4 h-4 rotate-180" />
                    </button>
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
                    className="lg:hidden px-5 py-2.5 rounded-full bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-700 dark:text-zinc-200 font-medium text-sm shadow-sm"
                  >
                    选择笔记本
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
                  <span>选择笔记本</span>
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
                  <span>新建</span>
                </button>
                <button
                  type="button"
                  onClick={() => openCreateNotebook(selectedNotebookId)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>子级</span>
                </button>
              </div>

              {selectedNotebookId && (
                <div className="px-4 pb-4">
                  <button
                    type="button"
                    onClick={moveSelectedNotebookToRoot}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-950/30 backdrop-blur-md border border-zinc-200/40 dark:border-zinc-800/50 rounded-xl hover:bg-white/70 dark:hover:bg-zinc-950/50 transition-all"
                  >
                    <ArrowRight className="w-4 h-4 rotate-180" />
                    <span>移动到根目录</span>
                  </button>
                </div>
              )}

              <div className="max-h-[70vh] overflow-y-auto px-4 pb-5 space-y-1">
                {tree.length ? (
                  tree.map((node) => (
                    <TreeRow key={node.id} node={node} depth={0} />
                  ))
                ) : (
                  <div className="py-10 text-center text-sm text-zinc-500 dark:text-zinc-400">还没有笔记本</div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

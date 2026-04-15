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
  const {
    createNotebook,
    updateNotebook,
    deleteNotebook,
    createNote,
    updateNote,
    deleteNote,
    moveNotebook
  } = useStore();

  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(initialNotebookId);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNoteId);
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const tree = useMemo(() => buildTree(notebooks), [notebooks]);

  const notebookById = useMemo(() => {
    const map = new Map<string, { id: string; name: string; parentId: string | null }>();
    for (const nb of notebooks) map.set(nb.id, nb);
    return map;
  }, [notebooks]);

  const getNotebookPath = (notebookId: string) => {
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

  const currentNotebookNotes = useMemo(() => {
    if (!selectedNotebookId) return [];
    return notes
      .filter(n => n.notebookId === selectedNotebookId)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, selectedNotebookId]);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);

  const [draftContent, setDraftContent] = useState('');

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

  useEffect(() => {
    if (!selectedNotebookId) {
      const first = tree[0]?.id ?? null;
      if (first) setSelectedNotebookId(first);
    }
  }, [selectedNotebookId, tree]);

  useEffect(() => {
    if (selectedNote) {
      setDraftContent(selectedNote.content);
      return;
    }
    setDraftContent('');
  }, [selectedNote?.id]);

  useEffect(() => {
    if (!selectedNote) return;
    const t = window.setTimeout(() => {
      if (draftContent !== selectedNote.content) updateNote(selectedNote.id, { content: draftContent });
    }, 450);
    return () => window.clearTimeout(t);
  }, [draftContent, selectedNote?.id]);

  useEffect(() => {
    if (!dialog) return;
    setDialogError('');
    const t = window.setTimeout(() => dialogInputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [dialog?.mode]);

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
    deleteNote(id);
    if (selectedNoteId === id) setSelectedNoteId(null);
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
            onClick={() => setSelectedNotebookId(node.id)}
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
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overscroll-contain">
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
                    aria-label="Close"
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

      <header className="flex flex-col gap-4 mb-6">
        <div className="flex items-start sm:items-center justify-between gap-4 flex-col sm:flex-row">
          <div>
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">笔记</h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">多层级笔记本 · 全文搜索 · Markdown 编辑</p>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div ref={searchRef} className="relative w-full sm:w-[360px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setIsSearchOpen(true); }}
                onFocus={() => setIsSearchOpen(true)}
                placeholder="搜索笔记标题或内容…"
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
        </div>
      </header>

      <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0">
        <section className="w-full lg:w-[360px] bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-zinc-800/50 shadow-sm overflow-hidden min-h-[260px]">
          <div className="p-4 sm:p-5 border-b border-white/40 dark:border-zinc-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>笔记本</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openCreateNotebook(null)}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">新建</span>
              </button>
              <button
                type="button"
                onClick={() => openCreateNotebook(selectedNotebookId)}
                className="hidden sm:flex items-center gap-2 px-3 py-2 text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-xl hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
              >
                <ArrowRight className="w-4 h-4" />
                <span>子级</span>
              </button>
            </div>
          </div>

          <div className="p-3 sm:p-4 space-y-1 overflow-y-auto max-h-[38vh] lg:max-h-none lg:h-[calc(100%-64px)]">
            {tree.length ? (
              tree.map((node) => (
                <TreeRow key={node.id} node={node} depth={0} />
              ))
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/50 dark:bg-zinc-950/40 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 flex items-center justify-center">
                  <Folder className="w-6 h-6" />
                </div>
                <p className="text-sm">还没有笔记本</p>
                <button
                  type="button"
                  onClick={() => openCreateNotebook(null)}
                  className="px-4 py-2 rounded-full bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 font-medium text-sm shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                >
                  创建第一个笔记本
                </button>
              </div>
            )}

            {selectedNotebookId && (
              <div className="mt-3 pt-3 border-t border-white/30 dark:border-zinc-800/60">
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
          </div>
        </section>

        <section className="flex-1 flex flex-col gap-4 min-h-0">
          <div className="bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-zinc-800/50 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-white/40 dark:border-zinc-800/60 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                <FileText className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>笔记</span>
                {selectedNotebookId && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 font-medium hidden sm:inline">· {getNotebookPath(selectedNotebookId)}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={createNewNote}
                  className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                >
                  <Plus className="w-4 h-4" />
                  <span>新建笔记</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row min-h-0">
              <div className="lg:w-[320px] border-b lg:border-b-0 lg:border-r border-white/40 dark:border-zinc-800/60">
                <div className="p-3 sm:p-4 space-y-2 max-h-[240px] lg:max-h-none lg:h-[calc(100vh-420px)] overflow-y-auto">
                  {selectedNotebookId ? (
                    currentNotebookNotes.length ? (
                      currentNotebookNotes.map((n) => {
                        const isActive = n.id === selectedNoteId;
                        return (
                          <div
                            key={n.id}
                            className={cn(
                              "group flex items-start gap-3 px-3 py-3 rounded-2xl border transition-all cursor-pointer backdrop-blur-md",
                              isActive
                                ? "bg-zinc-900/90 dark:bg-white/90 border-transparent text-white dark:text-zinc-900 shadow-lg shadow-zinc-900/10 dark:shadow-white/10"
                                : "bg-white/50 dark:bg-zinc-950/30 border-white/40 dark:border-zinc-800/50 hover:bg-white/70 dark:hover:bg-zinc-950/50 hover:shadow-sm"
                            )}
                          >
                            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0", isActive ? "bg-white/10 dark:bg-black/10" : "bg-teal-500/10")}>
                              <FileText className={cn("w-5 h-5", isActive ? "text-white dark:text-zinc-900" : "text-teal-600 dark:text-teal-400")} />
                            </div>
                            <button type="button" onClick={() => setSelectedNoteId(n.id)} className="flex-1 min-w-0 text-left">
                              <div className="flex items-center justify-between gap-2">
                                <div className={cn("text-sm font-semibold truncate", isActive ? "text-white dark:text-zinc-900" : "text-zinc-900 dark:text-zinc-100")}>
                                  {n.title || '未命名笔记'}
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
                                aria-label="Rename note"
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
                                aria-label="Delete note"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        这个笔记本还没有笔记
                      </div>
                    )
                  ) : (
                    <div className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      先创建一个笔记本再开始
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-[420px] lg:min-h-0 flex flex-col">
                {selectedNote ? (
                  <div className="flex-1 flex flex-col min-h-0">
                    <div className="p-4 sm:p-5 border-b border-white/40 dark:border-zinc-800/60 bg-white/40 dark:bg-zinc-950/20 backdrop-blur-md flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">标题</div>
                        <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100 truncate mt-1">
                          {selectedNote.title || '未命名笔记'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openRenameNote(selectedNote.id, selectedNote.title || '未命名笔记')}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="hidden sm:inline">编辑</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeNote(selectedNote.id)}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 bg-white/60 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/80 dark:hover:bg-zinc-950/60 transition-all shadow-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">删除</span>
                        </button>
                      </div>
                    </div>
                    <div className="flex-1 min-h-0" data-color-mode={useStore((s) => s.theme)}>
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
                    <button
                      type="button"
                      onClick={createNewNote}
                      className="px-6 py-3 rounded-full bg-gradient-to-r from-teal-500 to-emerald-500 text-white font-semibold shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
                    >
                      新建笔记
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

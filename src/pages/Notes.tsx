import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, BookOpen, FileText, Plus, Folder, ChevronRight, Pencil, Trash2, LayoutPanelLeft, Clock, Save, Menu } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { useStore, useUserData } from '../store';
import { cn } from '../utils/cn';

export default function Notes() {
  const { notebooks, notes } = useUserData();
  const store = useStore();
  const theme = store.theme;
  
  const location = useLocation();
  const initialNoteId = new URLSearchParams(location.search).get('id');

  // Core State
  const [selectedShelfId, setSelectedShelfId] = useState<string | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(initialNoteId);
  const [searchQuery, setSearchQuery] = useState('');
  
  // UI State
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(() => new Set());
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [mobilePane, setMobilePane] = useState<'categories' | 'list' | 'editor'>('categories');
  
  // Dialog State
  const [dialog, setDialog] = useState<{
    mode: 'createShelf' | 'createNotebook' | 'renameNotebook' | 'renameNote';
    title: string;
    subtitle?: string;
    value: string;
    targetId?: string | null;
  } | null>(null);
  const [dialogError, setDialogError] = useState('');

  // Draft State for Editor
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Derived Data
  const notebookById = useMemo(() => {
    const map = new Map<string, typeof notebooks[0]>();
    for (const nb of notebooks) map.set(nb.id, nb);
    return map;
  }, [notebooks]);

  const shelves = useMemo(() => {
    return notebooks
      .filter((nb) => nb.parentId === null)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  }, [notebooks]);

  const notebooksByShelf = useMemo(() => {
    const map = new Map<string, typeof notebooks>();
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

  const displayedNotes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return currentNotebookNotes;
    return notes
      .filter(n => (n.title || '').toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, currentNotebookNotes, searchQuery]);

  const selectedNote = useMemo(() => notes.find(n => n.id === selectedNoteId) || null, [notes, selectedNoteId]);

  // Sync Draft
  useEffect(() => {
    if (selectedNote) {
      setDraftTitle(selectedNote.title || '');
      setDraftContent(selectedNote.content || '');
      setLastSavedAt(selectedNote.updatedAt);
    } else {
      setDraftTitle('');
      setDraftContent('');
      setLastSavedAt(null);
    }
  }, [selectedNoteId, selectedNote?.id]);

  // Auto-save
  useEffect(() => {
    if (!selectedNoteId || !selectedNote) return;
    if (draftTitle === selectedNote.title && draftContent === selectedNote.content) return;

    setIsSaving(true);
    const timer = setTimeout(() => {
      store.updateNote(selectedNoteId, { title: draftTitle, content: draftContent });
      setLastSavedAt(Date.now());
      setIsSaving(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [draftTitle, draftContent, selectedNoteId]);

  // Actions
  const toggleShelf = (id: string) => {
    setExpandedShelves(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleCreateNote = () => {
    if (!selectedNotebookId) return;
    const newId = store.createNote(selectedNotebookId);
    setSelectedNoteId(newId);
    setSearchQuery('');
    setMobilePane('editor');
  };

  const handleDeleteNote = (id: string) => {
    if (confirm('确定要删除这篇笔记吗？')) {
      store.deleteNote(id);
      if (selectedNoteId === id) {
        setSelectedNoteId(null);
        setMobilePane('list');
      }
    }
  };

  const handleDeleteNotebook = (id: string) => {
    if (confirm('确定要删除这个笔记本及其所有内容吗？')) {
      store.deleteNotebook(id);
      if (selectedNotebookId === id) setSelectedNotebookId(null);
      if (selectedShelfId === id) setSelectedShelfId(null);
    }
  };

  const closeDialog = () => {
    setDialog(null);
    setDialogError('');
  };

  const submitDialog = () => {
    if (!dialog) return;
    const val = dialog.value.trim();
    if (!val) {
      setDialogError('名称不能为空');
      return;
    }

    if (dialog.mode === 'createShelf') {
      const id = store.createNotebook({ name: val, parentId: null });
      setExpandedShelves(prev => new Set(prev).add(id));
    } else if (dialog.mode === 'createNotebook') {
      const id = store.createNotebook({ name: val, parentId: dialog.targetId! });
      setSelectedShelfId(dialog.targetId!);
      setSelectedNotebookId(id);
    } else if (dialog.mode === 'renameNotebook') {
      store.updateNotebook(dialog.targetId!, { name: val });
    } else if (dialog.mode === 'renameNote') {
      store.updateNote(dialog.targetId!, { title: val });
    }
    closeDialog();
  };

  const getNotebookPath = (id: string) => {
    const nb = notebookById.get(id);
    if (!nb) return '';
    if (!nb.parentId) return nb.name;
    const parent = notebookById.get(nb.parentId);
    return parent ? `${parent.name} / ${nb.name}` : nb.name;
  };

  return (
    <div className="h-[100dvh] sm:h-screen w-full bg-[#FAFAFA] dark:bg-[#0A0A0A] flex overflow-hidden text-zinc-900 dark:text-zinc-100 font-sans selection:bg-teal-500/30">
      
      {/* 1. Categories Pane (Shelves & Notebooks) */}
      <div
        className={cn(
          "flex-shrink-0 flex flex-col border-r border-black/[0.06] dark:border-white/[0.06] bg-zinc-50/50 dark:bg-zinc-900/20 overflow-hidden transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
          mobilePane !== 'categories' ? "hidden md:flex" : "flex w-full absolute inset-0 z-20 md:relative",
          isSidebarOpen ? "md:w-[260px] opacity-100" : "md:w-0 opacity-0 md:border-none"
        )}
      >
        <div className="w-full md:w-[260px] h-full flex flex-col min-w-[260px]">
          <div className="h-14 flex items-center justify-between px-4 border-b border-transparent shrink-0">
            <div className="font-semibold text-sm tracking-wide flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-teal-600 dark:text-teal-400" />
              <span>分类</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setDialog({ mode: 'createShelf', title: '新建书架', value: '' })}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="新建书架"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                title="隐藏侧边栏"
              >
                <LayoutPanelLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-4 pb-20">
            {shelves.length === 0 ? (
              <div className="text-center py-10 px-4">
                <div className="w-10 h-10 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-5 h-5 text-zinc-400" />
                </div>
                <p className="text-xs text-zinc-500">还没有任何书架，创建一个来组织你的笔记吧。</p>
              </div>
            ) : (
              shelves.map(shelf => {
                const children = notebooksByShelf.get(shelf.id) || [];
                const isExpanded = expandedShelves.has(shelf.id);
                return (
                  <div key={shelf.id} className="space-y-1">
                    <div className="group flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
                         onClick={() => toggleShelf(shelf.id)}>
                      <div className="flex items-center gap-1.5 overflow-hidden">
                        <ChevronRight className={cn("w-3.5 h-3.5 text-zinc-400 transition-transform", isExpanded && "rotate-90")} />
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider truncate">{shelf.name}</span>
                      </div>
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); setDialog({ mode: 'createNotebook', title: '新建笔记本', value: '', targetId: shelf.id }); }} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white" title="新建笔记本"><Plus className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); setDialog({ mode: 'renameNotebook', title: '重命名书架', value: shelf.name, targetId: shelf.id }); }} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white" title="重命名"><Pencil className="w-3 h-3" /></button>
                        <button onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(shelf.id); }} className="p-1 text-zinc-400 hover:text-red-500" title="删除"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </div>

                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="pl-4 space-y-0.5 mt-1">
                            {children.length === 0 ? (
                              <div className="text-[11px] text-zinc-400 px-2 py-1">无笔记本</div>
                            ) : (
                              children.map(nb => {
                                const isSelected = selectedNotebookId === nb.id;
                                return (
                                  <div key={nb.id} className="group flex items-center justify-between">
                                    <button
                                      onClick={() => {
                                        setSelectedNotebookId(nb.id);
                                        setSelectedShelfId(shelf.id);
                                        setMobilePane('list');
                                      }}
                                      className={cn(
                                        "flex-1 flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-colors text-left truncate",
                                        isSelected 
                                          ? "bg-teal-500/10 text-teal-700 dark:text-teal-400 font-medium" 
                                          : "text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200"
                                      )}
                                    >
                                      <Folder className={cn("w-3.5 h-3.5 shrink-0", isSelected ? "text-teal-600 dark:text-teal-400" : "text-zinc-400")} />
                                      <span className="truncate">{nb.name}</span>
                                    </button>
                                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity pr-1">
                                      <button onClick={(e) => { e.stopPropagation(); setDialog({ mode: 'renameNotebook', title: '重命名', value: nb.name, targetId: nb.id }); }} className="p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white" title="重命名"><Pencil className="w-3 h-3" /></button>
                                      <button onClick={(e) => { e.stopPropagation(); handleDeleteNotebook(nb.id); }} className="p-1 text-zinc-400 hover:text-red-500" title="删除"><Trash2 className="w-3 h-3" /></button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. Notes List Pane */}
      <div className={cn(
        "flex-shrink-0 flex flex-col border-r border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#0A0A0A]",
        mobilePane !== 'list' ? "hidden md:flex" : "flex w-full absolute inset-0 z-10 md:relative",
        "md:w-[320px]"
      )}>
        
        <div className="h-14 flex items-center gap-2 px-3 border-b border-black/[0.06] dark:border-white/[0.06] shrink-0">
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="hidden md:flex p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              title="显示侧边栏"
            >
              <LayoutPanelLeft className="w-4 h-4" />
            </button>
          )}
          <button onClick={() => setMobilePane('categories')} className="md:hidden p-1.5 text-zinc-500"><Menu className="w-5 h-5" /></button>
          
          <div className="flex-1 relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索笔记…"
              className="w-full pl-8 pr-3 py-1.5 bg-black/[0.03] dark:bg-white/[0.05] rounded-md text-sm outline-none focus:ring-1 focus:ring-teal-500/50 transition-all placeholder:text-zinc-400"
            />
          </div>
          <button
            onClick={handleCreateNote}
            disabled={!selectedNotebookId}
            className="p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="新建笔记"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {searchQuery && <div className="px-3 py-2 text-xs font-semibold text-zinc-400 uppercase tracking-wider">搜索结果</div>}
          
          {displayedNotes.length === 0 ? (
            <div className="text-center py-12 px-4 text-zinc-400">
              {searchQuery ? '未找到匹配的笔记' : (selectedNotebookId ? '此笔记本为空' : '请先在左侧选择一个笔记本')}
            </div>
          ) : (
            displayedNotes.map(n => {
              const isSelected = selectedNoteId === n.id;
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    setSelectedNoteId(n.id);
                    if (n.notebookId !== selectedNotebookId && searchQuery) {
                      setSelectedNotebookId(n.notebookId);
                    }
                    setMobilePane('editor');
                  }}
                  className={cn(
                    "w-full text-left px-3 py-3 rounded-xl transition-all group border border-transparent",
                    isSelected
                      ? "bg-white dark:bg-zinc-900 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)] border-black/[0.04] dark:border-white/[0.04]"
                      : "hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                  )}
                >
                  <div className={cn("text-sm font-semibold truncate mb-1 transition-colors", isSelected ? "text-teal-700 dark:text-teal-400" : "text-zinc-900 dark:text-zinc-100")}>
                    {n.title || '未命名笔记'}
                  </div>
                  <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mb-2">
                    {(n.content || '').replace(/[#*`_>]/g, '').trim() || '无正文'}
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 font-medium">
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(n.updatedAt).toLocaleDateString('zh-CN')}</span>
                    {searchQuery && <span className="truncate max-w-[100px]">{getNotebookPath(n.notebookId)}</span>}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* 3. Editor Pane */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0A0A0A]",
        mobilePane !== 'editor' && "hidden md:flex"
      )}>
        {selectedNote ? (
          <>
            <div className="h-14 flex items-center justify-between px-4 shrink-0">
              <div className="flex items-center gap-2">
                <button onClick={() => setMobilePane('list')} className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"><ChevronRight className="w-5 h-5 rotate-180" /></button>
                <div className="text-xs font-medium text-zinc-400 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5" />
                  {getNotebookPath(selectedNote.notebookId)}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-zinc-400 font-medium mr-2 flex items-center gap-1">
                  {isSaving ? <span className="animate-pulse flex items-center gap-1"><Save className="w-3 h-3" /> 保存中</span> : (lastSavedAt ? `已保存 ${new Date(lastSavedAt).toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}` : '')}
                </div>
                <button
                  onClick={() => setDialog({ mode: 'renameNote', title: '重命名笔记', value: selectedNote.title, targetId: selectedNote.id })}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-md transition-colors"
                  title="重命名"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteNote(selectedNote.id)}
                  className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md transition-colors"
                  title="删除笔记"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="max-w-3xl mx-auto px-6 sm:px-12 py-10">
                <input
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  placeholder="未命名笔记"
                  className="w-full text-4xl sm:text-5xl font-bold bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-200 dark:placeholder:text-zinc-800 mb-8"
                />
                
                <div data-color-mode={theme} className="editor-wrapper">
                  <MDEditor
                    value={draftContent}
                    onChange={(val) => setDraftContent(val || '')}
                    preview="live"
                    previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
                    hideToolbar={false}
                    className="!border-0 !shadow-none !bg-transparent note-editor"
                    textareaProps={{ placeholder: '写下你的想法…（支持 Markdown）' }}
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400">
            <div className="w-16 h-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 flex items-center justify-center mb-4">
              <FileText className="w-8 h-8 text-zinc-300 dark:text-zinc-600" />
            </div>
            <p className="text-sm font-medium">选择或新建一篇笔记</p>
          </div>
        )}
      </div>

      {/* Dialog */}
      <AnimatePresence>
        {dialog && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDialog}
              className="absolute inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-black/5 dark:border-white/10 overflow-hidden"
            >
              <div className="p-5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-1">{dialog.title}</h3>
                {dialog.subtitle && <p className="text-sm text-zinc-500 mb-4">{dialog.subtitle}</p>}
                
                <div className="mt-4">
                  <input
                    autoFocus
                    value={dialog.value}
                    onChange={(e) => {
                      setDialog({ ...dialog, value: e.target.value });
                      setDialogError('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitDialog();
                      if (e.key === 'Escape') closeDialog();
                    }}
                    className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-all"
                    placeholder="输入名称…"
                  />
                  {dialogError && <p className="text-xs text-red-500 mt-1.5">{dialogError}</p>}
                </div>
              </div>
              <div className="px-5 py-4 bg-zinc-50 dark:bg-zinc-950/50 border-t border-zinc-100 dark:border-zinc-800/50 flex justify-end gap-2">
                <button onClick={closeDialog} className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors">
                  取消
                </button>
                <button onClick={submitDialog} className="px-4 py-2 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shadow-sm">
                  确认
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <style>{`
        /* Minimalist Editor Overrides */
        .editor-wrapper .w-md-editor {
          background: transparent !important;
          box-shadow: none !important;
        }
        .editor-wrapper .w-md-editor-toolbar {
          background: transparent !important;
          border-bottom: 1px solid var(--tw-border-opacity) !important;
          border-color: rgb(228 228 231 / 0.5) !important;
          padding: 0 0 8px 0 !important;
          margin-bottom: 16px !important;
        }
        .dark .editor-wrapper .w-md-editor-toolbar {
          border-color: rgb(39 39 42 / 0.5) !important;
        }
        .editor-wrapper .w-md-editor-text-pre > code,
        .editor-wrapper .w-md-editor-text-input {
          font-size: 16px !important;
          line-height: 1.7 !important;
        }
        .editor-wrapper .wmde-markdown {
          background: transparent !important;
          font-size: 16px !important;
          line-height: 1.7 !important;
        }
        .editor-wrapper .w-md-editor-preview {
          background: transparent !important;
          box-shadow: inset 1px 0 0 0 rgb(228 228 231 / 0.5) !important;
        }
        .dark .editor-wrapper .w-md-editor-preview {
          box-shadow: inset 1px 0 0 0 rgb(39 39 42 / 0.5) !important;
        }
      `}</style>
    </div>
  );
}

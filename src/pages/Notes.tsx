import { useMemo, useState, useEffect, useRef } from 'react';
import { useStore, useUserData } from '../store';
import { FileText, Plus, Search, Tag, Trash2, ChevronLeft, CalendarDays, X, Check, Hash } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { format } from 'date-fns';
import { cn } from '../utils/cn';
import { AnimatePresence, motion } from 'framer-motion';

export default function Notes() {
  const { notes } = useUserData();
  const { createNote, updateNote, deleteNote } = useStore();
  const theme = useStore((s) => s.theme);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  // Extract all unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      if (note.tags) note.tags.forEach(t => tags.add(t));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // Filter notes
  const filteredNotes = useMemo(() => {
    return notes.filter(note => {
      const matchesSearch = (note.title || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (note.content || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesTag = selectedTag ? (note.tags || []).includes(selectedTag) : true;
      return matchesSearch && matchesTag;
    }).sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchQuery, selectedTag]);

  const selectedNote = notes.find(n => n.id === selectedNoteId) || null;

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteTagInput, setNewNoteTagInput] = useState('');
  const [newNoteTags, setNewNoteTags] = useState<string[]>([]);
  const newNoteTitleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isCreateModalOpen) {
      setTimeout(() => newNoteTitleInputRef.current?.focus(), 50);
    } else {
      setNewNoteTitle('');
      setNewNoteTagInput('');
      setNewNoteTags([]);
    }
  }, [isCreateModalOpen]);

  const handleCreateNoteSubmit = () => {
    const title = newNoteTitle.trim() || '未命名笔记';
    const finalTags = [...newNoteTags];
    if (newNoteTagInput.trim() && !finalTags.includes(newNoteTagInput.trim())) {
      finalTags.push(newNoteTagInput.trim());
    }
    
    const id = createNote({ title, tags: finalTags });
    setSelectedNoteId(id);
    setIsCreateModalOpen(false);
  };

  const handleAddNewNoteTag = () => {
    if (!newNoteTagInput.trim()) return;
    const tag = newNoteTagInput.trim();
    if (!newNoteTags.includes(tag)) {
      setNewNoteTags([...newNoteTags, tag]);
    }
    setNewNoteTagInput('');
  };

  const handleRemoveNewNoteTag = (tagToRemove: string) => {
    setNewNoteTags(newNoteTags.filter(t => t !== tagToRemove));
  };

  const handleRemoveNote = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (window.confirm('确定删除这条笔记吗？')) {
      deleteNote(id);
      if (selectedNoteId === id) setSelectedNoteId(null);
    }
  };

  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Sync selected note to drafts
  useEffect(() => {
    if (selectedNote) {
      setDraftTitle(selectedNote.title || '');
      setDraftContent(selectedNote.content || '');
    }
  }, [selectedNote?.id]);

  // Auto-save logic
  useEffect(() => {
    if (!selectedNote) return;
    const t = window.setTimeout(() => {
      if (draftTitle !== selectedNote.title || draftContent !== selectedNote.content) {
        updateNote(selectedNote.id, { title: draftTitle, content: draftContent });
      }
    }, 450);
    return () => window.clearTimeout(t);
  }, [draftTitle, draftContent, selectedNote?.id]);

  const handleAddTag = () => {
    if (!selectedNote || !tagInput.trim()) return;
    const newTag = tagInput.trim();
    if (!(selectedNote.tags || []).includes(newTag)) {
      updateNote(selectedNote.id, { tags: [...(selectedNote.tags || []), newTag] });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!selectedNote) return;
    updateNote(selectedNote.id, { tags: (selectedNote.tags || []).filter(t => t !== tagToRemove) });
  };

  // View: Note Editor
  if (selectedNote) {
    return (
      <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
        <header className="flex items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-4 flex-1">
            <button 
              onClick={() => setSelectedNoteId(null)}
              className="p-2 -ml-2 rounded-full text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="无标题笔记"
              className="text-2xl font-bold bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 w-full"
            />
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => handleRemoveNote(selectedNote.id)}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </header>

        <div className="mb-4 flex flex-wrap items-center gap-2 bg-white/40 dark:bg-zinc-900/30 p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/50 backdrop-blur-md">
          <Tag className="w-4 h-4 text-zinc-400" />
          {(selectedNote.tags || []).map(tag => (
            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
              {tag}
              <button onClick={() => handleRemoveTag(tag)} className="hover:text-teal-800 dark:hover:text-teal-200 ml-1">
                <Trash2 className="w-3 h-3" />
              </button>
            </span>
          ))}
          <div className="relative flex items-center flex-1 min-w-[120px]">
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder="输入标签并回车添加..."
              className="text-sm bg-transparent border-none outline-none w-full text-zinc-600 dark:text-zinc-300 placeholder:text-zinc-400"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-zinc-800/50 shadow-sm" data-color-mode={theme}>
          <MDEditor
            value={draftContent}
            onChange={(val) => setDraftContent(val || '')}
            preview="live"
            previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
            className="!rounded-[2rem] h-full overflow-hidden text-sm md:text-base flex flex-col"
            textareaProps={{ placeholder: '写下你的想法…（支持 Markdown）' }}
          />
        </div>
      </div>
    );
  }

  // View: Note List
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <AnimatePresence>
        {isCreateModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overscroll-contain">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCreateModalOpen(false)}
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
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-white truncate">新建笔记</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">为你的新想法起个名字</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="p-2 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-800/70 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="mt-6 space-y-4">
                  <div>
                    <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                      笔记标题
                    </label>
                    <input
                      ref={newNoteTitleInputRef}
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleCreateNoteSubmit();
                      }}
                      className="w-full px-4 py-3 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all text-zinc-900 dark:text-white placeholder:text-zinc-400"
                      placeholder="例如：产品需求整理"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-2 block">
                      标签 (可选)
                    </label>
                    <div className="flex flex-wrap items-center gap-2 bg-white/50 dark:bg-zinc-950/50 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-2 focus-within:ring-2 focus-within:ring-teal-500/20 focus-within:border-teal-500 transition-all">
                      {newNoteTags.map(tag => (
                        <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400">
                          {tag}
                          <button type="button" onClick={() => handleRemoveNewNoteTag(tag)} className="hover:text-teal-800 dark:hover:text-teal-200 ml-1">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                      <input
                        value={newNoteTagInput}
                        onChange={(e) => setNewNoteTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddNewNoteTag();
                          }
                        }}
                        placeholder={newNoteTags.length === 0 ? "输入标签并回车添加..." : "添加更多标签..."}
                        className="flex-1 min-w-[120px] text-sm bg-transparent border-none outline-none text-zinc-900 dark:text-white placeholder:text-zinc-400 px-2 py-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCreateModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 bg-white/50 dark:bg-zinc-950/40 backdrop-blur-md border border-zinc-200/60 dark:border-zinc-800/60 hover:bg-white/70 dark:hover:bg-zinc-950/60 transition-all"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={handleCreateNoteSubmit}
                    className="group px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      创建
                    </span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">笔记</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 flex items-center gap-2">
            随时记录灵感与知识
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="搜索笔记..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>新建笔记</span>
          </button>
        </div>
      </header>

      <div className="flex gap-4 sm:gap-6 flex-1 min-h-0 overflow-hidden flex-col">
        {/* Tags Bar */}
        <div className="w-full shrink-0 overflow-x-auto pb-2 -mb-2 no-scrollbar">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedTag(null)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0",
                selectedTag === null 
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                  : "bg-white/60 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-800/50"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>全部笔记</span>
              <span className="ml-1 text-xs opacity-60 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md">{notes.length}</span>
            </button>
            
            {allTags.map(tag => {
              const count = notes.filter(n => (n.tags || []).includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all shrink-0",
                    selectedTag === tag
                      ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/50 shadow-sm"
                      : "bg-white/60 dark:bg-zinc-900/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/80 dark:hover:bg-zinc-800/60 border border-zinc-200/50 dark:border-zinc-800/50"
                  )}
                >
                  <Hash className="w-4 h-4 opacity-70" />
                  <span>{tag}</span>
                  <span className="ml-1 text-xs opacity-60 bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded-md">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Notes Grid */}
        <div className="flex-1 overflow-y-auto pb-8 pr-2">
          {filteredNotes.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredNotes.map(note => (
                <div
                  key={note.id}
                  onClick={() => setSelectedNoteId(note.id)}
                  className="group relative flex flex-col p-5 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl border border-white/40 dark:border-zinc-800/50 rounded-[2rem] hover:shadow-xl hover:shadow-zinc-200/20 dark:hover:shadow-black/20 hover:-translate-y-1 transition-all cursor-pointer h-64"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 line-clamp-2 leading-snug">
                      {note.title || '未命名笔记'}
                    </h3>
                    <button
                      onClick={(e) => handleRemoveNote(note.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-2 -m-2 text-zinc-400 hover:text-red-500 transition-all rounded-full hover:bg-red-50 dark:hover:bg-red-500/10 shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 line-clamp-4 flex-1 leading-relaxed">
                    {(note.content || '').replace(/[#*`_>]/g, '').trim() || '（无内容）'}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-2 pt-4 border-t border-zinc-100 dark:border-zinc-800/50">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      {(note.tags || []).slice(0, 3).map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 truncate max-w-[80px]">
                          {tag}
                        </span>
                      ))}
                      {(note.tags || []).length > 3 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                          +{(note.tags || []).length - 3}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium shrink-0">
                      <CalendarDays className="w-3 h-3" />
                      {format(note.updatedAt, 'MM-dd')}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4">
              <div className="w-16 h-16 rounded-3xl bg-white/50 dark:bg-zinc-950/30 backdrop-blur-md border border-white/40 dark:border-zinc-800/50 flex items-center justify-center">
                <FileText className="w-8 h-8" />
              </div>
              <p>没有找到笔记</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

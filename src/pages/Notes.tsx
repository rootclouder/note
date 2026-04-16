import { useMemo, useState, useEffect } from 'react';
import { useStore, useUserData } from '../store';
import { FileText, Plus, Search, Tag, Trash2, ChevronLeft, CalendarDays, Hash } from 'lucide-react';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from 'rehype-sanitize';
import { format } from 'date-fns';
import { cn } from '../utils/cn';

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

  const handleCreateNote = () => {
    const id = createNote();
    setSelectedNoteId(id);
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

        <div className="flex-1 min-h-0 bg-white/60 dark:bg-zinc-900/50 backdrop-blur-2xl rounded-[2rem] border border-white/40 dark:border-zinc-800/50 overflow-hidden shadow-sm" data-color-mode={theme}>
          <MDEditor
            value={draftContent}
            onChange={(val) => setDraftContent(val || '')}
            preview="live"
            previewOptions={{ rehypePlugins: [[rehypeSanitize]] }}
            height="100%"
            className="!border-0 !shadow-none !rounded-none h-full bg-transparent"
            textareaProps={{ placeholder: '写下你的想法…（支持 Markdown）' }}
          />
        </div>
      </div>
    );
  }

  // View: Note List
  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
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
            onClick={handleCreateNote}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-teal-500 to-emerald-500 shadow-lg shadow-teal-500/20 hover:shadow-teal-500/35 hover:-translate-y-0.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>新建笔记</span>
          </button>
        </div>
      </header>

      <div className="flex gap-6 flex-1 min-h-0 overflow-hidden flex-col md:flex-row">
        {/* Tags Sidebar */}
        <div className="w-full md:w-48 lg:w-64 shrink-0 overflow-y-auto">
          <div className="sticky top-0 space-y-1">
            <button
              onClick={() => setSelectedTag(null)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all",
                selectedTag === null 
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md"
                  : "text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50"
              )}
            >
              <FileText className="w-4 h-4" />
              <span className="font-medium">全部笔记</span>
              <span className="ml-auto text-xs opacity-60">{notes.length}</span>
            </button>
            
            {allTags.length > 0 && (
              <div className="pt-4 pb-2 px-3 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                标签
              </div>
            )}
            
            {allTags.map(tag => {
              const count = notes.filter(n => (n.tags || []).includes(tag)).length;
              return (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(tag)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all",
                    selectedTag === tag
                      ? "bg-teal-50 dark:bg-teal-500/20 text-teal-700 dark:text-teal-300 font-medium"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-white/60 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <Hash className="w-4 h-4 opacity-70" />
                  <span className="truncate">{tag}</span>
                  <span className="ml-auto text-xs opacity-60">{count}</span>
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

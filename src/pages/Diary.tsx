import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useStore, Diary as DiaryType } from '../store';
import { Save, CalendarDays, Trash2, Edit3, Eye, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MDEditor from '@uiw/react-md-editor';
import rehypeSanitize from "rehype-sanitize";

const WEATHERS = ['sunny', 'cloudy', 'partlyCloudy', 'rainy', 'stormy', 'snowy'];
const MOODS = ['great', 'good', 'neutral', 'bad', 'terrible'];

const weatherEmoji: Record<string, string> = {
  sunny: '☀️', cloudy: '☁️', partlyCloudy: '⛅', rainy: '🌧️', stormy: '⛈️', snowy: '❄️'
};
const moodEmoji: Record<string, string> = {
  great: '😁', good: '🙂', neutral: '😐', bad: '🙁', terrible: '😫'
};

export default function Diary() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialDateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');

  const [currentDate, setCurrentDate] = useState(initialDateStr);
  const [isEditing, setIsEditing] = useState(true);
  
  const { diaries, saveDiary, deleteDiary } = useStore();
  const existingDiary = diaries.find(d => d.date === currentDate);

  const [content, setContent] = useState('');
  const [mood, setMood] = useState('neutral');
  const [weather, setWeather] = useState('sunny');
  const [images, setImages] = useState<string[]>([]);

  // Add a new image via URL (simulate upload)
  const handleAddImage = () => {
    const url = window.prompt('请输入图片 URL (支持外部链接或图床链接):');
    if (url && url.trim()) {
      setImages(prev => [...prev, url.trim()]);
    }
  };

  useEffect(() => {
    if (existingDiary) {
      setContent(existingDiary.content);
      setMood(existingDiary.mood);
      setWeather(existingDiary.weather);
      setImages(existingDiary.images || []);
      setIsEditing(false);
    } else {
      setContent('');
      setMood('neutral');
      setWeather('sunny');
      setImages([]);
      setIsEditing(true);
    }
  }, [currentDate, existingDiary]);

  const handleSave = () => {
    if (!content.trim() && images.length === 0) return;
    
    saveDiary({
      id: existingDiary?.id || crypto.randomUUID(),
      date: currentDate,
      content,
      mood,
      weather,
      images
    });
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (window.confirm('确定要删除这篇日记吗？')) {
      deleteDiary(currentDate);
      setContent('');
      setImages([]);
      setIsEditing(true);
    }
  };

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out max-w-4xl mx-auto w-full">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">图文日记</h1>
          <p className="text-zinc-500 text-sm mt-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {format(parseISO(currentDate), 'yyyy年M月d日 EEEE', { locale: zhCN })}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={currentDate}
            onChange={(e) => setCurrentDate(e.target.value)}
            className="px-4 py-2 bg-white border border-zinc-200 rounded-xl text-sm font-medium text-zinc-700 outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm"
          />
          {existingDiary && (
            <button
              onClick={handleDelete}
              className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
              title="删除日记"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex flex-col bg-white rounded-[2rem] shadow-sm border border-zinc-100 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-4 p-4 sm:p-6 border-b border-zinc-100 bg-zinc-50/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">心情</span>
              <div className="flex gap-1 bg-white p-1 rounded-full shadow-sm border border-zinc-100">
                {MOODS.map(m => (
                  <button
                    key={m}
                    disabled={!isEditing}
                    onClick={() => setMood(m)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                      mood === m ? 'bg-teal-50 ring-2 ring-teal-200 scale-110' : 'hover:bg-zinc-50 opacity-50 hover:opacity-100'
                    } disabled:cursor-default disabled:hover:bg-transparent`}
                  >
                    {moodEmoji[m]}
                  </button>
                ))}
              </div>
            </div>

            <div className="w-px h-8 bg-zinc-200 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">天气</span>
              <div className="flex gap-1 bg-white p-1 rounded-full shadow-sm border border-zinc-100">
                {WEATHERS.map(w => (
                  <button
                    key={w}
                    disabled={!isEditing}
                    onClick={() => setWeather(w)}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-all ${
                      weather === w ? 'bg-blue-50 ring-2 ring-blue-200 scale-110' : 'hover:bg-zinc-50 opacity-50 hover:opacity-100'
                    } disabled:cursor-default disabled:hover:bg-transparent`}
                  >
                    {weatherEmoji[w]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isEditing && (
              <button
                onClick={handleAddImage}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-white border border-zinc-200 rounded-xl hover:bg-zinc-50 transition-colors shadow-sm"
              >
                <ImageIcon className="w-4 h-4" />
                <span className="hidden sm:inline">插入图片</span>
              </button>
            )}
            <button
              onClick={() => isEditing ? handleSave() : setIsEditing(true)}
              className={`flex items-center gap-2 px-6 py-2 text-sm font-medium rounded-xl transition-all shadow-sm ${
                isEditing 
                  ? 'bg-zinc-900 text-white hover:bg-zinc-800 shadow-zinc-900/10' 
                  : 'bg-white text-zinc-700 border border-zinc-200 hover:bg-zinc-50'
              }`}
            >
              {isEditing ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              ) : (
                <>
                  <Edit3 className="w-4 h-4" />
                  <span>编辑</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 relative min-h-[500px]" data-color-mode="light">
          <AnimatePresence mode="wait">
            {isEditing ? (
              <motion.div
                key="edit"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full flex flex-col"
              >
                <div className="flex-1 h-full overflow-hidden">
                  <MDEditor
                    value={content}
                    onChange={(val) => setContent(val || '')}
                    previewOptions={{
                      rehypePlugins: [[rehypeSanitize]],
                    }}
                    height="100%"
                    className="!border-0 !shadow-none !rounded-none h-full min-h-[400px]"
                    textareaProps={{
                      placeholder: '今天发生了什么有趣的事？(支持 Markdown 格式)...'
                    }}
                  />
                </div>
                
                {images.length > 0 && (
                  <div className="flex gap-4 overflow-x-auto p-4 border-t border-zinc-100 bg-white">
                    {images.map((img, idx) => (
                      <div key={idx} className="relative group shrink-0">
                        <img src={img} alt="diary" className="h-32 w-32 object-cover rounded-2xl shadow-sm" />
                        <button
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="preview"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="h-full overflow-y-auto p-6 sm:p-8"
              >
                {content || images.length > 0 ? (
                  <div className="w-full max-w-none">
                    <MDEditor.Markdown source={content} rehypePlugins={[[rehypeSanitize]]} />
                    
                    {images.length > 0 && (
                      <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t border-zinc-100">
                        {images.map((img, idx) => (
                          <img key={idx} src={img} alt="diary" className="max-h-64 rounded-2xl shadow-sm object-cover" />
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-4 mt-20">
                    <div className="w-16 h-16 bg-zinc-50 rounded-full flex items-center justify-center">
                      <Eye className="w-8 h-8 text-zinc-300" />
                    </div>
                    <p>这天还没有日记记录</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

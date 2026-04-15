import { useState, useMemo } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Sun, Cloud, CloudRain, CloudLightning, CloudSnow, SunDim, CheckCircle2, Circle } from 'lucide-react';
import { useUserData } from '../store';
import { cn } from '../utils/cn';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const weatherIcons: Record<string, React.ReactNode> = {
  sunny: <Sun className="w-4 h-4 text-orange-500" />,
  cloudy: <Cloud className="w-4 h-4 text-zinc-400" />,
  partlyCloudy: <SunDim className="w-4 h-4 text-orange-400" />,
  rainy: <CloudRain className="w-4 h-4 text-blue-400" />,
  stormy: <CloudLightning className="w-4 h-4 text-indigo-500" />,
  snowy: <CloudSnow className="w-4 h-4 text-teal-300" />
};

const moodEmojis: Record<string, string> = {
  great: '😁',
  good: '🙂',
  neutral: '😐',
  bad: '🙁',
  terrible: '😫'
};

export default function Home() {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  
  const { todos, diaries } = useUserData();

  const days = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const dayTodos = todos.filter(t => t.date === selectedDateStr);
  const dayDiary = diaries.find(d => d.date === selectedDateStr);

  const completedTodosCount = dayTodos.filter(t => t.completed).length;
  const totalTodosCount = dayTodos.length;
  const progress = totalTodosCount === 0 ? 0 : Math.round((completedTodosCount / totalTodosCount) * 100);

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  return (
    <div className="flex flex-col lg:flex-row gap-8 sm:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out fill-mode-both">
      {/* Calendar Section */}
      <div className="flex-1 max-w-2xl">
        <div className="flex items-center justify-between mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white transition-colors">
            {format(currentDate, 'yyyy年 M月', { locale: zhCN })}
          </h1>
          <div className="flex items-center gap-2">
            <button 
              onClick={prevMonth}
              className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-zinc-800/60 backdrop-blur-md transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button 
              onClick={() => {
                setCurrentDate(new Date());
                setSelectedDate(new Date());
              }}
              className="px-4 py-2 text-sm font-medium rounded-full bg-white/60 dark:bg-zinc-800/60 backdrop-blur-md hover:bg-white/80 dark:hover:bg-zinc-700/80 transition-colors text-zinc-700 dark:text-zinc-300"
            >
              今天
            </button>
            <button 
              onClick={nextMonth}
              className="p-2 rounded-full hover:bg-white/60 dark:hover:bg-zinc-800/60 backdrop-blur-md transition-colors text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
          {['一', '二', '三', '四', '五', '六', '日'].map(day => (
            <div key={day} className="text-center text-xs font-medium text-zinc-500 dark:text-zinc-400 pb-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd');
            const hasDiary = diaries.some(d => d.date === dateStr);
            const dayTodosList = todos.filter(t => t.date === dateStr);
            const allCompleted = dayTodosList.length > 0 && dayTodosList.every(t => t.completed);
            const hasPending = dayTodosList.length > 0 && !allCompleted;
            
            const isSelected = isSameDay(day, selectedDate);
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isTodayDate = isToday(day);

            return (
              <button
                key={day.toString()}
                onClick={() => setSelectedDate(day)}
                className={cn(
                  "relative aspect-square flex flex-col items-center justify-start pt-2 sm:pt-3 rounded-2xl sm:rounded-[2rem] transition-all duration-300 backdrop-blur-md border border-white/20 dark:border-white/5",
                  !isCurrentMonth && "opacity-30",
                  isSelected 
                    ? "bg-zinc-900/90 dark:bg-white/90 text-white dark:text-zinc-900 shadow-xl shadow-zinc-900/20 dark:shadow-white/10 scale-105 z-10" 
                    : "hover:bg-white/80 dark:hover:bg-zinc-800/80 bg-white/40 dark:bg-zinc-900/40 hover:scale-105 hover:shadow-lg",
                  isTodayDate && !isSelected && "text-teal-600 dark:text-teal-400 font-bold bg-teal-50/60 dark:bg-teal-900/30"
                )}
              >
                <span className={cn(
                  "text-sm sm:text-lg",
                  isTodayDate && !isSelected ? "font-bold" : "font-medium"
                )}>
                  {format(day, 'd')}
                </span>
                
                <div className="absolute bottom-2 sm:bottom-4 flex gap-1 items-center">
                  {hasDiary && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-teal-400" : "bg-teal-500"
                    )} />
                  )}
                  {allCompleted && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-emerald-400" : "bg-emerald-500"
                    )} />
                  )}
                  {hasPending && (
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full",
                      isSelected ? "bg-orange-400" : "bg-orange-500"
                    )} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Details Section */}
      <div className="w-full lg:w-80 flex flex-col gap-6 pt-2 lg:pt-16">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedDateStr}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6"
          >
            <div className="flex items-end justify-between border-b border-zinc-200 dark:border-zinc-800 pb-4">
              <div>
                <h2 className="text-2xl font-bold text-zinc-800 dark:text-zinc-100">
                  {format(selectedDate, 'M月d日')}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1">
                  {format(selectedDate, 'EEEE', { locale: zhCN })}
                </p>
              </div>
              
              {dayDiary && (
                <div className="flex items-center gap-3 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md px-3 py-1.5 rounded-full shadow-sm border border-zinc-100 dark:border-zinc-800">
                  <span className="text-xl" title="心情">{moodEmojis[dayDiary.mood] || moodEmojis.neutral}</span>
                  <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700" />
                  <span title="天气">{weatherIcons[dayDiary.weather] || weatherIcons.sunny}</span>
                </div>
              )}
            </div>

            {/* Diary Snippet */}
            <div 
              onClick={() => navigate(`/diary?date=${selectedDateStr}`)}
              className="group cursor-pointer bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-sm border border-white/40 dark:border-zinc-800/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-teal-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 mb-2 flex items-center justify-between">
                日记
                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors" />
              </h3>
              {dayDiary ? (
                <p className="text-zinc-600 dark:text-zinc-400 text-sm line-clamp-3 leading-relaxed">
                  {dayDiary.content.replace(/[#*`_>]/g, '').trim() || '（无文本内容）'}
                </p>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-600 text-sm italic">今天还没有记录日记，去写一篇吧？</p>
              )}
            </div>

            {/* Todo Snippet */}
            <div 
              onClick={() => navigate(`/todo?date=${selectedDateStr}`)}
              className="group cursor-pointer bg-zinc-900/80 dark:bg-zinc-800/60 backdrop-blur-xl rounded-[2rem] p-6 shadow-lg shadow-zinc-900/10 dark:shadow-black/20 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 relative overflow-hidden border border-zinc-800 dark:border-zinc-700/50"
            >
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/5 dark:bg-white/5 rounded-full blur-2xl" />
              
              <h3 className="font-medium text-white dark:text-zinc-100 mb-4 flex items-center justify-between">
                待办事项
                <ChevronRight className="w-4 h-4 text-zinc-400 dark:text-zinc-500 group-hover:text-white dark:group-hover:text-zinc-300 transition-colors" />
              </h3>
              
              {totalTodosCount > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-400 dark:text-zinc-400">完成进度</span>
                    <span className="text-white dark:text-zinc-100 font-medium">{progress}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/10 dark:bg-black/20 rounded-full overflow-hidden backdrop-blur-sm">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full" 
                    />
                  </div>
                  
                  <div className="pt-2 space-y-2">
                    {dayTodos.slice(0, 3).map(todo => (
                      <div key={todo.id} className="flex items-start gap-2 text-sm">
                        {todo.completed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0 mt-0.5" />
                        )}
                        <span className={cn(
                          "line-clamp-1",
                          todo.completed ? "text-zinc-500 dark:text-zinc-500 line-through" : "text-zinc-200 dark:text-zinc-200"
                        )}>
                          {todo.title}
                        </span>
                      </div>
                    ))}
                    {totalTodosCount > 3 && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 pl-6">还有 {totalTodosCount - 3} 项...</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-zinc-400 dark:text-zinc-400 text-sm">今天没有待办事项，享受轻松的一天吧！</p>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

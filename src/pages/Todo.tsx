import { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { format, parseISO, subDays, addDays, isToday } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { GripVertical, Trash2, CalendarDays, CheckCircle2, Circle, ArrowRight, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useStore, Quadrant, Todo as TodoType } from '../store';
import { cn } from '../utils/cn';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, AnimatePresence } from 'framer-motion';

const quadrants: { id: Quadrant; title: string; color: string }[] = [
  { id: 'q1', title: '重要 · 紧急', color: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-900/50 text-orange-900 dark:text-orange-200' },
  { id: 'q2', title: '重要 · 不紧急', color: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-900/50 text-teal-900 dark:text-teal-200' },
  { id: 'q3', title: '不重要 · 紧急', color: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 text-blue-900 dark:text-blue-200' },
  { id: 'q4', title: '不重要 · 不紧急', color: 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-300' }
];

function SortableTodoItem({ todo }: { todo: TodoType }) {
  const { updateTodo, deleteTodo, postponeTodo } = useStore();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-center gap-3 p-3 bg-white dark:bg-zinc-950 rounded-xl shadow-sm border border-zinc-100 dark:border-zinc-800 mb-2 transition-all relative z-10",
        isDragging && "opacity-50 shadow-md z-50",
        todo.completed && "opacity-60"
      )}
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-zinc-300 hover:text-zinc-500">
        <GripVertical className="w-4 h-4" />
      </button>
      
      <button 
        onClick={(e) => { e.stopPropagation(); updateTodo(todo.id, { completed: !todo.completed }); }}
        className="text-zinc-400 hover:text-teal-500 transition-colors"
      >
        {todo.completed ? <CheckCircle2 className="w-5 h-5 text-teal-500" /> : <Circle className="w-5 h-5" />}
      </button>
      
      <input
        type="text"
        value={todo.title}
        onChange={(e) => updateTodo(todo.id, { title: e.target.value })}
        className={cn(
          "flex-1 text-sm outline-none bg-transparent transition-colors",
          todo.completed ? "line-through text-zinc-400 dark:text-zinc-600" : "text-zinc-700 dark:text-zinc-200"
        )}
      />
      
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button 
          onClick={(e) => { e.stopPropagation(); postponeTodo(todo.id); }}
          className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
          title="延期至明天"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button 
          onClick={(e) => { e.stopPropagation(); deleteTodo(todo.id); }}
          className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          title="删除"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function Todo() {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialDateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
  
  const [currentDate, setCurrentDate] = useState(initialDateStr);
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { todos, addTodo, moveTodo } = useStore();

  const dayTodos = todos.filter(t => t.date === currentDate);
  
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return todos.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 10);
  }, [searchQuery, todos]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (quadrants.some(q => q.id === overId)) {
      moveTodo(activeId as string, overId as Quadrant);
      return;
    }

    const activeTodo = dayTodos.find(t => t.id === activeId);
    const overTodo = dayTodos.find(t => t.id === overId);

    if (activeTodo && overTodo && activeTodo.quadrant !== overTodo.quadrant) {
      moveTodo(activeId as string, overTodo.quadrant);
    }
  };

  const handleQuadrantClick = (quadrantId: Quadrant, e: React.MouseEvent) => {
    // Only add if clicking the quadrant container itself, not the items
    if (e.target === e.currentTarget) {
      addTodo({
        title: '',
        quadrant: quadrantId,
        date: currentDate,
        completed: false
      });
    }
  };

  const prevDay = () => setCurrentDate(format(subDays(parseISO(currentDate), 1), 'yyyy-MM-dd'));
  const nextDay = () => setCurrentDate(format(addDays(parseISO(currentDate), 1), 'yyyy-MM-dd'));
  const today = () => setCurrentDate(format(new Date(), 'yyyy-MM-dd'));

  return (
    <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">四象限待办</h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm mt-1 flex items-center gap-2">
            <CalendarDays className="w-4 h-4" />
            {format(parseISO(currentDate), 'yyyy年M月d日 EEEE', { locale: zhCN })}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          {/* Search Box */}
          <div ref={searchRef} className="relative w-full sm:w-64 z-50">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input
                type="text"
                placeholder="搜索所有待办..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                onFocus={() => setIsSearchOpen(true)}
                className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 text-zinc-900 dark:text-zinc-100"
              />
            </div>
            
            <AnimatePresence>
              {isSearchOpen && searchQuery.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full mt-2 w-full sm:w-80 right-0 bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-100 dark:border-zinc-800 overflow-hidden"
                >
                  {searchResults.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto p-2">
                      {searchResults.map(todo => (
                        <button
                          key={todo.id}
                          onClick={() => {
                            setCurrentDate(todo.date);
                            setIsSearchOpen(false);
                            setSearchQuery('');
                          }}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors flex flex-col gap-1"
                        >
                          <span className={cn("text-sm font-medium", todo.completed ? "line-through text-zinc-400 dark:text-zinc-600" : "text-zinc-700 dark:text-zinc-200")}>
                            {todo.title || '（未命名任务）'}
                          </span>
                          <span className="text-xs text-zinc-400 dark:text-zinc-500">
                            {format(parseISO(todo.date), 'yyyy年M月d日')} · {quadrants.find(q => q.id === todo.quadrant)?.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      未找到相关待办
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Calendar Navigation */}
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-1 rounded-full shadow-sm">
            <button 
              onClick={prevDay}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"
              title="上一天"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={today}
              className={cn(
                "px-4 py-1.5 text-sm font-medium rounded-full transition-colors",
                isToday(parseISO(currentDate)) ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md shadow-zinc-900/10 dark:shadow-white/10" : "hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
              )}
            >
              今天
            </button>
            <button 
              onClick={nextDay}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500 dark:text-zinc-400"
              title="下一天"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
          {quadrants.map((quadrant) => {
            const quadrantTodos = dayTodos.filter(t => t.quadrant === quadrant.id);
            return (
              <div 
                key={quadrant.id} 
                id={quadrant.id}
                onClick={(e) => handleQuadrantClick(quadrant.id, e)}
                className={cn(
                  "flex flex-col rounded-[2rem] p-6 border transition-all duration-300 cursor-text",
                  quadrant.color,
                  activeId && !quadrantTodos.find(t => t.id === activeId) && "opacity-70 scale-[0.98]"
                )}
              >
                <div className="flex items-center justify-between mb-4 pointer-events-none">
                  <h2 className="font-bold tracking-wide">{quadrant.title}</h2>
                </div>
                
                <SortableContext items={quadrantTodos.map(t => t.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex-1 min-h-[150px] pointer-events-none">
                    <AnimatePresence>
                      {quadrantTodos.length === 0 && (
                        <motion.div 
                          key={`empty-${quadrant.id}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex items-center justify-center text-sm opacity-50 italic pointer-events-none"
                        >
                          点击空白处新增待办
                        </motion.div>
                      )}
                      <div className="pointer-events-auto">
                        {quadrantTodos.map(todo => (
                          <SortableTodoItem key={todo.id} todo={todo} />
                        ))}
                      </div>
                    </AnimatePresence>
                  </div>
                </SortableContext>
              </div>
            );
          })}
        </div>
      </DndContext>
    </div>
  );
}

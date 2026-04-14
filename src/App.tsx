import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { CalendarDays, LayoutGrid, BookOpen, Sun, Moon } from 'lucide-react';
import Home from './pages/Home';
import Todo from './pages/Todo';
import Diary from './pages/Diary';
import Welcome from './pages/Welcome';
import { cn } from './utils/cn';
import { useStore } from './store';
import { useTheme } from './hooks/useTheme';
import { AnimatePresence, motion } from 'framer-motion';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-12 rounded-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
      aria-label="Toggle Theme"
    >
      <motion.div
        className="absolute top-0 left-0 w-12 h-24 origin-center"
        animate={{ rotate: theme === 'dark' ? 180 : 0 }}
        transition={{ type: "spring", stiffness: 80, damping: 15 }}
      >
        {/* Sun is on the top half (visible when rotate=0) */}
        <div className="absolute top-0 w-12 h-12 flex items-center justify-center">
          <Sun className="w-5 h-5 text-orange-500" />
        </div>
        {/* Moon is on the bottom half, upside down (visible when rotate=180) */}
        <div className="absolute bottom-0 w-12 h-12 flex items-center justify-center rotate-180">
          <Moon className="w-5 h-5 text-indigo-400" />
        </div>
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-transparent to-white/10 dark:to-white/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </button>
  );
}

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: CalendarDays, label: '日历' },
    { path: '/todo', icon: LayoutGrid, label: '待办' },
    { path: '/diary', icon: BookOpen, label: '日记' },
  ];

  if (location.pathname === '/welcome') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:top-0 sm:bottom-auto sm:left-auto sm:right-auto sm:w-64 sm:h-screen bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-t sm:border-t-0 sm:border-r border-zinc-100 dark:border-zinc-800 p-4 z-50 transition-colors duration-500">
      <div className="flex sm:flex-col justify-around sm:justify-start gap-2 h-full sm:pt-8">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-md shadow-zinc-900/10 dark:shadow-white/10" 
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-900 hover:text-zinc-900 dark:hover:text-zinc-100"
              )}
            >
              <Icon className={cn(
                "w-5 h-5 transition-transform duration-300",
                isActive ? "scale-110" : "group-hover:scale-110"
              )} />
              <span className="text-[10px] sm:text-sm font-medium">{label}</span>
            </Link>
          );
        })}

        <div className="hidden sm:flex mt-auto pt-8 items-center justify-center">
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}

function App() {
  const { hasSeenWelcome } = useStore();
  useTheme(); // Initialize theme

  return (
    <Router>
      <div className="min-h-screen bg-[#fafafa] dark:bg-zinc-950 font-sans text-zinc-900 dark:text-zinc-100 selection:bg-teal-200/50 dark:selection:bg-teal-900/50 transition-colors duration-700">
        <Navigation />
        
        <main className="pb-24 sm:pb-0 sm:pl-64 min-h-screen flex flex-col relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-teal-50/50 dark:from-teal-900/20 to-transparent -z-10 transition-colors duration-700" />
          
          {/* Mobile Theme Toggle */}
          <div className="sm:hidden fixed top-4 right-4 z-50">
            <Routes>
              <Route path="/welcome" element={null} />
              <Route path="*" element={<ThemeToggle />} />
            </Routes>
          </div>

          <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 md:p-12">
            <Routes>
              <Route path="/welcome" element={<Welcome />} />
              <Route path="/" element={hasSeenWelcome ? <Home /> : <Navigate to="/welcome" replace />} />
              <Route path="/todo" element={hasSeenWelcome ? <Todo /> : <Navigate to="/welcome" replace />} />
              <Route path="/diary" element={hasSeenWelcome ? <Diary /> : <Navigate to="/welcome" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;

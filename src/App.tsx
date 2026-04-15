import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { CalendarDays, LayoutGrid, BookOpen, Sun, Moon, LogOut, FileText } from 'lucide-react';
import Home from './pages/Home';
import Todo from './pages/Todo';
import Diary from './pages/Diary';
import Notes from './pages/Notes';
import Welcome from './pages/Welcome';
import { cn } from './utils/cn';
import { useStore } from './store';
import { useTheme } from './hooks/useTheme';
import { motion } from 'framer-motion';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="relative w-12 h-12 rounded-full bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 shadow-sm overflow-hidden group hover:shadow-md transition-shadow"
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
  const { currentUser, logout, setHasSeenWelcome } = useStore();

  const navItems = [
    { path: '/', icon: CalendarDays, label: '日历' },
    { path: '/todo', icon: LayoutGrid, label: '待办' },
    { path: '/diary', icon: BookOpen, label: '日记' },
    { path: '/notes', icon: FileText, label: '笔记' },
  ];

  if (location.pathname === '/welcome') return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:top-0 sm:bottom-auto sm:left-auto sm:right-auto sm:w-64 sm:h-screen bg-white/60 dark:bg-black/60 backdrop-blur-xl border-t sm:border-t-0 sm:border-r border-zinc-200/50 dark:border-zinc-800/50 p-4 z-50 transition-colors duration-500">
      <div className="flex sm:flex-col justify-around sm:justify-start gap-2 h-full sm:pt-8 relative">
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-zinc-900/90 dark:bg-white/90 text-white dark:text-black shadow-lg shadow-zinc-900/20 dark:shadow-white/10" 
                  : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100/80 dark:hover:bg-zinc-900/80 hover:text-zinc-900 dark:hover:text-white"
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

        <div className="hidden sm:flex mt-auto pt-8 items-center justify-center flex-col gap-4">
          <ThemeToggle />
          
          {currentUser && (
            <button
              onClick={() => {
                logout();
                setHasSeenWelcome(false);
                window.location.href = '/welcome';
              }}
              className="flex items-center gap-2 px-4 py-2 mt-4 text-sm font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 rounded-xl transition-colors"
              title="退出登录"
            >
              <LogOut className="w-4 h-4" />
              <span>退出 ({currentUser})</span>
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

function MainLayout() {
  const { hasSeenWelcome, currentUser, logout, setHasSeenWelcome } = useStore();
  const location = useLocation();
  const isWelcome = location.pathname === '/welcome';
  const isNotes = location.pathname === '/notes';

  return (
    <div className="min-h-screen font-sans text-zinc-900 dark:text-zinc-100 selection:bg-teal-200/50 dark:selection:bg-teal-900/50 transition-colors duration-700 bg-transparent">
      <Navigation />
      
      <main className={cn(
        "min-h-screen flex flex-col relative overflow-hidden bg-transparent transition-all duration-500",
        !isWelcome && "pb-24 sm:pb-0 sm:pl-64"
      )}>
        {/* Subtle background decoration */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-teal-50/50 dark:from-teal-900/10 to-transparent -z-10 transition-colors duration-700" />
        
        {/* Mobile Header Elements */}
        {!isWelcome && (
          <div className="sm:hidden fixed top-4 right-4 z-50 flex items-center gap-2">
            {currentUser && (
              <button
                onClick={() => {
                  logout();
                  setHasSeenWelcome(false);
                  window.location.href = '/welcome';
                }}
                className="flex items-center justify-center w-12 h-12 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-800/50 rounded-full shadow-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                title="退出登录"
              >
                <LogOut className="w-5 h-5" />
              </button>
            )}
            <ThemeToggle />
          </div>
        )}

        <div className={cn(
          "flex-1 w-full mx-auto p-4 sm:p-8 md:p-12 relative z-10 flex flex-col",
          isNotes ? "max-w-7xl" : "max-w-5xl"
        )}>
          <Routes>
            <Route path="/welcome" element={<Welcome />} />
            <Route path="/" element={hasSeenWelcome ? <Home /> : <Navigate to="/welcome" replace />} />
            <Route path="/todo" element={hasSeenWelcome ? <Todo /> : <Navigate to="/welcome" replace />} />
            <Route path="/diary" element={hasSeenWelcome ? <Diary /> : <Navigate to="/welcome" replace />} />
            <Route path="/notes" element={hasSeenWelcome ? <Notes /> : <Navigate to="/welcome" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

function App() {
  const { theme } = useTheme();

  return (
    <Router>
      {/* Background layer with noise and deep gradient */}
      <div className="fixed inset-0 pointer-events-none -z-30 overflow-hidden bg-zinc-50 dark:bg-black transition-colors duration-1000">
        <motion.div 
          initial={false}
          animate={{ 
            rotate: theme === 'dark' ? 180 : 0,
            scale: theme === 'dark' ? 1.1 : 1,
            opacity: theme === 'dark' ? 1 : 0.6
          }}
          transition={{ type: "spring", stiffness: 40, damping: 30 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150vw] h-[150vw] rounded-full blur-[120px] mix-blend-normal"
          style={{
            background: theme === 'dark' 
              ? 'conic-gradient(from 180deg at 50% 50%, #000000 0deg, #0a0a0a 180deg, #000000 360deg)' 
              : 'conic-gradient(from 0deg at 50% 50%, #f4f4f5 0deg, #ffffff 180deg, #f4f4f5 360deg)'
          }}
        />
        {/* Decorative rotating accent lights */}
        <motion.div 
          animate={{ 
            rotate: theme === 'dark' ? -90 : 90,
            opacity: theme === 'dark' ? 0.4 : 0.1
          }}
          transition={{ type: "spring", stiffness: 30, damping: 40 }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[100vw] h-[100vw] rounded-full blur-[100px] pointer-events-none mix-blend-screen dark:mix-blend-color-dodge"
          style={{
            background: 'linear-gradient(to right, rgba(45, 212, 191, 0.5), transparent, rgba(52, 211, 153, 0.5))'
          }}
        />
      </div>
      <MainLayout />
    </Router>
  );
}

export default App;

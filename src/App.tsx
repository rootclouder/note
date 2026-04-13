import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { CalendarDays, LayoutGrid, BookOpen } from 'lucide-react';
import Home from './pages/Home';
import Todo from './pages/Todo';
import Diary from './pages/Diary';
import { cn } from './utils/cn';

function Navigation() {
  const location = useLocation();
  const navItems = [
    { path: '/', icon: CalendarDays, label: '日历' },
    { path: '/todo', icon: LayoutGrid, label: '待办' },
    { path: '/diary', icon: BookOpen, label: '日记' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 sm:top-0 sm:bottom-auto sm:left-auto sm:right-auto sm:w-64 sm:h-screen bg-white/80 backdrop-blur-md border-t sm:border-t-0 sm:border-r border-zinc-100 p-4 z-50">
      <div className="flex sm:flex-col justify-around sm:justify-start gap-2 h-full">
        <div className="hidden sm:block h-8 mb-8"></div>
        
        {navItems.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className={cn(
                "flex flex-col sm:flex-row items-center gap-1 sm:gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group",
                isActive 
                  ? "bg-zinc-900 text-white shadow-md shadow-zinc-900/10" 
                  : "text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
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
      </div>
    </nav>
  );
}

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#fafafa] font-sans text-zinc-900 selection:bg-teal-200/50">
        <Navigation />
        <main className="pb-24 sm:pb-0 sm:pl-64 min-h-screen flex flex-col relative overflow-hidden">
          {/* Subtle background decoration */}
          <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-teal-50/50 to-transparent -z-10" />
          <div className="flex-1 w-full max-w-5xl mx-auto p-4 sm:p-8 md:p-12">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/todo" element={<Todo />} />
              <Route path="/diary" element={<Diary />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;

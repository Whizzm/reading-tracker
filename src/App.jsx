// Enhanced UI with Lucide Icons, Full Dark Theme, and Reading Tracker
import { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Plus, Book, Trophy, Star, LogIn, NotebookPen, CalendarDays, LineChart, PercentCircle, FileText } from "lucide-react";

const initial_xp_per_page = 2.0;
const bonus_xp = 5;
const decay_rate = 0.95;

const levelThreshold = [0];
const base = 100;
for (let i = 1; i <= 50; i++) {
  levelThreshold.push(Math.floor(levelThreshold[i - 1] + base * Math.pow(1.15, i - 1)));
}

const badges = [
  { name: "Newbie", color: "bg-indigo-600", icon: <Star className='w-4 h-4 mr-1' /> },
  { name: "Curious Reader", color: "bg-purple-600", icon: <Book className='w-4 h-4 mr-1' /> },
  { name: "Investigator", color: "bg-pink-600", icon: <NotebookPen className='w-4 h-4 mr-1' /> },
  { name: "Page Turner", color: "bg-rose-600", icon: <LogIn className='w-4 h-4 mr-1' /> },
  { name: "Literary Hero", color: "bg-yellow-600", icon: <Trophy className='w-4 h-4 mr-1' /> },
  { name: "Scholar", color: "bg-green-600", icon: <CalendarDays className='w-4 h-4 mr-1' /> },
  { name: "Page Sage", color: "bg-teal-600", icon: <LineChart className='w-4 h-4 mr-1' /> },
  { name: "Wisdom Walker", color: "bg-blue-600", icon: <PercentCircle className='w-4 h-4 mr-1' /> },
  { name: "Knowledge Knight", color: "bg-cyan-600", icon: <FileText className='w-4 h-4 mr-1' /> },
  { name: "Book Baron", color: "bg-red-600", icon: <Book className='w-4 h-4 mr-1' /> }
];
const levelGoals = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30];
const milestoneBadges = {
  7: "📅 7-Day Streaker",
  14: "🔥 Two-Week Flame",
  21: "🏅 Three Weeks Strong",
  30: "🎯 One-Month Master"
};

export default function ReadingTracker() {
  const [warning, setWarning] = useState("");
  const [books, setBooks] = useState([]);
  const apiUrl = "https://script.google.com/macros/s/AKfycbyYpummRayhLtFTfYAzoIs0YfA0eY3qsQLamKiwYAAxdFiqKxzuBib4gfVMUBH13oO_/exec";
  const [selectedBook, setSelectedBook] = useState("");
  const [bookInput, setBookInput] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [lastPage, setLastPage] = useState("");
  const [prestige, setPrestige] = useState(1);

  const book = books.find(b => b.title === selectedBook);
  const totalXP = books.reduce((sum, b) => sum + (b.xp || 0), 0);
  let level = levelThreshold.findIndex((threshold, i) => totalXP < levelThreshold[i + 1]);
  level = level === -1 ? 50 : level;
  const nextLevelXP = levelThreshold[level + 1] || Infinity;

  useEffect(() => {
    // Load from Google Sheets on start
    fetch(apiUrl)
      .then(res => res.json())
      .then(data => {
        const grouped = {};
        data.forEach(entry => {
          if (!grouped[entry.book]) grouped[entry.book] = { title: entry.book, totalPages: 300, pagesRead: 0, xp: 0, streak: 0, log: [], lastReadDate: null };
          grouped[entry.book].log.push({ date: entry.date, pages: Number(entry.pages) });
          grouped[entry.book].pagesRead += Number(entry.pages);
          grouped[entry.book].xp += Number(entry.xp);
          grouped[entry.book].streak = Number(entry.streak);
          grouped[entry.book].lastReadDate = entry.date;
        });
        setBooks(Object.values(grouped));
      });
    if (level === 50 && totalXP >= nextLevelXP) {
      setPrestige(prev => prev + 1);
      const resetBooks = books.map(b => ({ ...b, xp: 0 }));
      setBooks(resetBooks);
    }
  }, [totalXP]);

  const dailyGoal = levelGoals[level] || levelGoals[levelGoals.length - 1];
  const today = new Date().toDateString();
  const todayLog = book?.log?.find(entry => entry.date === today);
  const remainingPagesToday = Math.max(0, dailyGoal - (todayLog ? todayLog.pages : 0));
  const currentLevelXP = levelThreshold[level];
  const progress = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;
  const globalStreak = Math.max(...books.map(b => b.streak || 0), 0);
  const milestoneBadge = globalStreak ? milestoneBadges[globalStreak] : null;

  const getStreakMultiplier = (streak) => {
    if (streak >= 30) return 1.25;
    if (streak >= 14) return 1.15;
    if (streak >= 7) return 1.10;
    if (streak >= 3) return 1.05;
    return 1;
  };

  const handleRead = () => {
    setWarning("");
    const pageNum = parseInt(lastPage, 10);
    const pages = pageNum - book.pagesRead;
    if (!book || isNaN(pages) || pageNum < book.pagesRead || pageNum > book.totalPages) {
      setWarning(`❗ Invalid page number. Please enter a value between ${book?.pagesRead} and ${book?.totalPages}.`);
      return;
    }
    if (!book || isNaN(pages) || pageNum < book.pagesRead || pageNum > book.totalPages) return;
    if (book && !isNaN(pages) && pages > 0) {
      const alreadyLogged = todayLog;
      const updatedLog = alreadyLogged
        ? book.log.map(entry => entry.date === today ? { ...entry, pages: entry.pages + pages } : entry)
        : [...book.log, { date: today, pages }];

      const newPagesRead = book.pagesRead + pages;
      const xp_per_page = initial_xp_per_page * Math.pow(decay_rate, level);
      const effectivePages = Math.min(newPagesRead, book.totalPages) - book.pagesRead;
      const streakMultiplier = getStreakMultiplier(book.streak);
      let gainedXP = (effectivePages * xp_per_page + bonus_xp) * streakMultiplier;

      const prevDate = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString();
      const newStreak = book.lastReadDate === prevDate ? book.streak + 1 : book.lastReadDate !== today ? 1 : book.streak;

      const updatedBooks = books.map(b =>
        b.title === book.title
          ? { ...b, pagesRead: Math.min(newPagesRead, b.totalPages), xp: b.xp + gainedXP, log: updatedLog, streak: newStreak, lastReadDate: today }
          : b
      );

      const recalculated = updatedBooks.map(b => {
  if (b.title !== book.title) return b;
  const newPagesRead = b.log.reduce((sum, entry) => sum + entry.pages, 0);
  const lastEntry = b.log.at(-1)?.date || null;
  const sortedLog = [...b.log].sort((a, b) => new Date(a.date) - new Date(b.date));
  let streak = 0;
  for (let i = sortedLog.length - 1; i >= 0; i--) {
    const current = new Date(sortedLog[i].date);
    const expected = new Date(); expected.setDate(expected.getDate() - (sortedLog.length - 1 - i));
    if (current.toDateString() === expected.toDateString()) streak++;
    else break;
  }
  const xp_per_page = initial_xp_per_page * Math.pow(decay_rate, level);
  const streakMultiplier = getStreakMultiplier(streak);
  const xp = b.log.reduce((sum, entry) => sum + entry.pages * xp_per_page + bonus_xp, 0) * streakMultiplier;
  return { ...b, pagesRead: newPagesRead, xp, streak, lastReadDate: lastEntry };
});
setBooks(recalculated);

      // Send data to Google Sheets
      const lastEntry = recalculated.find(b => b.title === book.title)?.log?.at(-1);
      if (lastEntry) {
        fetch(apiUrl, {
          method: 'POST',
          body: JSON.stringify({
            date: lastEntry.date,
            book: book.title,
            pages: lastEntry.pages,
            xp: parseFloat((effectivePages * xp_per_page + bonus_xp).toFixed(1)),
            streak: newStreak
          }),
          headers: {
            'Content-Type': 'application/json'
          }
        }).then(res => res.text()).then(console.log).catch(console.error);
      }
      setLastPage("");
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto bg-zinc-900 text-white">
      <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
        <Book className="w-6 h-6" /> Reading Tracker
      </h1>
      <p className="text-center text-sm text-gray-400 flex items-center justify-center gap-2">
        <Trophy className="w-4 h-4" /> Prestige {prestige} • <Star className="w-4 h-4" /> Level {level} ({Math.floor(totalXP)} / {nextLevelXP} XP)
      </p>
      <Progress value={progress} className="h-4 w-3/4 mx-auto rounded-full shadow-sm bg-gray-500 border-2 border-zinc-400 ring-1 ring-zinc-700 ring-offset-2 ring-offset-zinc-900">
  <div className="bg-gradient-to-r from-green-400 via-yellow-400 to-red-500 h-full rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
</Progress>

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-gray-400" />
          <Select value={selectedBook} onValueChange={setSelectedBook}>
            <SelectTrigger className="w-full bg-zinc-800 text-white border border-zinc-700">
              <SelectValue placeholder="Select Book" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-800 text-white border-zinc-700">
              {books.map((b, i) => (
                <SelectItem key={i} value={b.title} className="hover:bg-zinc-700">{b.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="border-zinc-700 text-white hover:bg-zinc-800 bg-zinc-800" onClick={() => {
            const pages = parseInt(pageInput, 10);
            if (bookInput && !isNaN(pages)) {
              const newBook = { title: bookInput, totalPages: pages, pagesRead: 0, log: [], xp: 0, streak: 0, lastReadDate: null };
              setBooks([...books, newBook]);
              setSelectedBook(bookInput);
              setBookInput("");
              setPageInput("");
            }
          }}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Input className="bg-zinc-800 text-white border-zinc-700" placeholder="Book Title" value={bookInput} onChange={(e) => setBookInput(e.target.value)} />
          <Input className="bg-zinc-800 text-white border-zinc-700" placeholder="Total Pages" type="number" value={pageInput} onChange={(e) => setPageInput(e.target.value)} />
        </div>
      </div>

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-3 bg-zinc-800 border border-zinc-700">
          <TabsTrigger value="today" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white">Today's Reading</TabsTrigger>
          <TabsTrigger value="progress" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white">Progress & Rewards</TabsTrigger>
        <TabsTrigger value="log" className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white">Edit Log</TabsTrigger>
</TabsList>

        <TabsContent value="today">
          {book ? (
            <Card className="bg-zinc-800 text-white border-zinc-700">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <NotebookPen className="w-5 h-5" /> Today's Reading
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={lastPage} onChange={(e) => setLastPage(e.target.value)}
                    placeholder="Page number you finished on (e.g., 87)"
                    className="w-full bg-zinc-900 text-white border-zinc-700"
                  />
                  <Button className="border-zinc-700 text-white hover:bg-zinc-700" onClick={handleRead}><LogIn className="w-4 h-4" /></Button>
                </div>
                <div className="text-xs text-gray-400">
  Goal: {dailyGoal} pages • Remaining: {remainingPagesToday} pages
</div>
{warning && (
  <div className="text-xs text-red-400">
    {warning}
  </div>
)}
                <div className="text-xs text-green-400">
  🔥 Global Streak: {globalStreak} day(s) {milestoneBadge ? `- ${milestoneBadge}` : ''}
</div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-center text-muted mt-4">
              📘 Please select or add a book to start logging your reading.
            </div>
          )}
        </TabsContent>

<TabsContent value="log">
  {book?.log?.length ? (
    <Card className="bg-zinc-800 text-white border-zinc-700">
      <CardContent className="p-4 space-y-3">
        <div className="text-lg font-semibold flex items-center gap-2">
          <FileText className="w-5 h-5" /> Edit Reading Log
        </div>
        <div className="space-y-2 text-sm">
          {[...book.log].sort((a, b) => new Date(a.date) - new Date(b.date)).map((entry, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-32 text-gray-400">{entry.date}</div>
              <Input
                type="number"
                value={entry.pages}
                onChange={(e) => {
                  const newPages = parseInt(e.target.value, 10);
                  if (!isNaN(newPages)) {
                    const updatedLog = book.log.map((logEntry, i) => i === idx ? { ...logEntry, pages: newPages } : logEntry);
                    const updatedBooks = books.map(b =>
                      b.title === book.title ? { ...b, log: updatedLog } : b
                    );
                    setBooks(updatedBooks);
                  }
                }}
                className="w-20 bg-zinc-900 text-white border-zinc-700"
              />
              <Button
                size="sm"
                variant="outline"
                className="text-red-400 border-red-400 hover:bg-red-500 hover:text-white"
                onClick={() => {
                  const updatedLog = book.log.filter((_, i) => i !== idx);
                  const updatedBooks = books.map(b =>
                    b.title === book.title ? { ...b, log: updatedLog } : b
                  );
                  setBooks(updatedBooks);
                }}
              >
                Delete
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  ) : (
    <div className="text-sm text-center text-muted mt-4">No entries to edit yet.</div>
  )}
</TabsContent>

<TabsContent value="progress">
          {book ? (
            <Card className="bg-zinc-800 text-white border-zinc-700">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center gap-2 text-lg font-semibold">
                  <LineChart className="w-5 h-5" /> Reading Insights
                </div>
                <div className="text-sm"><FileText className="inline w-4 h-4 mr-1" /> Total Pages Logged: {book?.log?.reduce((sum, entry) => sum + entry.pages, 0) || 0}</div>
                <div className="text-sm"><CalendarDays className="inline w-4 h-4 mr-1" /> Avg Pages/Day: {(book?.log?.length ? (book.log.reduce((sum, entry) => sum + entry.pages, 0) / book.log.length).toFixed(1) : 0)}</div>
                <div className="text-sm"><PercentCircle className="inline w-4 h-4 mr-1" /> Completion: {((book?.pagesRead / book?.totalPages) * 100 || 0).toFixed(1)}%</div>
                <div className="text-sm"><Book className="inline w-4 h-4 mr-1" /> Remaining in Book: {Math.max(0, (book?.totalPages || 0) - (book?.pagesRead || 0))}</div>
              </CardContent>
            </Card>
          ) : (
            <div className="text-sm text-center text-muted mt-4">
              📊 No book selected to show progress.
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Card className="bg-zinc-800 text-white border-zinc-700">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between text-lg font-semibold">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" /> Badges
            </div>
            <div className="text-sm text-gray-400 font-normal cursor-pointer" onClick={() => alert(`${(() => {
  const unlocked = badges.slice(0, level + 1).length + Object.entries(milestoneBadges).filter(([d]) => book?.streak >= parseInt(d)).length;
  const total = badges.length + Object.keys(milestoneBadges).length;
  const remaining = total - unlocked;
  return `${remaining} badge(s) remaining to unlock.`;
})()}`)}>
  {(() => {
    const unlocked = badges.slice(0, level + 1).length + Object.entries(milestoneBadges).filter(([d]) => book?.streak >= parseInt(d)).length;
    const total = badges.length + Object.keys(milestoneBadges).length;
    return `${unlocked} / ${total} unlocked`;
  })()}
</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {badges.slice(0, level + 1).map((badge, index) => (
  <div key={index} className={`${badge.color} text-sm rounded px-2 py-1 shadow-sm flex items-center`}>
    {badge.icon}
    {badge.name}
  </div>
))}
            {Object.entries(milestoneBadges).map(([day, badge]) => (
              globalStreak >= parseInt(day) ? (
                <div key={day} className="bg-yellow-600 text-sm rounded px-2 py-1 shadow-sm">
                  {badge}
                </div>
              ) : null
            ))}
          </div>
          <div className="text-sm text-gray-400 font-normal mt-2">
            {(() => {
              const nextLevelBadge = badges[level + 1];
              const nextStreakBadge = Object.entries(milestoneBadges)
                .filter(([day]) => globalStreak < parseInt(day))
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))[0];

              if (!nextLevelBadge && !nextStreakBadge) return null;

              return (
                <div>
                  Next: { nextLevelBadge?.name ? `${nextLevelBadge.name} (Level ${level + 1})`
                      : nextStreakBadge
                      ? `${nextStreakBadge[1]} (${nextStreakBadge[0]}-day streak)`
                      : ''
                  }
                </div>
              );
            })()}
          </div>
        </CardContent>
</Card>

<Card className="bg-zinc-800 text-white border-zinc-700">
  <CardContent className="p-4">
    <div className="text-lg font-semibold flex items-center gap-2">
      <CalendarDays className="w-5 h-5" /> Streak Calendar
    </div>
    <div className="grid grid-cols-7 gap-[2px] text-xs mt-2" style={{ gridAutoRows: '1.2rem' }}>
      {[...Array(30)].map((_, i) => {
        const date = new Date(); date.setDate(date.getDate() - i);
        const dateStr = date.toDateString();
        const logEntry = books.flatMap(b => b.log || []).find(entry => entry.date === dateStr);
        const isRead = !!logEntry;
        return (
          <div key={i} title={logEntry ? `${dateStr}: ${logEntry.pages} pages` : `${dateStr}: No reading`} className={`w-4 h-4 rounded-full ${isRead ? 'bg-green-500' : 'bg-zinc-700'} mx-auto`} />
        );
      })}
    </div>
  </CardContent>
</Card>

<Card className="bg-zinc-800 text-white border-zinc-700">
  <CardContent className="p-4 space-y-2">
    <div className="flex items-center gap-2 text-lg font-semibold">
      <LineChart className="w-5 h-5" /> Global Monthly Review
    </div>
    {(() => {
      const today = new Date();
      const past30Days = [...Array(30)].map((_, i) => {
        const d = new Date();
        d.setDate(today.getDate() - i);
        return d.toDateString();
      });
      const logs = books.flatMap(b => b.log || []).filter(entry => past30Days.includes(entry.date));
      const pagesRead = logs.reduce((sum, entry) => sum + entry.pages, 0);
      const uniqueReadDays = new Set(logs.map(entry => entry.date)).size;
      const avgPages = logs.length === 0 ? 0 : uniqueReadDays ? (pagesRead / uniqueReadDays).toFixed(1) : 0;
      const missedDays = logs.length === 0 ? 0 : Math.max(0, 30 - uniqueReadDays);

      return (
        <div className="text-sm space-y-1">
          <div>📘 Pages Read: <span className="text-white font-medium">{pagesRead}</span></div>
          <div>📅 Days Read: <span className="text-white font-medium">{uniqueReadDays}</span></div>
          <div>📊 Avg Pages/Day: <span className="text-white font-medium">{avgPages}</span></div>
          <div>❌ Missed Days: <span className="text-white font-medium">{missedDays}</span></div>
        </div>
      );
    })()}
  </CardContent>
</Card>

</div>
  );
}

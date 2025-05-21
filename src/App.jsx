// Full tracker UI goes here
import React, { useState, useEffect } from 'react';

export default function App() {
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState("");
  const [bookInput, setBookInput] = useState("");
  const [pageInput, setPageInput] = useState("");
  const [lastPage, setLastPage] = useState("");
  const [warning, setWarning] = useState("");
  const [prestige, setPrestige] = useState(1);
  const apiUrl = "https://script.google.com/macros/s/AKfycbyYpummRayhLtFTfYAzoIs0YfA0eY3qsQLamKiwYAAxdFiqKxzuBib4gfVMUBH13oO_/exec";

  const book = books.find(b => b.title === selectedBook);
  const totalXP = books.reduce((sum, b) => sum + (b.xp || 0), 0);
  const levelThreshold = Array.from({ length: 51 }, (_, i) =>
    i === 0 ? 0 : Math.floor(100 * Math.pow(1.15, i - 1)) + (levelThreshold?.[i - 1] || 0)
  );
  let level = levelThreshold.findIndex((_, i, arr) => totalXP < arr[i + 1]);
  level = level === -1 ? 50 : level;
  const nextLevelXP = levelThreshold[level + 1] || Infinity;
  const dailyGoal = [10, 12, 14, 16, 18, 20, 22, 24, 26, 28, 30][level] || 30;
  const today = new Date().toDateString();
  const todayLog = book?.log?.find(entry => entry.date === today);
  const remainingPagesToday = Math.max(0, dailyGoal - (todayLog ? todayLog.pages : 0));
  const currentLevelXP = levelThreshold[level];
  const progress = ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100;

  const getStreakMultiplier = (streak) => {
    if (streak >= 30) return 1.25;
    if (streak >= 14) return 1.15;
    if (streak >= 7) return 1.10;
    if (streak >= 3) return 1.05;
    return 1;
  };

  const handleRead = () => {
    setWarning("");
    if (!book) return;
    const pageNum = parseInt(lastPage, 10);
    const pages = pageNum - book.pagesRead;
    if (isNaN(pages) || pageNum < book.pagesRead || pageNum > book.totalPages) {
      setWarning(`❗ Invalid page number. Please enter a value between ${book?.pagesRead} and ${book?.totalPages}.`);
      return;
    }

    const updatedLog = todayLog
      ? book.log.map(entry => entry.date === today ? { ...entry, pages: entry.pages + pages } : entry)
      : [...book.log, { date: today, pages }];

    const newPagesRead = book.pagesRead + pages;
    const xp_per_page = 2.0 * Math.pow(0.95, level);
    const streakMultiplier = getStreakMultiplier(book.streak);
    const gainedXP = (pages * xp_per_page + 5) * streakMultiplier;
    const prevDate = new Date(new Date().setDate(new Date().getDate() - 1)).toDateString();
    const newStreak = book.lastReadDate === prevDate ? book.streak + 1 : book.lastReadDate !== today ? 1 : book.streak;

    const updatedBooks = books.map(b =>
      b.title === book.title
        ? { ...b, pagesRead: Math.min(newPagesRead, b.totalPages), xp: b.xp + gainedXP, log: updatedLog, streak: newStreak, lastReadDate: today }
        : b
    );

    setBooks(updatedBooks);
    setLastPage("");

    const lastEntry = updatedBooks.find(b => b.title === book.title)?.log?.at(-1);
    if (lastEntry) {
      fetch(apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          date: lastEntry.date,
          book: book.title,
          pages: lastEntry.pages,
          xp: parseFloat((pages * xp_per_page + 5).toFixed(1)),
          streak: newStreak
        }),
        headers: { 'Content-Type': 'application/json' }
      }).then(res => res.text()).then(console.log).catch(console.error);
    }
  };

  useEffect(() => {
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
  }, []);

  return (
    <div style={{ padding: 20 }}>
      <h1>Reading Tracker</h1>
      {warning && <div style={{ color: 'red' }}>{warning}</div>}
      <input type="text" placeholder="Book title" value={bookInput} onChange={e => setBookInput(e.target.value)} />
      <input type="number" placeholder="Total pages" value={pageInput} onChange={e => setPageInput(e.target.value)} />
      <button onClick={() => {
        const pages = parseInt(pageInput, 10);
        if (bookInput && !isNaN(pages)) {
          const newBook = { title: bookInput, totalPages: pages, pagesRead: 0, log: [], xp: 0, streak: 0, lastReadDate: null };
          setBooks([...books, newBook]);
          setSelectedBook(bookInput);
          setBookInput(""); setPageInput("");
        }
      }}>Add Book</button>
      <br /><br />
      <select value={selectedBook} onChange={e => setSelectedBook(e.target.value)}>
        <option value="">Select Book</option>
        {books.map(b => <option key={b.title} value={b.title}>{b.title}</option>)}
      </select>
      <input type="number" placeholder="Last page read" value={lastPage} onChange={e => setLastPage(e.target.value)} />
      <button onClick={handleRead}>Log Reading</button>
      {book && (
        <div>
          <h2>{book.title}</h2>
          <p>📘 {book.pagesRead}/{book.totalPages} pages</p>
          <p>🔥 Streak: {book.streak} days</p>
          <p>⭐ XP: {Math.floor(book.xp)}</p>
          <p>🎯 Level: {level}</p>
        </div>
      )}
    </div>
  );
}

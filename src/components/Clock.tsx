import { useState, useEffect } from 'react';

const Clock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const hour = time.getHours();
  let greeting = 'Selamat Malam 🌙';
  if (hour >= 5 && hour < 11) greeting = 'Selamat Pagi ☀️';
  else if (hour >= 11 && hour < 15) greeting = 'Selamat Siang 🌤️';
  else if (hour >= 15 && hour < 18) greeting = 'Selamat Sore 🌅';

  const timeStr = time.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const dateStr = time.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">{greeting}</p>
      <p className="text-2xl font-bold text-gradient tabular-nums">{timeStr}</p>
      <p className="text-xs text-muted-foreground">{dateStr}</p>
    </div>
  );
};

export default Clock;

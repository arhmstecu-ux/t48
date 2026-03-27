import { useState, useEffect } from 'react';
import { MemberPunishment } from '@/data/punishments';
import { AlertTriangle } from 'lucide-react';

interface Props {
  punishment: MemberPunishment;
}

const PunishmentCountdown = ({ punishment }: Props) => {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(punishment.endDate));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(punishment.endDate));
    }, 1000);
    return () => clearInterval(timer);
  }, [punishment.endDate]);

  if (timeLeft.total <= 0) return null;

  return (
    <div className="glass-card rounded-2xl p-5 border-l-4 border-destructive">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-5 h-5 text-destructive" />
        <h3 className="font-bold text-foreground">⚠️ Status Hukuman Member</h3>
      </div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center text-sm font-bold text-destructive">
          {punishment.nickname[0]}
        </div>
        <div>
          <p className="font-bold text-foreground">{punishment.nickname}</p>
          <p className="text-xs text-muted-foreground">{punishment.memberName}</p>
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{punishment.reason}</p>
      <div className="grid grid-cols-4 gap-2">
        <TimeBlock value={timeLeft.days} label="Hari" />
        <TimeBlock value={timeLeft.hours} label="Jam" />
        <TimeBlock value={timeLeft.minutes} label="Menit" />
        <TimeBlock value={timeLeft.seconds} label="Detik" />
      </div>
      <p className="text-xs text-muted-foreground mt-3 text-center">
        Berakhir: {new Date(punishment.endDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  );
};

const TimeBlock = ({ value, label }: { value: number; label: string }) => (
  <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-2 text-center">
    <span className="text-2xl font-extrabold text-destructive tabular-nums">{String(value).padStart(2, '0')}</span>
    <p className="text-[10px] text-muted-foreground font-medium mt-0.5">{label}</p>
  </div>
);

function getTimeLeft(endDate: string) {
  const total = new Date(endDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}

export default PunishmentCountdown;

export interface MemberPunishment {
  memberId: number;
  memberName: string;
  nickname: string;
  reason: string;
  startDate: string; // ISO date
  endDate: string;   // ISO date
}

export const memberPunishments: MemberPunishment[] = [
  {
    memberId: 28,
    memberName: 'Gendis Mayrannisa Setiawan',
    nickname: 'Gendis',
    reason: 'Pelanggaran peraturan manajemen',
    startDate: '2025-03-01T00:00:00',
    endDate: '2026-05-17T00:00:00',
  },
];

export const getActivePunishments = (): MemberPunishment[] => {
  const now = new Date();
  return memberPunishments
    .filter((p) => {
      const start = new Date(p.startDate);
      const end = new Date(p.endDate);

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return false;

      return start <= now && end > now;
    })
    .sort((a, b) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());
};

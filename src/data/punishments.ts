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
    endDate: '2026-06-01T00:00:00',
  },
];

export const getActivePunishments = (): MemberPunishment[] => {
  const now = new Date();
  return memberPunishments.filter(p => new Date(p.endDate) > now);
};

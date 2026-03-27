export interface JKT48Member {
  id: number;
  name: string;
  nickname: string;
  birthdate: string; // YYYY-MM-DD
  generation: number;
  status: 'active' | 'trainee' | 'hiatus' | 'suspended';
  fanbase: string;
}

export const jkt48Members: JKT48Member[] = [
  // Gen 3
  { id: 1, name: 'Feni Fitriyanti', nickname: 'Feni', birthdate: '1999-01-16', generation: 3, status: 'hiatus', fanbase: 'Fenidelity' },

  // Gen 6
  { id: 2, name: 'Gita Sekar Andarini', nickname: 'Gita', birthdate: '2001-06-30', generation: 6, status: 'active', fanbase: 'Gitroops' },

  // Gen 7
  { id: 3, name: 'Angelina Christy', nickname: 'Christy', birthdate: '2005-12-05', generation: 7, status: 'active', fanbase: 'Christyzer' },
  { id: 4, name: 'Febriola Sinambela', nickname: 'Olla', birthdate: '2005-02-26', generation: 7, status: 'active', fanbase: 'Oracle' },
  { id: 5, name: 'Freyanashifa Jayawardana', nickname: 'Freya', birthdate: '2006-02-13', generation: 7, status: 'active', fanbase: 'Freyanation' },
  { id: 6, name: 'Helisma Putri', nickname: 'Eli', birthdate: '2000-06-15', generation: 7, status: 'active', fanbase: 'Helismiley' },
  { id: 7, name: 'Jessica Rich Chandra', nickname: 'Jessi', birthdate: '2005-09-23', generation: 7, status: 'active', fanbase: 'Jessination' },
  { id: 8, name: 'Mutiara Azzahra Umandana', nickname: 'Muthe', birthdate: '2004-07-12', generation: 7, status: 'active', fanbase: 'Muffin' },

  // Gen 8
  { id: 9, name: 'Cornelia Syafa Vanisa', nickname: 'Oniel', birthdate: '2002-07-26', generation: 8, status: 'active', fanbase: 'Onielity' },
  { id: 10, name: 'Fiony Alveria Tantri', nickname: 'Fiony', birthdate: '2002-02-04', generation: 8, status: 'active', fanbase: 'Symfiony' },
  { id: 11, name: 'Lulu Azkiya Salsabila', nickname: 'Lulu', birthdate: '2002-10-23', generation: 8, status: 'active', fanbase: 'Lunarian' },

  // Gen 9
  { id: 12, name: 'Indah Cahya Nabilla', nickname: 'Indah', birthdate: '2001-03-20', generation: 9, status: 'active', fanbase: 'Interindah' },
  { id: 13, name: 'Kathrina Irene Indarto Putri', nickname: 'Kathrina', birthdate: '2006-07-26', generation: 9, status: 'active', fanbase: 'KATH Inc.' },
  { id: 14, name: 'Marsha Lenathea Lapian', nickname: 'Marsha', birthdate: '2006-01-09', generation: 9, status: 'active', fanbase: 'MarshaOshi' },

  // Gen 10
  { id: 15, name: 'Amanda Puspita Sukma', nickname: 'Amanda', birthdate: '2004-12-17', generation: 10, status: 'active', fanbase: 'Mandaffection' },
  { id: 16, name: 'Aurellia', nickname: 'Lia', birthdate: '2002-10-29', generation: 10, status: 'active', fanbase: 'Liamelior' },
  { id: 17, name: 'Gabriela Abigail Mewengkang', nickname: 'Ella', birthdate: '2006-08-07', generation: 10, status: 'active', fanbase: 'Ellatheria' },
  { id: 18, name: 'Jesslyn Septiani Elly', nickname: 'Lyn', birthdate: '2001-09-13', generation: 10, status: 'active', fanbase: 'Lynear' },
  { id: 19, name: 'Raisha Syifa Wardhana', nickname: 'Raisha', birthdate: '2007-11-11', generation: 10, status: 'active', fanbase: 'Raishanrise' },

  // Gen 11
  { id: 20, name: 'Alya Amanda Fatihah', nickname: 'Alya', birthdate: '2006-08-26', generation: 11, status: 'active', fanbase: 'Alamanda' },
  { id: 21, name: 'Anindya Ramadhani Purnomo', nickname: 'Anindya', birthdate: '2005-10-18', generation: 11, status: 'active', fanbase: 'Aninimous' },
  { id: 22, name: 'Cathleen Hana Nixie', nickname: 'Cathy', birthdate: '2009-05-28', generation: 11, status: 'active', fanbase: 'Cathleenexus' },
  { id: 23, name: 'Celline Thefannie', nickname: 'Elin', birthdate: '2007-04-09', generation: 11, status: 'active', fanbase: 'Cellineyours' },
  { id: 24, name: 'Chelsea Davina Norman', nickname: 'Chelsea', birthdate: '2009-12-23', generation: 11, status: 'active', fanbase: 'Chelsealand' },
  { id: 25, name: 'Cynthia Yaputera', nickname: 'Cynthia', birthdate: '2003-11-22', generation: 11, status: 'active', fanbase: 'Cynthiaction' },
  { id: 26, name: 'Dena Natalia Ang', nickname: 'Danella', birthdate: '2005-12-16', generation: 11, status: 'active', fanbase: 'Denalize' },
  { id: 27, name: 'Desy Natalia Ang', nickname: 'Daisy', birthdate: '2005-12-16', generation: 11, status: 'active', fanbase: 'Daisyne' },
  { id: 28, name: 'Gendis Mayrannisa Setiawan', nickname: 'Gendis', birthdate: '2010-06-23', generation: 11, status: 'suspended', fanbase: 'Sahabat Gendis' },
  { id: 29, name: 'Grace Octaviani Tanujaya', nickname: 'Gracie', birthdate: '2007-10-18', generation: 11, status: 'active', fanbase: 'Gracieluv' },
  { id: 30, name: 'Greesella Sophina Adhalia', nickname: 'Greesel', birthdate: '2006-01-10', generation: 11, status: 'active', fanbase: 'Degrees' },
  { id: 31, name: 'Michelle Alexandra Suandi', nickname: 'Michie', birthdate: '2009-04-22', generation: 11, status: 'active', fanbase: 'Michiban' },

  // Gen 12
  { id: 32, name: 'Abigail Rachel Lie', nickname: 'Aralie', birthdate: '2008-08-06', generation: 12, status: 'active', fanbase: 'Arariel' },
  { id: 33, name: 'Adeline Wijaya', nickname: 'Delynn', birthdate: '2007-09-01', generation: 12, status: 'active', fanbase: 'Delynessence' },
  { id: 34, name: 'Aurhel Alana Tirta', nickname: 'Lana', birthdate: '2006-09-14', generation: 12, status: 'active', fanbase: 'Lanautica' },
  { id: 35, name: 'Catherina Vallencia Kurniawan', nickname: 'Erine', birthdate: '2007-08-21', generation: 12, status: 'active', fanbase: 'Cavallery' },
  { id: 36, name: 'Fritzy Rosmerian', nickname: 'Fritzy', birthdate: '2008-07-28', generation: 12, status: 'active', fanbase: 'Fritzy Force' },
  { id: 37, name: 'Hillary Abigail Mantiri', nickname: 'Lily', birthdate: '2007-10-19', generation: 12, status: 'active', fanbase: 'Hillaryours' },
  { id: 38, name: 'Jazzlyn Agatha Trisha', nickname: 'Trisha', birthdate: '2011-02-16', generation: 12, status: 'active', fanbase: 'TACT' },
  { id: 39, name: 'Michelle Levia Arifin', nickname: 'Levi', birthdate: '2009-01-24', generation: 12, status: 'active', fanbase: 'Le Viosa' },
  { id: 40, name: 'Araki Nayla Suji Aurelia', nickname: 'Nayla', birthdate: '2007-06-18', generation: 12, status: 'active', fanbase: 'Nayrakuen' },
  { id: 41, name: 'Nina Tutachia Chapman', nickname: 'Nachia', birthdate: '2009-10-16', generation: 12, status: 'active', fanbase: 'Yokinachia' },
  { id: 42, name: 'Oline Manuel Chay', nickname: 'Oline', birthdate: '2007-11-03', generation: 12, status: 'active', fanbase: 'Olinara' },
  { id: 43, name: 'Ribka Budiman', nickname: 'Ribka', birthdate: '2009-01-13', generation: 12, status: 'active', fanbase: 'Ribcalls' },
  { id: 44, name: 'Shabilqis Naila Bustomi', nickname: 'Nala', birthdate: '2008-09-01', generation: 12, status: 'active', fanbase: 'Nalania' },
  { id: 45, name: 'Victoria Kimberly Lukitama', nickname: 'Kimmy', birthdate: '2010-03-08', generation: 12, status: 'active', fanbase: 'GROVY' },

  // Gen 13 (Trainee)
  { id: 46, name: 'Astrella Virgiananda Nugraha', nickname: 'Virgi', birthdate: '2010-08-06', generation: 13, status: 'trainee', fanbase: 'Astralux' },
  { id: 47, name: 'Aulia Riza Firdausy Effendi', nickname: 'Auwia', birthdate: '2007-07-14', generation: 13, status: 'trainee', fanbase: 'Aulavana' },
  { id: 48, name: 'Bong Aprilli Paskah', nickname: 'Rilly', birthdate: '2010-04-01', generation: 13, status: 'trainee', fanbase: 'AprilliVels' },
  { id: 49, name: 'Hagia Sopia', nickname: 'Giaa', birthdate: '2008-07-01', generation: 13, status: 'trainee', fanbase: 'BerbahaGIA' },
  { id: 50, name: 'Humaira Ramadhani Salfiandi', nickname: 'Maira', birthdate: '2011-08-13', generation: 13, status: 'trainee', fanbase: 'Humainiora' },
  { id: 51, name: 'Jacqueline Immanuela Jonathan', nickname: 'Ekin', birthdate: '2009-07-09', generation: 13, status: 'trainee', fanbase: 'EkinAir' },
  { id: 52, name: 'Jemima Evodie Mayra Lijaya', nickname: 'Jemima', birthdate: '2009-11-09', generation: 13, status: 'trainee', fanbase: 'JeVolante' },
  { id: 53, name: 'Mikaela Kusjanto', nickname: 'Mikaela', birthdate: '2007-12-15', generation: 13, status: 'trainee', fanbase: 'Cinemika' },
  { id: 54, name: 'Nur Intan', nickname: 'Intan', birthdate: '2006-02-24', generation: 13, status: 'trainee', fanbase: 'Intanium' },

  // Gen 14 (Trainee)
  { id: 55, name: 'Afera Thalia Putri Eysteinn', nickname: 'Fera', birthdate: '2012-10-20', generation: 14, status: 'trainee', fanbase: 'TheaFeria' },
  { id: 56, name: 'Carissa Dini Asmaranti', nickname: 'Carissa', birthdate: '2012-02-02', generation: 14, status: 'trainee', fanbase: 'Carissera' },
  { id: 57, name: 'Christabella Bonita Claura Chandra', nickname: 'Bella', birthdate: '2011-03-02', generation: 14, status: 'trainee', fanbase: 'Bellania' },
  { id: 58, name: 'Fahira Putri Kirana', nickname: 'Fahira', birthdate: '2012-08-13', generation: 14, status: 'trainee', fanbase: 'Hirakira' },
  { id: 59, name: 'Fatimah Azzahra', nickname: 'Rara', birthdate: '2010-08-30', generation: 14, status: 'trainee', fanbase: 'RaraLand' },
  { id: 60, name: 'Heidi Suyangga', nickname: 'Heidi', birthdate: '2008-08-27', generation: 14, status: 'trainee', fanbase: 'HeidiBloom' },
  { id: 61, name: 'Maxine Faye Lee', nickname: 'Maxine', birthdate: '2011-12-02', generation: 14, status: 'trainee', fanbase: 'Maxinieu' },
  { id: 62, name: 'Putry Jazyta', nickname: 'Jazzy', birthdate: '2011-03-12', generation: 14, status: 'trainee', fanbase: 'JazLune' },
  { id: 63, name: 'Ralyne Van Irwan', nickname: 'Ralyne', birthdate: '2011-10-15', generation: 14, status: 'trainee', fanbase: 'Ralyneptune' },
  { id: 64, name: 'Sona Kalyana Purboprasetyani', nickname: 'Sona', birthdate: '2011-12-01', generation: 14, status: 'trainee', fanbase: 'TerpeSona' },
];

export const getUpcomingBirthdays = (count = 5): JKT48Member[] => {
  const today = new Date();
  const currentYear = today.getFullYear();

  const withNextBirthday = jkt48Members.map(m => {
    const [, month, day] = m.birthdate.split('-').map(Number);
    let nextBday = new Date(currentYear, month - 1, day);
    if (nextBday < today) nextBday = new Date(currentYear + 1, month - 1, day);
    return { ...m, nextBday };
  });

  withNextBirthday.sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime());
  return withNextBirthday.slice(0, count);
};

export const formatBirthdate = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const getAge = (dateStr: string): number => {
  const today = new Date();
  const bd = new Date(dateStr + 'T00:00:00');
  let age = today.getFullYear() - bd.getFullYear();
  const m = today.getMonth() - bd.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < bd.getDate())) age--;
  return age;
};

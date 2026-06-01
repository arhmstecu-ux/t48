export interface JKT48Member {
  id: number;
  name: string;
  nickname: string;
  birthdate: string; // YYYY-MM-DD
  generation: number;
  status: 'active' | 'trainee' | 'hiatus' | 'suspended';
  fanbase: string;
  photo?: string;
}

export const jkt48Members: JKT48Member[] = [
  // Gen 3
  { id: 1, name: 'Feni Fitriyanti', nickname: 'Feni', birthdate: '1999-01-16', generation: 3, status: 'hiatus', fanbase: 'Fenidelity', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/feni_fhaxti.jpg' },

  // Gen 6
  { id: 2, name: 'Gita Sekar Andarini', nickname: 'Gita', birthdate: '2001-06-30', generation: 6, status: 'active', fanbase: 'Gitroops', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/gita_sekar_andarini_nvca0n.jpg' },

  // Gen 7
  { id: 3, name: 'Angelina Christy', nickname: 'Christy', birthdate: '2005-12-05', generation: 7, status: 'active', fanbase: 'Christyzer', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/christy_rjiaw6.jpg' },
  { id: 4, name: 'Febriola Sinambela', nickname: 'Olla', birthdate: '2005-02-26', generation: 7, status: 'active', fanbase: 'Oracle', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/febriola_sinambela_pg6fzb.jpg' },
  { id: 5, name: 'Freyanashifa Jayawardana', nickname: 'Freya', birthdate: '2006-02-13', generation: 7, status: 'active', fanbase: 'Freyanation', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/freya_jayawardana_mzdjf0.jpg' },
  { id: 6, name: 'Helisma Putri', nickname: 'Eli', birthdate: '2000-06-15', generation: 7, status: 'active', fanbase: 'Helismiley', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/helisma_putri_ayw3hg.jpg' },
  { id: 7, name: 'Jessica Rich Chandra', nickname: 'Jessi', birthdate: '2005-09-23', generation: 7, status: 'active', fanbase: 'Jessination', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/jessi_o3cdyg.jpg' },
  { id: 8, name: 'Mutiara Azzahra Umandana', nickname: 'Muthe', birthdate: '2004-07-12', generation: 7, status: 'active', fanbase: 'Muffin', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/muthe_x8rj6m.jpg' },

  // Gen 8
  { id: 9, name: 'Cornelia Syafa Vanisa', nickname: 'Oniel', birthdate: '2002-07-26', generation: 8, status: 'active', fanbase: 'Onielity', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/oniel_imjae9.jpg' },
  { id: 10, name: 'Fiony Alveria Tantri', nickname: 'Fiony', birthdate: '2002-02-04', generation: 8, status: 'active', fanbase: 'Symfiony', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/fiony_mjbodf.jpg' },
  { id: 11, name: 'Lulu Azkiya Salsabila', nickname: 'Lulu', birthdate: '2002-10-23', generation: 8, status: 'active', fanbase: 'Lunarian', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/lulu_cpoakv.jpg' },

  // Gen 9
  { id: 12, name: 'Indah Cahya Nabilla', nickname: 'Indah', birthdate: '2001-03-20', generation: 9, status: 'active', fanbase: 'Interindah', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/indah_ltaxxn.jpg' },
  { id: 13, name: 'Kathrina Irene Indarto Putri', nickname: 'Kathrina', birthdate: '2006-07-26', generation: 9, status: 'active', fanbase: 'KATH Inc.', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/kathrina_ex91yn.jpg' },
  { id: 14, name: 'Marsha Lenathea Lapian', nickname: 'Marsha', birthdate: '2006-01-09', generation: 9, status: 'active', fanbase: 'MarshaOshi', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/marsha_lenathea_iqu1d1.jpg' },

  // Gen 10
  
  { id: 16, name: 'Aurellia', nickname: 'Lia', birthdate: '2002-10-29', generation: 10, status: 'active', fanbase: 'Liamelior', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/lia_dotnos.jpg' },
  { id: 17, name: 'Gabriela Abigail Mewengkang', nickname: 'Ella', birthdate: '2006-08-07', generation: 10, status: 'active', fanbase: 'Ellatheria', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/gabriela_abigail_ui1hmv.jpg' },
  { id: 18, name: 'Jesslyn Septiani Elly', nickname: 'Lyn', birthdate: '2001-09-13', generation: 10, status: 'active', fanbase: 'Lynear', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/jesslyn_elly_qoehzs.jpg' },
  { id: 19, name: 'Raisha Syifa Wardhana', nickname: 'Raisha', birthdate: '2007-11-11', generation: 10, status: 'active', fanbase: 'Raishanrise', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/raisha_g85ajn.jpg' },

  // Gen 11
  { id: 21, name: 'Anindya Ramadhani Purnomo', nickname: 'Anindya', birthdate: '2005-10-18', generation: 11, status: 'active', fanbase: 'Aninimous', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/anindya_elmsrh.jpg' },
  { id: 22, name: 'Cathleen Hana Nixie', nickname: 'Cathy', birthdate: '2009-05-28', generation: 11, status: 'active', fanbase: 'Cathleenexus', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/cathy_swseqw.jpg' },
  { id: 23, name: 'Celline Thefannie', nickname: 'Elin', birthdate: '2007-04-09', generation: 11, status: 'active', fanbase: 'Cellineyours', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/elin_ni6m5z.jpg' },
  { id: 25, name: 'Cynthia Yaputera', nickname: 'Cynthia', birthdate: '2003-11-22', generation: 11, status: 'active', fanbase: 'Cynthiaction', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/cynthia_adcpdu.jpg' },
  { id: 26, name: 'Dena Natalia Ang', nickname: 'Danella', birthdate: '2005-12-16', generation: 11, status: 'active', fanbase: 'Denalize', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/danella_rg4dux.jpg' },
  { id: 27, name: 'Desy Natalia Ang', nickname: 'Daisy', birthdate: '2005-12-16', generation: 11, status: 'active', fanbase: 'Daisyne', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/daisy_bjn1de.jpg' },
  { id: 28, name: 'Gendis Mayrannisa Setiawan', nickname: 'Gendis', birthdate: '2010-06-23', generation: 11, status: 'active', fanbase: 'Sahabat Gendis', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/gendis_c7hrct.jpg' },
  { id: 29, name: 'Grace Octaviani Tanujaya', nickname: 'Gracie', birthdate: '2007-10-18', generation: 11, status: 'active', fanbase: 'Gracieluv', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/gracie_vv4pap.jpg' },
  { id: 30, name: 'Greesella Sophina Adhalia', nickname: 'Greesel', birthdate: '2006-01-10', generation: 11, status: 'active', fanbase: 'Degrees', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/greesella_adhalia_fksjuw.jpg' },
  { id: 31, name: 'Michelle Alexandra Suandi', nickname: 'Michie', birthdate: '2009-04-22', generation: 11, status: 'active', fanbase: 'Michiban', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/michie_cz97cu.jpg' },

  // Gen 12
  { id: 32, name: 'Abigail Rachel Lie', nickname: 'Aralie', birthdate: '2008-08-06', generation: 12, status: 'active', fanbase: 'Arariel', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/aralie_n6q3xd.jpg' },
  { id: 33, name: 'Adeline Wijaya', nickname: 'Delynn', birthdate: '2007-09-01', generation: 12, status: 'active', fanbase: 'Delynessence', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/adeline_wijaya_sfccz6.jpg' },
  { id: 34, name: 'Aurhel Alana Tirta', nickname: 'Lana', birthdate: '2006-09-14', generation: 12, status: 'active', fanbase: 'Lanautica', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/lana_ztoaoe.jpg' },
  { id: 35, name: 'Catherina Vallencia Kurniawan', nickname: 'Erine', birthdate: '2007-08-21', generation: 12, status: 'active', fanbase: 'Cavallery', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/erine_s6rhtf.jpg' },
  { id: 36, name: 'Fritzy Rosmerian', nickname: 'Fritzy', birthdate: '2008-07-28', generation: 12, status: 'active', fanbase: 'Fritzy Force', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/fritzy_odug7q.jpg' },
  { id: 37, name: 'Hillary Abigail Mantiri', nickname: 'Lily', birthdate: '2007-10-19', generation: 12, status: 'active', fanbase: 'Hillaryours', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/lily_jqskyy.jpg' },
  { id: 38, name: 'Jazzlyn Agatha Trisha', nickname: 'Trisha', birthdate: '2011-02-16', generation: 12, status: 'active', fanbase: 'TACT', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/trisha_tobmvw.jpg' },
  { id: 39, name: 'Michelle Levia Arifin', nickname: 'Levi', birthdate: '2009-01-24', generation: 12, status: 'active', fanbase: 'Le Viosa', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/levi_azukkk.jpg' },
  { id: 40, name: 'Araki Nayla Suji Aurelia', nickname: 'Nayla', birthdate: '2007-06-18', generation: 12, status: 'active', fanbase: 'Nayrakuen', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/nayla_fi8vk4.jpg' },
  { id: 41, name: 'Nina Tutachia Chapman', nickname: 'Nachia', birthdate: '2009-10-16', generation: 12, status: 'active', fanbase: 'Yokinachia', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/nina_tutachia_sfhyvw.jpg' },
  { id: 42, name: 'Oline Manuel Chay', nickname: 'Oline', birthdate: '2007-11-03', generation: 12, status: 'active', fanbase: 'Olinara', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/oline_manuel_uceo33.jpg' },
  { id: 43, name: 'Ribka Budiman', nickname: 'Ribka', birthdate: '2009-01-13', generation: 12, status: 'active', fanbase: 'Ribcalls', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/ribka_qfrppk.jpg' },
  { id: 44, name: 'Shabilqis Naila Bustomi', nickname: 'Nala', birthdate: '2008-09-01', generation: 12, status: 'active', fanbase: 'Nalania', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/shabilqis_naila_lsb03z.jpg' },
  { id: 45, name: 'Victoria Kimberly Lukitama', nickname: 'Kimmy', birthdate: '2010-03-08', generation: 12, status: 'active', fanbase: 'GROVY', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/kimmy_vln9ki.jpg' },

  // Gen 13 (Trainee)
  { id: 46, name: 'Astrella Virgiananda Nugraha', nickname: 'Virgi', birthdate: '2010-08-06', generation: 13, status: 'trainee', fanbase: 'Astralux', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/virgi_psoymy.jpg' },
  { id: 47, name: 'Aulia Riza Firdausy Effendi', nickname: 'Auwia', birthdate: '2007-07-14', generation: 13, status: 'trainee', fanbase: 'Aulavana', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/auwia_z2klqc.jpg' },
  { id: 48, name: 'Bong Aprilli Paskah', nickname: 'Rilly', birthdate: '2010-04-01', generation: 13, status: 'trainee', fanbase: 'AprilliVels', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/rilly_dfero7.jpg' },
  { id: 49, name: 'Hagia Sopia', nickname: 'Giaa', birthdate: '2008-07-01', generation: 13, status: 'trainee', fanbase: 'BerbahaGIA', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/giaa_octhox.jpg' },
  { id: 50, name: 'Humaira Ramadhani Salfiandi', nickname: 'Maira', birthdate: '2011-08-13', generation: 13, status: 'trainee', fanbase: 'Humainiora', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/maira_ajatfp.jpg' },
  { id: 51, name: 'Jacqueline Immanuela Jonathan', nickname: 'Ekin', birthdate: '2009-07-09', generation: 13, status: 'trainee', fanbase: 'EkinAir', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/ekin_ebmyq2.jpg' },
  { id: 52, name: 'Jemima Evodie Mayra Lijaya', nickname: 'Jemima', birthdate: '2009-11-09', generation: 13, status: 'trainee', fanbase: 'JeVolante', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/jemima_jzbqy5.jpg' },
  { id: 53, name: 'Mikaela Kusjanto', nickname: 'Mikaela', birthdate: '2007-12-15', generation: 13, status: 'trainee', fanbase: 'Cinemika', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/mikaela_p0wmji.jpg' },
  { id: 54, name: 'Nur Intan', nickname: 'Intan', birthdate: '2006-02-24', generation: 13, status: 'trainee', fanbase: 'Intanium', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/intan_mo0nll.jpg' },

  // Gen 14 (Trainee)
  { id: 55, name: 'Afera Thalia Putri Eysteinn', nickname: 'Fera', birthdate: '2012-10-20', generation: 14, status: 'trainee', fanbase: 'TheaFeria', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/fera_jj8swk.jpg' },
  { id: 56, name: 'Carissa Dini Asmaranti', nickname: 'Carissa', birthdate: '2012-02-02', generation: 14, status: 'trainee', fanbase: 'Carissera', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/carissa_t62we1.jpg' },
  { id: 57, name: 'Christabella Bonita Claura Chandra', nickname: 'Bella', birthdate: '2011-03-02', generation: 14, status: 'trainee', fanbase: 'Bellania', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/bella_rgmvb4.jpg' },
  { id: 58, name: 'Fahira Putri Kirana', nickname: 'Fahira', birthdate: '2012-08-13', generation: 14, status: 'trainee', fanbase: 'Hirakira', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/fahira_jkvrpl.jpg' },
  { id: 59, name: 'Fatimah Azzahra', nickname: 'Rara', birthdate: '2010-08-30', generation: 14, status: 'trainee', fanbase: 'RaraLand', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/rara_dxomqh.jpg' },
  { id: 60, name: 'Heidi Suyangga', nickname: 'Heidi', birthdate: '2008-08-27', generation: 14, status: 'trainee', fanbase: 'HeidiBloom', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/heidi_ltllch.jpg' },
  { id: 61, name: 'Maxine Faye Lee', nickname: 'Maxine', birthdate: '2011-12-02', generation: 14, status: 'trainee', fanbase: 'Maxinieu', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/v1775671853/maxine_wnwhqp.jpg' },
  { id: 62, name: 'Putry Jazyta', nickname: 'Jazzy', birthdate: '2011-03-12', generation: 14, status: 'trainee', fanbase: 'JazLune', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/jazzy_w6xbp0.jpg' },
  { id: 63, name: 'Ralyne Van Irwan', nickname: 'Ralyne', birthdate: '2011-10-15', generation: 14, status: 'trainee', fanbase: 'Ralyneptune', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/ralyne_l6vtcc.jpg' },
  { id: 64, name: 'Sona Kalyana Purboprasetyani', nickname: 'Sona', birthdate: '2011-12-01', generation: 14, status: 'trainee', fanbase: 'TerpeSona', photo: 'https://res.cloudinary.com/dak2dhea9/image/upload/sona_sdepst.jpg' },
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

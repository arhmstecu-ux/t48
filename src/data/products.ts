import { Product } from '@/types';

export const defaultProducts: Product[] = [
  {
    id: '1',
    name: 'CARA MEMINUM RAMUNE STS Kimmy',
    price: 150000,
    description: 'Special Theater Show - Cara Meminum Ramune starring Kimmy. Nikmati pertunjukan eksklusif dari JKT48!',
    image: '',
    category: 'Show',
  },
  {
    id: '2',
    name: 'CARA MEMINUM RAMUNE STS Olla',
    price: 150000,
    description: 'Special Theater Show - Cara Meminum Ramune starring Olla. Pengalaman theater yang tak terlupakan!',
    image: '',
    category: 'Show',
  },
  {
    id: '3',
    name: 'Pertaruhan Cinta LS Amanda',
    price: 175000,
    description: 'Live Show Pertaruhan Cinta bersama Amanda. Saksikan penampilan memukau dari Amanda JKT48!',
    image: '',
    category: 'Show',
  },
  {
    id: 'membership',
    name: 'Membership Show JKT48',
    price: 38000,
    description: 'Dapatkan akses membership show JKT48! Tonton pertunjukan reguler di theater JKT48.',
    image: '',
    category: 'Membership',
  },
];

export const getProducts = (): Product[] => {
  const custom = localStorage.getItem('products');
  return custom ? JSON.parse(custom) : defaultProducts;
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem('products', JSON.stringify(products));
};

import { OutletStaffPerformance, StaffSale } from '../types/gold';

/**
 * DATA DEMO — akan diganti dengan feed AutoCount setelah sistem tersebut
 * boleh diakses (masih rangkaian ethernet buat masa ini).
 *
 * Format ini sengaja dikekalkan mudah: satu senarai outlet, setiap outlet
 * ada senarai staff dan jualan semasa mereka. `total` dikira automatik dari
 * gabungan jualan semua staff dalam outlet itu.
 */
const RAW_OUTLETS: Array<{ outlet: string; staff: StaffSale[] }> = [
  {
    outlet: 'Amanjaya Mall',
    staff: [
      { name: 'Nurul Aisyah', sale: 4280 },
      { name: 'Muhammad Arif', sale: 3650 },
      { name: 'Siti Salmah', sale: 5120 },
      { name: 'Lim Wei Jian', sale: 2940 },
    ],
  },
  {
    outlet: 'HQ Warehouse',
    staff: [
      { name: 'Abdul Rahman', sale: 6740 },
      { name: 'Tan Mei Ling', sale: 4390 },
      { name: 'Farhana Nazri', sale: 3860 },
    ],
  },
  {
    outlet: 'Demo Outlet 3',
    staff: [
      { name: 'Aina Zulkifli', sale: 3120 },
      { name: 'Ravi Kumar', sale: 2750 },
      { name: 'Nadia Kamal', sale: 4480 },
    ],
  },
  {
    outlet: 'Demo Outlet 4',
    staff: [
      { name: 'Hafiz Ismail', sale: 5230 },
      { name: 'Chong Li Mei', sale: 3980 },
      { name: 'Amira Yusof', sale: 2610 },
    ],
  },
  {
    outlet: 'Demo Outlet 5',
    staff: [
      { name: 'Syafiq Adam', sale: 4870 },
      { name: 'Pei Fen', sale: 3540 },
      { name: 'Izati Roslan', sale: 4190 },
    ],
  },
];

export const DEMO_STAFF_PERFORMANCE: OutletStaffPerformance[] = RAW_OUTLETS.map(
  ({ outlet, staff }) => ({
    outlet,
    staff,
    total: staff.reduce((sum, person) => sum + Math.max(0, person.sale), 0),
  }),
);

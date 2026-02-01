import prisma from '../src/config/database';

const cities = [
  'Jakarta', 'Surabaya', 'Bandung', 'Medan', 'Semarang',
  'Makassar', 'Palembang', 'Tangerang', 'South Tangerang', 'Depok',
  'Binjai', 'Bekasi', 'Padang', 'Bandar Lampung', 'Bogor',
  'Malang', 'Pekarbaru', 'Denpasar', 'Yogyakarta', 'Serang',
  'Balikpapan', 'Pontianak', 'Banjarmasin', 'Jambi', 'Surakarta',
  'Manado', 'Mataram', 'Kupang', 'Ambon', 'Jayapura'
];

async function main() {
  console.log('Start seeding cities...');
  for (const city of cities) {
    await prisma.location.upsert({
      where: { city },
      update: {},
      create: { city },
    });
  }
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

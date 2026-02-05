const { PrismaClient } = require('./src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
    const totalEvents = await prisma.event.count();
    console.log(`Total events in database: ${totalEvents}`);

    if (totalEvents > 0) {
        const samples = await prisma.event.findMany({
            take: 5,
            include: { organizer: { select: { name: true } } }
        });
        samples.forEach(e => {
            console.log(`- Title: ${e.title}, Organizer: ${e.organizer.name}, ID: ${e.id}, OrgID: ${e.organizerId}`);
        });
    }

    const allUsers = await prisma.user.findMany({
        where: { role: 'ORGANIZER' },
        select: { id: true, name: true }
    });
    console.log('Available Organizers:', allUsers);
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

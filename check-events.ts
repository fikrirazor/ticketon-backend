import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const organizerName = "Endang Supriatna, S.Kom.";
    const user = await prisma.user.findFirst({
        where: { name: organizerName }
    });

    if (!user) {
        console.log(`User with name ${organizerName} not found.`);
        return;
    }

    console.log(`User found: ID=${user.id}, Role=${user.role}, Name=${user.name}`);

    const events = await prisma.event.findMany({
        where: { organizerId: user.id }
    });

    console.log(`Events found for this user: ${events.length}`);
    events.forEach(e => {
        console.log(`- ID: ${e.id}, Title: ${e.title}, DeletedAt: ${e.deletedAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());

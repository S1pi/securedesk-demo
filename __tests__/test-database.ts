import "dotenv/config";
import prisma from "../lib/db";

async function testDatabase() {
  console.log("🔍 Testing database connection...\n");

  try {
    // Verify connection by running a simple query
    const userCount = await prisma.user.count();
    console.log("✅ Connected to database!");
    console.log(`   Users in DB: ${userCount}`);

    // List tickets
    const ticketCount = await prisma.ticket.count();
    console.log(`   Tickets in DB: ${ticketCount}`);

    console.log("\n🎉 Database is working correctly.\n");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();

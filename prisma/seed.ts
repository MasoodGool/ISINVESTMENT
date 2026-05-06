// Seed the dev database with a realistic-ish sample landlord setup so
// the UI has something to display on first run.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function rand(amount: number) {
  return Math.round(amount * 100); // ZAR cents
}

async function main() {
  // Wipe in dependency-safe order.
  await prisma.rentPayment.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.loanStatement.deleteMany();
  await prisma.loan.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.taxYearNote.deleteMany();
  await prisma.property.deleteMany();

  const property = await prisma.property.create({
    data: {
      name: "12 Oak Avenue",
      type: "Residential",
      addressLine1: "12 Oak Avenue",
      city: "Cape Town",
      province: "Western Cape",
      postalCode: "7708",
      purchaseDate: new Date("2022-06-01"),
      purchasePrice: rand(2_400_000),
      acquisitionCosts: rand(78_000), // transfer duty + attorney
      notes: "Two-bed apartment in Rondebosch. First investment property.",
    },
  });

  const tenant = await prisma.tenant.create({
    data: {
      fullName: "Sipho Dlamini",
      email: "sipho@example.com",
      phone: "+27 82 555 0101",
    },
  });

  const lease = await prisma.lease.create({
    data: {
      propertyId: property.id,
      tenantId: tenant.id,
      startDate: new Date("2024-08-01"),
      monthlyRent: rand(18_500),
      depositAmount: rand(37_000),
      status: "Active",
    },
  });

  // Last 12 monthly rent payments.
  const today = new Date();
  for (let i = 11; i >= 0; i--) {
    const periodStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const paidOn = new Date(today.getFullYear(), today.getMonth() - i, 3);
    await prisma.rentPayment.create({
      data: {
        leaseId: lease.id,
        paidOn,
        periodStart,
        periodEnd,
        amount: rand(18_500),
        status: i === 0 ? "Paid" : "Paid",
        reference: `EFT ${periodStart.getFullYear()}-${(periodStart.getMonth() + 1)
          .toString()
          .padStart(2, "0")}`,
      },
    });
  }

  // Bond.
  const loan = await prisma.loan.create({
    data: {
      propertyId: property.id,
      lender: "Standard Bank",
      accountNumber: "•••• 4421",
      originalBalance: rand(1_900_000),
      startDate: new Date("2022-06-15"),
      termMonths: 240,
      interestRate: 11.75,
      initiationFees: rand(6_037),
    },
  });

  // Last 12 monthly loan statements (interest declines slowly).
  let opening = rand(1_780_000);
  for (let i = 11; i >= 0; i--) {
    const periodStart = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const periodEnd = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const interest = rand(17_500 - i * 30);
    const principal = rand(2_300 + i * 30);
    const fees = rand(60);
    const closing = opening - principal;
    await prisma.loanStatement.create({
      data: {
        loanId: loan.id,
        periodStart,
        periodEnd,
        openingBalance: opening,
        closingBalance: closing,
        interestCharged: interest,
        feesCharged: fees,
        principalPaid: principal,
      },
    });
    opening = closing;
  }

  // Acquisition-time capital expenses.
  await prisma.expense.createMany({
    data: [
      {
        propertyId: property.id,
        date: new Date("2022-06-15"),
        amount: rand(48_000),
        categoryCode: "TRANSFER_DUTY",
        description: "Transfer duty on acquisition",
        isCapital: true,
        isReclaimable: false,
      },
      {
        propertyId: property.id,
        date: new Date("2022-06-15"),
        amount: rand(22_500),
        categoryCode: "ATTORNEY_TRANSFER",
        description: "Conveyancing fees",
        vendor: "Smith Tabata Inc.",
        isCapital: true,
        isReclaimable: false,
      },
      {
        propertyId: property.id,
        date: new Date("2022-06-15"),
        amount: rand(7_500),
        categoryCode: "ATTORNEY_BOND",
        description: "Bond registration",
        vendor: "Smith Tabata Inc.",
        isCapital: true,
        isReclaimable: false,
      },
    ],
  });

  // Recent year revenue expenses across various categories.
  const monthsAgo = (n: number) => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - n);
    return d;
  };
  await prisma.expense.createMany({
    data: [
      {
        propertyId: property.id,
        date: monthsAgo(0),
        amount: rand(2_180),
        categoryCode: "RATES_TAXES",
        description: "Municipal rates — current month",
        vendor: "City of Cape Town",
      },
      {
        propertyId: property.id,
        date: monthsAgo(1),
        amount: rand(2_180),
        categoryCode: "RATES_TAXES",
        description: "Municipal rates",
        vendor: "City of Cape Town",
      },
      {
        propertyId: property.id,
        date: monthsAgo(2),
        amount: rand(2_180),
        categoryCode: "RATES_TAXES",
        description: "Municipal rates",
        vendor: "City of Cape Town",
      },
      {
        propertyId: property.id,
        date: monthsAgo(3),
        amount: rand(1_485),
        categoryCode: "LEVIES_NORMAL",
        description: "Body corporate levy",
        vendor: "Sectional title trust",
      },
      {
        propertyId: property.id,
        date: monthsAgo(4),
        amount: rand(1_485),
        categoryCode: "LEVIES_NORMAL",
        description: "Body corporate levy",
        vendor: "Sectional title trust",
      },
      {
        propertyId: property.id,
        date: monthsAgo(5),
        amount: rand(4_300),
        categoryCode: "INSURANCE_BUILDING",
        description: "Annual building insurance",
        vendor: "Hollard",
      },
      {
        propertyId: property.id,
        date: monthsAgo(6),
        amount: rand(2_750),
        categoryCode: "REPAIRS",
        description: "Plumber — geyser leak",
        vendor: "Cape Plumbers",
      },
      {
        propertyId: property.id,
        date: monthsAgo(7),
        amount: rand(950),
        categoryCode: "GARDEN",
        description: "Garden service — between tenants",
        vendor: "Greenfingers CC",
      },
      {
        propertyId: property.id,
        date: monthsAgo(8),
        amount: rand(3_700),
        categoryCode: "AGENT_FEES",
        description: "Letting commission (one month)",
        vendor: "Pam Golding Rentals",
      },
      {
        propertyId: property.id,
        date: monthsAgo(11),
        amount: rand(85_000),
        categoryCode: "IMPROVEMENTS",
        description: "Kitchen refurbishment (capital)",
        vendor: "DIY Renovations",
        isCapital: true,
        isReclaimable: false,
      },
    ],
  });

  console.log("Seeded.");
  console.log(`  Property: ${property.name}`);
  console.log(`  Tenant:   ${tenant.fullName}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

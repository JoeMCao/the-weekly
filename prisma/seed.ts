import { PrismaClient } from "@prisma/client";
import {
  emptyPrinciples,
  emptyReviewMetadata,
  emptyWeeklyReflection,
} from "../lib/principles";
import {
  FIRST_WEEK_START,
  weekStartsFromAnchorThrough,
} from "../lib/week-calendar";
import { weekStartKey } from "../lib/week";

const prisma = new PrismaClient();

async function main() {
  const through = weekStartKey(new Date());
  const keys = weekStartsFromAnchorThrough(through);

  if (keys.length === 0) {
    console.log(
      `No weeks to seed yet — current week is before the anchor (${FIRST_WEEK_START}).`,
    );
    return;
  }

  for (const weekStart of keys) {
    await prisma.weeklyReview.upsert({
      where: { weekStart: new Date(`${weekStart}T00:00:00.000Z`) },
      update: {},
      create: {
        weekStart: new Date(`${weekStart}T00:00:00.000Z`),
        principles: emptyPrinciples(),
        weeklyReflection: emptyWeeklyReflection(),
        reviewMetadata: emptyReviewMetadata(),
      },
    });
  }

  console.log(
    `Seeded ${keys.length} week(s): ${FIRST_WEEK_START} through ${through}.`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

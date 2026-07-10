import { prisma } from "@/lib/prisma";
import {
  dateKeyToUtc,
  isValidDateKey,
  type DateKey,
  utcToDateKey,
} from "@/lib/date";
import { dayKeysForWeek, isDateInWeek } from "@/lib/week";

export type DailyNoteData = {
  noteDate: DateKey;
  content: string;
};

export async function getDailyNotesForWeek(
  weekStart: DateKey,
): Promise<DailyNoteData[]> {
  const days = dayKeysForWeek(weekStart);
  const rows = await prisma.dailyNote.findMany({
    where: { weekStart: dateKeyToUtc(weekStart) },
    orderBy: { noteDate: "asc" },
  });

  const byDate = new Map(
    rows.map((row) => [utcToDateKey(row.noteDate), row.content]),
  );

  return days.map((noteDate) => ({
    noteDate,
    content: byDate.get(noteDate) ?? "",
  }));
}

export async function upsertDailyNote(input: {
  weekStart: DateKey;
  noteDate: DateKey;
  content: string;
}): Promise<DailyNoteData> {
  const { weekStart, noteDate, content } = input;

  if (!isValidDateKey(weekStart) || !isValidDateKey(noteDate)) {
    throw new Error("Invalid date.");
  }
  if (!isDateInWeek(noteDate, weekStart)) {
    throw new Error("Note date is not in this week.");
  }

  const row = await prisma.dailyNote.upsert({
    where: {
      weekStart_noteDate: {
        weekStart: dateKeyToUtc(weekStart),
        noteDate: dateKeyToUtc(noteDate),
      },
    },
    create: {
      weekStart: dateKeyToUtc(weekStart),
      noteDate: dateKeyToUtc(noteDate),
      content,
    },
    update: { content },
  });

  return {
    noteDate: utcToDateKey(row.noteDate),
    content: row.content,
  };
}

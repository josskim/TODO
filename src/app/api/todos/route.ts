import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TodoCategory as TodoCategoryEnum, type TodoCategory } from "@/generated/prisma/client";

async function getOrCreateUser(deviceId: string) {
  const email = `device_${deviceId}@todo.app`;
  return await prisma.user.upsert({
    where: { email },
    create: { email, name: "Device User" },
    update: {},
  });
}

function isTodoCategory(value: unknown): value is TodoCategory {
  return (
    typeof value === "string" &&
    (Object.values(TodoCategoryEnum) as string[]).includes(value)
  );
}

export async function GET(req: NextRequest) {
  try {
    const deviceId = req.headers.get("X-Device-Id");
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }
    const url = new URL(req.url);
    const categoryParam = url.searchParams.get("category");
    const category =
      categoryParam && categoryParam !== "ALL" ? categoryParam : undefined;
    if (category !== undefined && !isTodoCategory(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }
    const user = await getOrCreateUser(deviceId);
    const todos = await prisma.todo.findMany({
      where: { userId: user.id, ...(category ? { category } : {}) },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(todos);
  } catch (err) {
    console.error("[GET /api/todos]", err);
    return NextResponse.json({ error: "Failed to fetch todos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const deviceId = req.headers.get("X-Device-Id");
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }
    const { title, category } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (category !== undefined && !isTodoCategory(category)) {
      return NextResponse.json(
        { error: "Invalid category" },
        { status: 400 }
      );
    }
    const user = await getOrCreateUser(deviceId);
    const todo = await prisma.todo.create({
      data: {
        title: title.trim(),
        userId: user.id,
        ...(category ? { category } : {}),
      },
    });
    return NextResponse.json(todo, { status: 201 });
  } catch (err) {
    console.error("[POST /api/todos]", err);
    return NextResponse.json({ error: "Failed to create todo" }, { status: 500 });
  }
}

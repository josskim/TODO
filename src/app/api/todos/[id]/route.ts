import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

async function getOrCreateUser(deviceId: string) {
  const email = `device_${deviceId}@todo.app`;
  return await prisma.user.upsert({
    where: { email },
    create: { email, name: "Device User" },
    update: {},
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deviceId = req.headers.get("X-Device-Id");
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const { title, completed } = await req.json();

    const user = await getOrCreateUser(deviceId);
    const existing = await prisma.todo.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const todo = await prisma.todo.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(completed !== undefined && { completed }),
      },
    });
    return NextResponse.json(todo);
  } catch (err) {
    console.error("[PATCH /api/todos/:id]", err);
    return NextResponse.json({ error: "Failed to update todo" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const deviceId = req.headers.get("X-Device-Id");
    if (!deviceId) {
      return NextResponse.json({ error: "Device ID required" }, { status: 400 });
    }
    const { id: idStr } = await params;
    const id = parseInt(idStr, 10);
    const user = await getOrCreateUser(deviceId);
    const existing = await prisma.todo.findFirst({
      where: { id, userId: user.id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }
    await prisma.todo.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error("[DELETE /api/todos/:id]", err);
    return NextResponse.json({ error: "Failed to delete todo" }, { status: 500 });
  }
}

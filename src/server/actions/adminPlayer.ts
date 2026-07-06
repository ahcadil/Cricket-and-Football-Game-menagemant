"use server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { str, int } from "@/lib/validators";

async function adminGuard() {
  const sess = await getSession();
  if (!sess || sess.role !== "ADMIN") throw new Error("unauthorized");
  return sess;
}

export async function approvePlayerAction(formData: FormData) {
  const sess = await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const basePrice = int(formData.get("basePrice"), { required: true, min: 0 })!;
  await prisma.playerProfile.update({
    where: { id },
    data: { status: "APPROVED", basePrice, approvedAt: new Date(), approvedById: sess.uid, rejectionNote: null },
  });
  revalidatePath("/admin/players");
  revalidatePath("/players");
}

export async function rejectPlayerAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const note = str(formData.get("note"), { required: true, max: 300 });
  await prisma.playerProfile.update({
    where: { id },
    data: { status: "REJECTED", rejectionNote: note },
  });
  revalidatePath("/admin/players");
}

export async function setBasePriceAction(formData: FormData) {
  await adminGuard();
  const id = str(formData.get("id"), { required: true });
  const basePrice = int(formData.get("basePrice"), { required: true, min: 0 })!;
  await prisma.playerProfile.update({ where: { id }, data: { basePrice } });
  revalidatePath("/admin/players");
}

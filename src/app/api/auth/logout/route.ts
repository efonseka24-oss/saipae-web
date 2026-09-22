import { NextRequest, NextResponse } from "next/server";
import { cerrarSesion } from "@/lib/auth";

export async function POST(request: NextRequest) {
  await cerrarSesion();
  return NextResponse.redirect(new URL("/login", request.url));
}

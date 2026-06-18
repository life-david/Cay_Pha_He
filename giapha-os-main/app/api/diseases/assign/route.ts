import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

export async function GET() {
  const supabase = createClient(await cookies());
  try {
    const { data, error } = await supabase.from("person_diseases").select("*");
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const body = await req.json();
  const { personId, diseaseId } = body;
  const supabase = createClient(await cookies());
  try {
    // upsert by person_id
    const payload = { person_id: personId, disease_id: diseaseId, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("person_diseases").upsert(payload, { onConflict: "person_id" }).select();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data?.[0] ?? null);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { personId } = body;
  const supabase = createClient(await cookies());
  try {
    const { error } = await supabase.from("person_diseases").delete().eq("person_id", personId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

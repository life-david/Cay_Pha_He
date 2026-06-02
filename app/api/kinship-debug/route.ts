import { NextResponse } from 'next/server';
import { getSupabase } from '@/utils/supabase/queries';
import { computeKinship } from '@/utils/kinshipHelpers';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const p1 = url.searchParams.get('p1');
  const p2 = url.searchParams.get('p2');
  const verbose = url.searchParams.get('verbose');
  if (!p1 || !p2) return NextResponse.json({ error: 'missing p1 or p2' }, { status: 400 });

  const supabase = await getSupabase();
  const { data: persons } = await supabase
    .from('persons')
    .select('id, full_name, gender, birth_year, birth_order, generation, is_in_law, avatar_url');
  const { data: relationships } = await supabase
    .from('relationships')
    .select('type, person_a, person_b');

  if (!persons || !relationships) return NextResponse.json({ error: 'no data' }, { status: 500 });

  const personA = persons.find((p: any) => p.id === p1);
  const personB = persons.find((p: any) => p.id === p2);

  // If one or both persons missing, provide diagnostics to help debugging
  if (!personA || !personB) {
    // basic maps
    const parentsMap = new Map<string, string[]>();
    const spousesMap = new Map<string, string[]>();
    for (const r of relationships as any[]) {
      if (r.type === 'biological_child' || r.type === 'adopted_child') {
        const arr = parentsMap.get(r.person_b) ?? [];
        arr.push(r.person_a);
        parentsMap.set(r.person_b, arr);
      }
      if (r.type === 'marriage') {
        const sA = spousesMap.get(r.person_a) ?? [];
        sA.push(r.person_b);
        spousesMap.set(r.person_a, sA);
        const sB = spousesMap.get(r.person_b) ?? [];
        sB.push(r.person_a);
        spousesMap.set(r.person_b, sB);
      }
    }

    const samplePersons = persons.slice(0, 30).map((p: any) => ({ id: p.id, full_name: p.full_name }));

    return NextResponse.json({
      error: 'person not found',
      debug: {
        personsCount: persons.length,
        relationshipsCount: relationships.length,
        searched: { p1, p2 },
        samplePersons,
        spousesOfP1: spousesMap.get(p1) ?? null,
        spousesOfP2: spousesMap.get(p2) ?? null,
      },
    }, { status: 404 });
  }

  const res = computeKinship(personA, personB, persons, relationships);

  if (verbose === 'true') {
    // Build some diagnostics to help debugging
    const parentsMap = new Map<string, string[]>();
    const spousesMap = new Map<string, string[]>();
    for (const r of relationships as any[]) {
      if (r.type === 'biological_child' || r.type === 'adopted_child') {
        const arr = parentsMap.get(r.person_b) ?? [];
        arr.push(r.person_a);
        parentsMap.set(r.person_b, arr);
      }
      if (r.type === 'marriage') {
        const sA = spousesMap.get(r.person_a) ?? [];
        sA.push(r.person_b);
        spousesMap.set(r.person_a, sA);
        const sB = spousesMap.get(r.person_b) ?? [];
        sB.push(r.person_a);
        spousesMap.set(r.person_b, sB);
      }
    }

    const childrenOfA = Array.from(parentsMap.entries())
      .filter(([, ps]) => ps.includes(personA.id))
      .map(([childId]) => ({ id: childId, node: persons.find((p: any) => p.id === childId) }));
    const childrenOfB = Array.from(parentsMap.entries())
      .filter(([, ps]) => ps.includes(personB.id))
      .map(([childId]) => ({ id: childId, node: persons.find((p: any) => p.id === childId) }));

    return NextResponse.json({
      result: res,
      debug: {
        personsCount: persons.length,
        relationshipsCount: relationships.length,
        personAFound: !!personA,
        personBFound: !!personB,
        childrenOfA: childrenOfA,
        childrenOfB: childrenOfB,
        spousesOfA: spousesMap.get(personA.id) ?? [],
        spousesOfB: spousesMap.get(personB.id) ?? [],
      },
    });
  }

  return NextResponse.json({ result: res });
}

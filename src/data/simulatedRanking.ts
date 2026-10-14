export interface SimulatedParticipantRanking {
  name: string;
  points: number;
  exactScores: number;
  outcomeOnly: number;
  errors: number;
  playedCount: number;
}

export interface SimulatedTotalRanking extends SimulatedParticipantRanking {
  pointsGrupos: number;
  pointsFinal: number;
}

/** Troque este número para gerar outra simulação aleatória (estável entre reloads). */
const SIMULATION_SEED = 20261014;

const GROUPS_PLAYED = 72;
const KNOCKOUT_PLAYED = 16;

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function statsFromPoints(
  points: number,
  playedCount: number,
  rng: () => number,
  minExact = 0
): SimulatedParticipantRanking {
  const maxExact = Math.min(Math.floor(points / 3), playedCount);
  let exactScores = Math.max(
    minExact,
    Math.min(maxExact, Math.floor(points * (0.18 + rng() * 0.22)))
  );

  let outcomeOnly = points - exactScores * 3;
  if (outcomeOnly < 0) {
    exactScores = Math.floor(points / 3);
    outcomeOnly = points - exactScores * 3;
  }

  while (exactScores + outcomeOnly > playedCount && exactScores > minExact) {
    exactScores -= 1;
    outcomeOnly += 3;
  }

  if (exactScores + outcomeOnly > playedCount) {
    outcomeOnly = Math.max(0, playedCount - exactScores);
  }

  const errors = Math.max(0, playedCount - exactScores - outcomeOnly);

  return {
    name: "",
    points,
    exactScores,
    outcomeOnly,
    errors,
    playedCount,
  };
}

function splitTotal(total: number, rng: () => number) {
  const groupsShare = 0.58 + rng() * 0.14;
  let pointsGrupos = Math.round(total * groupsShare);
  pointsGrupos = Math.min(total - 8, Math.max(12, pointsGrupos));
  const pointsFinal = total - pointsGrupos;
  return { pointsGrupos, pointsFinal };
}

function hashName(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h;
}

export function getSimulatedLeaderboards(participants: string[]) {
  const rng = mulberry32(SIMULATION_SEED);
  const others = participants.filter((p) => p !== "Zé" && p !== "Bia" && p !== "Karen");

  const used = new Set<number>([90, 100]);
  const otherTotals = new Map<string, number>();

  for (const name of others) {
    let score = 0;
    let guard = 0;
    do {
      score = 28 + Math.floor(rng() * 57); // 28–84
      guard += 1;
    } while (used.has(score) && guard < 80);
    used.add(score);
    otherTotals.set(name, score);
  }

  const totals: Record<string, { total: number; pointsGrupos: number; pointsFinal: number }> = {};

  const zeSplit = splitTotal(100, rng);
  const biaSplit = splitTotal(100, rng);
  const karenSplit = splitTotal(90, rng);

  totals["Zé"] = { total: 100, ...zeSplit };
  totals["Bia"] = { total: 100, ...biaSplit };
  totals["Karen"] = { total: 90, ...karenSplit };

  for (const name of others) {
    totals[name] = { total: otherTotals.get(name)!, ...splitTotal(otherTotals.get(name)!, rng) };
  }

  const groups: SimulatedParticipantRanking[] = participants.map((name) => {
    const t = totals[name];
    const minExact = name === "Zé" ? 18 : name === "Bia" ? 12 : 0;
    const stats = statsFromPoints(t.pointsGrupos, GROUPS_PLAYED, rng, minExact);
    return { ...stats, name };
  });

  const final: SimulatedParticipantRanking[] = participants.map((name) => {
    const t = totals[name];
    const minExact = name === "Zé" ? 8 : name === "Bia" ? 5 : 0;
    const stats = statsFromPoints(t.pointsFinal, KNOCKOUT_PLAYED, rng, minExact);
    return { ...stats, name };
  });

  const byNameGroups = Object.fromEntries(groups.map((p) => [p.name, p]));
  const byNameFinal = Object.fromEntries(final.map((p) => [p.name, p]));

  const sortBoard = <T extends SimulatedParticipantRanking>(board: T[]) =>
    [...board].sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.exactScores !== a.exactScores) return b.exactScores - a.exactScores;
      return b.name.localeCompare(a.name);
    });

  const total: SimulatedTotalRanking[] = sortBoard(
    participants.map((name) => {
      const g = byNameGroups[name];
      const f = byNameFinal[name];
      return {
        name,
        points: g.points + f.points,
        pointsGrupos: g.points,
        pointsFinal: f.points,
        exactScores: g.exactScores + f.exactScores,
        outcomeOnly: g.outcomeOnly + f.outcomeOnly,
        errors: g.errors + f.errors,
        playedCount: g.playedCount + f.playedCount,
      };
    })
  );

  // Garante Zé na frente da Bia no empate de 100 pontos.
  const ze = total.find((p) => p.name === "Zé");
  const bia = total.find((p) => p.name === "Bia");
  if (ze && bia && ze.exactScores <= bia.exactScores) {
    const extra = bia.exactScores - ze.exactScores + 1 + (hashName("Zé") % 2);
    ze.exactScores += extra;
    ze.outcomeOnly = Math.max(0, ze.outcomeOnly - extra);
    const zeFinal = byNameFinal["Zé"];
    zeFinal.exactScores += extra;
    zeFinal.outcomeOnly = Math.max(0, zeFinal.outcomeOnly - extra);
  }

  return {
    groups: sortBoard(groups),
    final: sortBoard(final),
    total: sortBoard(total),
  };
}

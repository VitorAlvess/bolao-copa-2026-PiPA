export interface Team {
  name: string;
  code: string; // ISO 2-letter code for FlagCDN
}

export interface Group {
  name: string; // e.g., 'Grupo A'
  teams: Team[];
}

export interface Match {
  id: string; // Unique match identifier, e.g. "A_1_1" (Group_Round_MatchIndex)
  groupName: string;
  round: number; // 1, 2, or 3
  homeTeam: Team;
  awayTeam: Team;
}

// 48 seleções divididas nos 12 grupos oficiais da Copa do Mundo 2026
export const groupsData: Group[] = [
  {
    name: "Grupo A",
    teams: [
      { name: "México", code: "mx" },
      { name: "África do Sul", code: "za" },
      { name: "Coreia do Sul", code: "kr" },
      { name: "República Tcheca", code: "cz" }
    ]
  },
  {
    name: "Grupo B",
    teams: [
      { name: "Canadá", code: "ca" },
      { name: "Bósnia e Herz.", code: "ba" },
      { name: "Catar", code: "qa" },
      { name: "Suíça", code: "ch" }
    ]
  },
  {
    name: "Grupo C",
    teams: [
      { name: "Brasil", code: "br" },
      { name: "Marrocos", code: "ma" },
      { name: "Haiti", code: "ht" },
      { name: "Escócia", code: "gb-sct" }
    ]
  },
  {
    name: "Grupo D",
    teams: [
      { name: "Estados Unidos", code: "us" },
      { name: "Paraguai", code: "py" },
      { name: "Austrália", code: "au" },
      { name: "Turquia", code: "tr" }
    ]
  },
  {
    name: "Grupo E",
    teams: [
      { name: "Alemanha", code: "de" },
      { name: "Curaçao", code: "cw" },
      { name: "Costa do Marfim", code: "ci" },
      { name: "Equador", code: "ec" }
    ]
  },
  {
    name: "Grupo F",
    teams: [
      { name: "Holanda", code: "nl" },
      { name: "Japão", code: "jp" },
      { name: "Suécia", code: "se" },
      { name: "Tunísia", code: "tn" }
    ]
  },
  {
    name: "Grupo G",
    teams: [
      { name: "Bélgica", code: "be" },
      { name: "Egito", code: "eg" },
      { name: "Irã", code: "ir" },
      { name: "Nova Zelândia", code: "nz" }
    ]
  },
  {
    name: "Grupo H",
    teams: [
      { name: "Espanha", code: "es" },
      { name: "Cabo Verde", code: "cv" },
      { name: "Arábia Saudita", code: "sa" },
      { name: "Uruguai", code: "uy" }
    ]
  },
  {
    name: "Grupo I",
    teams: [
      { name: "França", code: "fr" },
      { name: "Senegal", code: "sn" },
      { name: "Iraque", code: "iq" },
      { name: "Noruega", code: "no" }
    ]
  },
  {
    name: "Grupo J",
    teams: [
      { name: "Argentina", code: "ar" },
      { name: "Argélia", code: "dz" },
      { name: "Áustria", code: "at" },
      { name: "Jordânia", code: "jo" }
    ]
  },
  {
    name: "Grupo K",
    teams: [
      { name: "Colômbia", code: "co" },
      { name: "RD Congo", code: "cd" },
      { name: "Portugal", code: "pt" },
      { name: "Uzbequistão", code: "uz" }
    ]
  },
  {
    name: "Grupo L",
    teams: [
      { name: "Croácia", code: "hr" },
      { name: "Inglaterra", code: "gb-eng" },
      { name: "Gana", code: "gh" },
      { name: "Panamá", code: "pa" }
    ]
  }
];

// Gera programaticamente a lista de 72 partidas da fase de grupos
export const generateMatches = (): Match[] => {
  const matches: Match[] = [];

  groupsData.forEach((group) => {
    const [t0, t1, t2, t3] = group.teams;
    const groupId = group.name.replace("Grupo ", ""); // e.g. "A"

    // Rodada 1
    matches.push({
      id: `${groupId}_1_1`,
      groupName: group.name,
      round: 1,
      homeTeam: t0,
      awayTeam: t1
    });
    matches.push({
      id: `${groupId}_1_2`,
      groupName: group.name,
      round: 1,
      homeTeam: t2,
      awayTeam: t3
    });

    // Rodada 2
    matches.push({
      id: `${groupId}_2_1`,
      groupName: group.name,
      round: 2,
      homeTeam: t0,
      awayTeam: t2
    });
    matches.push({
      id: `${groupId}_2_2`,
      groupName: group.name,
      round: 2,
      homeTeam: t1,
      awayTeam: t3
    });

    // Rodada 3
    matches.push({
      id: `${groupId}_3_1`,
      groupName: group.name,
      round: 3,
      homeTeam: t0,
      awayTeam: t3
    });
    matches.push({
      id: `${groupId}_3_2`,
      groupName: group.name,
      round: 3,
      homeTeam: t1,
      awayTeam: t2
    });
  });

  // Corrige os números de rodadas para os Grupos K e L para bater com o calendário oficial da FIFA
  // de forma que mantenha os IDs originais do banco de dados (preservando palpites já preenchidos)
  matches.forEach((match) => {
    // Grupo K: 1 -> 2, 2 -> 3, 3 -> 1
    if (match.id.startsWith("K_")) {
      if (match.id.startsWith("K_1_")) {
        match.round = 2;
      } else if (match.id.startsWith("K_2_")) {
        match.round = 3;
      } else if (match.id.startsWith("K_3_")) {
        match.round = 1;
      }
    }
    // Grupo L: 2 <-> 3
    if (match.id.startsWith("L_")) {
      if (match.id.startsWith("L_2_")) {
        match.round = 3;
      } else if (match.id.startsWith("L_3_")) {
        match.round = 2;
      }
    }
  });

  // Ordena os jogos por grupo e depois de forma cronológica por rodada (1, 2, 3)
  return matches.sort((a, b) => {
    const groupCompare = a.groupName.localeCompare(b.groupName);
    if (groupCompare !== 0) return groupCompare;
    return a.round - b.round;
  });
};

export const matchesList = generateMatches();

// Lista oficial dos amigos do bolão
export const participants = [
  "Ale",
  "Gustavo",
  "Leticia",
  "Bah",
  "Bia",
  "Dani",
  "Denys",
  "Drica",
  "Emilly",
  "Heloisa",
  "Karen",
  "Rafa",
  "Stella",
  "Valeria",
  "Vitoria",
  "Zé",
  "Carli",
  "Janaina",
  "Marjory"
];

// Dicionário de fotos de perfil personalizadas para cada participante (opcional)
// Usamos a API do DiceBear para gerar ilustrações vetoriais modernas e personalizadas para cada participante
export const participantAvatars: Record<string, string> = {
  "Ale": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ale",
  "Gustavo": "https://api.dicebear.com/7.x/adventurer/svg?seed=Gustavo",
  "Leticia": "https://api.dicebear.com/7.x/adventurer/svg?seed=Leticia",
  "Bah": "https://api.dicebear.com/7.x/adventurer/svg?seed=Bah",
  "Bia": "https://api.dicebear.com/7.x/adventurer/svg?seed=Bia",
  "Dani": "https://api.dicebear.com/7.x/adventurer/svg?seed=Dani",
  "Denys": "https://api.dicebear.com/7.x/adventurer/svg?seed=Denys",
  "Drica": "https://api.dicebear.com/7.x/adventurer/svg?seed=Drica",
  "Emilly": "https://api.dicebear.com/7.x/adventurer/svg?seed=Emilly",
  "Heloisa": "https://api.dicebear.com/7.x/adventurer/svg?seed=Heloisa",
  "Karen": "https://api.dicebear.com/7.x/adventurer/svg?seed=Karen",
  "Rafa": "https://api.dicebear.com/7.x/adventurer/svg?seed=Rafa",
  "Stella": "https://api.dicebear.com/7.x/adventurer/svg?seed=Stella",
  "Valeria": "https://api.dicebear.com/7.x/adventurer/svg?seed=Valeria",
  "Vitoria": "https://api.dicebear.com/7.x/adventurer/svg?seed=Vitoria",
  "Zé": "https://api.dicebear.com/7.x/adventurer/svg?seed=Ze",
  "Carli": "https://api.dicebear.com/7.x/adventurer/svg?seed=Carli",
  "Janaina": "https://api.dicebear.com/7.x/adventurer/svg?seed=Janaina",
  "Marjory": "https://api.dicebear.com/7.x/adventurer/svg?seed=Marjory"
};

// Obtém URL da bandeira a partir do código do país no FlagCDN
export const getFlagUrl = (code: string): string => {
  // FlagCDN usa códigos minúsculos
  const cleanCode = code.toLowerCase();
  return `https://flagcdn.com/w40/${cleanCode}.png`;
};

// Data oficial do início do bolão (UTC-3). Jogos que acontecem antes desta data não pontuam.
// Jogos anteriores a hoje (13 de junho de 2026) são excluídos.
export const BOLAO_START_DATE = new Date("2026-06-13T00:00:00-03:00");

// Converte data no formato "MM/DD/YYYY HH:MM" da Copa do Mundo para objeto Date
export const parseMatchDate = (dateStr: string): Date => {
  const [datePart, timePart] = dateStr.split(" ");
  const [month, day, year] = datePart.split("/");
  const [hour, minute] = timePart.split(":");
  // Como as datas estão no fuso de São Paulo (UTC-3), criamos a data em UTC
  // somando 3 horas ao valor para obter o timestamp absoluto correspondente.
  const utcTime = Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour) + 3, Number(minute));
  return new Date(utcTime);
};

// Verifica se a partida aconteceu antes do início do bolão
export const isMatchExcluded = (matchDateStr: string | undefined): boolean => {
  if (!matchDateStr) return false;
  try {
    const matchDate = parseMatchDate(matchDateStr);
    return matchDate < BOLAO_START_DATE;
  } catch (e) {
    return false;
  }
};

export interface KnockoutMatchConfig {
  id: string;
  groupName: string;
  stage: string;
  homeLabel: string;
  awayLabel: string;
  dateStr: string;
}

export const knockoutMatchesConfig: KnockoutMatchConfig[] = [
  {
    id: "73",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "South Africa",
    awayLabel: "Canada",
    dateStr: "06/28/2026 16:00"
  },
  {
    id: "74",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Germany",
    awayLabel: "Paraguay",
    dateStr: "06/29/2026 17:30"
  },
  {
    id: "75",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Netherlands",
    awayLabel: "Morocco",
    dateStr: "06/29/2026 22:00"
  },
  {
    id: "76",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Brazil",
    awayLabel: "Japan",
    dateStr: "06/29/2026 14:00"
  },
  {
    id: "77",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "France",
    awayLabel: "Sweden",
    dateStr: "06/30/2026 18:00"
  },
  {
    id: "78",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Ivory Coast",
    awayLabel: "Norway",
    dateStr: "06/30/2026 14:00"
  },
  {
    id: "79",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Mexico",
    awayLabel: "Ecuador",
    dateStr: "06/30/2026 22:00"
  },
  {
    id: "80",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "England",
    awayLabel: "Democratic Republic of the Congo",
    dateStr: "07/01/2026 13:00"
  },
  {
    id: "81",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "United States",
    awayLabel: "Bosnia and Herzegovina",
    dateStr: "07/01/2026 21:00"
  },
  {
    id: "82",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Belgium",
    awayLabel: "Senegal",
    dateStr: "07/01/2026 17:00"
  },
  {
    id: "83",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Portugal",
    awayLabel: "Croatia",
    dateStr: "07/02/2026 20:00"
  },
  {
    id: "84",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Spain",
    awayLabel: "Austria",
    dateStr: "07/02/2026 16:00"
  },
  {
    id: "85",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Switzerland",
    awayLabel: "Algeria",
    dateStr: "07/03/2026 00:00"
  },
  {
    id: "86",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Argentina",
    awayLabel: "Cape Verde",
    dateStr: "07/03/2026 19:00"
  },
  {
    id: "87",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Colombia",
    awayLabel: "Ghana",
    dateStr: "07/03/2026 22:30"
  },
  {
    id: "88",
    groupName: "Dezesseis-avos (R32)",
    stage: "R32",
    homeLabel: "Australia",
    awayLabel: "Egypt",
    dateStr: "07/03/2026 15:00"
  },
  {
    id: "89",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/04/2026 18:00"
  },
  {
    id: "90",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/04/2026 14:00"
  },
  {
    id: "91",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/05/2026 17:00"
  },
  {
    id: "92",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/05/2026 21:00"
  },
  {
    id: "93",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/06/2026 16:00"
  },
  {
    id: "94",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/06/2026 21:00"
  },
  {
    id: "95",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/07/2026 13:00"
  },
  {
    id: "96",
    groupName: "Oitavas de Final (R16)",
    stage: "R16",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/07/2026 17:00"
  },
  {
    id: "97",
    groupName: "Quartas de Final (QF)",
    stage: "QF",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/09/2026 17:00"
  },
  {
    id: "98",
    groupName: "Quartas de Final (QF)",
    stage: "QF",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/10/2026 16:00"
  },
  {
    id: "99",
    groupName: "Quartas de Final (QF)",
    stage: "QF",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/11/2026 18:00"
  },
  {
    id: "100",
    groupName: "Quartas de Final (QF)",
    stage: "QF",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/11/2026 22:00"
  },
  {
    id: "101",
    groupName: "Semifinal (SF)",
    stage: "SF",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/14/2026 16:00"
  },
  {
    id: "102",
    groupName: "Semifinal (SF)",
    stage: "SF",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/15/2026 16:00"
  },
  {
    id: "103",
    groupName: "Disputa de 3º Lugar",
    stage: "3RD",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/18/2026 18:00"
  },
  {
    id: "104",
    groupName: "Final",
    stage: "FINAL",
    homeLabel: "A definir",
    awayLabel: "A definir",
    dateStr: "07/19/2026 16:00"
  }
];

export const allTeamsList = groupsData.flatMap(g => g.teams).sort((a, b) => a.name.localeCompare(b.name));



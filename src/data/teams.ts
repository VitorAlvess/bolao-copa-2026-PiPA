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
  "Emilly",
  "Heloisa",
  "Karen",
  "Stella",
  "Valeria",
  "Zé"
];

// Dicionário de fotos de perfil personalizadas para cada participante (opcional)
// Para usar imagens locais (Opção 2): salve a imagem na pasta 'public/avatars/'
// e defina o caminho como "/avatars/nome.extensao" (Ex: "/avatars/cris.jpg")
export const participantAvatars: Record<string, string> = {
  "Ale": "/avatars/ale.jpg",
  "Gustavo": "/avatars/gustavo.jpg",
  "Leticia": "/avatars/leticia.jpg",
  "Bah": "/avatars/bah.jpg",
  "Bia": "/avatars/bia.jpg",
  "Dani": "/avatars/dani.jpg",
  "Denys": "/avatars/denys.jpg",
  "Emilly": "/avatars/emilly.jpg",
  "Heloisa": "/avatars/heloisa.jpg",
  "Karen": "/avatars/karen.jpg",
  "Stella": "/avatars/stella.jpg",
  "Valeria": "/avatars/valeria.jpg",
  "Zé": "/avatars/ze.jpg"
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
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute));
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


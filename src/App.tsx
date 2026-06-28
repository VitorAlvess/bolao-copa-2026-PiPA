import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  FileText, 
  Settings, 
  Save, 
  Lock, 
  Unlock,
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Crown,
  Eye,
  X
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { 
  participants, 
  matchesList, 
  getFlagUrl, 
  participantAvatars, 
  groupsData, 
  isMatchExcluded, 
  parseMatchDate, 
  type Match,
  knockoutMatchesConfig,
  allTeamsList
} from "./data/teams";

const getSaoPauloDate = (localDateStr: string, stadiumIdStr: string): string => {
  if (!localDateStr) return "";
  const [datePart, timePart] = localDateStr.split(" ");
  const [month, day, year] = datePart.split("/").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);
  
  const sId = Number(stadiumIdStr);
  let offset = 0;
  
  if ([1, 2, 3].includes(sId)) {
    offset = -6; // Mexico
  } else if ([4, 5, 6].includes(sId)) {
    offset = -5; // US Central
  } else if ([7, 8, 9, 10, 11, 12].includes(sId)) {
    offset = -4; // US Eastern
  } else if ([13, 14, 15, 16].includes(sId)) {
    offset = -7; // US Pacific
  } else {
    offset = -4;
  }
  
  const utcTime = Date.UTC(year, month - 1, day, hours - offset, minutes);
  const spTime = new Date(utcTime - (3 * 60 * 60 * 1000));
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  const spMonth = pad(spTime.getUTCMonth() + 1);
  const spDay = pad(spTime.getUTCDate());
  const spYear = spTime.getUTCFullYear();
  const spHours = pad(spTime.getUTCHours());
  const spMinutes = pad(spTime.getUTCMinutes());
  
  return `${spMonth}/${spDay}/${spYear} ${spHours}:${spMinutes}`;
};

interface KnockoutMatch extends Match {
  stage: string;
  homeLabel: string;
  awayLabel: string;
  dateStr: string;
}

// Tipagens do App
interface Score {
  home: number | null;
  away: number | null;
}

type GuessesData = Record<string, any>; // match_id -> Score ou cup_champion -> string
type AllParticipantsGuesses = Record<string, GuessesData>; // username -> GuessesData

interface ParticipantRanking {
  name: string;
  points: number;
  exactScores: number; // Acertos de placar cheio (3 pontos)
  outcomeOnly: number; // Acertos de apenas vencedor/empate (1 ponto)
  errors: number;      // Erros totais
  playedCount: number; // Quantidade de jogos que já aconteceram e têm palpite
}

// Mapeamento dos nomes em inglês retornados pela API para os nomes em português do bolão
const teamNameMapping: Record<string, string> = {
  "Mexico": "México",
  "South Africa": "África do Sul",
  "South Korea": "Coreia do Sul",
  "Czech Republic": "República Tcheca",
  "Canada": "Canadá",
  "Bosnia and Herzegovina": "Bósnia e Herz.",
  "Qatar": "Catar",
  "Switzerland": "Suíça",
  "Brazil": "Brasil",
  "Morocco": "Marrocos",
  "Haiti": "Haiti",
  "Scotland": "Escócia",
  "United States": "Estados Unidos",
  "Paraguay": "Paraguai",
  "Australia": "Austrália",
  "Turkey": "Turquia",
  "Germany": "Alemanha",
  "Curaçao": "Curaçao",
  "Ivory Coast": "Costa do Marfim",
  "Ecuador": "Equador",
  "Netherlands": "Holanda",
  "Japan": "Japão",
  "Sweden": "Suécia",
  "Tunisia": "Tunísia",
  "Belgium": "Bélgica",
  "Egypt": "Egito",
  "Iran": "Irã",
  "New Zealand": "Nova Zelândia",
  "Spain": "Espanha",
  "Cape Verde": "Cabo Verde",
  "Saudi Arabia": "Arábia Saudita",
  "Uruguay": "Uruguai",
  "France": "França",
  "Senegal": "Senegal",
  "Iraq": "Iraque",
  "Norway": "Noruega",
  "Argentina": "Argentina",
  "Algeria": "Argélia",
  "Austria": "Áustria",
  "Jordan": "Jordânia",
  "Portugal": "Portugal",
  "Democratic Republic of the Congo": "RD Congo",
  "England": "Inglaterra",
  "Croatia": "Croácia",
  "Uzbekistan": "Uzbequistão",
  "Colombia": "Colômbia",
  "Ghana": "Gana",
  "Panama": "Panamá"
};

// Datas e horários oficiais das 72 partidas da fase de grupos (API)
const defaultMatchDates: Record<string, string> = {
  "A_1_1": "06/11/2026 16:00",
  "A_1_2": "06/11/2026 23:00",
  "A_2_1": "06/18/2026 22:00",
  "A_2_2": "06/18/2026 13:00",
  "A_3_1": "06/24/2026 22:00",
  "A_3_2": "06/24/2026 22:00",
  "B_1_1": "06/12/2026 16:00",
  "B_1_2": "06/13/2026 16:00",
  "B_2_1": "06/18/2026 19:00",
  "B_2_2": "06/18/2026 16:00",
  "B_3_1": "06/24/2026 16:00",
  "B_3_2": "06/24/2026 16:00",
  "C_1_1": "06/13/2026 19:00",
  "C_1_2": "06/13/2026 22:00",
  "C_2_1": "06/19/2026 22:00",
  "C_2_2": "06/19/2026 19:00",
  "C_3_1": "06/24/2026 19:00",
  "C_3_2": "06/24/2026 19:00",
  "D_1_1": "06/12/2026 22:00",
  "D_1_2": "06/14/2026 01:00",
  "D_2_1": "06/19/2026 16:00",
  "D_2_2": "06/20/2026 00:00",
  "D_3_1": "06/25/2026 23:00",
  "D_3_2": "06/25/2026 23:00",
  "E_1_1": "06/14/2026 14:00",
  "E_1_2": "06/14/2026 20:00",
  "E_2_1": "06/20/2026 17:00",
  "E_2_2": "06/20/2026 21:00",
  "E_3_1": "06/25/2026 17:00",
  "E_3_2": "06/25/2026 17:00",
  "F_1_1": "06/14/2026 17:00",
  "F_1_2": "06/14/2026 23:00",
  "F_2_1": "06/20/2026 14:00",
  "F_2_2": "06/21/2026 01:00",
  "F_3_1": "06/25/2026 20:00",
  "F_3_2": "06/25/2026 20:00",
  "G_1_1": "06/15/2026 16:00",
  "G_1_2": "06/15/2026 22:00",
  "G_2_1": "06/21/2026 16:00",
  "G_2_2": "06/21/2026 22:00",
  "G_3_1": "06/27/2026 00:00",
  "G_3_2": "06/27/2026 00:00",
  "H_1_1": "06/15/2026 13:00",
  "H_1_2": "06/15/2026 19:00",
  "H_2_1": "06/21/2026 13:00",
  "H_2_2": "06/21/2026 19:00",
  "H_3_1": "06/26/2026 21:00",
  "H_3_2": "06/26/2026 21:00",
  "I_1_1": "06/16/2026 16:00",
  "I_1_2": "06/16/2026 19:00",
  "I_2_1": "06/22/2026 18:00",
  "I_2_2": "06/22/2026 21:00",
  "I_3_1": "06/26/2026 16:00",
  "I_3_2": "06/26/2026 16:00",
  "J_1_1": "06/16/2026 22:00",
  "J_1_2": "06/17/2026 01:00",
  "J_2_1": "06/22/2026 14:00",
  "J_2_2": "06/23/2026 00:00",
  "J_3_1": "06/27/2026 23:00",
  "J_3_2": "06/27/2026 23:00",
  "K_1_1": "06/23/2026 23:00",
  "K_1_2": "06/23/2026 14:00",
  "K_2_1": "06/27/2026 20:30",
  "K_2_2": "06/27/2026 20:30",
  "K_3_1": "06/17/2026 23:00",
  "K_3_2": "06/17/2026 14:00",
  "L_1_1": "06/17/2026 17:00",
  "L_1_2": "06/17/2026 20:00",
  "L_2_1": "06/27/2026 18:00",
  "L_2_2": "06/27/2026 18:00",
  "L_3_1": "06/23/2026 20:00",
  "L_3_2": "06/23/2026 17:00"
};

const formatMatchDate = (dateStr: string | undefined): string => {
  if (!dateStr) return "";
  const parts = dateStr.split(" ");
  const dateParts = parts[0].split("/");
  if (dateParts.length < 3) return dateStr;
  
  const day = dateParts[1];
  const month = dateParts[0];
  const time = parts[1] || "";
  
  const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const monthName = months[parseInt(month) - 1] || month;
  
  return `${day} de ${monthName}${time ? ` às ${time}` : ""}`;
};

const resolveKnockoutMatches = (apiGames: any[]): KnockoutMatch[] => {
  return knockoutMatchesConfig.map((config) => {
    const apiGame = apiGames.find(g => g.id === config.id);
    if (!apiGame) {
      return {
        id: config.id,
        groupName: config.groupName,
        round: 4,
        stage: config.stage,
        homeLabel: config.homeLabel,
        awayLabel: config.awayLabel,
        dateStr: config.dateStr,
        homeTeam: { name: config.homeLabel, code: "" },
        awayTeam: { name: config.awayLabel, code: "" }
      };
    }
    
    // Resolve home team
    let homeTeam: { name: string; code: string } = { name: config.homeLabel, code: "" };
    if (apiGame.home_team_name_en && apiGame.home_team_name_en !== "null" && apiGame.home_team_name_en !== "0") {
      const ptName = teamNameMapping[apiGame.home_team_name_en] || apiGame.home_team_name_en;
      const found = allTeamsList.find(t => t.name.toLowerCase() === ptName.toLowerCase());
      homeTeam = found || { name: ptName, code: "" };
    }
    
    // Resolve away team
    let awayTeam: { name: string; code: string } = { name: config.awayLabel, code: "" };
    if (apiGame.away_team_name_en && apiGame.away_team_name_en !== "null" && apiGame.away_team_name_en !== "0") {
      const ptName = teamNameMapping[apiGame.away_team_name_en] || apiGame.away_team_name_en;
      const found = allTeamsList.find(t => t.name.toLowerCase() === ptName.toLowerCase());
      awayTeam = found || { name: ptName, code: "" };
    }
    
    return {
      id: config.id,
      groupName: config.groupName,
      round: 4,
      stage: config.stage,
      homeLabel: config.homeLabel,
      awayLabel: config.awayLabel,
      dateStr: apiGame.local_date || config.dateStr,
      homeTeam,
      awayTeam
    };
  });
};

export default function App() {
  // Controle de Abas
  const [activeTab, setActiveTab] = useState<"ranking_final" | "palpites_final" | "grupos" | "gabarito">("ranking_final");
  const [gruposSubTab, setGruposSubTab] = useState<"ranking_grupos" | "palpites_grupos" | "tabela_grupos">("ranking_grupos");
  const [adminSubTab, setAdminSubTab] = useState<"gabarito_final" | "gabarito_grupos">("gabarito_final");
  
  // Mata-Mata Resolved Matches
  const [knockoutMatches, setKnockoutMatches] = useState<KnockoutMatch[]>(() => {
    return knockoutMatchesConfig.map(config => ({
      id: config.id,
      groupName: config.groupName,
      round: 4,
      stage: config.stage,
      homeLabel: config.homeLabel,
      awayLabel: config.awayLabel,
      dateStr: config.dateStr,
      homeTeam: { name: config.homeLabel, code: "" },
      awayTeam: { name: config.awayLabel, code: "" }
    }));
  });

  const [knockoutStageFilter, setKnockoutStageFilter] = useState<string | "all">("all");
  const [viewMode, setViewMode] = useState<"grade" | "chaveamento">("chaveamento");
  const [modalPhase, setModalPhase] = useState<"final" | "grupos">("final");
  const [bracketTab, setBracketTab] = useState<"R32" | "R16" | "QF" | "SF" | "FINAL">("R32");

  // Resolve os confrontos de mata-mata de forma encadeada para o palpite do usuário
  const getUserKnockoutMatches = (username: string): KnockoutMatch[] => {
    const resolvedMatches = [...knockoutMatches];
    const userGuesses = allGuesses[username] || {};

    const getPredictedWinner = (matchId: string): { name: string; code: string } | null => {
      const match = resolvedMatches.find(m => m.id === matchId);
      if (!match) return null;

      // Se o jogo já acabou na vida real, usa o resultado oficial
      const real = gabarito[matchId];
      if (real && real.home !== null && real.away !== null) {
        if (real.home > real.away) return match.homeTeam;
        if (real.away > real.home) return match.awayTeam;
        const officialWinnerName = gabarito[`WINNER_${matchId}`];
        if (officialWinnerName) {
          return match.homeTeam.name === officialWinnerName ? match.homeTeam : match.awayTeam;
        }
      }

      // Senão, usa o palpite do usuário
      const guess = userGuesses[matchId];
      const clickedWinner = userGuesses[`WINNER_${matchId}`];

      if (clickedWinner) {
        if (match.homeTeam.name === clickedWinner) return match.homeTeam;
        if (match.awayTeam.name === clickedWinner) return match.awayTeam;
      }

      if (guess && guess.home !== null && guess.away !== null) {
        if (guess.home > guess.away) return match.homeTeam;
        if (guess.away > guess.home) return match.awayTeam;
      }

      return null;
    };

    const resolveTeamLabel = (label: string): { name: string; code: string } => {
      if (label.startsWith("Winner Match ")) {
        const parentId = label.replace("Winner Match ", "").trim();
        const winner = getPredictedWinner(parentId);
        if (winner && winner.code !== "") return winner;
      } else if (label.startsWith("Loser Match ")) {
        const parentId = label.replace("Loser Match ", "").trim();
        const match = resolvedMatches.find(m => m.id === parentId);
        const winner = getPredictedWinner(parentId);
        if (match && winner && winner.code !== "") {
          return match.homeTeam.name === winner.name ? match.awayTeam : match.homeTeam;
        }
      }
      return { name: label, code: "" };
    };

    for (let i = 89; i <= 104; i++) {
      const idx = resolvedMatches.findIndex(m => m.id === String(i));
      if (idx !== -1) {
        const match = resolvedMatches[idx];
        let homeTeam = { ...match.homeTeam };
        let awayTeam = { ...match.awayTeam };

        if (homeTeam.code === "") {
          homeTeam = resolveTeamLabel(match.homeLabel);
        }
        if (awayTeam.code === "") {
          awayTeam = resolveTeamLabel(match.awayLabel);
        }

        resolvedMatches[idx] = {
          ...match,
          homeTeam,
          awayTeam
        };
      }
    }

    return resolvedMatches;
  };

  // Resolve os confrontos de mata-mata de forma encadeada para o gabarito oficial (Admin)
  const getOfficialKnockoutMatches = (): KnockoutMatch[] => {
    const resolvedMatches = [...knockoutMatches];

    const getOfficialWinner = (matchId: string): { name: string; code: string } | null => {
      const match = resolvedMatches.find(m => m.id === matchId);
      if (!match) return null;

      const real = gabarito[matchId];
      const clickedWinner = gabarito[`WINNER_${matchId}`];

      if (clickedWinner) {
        if (match.homeTeam.name === clickedWinner) return match.homeTeam;
        if (match.awayTeam.name === clickedWinner) return match.awayTeam;
      }

      if (real && real.home !== null && real.away !== null) {
        if (real.home > real.away) return match.homeTeam;
        if (real.away > real.home) return match.awayTeam;
      }

      return null;
    };

    const resolveTeamLabel = (label: string): { name: string; code: string } => {
      if (label.startsWith("Winner Match ")) {
        const parentId = label.replace("Winner Match ", "").trim();
        const winner = getOfficialWinner(parentId);
        if (winner && winner.code !== "") return winner;
      } else if (label.startsWith("Loser Match ")) {
        const parentId = label.replace("Loser Match ", "").trim();
        const match = resolvedMatches.find(m => m.id === parentId);
        const winner = getOfficialWinner(parentId);
        if (match && winner && winner.code !== "") {
          return match.homeTeam.name === winner.name ? match.awayTeam : match.homeTeam;
        }
      }
      return { name: label, code: "" };
    };

    for (let i = 89; i <= 104; i++) {
      const idx = resolvedMatches.findIndex(m => m.id === String(i));
      if (idx !== -1) {
        const match = resolvedMatches[idx];
        let homeTeam = { ...match.homeTeam };
        let awayTeam = { ...match.awayTeam };

        if (homeTeam.code === "") {
          homeTeam = resolveTeamLabel(match.homeLabel);
        }
        if (awayTeam.code === "") {
          awayTeam = resolveTeamLabel(match.awayLabel);
        }

        resolvedMatches[idx] = {
          ...match,
          homeTeam,
          awayTeam
        };
      }
    }

    return resolvedMatches;
  };

  // Retorna qual fase do mata-mata está ativa (com jogos reais pendentes no gabarito)
  const getActiveStage = (): string => {
    // 16-avos (R32)
    const r32Matches = knockoutMatches.filter(m => m.stage === "R32");
    const hasPendingR32 = r32Matches.some(m => {
      const real = gabarito[m.id];
      return !real || real.home === null || real.away === null;
    });
    if (hasPendingR32) return "R32";

    // Oitavas (R16)
    const r16Matches = knockoutMatches.filter(m => m.stage === "R16");
    const hasPendingR16 = r16Matches.some(m => {
      const real = gabarito[m.id];
      return !real || real.home === null || real.away === null;
    });
    if (hasPendingR16) return "R16";

    // Quartas (QF)
    const qfMatches = knockoutMatches.filter(m => m.stage === "QF");
    const hasPendingQF = qfMatches.some(m => {
      const real = gabarito[m.id];
      return !real || real.home === null || real.away === null;
    });
    if (hasPendingQF) return "QF";

    // Semifinais (SF)
    const sfMatches = knockoutMatches.filter(m => m.stage === "SF");
    const hasPendingSF = sfMatches.some(m => {
      const real = gabarito[m.id];
      return !real || real.home === null || real.away === null;
    });
    if (hasPendingSF) return "SF";

    return "FINAL";
  };
  
  // Usuário selecionado (Tela de Palpites)
  const [selectedUser, setSelectedUser] = useState<string>(participants[0]);
  
  // Filtro de rodadas na visualização de jogos
  const [roundFilter, setRoundFilter] = useState<number | "all" | "today">("all");
  const [groupFilter, setGroupFilter] = useState<string | "all">("all");

  // Dados do Banco
  const [gabarito, setGabarito] = useState<GuessesData>({});
  const [allGuesses, setAllGuesses] = useState<AllParticipantsGuesses>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [matchDates, setMatchDates] = useState<Record<string, string>>(defaultMatchDates);
  
  // Controle de Edições (para mostrar barra de salvamento)
  const [tempGuesses, setTempGuesses] = useState<GuessesData>({});
  const [tempGabarito, setTempGabarito] = useState<GuessesData>({});
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Controle de Trava de Palpites
  const [guessesLocked, setGuessesLocked] = useState<boolean>(false);
  const [tempGuessesLocked, setTempGuessesLocked] = useState<boolean>(false);

  // Detalhamento de palpites por usuário
  const [selectedDetailUser, setSelectedDetailUser] = useState<string | null>(null);
  const [modalFilter, setModalFilter] = useState<"all" | "exact" | "outcome" | "zero" | "pending">("all");

  const closeDetailModal = () => {
    setSelectedDetailUser(null);
    setModalFilter("all");
  };

  // Ordenação dos Jogos (por grupo ou data/hora)
  const [sortBy, setSortBy] = useState<"group" | "date">("group");

  // Controle de Admin
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem("bolao_admin_auth") === "true";
  });
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [showAdminLogin, setShowAdminLogin] = useState<boolean>(false);

  // Toast Notifications
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Busca os resultados reais dos jogos da API pública e sincroniza com o banco de dados
  const checkAndSyncApiResults = async (dbGabarito: GuessesData, isLocked: boolean) => {
    try {
      let response;
      try {
        // Tenta buscar diretamente da API
        response = await fetch("https://worldcup26.ir/get/games");
      } catch (directErr) {
        console.warn("Busca direta falhou devido a CORS ou rede, tentando via proxy allorigins...", directErr);
        // Fallback usando o proxy allorigins.win
        response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent("https://worldcup26.ir/get/games")}`);
      }

      if (!response.ok) {
        throw new Error(`Erro na requisição da API: status ${response.status}`);
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.games)) {
        throw new Error("Formato de dados retornado pela API inválido.");
      }

      // Atualiza as datas dos jogos com base nos dados mais recentes da API e resolve mata-mata
      const datesMap: Record<string, string> = { ...defaultMatchDates };
      data.games.forEach((apiGame: any) => {
        if (apiGame.id && apiGame.local_date) {
          const groupMatch = matchesList.find(
            (m) =>
              m.groupName === `Grupo ${apiGame.group}` &&
              ((m.homeTeam.name === teamNameMapping[apiGame.home_team_name_en] && m.awayTeam.name === teamNameMapping[apiGame.away_team_name_en]) ||
               (m.homeTeam.name === teamNameMapping[apiGame.away_team_name_en] && m.awayTeam.name === teamNameMapping[apiGame.home_team_name_en]))
          );
          let finalDate = apiGame.local_date;
          if (Number(apiGame.id) >= 73 && apiGame.stadium_id) {
            finalDate = getSaoPauloDate(apiGame.local_date, apiGame.stadium_id.toString());
          }
          if (groupMatch) {
            datesMap[groupMatch.id] = finalDate;
          } else {
            datesMap[apiGame.id] = finalDate;
          }
        }
      });
      setMatchDates(datesMap);

      const resolved = resolveKnockoutMatches(data.games);
      setKnockoutMatches(resolved);

      // Filtra apenas jogos finalizados
      const finishedGames = data.games.filter((g: any) => g.finished === "TRUE");
      
      if (finishedGames.length === 0) {
        return;
      }

      const updatedGabarito = { ...dbGabarito };
      let hasNewScores = false;

      finishedGames.forEach((apiGame: any) => {
        const apiHomeScore = apiGame.home_score !== null && apiGame.home_score !== "null" ? parseInt(apiGame.home_score) : null;
        const apiAwayScore = apiGame.away_score !== null && apiGame.away_score !== "null" ? parseInt(apiGame.away_score) : null;

        if (apiHomeScore !== null && apiAwayScore !== null && !isNaN(apiHomeScore) && !isNaN(apiAwayScore)) {
          const gameIdNum = parseInt(apiGame.id);
          if (gameIdNum >= 73 && gameIdNum <= 104) {
            // Mata-mata (ID >= 73)
            const current = dbGabarito[apiGame.id] || { home: null, away: null };
            if (current.home !== apiHomeScore || current.away !== apiAwayScore) {
              updatedGabarito[apiGame.id] = { home: apiHomeScore, away: apiAwayScore };
              hasNewScores = true;
            }
          } else {
            // Fase de grupos
            const homeEng = apiGame.home_team_name_en;
            const awayEng = apiGame.away_team_name_en;
            const homePt = teamNameMapping[homeEng] || homeEng;
            const awayPt = teamNameMapping[awayEng] || awayEng;

            const matchingMatch = matchesList.find(
              (m) =>
                m.groupName === `Grupo ${apiGame.group}` &&
                ((m.homeTeam.name === homePt && m.awayTeam.name === awayPt) ||
                 (m.homeTeam.name === awayPt && m.awayTeam.name === homePt))
            );

            if (matchingMatch) {
              const isReversed = matchingMatch.homeTeam.name === awayPt;
              const homeScore = isReversed ? apiAwayScore : apiHomeScore;
              const awayScore = isReversed ? apiHomeScore : apiAwayScore;

              const current = dbGabarito[matchingMatch.id] || { home: null, away: null };
              if (current.home !== homeScore || current.away !== awayScore) {
                updatedGabarito[matchingMatch.id] = { home: homeScore, away: awayScore };
                hasNewScores = true;
              }
            }
          }
        }
      });

      if (hasNewScores) {
        // 1. Atualiza o estado local imediatamente
        setGabarito(updatedGabarito);
        setTempGabarito(updatedGabarito);
        
        // 2. Salva no banco de dados Supabase em segundo plano
        const { error } = await supabase
          .from("gabarito")
          .upsert({
            id: 1,
            results: updatedGabarito,
            guesses_locked: isLocked,
            updated_at: new Date().toISOString()
          });

        if (error) {
          console.error("Erro ao salvar gabarito atualizado automaticamente:", error);
        } else {
          showToast("🏆 Resultados da Copa atualizados em tempo real!", "success");
        }
      }
    } catch (err: any) {
      console.warn("Sincronização em segundo plano não pôde ser concluída:", err);
    }
  };

  // Inicialização: buscar dados do Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Buscar Gabarito
      const { data: gabaritoData, error: gabaritoError } = await supabase
        .from("gabarito")
        .select("results, guesses_locked")
        .eq("id", 1)
        .single();

      if (gabaritoError && gabaritoError.code !== "PGRST116") {
        throw gabaritoError;
      }
      
      const realResults = gabaritoData?.results || {};
      const locked = gabaritoData?.guesses_locked || false;
      
      setGabarito(realResults);
      setTempGabarito(realResults);
      setGuessesLocked(locked);
      setTempGuessesLocked(locked);

      // 2. Buscar Palpites de Todos os Participantes
      const { data: guessesData, error: guessesError } = await supabase
        .from("user_guesses")
        .select("username, guesses");

      if (guessesError) throw guessesError;

      const formattedGuesses: AllParticipantsGuesses = {};
      participants.forEach(p => {
        formattedGuesses[p] = {};
      });

      guessesData?.forEach((row: { username: string; guesses: GuessesData }) => {
        if (participants.includes(row.username)) {
          formattedGuesses[row.username] = row.guesses || {};
        }
      });

      setAllGuesses(formattedGuesses);

      // Inicializar rascunho temporário do usuário selecionado
      setTempGuesses(formattedGuesses[selectedUser] || {});
      setHasChanges(false);

      // 3. Buscar jogos da API para resolver times do mata-mata e datas
      let apiGames: any[] = [];
      try {
        let response;
        try {
          response = await fetch("https://worldcup26.ir/get/games");
        } catch (directErr) {
          response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent("https://worldcup26.ir/get/games")}`);
        }
        if (response.ok) {
          const apiData = await response.json();
          if (apiData && Array.isArray(apiData.games)) {
            apiGames = apiData.games;
            
            const datesMap: Record<string, string> = { ...defaultMatchDates };
            apiData.games.forEach((apiGame: any) => {
              if (apiGame.id && apiGame.local_date) {
                const groupMatch = matchesList.find(
                  (m) =>
                    m.groupName === `Grupo ${apiGame.group}` &&
                    ((m.homeTeam.name === teamNameMapping[apiGame.home_team_name_en] && m.awayTeam.name === teamNameMapping[apiGame.away_team_name_en]) ||
                     (m.homeTeam.name === teamNameMapping[apiGame.away_team_name_en] && m.awayTeam.name === teamNameMapping[apiGame.home_team_name_en]))
                );
                let finalDate = apiGame.local_date;
                if (Number(apiGame.id) >= 73 && apiGame.stadium_id) {
                  finalDate = getSaoPauloDate(apiGame.local_date, apiGame.stadium_id.toString());
                }
                if (groupMatch) {
                  datesMap[groupMatch.id] = finalDate;
                } else {
                  datesMap[apiGame.id] = finalDate;
                }
              }
            });
            setMatchDates(datesMap);
          }
        }
      } catch (apiErr) {
        console.warn("Could not fetch API games on init, using config defaults:", apiErr);
      }

      const resolved = resolveKnockoutMatches(apiGames);
      setKnockoutMatches(resolved);

      // Executa a sincronização em segundo plano após o carregamento inicial
      setTimeout(() => {
        checkAndSyncApiResults(realResults, locked);
      }, 0);
    } catch (err: any) {
      console.error("Erro ao carregar dados do banco:", err);
      showToast("Erro ao conectar com o banco de dados.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sincronizar o rascunho temporário de palpites quando o usuário selecionado mudar
  useEffect(() => {
    if (allGuesses[selectedUser]) {
      setTempGuesses(allGuesses[selectedUser]);
      setHasChanges(false);
    }
  }, [selectedUser, allGuesses]);

  // Função para exibir Toast
  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3000);
  };

  // Lógica de cálculo de pontos por partida
  const calculateMatchPoints = (guess: Score | undefined, real: Score | undefined): { points: number; type: "exact" | "outcome" | "zero" | "none" } => {
    if (!real || real.home === null || real.away === null || real.home === undefined || real.away === undefined) {
      return { points: 0, type: "none" }; // Jogo ainda não aconteceu
    }
    if (!guess || guess.home === null || guess.away === null || guess.home === undefined || guess.away === undefined) {
      return { points: 0, type: "zero" }; // Participante não palpitou neste jogo
    }

    const guessHome = Number(guess.home);
    const guessAway = Number(guess.away);
    const realHome = Number(real.home);
    const realAway = Number(real.away);

    const guessSign = Math.sign(guessHome - guessAway); // 1 = casa vence, -1 = fora vence, 0 = empate
    const realSign = Math.sign(realHome - realAway);

    const isCorrectOutcome = guessSign === realSign;
    const isExactScore = guessHome === realHome && guessAway === realAway;

    if (isExactScore) {
      return { points: 3, type: "exact" }; // Placar exato (3 pts)
    } else if (isCorrectOutcome) {
      return { points: 1, type: "outcome" }; // Vencedor ou empate correto, mas placar diferente (1 pt)
    }

    return { points: 0, type: "zero" }; // Errou tudo
  };

  // Processa a classificação da Fase Final
  const getLeaderboardFinal = (): ParticipantRanking[] => {
    const leaderboard: ParticipantRanking[] = participants.map((name) => {
      const userGuesses = allGuesses[name] || {};
      let points = 0;
      let exactScores = 0;
      let outcomeOnly = 0;
      let errors = 0;
      let playedCount = 0;

      knockoutMatches.forEach((match) => {
        const guess = userGuesses[match.id];
        const real = gabarito[match.id];
        
        const result = calculateMatchPoints(guess, real);
        
        if (result.type !== "none") {
          playedCount++;
          points += result.points;
          if (result.type === "exact") {
            exactScores++;
          } else if (result.type === "outcome") {
            outcomeOnly++;
          } else if (result.type === "zero") {
            errors++;
          }
        }
      });

      // Bônus de Campeão (+5 pontos)
      const userChamp = userGuesses["cup_champion"];
      const realChamp = gabarito["cup_champion"];
      if (userChamp && realChamp && userChamp === realChamp) {
        points += 5;
      }

      // Bônus de Vice-Campeão (+3 pontos)
      const userSecond = userGuesses["cup_second"];
      const realSecond = gabarito["cup_second"];
      if (userSecond && realSecond && userSecond === realSecond) {
        points += 3;
      }

      // Bônus de Terceiro Lugar (+2 pontos)
      const userThird = userGuesses["cup_third"];
      const realThird = gabarito["cup_third"];
      if (userThird && realThird && userThird === realThird) {
        points += 2;
      }

      return {
        name,
        points,
        exactScores,
        outcomeOnly,
        errors,
        playedCount
      };
    });

    // Ordenação: 1º Pontos, 2º Placar Cheio (Desempate), 3º Nome Alfabético
    return leaderboard.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.exactScores !== a.exactScores) {
        return b.exactScores - a.exactScores;
      }
      return a.name.localeCompare(b.name);
    });
  };

  // Processa a classificação da Fase de Grupos
  const getLeaderboardGroups = (): ParticipantRanking[] => {
    const leaderboard: ParticipantRanking[] = participants.map((name) => {
      const userGuesses = allGuesses[name] || {};
      let points = 0;
      let exactScores = 0;
      let outcomeOnly = 0;
      let errors = 0;
      let playedCount = 0;

      matchesList.forEach((match) => {
        // Ignora jogos que ocorreram antes do início oficial do bolão
        if (isMatchExcluded(matchDates[match.id])) {
          return;
        }

        const guess = userGuesses[match.id];
        const real = gabarito[match.id];
        
        const result = calculateMatchPoints(guess, real);
        
        if (result.type !== "none") {
          playedCount++;
          points += result.points;
          if (result.type === "exact") {
            exactScores++;
          } else if (result.type === "outcome") {
            outcomeOnly++;
          } else if (result.type === "zero") {
            errors++;
          }
        }
      });

      return {
        name,
        points,
        exactScores,
        outcomeOnly,
        errors,
        playedCount
      };
    });

    // Ordenação: 1º Pontos, 2º Placar Cheio (Desempate), 3º Nome Alfabético
    return leaderboard.sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.exactScores !== a.exactScores) {
        return b.exactScores - a.exactScores;
      }
      return a.name.localeCompare(b.name);
    });
  };

  // Trata alteração no palpite do Pódio da Copa (1º, 2º ou 3º lugares)
  const handlePodiumChange = (place: "first" | "second" | "third", teamName: string, type: "palpite" | "gabarito") => {
    const key = place === "first" ? "cup_champion" : place === "second" ? "cup_second" : "cup_third";
    if (type === "palpite") {
      const updated = {
        ...tempGuesses,
        [key]: teamName === "" ? null : teamName
      };
      setTempGuesses(updated);
    } else {
      const updated = {
        ...tempGabarito,
        [key]: teamName === "" ? null : teamName
      };
      setTempGabarito(updated);
    }
    setHasChanges(true);
  };

  // Trata o bloqueio voluntário/manual de um palpite
  const handleToggleManualLock = (matchId: string) => {
    const guess = tempGuesses[matchId] || allGuesses[selectedUser]?.[matchId];
    if (!guess || guess.home === null || guess.away === null) {
      showToast("Preencha o palpite antes de travar!", "error");
      return;
    }
    
    setTempGuesses(prev => {
      const key = `MANUAL_LOCKED_${matchId}`;
      const isLocked = prev[key] === true || (prev[key] === undefined && allGuesses[selectedUser]?.[key] === true);
      const updated = {
        ...prev,
        [key]: !isLocked
      };
      return updated;
    });
    setHasChanges(true);
  };

  // Trata o clique em um time para avançar na árvore
  const handleTeamClick = (matchId: string, teamName: string, type: "palpite" | "gabarito") => {
    if (type === "gabarito") {
      if (!isAdminAuthenticated) return;
      const match = knockoutMatches.find(m => m.id === matchId);
      if (!match || match.homeTeam.code === "" || match.awayTeam.code === "") return;
      
      const currentWinner = tempGabarito[`WINNER_${matchId}`] || gabarito[`WINNER_${matchId}`] || "";
      const newWinner = currentWinner === teamName ? "" : teamName;
      
      setTempGabarito(prev => ({
        ...prev,
        [`WINNER_${matchId}`]: newWinner
      }));
      setHasChanges(true);
    } else {
      const started = isMatchStarted(matchId);
      const isManuallyLocked = tempGuesses[`MANUAL_LOCKED_${matchId}`] === true || (tempGuesses[`MANUAL_LOCKED_${matchId}`] === undefined && allGuesses[selectedUser]?.[`MANUAL_LOCKED_${matchId}`] === true);
      const isLocked = started || guessesLocked || isManuallyLocked;
      if (isLocked) return;
      
      const match = getUserKnockoutMatches(selectedUser).find(m => m.id === matchId);
      // Só permite clique em time quando os times reais já foram divulgados
      if (!match || match.homeTeam.code === "" || match.awayTeam.code === "") return;
      
      const currentWinner = tempGuesses[`WINNER_${matchId}`] || allGuesses[selectedUser]?.[`WINNER_${matchId}`] || "";
      const newWinner = currentWinner === teamName ? "" : teamName;
      
      setTempGuesses(prev => ({
        ...prev,
        [`WINNER_${matchId}`]: newWinner
      }));
      setHasChanges(true);
    }
  };

  // Trata alterações nos inputs de placar (Palpites ou Gabarito)
  const handleScoreChange = (
    matchId: string,
    field: "home" | "away",
    value: string,
    type: "palpite" | "gabarito"
  ) => {
    const numericValue = value === "" ? null : parseInt(value);
    if (numericValue !== null && (isNaN(numericValue) || numericValue < 0)) return;

    if (type === "palpite") {
      const updated = {
        ...tempGuesses,
        [matchId]: {
          ...(tempGuesses[matchId] || { home: null, away: null }),
          [field]: numericValue
        }
      };
      setTempGuesses(updated);
    } else {
      const updated = {
        ...tempGabarito,
        [matchId]: {
          ...(tempGabarito[matchId] || { home: null, away: null }),
          [field]: numericValue
        }
      };
      setTempGabarito(updated);
    }
    setHasChanges(true);
  };

  // Salva os palpites no Supabase
  const saveUserGuesses = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("user_guesses")
        .upsert({
          username: selectedUser,
          guesses: tempGuesses,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setAllGuesses((prev) => ({
        ...prev,
        [selectedUser]: tempGuesses
      }));
      setHasChanges(false);
      showToast(`Palpites de ${selectedUser} salvos com sucesso!`, "success");
    } catch (err) {
      console.error("Erro ao salvar palpites:", err);
      showToast("Não foi possível salvar os palpites.", "error");
    } finally {
      setSaving(false);
    }
  };



  // Salva o gabarito oficial no Supabase
  const saveGabarito = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("gabarito")
        .upsert({
          id: 1,
          results: tempGabarito,
          guesses_locked: tempGuessesLocked,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setGabarito(tempGabarito);
      setGuessesLocked(tempGuessesLocked);
      setHasChanges(false);
      showToast("Gabarito Oficial atualizado com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao salvar gabarito:", err);
      showToast("Não foi possível salvar os resultados.", "error");
    } finally {
      setSaving(false);
    }
  };

  // Autenticação simples para administrador
  const [handleAdminLogin] = [
    (e: React.FormEvent) => {
      e.preventDefault();
      // Senha simples de acesso ao Gabarito
      if (adminPassword === "copa2026") {
        setIsAdminAuthenticated(true);
        localStorage.setItem("bolao_admin_auth", "true");
        setAdminPassword("");
        setShowAdminLogin(false);
        showToast("Acesso de Administrador liberado!", "success");
      } else {
        showToast("Senha incorreta!", "error");
      }
    }
  ];

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem("bolao_admin_auth");
    setShowAdminLogin(false);
    showToast("Sessão administrativa encerrada.", "success");
  };

  // Descarta alterações temporárias
  const discardChanges = () => {
    if (activeTab === "palpites_final" || activeTab === "grupos") {
      setTempGuesses(allGuesses[selectedUser] || {});
    } else if (activeTab === "gabarito") {
      setTempGabarito(gabarito);
      setTempGuessesLocked(guessesLocked);
    }
    setHasChanges(false);
    showToast("Alterações descartadas.", "success");
  };

  const isPodiumLocked = (): boolean => {
    // Fuso de São Paulo (GMT-3). Prazo: 28/06/2026 às 23:59:59.
    // Em UTC, isso é 29/06/2026 às 02:59:59 (pois BRT é UTC-3).
    const deadline = new Date("2026-06-29T02:59:59Z");
    const now = new Date();
    return now >= deadline;
  };

  const isMatchToday = (matchId: string): boolean => {
    const dateStr = matchDates[matchId];
    if (!dateStr) return false;
    try {
      const matchDate = parseMatchDate(dateStr);
      const today = new Date();
      
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);
      
      const isToday = (
        matchDate.getDate() === today.getDate() &&
        matchDate.getMonth() === today.getMonth() &&
        matchDate.getFullYear() === today.getFullYear()
      );
      
      const isTomorrow = (
        matchDate.getDate() === tomorrow.getDate() &&
        matchDate.getMonth() === tomorrow.getMonth() &&
        matchDate.getFullYear() === tomorrow.getFullYear()
      );
      
      return isToday || isTomorrow;
    } catch (e) {
      return false;
    }
  };

  const isMatchStarted = (matchId: string): boolean => {
    const dateStr = matchDates[matchId];
    if (!dateStr) return false;
    try {
      const matchDate = parseMatchDate(dateStr);
      const now = new Date();
      return now >= matchDate;
    } catch (e) {
      return false;
    }
  };

  // Filtra as partidas com base nos seletores de rodada e grupo (e oculta as excluídas)
  const getFilteredMatches = (): Match[] => {
    return matchesList.filter((match) => {
      if (isMatchExcluded(matchDates[match.id])) {
        return false;
      }
      
      if (roundFilter === "today") {
        if (!isMatchToday(match.id)) {
          return false;
        }
      } else {
        const matchRound = roundFilter === "all" || match.round === roundFilter;
        if (!matchRound) return false;
      }
      
      const matchGroup = groupFilter === "all" || match.groupName.endsWith(groupFilter);
      return matchGroup;
    });
  };

  const filteredMatches = getFilteredMatches();
  const sortedFilteredMatches = sortBy === "date"
    ? [...filteredMatches].sort((a, b) => {
        const dateA = matchDates[a.id] ? parseMatchDate(matchDates[a.id]).getTime() : 0;
        const dateB = matchDates[b.id] ? parseMatchDate(matchDates[b.id]).getTime() : 0;
        return dateA - dateB;
      })
    : filteredMatches;
  const rankingFinal = getLeaderboardFinal();
  const rankingGroups = getLeaderboardGroups();
  const activeRanking = (activeTab === "ranking_final" || activeTab === "palpites_final") ? rankingFinal : rankingGroups;
  const topThree = activeRanking.slice(0, 3);

  // Calcula a classificação de um grupo específico
  const getGroupStandings = (groupLetter: string, guesses: Record<string, Score>) => {
    const groupName = `Grupo ${groupLetter}`;
    const group = groupsData.find((g) => g.name === groupName);
    if (!group) return [];

    const stats: Record<string, {
      name: string;
      code: string;
      points: number;
      played: number;
      won: number;
      drawn: number;
      lost: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }> = {};

    group.teams.forEach((team) => {
      stats[team.name] = {
        name: team.name,
        code: team.code,
        points: 0,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0
      };
    });

    const groupMatches = matchesList.filter((m) => m.groupName === groupName);

    groupMatches.forEach((match) => {
      // Prioriza o resultado real do gabarito para os jogos que já aconteceram
      const realResult = gabarito[match.id];
      const hasRealResult = realResult && realResult.home !== null && realResult.away !== null;
      const score = hasRealResult ? realResult : guesses[match.id];
      
      if (score && score.home !== null && score.away !== null) {
        const home = score.home;
        const away = score.away;

        const homeTeam = stats[match.homeTeam.name];
        const awayTeam = stats[match.awayTeam.name];

        if (homeTeam && awayTeam) {
          homeTeam.played++;
          awayTeam.played++;
          homeTeam.goalsFor += home;
          homeTeam.goalsAgainst += away;
          awayTeam.goalsFor += away;
          awayTeam.goalsAgainst += home;

          if (home > away) {
            homeTeam.points += 3;
            homeTeam.won++;
            awayTeam.lost++;
          } else if (away > home) {
            awayTeam.points += 3;
            awayTeam.won++;
            homeTeam.lost++;
          } else {
            homeTeam.points += 1;
            awayTeam.points += 1;
            homeTeam.drawn++;
            awayTeam.drawn++;
          }
        }
      }
    });

    const standingsList = Object.values(stats).map((team) => {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
      return team;
    });

    return standingsList.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });
  };

  // Lista dos grupos disponíveis (A a L) para o filtro
  const groupLetters = Array.from({ length: 12 }, (_, i) => String.fromCharCode(65 + i));

  // Renderizador unificado para cartões de jogos do Mata-Mata
  const renderKnockoutMatchCard = (match: KnockoutMatch, type: "palpite" | "gabarito") => {
    const started = isMatchStarted(match.id);
    // isDecided: apenas indica se os times reais já foram divulgados pela API.
    // NÃO bloqueia palpites — o usuário pode palpitar mesmo antes dos times serem definidos.
    const isDecided = match.homeTeam.code !== "" && match.awayTeam.code !== "";
    
    // Bloqueio voluntário (cadeado)
    const isManuallyLocked = type === "palpite" && (
      tempGuesses[`MANUAL_LOCKED_${match.id}`] === true ||
      (tempGuesses[`MANUAL_LOCKED_${match.id}`] === undefined && allGuesses[selectedUser]?.[`MANUAL_LOCKED_${match.id}`] === true)
    );

    // Palpites liberados até o jogo começar, independentemente de os times estarem definidos ou não.
    const isLocked = type === "gabarito" 
      ? !isAdminAuthenticated 
      : (started || guessesLocked || isManuallyLocked);
    
    const guess = type === "palpite" 
      ? (tempGuesses[match.id] || { home: null, away: null })
      : (tempGabarito[match.id] || { home: null, away: null });
      
    const realResult = gabarito[match.id];
    
    // Para visualização de palpites, calcula pontos se o jogo já aconteceu
    const pointsResult = type === "palpite" 
      ? calculateMatchPoints(guess, realResult)
      : { points: 0, type: "none" };

    // Vencedor selecionado (para destaque visual no Flat Design e clonagem)
    const selectedWinner = type === "palpite"
      ? (tempGuesses[`WINNER_${match.id}`] || allGuesses[selectedUser]?.[`WINNER_${match.id}`] || (
          guess && guess.home !== null && guess.away !== null && guess.home !== guess.away
            ? (guess.home > guess.away ? match.homeTeam.name : match.awayTeam.name)
            : ""
        ))
      : (tempGabarito[`WINNER_${match.id}`] || gabarito[`WINNER_${match.id}`] || (
          guess && guess.home !== null && guess.away !== null && guess.home !== guess.away
            ? (guess.home > guess.away ? match.homeTeam.name : match.awayTeam.name)
            : ""
        ));

    return (
      <div key={match.id} className={`match-card ${isLocked ? "locked-match" : ""}`} style={{ opacity: isLocked ? 0.9 : 1 }}>
        <div className="match-header">
          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            {match.groupName}
            {started && <Lock size={12} style={{ color: "var(--error)" }} />}
          </span>
          
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {/* Botão de Cadeado Manual */}
            {type === "palpite" && !started && (
              <button
                type="button"
                onClick={() => handleToggleManualLock(match.id)}
                className="lock-toggle-btn"
                title={isManuallyLocked ? "Desbloquear palpite" : "Travar palpite para não alterar por engano"}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  color: isManuallyLocked ? "var(--secondary)" : "var(--text-muted)",
                  transition: "color 0.2s"
                }}
              >
                {isManuallyLocked ? <Lock size={15} /> : <Unlock size={15} style={{ opacity: 0.5 }} />}
              </button>
            )}

            {type === "palpite" ? (
              !isDecided ? null : started ? (
                <span className="points-badge" style={{ background: "rgba(239, 68, 68, 0.12)", color: "var(--error)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                  Jogo Iniciado
                </span>
              ) : pointsResult.type !== "none" && (
                <span className={`points-badge ${pointsResult.type}`}>
                  {pointsResult.points} {pointsResult.points === 1 ? "Ponto" : "Pontos"}
                </span>
              )
            ) : (
              !isDecided ? null : (
                <span style={{ color: isAdminAuthenticated ? "var(--secondary)" : "var(--primary)", fontWeight: 700, fontSize: "0.75rem" }}>
                  Gabarito Oficial
                </span>
              )
            )}
          </div>
        </div>
        
        <div className="match-body">
          {/* Time de Casa */}
          <div 
            className={`team-container home ${selectedWinner === match.homeTeam.name ? "selected-winner" : ""}`}
            onClick={() => handleTeamClick(match.id, match.homeTeam.name, type)}
            style={{ cursor: (type === "palpite" && !isLocked && isDecided) ? "pointer" : (type === "gabarito" && isAdminAuthenticated && match.homeTeam.code !== "") ? "pointer" : "default" }}
          >
            {match.homeTeam.code ? (
              <img
                src={getFlagUrl(match.homeTeam.code)}
                alt={match.homeTeam.name}
                className="flag-icon"
              />
            ) : (
              <div className="flag-placeholder">?</div>
            )}
            <span className="team-name" title={match.homeTeam.name}>
              {match.homeTeam.name}
            </span>
          </div>

          {/* Inputs do Placar */}
          <div className="score-container">
            <input
              type="number"
              className="score-input"
              style={type === "gabarito" ? { borderColor: isAdminAuthenticated ? "rgba(139, 239, 26, 0.4)" : "rgba(255,255,255,0.05)" } : undefined}
              min="0"
              placeholder="-"
              value={guess.home ?? ""}
              onChange={(e) =>
                handleScoreChange(match.id, "home", e.target.value, type)
              }
              disabled={isLocked}
            />
            <span className="score-divider">x</span>
            <input
              type="number"
              className="score-input"
              style={type === "gabarito" ? { borderColor: isAdminAuthenticated ? "rgba(139, 239, 26, 0.4)" : "rgba(255,255,255,0.05)" } : undefined}
              min="0"
              placeholder="-"
              value={guess.away ?? ""}
              onChange={(e) =>
                handleScoreChange(match.id, "away", e.target.value, type)
              }
              disabled={isLocked}
            />
          </div>

          {/* Time Visitante */}
          <div 
            className={`team-container away ${selectedWinner === match.awayTeam.name ? "selected-winner" : ""}`}
            onClick={() => handleTeamClick(match.id, match.awayTeam.name, type)}
            style={{ cursor: (type === "palpite" && !isLocked && isDecided) ? "pointer" : (type === "gabarito" && isAdminAuthenticated && match.awayTeam.code !== "") ? "pointer" : "default" }}
          >
            {match.awayTeam.code ? (
              <img
                src={getFlagUrl(match.awayTeam.code)}
                alt={match.awayTeam.name}
                className="flag-icon"
              />
            ) : (
              <div className="flag-placeholder">?</div>
            )}
            <span className="team-name" title={match.awayTeam.name}>
              {match.awayTeam.name}
            </span>
          </div>
        </div>

        {/* Alerta de Empate (Necessidade de escolher classificado) */}
        {type === "palpite" && guess.home !== null && guess.away !== null && guess.home === guess.away && !tempGuesses[`WINNER_${match.id}`] && !allGuesses[selectedUser]?.[`WINNER_${match.id}`] && (
          <div className="tie-warning" style={{ fontSize: "0.6rem", color: "#f59e0b", textAlign: "center", marginTop: "4px", fontWeight: 700 }}>
            ⚠️ Clique em um time para avançá-lo!
          </div>
        )}
        {type === "gabarito" && isAdminAuthenticated && guess.home !== null && guess.away !== null && guess.home === guess.away && !tempGabarito[`WINNER_${match.id}`] && !gabarito[`WINNER_${match.id}`] && (
          <div className="tie-warning" style={{ fontSize: "0.6rem", color: "#f59e0b", textAlign: "center", marginTop: "4px", fontWeight: 700 }}>
            ⚠️ Clique para definir o classificado!
          </div>
        )}

        {/* Data e hora do jogo */}
        {matchDates[match.id] && (
          <div className="match-date-info">
            📅 {formatMatchDate(matchDates[match.id])}
          </div>
        )}

        {/* Informação sobre o gabarito oficial */}
        {type === "palpite" && realResult && realResult.home !== null && realResult.away !== null && (
          <div className="gabarito-score-info">
            Resultado Real: <strong>{realResult.home} x {realResult.away}</strong>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          {toast.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <div className="header-badge">
          {activeTab === "grupos" ? "Fase de Grupos (Histórico)" : "Fase Final (Mata-Mata)"}
        </div>
        <h1 className="app-title">🏆 Bolão do PiPA copa 2026</h1>
        <p className="app-subtitle">Será que o Zé vai ganhar?</p>
        {(activeTab === "ranking_final" || activeTab === "grupos") && (
          <div className="print-user-title print-only">
            Classificação Geral
          </div>
        )}
        {(activeTab === "palpites_final" || activeTab === "grupos") && (
          <div className="print-user-title print-only">
            {participantAvatars[selectedUser] && (
              <img 
                src={participantAvatars[selectedUser]} 
                alt={selectedUser} 
                className="print-avatar"
              />
            )}
            <span>Palpites de {selectedUser}</span>
          </div>
        )}
        {activeTab === "gabarito" && (
          <div className="print-user-title print-only">
            Gabarito Oficial
          </div>
        )}
      </header>

      {/* Navegação por Abas */}
      <nav className="tabs-navigation">
        <button 
          className={`tab-btn ${activeTab === "ranking_final" ? "active" : ""}`}
          onClick={() => {
            if (hasChanges) {
              if (confirm("Você tem alterações não salvas. Deseja mudar de aba e perder as edições?")) {
                setHasChanges(false);
                setActiveTab("ranking_final");
              }
            } else {
              setActiveTab("ranking_final");
            }
          }}
        >
          <Trophy size={18} />
          Classificação (Mata-Mata)
        </button>
        <button 
          className={`tab-btn ${activeTab === "palpites_final" ? "active" : ""}`}
          onClick={() => {
            if (hasChanges) {
              if (confirm("Você tem alterações não salvas. Deseja mudar de aba e perder as edições?")) {
                setHasChanges(false);
                setActiveTab("palpites_final");
              }
            } else {
              setActiveTab("palpites_final");
            }
          }}
        >
          <FileText size={18} />
          Meus Palpites (Mata-Mata)
        </button>
        <button 
          className={`tab-btn ${activeTab === "grupos" ? "active" : ""}`}
          onClick={() => {
            if (hasChanges) {
              if (confirm("Você tem alterações não salvas. Deseja mudar de aba e perder as edições?")) {
                setHasChanges(false);
                setActiveTab("grupos");
              }
            } else {
              setActiveTab("grupos");
            }
          }}
        >
          <Crown size={18} />
          Fase de Grupos
        </button>
        <button 
          className={`tab-btn ${activeTab === "gabarito" ? "active" : ""}`}
          onClick={() => {
            if (hasChanges) {
              if (confirm("Você tem alterações não salvas. Deseja mudar de aba e perder as edições?")) {
                setHasChanges(false);
                setActiveTab("gabarito");
              }
            } else {
              setActiveTab("gabarito");
            }
          }}
        >
          <Settings size={18} />
          Gabarito (Admin)
        </button>
      </nav>

      {loading ? (
        <div className="loader-container">
          <div className="loader"></div>
          <p style={{ color: "var(--text-muted)", fontWeight: "500" }}>Carregando dados do bolão...</p>
        </div>
      ) : (
        <>
          {/* ABA 1: CLASSIFICAÇÃO / RANKING (FASE FINAL) */}
          {activeTab === "ranking_final" && (
            <div className="ranking-container">
              <div className="pdf-actions no-print">
                <button className="pdf-btn" onClick={() => window.print()}>
                  <FileText size={16} />
                  Salvar PDF da Classificação
                </button>
              </div>
              
              {/* Podium Visual (Para Top 3 - Fase Final) */}
              <div className="podium-section">
                {/* 2º Lugar */}
                {topThree[1] && (() => {
                  const userGuesses = allGuesses[topThree[1].name] || {};
                  const userChamp = userGuesses["cup_champion"];
                  const userSecond = userGuesses["cup_second"];
                  const userThird = userGuesses["cup_third"];
                  const champTeam = userChamp ? allTeamsList.find(t => t.name === userChamp) : null;
                  const secondTeam = userSecond ? allTeamsList.find(t => t.name === userSecond) : null;
                  const thirdTeam = userThird ? allTeamsList.find(t => t.name === userThird) : null;
                  
                  return (
                    <div className="podium-card second">
                      <div className="podium-avatar" style={{ padding: participantAvatars[topThree[1].name] ? "0" : undefined }}>
                        {participantAvatars[topThree[1].name] ? (
                          <img src={participantAvatars[topThree[1].name]} alt={topThree[1].name} className="avatar-img" />
                        ) : (
                          topThree[1].name.substring(0, 2).toUpperCase()
                        )}
                        <span className="badge-place">2</span>
                      </div>
                      <h3 className="podium-name">{topThree[1].name}</h3>
                      <p className="podium-points">{topThree[1].points} pts</p>
                      <p className="podium-stats">{topThree[1].exactScores} placares exatos</p>
                      
                      {/* Pódio de Palpite do Participante */}
                      {(userChamp || userSecond || userThird) && (
                        <div className="user-podium-badges" style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "10px" }}>
                          {userChamp && (
                            <span className="mini-podium-badge first" title={`1º Lugar (Campeão): ${userChamp}`}>
                              👑 {champTeam?.code ? (
                                <img src={getFlagUrl(champTeam.code)} alt={userChamp} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                          {userSecond && (
                            <span className="mini-podium-badge second" title={`2º Lugar (Vice): ${userSecond}`}>
                              🥈 {secondTeam?.code ? (
                                <img src={getFlagUrl(secondTeam.code)} alt={userSecond} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                          {userThird && (
                            <span className="mini-podium-badge third" title={`3º Lugar: ${userThird}`}>
                              🥉 {thirdTeam?.code ? (
                                <img src={getFlagUrl(thirdTeam.code)} alt={userThird} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 1º Lugar */}
                {topThree[0] && (() => {
                  const userGuesses = allGuesses[topThree[0].name] || {};
                  const userChamp = userGuesses["cup_champion"];
                  const userSecond = userGuesses["cup_second"];
                  const userThird = userGuesses["cup_third"];
                  const champTeam = userChamp ? allTeamsList.find(t => t.name === userChamp) : null;
                  const secondTeam = userSecond ? allTeamsList.find(t => t.name === userSecond) : null;
                  const thirdTeam = userThird ? allTeamsList.find(t => t.name === userThird) : null;
                  
                  return (
                    <div className="podium-card first">
                      <Crown className="crown-icon" />
                      <div className="podium-avatar" style={{ padding: participantAvatars[topThree[0].name] ? "0" : undefined }}>
                        {participantAvatars[topThree[0].name] ? (
                          <img src={participantAvatars[topThree[0].name]} alt={topThree[0].name} className="avatar-img" />
                        ) : (
                          topThree[0].name.substring(0, 2).toUpperCase()
                        )}
                        <span className="badge-place">1</span>
                      </div>
                      <h3 className="podium-name">{topThree[0].name}</h3>
                      <p className="podium-points">{topThree[0].points} pts</p>
                      <p className="podium-stats">{topThree[0].exactScores} placares exatos</p>
                      
                      {/* Pódio de Palpite do Participante */}
                      {(userChamp || userSecond || userThird) && (
                        <div className="user-podium-badges" style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "10px" }}>
                          {userChamp && (
                            <span className="mini-podium-badge first" title={`1º Lugar (Campeão): ${userChamp}`}>
                              👑 {champTeam?.code ? (
                                <img src={getFlagUrl(champTeam.code)} alt={userChamp} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                          {userSecond && (
                            <span className="mini-podium-badge second" title={`2º Lugar (Vice): ${userSecond}`}>
                              🥈 {secondTeam?.code ? (
                                <img src={getFlagUrl(secondTeam.code)} alt={userSecond} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                          {userThird && (
                            <span className="mini-podium-badge third" title={`3º Lugar: ${userThird}`}>
                              🥉 {thirdTeam?.code ? (
                                <img src={getFlagUrl(thirdTeam.code)} alt={userThird} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 3º Lugar */}
                {topThree[2] && (() => {
                  const userGuesses = allGuesses[topThree[2].name] || {};
                  const userChamp = userGuesses["cup_champion"];
                  const userSecond = userGuesses["cup_second"];
                  const userThird = userGuesses["cup_third"];
                  const champTeam = userChamp ? allTeamsList.find(t => t.name === userChamp) : null;
                  const secondTeam = userSecond ? allTeamsList.find(t => t.name === userSecond) : null;
                  const thirdTeam = userThird ? allTeamsList.find(t => t.name === userThird) : null;
                  
                  return (
                    <div className="podium-card third">
                      <div className="podium-avatar" style={{ padding: participantAvatars[topThree[2].name] ? "0" : undefined }}>
                        {participantAvatars[topThree[2].name] ? (
                          <img src={participantAvatars[topThree[2].name]} alt={topThree[2].name} className="avatar-img" />
                        ) : (
                          topThree[2].name.substring(0, 2).toUpperCase()
                        )}
                        <span className="badge-place">3</span>
                      </div>
                      <h3 className="podium-name">{topThree[2].name}</h3>
                      <p className="podium-points">{topThree[2].points} pts</p>
                      <p className="podium-stats">{topThree[2].exactScores} placares exatos</p>
                      
                      {/* Pódio de Palpite do Participante */}
                      {(userChamp || userSecond || userThird) && (
                        <div className="user-podium-badges" style={{ display: "flex", gap: "4px", justifyContent: "center", marginTop: "10px" }}>
                          {userChamp && (
                            <span className="mini-podium-badge first" title={`1º Lugar (Campeão): ${userChamp}`}>
                              👑 {champTeam?.code ? (
                                <img src={getFlagUrl(champTeam.code)} alt={userChamp} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                          {userSecond && (
                            <span className="mini-podium-badge second" title={`2º Lugar (Vice): ${userSecond}`}>
                              🥈 {secondTeam?.code ? (
                                <img src={getFlagUrl(secondTeam.code)} alt={userSecond} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                          {userThird && (
                            <span className="mini-podium-badge third" title={`3º Lugar: ${userThird}`}>
                              🥉 {thirdTeam?.code ? (
                                <img src={getFlagUrl(thirdTeam.code)} alt={userThird} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                              ) : "?"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Tabela Completa de Classificação (Fase Final) */}
              <div className="ranking-table-card">
                <table className="ranking-table">
                  <thead>
                    <tr>
                      <th style={{ width: "80px" }}>Pos.</th>
                      <th>Participante</th>
                      <th style={{ textAlign: "center" }}>Pts Totais</th>
                      <th style={{ textAlign: "center" }}>Placar Exato (3 pts)</th>
                      <th style={{ textAlign: "center" }}>Acertou Venc. (1 pt)</th>
                      <th style={{ textAlign: "center" }}>Erros</th>
                      <th style={{ textAlign: "center" }}>Jogos Calculados</th>
                      <th style={{ textAlign: "center", width: "100px" }}>Detalhes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingFinal.map((user, idx) => {
                      const userGuesses = allGuesses[user.name] || {};
                      const userChamp = userGuesses["cup_champion"];
                      const userSecond = userGuesses["cup_second"];
                      const userThird = userGuesses["cup_third"];
                      
                      const champTeam = userChamp ? allTeamsList.find(t => t.name === userChamp) : null;
                      const secondTeam = userSecond ? allTeamsList.find(t => t.name === userSecond) : null;
                      const thirdTeam = userThird ? allTeamsList.find(t => t.name === userThird) : null;
                      
                      return (
                        <tr key={user.name} className="ranking-row">
                          <td>
                            <span className={`position-badge ${
                              idx === 0 ? "first-pos" : idx === 1 ? "second-pos" : idx === 2 ? "third-pos" : ""
                            }`}>
                              {idx + 1}
                            </span>
                          </td>
                          <td>
                            <div className="participant-name-col">
                              <div className="participant-avatar-sm" style={{
                                  background: idx === 0 ? "#f59e0b" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#b45309" : "#1e293b",
                                  padding: participantAvatars[user.name] ? "0" : undefined
                                }}>
                                {participantAvatars[user.name] ? (
                                  <img src={participantAvatars[user.name]} alt={user.name} className="avatar-img" />
                                ) : (
                                  user.name.substring(0, 2).toUpperCase()
                                )}
                              </div>
                              <div>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                                  <span style={{ fontWeight: 600 }}>{user.name}</span>
                                  
                                  {/* Pódio do Participante */}
                                  {(userChamp || userSecond || userThird) && (
                                    <div className="user-podium-badges" style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                      {userChamp && (
                                        <span className="leaderboard-champion-badge" title={`1º Lugar (Campeão): ${userChamp}`}>
                                          👑 {champTeam?.code && (
                                            <img src={getFlagUrl(champTeam.code)} alt={userChamp} className="flag-icon-xs" style={{ width: "16px", height: "11px", marginRight: "4px", borderRadius: "1px", verticalAlign: "middle" }} />
                                          )}
                                          <strong>{userChamp}</strong>
                                        </span>
                                      )}
                                      {userSecond && (
                                        <span className="mini-podium-badge second" title={`2º Lugar (Vice): ${userSecond}`}>
                                          🥈 {secondTeam?.code ? (
                                            <img src={getFlagUrl(secondTeam.code)} alt={userSecond} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                                          ) : "?"}
                                        </span>
                                      )}
                                      {userThird && (
                                        <span className="mini-podium-badge third" title={`3º Lugar: ${userThird}`}>
                                          🥉 {thirdTeam?.code ? (
                                            <img src={getFlagUrl(thirdTeam.code)} alt={userThird} className="flag-icon-xs" style={{ width: "16px", height: "11px", borderRadius: "1px", verticalAlign: "middle" }} />
                                          ) : "?"}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                                {idx === 0 && <span style={{ fontSize: "0.7rem", color: "var(--secondary)", fontWeight: 700 }}>★ LÍDER ATUAL</span>}
                              </div>
                            </div>
                          </td>
                          <td style={{ textAlign: "center" }} className="points-val">
                            {user.points}
                          </td>
                          <td style={{ textAlign: "center" }} className="stats-detail">
                            {user.exactScores}
                          </td>
                          <td style={{ textAlign: "center" }} className="stats-detail">
                            {user.outcomeOnly}
                          </td>
                          <td style={{ textAlign: "center", color: "rgba(239, 68, 68, 0.7)" }} className="stats-detail">
                            {user.errors}
                          </td>
                          <td style={{ textAlign: "center" }} className="stats-detail">
                            {user.playedCount} / {knockoutMatches.length}
                          </td>
                          <td style={{ textAlign: "center" }}>
                            <button 
                              className="detail-btn"
                              onClick={() => {
                                setSelectedDetailUser(user.name);
                                setModalPhase("final");
                              }}
                              title={`Ver palpites de ${user.name}`}
                            >
                              <Eye size={14} />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA 2: MEUS PALPITES (FASE FINAL) */}
          {activeTab === "palpites_final" && (
            <div>
              {/* CARD PALPITE PÓDIO DA COPA */}
              {(() => {
                const userChamp = tempGuesses["cup_champion"] || allGuesses[selectedUser]?.["cup_champion"] || "";
                const userSecond = tempGuesses["cup_second"] || allGuesses[selectedUser]?.["cup_second"] || "";
                const userThird = tempGuesses["cup_third"] || allGuesses[selectedUser]?.["cup_third"] || "";

                const champTeam = allTeamsList.find(t => t.name === userChamp);
                const secondTeam = allTeamsList.find(t => t.name === userSecond);
                const thirdTeam = allTeamsList.find(t => t.name === userThird);
                
                const isLocked = isPodiumLocked();
                
                return (
                  <div className="podium-card" style={{ border: isLocked ? "1px solid rgba(255,255,255,0.05)" : "1px solid var(--secondary)" }}>
                    <div className="podium-card-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <Trophy size={22} style={{ color: "#f59e0b" }} />
                        <h3>Palpite do Pódio da Copa 🏆</h3>
                      </div>
                      {isLocked ? (
                        <span className="locked-badge"><Lock size={12} /> Palpites Encerrados</span>
                      ) : (
                        <span className="unlocked-badge">⏳ Aberto até as 23:59 de hoje!</span>
                      )}
                    </div>
                    
                    <div className="podium-card-body">
                      {/* Mensagem de prazo bem destacada */}
                      <div className="podium-deadline-alert">
                        ⚠️ Atenção: Os palpites do pódio (1º, 2º e 3º lugares) devem ser salvos até o final do dia de hoje (28/06/2026 às 23:59)!
                      </div>

                      <div className="podium-container">
                        {/* 2º LUGAR - PRATA */}
                        <div className="podium-block silver-block">
                          <div className="podium-flag-wrapper">
                            {secondTeam?.code ? (
                              <img src={getFlagUrl(secondTeam.code)} alt={userSecond} className="podium-flag" />
                            ) : (
                              <div className="podium-flag-placeholder">?</div>
                            )}
                          </div>
                          <select
                            className="podium-select"
                            value={userSecond}
                            onChange={(e) => handlePodiumChange("second", e.target.value, "palpite")}
                            disabled={isLocked}
                          >
                            <option value="">2º Lugar (Vice)...</option>
                            {allTeamsList.map((t) => (
                              <option key={t.name} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <div className="podium-step step-silver">
                            <span className="step-rank">2º</span>
                            <span className="step-label">🥈 Vice (+3 pts)</span>
                          </div>
                        </div>

                        {/* 1º LUGAR - OURO */}
                        <div className="podium-block gold-block">
                          <div className="podium-flag-wrapper">
                            {champTeam?.code ? (
                              <img src={getFlagUrl(champTeam.code)} alt={userChamp} className="podium-flag" />
                            ) : (
                              <div className="podium-flag-placeholder">?</div>
                            )}
                          </div>
                          <select
                            className="podium-select"
                            value={userChamp}
                            onChange={(e) => handlePodiumChange("first", e.target.value, "palpite")}
                            disabled={isLocked}
                          >
                            <option value="">1º Lugar (Campeão)...</option>
                            {allTeamsList.map((t) => (
                              <option key={t.name} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <div className="podium-step step-gold">
                            <span className="step-rank">1º</span>
                            <span className="step-label">👑 Campeão (+5 pts)</span>
                          </div>
                        </div>

                        {/* 3º LUGAR - BRONZE */}
                        <div className="podium-block bronze-block">
                          <div className="podium-flag-wrapper">
                            {thirdTeam?.code ? (
                              <img src={getFlagUrl(thirdTeam.code)} alt={userThird} className="podium-flag" />
                            ) : (
                              <div className="podium-flag-placeholder">?</div>
                            )}
                          </div>
                          <select
                            className="podium-select"
                            value={userThird}
                            onChange={(e) => handlePodiumChange("third", e.target.value, "palpite")}
                            disabled={isLocked}
                          >
                            <option value="">3º Lugar...</option>
                            {allTeamsList.map((t) => (
                              <option key={t.name} value={t.name}>
                                {t.name}
                              </option>
                            ))}
                          </select>
                          <div className="podium-step step-bronze">
                            <span className="step-rank">3º</span>
                            <span className="step-label">🥉 3º Lugar (+2 pts)</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              <div className="pdf-actions no-print" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px", marginTop: "20px" }}>
                <button className="pdf-btn" onClick={() => window.print()}>
                  <FileText size={16} />
                  Salvar PDF dos Palpites ({selectedUser})
                </button>
                <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                  <button 
                    className={`filter-btn ${viewMode === "chaveamento" ? "active" : ""}`}
                    onClick={() => setViewMode("chaveamento")}
                  >
                    🌳 Visualização em Chaveamento
                  </button>
                  <button 
                    className={`filter-btn ${viewMode === "grade" ? "active" : ""}`}
                    onClick={() => setViewMode("grade")}
                  >
                    🎛️ Visualização em Grade
                  </button>
                </div>
              </div>

              {/* Barra de Filtros e Seletor de Nome (SÓ MOSTRA FILTRO DE RODADA SE ESTIVER EM MODO GRADE) */}
              <div className="controls-bar">
                <div className="user-selector-container">
                  {participantAvatars[selectedUser] ? (
                    <img 
                      src={participantAvatars[selectedUser]} 
                      alt={selectedUser} 
                      className="avatar-img" 
                      style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--card-border)" }}
                    />
                  ) : (
                    <div className="participant-avatar-sm" style={{ width: "30px", height: "30px", fontSize: "0.85rem", background: "#1e293b" }}>
                      {selectedUser.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="select-label">Quem é você?</span>
                  <select
                    className="custom-select"
                    value={selectedUser}
                    onChange={(e) => {
                      if (hasChanges) {
                        if (confirm("Você tem alterações não salvas de palpites. Deseja mudar de participante e perder as alterações?")) {
                          setSelectedUser(e.target.value);
                        }
                      } else {
                        setSelectedUser(e.target.value);
                      }
                    }}
                  >
                    {participants.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                {viewMode === "grade" && (
                  <div className="filters-container">
                    <span className="select-label" style={{ alignSelf: "center" }}>Filtrar Rodada:</span>
                    <button
                      className={`filter-btn ${knockoutStageFilter === "all" ? "active" : ""}`}
                      onClick={() => setKnockoutStageFilter("all")}
                    >
                      Todos
                    </button>
                    <button
                      className={`filter-btn ${knockoutStageFilter === "R32" ? "active" : ""}`}
                      onClick={() => setKnockoutStageFilter("R32")}
                    >
                      16 avos (R32)
                    </button>
                    <button
                      className={`filter-btn ${knockoutStageFilter === "R16" ? "active" : ""}`}
                      onClick={() => setKnockoutStageFilter("R16")}
                    >
                      Oitavas (R16)
                    </button>
                    <button
                      className={`filter-btn ${knockoutStageFilter === "QF" ? "active" : ""}`}
                      onClick={() => setKnockoutStageFilter("QF")}
                    >
                      Quartas (QF)
                    </button>
                    <button
                      className={`filter-btn ${knockoutStageFilter === "SF" ? "active" : ""}`}
                      onClick={() => setKnockoutStageFilter("SF")}
                    >
                      Semifinal (SF)
                    </button>
                    <button
                      className={`filter-btn ${knockoutStageFilter === "FINAL" ? "active" : ""}`}
                      onClick={() => setKnockoutStageFilter("FINAL")}
                    >
                      Finais
                    </button>
                  </div>
                )}
              </div>

              {/* Grid ou Chaveamento de Partidas de Mata-Mata */}
              {(() => {
                const leftR32Ids = ["73", "75", "74", "77", "83", "84", "81", "82"];
                const leftR16Ids = ["90", "89", "93", "94"];
                const leftQFIds = ["97", "98"];
                const leftSFIds = ["101"];
                
                const centerFinalIds = ["104", "103"];
                
                const rightSFIds = ["102"];
                const rightQFIds = ["99", "100"];
                const rightR16Ids = ["91", "92", "95", "96"];
                const rightR32Ids = ["76", "78", "79", "80", "86", "88", "85", "87"];

                const getOrderedUserMatches = (ids: string[]) => {
                  const userKnockout = getUserKnockoutMatches(selectedUser);
                  return ids.map(id => userKnockout.find(m => m.id === id)).filter(Boolean) as KnockoutMatch[];
                };

                if (viewMode === "chaveamento") {
                  const activeStage = getActiveStage();
                  return (
                    <div className="bracket-wrapper no-print">
                      {/* Mobile Navigation Tabs */}
                      <div className="mobile-bracket-nav no-print">
                        <button 
                          className={`bracket-nav-btn ${bracketTab === "R32" ? "active" : ""}`}
                          onClick={() => setBracketTab("R32")}
                        >
                          R32 (16-avos)
                        </button>
                        <button 
                          className={`bracket-nav-btn ${bracketTab === "R16" ? "active" : ""}`}
                          onClick={() => setBracketTab("R16")}
                        >
                          R16 (Oitavas)
                        </button>
                        <button 
                          className={`bracket-nav-btn ${bracketTab === "QF" ? "active" : ""}`}
                          onClick={() => setBracketTab("QF")}
                        >
                          Quartas
                        </button>
                        <button 
                          className={`bracket-nav-btn ${bracketTab === "SF" ? "active" : ""}`}
                          onClick={() => setBracketTab("SF")}
                        >
                          Semifinais
                        </button>
                        <button 
                          className={`bracket-nav-btn ${bracketTab === "FINAL" ? "active" : ""}`}
                          onClick={() => setBracketTab("FINAL")}
                        >
                          Finais
                        </button>
                      </div>

                      <div className="bracket-container">
                        {/* 1. R32 Esquerda */}
                        <div className={`bracket-column left-column r32 ${bracketTab === "R32" ? "active-mobile" : ""} ${activeStage === "R32" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">16-avos (L)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(leftR32Ids).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 2. R16 Esquerda */}
                        <div className={`bracket-column left-column r16 ${bracketTab === "R16" ? "active-mobile" : ""} ${activeStage === "R16" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Oitavas (L)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(leftR16Ids).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 3. QF Esquerda */}
                        <div className={`bracket-column left-column qf ${bracketTab === "QF" ? "active-mobile" : ""} ${activeStage === "QF" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Quartas (L)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(leftQFIds).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 4. SF Esquerda */}
                        <div className={`bracket-column left-column sf ${bracketTab === "SF" ? "active-mobile" : ""} ${activeStage === "SF" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Semifinal (L)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(leftSFIds).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 5. Centro (Final e 3º Lugar) */}
                        <div className={`bracket-column center-column finals ${bracketTab === "FINAL" ? "active-mobile" : ""} ${activeStage === "FINAL" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Decisão</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(centerFinalIds).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 6. SF Direita */}
                        <div className={`bracket-column right-column sf ${bracketTab === "SF" ? "active-mobile" : ""} ${activeStage === "SF" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Semifinal (R)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(rightSFIds).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 7. QF Direita */}
                        <div className={`bracket-column right-column qf ${bracketTab === "QF" ? "active-mobile" : ""} ${activeStage === "QF" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Quartas (R)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(rightQFIds).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 8. R16 Direita */}
                        <div className={`bracket-column right-column r16 ${bracketTab === "R16" ? "active-mobile" : ""} ${activeStage === "R16" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">Oitavas (R)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(rightR16Ids).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>

                        {/* 9. R32 Direita */}
                        <div className={`bracket-column right-column r32 ${bracketTab === "R32" ? "active-mobile" : ""} ${activeStage === "R32" ? "active-stage" : "inactive-stage"}`}>
                          <h4 className="bracket-column-title">16-avos (R)</h4>
                          <div className="bracket-match-list">
                            {getOrderedUserMatches(rightR32Ids).map(m => renderKnockoutMatchCard(m, "palpite"))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }

                // Visualização em Grade (Fallback ou Modo de Impressão)
                const userKnockout = getUserKnockoutMatches(selectedUser);
                const filteredKnockout = userKnockout.filter(m => {
                  if (knockoutStageFilter === "all") return true;
                  if (knockoutStageFilter === "FINAL") return m.stage === "FINAL" || m.stage === "3RD";
                  return m.stage === knockoutStageFilter;
                });

                if (filteredKnockout.length === 0) {
                  return (
                    <div className="empty-state">
                      <AlertTriangle className="empty-state-icon" />
                      <p>Nenhum jogo do mata-mata encontrado.</p>
                    </div>
                  );
                }

                return (
                  <div className="matches-grid">
                    {filteredKnockout.map((match) => renderKnockoutMatchCard(match, "palpite"))}
                  </div>
                );
              })()}
            </div>
          )}

          {/* ABA 3: FASE DE GRUPOS (HISTÓRICO) */}
          {activeTab === "grupos" && (
            <div>
              {/* Sub-navegação da Fase de Grupos */}
              <div className="subtabs-navigation no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px" }}>
                <button 
                  className={`filter-btn ${gruposSubTab === "ranking_grupos" ? "active" : ""}`}
                  onClick={() => setGruposSubTab("ranking_grupos")}
                >
                  🏆 Classificação Histórica
                </button>
                <button 
                  className={`filter-btn ${gruposSubTab === "palpites_grupos" ? "active" : ""}`}
                  onClick={() => setGruposSubTab("palpites_grupos")}
                >
                  📝 Palpites Enviados
                </button>
                <button 
                  className={`filter-btn ${gruposSubTab === "tabela_grupos" ? "active" : ""}`}
                  onClick={() => setGruposSubTab("tabela_grupos")}
                >
                  📊 Classificação dos Grupos
                </button>
              </div>

              {/* Sub-aba A: Classificação dos Grupos */}
              {gruposSubTab === "ranking_grupos" && (
                <div>
                  <div className="pdf-actions no-print">
                    <button className="pdf-btn" onClick={() => window.print()}>
                      <FileText size={16} />
                      Salvar PDF da Classificação de Grupos
                    </button>
                  </div>
                  
                  {/* Podium Visual (Fase de Grupos) */}
                  <div className="podium-section">
                    {/* 2º Lugar */}
                    {rankingGroups[1] && (
                      <div className="podium-card second">
                        <div className="podium-avatar" style={{ padding: participantAvatars[rankingGroups[1].name] ? "0" : undefined }}>
                          {participantAvatars[rankingGroups[1].name] ? (
                            <img src={participantAvatars[rankingGroups[1].name]} alt={rankingGroups[1].name} className="avatar-img" />
                          ) : (
                            rankingGroups[1].name.substring(0, 2).toUpperCase()
                          )}
                          <span className="badge-place">2</span>
                        </div>
                        <h3 className="podium-name">{rankingGroups[1].name}</h3>
                        <p className="podium-points">{rankingGroups[1].points} pts</p>
                        <p className="podium-stats">{rankingGroups[1].exactScores} placares exatos</p>
                      </div>
                    )}

                    {/* 1º Lugar */}
                    {rankingGroups[0] && (
                      <div className="podium-card first">
                        <Crown className="crown-icon" />
                        <div className="podium-avatar" style={{ padding: participantAvatars[rankingGroups[0].name] ? "0" : undefined }}>
                          {participantAvatars[rankingGroups[0].name] ? (
                            <img src={participantAvatars[rankingGroups[0].name]} alt={rankingGroups[0].name} className="avatar-img" />
                          ) : (
                            rankingGroups[0].name.substring(0, 2).toUpperCase()
                          )}
                          <span className="badge-place">1</span>
                        </div>
                        <h3 className="podium-name">{rankingGroups[0].name}</h3>
                        <p className="podium-points">{rankingGroups[0].points} pts</p>
                        <p className="podium-stats">{rankingGroups[0].exactScores} placares exatos</p>
                      </div>
                    )}

                    {/* 3º Lugar */}
                    {rankingGroups[2] && (
                      <div className="podium-card third">
                        <div className="podium-avatar" style={{ padding: participantAvatars[rankingGroups[2].name] ? "0" : undefined }}>
                          {participantAvatars[rankingGroups[2].name] ? (
                            <img src={participantAvatars[rankingGroups[2].name]} alt={rankingGroups[2].name} className="avatar-img" />
                          ) : (
                            rankingGroups[2].name.substring(0, 2).toUpperCase()
                          )}
                          <span className="badge-place">3</span>
                        </div>
                        <h3 className="podium-name">{rankingGroups[2].name}</h3>
                        <p className="podium-points">{rankingGroups[2].points} pts</p>
                        <p className="podium-stats">{rankingGroups[2].exactScores} placares exatos</p>
                      </div>
                    )}
                  </div>

                  {/* Tabela de Classificação Geral de Grupos */}
                  <div className="ranking-table-card">
                    <table className="ranking-table">
                      <thead>
                        <tr>
                          <th style={{ width: "80px" }}>Pos.</th>
                          <th>Participante</th>
                          <th style={{ textAlign: "center" }}>Pts Totais</th>
                          <th style={{ textAlign: "center" }}>Placar Exato (3 pts)</th>
                          <th style={{ textAlign: "center" }}>Acertou Venc. (1 pt)</th>
                          <th style={{ textAlign: "center" }}>Erros</th>
                          <th style={{ textAlign: "center" }}>Jogos Calculados</th>
                          <th style={{ textAlign: "center", width: "100px" }}>Detalhes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rankingGroups.map((user, idx) => (
                          <tr key={user.name} className="ranking-row">
                            <td>
                              <span className={`position-badge ${
                                idx === 0 ? "first-pos" : idx === 1 ? "second-pos" : idx === 2 ? "third-pos" : ""
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td>
                              <div className="participant-name-col">
                                <div className="participant-avatar-sm" style={{
                                    background: idx === 0 ? "#f59e0b" : idx === 1 ? "#cbd5e1" : idx === 2 ? "#b45309" : "#1e293b",
                                    padding: participantAvatars[user.name] ? "0" : undefined
                                  }}>
                                  {participantAvatars[user.name] ? (
                                    <img src={participantAvatars[user.name]} alt={user.name} className="avatar-img" />
                                  ) : (
                                    user.name.substring(0,2).toUpperCase()
                                  )}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600 }}>{user.name}</div>
                                  {idx === 0 && <span style={{ fontSize: "0.7rem", color: "var(--secondary)", fontWeight: 700 }}>★ LÍDER ATUAL</span>}
                                </div>
                              </div>
                            </td>
                            <td style={{ textAlign: "center" }} className="points-val">
                              {user.points}
                            </td>
                            <td style={{ textAlign: "center" }} className="stats-detail">
                              {user.exactScores}
                            </td>
                            <td style={{ textAlign: "center" }} className="stats-detail">
                              {user.outcomeOnly}
                            </td>
                            <td style={{ textAlign: "center", color: "rgba(239, 68, 68, 0.7)" }} className="stats-detail">
                              {user.errors}
                            </td>
                            <td style={{ textAlign: "center" }} className="stats-detail">
                              {user.playedCount} / {matchesList.filter((m) => !isMatchExcluded(matchDates[m.id])).length}
                            </td>
                            <td style={{ textAlign: "center" }}>
                              <button 
                                className="detail-btn"
                                onClick={() => {
                                  setSelectedDetailUser(user.name);
                                  setModalPhase("grupos");
                                }}
                                title={`Ver palpites de ${user.name}`}
                              >
                                <Eye size={14} />
                                <span>Ver</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Sub-aba B: Palpites (Fase de Grupos) */}
              {gruposSubTab === "palpites_grupos" && (
                <div>
                  <div className="pdf-actions no-print" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                    <button className="pdf-btn" onClick={() => window.print()}>
                      <FileText size={16} />
                      Salvar PDF dos Palpites de Grupos ({selectedUser})
                    </button>
                  </div>

                  <div className="controls-bar">
                    <div className="user-selector-container">
                      {participantAvatars[selectedUser] ? (
                        <img 
                          src={participantAvatars[selectedUser]} 
                          alt={selectedUser} 
                          className="avatar-img" 
                          style={{ width: "30px", height: "30px", borderRadius: "50%", objectFit: "cover", border: "1px solid var(--card-border)" }}
                        />
                      ) : (
                        <div className="participant-avatar-sm" style={{ width: "30px", height: "30px", fontSize: "0.85rem", background: "#1e293b" }}>
                          {selectedUser.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <span className="select-label">Visualizando palpites de:</span>
                      <select
                        className="custom-select"
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                      >
                        {participants.map((name) => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="filters-container">
                      <button
                        className={`filter-btn ${roundFilter === "today" ? "active" : ""}`}
                        onClick={() => setRoundFilter("today")}
                      >
                        🔥 Jogos de Hoje
                      </button>
                      <button
                        className={`filter-btn ${roundFilter === "all" ? "active" : ""}`}
                        onClick={() => setRoundFilter("all")}
                      >
                        Todas Rodadas
                      </button>
                      <button
                        className={`filter-btn ${roundFilter === 1 ? "active" : ""}`}
                        onClick={() => setRoundFilter(1)}
                      >
                        Rodada 1
                      </button>
                      <button
                        className={`filter-btn ${roundFilter === 2 ? "active" : ""}`}
                        onClick={() => setRoundFilter(2)}
                      >
                        Rodada 2
                      </button>
                      <button
                        className={`filter-btn ${roundFilter === 3 ? "active" : ""}`}
                        onClick={() => setRoundFilter(3)}
                      >
                        Rodada 3
                      </button>
                    </div>
                  </div>

                  <div className="controls-bar" style={{ marginTop: "-12px", borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: "12px" }}>
                    <div className="filters-container">
                      <span className="select-label" style={{ alignSelf: "center" }}>Filtrar Grupo:</span>
                      <button
                        className={`filter-btn ${groupFilter === "all" ? "active" : ""}`}
                        onClick={() => setGroupFilter("all")}
                      >
                        Todos
                      </button>
                      {groupLetters.map((letter) => (
                        <button
                          key={letter}
                          className={`filter-btn ${groupFilter === letter ? "active" : ""}`}
                          onClick={() => setGroupFilter(letter)}
                        >
                          Gr. {letter}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ordenação dos Jogos (Grupos) */}
                  <div className="controls-bar" style={{ marginTop: "-12px", borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: "12px", display: "flex", justifyContent: "flex-start" }}>
                    <div className="user-selector-container" style={{ background: "transparent", border: "none", padding: 0 }}>
                      <span className="select-label" style={{ fontWeight: 600 }}>Ordenar por:</span>
                      <select
                        className="custom-select"
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as "group" | "date")}
                        style={{ minWidth: "200px" }}
                      >
                        <option value="group">Grupo e Rodada</option>
                        <option value="date">Data e Hora (Cronológico)</option>
                      </select>
                    </div>
                  </div>

                  <div className="matches-grid">
                    {sortedFilteredMatches.map((match) => {
                      const isExcluded = isMatchExcluded(matchDates[match.id]);
                      const guess = tempGuesses[match.id] || { home: null, away: null };
                      const realResult = gabarito[match.id];
                      const pointsResult = calculateMatchPoints(guess, realResult);

                      return (
                        <div key={match.id} className="match-card locked-match" style={{ opacity: 0.9 }}>
                          <div className="match-header">
                            <span>{match.groupName} • Rodada {match.round}</span>
                            {isExcluded ? (
                              <span className="points-badge outcome" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)" }}>
                                Fora do bolão
                              </span>
                            ) : pointsResult.type !== "none" && (
                              <span className={`points-badge ${pointsResult.type}`}>
                                {pointsResult.points} {pointsResult.points === 1 ? "Ponto" : "Pontos"}
                              </span>
                            )}
                          </div>
                          
                          <div className="match-body">
                            <div className="team-container home">
                              <span className="team-name" title={match.homeTeam.name}>
                                {match.homeTeam.name}
                              </span>
                              <img src={getFlagUrl(match.homeTeam.code)} alt={match.homeTeam.name} className="flag-icon" />
                            </div>
    
                            <div className="score-container">
                              <input
                                type="number"
                                className="score-input"
                                value={guess.home ?? ""}
                                disabled
                              />
                              <span className="score-divider">x</span>
                              <input
                                type="number"
                                className="score-input"
                                value={guess.away ?? ""}
                                disabled
                              />
                            </div>
  
                            <div className="team-container away">
                              <img src={getFlagUrl(match.awayTeam.code)} alt={match.awayTeam.name} className="flag-icon" />
                              <span className="team-name" title={match.awayTeam.name}>
                                {match.awayTeam.name}
                              </span>
                            </div>
                          </div>
  
                          {matchDates[match.id] && (
                            <div className="match-date-info">
                              📅 {formatMatchDate(matchDates[match.id])}
                            </div>
                          )}
  
                          {realResult && realResult.home !== null && realResult.away !== null && (
                            <div className="gabarito-score-info">
                              Resultado Real: <strong>{realResult.home} x {realResult.away}</strong>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-aba C: Tabela Oficial de Grupos */}
              {gruposSubTab === "tabela_grupos" && (
                <div className="groups-grid">
                  {groupLetters.map((letter) => {
                    const standings = getGroupStandings(letter, gabarito);
                    return (
                      <div key={letter} className="group-card-standings">
                        <div className="group-card-header">Grupo {letter}</div>
                        <table className="group-mini-table">
                          <thead>
                            <tr>
                              <th style={{ width: "30px", textAlign: "left" }}>Pos</th>
                              <th style={{ textAlign: "left" }}>Seleção</th>
                              <th style={{ textAlign: "center", width: "30px" }}>P</th>
                              <th style={{ textAlign: "center", width: "30px" }}>SG</th>
                            </tr>
                          </thead>
                          <tbody>
                            {standings.map((team, idx) => (
                              <tr key={team.code} className={`mini-rank-${idx + 1}`}>
                                <td style={{ fontWeight: "700" }}>{idx + 1}º</td>
                                <td className="mini-team-cell">
                                  <img src={getFlagUrl(team.code)} alt={team.name} className="flag-icon-xs" />
                                  <span className="mini-team-name" title={team.name}>{team.name}</span>
                                </td>
                                <td style={{ textAlign: "center", fontWeight: "700" }}>{team.points}</td>
                                <td style={{ 
                                  textAlign: "center", 
                                  fontWeight: "700",
                                  color: team.goalDifference > 0 ? "var(--success)" : team.goalDifference < 0 ? "var(--error)" : "inherit" 
                                }}>
                                  {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 4: GABARITO (ADMIN) */}
          {activeTab === "gabarito" && (
            <div>
              {showAdminLogin && !isAdminAuthenticated ? (
                /* Login Administrativo Simples */
                <form onSubmit={handleAdminLogin} className="admin-login-card">
                  <Lock size={40} style={{ color: "var(--accent)", marginBottom: "16px" }} />
                  <h3 className="admin-login-title">Área de Administração</h3>
                  <p className="admin-login-desc">Insira a senha do bolão para lançar os resultados reais das partidas.</p>
                  
                  <div className="password-input-wrapper">
                    <label htmlFor="pwd">Senha de Acesso</label>
                    <input
                      id="pwd"
                      type="password"
                      className="password-input"
                      placeholder="Insira a senha"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      required
                    />
                  </div>
                  
                  <button type="submit" className="login-btn">
                    Desbloquear Acesso
                  </button>
                  <button 
                    type="button" 
                    className="filter-btn no-print" 
                    style={{ marginTop: "12px", width: "100%", background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }}
                    onClick={() => setShowAdminLogin(false)}
                  >
                    Voltar para Visualização
                  </button>
                </form>
              ) : (
                /* Visualização ou Edição do Gabarito */
                <div>
                  {!isAdminAuthenticated ? (
                    /* Banner Modo Visualização */
                    <div className="admin-lock-banner">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Trophy size={18} style={{ color: "var(--secondary)" }} />
                        <span>👁️ <strong>Gabarito Oficial:</strong> Você está visualizando os resultados reais dos jogos (Apenas Leitura).</span>
                      </div>
                      <button className="filter-btn no-print" onClick={() => setShowAdminLogin(true)}>
                        Entrar como Admin
                      </button>
                    </div>
                  ) : (
                    /* Banner Modo Edição Administrativa */
                    <div className="admin-lock-banner">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <Lock size={18} style={{ color: tempGuessesLocked ? "var(--error)" : "var(--primary)" }} />
                        <span><strong>Bloquear Palpites dos Participantes (Grupos):</strong> {tempGuessesLocked ? "Bloqueado 🔒" : "Liberado 🔓"}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <label className="switch">
                          <input
                            type="checkbox"
                            checked={tempGuessesLocked}
                            onChange={(e) => {
                              setTempGuessesLocked(e.target.checked);
                              setHasChanges(true);
                            }}
                          />
                          <span className="slider round"></span>
                        </label>
                        <button 
                          onClick={handleAdminLogout} 
                          className="filter-btn" 
                          style={{ border: "1px solid rgba(239,68,68,0.3)", color: "var(--error)", padding: "6px 14px" }}
                        >
                          Sair do Admin
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Sub-navegação do Gabarito */}
                  <div className="subtabs-navigation no-print" style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: "10px", marginTop: "20px" }}>
                    <button 
                      className={`filter-btn ${adminSubTab === "gabarito_final" ? "active" : ""}`}
                      onClick={() => setAdminSubTab("gabarito_final")}
                    >
                      🏆 Mata-Mata & Pódio
                    </button>
                    <button 
                      className={`filter-btn ${adminSubTab === "gabarito_grupos" ? "active" : ""}`}
                      onClick={() => setAdminSubTab("gabarito_grupos")}
                    >
                      ⚽ Fase de Grupos
                    </button>
                  </div>

                  {/* A. Gabarito Mata-Mata & Pódio */}
                  {adminSubTab === "gabarito_final" && (
                    <div>
                      {/* CARD PÓDIO DA COPA (GABARITO ADMIN) */}
                      {(() => {
                        const officialChamp = tempGabarito["cup_champion"] || gabarito["cup_champion"] || "";
                        const officialSecond = tempGabarito["cup_second"] || gabarito["cup_second"] || "";
                        const officialThird = tempGabarito["cup_third"] || gabarito["cup_third"] || "";

                        const champTeam = allTeamsList.find(t => t.name === officialChamp);
                        const secondTeam = allTeamsList.find(t => t.name === officialSecond);
                        const thirdTeam = allTeamsList.find(t => t.name === officialThird);
                        
                        return (
                          <div className="podium-card" style={{ borderColor: isAdminAuthenticated ? "var(--secondary)" : "rgba(255,255,255,0.08)" }}>
                            <div className="podium-card-header">
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <Trophy size={22} style={{ color: "#f59e0b" }} />
                                <h3>Definir Pódio Oficial da Copa 🏆</h3>
                              </div>
                              {!isAdminAuthenticated && <span className="locked-badge"><Lock size={12} /> Somente Admin</span>}
                            </div>
                            
                            <div className="podium-card-body">
                              <div className="podium-container">
                                {/* 2º LUGAR - PRATA */}
                                <div className="podium-block silver-block">
                                  <div className="podium-flag-wrapper">
                                    {secondTeam?.code ? (
                                      <img src={getFlagUrl(secondTeam.code)} alt={officialSecond} className="podium-flag" />
                                    ) : (
                                      <div className="podium-flag-placeholder">?</div>
                                    )}
                                  </div>
                                  <select
                                    className="podium-select"
                                    value={officialSecond}
                                    onChange={(e) => handlePodiumChange("second", e.target.value, "gabarito")}
                                    disabled={!isAdminAuthenticated}
                                  >
                                    <option value="">2º Lugar (Vice)...</option>
                                    {allTeamsList.map((t) => (
                                      <option key={t.name} value={t.name}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="podium-step step-silver">
                                    <span className="step-rank">2º</span>
                                    <span className="step-label">🥈 Vice Oficial</span>
                                  </div>
                                </div>

                                {/* 1º LUGAR - OURO */}
                                <div className="podium-block gold-block">
                                  <div className="podium-flag-wrapper">
                                    {champTeam?.code ? (
                                      <img src={getFlagUrl(champTeam.code)} alt={officialChamp} className="podium-flag" />
                                    ) : (
                                      <div className="podium-flag-placeholder">?</div>
                                    )}
                                  </div>
                                  <select
                                    className="podium-select"
                                    value={officialChamp}
                                    onChange={(e) => handlePodiumChange("first", e.target.value, "gabarito")}
                                    disabled={!isAdminAuthenticated}
                                  >
                                    <option value="">1º Lugar (Campeão)...</option>
                                    {allTeamsList.map((t) => (
                                      <option key={t.name} value={t.name}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="podium-step step-gold">
                                    <span className="step-rank">1º</span>
                                    <span className="step-label">👑 Campeão Oficial</span>
                                  </div>
                                </div>

                                {/* 3º LUGAR - BRONZE */}
                                <div className="podium-block bronze-block">
                                  <div className="podium-flag-wrapper">
                                    {thirdTeam?.code ? (
                                      <img src={getFlagUrl(thirdTeam.code)} alt={officialThird} className="podium-flag" />
                                    ) : (
                                      <div className="podium-flag-placeholder">?</div>
                                    )}
                                  </div>
                                  <select
                                    className="podium-select"
                                    value={officialThird}
                                    onChange={(e) => handlePodiumChange("third", e.target.value, "gabarito")}
                                    disabled={!isAdminAuthenticated}
                                  >
                                    <option value="">3º Lugar...</option>
                                    {allTeamsList.map((t) => (
                                      <option key={t.name} value={t.name}>
                                        {t.name}
                                      </option>
                                    ))}
                                  </select>
                                  <div className="podium-step step-bronze">
                                    <span className="step-rank">3º</span>
                                    <span className="step-label">🥉 3º Lugar Oficial</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      <div className="controls-bar" style={{ marginTop: "20px" }}>
                        <div style={{ display: "flex", gap: "6px", marginLeft: "auto" }}>
                          <button 
                            className={`filter-btn ${viewMode === "chaveamento" ? "active" : ""}`}
                            onClick={() => setViewMode("chaveamento")}
                          >
                            🌳 Visualização em Chaveamento
                          </button>
                          <button 
                            className={`filter-btn ${viewMode === "grade" ? "active" : ""}`}
                            onClick={() => setViewMode("grade")}
                          >
                            🎛️ Visualização em Grade
                          </button>
                        </div>
                      </div>

                      {/* Barra de Filtros (SÓ MOSTRA SE FOR GRADE) */}
                      {viewMode === "grade" && (
                        <div className="controls-bar" style={{ marginTop: "10px" }}>
                          <div className="filters-container">
                            <span className="select-label" style={{ alignSelf: "center" }}>Filtrar Rodada:</span>
                            <button
                              className={`filter-btn ${knockoutStageFilter === "all" ? "active" : ""}`}
                              onClick={() => setKnockoutStageFilter("all")}
                            >
                              Todos
                            </button>
                            <button
                              className={`filter-btn ${knockoutStageFilter === "R32" ? "active" : ""}`}
                              onClick={() => setKnockoutStageFilter("R32")}
                            >
                              16 avos (R32)
                            </button>
                            <button
                              className={`filter-btn ${knockoutStageFilter === "R16" ? "active" : ""}`}
                              onClick={() => setKnockoutStageFilter("R16")}
                            >
                              Oitavas (R16)
                            </button>
                            <button
                              className={`filter-btn ${knockoutStageFilter === "QF" ? "active" : ""}`}
                              onClick={() => setKnockoutStageFilter("QF")}
                            >
                              Quartas (QF)
                            </button>
                            <button
                              className={`filter-btn ${knockoutStageFilter === "SF" ? "active" : ""}`}
                              onClick={() => setKnockoutStageFilter("SF")}
                            >
                              Semifinal (SF)
                            </button>
                            <button
                              className={`filter-btn ${knockoutStageFilter === "FINAL" ? "active" : ""}`}
                              onClick={() => setKnockoutStageFilter("FINAL")}
                            >
                              Finais
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Grid ou Chaveamento de Partidas de Mata-Mata */}
                      {(() => {
                        const leftR32Ids = ["73", "75", "74", "77", "83", "84", "81", "82"];
                        const leftR16Ids = ["90", "89", "93", "94"];
                        const leftQFIds = ["97", "98"];
                        const leftSFIds = ["101"];
                        
                        const centerFinalIds = ["104", "103"];
                        
                        const rightSFIds = ["102"];
                        const rightQFIds = ["99", "100"];
                        const rightR16Ids = ["91", "92", "95", "96"];
                        const rightR32Ids = ["76", "78", "79", "80", "86", "88", "85", "87"];

                        const getOrderedOfficialMatches = (ids: string[]) => {
                          const officialKnockout = getOfficialKnockoutMatches();
                          return ids.map(id => officialKnockout.find(m => m.id === id)).filter(Boolean) as KnockoutMatch[];
                        };

                        if (viewMode === "chaveamento") {
                          const activeStage = getActiveStage();
                          return (
                            <div className="bracket-wrapper no-print">
                              {/* Mobile Navigation Tabs */}
                              <div className="mobile-bracket-nav no-print">
                                <button 
                                  className={`bracket-nav-btn ${bracketTab === "R32" ? "active" : ""}`}
                                  onClick={() => setBracketTab("R32")}
                                >
                                  R32 (16-avos)
                                </button>
                                <button 
                                  className={`bracket-nav-btn ${bracketTab === "R16" ? "active" : ""}`}
                                  onClick={() => setBracketTab("R16")}
                                >
                                  R16 (Oitavas)
                                </button>
                                <button 
                                  className={`bracket-nav-btn ${bracketTab === "QF" ? "active" : ""}`}
                                  onClick={() => setBracketTab("QF")}
                                >
                                  Quartas
                                </button>
                                <button 
                                  className={`bracket-nav-btn ${bracketTab === "SF" ? "active" : ""}`}
                                  onClick={() => setBracketTab("SF")}
                                >
                                  Semifinais
                                </button>
                                <button 
                                  className={`bracket-nav-btn ${bracketTab === "FINAL" ? "active" : ""}`}
                                  onClick={() => setBracketTab("FINAL")}
                                >
                                  Finais
                                </button>
                              </div>

                              <div className="bracket-container">
                                {/* 1. R32 Esquerda */}
                                <div className={`bracket-column left-column r32 ${bracketTab === "R32" ? "active-mobile" : ""} ${activeStage === "R32" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">16-avos (L)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(leftR32Ids).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 2. R16 Esquerda */}
                                <div className={`bracket-column left-column r16 ${bracketTab === "R16" ? "active-mobile" : ""} ${activeStage === "R16" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Oitavas (L)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(leftR16Ids).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 3. QF Esquerda */}
                                <div className={`bracket-column left-column qf ${bracketTab === "QF" ? "active-mobile" : ""} ${activeStage === "QF" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Quartas (L)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(leftQFIds).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 4. SF Esquerda */}
                                <div className={`bracket-column left-column sf ${bracketTab === "SF" ? "active-mobile" : ""} ${activeStage === "SF" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Semifinal (L)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(leftSFIds).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 5. Centro (Final e 3º Lugar) */}
                                <div className={`bracket-column center-column finals ${bracketTab === "FINAL" ? "active-mobile" : ""} ${activeStage === "FINAL" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Decisão</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(centerFinalIds).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 6. SF Direita */}
                                <div className={`bracket-column right-column sf ${bracketTab === "SF" ? "active-mobile" : ""} ${activeStage === "SF" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Semifinal (R)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(rightSFIds).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 7. QF Direita */}
                                <div className={`bracket-column right-column qf ${bracketTab === "QF" ? "active-mobile" : ""} ${activeStage === "QF" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Quartas (R)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(rightQFIds).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 8. R16 Direita */}
                                <div className={`bracket-column right-column r16 ${bracketTab === "R16" ? "active-mobile" : ""} ${activeStage === "R16" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">Oitavas (R)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(rightR16Ids).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>

                                {/* 9. R32 Direita */}
                                <div className={`bracket-column right-column r32 ${bracketTab === "R32" ? "active-mobile" : ""} ${activeStage === "R32" ? "active-stage" : "inactive-stage"}`}>
                                  <h4 className="bracket-column-title">16-avos (R)</h4>
                                  <div className="bracket-match-list">
                                    {getOrderedOfficialMatches(rightR32Ids).map(m => renderKnockoutMatchCard(m, "gabarito"))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Modo Grade
                        const officialKnockout = getOfficialKnockoutMatches();
                        const filteredKnockout = officialKnockout.filter(m => {
                          if (knockoutStageFilter === "all") return true;
                          if (knockoutStageFilter === "FINAL") return m.stage === "FINAL" || m.stage === "3RD";
                          return m.stage === knockoutStageFilter;
                        });

                        return (
                          <div className="matches-grid">
                            {filteredKnockout.map((match) => renderKnockoutMatchCard(match, "gabarito"))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* B. Gabarito Fase de Grupos */}
                  {adminSubTab === "gabarito_grupos" && (
                    <div>
                      <div className="controls-bar">
                        <div className="filters-container">
                          <button
                            className={`filter-btn ${roundFilter === "today" ? "active" : ""}`}
                            onClick={() => setRoundFilter("today")}
                          >
                            🔥 Jogos de Hoje
                          </button>
                          <button
                            className={`filter-btn ${roundFilter === "all" ? "active" : ""}`}
                            onClick={() => setRoundFilter("all")}
                          >
                            Todas Rodadas
                          </button>
                          <button
                            className={`filter-btn ${roundFilter === 1 ? "active" : ""}`}
                            onClick={() => setRoundFilter(1)}
                          >
                            Rodada 1
                          </button>
                          <button
                            className={`filter-btn ${roundFilter === 2 ? "active" : ""}`}
                            onClick={() => setRoundFilter(2)}
                          >
                            Rodada 2
                          </button>
                          <button
                            className={`filter-btn ${roundFilter === 3 ? "active" : ""}`}
                            onClick={() => setRoundFilter(3)}
                          >
                            Rodada 3
                          </button>
                        </div>
                      </div>

                      <div className="controls-bar" style={{ marginTop: "-12px", borderTop: "1px solid rgba(255,255,255,0.02)", paddingTop: "12px" }}>
                        <div className="filters-container">
                          <span className="select-label" style={{ alignSelf: "center" }}>Filtrar Grupo:</span>
                          <button
                            className={`filter-btn ${groupFilter === "all" ? "active" : ""}`}
                            onClick={() => setGroupFilter("all")}
                          >
                            Todos
                          </button>
                          {groupLetters.map((letter) => (
                            <button
                              key={letter}
                              className={`filter-btn ${groupFilter === letter ? "active" : ""}`}
                              onClick={() => setGroupFilter(letter)}
                            >
                              Gr. {letter}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="matches-grid">
                        {sortedFilteredMatches.map((match) => {
                          const result = tempGabarito[match.id] || { home: null, away: null };
                          const isExcluded = isMatchExcluded(matchDates[match.id]);

                          return (
                            <div key={match.id} className={`match-card ${isExcluded ? "excluded-match" : ""}`} style={{ borderLeft: `4px solid ${isExcluded ? "rgba(255,255,255,0.15)" : isAdminAuthenticated ? "var(--secondary)" : "var(--primary)"}` }}>
                              <div className="match-header">
                                <span>{match.groupName} • Rodada {match.round}</span>
                                {isExcluded ? (
                                  <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Fora do Bolão</span>
                                ) : (
                                  <span style={{ color: isAdminAuthenticated ? "var(--secondary)" : "var(--primary)", fontWeight: 700 }}>Gabarito Oficial</span>
                                )}
                              </div>
                              
                              <div className="match-body">
                                <div className="team-container home">
                                  <span className="team-name" title={match.homeTeam.name}>
                                    {match.homeTeam.name}
                                  </span>
                                  <img src={getFlagUrl(match.homeTeam.code)} alt={match.homeTeam.name} className="flag-icon" />
                                </div>

                                <div className="score-container">
                                  <input
                                    type="number"
                                    className="score-input"
                                    style={{ borderColor: isAdminAuthenticated ? "rgba(245, 158, 11, 0.4)" : "rgba(255,255,255,0.05)" }}
                                    min="0"
                                    placeholder="-"
                                    value={result.home ?? ""}
                                    onChange={(e) =>
                                      handleScoreChange(match.id, "home", e.target.value, "gabarito")
                                    }
                                    disabled={!isAdminAuthenticated}
                                  />
                                  <span className="score-divider">x</span>
                                  <input
                                    type="number"
                                    className="score-input"
                                    style={{ borderColor: isAdminAuthenticated ? "rgba(245, 158, 11, 0.4)" : "rgba(255,255,255,0.05)" }}
                                    min="0"
                                    placeholder="-"
                                    value={result.away ?? ""}
                                    onChange={(e) =>
                                      handleScoreChange(match.id, "away", e.target.value, "gabarito")
                                    }
                                    disabled={!isAdminAuthenticated}
                                  />
                                </div>

                                <div className="team-container away">
                                  <img src={getFlagUrl(match.awayTeam.code)} alt={match.awayTeam.name} className="flag-icon" />
                                  <span className="team-name" title={match.awayTeam.name}>
                                    {match.awayTeam.name}
                                  </span>
                                </div>
                              </div>

                              {matchDates[match.id] && (
                                <div className="match-date-info">
                                  📅 {formatMatchDate(matchDates[match.id])}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* BARRA FLUTUANTE DE SALVAMENTO DE EDICÕES */}
          {hasChanges && (
            <div className="save-bar">
              <div className="save-info">
                Você tem <strong>alterações não salvas</strong>.
              </div>
              <div style={{ display: "flex", gap: "12px" }}>
                <button
                  onClick={discardChanges}
                  className="filter-btn"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.15)", color: "#fff" }}
                  disabled={saving}
                >
                  Descartar
                </button>
                <button
                  onClick={(activeTab === "palpites_final" || activeTab === "grupos") ? saveUserGuesses : saveGabarito}
                  className="save-btn"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw className="loader" size={16} style={{ animation: "spin 1s linear infinite", border: "none", width: "16px", height: "16px" }} />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* MODAL DETALHAMENTO DE PALPITES */}
          {selectedDetailUser && (() => {
            const userGuesses = allGuesses[selectedDetailUser] || {};
            
            let points = 0;
            let exactScores = 0;
            let outcomeOnly = 0;
            let errors = 0;
            let playedCount = 0;

            const isFinalPhase = modalPhase === "final";
            const targetMatches = isFinalPhase ? knockoutMatches : matchesList;

            // Se for fase final, adiciona +5 pontos se acertar o campeão
            const userChamp = userGuesses["cup_champion"];
            const officialChamp = gabarito["cup_champion"];
            if (isFinalPhase && userChamp && officialChamp && userChamp === officialChamp) {
              points += 5;
            }

            const modalMatches = targetMatches.map((match) => {
              if (!isFinalPhase && isMatchExcluded(matchDates[match.id])) return null;

              const guess = userGuesses[match.id];
              const real = gabarito[match.id];
              const result = calculateMatchPoints(guess, real);
              
              if (result.type !== "none") {
                playedCount++;
                points += result.points;
                if (result.type === "exact") exactScores++;
                else if (result.type === "outcome") outcomeOnly++;
                else if (result.type === "zero") errors++;
              }

              return {
                match,
                guess,
                real,
                result,
              };
            }).filter(Boolean) as Array<{
              match: Match | KnockoutMatch;
              guess: Score | undefined;
              real: Score | undefined;
              result: { points: number; type: "exact" | "outcome" | "zero" | "none" };
            }>;

            const filteredModalMatches = modalMatches.filter(({ result }) => {
              if (modalFilter === "all") return true;
              if (modalFilter === "pending") return result.type === "none";
              return result.type === modalFilter;
            });

            return (
              <div className="modal-backdrop" onClick={closeDetailModal}>
                <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                  <div className="modal-header">
                    <div className="modal-title-container">
                      {participantAvatars[selectedDetailUser] ? (
                        <img 
                          src={participantAvatars[selectedDetailUser]} 
                          alt={selectedDetailUser} 
                          className="modal-avatar" 
                        />
                      ) : (
                        <div className="participant-avatar-sm" style={{ width: "40px", height: "40px", fontSize: "1rem", background: "#1e293b", marginRight: "12px" }}>
                          {selectedDetailUser.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <h2>Palpites de {selectedDetailUser}</h2>
                        <p>{isFinalPhase ? "Fase Final (Mata-Mata)" : "Fase de Grupos (Histórico)"}</p>
                      </div>
                    </div>
                    <button className="modal-close-btn" onClick={closeDetailModal} title="Fechar">
                      <X size={24} />
                    </button>
                  </div>

                  <div className="modal-body">
                    {/* Exibe palpite de campeão no topo se for Fase Final */}
                    {isFinalPhase && userChamp && (
                      <div className="modal-champion-summary" style={{
                        background: "rgba(245, 158, 11, 0.05)",
                        border: "1px solid rgba(245, 158, 11, 0.15)",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "20px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <Trophy size={24} style={{ color: "#f59e0b" }} />
                          <div>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>Palpite de Campeão da Copa</div>
                            <div style={{ fontWeight: 700, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "6px" }}>
                              {(() => {
                                const team = allTeamsList.find(t => t.name === userChamp);
                                return team?.code ? (
                                  <img src={getFlagUrl(team.code)} alt={userChamp} className="flag-icon" style={{ width: "20px", height: "14px", borderRadius: "2px" }} />
                                ) : null;
                              })()}
                              {userChamp}
                            </div>
                          </div>
                        </div>
                        <div>
                          {officialChamp ? (
                            officialChamp === userChamp ? (
                              <span className="points-badge exact" style={{ fontSize: "0.9rem", padding: "6px 12px" }}>Acertou! (+5 pts)</span>
                            ) : (
                              <span className="points-badge zero" style={{ fontSize: "0.9rem", padding: "6px 12px" }}>Errou (Campeão: {officialChamp})</span>
                            )
                          ) : (
                            <span className="points-badge outcome" style={{ fontSize: "0.9rem", padding: "6px 12px", background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}>Pendente</span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Grid de Estatísticas */}
                    <div className="modal-stats-grid">
                      <div className="modal-stat-card total-pts">
                        <span className="stat-value">{points}</span>
                        <span className="stat-label">Pontos Totais</span>
                      </div>
                      <div className="modal-stat-card exact-pts">
                        <span className="stat-value">{exactScores}</span>
                        <span className="stat-label">Placar Exato (3 pts)</span>
                      </div>
                      <div className="modal-stat-card outcome-pts">
                        <span className="stat-value">{outcomeOnly}</span>
                        <span className="stat-label">Acertou Venc. (1 pt)</span>
                      </div>
                      <div className="modal-stat-card error-pts">
                        <span className="stat-value">{errors}</span>
                        <span className="stat-label">Erros (0 pts)</span>
                      </div>
                    </div>

                    {/* Filtros no Modal */}
                    <div className="modal-filters-container">
                      <button 
                        className={`modal-filter-btn ${modalFilter === "all" ? "active" : ""}`}
                        onClick={() => setModalFilter("all")}
                      >
                        Todos ({modalMatches.length})
                      </button>
                      <button 
                        className={`modal-filter-btn ${modalFilter === "exact" ? "active" : ""}`}
                        onClick={() => setModalFilter("exact")}
                      >
                        🏆 Exato ({exactScores})
                      </button>
                      <button 
                        className={`modal-filter-btn ${modalFilter === "outcome" ? "active" : ""}`}
                        onClick={() => setModalFilter("outcome")}
                      >
                        ✅ Vencedor ({outcomeOnly})
                      </button>
                      <button 
                        className={`modal-filter-btn ${modalFilter === "zero" ? "active" : ""}`}
                        onClick={() => setModalFilter("zero")}
                      >
                        ❌ Erros ({errors})
                      </button>
                      <button 
                        className={`modal-filter-btn ${modalFilter === "pending" ? "active" : ""}`}
                        onClick={() => setModalFilter("pending")}
                      >
                        ⏳ Aguardando ({modalMatches.length - playedCount})
                      </button>
                    </div>

                    <h3 className="modal-section-title">Detalhamento dos Jogos</h3>
                    
                    {/* Lista de Partidas */}
                    <div className="modal-matches-list">
                      {filteredModalMatches.length === 0 ? (
                        <div className="empty-state" style={{ padding: "40px 20px" }}>
                          <AlertTriangle className="empty-state-icon" />
                          <p>Nenhum jogo encontrado com o filtro selecionado.</p>
                        </div>
                      ) : (
                        filteredModalMatches.map(({ match, guess, real, result }) => {
                          const pointsType = result.type;
                          const hasGuess = guess && guess.home !== null && guess.away !== null;
                          const hasReal = real && real.home !== null && real.away !== null;

                          let badgeText = "Aguardando";
                          let badgeClass = "pending";

                          if (pointsType === "exact") {
                            badgeText = "Placar Exato (+3)";
                            badgeClass = "exact";
                          } else if (pointsType === "outcome") {
                            badgeText = "Acertou Vencedor (+1)";
                            badgeClass = "outcome";
                          } else if (pointsType === "zero") {
                            badgeText = "Errou (0 pts)";
                            badgeClass = "zero";
                          }

                          const homeCode = match.homeTeam.code;
                          const awayCode = match.awayTeam.code;

                          return (
                            <div key={match.id} className={`modal-match-item border-${badgeClass}`}>
                              <div className="modal-match-header">
                                <span>{match.groupName}</span>
                                <span className={`modal-points-badge ${badgeClass}`}>{badgeText}</span>
                              </div>
                              <div className="modal-match-body">
                                {/* Time Casa */}
                                <div className="modal-team home">
                                  <span className="modal-team-name">{match.homeTeam.name}</span>
                                  {homeCode && <img src={getFlagUrl(homeCode)} alt={match.homeTeam.name} className="flag-icon" />}
                                </div>

                                {/* Placar Comparativo */}
                                <div className="modal-score-comparison">
                                  <div className="score-comparison-row">
                                    <span className="score-row-label">Palpite:</span>
                                    <span className="score-row-value">
                                      {hasGuess ? `${guess.home} x ${guess.away}` : "- x -"}
                                    </span>
                                  </div>
                                  <div className="score-comparison-row">
                                    <span className="score-row-label">Resultado:</span>
                                    <span className="score-row-value highlight">
                                      {hasReal ? `${real.home} x ${real.away}` : "Aguardando"}
                                    </span>
                                  </div>
                                </div>

                                {/* Time Visitante */}
                                <div className="modal-team away">
                                  {awayCode && <img src={getFlagUrl(awayCode)} alt={match.awayTeam.name} className="flag-icon" />}
                                  <span className="modal-team-name">{match.awayTeam.name}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </>
      )}
    </div>
  );
}

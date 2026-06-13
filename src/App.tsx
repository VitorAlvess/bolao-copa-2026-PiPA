import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  FileText, 
  Settings, 
  Save, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw,
  Crown
} from "lucide-react";
import { supabase } from "./supabaseClient";
import { participants, matchesList, getFlagUrl, participantAvatars, groupsData, isMatchExcluded, parseMatchDate, type Match } from "./data/teams";

// Tipagens do App
interface Score {
  home: number | null;
  away: number | null;
}

type GuessesData = Record<string, Score>; // match_id -> { home, away }
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
  "A_1_1": "06/11/2026 13:00",
  "A_1_2": "06/11/2026 20:00",
  "B_1_1": "06/12/2026 15:00",
  "D_1_1": "06/12/2026 18:00",
  "C_1_2": "06/13/2026 21:00",
  "D_1_2": "06/13/2026 21:00",
  "C_1_1": "06/13/2026 18:00",
  "B_1_2": "06/13/2026 16:00",
  "E_1_2": "06/14/2026 19:00",
  "E_1_1": "06/14/2026 12:00",
  "F_1_1": "06/14/2026 15:00",
  "F_1_2": "06/14/2026 20:00",
  "G_1_2": "06/15/2026 18:00",
  "H_1_1": "06/15/2026 12:00",
  "G_1_1": "06/15/2026 12:00",
  "H_1_2": "06/15/2026 18:00",
  "I_1_1": "06/16/2026 15:00",
  "I_1_2": "06/16/2026 18:00",
  "J_1_1": "06/16/2026 20:00",
  "J_1_2": "06/16/2026 21:00",
  "K_3_2": "06/17/2026 12:00",
  "L_1_1": "06/17/2026 15:00",
  "K_3_1": "06/17/2026 20:00",
  "L_1_2": "06/17/2026 19:00",
  "A_2_1": "06/18/2026 19:00",
  "B_2_2": "06/18/2026 12:00",
  "B_2_1": "06/18/2026 15:00",
  "A_2_2": "06/18/2026 12:00",
  "C_2_1": "06/19/2026 21:00",
  "C_2_2": "06/19/2026 18:00",
  "D_2_1": "06/19/2026 12:00",
  "D_2_2": "06/19/2026 20:00",
  "E_2_1": "06/20/2026 16:00",
  "E_2_2": "06/20/2026 19:00",
  "F_2_1": "06/20/2026 12:00",
  "F_2_2": "06/20/2026 22:00",
  "G_2_1": "06/21/2026 12:00",
  "G_2_2": "06/21/2026 18:00",
  "H_2_1": "06/21/2026 12:00",
  "H_2_2": "06/21/2026 18:00",
  "I_2_1": "06/22/2026 17:00",
  "I_2_2": "06/22/2026 20:00",
  "J_2_1": "06/22/2026 12:00",
  "J_2_2": "06/22/2026 20:00",
  "K_1_2": "06/23/2026 12:00",
  "L_3_1": "06/23/2026 19:00",
  "K_1_1": "06/23/2026 20:00",
  "L_3_2": "06/23/2026 16:00",
  "C_3_1": "06/24/2026 18:00",
  "C_3_2": "06/24/2026 18:00",
  "A_3_2": "06/24/2026 19:00",
  "A_3_1": "06/24/2026 19:00",
  "B_3_2": "06/24/2026 12:00",
  "B_3_1": "06/24/2026 12:00",
  "E_3_2": "06/25/2026 16:00",
  "E_3_1": "06/25/2026 16:00",
  "D_3_2": "06/25/2026 19:00",
  "D_3_1": "06/25/2026 19:00",
  "F_3_2": "06/25/2026 18:00",
  "F_3_1": "06/25/2026 18:00",
  "I_3_2": "06/26/2026 15:00",
  "I_3_1": "06/26/2026 15:00",
  "G_3_2": "06/26/2026 20:00",
  "G_3_1": "06/26/2026 20:00",
  "H_3_2": "06/26/2026 19:00",
  "H_3_1": "06/26/2026 18:00",
  "L_2_2": "06/27/2026 17:00",
  "L_2_1": "06/27/2026 17:00",
  "J_3_2": "06/27/2026 21:00",
  "J_3_1": "06/27/2026 21:00",
  "K_2_1": "06/27/2026 19:30",
  "K_2_2": "06/27/2026 19:30"
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

export default function App() {
  // Controle de Abas
  const [activeTab, setActiveTab] = useState<"ranking" | "palpites" | "gabarito">("ranking");
  
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

      // Atualiza as datas dos jogos com base nos dados mais recentes da API
      const datesMap: Record<string, string> = { ...defaultMatchDates };
      data.games.forEach((apiGame: any) => {
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

        if (matchingMatch && apiGame.local_date) {
          // Mantemos os horários oficiais do defaultMatchDates ajustados para Brasília/São Paulo
          // e evitamos sobrescrever com o fuso horário diferente da API
          // datesMap[matchingMatch.id] = apiGame.local_date;
        }
      });
      setMatchDates(datesMap);

      // Filtra apenas jogos finalizados
      const finishedGames = data.games.filter((g: any) => g.finished === "TRUE");
      
      if (finishedGames.length === 0) {
        return;
      }

      const updatedGabarito = { ...dbGabarito };
      let hasNewScores = false;

      finishedGames.forEach((apiGame: any) => {
        const homeEng = apiGame.home_team_name_en;
        const awayEng = apiGame.away_team_name_en;

        const homePt = teamNameMapping[homeEng] || homeEng;
        const awayPt = teamNameMapping[awayEng] || awayEng;

        // Encontra o jogo correspondente no bolão pelo grupo e seleções (qualquer ordem de mandante/visitante)
        const matchingMatch = matchesList.find(
          (m) =>
            m.groupName === `Grupo ${apiGame.group}` &&
            ((m.homeTeam.name === homePt && m.awayTeam.name === awayPt) ||
             (m.homeTeam.name === awayPt && m.awayTeam.name === homePt))
        );

        if (matchingMatch) {
          const apiHomeScore = apiGame.home_score !== null && apiGame.home_score !== "null" ? parseInt(apiGame.home_score) : null;
          const apiAwayScore = apiGame.away_score !== null && apiGame.away_score !== "null" ? parseInt(apiGame.away_score) : null;

          if (apiHomeScore !== null && apiAwayScore !== null && !isNaN(apiHomeScore) && !isNaN(apiAwayScore)) {
            // Verifica se a ordem mandante/visitante está invertida em relação ao bolão
            const isReversed = matchingMatch.homeTeam.name === awayPt;
            const homeScore = isReversed ? apiAwayScore : apiHomeScore;
            const awayScore = isReversed ? apiHomeScore : apiAwayScore;

            // Verifica se houve mudança ou se está ausente no banco
            const current = dbGabarito[matchingMatch.id] || { home: null, away: null };
            if (current.home !== homeScore || current.away !== awayScore) {
              updatedGabarito[matchingMatch.id] = { home: homeScore, away: awayScore };
              hasNewScores = true;
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

  // Processa a classificação de todos os participantes
  const getLeaderboard = (): ParticipantRanking[] => {
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

  // Envia e trava os palpites de hoje para o participante
  const submitAndLockTodayGuesses = async () => {
    // Encontra todos os jogos de hoje
    const todayMatches = matchesList.filter((m) => isMatchToday(m.id) && !isMatchExcluded(matchDates[m.id]));
    
    // Verifica se todos têm placar preenchido
    const missingGuesses = todayMatches.filter((m) => {
      const g = tempGuesses[m.id] || allGuesses[selectedUser]?.[m.id];
      return !g || g.home === null || g.away === null;
    });
    
    if (missingGuesses.length > 0) {
      if (!confirm(`Você ainda não preencheu todos os jogos de hoje. Deseja enviar mesmo assim? (Os jogos sem palpites contarão como 0 pontos e não poderão ser preenchidos depois)`)) {
        return;
      }
    } else {
      if (!confirm(`Tem certeza que deseja ENVIAR e TRAVAR os palpites de hoje para ${selectedUser}? Após a confirmação, os palpites de hoje NÃO poderão mais ser alterados!`)) {
        return;
      }
    }
    
    setSaving(true);
    try {
      const updatedGuesses = {
        ...(tempGuesses || allGuesses[selectedUser] || {}),
        "TODAY_LOCKED": { home: 1, away: 1 }
      };
      
      const { error } = await supabase
        .from("user_guesses")
        .upsert({
          username: selectedUser,
          guesses: updatedGuesses,
          updated_at: new Date().toISOString()
        });
        
      if (error) throw error;
      
      setAllGuesses((prev) => ({
        ...prev,
        [selectedUser]: updatedGuesses
      }));
      setTempGuesses(updatedGuesses);
      setHasChanges(false);
      
      showToast("Palpites de hoje enviados e travados com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao travar palpites:", err);
      showToast("Não foi possível enviar os palpites.", "error");
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
    if (activeTab === "palpites") {
      setTempGuesses(allGuesses[selectedUser] || {});
    } else if (activeTab === "gabarito") {
      setTempGabarito(gabarito);
      setTempGuessesLocked(guessesLocked);
    }
    setHasChanges(false);
    showToast("Alterações descartadas.", "success");
  };

  const isMatchToday = (matchId: string): boolean => {
    const dateStr = matchDates[matchId];
    if (!dateStr) return false;
    try {
      const matchDate = parseMatchDate(dateStr);
      const today = new Date();
      return (
        matchDate.getDate() === today.getDate() &&
        matchDate.getMonth() === today.getMonth() &&
        matchDate.getFullYear() === today.getFullYear()
      );
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
  const ranking = getLeaderboard();
  const topThree = ranking.slice(0, 3);
  const activeMatchesCount = matchesList.filter((m) => !isMatchExcluded(matchDates[m.id])).length;

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
        <div className="header-badge">Fase de Grupos</div>
        <h1 className="app-title">🏆 Bolão do PiPA copa 2026</h1>
        <p className="app-subtitle">Será que o Zé vai ganhar?</p>
        {activeTab === "ranking" && (
          <div className="print-user-title print-only">
            Classificação Geral
          </div>
        )}
        {activeTab === "palpites" && (
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
          className={`tab-btn ${activeTab === "ranking" ? "active" : ""}`}
          onClick={() => {
            if (hasChanges) {
              if (confirm("Você tem alterações não salvas. Deseja mudar de aba e perder as edições?")) {
                setHasChanges(false);
                setActiveTab("ranking");
              }
            } else {
              setActiveTab("ranking");
            }
          }}
        >
          <Trophy size={18} />
          Classificação
        </button>
        <button 
          className={`tab-btn ${activeTab === "palpites" ? "active" : ""}`}
          onClick={() => {
            if (hasChanges) {
              if (confirm("Você tem alterações não salvas. Deseja mudar de aba e perder as edições?")) {
                setHasChanges(false);
                setActiveTab("palpites");
              }
            } else {
              setActiveTab("palpites");
            }
          }}
        >
          <FileText size={18} />
          Meus Palpites
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
          {/* ABA 1: CLASSIFICAÇÃO / RANKING */}
          {activeTab === "ranking" && (
            <div className="ranking-container">
              
              <div className="pdf-actions no-print">
                <button className="pdf-btn" onClick={() => window.print()}>
                  <FileText size={16} />
                  Salvar PDF da Classificação
                </button>
              </div>
              
              {/* Podium Visual (Para Top 3) */}
              <div className="podium-section">
                
                {/* 2º Lugar */}
                {topThree[1] && (
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
                  </div>
                )}

                {/* 1º Lugar */}
                {topThree[0] && (
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
                  </div>
                )}

                {/* 3º Lugar */}
                {topThree[2] && (
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
                  </div>
                )}
              </div>

              {/* Tabela Completa de Classificação */}
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
                    </tr>
                  </thead>
                  <tbody>
                    {ranking.map((user, idx) => (
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
                          {user.playedCount} / {activeMatchesCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Seção da Classificação Geral dos Grupos baseada no Gabarito Oficial */}
              <div style={{ marginTop: "40px" }} className="no-print">
                <h2 style={{ 
                  fontSize: "1.4rem", 
                  fontWeight: "800", 
                  marginBottom: "20px", 
                  textAlign: "center",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px"
                }}>
                  📊 Classificação Oficial dos Grupos
                </h2>
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
              </div>
            </div>
          )}

          {/* ABA 2: MEUS PALPITES */}
          {activeTab === "palpites" && (
            <div>
              {guessesLocked && (
                <div className="locked-warning">
                  <Lock size={18} />
                  <span><strong>Palpites Encerrados:</strong> O prazo para preencher ou alterar os palpites acabou! Os placares estão travados apenas para visualização.</span>
                </div>
              )}

              <div className="pdf-actions no-print" style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "20px" }}>
                <button className="pdf-btn" onClick={() => window.print()}>
                  <FileText size={16} />
                  Salvar PDF dos Palpites ({selectedUser})
                </button>
                
                {tempGuesses["TODAY_LOCKED"]?.home === 1 || allGuesses[selectedUser]?.["TODAY_LOCKED"]?.home === 1 ? (
                  <button className="pdf-btn" disabled style={{ background: "rgba(16, 185, 129, 0.08)", color: "var(--success)", border: "1px solid rgba(16, 185, 129, 0.2)", cursor: "not-allowed" }}>
                    <Lock size={16} />
                    Palpites de Hoje Enviados e Travados 🔒
                  </button>
                ) : (
                  <button 
                    className="save-btn" 
                    onClick={submitAndLockTodayGuesses}
                    disabled={saving}
                    style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", borderColor: "#d97706", color: "#000", fontWeight: 700, boxShadow: "0 4px 10px rgba(245, 158, 11, 0.2)" }}
                  >
                    {saving ? (
                      "Enviando..."
                    ) : (
                      <>
                        <Lock size={16} />
                        Enviar e Travar Palpites de Hoje 🔒
                      </>
                    )}
                  </button>
                )}
              </div>

              {/* Barra de Filtros e Seletor de Nome */}
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

                {/* Filtros de Rodadas */}
                <div className="filters-container">
                  <button
                    className={`filter-btn ${roundFilter === "today" ? "active" : ""}`}
                    onClick={() => setRoundFilter("today")}
                    style={{
                      borderColor: roundFilter === "today" ? "var(--secondary)" : "rgba(255,255,255,0.05)",
                      background: roundFilter === "today" ? "var(--secondary-glow)" : undefined,
                      color: roundFilter === "today" ? "var(--secondary)" : undefined,
                      fontWeight: 700
                    }}
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

              {/* Filtro secundário por Grupos */}
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

              {/* Ordenação dos Jogos */}
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

              {/* Tabela de Classificação do Grupo (se houver grupo selecionado) */}
              {groupFilter !== "all" && (
                <div className="group-standings-card">
                  <h3 className="group-standings-title">
                    📊 Classificação Simulada - Grupo {groupFilter} ({selectedUser})
                  </h3>
                  <div className="ranking-table-card" style={{ boxShadow: "none", border: "none" }}>
                    <table className="group-standings-table">
                      <thead>
                        <tr>
                          <th style={{ width: "50px" }}>Pos</th>
                          <th>Seleção</th>
                          <th style={{ textAlign: "center" }}>P</th>
                          <th style={{ textAlign: "center" }}>J</th>
                          <th style={{ textAlign: "center" }}>V</th>
                          <th style={{ textAlign: "center" }}>E</th>
                          <th style={{ textAlign: "center" }}>D</th>
                          <th style={{ textAlign: "center" }}>GP</th>
                          <th style={{ textAlign: "center" }}>GC</th>
                          <th style={{ textAlign: "center" }}>SG</th>
                        </tr>
                      </thead>
                      <tbody>
                        {getGroupStandings(groupFilter, tempGuesses).map((team, idx) => (
                          <tr key={team.code} className={`standings-row rank-${idx + 1}`}>
                            <td>
                              <span className={`standings-badge rank-${idx + 1}`}>
                                {idx + 1}º
                              </span>
                            </td>
                            <td className="standings-team-col">
                              <img src={getFlagUrl(team.code)} alt={team.name} className="flag-icon" />
                              <span>{team.name}</span>
                            </td>
                            <td style={{ textAlign: "center", fontWeight: "700" }}>{team.points}</td>
                            <td style={{ textAlign: "center" }}>{team.played}</td>
                            <td style={{ textAlign: "center" }}>{team.won}</td>
                            <td style={{ textAlign: "center" }}>{team.drawn}</td>
                            <td style={{ textAlign: "center" }}>{team.lost}</td>
                            <td style={{ textAlign: "center" }}>{team.goalsFor}</td>
                            <td style={{ textAlign: "center" }}>{team.goalsAgainst}</td>
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
                </div>
              )}

              {/* Grid de Partidas */}
              {filteredMatches.length === 0 ? (
                <div className="empty-state">
                  <AlertTriangle className="empty-state-icon" />
                  <p>Nenhum jogo encontrado com os filtros selecionados.</p>
                </div>
              ) : (
                <div className="matches-grid">
                  {sortedFilteredMatches.map((match) => {
                    const isExcluded = isMatchExcluded(matchDates[match.id]);
                    const isToday = isMatchToday(match.id);
                    const isTodayLocked = (tempGuesses["TODAY_LOCKED"]?.home === 1 || allGuesses[selectedUser]?.["TODAY_LOCKED"]?.home === 1) && isToday;
                    const started = isMatchStarted(match.id);
                    const isLocked = isTodayLocked || started;
                    const guess = tempGuesses[match.id] || { home: null, away: null };
                    const realResult = gabarito[match.id];
                    const pointsResult = calculateMatchPoints(guess, realResult);

                    return (
                      <div key={match.id} className={`match-card ${isExcluded ? "excluded-match" : ""} ${isLocked ? "locked-match" : ""}`} style={{ opacity: isLocked ? 0.85 : 1 }}>
                        <div className="match-header">
                          <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            {match.groupName} • Rodada {match.round}
                            {isLocked && <Lock size={12} style={{ color: started ? "var(--error)" : "var(--secondary)" }} />}
                          </span>
                          {isExcluded ? (
                            <span className="points-badge outcome" style={{ background: "rgba(255,255,255,0.05)", color: "var(--text-muted)", border: "1px solid rgba(255,255,255,0.1)" }}>
                              Fora do bolão
                            </span>
                          ) : started ? (
                            <span className="points-badge" style={{ background: "rgba(239, 68, 68, 0.12)", color: "var(--error)", border: "1px solid rgba(239, 68, 68, 0.2)" }}>
                              Jogo Iniciado
                            </span>
                          ) : pointsResult.type !== "none" && (
                            <span className={`points-badge ${pointsResult.type}`}>
                              {pointsResult.points} {pointsResult.points === 1 ? "Ponto" : "Pontos"}
                            </span>
                          )}
                        </div>
                        
                        <div className="match-body">
                          {/* Time de Casa */}
                          <div className="team-container home">
                            <span className="team-name" title={match.homeTeam.name}>
                              {match.homeTeam.name}
                            </span>
                            <img
                              src={getFlagUrl(match.homeTeam.code)}
                              alt={match.homeTeam.name}
                              className="flag-icon"
                            />
                          </div>
 
                          {/* Inputs do Placar */}
                          <div className="score-container">
                            <input
                              type="number"
                              className="score-input"
                              min="0"
                              placeholder="-"
                              value={guess.home ?? ""}
                              onChange={(e) =>
                                handleScoreChange(match.id, "home", e.target.value, "palpite")
                              }
                              disabled={guessesLocked || isExcluded || isLocked}
                            />
                            <span className="score-divider">x</span>
                            <input
                              type="number"
                              className="score-input"
                              min="0"
                              placeholder="-"
                              value={guess.away ?? ""}
                              onChange={(e) =>
                                handleScoreChange(match.id, "away", e.target.value, "palpite")
                              }
                              disabled={guessesLocked || isExcluded || isLocked}
                            />
                          </div>

                          {/* Time Visitante */}
                          <div className="team-container away">
                            <img
                              src={getFlagUrl(match.awayTeam.code)}
                              alt={match.awayTeam.name}
                              className="flag-icon"
                            />
                            <span className="team-name" title={match.awayTeam.name}>
                              {match.awayTeam.name}
                            </span>
                          </div>
                        </div>

                        {/* Data e hora do jogo */}
                        {matchDates[match.id] && (
                          <div className="match-date-info">
                            📅 {formatMatchDate(matchDates[match.id])}
                          </div>
                        )}

                        {/* Informação sobre o gabarito oficial (Se o jogo já tiver acontecido) */}
                        {realResult && realResult.home !== null && realResult.away !== null && (
                          <div className="gabarito-score-info">
                            Resultado Real: <strong>{realResult.home} x {realResult.away}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ABA 3: GABARITO (ADMIN) */}
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
                        <span><strong>Bloquear Palpites dos Participantes:</strong> {tempGuessesLocked ? "Bloqueado 🔒" : "Liberado 🔓"}</span>
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

                  <div className="controls-bar">
                    <div className="user-selector-container">
                      <span className="select-label" style={{ color: isAdminAuthenticated ? "var(--secondary)" : "var(--text-muted)" }}>
                        {isAdminAuthenticated ? "Modo Admin Liberado" : "Gabarito Oficial"}
                      </span>
                    </div>

                    <div className="filters-container">
                      <button
                        className={`filter-btn ${roundFilter === "today" ? "active" : ""}`}
                        onClick={() => setRoundFilter("today")}
                        style={{
                          borderColor: roundFilter === "today" ? "var(--secondary)" : "rgba(255,255,255,0.05)",
                          background: roundFilter === "today" ? "var(--secondary-glow)" : undefined,
                          color: roundFilter === "today" ? "var(--secondary)" : undefined,
                          fontWeight: 700
                        }}
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

                  {/* Ordenação dos Jogos (Admin) */}
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

                  {/* Tabela de Classificação do Grupo (se houver grupo selecionado) */}
                  {groupFilter !== "all" && (
                    <div className="group-standings-card" style={{ borderLeft: `4px solid ${isAdminAuthenticated ? "var(--accent)" : "var(--primary)"}` }}>
                      <h3 className="group-standings-title" style={{ color: isAdminAuthenticated ? "var(--accent)" : "var(--primary)" }}>
                        📊 Classificação Oficial - Grupo {groupFilter}
                      </h3>
                      <div className="ranking-table-card" style={{ boxShadow: "none", border: "none" }}>
                        <table className="group-standings-table">
                          <thead>
                            <tr>
                              <th style={{ width: "50px" }}>Pos</th>
                              <th>Seleção</th>
                              <th style={{ textAlign: "center" }}>P</th>
                              <th style={{ textAlign: "center" }}>J</th>
                              <th style={{ textAlign: "center" }}>V</th>
                              <th style={{ textAlign: "center" }}>E</th>
                              <th style={{ textAlign: "center" }}>D</th>
                              <th style={{ textAlign: "center" }}>GP</th>
                              <th style={{ textAlign: "center" }}>GC</th>
                              <th style={{ textAlign: "center" }}>SG</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getGroupStandings(groupFilter, tempGabarito).map((team, idx) => (
                              <tr key={team.code} className={`standings-row rank-${idx + 1}`}>
                                <td>
                                  <span className={`standings-badge rank-${idx + 1}`}>
                                    {idx + 1}º
                                  </span>
                                </td>
                                <td className="standings-team-col">
                                  <img src={getFlagUrl(team.code)} alt={team.name} className="flag-icon" />
                                  <span>{team.name}</span>
                                </td>
                                <td style={{ textAlign: "center", fontWeight: "700" }}>{team.points}</td>
                                <td style={{ textAlign: "center" }}>{team.played}</td>
                                <td style={{ textAlign: "center" }}>{team.won}</td>
                                <td style={{ textAlign: "center" }}>{team.drawn}</td>
                                <td style={{ textAlign: "center" }}>{team.lost}</td>
                                <td style={{ textAlign: "center" }}>{team.goalsFor}</td>
                                <td style={{ textAlign: "center" }}>{team.goalsAgainst}</td>
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
                    </div>
                  )}

                  <div className="matches-grid">
                    {sortedFilteredMatches.map((match) => {
                      const result = tempGabarito[match.id] || { home: null, away: null };
                      const isExcluded = isMatchExcluded(matchDates[match.id]);

                      return (
                        <div key={match.id} className={`match-card ${isExcluded ? "excluded-match" : ""}`} style={{ borderLeft: `4px solid ${isExcluded ? "rgba(255,255,255,0.15)" : isAdminAuthenticated ? "var(--accent)" : "var(--primary)"}` }}>
                          <div className="match-header">
                            <span>{match.groupName} • Rodada {match.round}</span>
                            {isExcluded ? (
                              <span style={{ color: "var(--text-muted)", fontWeight: 500 }}>Fora do Bolão</span>
                            ) : (
                              <span style={{ color: isAdminAuthenticated ? "var(--accent)" : "var(--primary)", fontWeight: 700 }}>Gabarito Oficial</span>
                            )}
                          </div>
                          
                          <div className="match-body">
                            <div className="team-container home">
                              <span className="team-name" title={match.homeTeam.name}>
                                {match.homeTeam.name}
                              </span>
                              <img
                                src={getFlagUrl(match.homeTeam.code)}
                                alt={match.homeTeam.name}
                                className="flag-icon"
                              />
                            </div>

                            <div className="score-container">
                              <input
                                type="number"
                                className="score-input"
                                style={{ borderColor: isAdminAuthenticated ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.05)" }}
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
                                style={{ borderColor: isAdminAuthenticated ? "rgba(59, 130, 246, 0.4)" : "rgba(255,255,255,0.05)" }}
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
                              <img
                                src={getFlagUrl(match.awayTeam.code)}
                                alt={match.awayTeam.name}
                                className="flag-icon"
                              />
                              <span className="team-name" title={match.awayTeam.name}>
                                {match.awayTeam.name}
                              </span>
                            </div>
                          </div>

                          {/* Data e hora do jogo */}
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
                  onClick={activeTab === "palpites" ? saveUserGuesses : saveGabarito}
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
        </>
      )}
    </div>
  );
}

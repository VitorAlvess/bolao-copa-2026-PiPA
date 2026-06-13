# 🏆 Bolão Copa do Mundo 2026

Um aplicativo web moderno, responsivo e interativo para gerenciar palpites e classificação de um bolão de amigos para a fase de grupos da **Copa do Mundo 2026** (com as 48 seleções e 12 grupos oficiais).

Este projeto conta com um design premium, responsividade, integração em tempo real com banco de dados Supabase e exportação de PDF otimizada para impressão.

---

## 🚀 Funcionalidades Principais

*   **🏆 Classificação em Tempo Real (Leaderboard):**
    *   Tabela completa de pontuação geral dos participantes.
    *   Cálculo automatizado de pontos baseado nos palpites contra o Gabarito Oficial:
        *   **Placar Exato (3 pontos):** Acerto completo do placar do jogo.
        *   **Acertou Vencedor/Empate (1 ponto):** Acerto da tendência do jogo, mas não o placar exato.
        *   **Erros (0 pontos):** Qualquer outro resultado.
    *   Pódio visual animado em destaque para o Top 3 (1º, 2º e 3º lugares).
    *   Filtros inteligentes para detalhar as pontuações e quantidade de acertos.

*   **📝 Cadastro e Visualização de Palpites:**
    *   Interface intuitiva organizada por rodadas (Rodada 1, 2 e 3) e grupos oficiais (Grupos A ao L).
    *   Seleção de participante para carregar e salvar os palpites no banco de dados.
    *   Barra de salvamento flutuante e interativa para evitar perda acidental de dados não salvos.
    *   Bandeiras reais das seleções (alimentadas via FlagCDN) renderizadas instantaneamente.

*   **🔒 Área de Administração (Gabarito):**
    *   Painel restrito protegido por senha (`copa2026`).
    *   Lançamento facilitado do Gabarito Oficial com os resultados reais das partidas.
    *   Funcionalidade de **Bloqueio Total (Lock)** para travar os palpites de todos os participantes antes do início dos jogos.

*   **🖨️ Exportação Inteligente para PDF / Impressão:**
    *   Impressão otimizada via CSS `@media print` para salvar os palpites ou a classificação em formato PDF perfeitamente formatado.
    *   Indicação automática do participante correspondente ou do tipo de documento gerado no topo da página impressa.
    *   Remoção de elementos interativos desnecessários (como botões, abas e barras de filtros) no arquivo final.

---

## 🛠️ Tecnologias Utilizadas

*   **Core:** React 19, TypeScript e Vite.
*   **Banco de Dados & Backend:** Supabase (PostgreSQL) para persistência em tempo real.
*   **Estilização:** Vanilla CSS (com variáveis customizadas, Dark Mode, glassmorphism e animações fluidas).
*   **Ícones:** Lucide React.
*   **Bandeiras:** FlagCDN (imagens de alta performance e escala).

---

## 📋 Pré-requisitos

Antes de iniciar, você vai precisar do **Node.js** instalado em sua máquina.

---

## ⚙️ Instalação e Configuração

### 1. Clonar o Repositório e Instalar Dependências
No terminal, execute os comandos:
```bash
# Instalar dependências do projeto
npm install
```

### 2. Configurar o Banco de Dados (Supabase)
1. Crie um projeto gratuito no [Supabase](https://supabase.com/).
2. Vá para o **SQL Editor** do seu painel do Supabase.
3. Copie as queries do arquivo [database.sql](file:///c:/Users/vitor/Documents/BolaoCopaDoMundo/database.sql) do projeto e execute-as. Isso criará as tabelas `gabarito` e `user_guesses`, configurará as permissões públicas básicas e inserirá os 7 participantes oficiais:
    *   *Cris, Deco, Erick, Gustavo, Zé, Ian e Mendes.*

### 3. Configurar as Variáveis de Ambiente
1. Na raiz do projeto, crie um arquivo chamado `.env` baseado no modelo do arquivo [.env.example](file:///c:/Users/vitor/Documents/BolaoCopaDoMundo/.env.example):
   ```bash
   cp .env.example .env
   ```
2. Abra o `.env` e preencha as variáveis com as credenciais do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto-supabase.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-publica-do-supabase
   ```

---

## 💻 Executando o Projeto

### Modo de Desenvolvimento
Para rodar localmente com Hot Module Replacement (HMR):
```bash
npm run dev
```
O projeto estará disponível por padrão em: **[http://localhost:5173/](http://localhost:5173/)**

### Compilar para Produção
Para gerar a build otimizada da aplicação:
```bash
npm run build
```
Os arquivos gerados para hospedagem estarão localizados na pasta `/dist`.

---

## 👥 Participantes Oficiais
*   Cris
*   Deco
*   Erick
*   Gustavo
*   Zé (favorito oficial do bolão 🐂)
*   Ian
*   Mendes

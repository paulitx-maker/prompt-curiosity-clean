# 🚀 Anti-Jegue (Prompt-Curiosity) — Escola de Prompts Guiados & AI Evaluation

> **SaaS de Engenharia de Prompts e Rastreamento de Custos de IA**  
> Aplicação mobile-first criada para ensinar o método pre-flight de prompting: eliminação de prompts livres e desestruturados ("prompts de jegue"), substituídos por fluxos guiados em 3 etapas com pré-validação técnica de mídia, otimização de custo via modelos eficientes e transparência total de uso.

---

## 💡 O Conceito

Muitos usuários falham no uso de IAs por fornecerem prompts vagos ou mídias inadequadas. O **Anti-Jegue** resolve isso através de um **pre-flight obrigatório de 3 perguntas**, garantindo que o modelo receba exatamente o contexto necessário (plataforma, tom, intenção de reescrita, ruído de fundo, etc.), reduzindo alucinações e otimizando o consumo de tokens.

---

## ✨ Funcionalidades Principais

### 📷 1. Foto → Post (Feed Social Media)
* **Validação Client & Server Side**: Checagem automática de dimensão (mínimo 500x500px) e tamanho de arquivo (mín. 40KB, máx. 8MB) para evitar desperdício de chamadas com imagens comprimidas/corrompidas.
* **Pre-flight Guiado**: Perguntas obrigatórias sobre **Plataforma** (Instagram, LinkedIn, WhatsApp), **Tom** (Vendas, Informativo, Engraçado) e **Diretiva de Texto** (Manter ou Reescrever).
* **Geração Otimizada**: Integração via Edge Functions com modelos de visão computacional de alta eficiência (`google/gemini-flash-lite`).

### 🎙 2. Áudio → Resumo (Transcrição & Inteligência)
* **Pre-flight & Bitrate Check**: Avaliação de duração (máx. 1h) e taxa de bits estimada antes do processamento.
* **Pipeline em Duas Etapas**:
  1. Transcrição de áudio via `openai/whisper-large-v3-turbo`.
  2. Síntese e estruturação contextual via `google/gemini-flash-lite`.
* **Custo Transparente**: Exibição em tempo real do custo estimado da requisição (transcrição + tokens).

---

## 🛠 Tech Stack & Arquitetura

* **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Lucide Icons.
* **Roteamento & Estado**: TanStack Router / TanStack Start.
* **Backend & Infraestrutura**: Supabase (Postgres, RLS), Supabase Edge Functions (Deno Runtime).
* **AI Gateways**: OpenRouter API (`google/gemini-flash-lite`, `openai/whisper-large-v3-turbo`).
* **Package Manager**: Bun / npm.

---

## 🔒 Segurança e Governança

* **Zero Hardcoded Secrets**: Nenhuma API Key é exposta no cliente. Todas as chamadas para gateways externos ocorrem via Edge Functions lendo variáveis isoladas (`Deno.env.get("OPENROUTER_API_KEY")`).
* **Sanitização de Versionamento**: Arquivos sensíveis (`.env`), backups de banco e diretórios temporários (`_tmp/`, `_kit-ux-meta/`) são estritamente ignorados via `.gitignore`.

---

## 🚀 Executar Localmente

### Pré-requisitos
* **Node.js** (v18+) ou **Bun** (Recomendado)
* **Git**

### Passo a Passo

1. **Clonar o repositório:**
   ```bash
   git clone https://github.com/paulitx-maker/prompt-curiosity.git
   cd prompt-curiosity
   ```

2. **Instalar as dependências:**
   ```bash
   bun install
   # ou
   npm install
   ```

3. **Configurar as Variáveis de Ambiente:**
   Crie um arquivo `.env` na raiz do projeto baseado no modelo `.env.example`:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_publica
   ```
   > *Nota: As chaves privadas de APIs de IA ficam configuradas exclusivamente no painel do Supabase Edge Functions.*

4. **Iniciar o Servidor de Desenvolvimento:**
   ```bash
   bun run dev
   # ou
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:5173`.

---

## 📜 Licença e Autor

Desenvolvido por **Paulo Raposo** — Engenharia de Sistemas e Avaliação de Modelos de Inteligência Artificial.

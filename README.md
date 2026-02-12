# Claude Code Agent Teams + LiteLLM BYOM Setup Guide

A complete guide for using **Claude Code Agent Teams** new feature with **LiteLLM** as a proxy to connect to your own local or remote models (BYOM - Bring Your Own Model).

---

## Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Claude Code │────▶│ LiteLLM      │────▶│   Ollama    │
│   (CLI)     │     │  Proxy       │     │  (Local LLM)│
│             │     │  Port 4000   │     │  Port 11434 │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ PostgreSQL   │
                    │   Database   │
                    └──────────────┘
```

**Why this setup?**
- Claude Code requires an Anthropic-compatible API endpoint
- LiteLLM translates between Anthropic's API format and your model's format
- Use any model you want while keeping Claude Code's powerful features

---

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Ollama](https://ollama.com/download) (for local models)
- At least one model pulled in Ollama (e.g., `qwen2.5`, `llama3.2`, `mistral`)

---

## Step 1: Install Claude Code

### macOS

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://claude.ai/install.ps1 | iex
```

---

## Step 2: Install Ollama

Donwload from [here](https://ollama.com/download)

or
```bash
# macOS / Linux
curl -fsSL https://ollama.com/install.sh | sh
```

### Pull Model

```bash
ollama pull kimi-k2.5:cloud
# This is a cloud model — no local disk space needed
```

---

## Step 3: Git Clone
```bash
git clone git@github.com:domainio/Claude-Code-Agent-Teams-BYOM.git
```

---

## Step 4: Configure LiteLLM

### 1. Configure Models

Review `config.yaml` to specify your Ollama models:

Already configured with `kimi-k2.5:cloud` model.

```yaml
model_list:
  - model_name: kimi-k2.5
    litellm_params:
      model: ollama/kimi-k2.5:cloud
      api_base: http://host.docker.internal:11434
      api_key: "os.environ/OLLAMA_API_KEY"
```

### 2. Set Environment Variables

Review the `.env` file in this directory:

```bash
# Required - can be any value for Ollama
OLLAMA_API_KEY=nothing-here

# Optional - add other provider keys if needed
# OPENAI_API_KEY=sk-...
```

### 3. Start LiteLLM

```bash
# Start LiteLLM and PostgreSQL
docker-compose up -d

# Check status
docker-compose ps

# View logs (wait for "Uvicorn running on http://0.0.0.0:4000")
docker-compose logs -f litellm
```

---

## Step 4: Configure Claude Code

Create or edit `.claude/settings.json` in this directory:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:11434",
    "ANTHROPIC_AUTH_TOKEN": "ollama",
    "ANTHROPIC_API_KEY": "",
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1"
  },
  "model": "kimi-k2.5:cloud"
}
```

**Settings explained:**

| Setting | Value | Description |
|---------|-------|-------------|
| `ANTHROPIC_BASE_URL` | `http://localhost:4000` | Points to LiteLLM proxy |
| `ANTHROPIC_AUTH_TOKEN` | `ollama` | Provider hint |
| `ANTHROPIC_API_KEY` | `""` | LiteLLM master key from docker-compose.yml |
| `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS` | `1` | Feature flag of **Agent Teams** |
| `model` | `kimi-k2.5:cloud` | Must match `model_name` in config.yaml |

**Alternative: Use Environment Variables**

Instead of `settings.json`, you can set:

```bash
export ANTHROPIC_BASE_URL=http://localhost:4000
export ANTHROPIC_API_KEY=1234
export ANTHROPIC_AUTH_TOKEN=ollama
```

---

## Step 5: Launch Claude Code

```bash
claude
```

### Verify Model in Claude Code

Inside Claude Code, run:

```
/model
```

You should see: `Current model: kimi-k2.5:cloud`

### Test a Conversation

Try asking something:

```
What model are you? How are you running?
```

---

## Stop Services

```bash
# Stop LiteLLM
docker-compose down
```

---

## Tips

1. **429** - since this example uses free Ollama cloud model then your might experience 429 errors
2. **Context limits vary** - Local models often have smaller context than Claude
3. **Restart after config changes**:
   ```bash
   docker-compose restart litellm
   ```
4. **Use smaller models for speed** - `llama3.2` is faster than `qwen2.5:32b`
5. **Snake game** - sample of Claude Code Agent Teams result of: "use agent teams to create a cool snake game"

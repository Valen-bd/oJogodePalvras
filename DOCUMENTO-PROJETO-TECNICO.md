# Documento de Projeto Técnico — Pista

**Versão:** 1.0  
**Data:** 13/10/2026  
**Produto:** jogo casual de adivinhação de palavras em português brasileiro  
**Design de referência:** protótipo editorial **“pista — uma palavra por vez”**, em `prototipos/visual.html`  
**Status:** proposta técnica para orientar implementação; a escolha final de stack e hospedagem deve ser confirmada antes do início do desenvolvimento.

## 1. Objetivo

Descrever como implementar o MVP definido no PRD e representado pelo design escolhido. O documento cobre arquitetura, modelo de conteúdo, regras, interfaces, persistência, segurança, acessibilidade, testes, operação e etapas de entrega.

O jogo deve funcionar como uma experiência web responsiva, sem conta obrigatória, sem anúncios e sem depender de instalação. O desafio diário oferece uma rodada compartilhada por data; a prática permite novas rodadas e escolha de tema.

### 1.1 Referências do projeto

- [Protótipo editorial escolhido](./prototipos/visual.html): aparência, composição, textos e interações de referência.
- [Painel dos protótipos](./prototipos/index.html): acesso às três propostas exploratórias.
- O protótipo é uma prova visual/interativa, não uma implementação de produção. Seu banco de respostas embutido no JavaScript deve ser substituído por dados servidos pela API antes do lançamento.

## 2. Escopo funcional

### Dentro do MVP

- Desafio diário anunciado, válido pela data do Brasil, com troca à meia-noite no fuso `America/Sao_Paulo`.
- Modo prática ilimitado e escolha entre comida, animais, objetos do cotidiano e cultura pop.
- Quatro pistas textuais em ordem progressiva; cada pista é revelada a pedido do jogador.
- Pontuação inicial de 100; cada pista revelada custa 25 pontos; mínimo zero.
- Palpites completos e ilimitados, inclusive depois de revelar a quarta pista ou chegar a zero.
- Normalização de caixa, acentos e espaços repetidos nas respostas.
- Estatísticas locais, progresso diário local e sequência sem punição por dia perdido.
- Compartilhamento voluntário do resultado diário sem palavra-resposta.
- Interface responsiva, teclado operável, feedback não dependente somente de cor, leitor de tela e movimento reduzido.
- Processo editorial com revisão e aprovação humana de cada desafio diário antes da publicação.

### Fora do MVP

- Cadastro, autenticação de jogadores ou sincronização entre dispositivos.
- Ranking, competição, partidas em tempo real ou desafios entre amigos.
- Arquivo jogável de desafios diários passados.
- Anúncios, assinatura, compras, dicas pagas ou conteúdo premium.
- Geração de conteúdo publicada automaticamente sem aprovação editorial.

## 3. Experiência e linguagem visual

### 3.1 Direção de arte

Manter o caráter editorial, acolhedor e leve do protótipo “pista”:

| Token | Valor de referência | Aplicação |
|---|---|---|
| `--paper` | `#f5f2e9` | fundo quente da página |
| `--card` | `#fffdf8` | cartões de jogo e estatísticas |
| `--ink` | `#183c36` | texto principal |
| `--muted` | `#697773` | textos de apoio |
| `--green` | `#1c5147` | ação principal, destaque e progresso |
| `--green-dark` | `#153d36` | variação escura para estados interativos |
| `--coral` | `#ee755b` | acento, foco visível e detalhes |
| `--yellow` | `#f1d27a` | ornamentos e realce secundário |
| `--pale-green` | `#e8f0e9` | ação secundária de revelar pista |
| `--line` | `#dcded4` | divisórias e contornos |

Usar títulos serifados com fontes locais do sistema (`Georgia` como fallback) e textos de interface em fonte sans-serif do sistema. Não carregar fontes ou imagens externas no MVP. Ornamentos devem ser CSS ou SVG inline decorativo, sem informação funcional exclusiva.

O cartão principal recebe borda discreta, cantos arredondados, sombra suave e uma linha superior fina com acentos coral/amarelo/verde. Evitar excesso de animações e preservar contraste e legibilidade em telas pequenas.

### 3.2 Composição da tela

1. **Cabeçalho:** marca “pista” e aviso “Grátis, sem anúncios”.
2. **Introdução:** chamada “Uma palavra. Quatro pistas.” e texto breve sobre a mecânica.
3. **Área principal:** cartão da partida à esquerda e cartão de data/estatísticas à direita em telas largas.
4. **Barra de modo:** alternância “Desafio do dia” / “Praticar”; o desafio mostra o tema diário, enquanto a prática mostra seletor de tema e ação para outra palavra.
5. **Partida:** título, número/identificador visual, explicação, pontos restantes, indicador de quatro segmentos, pistas abertas, botão de revelar pista, campo de palpite, feedback e histórico de palpites.
6. **Painel lateral:** data, estatísticas locais, nota sobre sequência sem punição e compartilhamento.
7. **Rodapé:** jogo gratuito, sem anúncios e informação de que dados ficam neste dispositivo.

Em larguras menores, empilhar cartão de jogo e painel lateral, manter ações com área de toque confortável e impedir rolagem horizontal. Os breakpoints devem ser escolhidos por conteúdo e validados a partir de 320 CSS px, não por modelos de aparelho específicos.

### 3.3 Componentes sugeridos

- `AppShell`: fundo, largura máxima, cabeçalho e rodapé.
- `IntroHeader`: chamada e explicação.
- `ModeSwitch`: modo diário/prática com estado acessível.
- `TopicStamp` e `PracticeTopicPicker`.
- `PuzzleCard`: contêiner sem estado específico de apresentação.
- `ScoreDisplay` e `ScoreTrack`.
- `ClueList`, `ClueItem` e `RevealClueButton`.
- `GuessForm`, `GuessHistory` e `GameFeedback`.
- `DateCard`, `LocalStats` e `ShareResultButton`.

Cada componente visual recebe estado por propriedades; regra de pontuação, carregamento, armazenamento e validação pertencem a serviços/hooks separados da apresentação.

## 4. Arquitetura recomendada

O diretório atualmente contém apenas o README e protótipos HTML autônomos; não há framework, dependências ou ambiente de build existente. Como ponto de partida, recomenda-se uma arquitetura pequena, tipada e dividida entre cliente e API.

### 4.1 Stack de referência

| Camada | Recomendação inicial | Motivo |
|---|---|---|
| Front-end | React + TypeScript + Vite | Componentização da tela e tipagem do estado; build estático simples |
| Estilos | CSS próprio com custom properties | Preserva a direção visual sem adicionar sistema de design pesado |
| API | Node.js + TypeScript + Fastify (ou framework já padronizado pela equipe) | API REST pequena, validação explícita e regras no servidor |
| Banco | PostgreSQL gerenciado | Conteúdo editorial, publicação agendada, histórico de puzzles e auditoria |
| Hospedagem | Front-end estático + API e banco gerenciados | Separação simples entre arquivos de interface e conteúdo/validação |
| Testes | Vitest + Testing Library; Playwright para ponta a ponta | Testes de regras isolados e fluxos reais no navegador |

Estas eram recomendações, não dependências existentes. A primeira implementação funcional adotou Node.js nativo (sem dependências externas) e JavaScript/CSS no cliente para permitir execução imediata neste repositório inicialmente vazio. A aplicação mantém as fronteiras cliente/API e o isolamento do conteúdo descritos abaixo, mas ainda não implementa React, TypeScript, Fastify, PostgreSQL, ferramenta editorial, autenticação editorial, limites distribuídos nem persistência de prática no servidor. O conteúdo atual é um conjunto inicial pequeno mantido em `server/puzzles.mjs`; o desafio diário escolhe deterministicamente uma palavra desse catálogo e poderá repetir palavras, portanto isso não substitui a revisão/aprovação e o calendário editorial de produção. O estado das rodadas diárias e de prática fica em memória no servidor; o token e o progresso diário são guardados no navegador, mas um reinício do servidor cria uma rodada nova. Antes de produção, mover o catálogo para o fluxo editorial com aprovação por data e armazenamento persistente previstos. Esta concessão é adequada ao MVP local/demonstração, não substitui a arquitetura de produção caso seja necessária operação escalável ou manutenção editorial contínua.

### 4.2 Diagrama lógico

```text
Navegador
  ├── App responsivo (UI, estado transitório e armazenamento local)
  ├── localStorage (progresso e estatísticas sem conta)
  └── HTTPS / JSON
        │
        ▼
API do jogo
  ├── calendário diário (America/Sao_Paulo)
  ├── validação de palpite e pontuação
  ├── entrega incremental das pistas
  └── serviço de conteúdo
        │
        ▼
PostgreSQL
  ├── temas e palavras
  ├── quatro pistas por palavra
  ├── calendário/publicação diária
  └── estado editorial e trilha de aprovação

Ferramenta editorial restrita ──► API editorial ──► PostgreSQL
```

### 4.3 Princípio de proteção das respostas

Não incluir a resposta diária nem as pistas ainda fechadas no HTML, bundle JavaScript, endpoint público, cache do navegador ou payload de inicialização. O cliente recebe somente tema, data e metadados públicos. A API retorna uma pista por vez e compara o palpite com a resposta guardada no servidor.

Isso reduz a exposição casual e impede que “ver código-fonte” revele diretamente a resposta do dia. Como não há contas e a competição não faz parte do MVP, o objetivo é evitar spoilers e adulterações triviais, não prometer proteção contra automação ou análise avançada da API.

## 5. Regras e modelo do jogo

### 5.1 Estado de uma rodada

Modelo conceitual no cliente:

```ts
type GameMode = "daily" | "practice";

interface RoundState {
  roundId: string;
  mode: GameMode;
  topic: Topic;
  clueCount: 0 | 1 | 2 | 3 | 4;
  guesses: string[];
  solved: boolean;
  attempts: number;
  score: number;
}
```

O cliente não guarda resposta antes de resolver. O estado diário guardado localmente é associado à chave da data/rodada; ao mudar o identificador ou data, deve iniciar-se uma rodada diária nova. O servidor mantém o índice das pistas, contagem de palpites e estado de resolução por `roundId` opaco. Sem conta, o token é guardado localmente; sessões em memória expiram quando o processo é reiniciado no MVP demonstrativo.

### 5.2 Cálculo e transições

- `score = max(0, 100 - 25 * clueCount)`.
- Pedir pista: permitido se a rodada não estiver resolvida e `clueCount < 4`. O servidor incrementa a pista revelada e devolve apenas o texto correspondente.
- Enviar palpite vazio: rejeitar no cliente e não contabilizar como tentativa.
- Enviar palpite incorreto: incrementar tentativas e registrar feedback; não descontar pontos nem bloquear novas tentativas.
- Enviar palpite correto: marcar a rodada como resolvida, registrar pontuação atual e retornar estado de vitória.
- Depois da quarta pista: desabilitar “Revelar pista”; continuar permitindo palpites ilimitados com pontuação zero.
- Rodada resolvida: não permitir revelar pistas nem reenviar palpites; mostrar resposta, pontos e compartilhamento.
- Trocar tema/iniciar nova prática: pedir uma nova rodada do tema escolhido; não altera o progresso diário.
- O desafio diário fica jogável até a mudança da data de jogo; partidas anteriores não são reabertas no MVP.

### 5.3 Normalização de texto

Implementar a mesma função no cliente para ergonomia e no servidor como autoridade:

1. Normalizar Unicode em `NFD`.
2. Remover marcas diacríticas Unicode (`\p{M}`), para equivalência de acentos/cedilha.
3. Converter para minúsculas com locale `pt-BR`.
4. Aplicar `trim()` e reduzir sequências de espaços em branco a um espaço.
5. Preservar separadores significativos (espaços, hífens e pontuação) no valor canônico.
6. Se uma resposta aceitar grafias alternativas, cadastrá-las como aliases revisados. Não remover todos os espaços/pontuação indiscriminadamente.

Exemplos: `PÃO  DE queijo` equivale a `pao de queijo`; `guarda-chuva` continua distinto de `guarda chuva`, salvo se a redação editorial cadastrar a segunda forma como alias. Comparações e aliases devem ser cobertos por testes para palavras compostas e Unicode.

### 5.4 Datas e desafio diário

- Calcular a data de jogo no servidor usando o identificador IANA `America/Sao_Paulo`; não usar o relógio local do dispositivo como autoridade.
- A mudança ocorre à meia-noite do calendário do fuso, incluindo transições históricas de horário de verão tratadas pela base IANA.
- `puzzleId` e data são imutáveis para uma publicação já iniciada. Corrigir conteúdo exige procedimento editorial explícito e não deve trocar silenciosamente a resposta de quem já jogou.
- A interface exibe a data formatada em `pt-BR`; o identificador enviado à API é opaco e não precisa expor resposta/tema não publicado.
- Se o cliente ficar aberto durante a virada, ao retornar do estado suspenso deve consultar a API e informar que o desafio mudou antes de reiniciar o diário.

### 5.5 Conteúdo por tema

Temas iniciais: `comida`, `animais`, `objetos-do-cotidiano` e `cultura-pop`. Cada puzzle contém resposta canônica, aliases opcionais, quatro pistas ordenadas e metadados editoriais. Cultura pop pode incluir nomes próprios reconhecíveis no Brasil; respostas precisam de critério editorial e revisão de contexto/atualidade.

As pistas devem avançar de associação geral para descrição quase direta; evitar ambiguidade, falsas afirmações, spoilers involuntários em títulos/metadados públicos e referências culturais de nicho apresentadas como universais.

## 6. API proposta

Todos os endpoints são versionados sob `/api/v1`, servidos por HTTPS, com `Content-Type: application/json`. Os nomes são uma proposta inicial, a confirmar na implementação.

| Método e rota | Uso | Conteúdo público |
|---|---|---|
| `GET /api/v1/daily` | Obter data do jogo, tema e metadados | Nunca resposta nem pistas fechadas |
| `POST /api/v1/daily/rounds` | Criar ou restaurar rodada diária pelo token opaco | Estado e token; resposta apenas se a rodada já foi resolvida |
| `GET /api/v1/practice/topics` | Listar temas disponíveis | IDs e nomes |
| `POST /api/v1/practice/rounds` | Criar rodada de prática para um tema | `roundId` opaco e tema, sem resposta |
| `POST /api/v1/rounds/:id/clues` | Revelar a próxima pista, sequencialmente | Somente índice/texto recém-liberado e pontuação derivada |
| `POST /api/v1/rounds/:id/guesses` | Submeter palpite | Correto/incorreto e tentativas; resposta apenas quando correta |
| `GET /api/v1/health` | Verificação operacional | Estado técnico mínimo |

Exemplos conceituais:

```json
// GET /api/v1/daily
{
  "gameDate": "2026-10-13",
  "topic": { "id": "comida", "label": "Comida" },
  "clueCount": 4,
  "pointsPerClue": 25
}
```

```json
// POST /api/v1/daily/rounds (roundId é opcional para restaurar sessão)
{ "roundId": "opaque-id-from-local-storage" }
```

```json
// POST /api/v1/rounds/{roundId}/clues
{ "expectedClueIndex": 0 }

// Resposta
{
  "clueIndex": 1,
  "text": "Tem coroa, mas não é rei.",
  "cluesRevealed": 1,
  "score": 75
}
```

```json
// POST /api/v1/rounds/{roundId}/guesses
{ "guess": "abacaxi" }

// Resposta incorreta
{ "correct": false, "attempts": 2, "score": 75 }

// Resposta correta: somente agora a resposta pode ser devolvida
{ "correct": true, "answer": "abacaxi", "attempts": 3, "score": 75 }
```

### 6.1 Erros e consistência

Usar códigos HTTP adequados e um envelope de erro estável, por exemplo `{ "error": { "code": "ROUND_ALREADY_SOLVED", "message": "..." } }`. Casos esperados: `400` conteúdo inválido, `404` rodada inexistente, `409` pista fora de ordem/rodada resolvida/data encerrada, `429` limite temporário e `5xx` falha operacional.

O servidor valida id, modo, data, índice esperado da pista e formato do palpite. Uma pista fora de ordem retorna `409`; repetir uma pista já liberada devolve o mesmo texto sem novo desconto, tornando o retry idempotente. O servidor mantém estado transitório por token opaco: impede pular pistas e rejeita novos palpites após a vitória. Como não há conta, ranking nem prêmio, qualquer pessoa ainda pode criar outra rodada ou editar dados locais; a API protege o conteúdo e as transições de uma rodada, mas não promete placar antifraude. O cliente não deve converter erro de API em sucesso aparente: apresentar mensagem clara, preservar o estado anterior e oferecer nova tentativa.

Os endpoints de jogo podem ser anônimos. Aplicar limites razoáveis por IP/rodada para mitigar abuso, sem exigir identificador persistente desnecessário. Não registrar palpites em texto por padrão; métricas agregadas e anônimas bastam para saúde do serviço.

## 7. Persistência e modelo de dados

### 7.1 Banco de conteúdo

Esquema relacional conceitual:

```text
topics
  id (PK, slug)
  label
  active

puzzles
  id (PK, UUID/opaque)
  topic_id (FK)
  canonical_answer (restrito)
  editorial_status (draft | review | approved | scheduled | published | retired)
  difficulty (opcional)
  created_at, updated_at
  approved_by, approved_at

puzzle_aliases
  puzzle_id (FK)
  alias_normalized
  UNIQUE(puzzle_id, alias_normalized)

clues
  puzzle_id (FK)
  clue_index (1..4)
  text
  UNIQUE(puzzle_id, clue_index)

daily_schedule
  game_date (PK, data no fuso de jogo)
  puzzle_id (FK, UNIQUE quando necessário)
  status (scheduled | published | retired)
  published_at
```

Adicionar verificação para exatamente quatro pistas antes da aprovação/publicação e garantir que uma resposta não seja duplicada indevidamente em puzzles próximos. O acesso público da API deve usar consultas/projeções que excluam resposta, aliases e pistas ainda não liberadas.

### 7.2 Estado local do navegador

Guardar sob namespace/versionamento explícito, por exemplo:

```text
localStorage["pista:v1:daily:<gameDate>"] = {
  roundId, clueCount, guesses, solved, attempts
}

localStorage["pista:v1:stats"] = {
  dailyWins, dailyPointsTotal, bestDailyScore, playedDays,
  practicePlayed, practiceWins, practicePointsTotal
}
```

Não guardar token, identificador pessoal ou senha. A resposta só é guardada no estado de apresentação após vitória, conforme o texto revelado pela API. Definir política de migração do schema local e recuperar de JSON inválido removendo apenas a chave específica corrompida, informando o usuário quando progresso local não puder ser recuperado.

`localStorage` não é uma fonte confiável para placares públicos; o jogador pode apagá-lo ou editá-lo. Como o MVP não tem competição, isso é aceitável. Evitar sincronização ou promessa de recuperação entre dispositivos.

### 7.3 Estatísticas e sequência

Separar números do diário e da prática. Prática não altera sequência diária. Para este MVP, “dias com jogo” é a contagem acumulada de datas únicas em que o desafio diário foi iniciado; um dia perdido nunca reduz essa contagem, não bloqueia conteúdo e não gera mensagem de falha por ausência. Não é uma sequência estritamente consecutiva. A contagem é exibida no painel lateral.

O design escolhido mostra “Palavras certas”, “Melhor pontuação diária”, “Pontos somados” e “Dias com jogo”. Usar esses rótulos no MVP.

## 8. Fluxos da interface

### 8.1 Desafio diário

1. Carregar `GET /api/v1/daily`; mostrar tema e data enquanto o estado local é lido.
2. Restaurar ou criar o token opaco via `POST /api/v1/daily/rounds`; buscar o progresso local correspondente ao `roundId`.
3. Restaurar pistas já abertas, tentativas, pontuação e resultado resolvido.
4. Ao clicar “Revelar pista”, consultar API, atualizar interface e persistir progresso.
5. Ao submeter palpite, validar campo, enviar API e apresentar mensagem anunciável.
6. Ao acertar, registrar vitória/pontuação local, revelar resposta e ativar compartilhar.
7. Em erro de rede, não alterar estado, explicar o problema e permitir repetir a ação.

### 8.2 Prática

1. Selecionar tema por controle nativo com rótulo.
2. Criar rodada no servidor para o tema escolhido.
3. Jogar pela mesma tela e regras de pistas/pontuação.
4. “Outra palavra” cria nova rodada; pedir confirmação se houver progresso não resolvido ou preservar resultado anterior no histórico local, sem bloquear a ação.
5. Atualizar apenas estatísticas de prática.

### 8.3 Compartilhamento sem spoiler

Gerar saída determinística contendo nome do jogo, data, pontuação e tentativas (quando concluído) ou progresso de pistas (durante a partida), com grade/símbolos sem conteúdo textual. Incluir URL pública do jogo, nunca `answer`, texto de pista privada ou token `roundId`.

Usar `navigator.share()` quando disponível e fallback para copiar texto com `navigator.clipboard.writeText()`. Para contextos sem permissão/HTTPS, mostrar o resultado selecionável e informar como copiar. Compartilhar é sempre ação explícita do usuário; texto parcial informa somente quantas pistas foram abertas e não sugere a resposta.

## 9. Acessibilidade e compatibilidade

- Usar landmarks semânticos (`header`, `main`, `section`, `aside`, `footer`), ordem de headings lógica e rótulo acessível nos controles.
- Alternância de modo com botões e estado `aria-pressed`, ou tabs implementadas integralmente segundo padrão WAI; não usar elementos clicáveis sem semântica.
- `label` programático para palpite/tema; instruções de entrada persistentes; erro e resultado em região `role="status"`/`aria-live="polite"`.
- Mover foco apenas quando necessário (por exemplo, após erro de validação), nunca surpreender após abrir pista.
- Botões e alvos de toque com tamanho confortável; contorno `:focus-visible` claro, sem depender de hover.
- Cores de texto/controles verificadas contra WCAG 2.2 AA; estados de pista e pontuação também comunicados por texto/ícone, não só cor.
- `prefers-reduced-motion: reduce` desativa/reduz animações; conteúdo não depende da animação para ser percebido.
- Testar zoom de 200%, reflow e navegação completa por teclado, leitor de tela e toque.
- Declarar `lang="pt-BR"`, codificar UTF-8 e testar composição Unicode em entradas.

Compatibilidade mínima sugerida: versões estáveis atuais de Chrome, Edge, Firefox e Safari, incluindo Safari/iOS. Validar no dispositivo real quando possível; evitar dependência de APIs de compartilhamento sem fallback.

## 10. Segurança, privacidade e operação

- Todo tráfego de produção via HTTPS; cabeçalhos de segurança e política CSP compatíveis com a aplicação.
- Respostas e pistas fechadas são dados editoriais restritos. API pública não serializa registros inteiros do banco.
- Ferramenta editorial usa autenticação separada, autorização por papel e logs de alteração. A chave administrativa nunca chega ao bundle público.
- Sanitizar conteúdo editorial para texto simples; não aceitar HTML arbitrário em pista/resposta.
- Validar tamanho e tipo de palpite, índices e IDs no servidor; limitar chamadas excessivas.
- Guardar segredos de infraestrutura em variáveis seguras do ambiente, nunca no repositório.
- Minimizar analytics: sem conta, cookies de publicidade ou rastreamento individual. Logs operacionais não devem guardar resposta/palpite em texto.
- Fazer backup do banco e testar restauração; manter calendário editorial e histórico de alterações.
- Monitorar erros de API, latência, disponibilidade do desafio diário e falhas de publicação. Alertar antes de uma data sem puzzle aprovado.

## 11. Fluxo editorial e publicação

1. Criar ou importar palavras e pistas em lote como `draft`.
2. Validar tema, resposta normalizada, aliases, exatamente quatro pistas, comprimento e campos obrigatórios.
3. Rodar verificações automáticas: resposta duplicada, pista repetida, pista vazia, pista que contém a resposta, dados fora do tema e falhas de normalização.
4. Editor revisa correção factual, progressão, clareza, regionalismos brasileiros, sensibilidade cultural e adequação de nomes próprios.
5. Aprovar e agendar puzzle em data brasileira; impedir conflito de duas respostas para o mesmo dia.
6. Verificação automatizada diária confirma que existe publicação aprovada para a próxima janela.
7. Alteração pós-publicação registra autor, data, valor anterior e motivo; incidentes podem aposentar o puzzle sem expor estado interno.

No MVP, é aceitável que a administração seja uma ferramenta mínima restrita ou um procedimento editorial interno autenticado. Não é necessário construir um CMS genérico. A geração automática de sugestões deve permanecer fora do caminho de publicação automática.

## 12. Testes e critérios de aceite

### 12.1 Testes unitários

- Pontuação para 0, 1, 2, 3 e 4 pistas (100, 75, 50, 25, 0).
- Mais de quatro chamadas de pista não descontam novamente nem avançam o índice.
- Erros de palpite não alteram pontuação; acerto encerra a rodada.
- Tentativas persistem corretamente e não são tratadas como penalidade.
- Normalização de maiúsculas, acentos combinados/decompostos, espaços no início/fim e múltiplos espaços.
- Separadores significativos e aliases são respeitados.
- Data de jogo no fuso `America/Sao_Paulo`, inclusive em torno da meia-noite.
- Sequência não diminui pontos nem bloqueia uma rodada após ausência.

### 12.2 Testes de integração da API

- Desafio diário público não contém resposta, aliases ou pistas não reveladas.
- Uma requisição revela somente a pista subsequente.
- Palpite correto/incorreto retorna transições coerentes e não vaza resposta em caso incorreto.
- Rodada resolvida não aceita novas mutações.
- Modo prática entrega tema escolhido e não afeta estado diário.
- Conteúdo não aprovado não pode ser publicado nem carregado pelo endpoint público.
- Falhas e limites são respostas explícitas com status e formato estáveis.

### 12.3 Testes ponta a ponta

- Jogar do início à vitória sem pedir pista, compartilhar resultado sem palavra-resposta.
- Revelar as quatro pistas, chegar a zero, errar e ainda acertar.
- Atualizar/reabrir a página e restaurar o diário no mesmo navegador.
- Trocar de tema na prática, começar nova rodada e preservar estatísticas do diário.
- Cruzar a data do jogo simulada e iniciar novo desafio após consultar o servidor.
- Completar o fluxo com teclado, verificar leitor de tela e conferir modo de movimento reduzido.
- Conferir layout em 320 px, desktop, zoom 200% e orientação móvel.

### 12.4 Critérios de aceite do MVP

- Nenhuma resposta do dia pode ser extraída do bundle público ou payload anterior à vitória.
- Pontuação sempre corresponde a `max(0, 100 - 25 × pistas reveladas)`.
- Jogador pode continuar tentando depois da quarta pista e após pontuação zero.
- Recarregar o mesmo desafio no mesmo navegador preserva estado válido.
- Modo prática não modifica métricas do diário.
- Compartilhamento não inclui a resposta nem o texto privado das pistas.
- Não existe fluxo de conta, anúncio ou compra.
- Jornada essencial é utilizável por teclado e tem mensagens legíveis por tecnologia assistiva.
- Existe conteúdo aprovado para a data de lançamento e há procedimento de contingência para ausência/falha.

## 13. Etapas de implementação

### Etapa 0 — Decisões e preparação

- Aprovar stack, ambiente de execução e hospedagem.
- Fechar regra exata de contagem de sequência, tratamento de partida diária não resolvida e comportamento após virada de data.
- Definir fonte editorial e critérios para aliases, regionalismos e respostas de cultura pop.
- Criar repositório/build, lint, testes e pipeline de deploy.

### Etapa 1 — Núcleo visual e regras

- Criar tokens CSS e layout responsivo inspirado no protótipo.
- Implementar componentes de jogo, estados, validação local e testes unitários.
- Usar fixtures claramente marcadas apenas em ambiente de desenvolvimento.
- Validar fluxo com teclado, zoom e leitores de tela desde o início.

### Etapa 2 — Serviço de conteúdo e API

- Criar esquema de banco e migrações.
- Implementar calendário diário, endpoints de prática, pistas e palpites.
- Garantir projeções públicas sem resposta/pistas fechadas.
- Implementar idempotência, validação, limites e logs operacionais.

### Etapa 3 — Persistência e conteúdo

- Implementar armazenamento versionado local, migração e recuperação de estado inválido.
- Conectar estatísticas e compartilhamento sem spoiler.
- Ingerir conteúdo inicial e habilitar aprovação/agendamento editorial.

### Etapa 4 — Qualidade e lançamento

- Automatizar testes unitários, integração, acessibilidade e ponta a ponta.
- Fazer revisão de contraste, conteúdo e segurança da API.
- Testar fallback de rede/compartilhamento e procedimento de puzzle ausente.
- Publicar em ambiente de homologação, validar mobile e então promover para produção.

## 14. Riscos e mitigação

| Risco | Mitigação |
|---|---|
| Resposta exposta no JavaScript público | Guardar resposta no servidor e entregar pistas incrementalmente |
| Sem puzzle aprovado para um dia | Calendário com antecedência, alarme de publicação e página de contingência |
| Pista ambígua, incorreta ou controversa | Revisão humana obrigatória, checklist editorial e canal de reporte |
| Diferença de acento/Unicode gera falso erro | Normalização única especificada, aliases e testes NFD/NFC |
| Estado local corrompido ou perdido | Versionar schema, validar leitura e explicar recuperação; sem prometer sincronização |
| Falha de rede aparenta consumir pista/pontos | Atualizar somente após confirmação do servidor e permitir repetir operação |
| Sequência vira fonte de pressão | Destacar dias jogados; ausência não tira pontos, acesso ou progresso |
| Contraste do palette não atinge AA | Medir cores finais; ajustar token/combinação quando necessário sem abandonar a direção |
| Cultura pop envelhece ou não é consensual | Curadoria brasileira, data de revisão e possibilidade de retirar conteúdo |

## 15. Decisões em aberto antes do desenvolvimento

1. Stack e hospedagem finais, visto que o projeto não possui ambiente técnico configurado.
2. Regras editoriais para aliases, hífens, abreviações e respostas com nomes próprios.
3. Necessidade de ferramenta editorial própria no MVP ou publicação por operação autenticada.
4. Prazo de retenção de métricas técnicas e conteúdo retirado.
5. Procedimento de contingência quando um desafio é considerado incorreto depois da publicação.

## 16. Definição de pronto

Uma entrega está pronta quando satisfaz os critérios de aceite da seção 12, passa pelos testes automatizados definidos, foi revista em celular e desktop, não revela conteúdo não publicado, tem conteúdo editorial aprovado para a janela de lançamento e possui instruções operacionais para publicação/retirada de puzzles. O protótipo pode permanecer como referência visual; ele não deve ser publicado como cliente de produção enquanto contiver respostas embutidas no código.

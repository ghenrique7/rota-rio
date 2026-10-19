# RioRota (alpha)

Site de consulta de horários de barcos e lanchas entre cidades do rio (Santarém, Óbidos, Alenquer e Monte Alegre). Mostra portos, rotas, horários e o contato do responsável por cada viagem.

O RioRota é **informativo**: não vende passagens nem garante vagas. Os horários podem mudar com o nível do rio, o clima e o rodízio das agências, então sempre confirme com o responsável.

Projeto alpha da faculdade (Ciência da Computação). Persona: Talita, que precisa consultar horários de forma rápida, principalmente pelo celular.

## Telas

- **Início:** busca por origem, destino e data, e rotas populares.
- **Horários:** saídas do dia, com filtro por tipo de embarcação.
- **Detalhes da viagem:** ponto de embarque, comodidades, valor informativo e contato (Ligar e WhatsApp).
- **Rotas:** destinos a partir de uma origem.
- **Meus interesses:** viagens salvas neste aparelho (abas Próximas e Histórico).

## Tecnologias

HTML, CSS e JavaScript puro (ES modules), sem build. Banco de dados no Supabase (Postgres) com leitura pública protegida por RLS. Interesses salvos no `localStorage` do navegador, sem login.

## Como rodar localmente

Não há dependências para instalar. Os módulos JavaScript exigem um servidor HTTP (abrir o arquivo direto não funciona):

```bash
python3 -m http.server 8765
```

Depois abra `http://localhost:8765`.

## Banco de dados (Supabase)

1. No SQL Editor do Supabase, rode `db/schema.sql` e depois `db/seed.sql`. Os dois podem ser rodados de novo; eles recriam os dados.
2. Preencha `SUPABASE_URL` e `SUPABASE_ANON_KEY` em `js/config.js` (Project Settings → API).
3. Use somente a chave `anon` no front end. **Nunca** coloque a `service_role` no repositório.

Os telefones do seed são **fictícios**. Os projetos gratuitos do Supabase podem pausar por inatividade: abra o site antes de uma apresentação.

## Deploy no Netlify

O site é estático. O `netlify.toml` já publica a raiz do projeto, sem comando de build.

- **Pelo GitHub:** envie o projeto para um repositório. No Netlify, *Add new site → Import from Git*, escolha o repositório e confirme (sem build command; publish directory `.`). Cada push na branch principal publica de novo.
- **Sem GitHub:** no Netlify, *Add new site → Deploy manually* e arraste a pasta do projeto.

## Estrutura

```
index.html, horarios.html, viagem.html, rotas.html, interesses.html
css/style.css        estilos
js/api.js            todas as consultas ao Supabase
js/storage.js        interesses salvos (localStorage)
js/nav.js            navegação
js/format.js         formatação de hora, data, valor e links de contato
js/pages/            lógica de cada tela
db/                  schema.sql e seed.sql
docs/                mapa de empatia, diagrama ER e protótipo
TDD.md               documento técnico do projeto
```

## Limitações da alpha

- Só consulta; os dados são cadastrados direto no Supabase.
- Os dados são ilustrativos (4 cidades, 12 rotas de ida e volta) e os telefones são fictícios.
- Sem login, notificações, venda de passagens, vagas ou status em tempo real.
- Sem mapa (previsto para uma próxima versão).

# Decisions

Decisions that concern only this repository, moved from zohelo/zohelo-data `docs/decisions.md` with their ids and text
unchanged (zohelo-data O39, 12 Nov 2026: each repo documents itself). Ids are shared with zohelo-data and never
renumbered; decisions about the data platform, the published contract and how the project is run stay in
[zohelo-data docs/decisions.md](https://github.com/zohelo/zohelo-data/blob/main/docs/decisions.md).

| id | date | question | decision | by |
|---|---|---|---|---|
| O6 | 2026-10-27 | zohelo-bi sign-in | zohelo-bi sign-in only at v1. | owner |
| D20 | 2026-10-28 | bi API filter values | Quoting (single quotes doubled) is the SQL-injection defence; SAFE_VALUE keeps allowing `'`, `;` and spaces so names like "Côte d'Ivoire" work (design question zohelo-bi#104). | architect |

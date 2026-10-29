# LimpiApp

La casa limpia, entre todos: habitaciones, tareas recurrentes, Hoy, puntos, rachas, historial, estadísticas, ranking e invitaciones.

- **Stack**: Angular 22 · ASP.NET Core 10 Minimal APIs (vertical slices) · EF Core 10 · PostgreSQL 17 · Docker Compose.
- **Docs** (vision, architecture, epics, prototype, QA): Obsidian vault, `01_Proyectos/04_LimpiApp/`.
- **For Claude Code**: see `CLAUDE.md`.

## Run locally

```bash
cp .env.example .env && chmod 600 .env   # set POSTGRES_PASSWORD
docker compose --profile dev up -d       # web http://127.0.0.1:8090 · Mailpit http://127.0.0.1:8025
```

Status: scaffold only. Implementation starts with epic E01 (Fundación).

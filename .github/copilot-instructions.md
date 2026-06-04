## Cursor Cloud specific instructions

### Demo vs Home Assistant Core

| URL                                                  | What it is                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------- |
| `http://localhost:8090` (`demo/script/develop_demo`) | **Frontend-only demo** (`ha-demo`). No Core; many APIs are mocked.        |
| `http://localhost:8123`                              | **Real Home Assistant Core** (when started with `script/run_ha_core.sh`). |

Use Core for real scene config, image upload, media browser, and more-info against live entities.

### Start Core in this environment

```bash
./script/run_ha_core.sh
```

In a second terminal, run the frontend dev build (watched) against Core:

```bash
HASS_URL=http://127.0.0.1:8123 ./script/develop
```

Then open **http://127.0.0.1:8123/** in the browser (Core serves this repo via `frontend.development_repo`).

Alternative (static serve on 8124, API still on 8123):

```bash
./script/develop_and_serve
```

### Docker

Core runs in Docker (`ha-core` container). If `docker` permission errors occur:

```bash
sudo chmod 666 /var/run/docker.sock
```

### Onboarding (fresh config)

If `/workspace/config/.storage` was wiped, complete onboarding in the UI at http://127.0.0.1:8123/ or via API:

1. `POST /api/onboarding/users` with username/password
2. Exchange `auth_code` at `POST /auth/token` (`grant_type=authorization_code`)
3. `POST /api/onboarding/core_config`, `analytics`, `integration` with `Authorization: Bearer <token>`

This VM may already be onboarded with **dev** / **devpassword123** (development only).

### Savant scenes on Core

Add a Lovelace view with `type: savant-scenes` (see PR / `demo/src/configs/sections/lovelace.ts` for YAML). Admin user required for create/edit/delete.

### Lint / frontend (no Core)

```bash
yarn eslint <paths>
SKIP_FETCH_NIGHTLY_TRANSLATIONS=1 demo/script/develop_demo   # port 8090 mock only
```

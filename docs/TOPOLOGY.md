# Topology PIKO — hiện tại và mục tiêu

Tài liệu cho chủ dự án. Nó cho biết hệ thống **đang** gồm những gì, và hệ thống **sẽ** gồm những gì khi phát hành MVP (Phase 9).
- Architect cập nhật file này mỗi khi topology thay đổi, và hỏi chủ dự án (HITL) trước khi cập nhật.
- Chi tiết vận hành nằm trong `ENVIRONMENTS.md`; lý do của từng lựa chọn nằm trong `DECISIONS.md`.

**Cập nhật lần cuối:** 2026-10-08, bắt đầu Phase 5: thêm bảng `decisions` và route `/api/decisions` (D-029, đang làm).

Ký hiệu:
- ✅ đã có trên `main`
- 🔧 đã code, đang review hoặc sửa, chưa merge
- ⬜ chưa làm
- 💭 ý tưởng sau MVP, chưa quyết định

---

## 1. Hiện tại

### 1.1 Dev — ✅ chạy trên máy của bạn (`make dev`, project `piko-dev`)

```
 Trình duyệt
   │ http://localhost:5173
   ▼
┌──────────────────────── Docker project: piko-dev ────────────────────────┐
│                                                                           │
│  web  (Vite dev server, HMR)        127.0.0.1:5173                        │
│    │  proxy /api/*                                                        │
│    ▼                                                                      │
│  api  (Hono, tsx watch)             127.0.0.1:8787                        │
│    │  tự chạy migrate khi khởi động                                       │
│    ▼                                                                      │
│  db   (PostgreSQL 17)               127.0.0.1:5433  ← mở được bằng GUI    │
│                                                                           │
│  install (chạy 1 lần: pnpm install) → xong thì web/api mới khởi động      │
│                                                                           │
│  Volumes: pgdata (dữ liệu dev), pnpm-store, nm-root/web/api/domain        │
│  Source:  bind mount thư mục repo → sửa file là thấy ngay                 │
└───────────────────────────────────────────────────────────────────────────┘
```

- Mọi port chỉ mở trên `127.0.0.1`, nên máy khác trong mạng LAN không truy cập được.

### 1.2 Prod — ✅ trên `main`, đã chạy thử trên máy local (build từ tag, deploy, backup, rollback), **chưa có VPS**

```
 Internet / trình duyệt
   │ :80 / :443 (TCP + UDP cho HTTP/3)      local test: :8080 / :8443
   ▼
┌──────────────────────── Docker project: piko-prod ───────────────────────┐
│                                                                           │
│  caddy  (image piko-web:<tag>)       ── network: edge ──                 │
│    ├─ /            → file tĩnh của web (đóng sẵn trong image)            │
│    ├─ /assets/*    → cache 1 năm; file không tồn tại → 404               │
│    └─ /api/*       → reverse proxy tới api:8787                          │
│    HTTPS tự động (Let's Encrypt), security headers, CSP                  │
│                                         │                                 │
│  api    (image piko-api:<tag>)       ── edge + backend ──                │
│    │                                                                      │
│  migrate (cùng image api, chạy 1 lần trước api, xong thì tắt)            │
│    │                                                                      │
│  db     (PostgreSQL 17)              ── network: backend (internal) ──   │
│                                         không ra được Internet            │
│                                                                           │
│  Volumes: pgdata (dữ liệu thật), caddy_data (chứng chỉ TLS), caddy_config│
└───────────────────────────────────────────────────────────────────────────┘
 Trên host:  backups/*.dump  (mode 600, giữ 30 bản)   .deploy/current|previous
```

- Thứ tự khởi động: `db` healthy → `migrate` chạy xong → `api` healthy → `caddy`.
- Mọi container prod đều chạy non-root, root FS chỉ đọc, `cap_drop: ALL`, có giới hạn RAM (db 512m, api 256m, caddy 128m) và xoay vòng log.
- Chỉ `caddy` publish port ra ngoài.

### 1.3 Code — ✅

```
apps/web  ──HTTP /api──►  apps/api  ──►  PostgreSQL
    │                         │
    └──────► packages/domain ◄┘     (zod schemas dùng chung; web và api không import lẫn nhau)
```

| Thành phần | Hiện có |
|---|---|
| API routes | ✅ `GET /api/healthz`, `GET /api/me` (tạo guest nếu chưa có)<br>🔧 Phase 5 (5-1, trên nhánh `feat/phase-5-builder`, chưa vào `main`): `GET/POST /api/decisions`, `GET/PUT/DELETE /api/decisions/:id`. Bắt buộc đã có session (không tạo guest), chỉ thấy và sửa quyết định của chính mình, tối đa 100 quyết định mỗi user |
| Bảng DB | ✅ `users`, `sessions` (chỉ lưu sha256 của token)<br>🔧 Phase 5 (5-1, chưa vào `main`): `decisions` (thuộc 1 user, xóa user thì xóa theo; danh sách lựa chọn lưu trong cột JSONB `options`) |
| Web | ✅ Home, preset (xem trước + mở case), màn mở case + hiệu ứng ăn mừng. Chọn ngẫu nhiên chạy ở trình duyệt, chưa lưu gì lên API<br>🔧 Phase 5 (chưa vào `main`): builder, quyết định đã lưu (mục "Của bạn" trên Home) |
| Web routes | ✅ `/` Home, `/presets/:slug` xem trước, `/presets/:slug/open` mở case<br>🔧 Phase 5 (5-2, 5-3, chưa vào `main`): `/decisions/new`, `/decisions/:id` xem trước (Sửa/Xóa), `/decisions/:id/edit` (builder, mở case ngay từ bản nháp bằng `?view=case`), `/decisions/:id/open`<br>⬜ 5-4: `/decisions/new?from=<preset>`<br>Caddy trả `index.html` cho mọi đường dẫn không phải `/api` |
| Domain | Schema API, model `Decision`, engine chọn có seed (mulberry32), toán animation plan |

---

## 2. Mục tiêu — MVP phát hành (Phase 9)

### 2.1 Hạ tầng

```
 Người dùng
   │ DNS A/AAAA: <domain> → IP VPS
   ▼
┌─────────────────────────── 1 VPS (Linux, Docker ≥ 23) ───────────────────┐
│  Firewall: chỉ mở TCP 22 (SSH), TCP 80/443, UDP 443                       │
│                                                                           │
│  piko-prod   (luôn chạy, phục vụ người dùng)                              │
│     caddy → api → db         (như mục 1.2, với domain thật + HTTPS thật)  │
│                                                                           │
│  backups/  ──(copy định kỳ)──►  nơi lưu ngoài VPS   ⬜ chưa chọn          │
└───────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────── Máy của bạn ──────────────────────────────────┐
│  piko-dev    (phát triển song song, không ảnh hưởng prod)                 │
│  git: feat/* → main → tag vX.Y.Z  ──(git pull + make prod-build/deploy)──►│ VPS
└───────────────────────────────────────────────────────────────────────────┘
```

- Release là thủ công:
  1. Tạo tag trên máy bạn rồi push.
  2. Trên VPS chạy `git fetch --tags`, `make prod-build TAG=…`, rồi `make prod-deploy TAG=…`.
- Không cần registry hay CI cho MVP.

### 2.2 Luồng dữ liệu của một lần quyết định

```
 Trình duyệt
   1. ensureSession() → GET /api/me            (1 request duy nhất, cookie piko_sid)
   2. Người dùng nhập danh sách lựa chọn
   3. select(options, seed)                    ← chạy NGAY TRÊN TRÌNH DUYỆT (packages/domain)
   4. buildAnimationPlan() → carousel quay → lộ kết quả
   5. Lưu lịch sử → POST /api/…  (best-effort: lỗi mạng KHÔNG chặn quyết định)
```

### 2.3 Code và dữ liệu khi xong MVP (⬜, chi tiết chốt ở Phase 2 và 6)

| Thành phần | Dự kiến |
|---|---|
| Web | Home, Builder, Case opening, Result, History, `/design` |
| Domain | Model `Decision` / `DecisionOption` / `DecisionSession` / `DecisionTemplate` / `DecisionFeedback`, PRNG có seed, selection, animation plan, schemas (`zod/mini`) |
| API | Thêm các route lưu và đọc lịch sử quyết định và feedback của chính user đó |
| DB | Thêm các bảng lịch sử quyết định, lựa chọn và feedback. Migration luôn tương thích ngược |

---

## 3. Khoảng cách: hiện tại → mục tiêu

| Hạng mục | Hiện tại | Mục tiêu | Phase |
|---|---|---|---|
| Dev stack | ✅ | ✅ | 1a-1 |
| Prod stack (Docker, Caddy, migrate, backup/rollback) | ✅ (chỉ local) | ✅ trên VPS | 1a-2 ✅, VPS ở 9 |
| Design system + font tiếng Việt tự host | ✅ (token, font, 6 primitive, `/design`) | ✅ | 1b ✅ |
| Domain engine (selection, animation plan) | ✅ | ✅ | 2 ✅ |
| UI case opening, home, builder, result, history | ✅ case opening, home, preset; ⬜ builder, result, history | ✅ | 3–4 ✅, 5 → 8 |
| API + bảng quyết định | 🔧 code xong (5-1), chưa vào `main` | ✅ | 5 |
| API + bảng lịch sử | ⬜ | ✅ | 6 |
| VPS + domain + HTTPS thật | ⬜ chưa chọn | ✅ | 9 |
| Backup ngoài VPS | ⬜ chưa chọn | ✅ | 9 |

## 4. Sau MVP — 💭 chưa quyết định

- **Staging:** project thứ ba `piko-staging` trên cùng VPS, cùng pattern.
- **Registry + CI:** build image một lần rồi pull về VPS, thay cho việc build ngay trên VPS.
- **Tài khoản thật:** nâng cấp guest bằng email hoặc Google, không mất lịch sử.
- **Couple/Squad:** cần realtime (WebSocket hoặc SSE), sẽ thêm một thành phần mới vào topology.
- **CDN phía trước Caddy:** khi đó phải cấu hình `trusted_proxies`.

---

## Lịch sử thay đổi

| Ngày | Thay đổi |
|---|---|
| 2026-10-08 | Tạo file. Hiện tại: dev ✅, prod 🔧 (1a-2 đang sửa). Mục tiêu: 1 VPS, release thủ công từ tag. |
| 2026-10-08 | Merge 1a-2: prod 🔧 → ✅ (chỉ local, chưa có VPS). Lỗ hổng backup khi DB đang tắt ghi vào tech debt, sửa trước Phase 9. |
| 2026-10-08 | Phase 1b xong (design system). Đổi tên `wswd` → `piko` (D-023): compose project `piko-dev`/`piko-prod`, volume `piko-*`, image `piko-api`/`piko-web`, cookie `piko_sid`, DB user/name `piko`. Áp dụng qua 1c-1; volume/image `wswd-*` cũ xoá thủ công sau. Repo: `github.com/duypham2801/Piko`. |
| 2026-10-08 | Phase 3 merge vào `main`. Phase 4: web có router (React Router 8, D-028), thêm dòng "Web routes"; sửa dòng Web/Domain cho đúng hiện trạng. Hạ tầng không đổi. |
| 2026-10-08 | Phase 4 merge vào `main`. Bắt đầu Phase 5 (D-029): kế hoạch thêm bảng `decisions` (JSONB `options`), route `/api/decisions` (bắt buộc session, chỉ dữ liệu của chính user) và route web `/decisions/...`. PGlite chỉ dùng khi test, không vào prod. Sửa bảng khoảng cách cho đúng hiện trạng. |
| 2026-10-08 | 5-1 xong trên nhánh Phase 5: bảng `decisions` và route `/api/decisions` chuyển ⬜ → 🔧. Image API prod giữ 186 MB (PGlite bị loại khỏi image). |
| 2026-10-09 | 5-2 xong trên nhánh Phase 5: route web `/decisions/new` và `/decisions/:id/edit` chuyển ⬜ → 🔧. Hạ tầng không đổi. |
| 2026-10-09 | 5-3 xong trên nhánh Phase 5: route web `/decisions/:id` và `/decisions/:id/open`, mục "Của bạn" trên Home chuyển ⬜ → 🔧. Hạ tầng không đổi. |

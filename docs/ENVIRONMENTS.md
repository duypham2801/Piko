# Môi trường Dev / Prod

Tài liệu vận hành dành cho chủ dự án. Mục tiêu: **web thật (prod) luôn chạy ổn định, trong khi vẫn có thể phát triển (dev) song song mà không ảnh hưởng tới prod.**

---

## 1. Ý tưởng cốt lõi

|  | **Dev** | **Prod** |
|---|---|---|
| Dùng để | Viết code và thử nghiệm | Phục vụ người dùng thật |
| Tên compose project | `piko-dev` | `piko-prod` |
| Code chạy từ | Thư mục source của bạn (sửa là thấy ngay, có HMR) | **Image đóng gói sẵn**, gắn version (vd `v0.3.0`) |
| Database | Volume `piko-dev_pgdata` (dữ liệu thử) | Volume `piko-prod_pgdata` (dữ liệu thật) |
| File cấu hình | `.env.dev` | `.env.prod` |
| Truy cập | `http://localhost:5173` | `https://<domain>` (port 80/443) |
| Công cụ dev | Có (watch, sourcemap, DB mở port 5433) | Không (chỉ chứa thứ cần để chạy) |

Hai môi trường dùng **tên project khác nhau**, nên Docker coi chúng là hai hệ thống riêng biệt: container, mạng và ổ dữ liệu đều khác nhau.

- Xoá dữ liệu dev, làm hỏng DB dev hay khởi động lại dev đều **không chạm** tới prod.
- Có thể chạy cả hai cùng lúc trên một máy, vì chúng dùng port khác nhau.

---

## 2. Kiến trúc prod

```
Internet ──► Caddy (:80/:443, HTTPS tự động)
              ├── /        → file tĩnh của web (đóng sẵn trong image)
              └── /api/*   → api (Hono, Node 22)
                               └── db (PostgreSQL 17, chỉ trong mạng nội bộ)
```

- Chỉ Caddy mở port ra ngoài. DB không thể truy cập từ Internet.
- `migrate` là container chạy một lần: cập nhật cấu trúc DB xong thì tắt. Container `api` chỉ khởi động sau khi `migrate` chạy thành công.
- Mỗi container prod đều có:
  - user không phải root, filesystem chỉ đọc
  - healthcheck và tự khởi động lại khi lỗi
  - giới hạn RAM và tự xoay vòng log

## 3. Kiến trúc dev

```
web (Vite dev server, HMR)  ──proxy /api──►  api (tsx watch)  ──►  db (Postgres, port 5433 ra máy bạn)
       ▲ bind mount source                       ▲ bind mount source
```

Bạn sửa file trên máy, container thấy thay đổi ngay. Có thể mở DB dev bằng công cụ GUI (TablePlus, DBeaver...) qua `localhost:5433`.

Mặc định web dev chỉ mở trên `localhost`. Có hai cách mở cho thiết bị khác, bật riêng hoặc cùng lúc (D-034).

**Cách 1: qua Wi-Fi/LAN (HTTP, theo IP)**

1. Trên máy chạy Docker, lấy IPv4 mạng LAN bằng `ip -4 -brief address show scope global`. Chọn địa chỉ của card Wi-Fi/Ethernet, ví dụ `192.168.1.100`. Không chọn địa chỉ Docker (`172.x`) hay Tailscale (`100.x`).
2. Trong `.env.dev`, đặt:
   - `DEV_WEB_BIND=192.168.1.100`: mở thêm cổng web 5173 trên đúng IP này (`localhost:5173` vẫn dùng được).
   - Thêm `http://192.168.1.100:5173` vào `DEV_EXTRA_ORIGINS`.
3. Chạy `make dev`, rồi trên thiết bị kia mở `http://192.168.1.100:5173`. Hai thiết bị phải cùng mạng, và mạng không được bật "client isolation" (một số Wi-Fi khách có bật).

**Cách 2: qua Tailscale (HTTPS, mở được ở bất kỳ đâu trong tailnet)**

1. Làm một lần trong trang quản trị Tailscale: bật **MagicDNS** và **HTTPS Certificates** (mục DNS).
2. Trên máy chạy Docker, chạy `tailscale serve --bg 5173`.
   - Nếu báo thiếu quyền, chạy một lần `sudo tailscale set --operator=$USER`.
   - Lệnh in ra địa chỉ dạng `https://dp-1.tailfeab26.ts.net`. Cấu hình này vẫn giữ sau khi khởi động lại máy.
3. Thêm địa chỉ đó vào `DEV_EXTRA_ORIGINS`, rồi chạy `make dev`.
4. Trên điện thoại đã cài app Tailscale và đăng nhập cùng tailnet, mở địa chỉ đó.

Không cần `DEV_WEB_BIND`, vì Tailscale Serve chuyển tiếp vào `localhost:5173`.
- Xem trạng thái: `tailscale serve status`.
- Tắt: `tailscale serve --https=443 off` (hoặc `tailscale serve reset`).

**Ví dụ `.env.dev` bật cả hai cách:**

```dotenv
DEV_WEB_BIND=192.168.6.28
DEV_EXTRA_ORIGINS=http://192.168.6.28:5173,https://dp-1.tailfeab26.ts.net
```

`DEV_EXTRA_ORIGINS` là danh sách địa chỉ, cách nhau bằng dấu phẩy. Mỗi địa chỉ chỉ gồm `scheme://host[:port]`, không có `/` ở cuối. Danh sách này có hai tác dụng:
- API nhận thao tác ghi (lưu, chia sẻ...) từ các địa chỉ đó.
- Vite chấp nhận các tên miền đó. Nếu thiếu, Vite trả "Blocked request".

Nếu sau này đặt thêm một reverse proxy khác trước dev, chỉ cần thêm địa chỉ của nó vào danh sách.

Lưu ý:
- **Thiếu cấu hình:**
  - Mở được trang nhưng thao tác ghi bị lỗi `403`: địa chỉ đang mở chưa có trong `DEV_EXTRA_ORIGINS`.
  - Thiết bị khác qua LAN không vào được: chưa đặt `DEV_WEB_BIND`.
- **Tường lửa (ufw) không chặn được cổng Docker,** vì Docker tự ghi rule iptables. Vì vậy chỉ bind đúng IP LAN, không dùng `0.0.0.0`.
- **IP LAN đổi** (DHCP): container web sẽ không khởi động được. Sửa `DEV_WEB_BIND` và địa chỉ trong `DEV_EXTRA_ORIGINS` rồi chạy `make dev` lại. Có thể đặt IP cố định cho máy trên router. Tên Tailscale thì không đổi.
- **Link chia sẻ** lấy theo địa chỉ đang mở, nên hãy tạo link từ địa chỉ mà người nhận dùng được.
- **API 8787 và PostgreSQL 5433 luôn chỉ mở trên `localhost`.** Thiết bị khác gọi API qua proxy `/api` của web.
- **Giới hạn tạo khách mới:** mọi thiết bị đi qua cùng một proxy, nên dùng chung giới hạn `GUEST_RATE_LIMIT_PER_HOUR`.
- **Chỉ dùng trong mạng tin cậy:** đây là dev server, không mở ra internet (không dùng Tailscale Funnel). Bản cho người dùng thật chạy prod qua domain và HTTPS (Phase 9).
- **Tắt LAN:** comment `DEV_WEB_BIND` trong `.env.dev`, chạy `make dev-down` rồi `make dev`. Khi không còn `DEV_WEB_BIND`, Makefile không nạp `compose.dev.lan.yaml`, nên `up` không tự gỡ binding cũ.

---

## 4. Quy trình làm việc hằng ngày

```
1. git switch -c feat/ten-tinh-nang     # làm trên nhánh riêng
2. make dev                              # bật dev
3. ... code, xem trên trình duyệt ...
4. make check                            # typecheck + lint + test logic
5. merge vào main khi đã ổn
```

Trong suốt quá trình này, **prod vẫn chạy version cũ và không bị ảnh hưởng gì.**

**Lưu ý khi đổi nhánh:** sau `git switch`, `git rebase` hoặc `git pull` trong lúc `make dev` đang chạy, Vite có thể vẫn phục vụ bản code cũ đã cache. Nhất là code trong `packages/domain`. Triệu chứng: giao diện chạy theo logic cũ, ví dụ quay xong không công bố kết quả. Cách sửa:

```
docker compose -f compose.dev.yaml restart web
```

Sau đó tải lại trang.

---

## 5. Phát hành lên prod (release)

```
1. git tag v0.3.0                 # đánh dấu phiên bản
2. make prod-build                # build image piko-web:v0.3.0, piko-api:v0.3.0
3. make prod-deploy               # tự động: backup DB → migrate → thay container
```

- Vì mỗi lần build là một image có version cố định, prod chạy **đúng** thứ đã được build, không bị lẫn code đang viết dở.
- Nếu version mới có vấn đề, chạy `make prod-rollback` để quay về image trước.
- Rollback an toàn được là nhờ quy tắc: **migration DB phải tương thích ngược**. Chỉ *thêm* cột hoặc bảng trước; việc xoá cột cũ để sang một release sau, khi code mới đã ổn định.

## 6. Dữ liệu người dùng

- Lần đầu vào web, người dùng tự động có một **tài khoản guest**. Không cần đăng ký.
- Trình duyệt giữ một cookie bảo mật: `httpOnly` (JavaScript không đọc được), `Secure`, `SameSite=Lax`.
- DB chỉ lưu *hash* của token, nên nếu DB bị lộ, kẻ xấu cũng không dùng được token.
- Mọi API đều chỉ trả về dữ liệu của chính người dùng đang đăng nhập.
- Sau này có thể "nâng cấp" guest lên tài khoản thật (email/Google) mà không mất lịch sử.
- Hạn chế hiện tại: người dùng xoá cookie hoặc đổi máy thì sẽ thành một guest mới.

## 7. Backup

- `make prod-backup` tạo file `backups/piko-prod-<thời gian>-<version>.dump`.
- `make prod-deploy` luôn tự backup trước khi migrate.
- **Thư mục `backups/` không được commit.** Nên định kỳ chép backup ra nơi khác (máy khác hoặc cloud storage).

## 8. Bí mật (secrets)

- `.env.example` được commit, chỉ chứa tên biến và giá trị giả.
- `.env.dev` và `.env.prod` **không bao giờ commit**. Trên server, đặt quyền `chmod 600 .env.prod`.
- Mật khẩu DB prod phải khác dev và đủ dài. Tạo bằng `openssl rand -hex 32`. Dùng dạng hex vì nó an toàn khi đặt trong `DATABASE_URL`; base64 có các ký tự `/ + =` làm hỏng URL.

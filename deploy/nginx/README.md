# idol-sg.com 反向代理配置

`https://idol-sg.com/` 由 443 端口上的 nginx（当前服务器是 `diy-nginx-lb`）反代到 idol 前端。

## 文件

- `idol-sg.com.conf` —— 可直接合并进 nginx 的 server 块（443 HTTPS + SSL + 反代到 idol 前端）。

## 前置条件

1. 域名 `idol-sg.com` 的 A 记录解析到服务器公网 IP（当前 `47.84.25.19`）。
2. idol 栈已部署，`idol-frontend` 宿主端口 `14173` 可达（`.env` 的 `WEB_PORT`）。
3. SSL 证书已放在 nginx 的 certs 目录（当前 `/opt/diy/docker/nginx/certs/`）：
   - `idol-sg.com.pem`
   - `idol-sg.com.key`

## 应用方式（以 diy-nginx-lb 为例）

1. 把 `idol-sg.com.conf` 的 server 块合并进 `/opt/diy/docker/nginx/nginx.conf`
   （或作为独立文件 `include` 进 nginx 配置）。
2. 校验并重载：

   ```bash
   docker exec diy-nginx-lb nginx -t
   docker restart diy-nginx-lb
   ```

   注意：单文件 bind-mount 场景，`sed -i` 会替换文件 inode、容器里仍是旧内容，
   所以配置改动后建议用 `restart` 而非 `nginx -s reload`，确保容器重新挂载新文件。

## 上游地址

`set $idol_upstream http://172.20.0.1:14173;`

- `172.20.0.1`：`diy-nginx-lb` 所在 Docker 网络的宿主机网关。
- `14173`：`idol-frontend` 的宿主端口（`.env` 的 `WEB_PORT`）。

换端口或换网关时，只改这一行即可。

## 证书

当前证书为 Let's Encrypt，`CN=idol-sg.com`，到期 `2026-12-26`。
签发/续期建议用服务器已有的 1Panel 的 SSL 管理，或用 certbot 的 webroot/DNS 校验
（本机 80/443 已被占用，`--standalone` 不可用）。续期后可加 cron 自动执行。

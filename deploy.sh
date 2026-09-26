#!/usr/bin/env bash
# 拼豆预约 · 一键部署到远程服务器（rsync 源码 + 服务器上 docker compose 构建启动）
# 用法（在你自己的电脑上运行，需能 SSH 到目标服务器）：
#   ./deploy.sh root@47.84.25.19 diy0812?     # 密码用于 sshpass
#   ./deploy.sh root@47.84.25.19              # 已配 SSH key 时省略密码
# 可选：REMOTE_DIR=/data/idol ./deploy.sh root@host pass
set -euo pipefail

HOST="${1:?用法: ./deploy.sh root@服务器IP [SSH密码]}"
PASS="${2:-}"
REMOTE_DIR="${REMOTE_DIR:-/opt/idol}"

cd "$(dirname "$0")"

SSH_BASE=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -o ServerAliveInterval=15)

do_ssh() {
  if [[ -n "$PASS" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PASS" ssh "${SSH_BASE[@]}" "$HOST" "$@"
  else
    ssh "${SSH_BASE[@]}" "$HOST" "$@"
  fi
}

echo "==> [1/4] 上传源码到 ${HOST}:${REMOTE_DIR}"
RSYNC=(rsync -az --delete
  --exclude '.git' --exclude '.env' --exclude 'node_modules'
  --exclude 'dist' --exclude 'uploads' --exclude '.DS_Store' --exclude '*.log'
  ./ "$HOST:$REMOTE_DIR/")
if [[ -n "$PASS" ]] && command -v sshpass >/dev/null 2>&1; then
  sshpass -p "$PASS" "${RSYNC[@]}"
else
  "${RSYNC[@]}"
fi

echo "==> [2/4] 准备生产 .env（首次部署自动由 .env.production 生成）"
do_ssh "cd '$REMOTE_DIR' && if [ ! -f .env ]; then if [ -f .env.production ]; then cp .env.production .env; else cp .env.example .env && echo '警告: 已用 .env.example 兜底，请尽快修改其中的 DB 密码与 JWT 密钥'; fi; fi"

echo "==> [3/4] 确认 Docker / Compose"
do_ssh 'if command -v docker >/dev/null 2>&1; then echo "docker: $(docker -v)"; else echo "未安装 Docker，正在安装..."; curl -fsSL https://get.docker.com | sh; fi'

echo "==> [4/4] 构建并启动"
do_ssh "cd '$REMOTE_DIR' && docker compose up -d --build"

IP="$(printf '%s' "$HOST" | sed 's/.*@//')"
echo ""
echo "部署完成。查看状态："
echo "  ssh $HOST 'cd $REMOTE_DIR && docker compose ps'"
echo "直连（调试）： http://$IP:14173/"
echo "域名（自动 HTTPS）： https://idol-sg.com/"
echo ""
echo "注意：Caddy 需要占用 80/443 端口。若服务器上已有 nginx 等占用这两个端口，"
echo "      请先停掉它们（systemctl stop nginx 等），否则 caddy 容器会启动失败。"

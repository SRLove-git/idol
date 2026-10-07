#!/usr/bin/env bash
# 拼豆预约 · 一键部署到远程服务器（服务器上 git clone + docker compose 构建启动）
# 用法（在你自己的电脑上运行，需能 SSH 到目标服务器）：
#   ./deploy.sh root@服务器IP 'SSH密码'
#   DOMAIN=idol-sg.com ACME_EMAIL=a@b.com ./deploy.sh root@host pass
# 可选：REMOTE_DIR=/data/idol GIT_URL=git@github.com:SRLove-git/idol.git
set -euo pipefail

HOST="${1:?用法: ./deploy.sh root@服务器IP [SSH密码]}"
PASS="${2:-}"
REMOTE_DIR="${REMOTE_DIR:-/opt/idol}"
GIT_URL="${GIT_URL:-https://github.com/SRLove-git/idol.git}"
DOMAIN="${DOMAIN:-idol-sg.com}"
ACME_EMAIL="${ACME_EMAIL:-admin@idol-sg.com}"

SSH_BASE=(-o StrictHostKeyChecking=accept-new -o ConnectTimeout=25 -o ServerAliveInterval=15)

do_ssh() {
  if [[ -n "$PASS" ]] && command -v sshpass >/dev/null 2>&1; then
    sshpass -p "$PASS" ssh "${SSH_BASE[@]}" "$HOST" "$@"
  else
    ssh "${SSH_BASE[@]}" "$HOST" "$@"
  fi
}

echo "==> [1/4] 服务器安装 git / Docker（缺失时）"
do_ssh 'if ! command -v git >/dev/null 2>&1; then apt-get update -y && apt-get install -y git; fi; if ! command -v docker >/dev/null 2>&1; then curl -fsSL https://get.docker.com | sh; fi; echo "git=$(command -v git) docker=$(command -v docker)"'

echo "==> [2/4] 拉取代码到 ${REMOTE_DIR}"
do_ssh "if [ -d '$REMOTE_DIR/.git' ]; then cd '$REMOTE_DIR' && git fetch origin && git reset --hard origin/main; else git clone --depth 1 '$GIT_URL' '$REMOTE_DIR'; fi"

echo "==> [3/4] 生成生产 .env（首次；随机密钥）"
DB_PW="$(openssl rand -hex 16)"
JWT_S="$(openssl rand -hex 32)"
JWT_RS="$(openssl rand -hex 32)"
ENV_B64="$(printf 'WEB_PORT=14173\nMYSQL_PORT=23306\nREDIS_PORT=26379\nDB_PASSWORD=%s\nDB_NAME=diy\nJWT_SECRET=%s\nJWT_REFRESH_SECRET=%s\nREVIEW_DEMO_ENABLED=true\nSTORE_ID=1\nDOMAIN=%s\nACME_EMAIL=%s\n' "$DB_PW" "$JWT_S" "$JWT_RS" "$DOMAIN" "$ACME_EMAIL" | base64 | tr -d '\n')"
do_ssh "cd '$REMOTE_DIR' && if [ ! -f .env ]; then umask 077 && printf '%s' '$ENV_B64' | base64 -d > .env && echo '已生成 .env'; else echo '.env 已存在，跳过'; fi"

echo "==> [4/4] 构建并启动"
do_ssh "cd '$REMOTE_DIR' && docker compose up -d --build"

IP="$(printf '%s' "$HOST" | sed 's/.*@//')"
echo ""
echo "部署完成。查看状态："
echo "  ssh $HOST 'cd $REMOTE_DIR && docker compose ps'"
echo "HTTPS：  https://$DOMAIN/"
echo "直连（调试）： http://$IP:14173/"
echo ""
echo "注意："
echo "  1) Caddy 占用 80/443；服务器若已跑 nginx/apache，请先停掉。"
echo "  2) 域名 $DOMAIN 的 A 记录需解析到 $IP，才能签发 HTTPS 证书。"
echo "  3) 私有仓库：需先在服务器配置 GitHub 访问（deploy key 或 PAT），或用带凭据的 GIT_URL。"

#!/bin/bash

# 在本地通过 act 运行 GitHub Actions 完成发布
# - 使用 act 在本地 Docker 中执行：
#     1) .github/workflows/release-advanced.yml -> 构建 + 创建 GitHub Release/Tag
#     2) .github/workflows/docker-publish.yml   -> 构建并推送 Docker 镜像
# - 通过 gh CLI 获取 GitHub Token 用于创建 release/tag
# - 从 .secrets 读取 DOCKERHUB_USERNAME / DOCKERHUB_TOKEN 等

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log()  { echo -e "${GREEN}[INFO]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()  { echo -e "${RED}[ERROR]${NC} $1"; }
step() { echo -e "${BLUE}[STEP]${NC} $1"; }
ask()  { echo -e "${BLUE}[?]${NC} $1"; }

# 切换到项目根目录（脚本位于 scripts/ 下）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

RELEASE_WF=".github/workflows/release-advanced.yml"
DOCKER_WF=".github/workflows/docker-publish.yml"
SECRETS_FILE="$PROJECT_ROOT/.secrets"

# ---------- 工具检查 ----------
step "检查依赖工具"
command -v act    >/dev/null 2>&1 || { err "需要 act：brew install act";    exit 1; }
command -v gh     >/dev/null 2>&1 || { err "需要 gh CLI：brew install gh";  exit 1; }
command -v docker >/dev/null 2>&1 || { err "需要 docker";                    exit 1; }
command -v node   >/dev/null 2>&1 || { err "需要 node";                      exit 1; }

docker info >/dev/null 2>&1 || { err "Docker 未运行，请先启动 Docker Desktop"; exit 1; }
gh auth status >/dev/null 2>&1 || { err "请先执行：gh auth login"; exit 1; }

[[ -f "$RELEASE_WF"   ]] || { err "找不到 workflow：$RELEASE_WF"; exit 1; }
[[ -f "$DOCKER_WF"    ]] || { err "找不到 workflow：$DOCKER_WF";  exit 1; }
[[ -f "$SECRETS_FILE" ]] || { err "找不到密钥文件：$SECRETS_FILE"; exit 1; }

log "act:    $(act --version)"
log "gh:     $(gh --version | head -n1)"
log "docker: $(docker --version)"

# ---------- 计算版本 ----------
CURRENT_VERSION=$(node -p "require('./package.json').version")
PATCH_VERSION=$(node -e "const v=require('./package.json').version.split('-')[0].split('.').map(Number);console.log(\`\${v[0]}.\${v[1]}.\${v[2]+1}\`)")
MINOR_VERSION=$(node -e "const v=require('./package.json').version.split('-')[0].split('.').map(Number);console.log(\`\${v[0]}.\${v[1]+1}.0\`)")
MAJOR_VERSION=$(node -e "const v=require('./package.json').version.split('-')[0].split('.').map(Number);console.log(\`\${v[0]+1}.0.0\`)")

echo ""
log "当前版本：$CURRENT_VERSION"
ask  "选择本次发布版本："
echo "  1) patch        -> $PATCH_VERSION"
echo "  2) minor        -> $MINOR_VERSION"
echo "  3) major        -> $MAJOR_VERSION"
echo "  4) 自定义版本号"
echo "  5) 保持当前版本 -> $CURRENT_VERSION"
read -rp "请选择 [1-5]（默认 1）: " choice
choice=${choice:-1}

case "$choice" in
    1) NEW_VERSION="$PATCH_VERSION"   ;;
    2) NEW_VERSION="$MINOR_VERSION"   ;;
    3) NEW_VERSION="$MAJOR_VERSION"   ;;
    4) read -rp "请输入版本号 (例如 1.2.3 或 1.2.3-beta.1): " NEW_VERSION ;;
    5) NEW_VERSION="$CURRENT_VERSION" ;;
    *) err "无效选择"; exit 1 ;;
esac

if [[ ! "$NEW_VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$ ]]; then
    err "版本号格式错误：$NEW_VERSION"
    exit 1
fi

TAG="v$NEW_VERSION"
log "目标版本：$NEW_VERSION（tag: $TAG）"

# 提示 tag 是否已存在
if git rev-parse "$TAG" >/dev/null 2>&1; then
    warn "本地已存在 tag $TAG"
fi
if gh release view "$TAG" >/dev/null 2>&1; then
    warn "GitHub 上已存在 release $TAG，继续执行会失败或被覆盖"
fi

# ---------- 选择要执行的步骤 ----------
echo ""
ask "需要执行哪些步骤？"
echo "  1) 仅发布 GitHub Release/Tag"
echo "  2) 仅构建并推送 Docker 镜像"
echo "  3) 全部执行（先 Release，再 Docker 推送）"
read -rp "请选择 [1-3]（默认 3）: " action
action=${action:-3}

DO_RELEASE=0
DO_DOCKER=0
case "$action" in
    1) DO_RELEASE=1 ;;
    2) DO_DOCKER=1  ;;
    3) DO_RELEASE=1; DO_DOCKER=1 ;;
    *) err "无效选择"; exit 1 ;;
esac

# Docker 镜像名（基于 .secrets 里的 DOCKERHUB_USERNAME）
DOCKER_USER=$(awk -F= '/^DOCKERHUB_USERNAME=/ {print $2}' "$SECRETS_FILE" | tr -d '"' | tr -d "'")
if [[ $DO_DOCKER -eq 1 && -z "$DOCKER_USER" ]]; then
    err ".secrets 中找不到 DOCKERHUB_USERNAME"
    exit 1
fi

# Docker tag 模式
DOCKER_TAGS_MODE="both"
if [[ $DO_DOCKER -eq 1 ]]; then
    IS_PRERELEASE=0
    [[ "$NEW_VERSION" == *-* ]] && IS_PRERELEASE=1

    echo ""
    ask "Docker 镜像要推送哪些 tag？"
    echo "  1) 版本号 + latest（${NEW_VERSION} / $(echo "$NEW_VERSION" | awk -F. '{print $1"."$2}') / latest）  ← 默认"
    echo "  2) 仅版本号（${NEW_VERSION} / $(echo "$NEW_VERSION" | awk -F. '{print $1"."$2}')）"
    echo "  3) 仅 latest"
    if [[ $IS_PRERELEASE -eq 1 ]]; then
        warn "检测到预发布版本，无论选哪个，latest / major.minor 都不会被推送（避免污染稳定 tag）"
    fi
    read -rp "请选择 [1-3]（默认 1）: " dchoice
    dchoice=${dchoice:-1}
    case "$dchoice" in
        1) DOCKER_TAGS_MODE="both"    ;;
        2) DOCKER_TAGS_MODE="version" ;;
        3) DOCKER_TAGS_MODE="latest"  ;;
        *) err "无效选择"; exit 1 ;;
    esac
fi

# 计算实际会被推送的 tag 列表（用于展示和确认）
docker_tags_preview() {
    local mode="$1"
    local v="$NEW_VERSION"
    local mm
    mm=$(echo "$v" | awk -F. '{print $1"."$2}')
    local is_pre=0
    [[ "$v" == *-* ]] && is_pre=1
    local tags=()
    case "$mode" in
        version) tags+=("$v"); [[ $is_pre -eq 0 ]] && tags+=("$mm") ;;
        latest)  [[ $is_pre -eq 0 ]] && tags+=("latest") ;;
        both)    tags+=("$v"); [[ $is_pre -eq 0 ]] && tags+=("$mm" "latest") ;;
    esac
    (IFS=, ; echo "${tags[*]}")
}

echo ""
log "执行计划："
[[ $DO_RELEASE -eq 1 ]] && log "  - GitHub Release: $TAG"
if [[ $DO_DOCKER -eq 1 ]]; then
    DOCKER_TAGS_PREVIEW="$(docker_tags_preview "$DOCKER_TAGS_MODE")"
    log "  - Docker 镜像   : ${DOCKER_USER}/transmission-web"
    log "    tags          : ${DOCKER_TAGS_PREVIEW:-<空>}"
fi
read -rp "确认开始? (y/N): " -n 1 -r
echo
[[ $REPLY =~ ^[Yy]$ ]] || { warn "已取消"; exit 0; }

# ---------- 获取 GitHub Token ----------
step "从 gh CLI 获取 GitHub Token"
GITHUB_TOKEN="$(gh auth token)"
[[ -n "$GITHUB_TOKEN" ]] || { err "无法获取 GitHub Token"; exit 1; }

# ---------- act 通用参数 ----------
ARCH_ARG=()
if [[ "$(uname -m)" == "arm64" || "$(uname -m)" == "aarch64" ]]; then
    # Apple Silicon 上跑 ubuntu-latest 镜像需要指定 amd64 才能装上常见 action
    ARCH_ARG=(--container-architecture linux/amd64)
fi

ARTIFACT_DIR="$(mktemp -d -t act-artifacts-XXXXXX)"
log "Artifact 临时目录：$ARTIFACT_DIR"

run_act() {
    local workflow="$1"
    shift
    # 注意：act 默认会自动挂载宿主机 docker.sock，不要再通过 --container-options 重复挂载，
    # 否则会报 "Duplicate mount point: /var/run/docker.sock"。
    act workflow_dispatch \
        -W "$workflow" \
        --input version="$NEW_VERSION" \
        -s GITHUB_TOKEN="$GITHUB_TOKEN" \
        --secret-file "$SECRETS_FILE" \
        --artifact-server-path "$ARTIFACT_DIR" \
        "${ARCH_ARG[@]}" \
        "$@"
}

# ---------- 1. Release Workflow ----------
if [[ $DO_RELEASE -eq 1 ]]; then
    step "通过 act 运行 Release Workflow"
    log "Workflow: $RELEASE_WF"
    set +e
    run_act "$RELEASE_WF"
    ACT_EXIT=$?
    set -e
    if [[ $ACT_EXIT -ne 0 ]]; then
        err "Release Workflow 失败 (exit=$ACT_EXIT)"
        exit $ACT_EXIT
    fi
    log "✅ GitHub Release 完成：$TAG"
fi

# ---------- 2. Docker Publish Workflow ----------
if [[ $DO_DOCKER -eq 1 ]]; then
    step "通过 act 运行 Docker Publish Workflow"
    log "Workflow  : $DOCKER_WF"
    log "tags_mode : $DOCKER_TAGS_MODE"
    log "tags      : ${DOCKER_TAGS_PREVIEW:-<空>}"
    log "platforms : linux/amd64, linux/arm64"
    warn "多架构构建会通过 QEMU 模拟非原生架构，首次跑可能比较慢，请耐心等待..."

    set +e
    act workflow_dispatch \
        -W "$DOCKER_WF" \
        --input version="$NEW_VERSION" \
        --input tags_mode="$DOCKER_TAGS_MODE" \
        -s GITHUB_TOKEN="$GITHUB_TOKEN" \
        --secret-file "$SECRETS_FILE" \
        --artifact-server-path "$ARTIFACT_DIR" \
        "${ARCH_ARG[@]}"
    ACT_EXIT=$?
    set -e

    if [[ $ACT_EXIT -ne 0 ]]; then
        err "Docker Publish Workflow 失败 (exit=$ACT_EXIT)"
        exit $ACT_EXIT
    fi
    log "✅ Docker 镜像推送完成：${DOCKER_USER}/transmission-web (${DOCKER_TAGS_PREVIEW})"
fi

# ---------- 收尾 ----------
echo ""
REPO_SLUG="$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null || echo 'jianxcao/transmission-web')"
log "🎉 全部完成"
[[ $DO_RELEASE -eq 1 ]] && log "Release: https://github.com/${REPO_SLUG}/releases/tag/${TAG}"
[[ $DO_DOCKER  -eq 1 ]] && log "Docker : https://hub.docker.com/r/${DOCKER_USER}/transmission-web/tags"

# 发布指南

本项目使用 GitHub Actions 实现自动化构建和发布流程，支持正式版本和预发布版本。

## 🚀 快速开始

### 1. 检查环境

在发布之前，请先检查环境是否准备好：

```bash
pnpm run release:check
```

这个命令会检查所有必要的工具和配置。

### 2. 本地构建测试（可选）

如果需要本地构建测试，可以使用：

```bash
# 本地构建（设置正确的环境变量）
pnpm run build:prod
```

这个命令会：

1. 设置 `VITE_BASE_URL=/transmission/web`
2. 安装依赖
3. 构建项目
4. 验证构建结果
5. 检查基础路径配置

### 3. 发布

使用以下命令发布：

```bash
# 发布正式版本
pnpm run release 1.0.0

# 发布预发布版本
pnpm run release 1.0.0-beta.1
```

这个命令会：

1. 更新 package.json 版本号
2. 提交更改
3. 创建标签
4. 推送到 GitHub
5. 自动触发 GitHub Actions 构建和发布

## 版本号规范

### 正式版本

格式：`主版本号.次版本号.修订号`

示例：

- `1.0.0` - 第一个正式版本
- `1.0.1` - 修复版本
- `1.1.0` - 功能版本
- `2.0.0` - 重大更新

### 预发布版本

格式：`主版本号.次版本号.修订号-预发布标识符`

示例：

- `1.0.0-beta.1` - Beta 版本
- `1.0.0-alpha.2` - Alpha 版本
- `1.0.0-rc.1` - Release Candidate 版本
- `1.0.0-beta.1+build.1` - 带构建信息的 Beta 版本

### 版本升级流程

```bash
# 1. Alpha 版本（早期测试）
pnpm run release 1.0.0-alpha.1

# 2. Beta 版本（用户测试）
pnpm run release 1.0.0-beta.1

# 3. RC 版本（发布候选）
pnpm run release 1.0.0-rc.1

# 4. 正式版本
pnpm run release 1.0.0
```

## GitHub Actions 工作流

项目包含以下自动化工作流：

### 1. 发布工作流

- **`release-advanced.yml`** - 高级发布工作流

### 2. 测试工作流

- **`test.yml`** - 代码检查和构建测试

### 3. 触发方式

- **自动触发**: 推送标签（如 `v1.0.0`、`v1.0.0-beta.1`）
- **手动触发**: 在 GitHub Actions 页面手动运行
- **PR 触发**: 创建 Pull Request 时自动测试

## 发布流程

GitHub Actions 会自动执行以下步骤：

1. ✅ 环境准备 - 设置 Node.js、pnpm 环境
2. ✅ 依赖安装 - 安装项目依赖（带缓存）
3. ✅ 代码检查 - 运行 linting 和类型检查
4. ✅ 项目构建 - 执行 `pnpm run build`（设置 `VITE_BASE_URL=/transmission/web`）
5. ✅ 打包压缩 - 创建发布包
6. ✅ 生成变更日志 - 自动从 Git 提交生成
7. ✅ 创建 Release - 在 GitHub 上创建 Release
8. ✅ 上传文件 - 自动上传构建产物

## 环境变量

所有构建都会自动设置以下环境变量：

- `VITE_BASE_URL=/transmission/web` - 应用的基础路径

## 版本类型对比

| 特性        | 正式版本 | 预发布版本     |
| ----------- | -------- | -------------- |
| 格式        | `1.0.0`  | `1.0.0-beta.1` |
| GitHub 标记 | 正式版本 | Pre-release    |
| 用户下载    | 直接可见 | 需要手动选择   |
| 用途        | 生产环境 | 测试和预览     |
| 稳定性      | 高       | 中等           |

## 前置要求

- Git
- Node.js
- pnpm
- GitHub CLI (gh)

### 安装 GitHub CLI

```bash
# macOS
brew install gh

# Ubuntu/Debian
sudo apt install gh

# 登录
gh auth login
```

## 监控和调试

### 查看工作流状态

1. **GitHub 网页**:
   - 访问仓库的 Actions 页面
   - 查看工作流运行历史
   - 点击具体运行查看详细日志

2. **命令行**:

   ```bash
   # 查看最近的标签
   git tag --sort=-version:refname | head -5

   # 查看工作流状态（需要 gh CLI）
   gh run list --workflow=release-advanced.yml
   ```

## 故障排除

### 常见问题

1. **GitHub CLI 未认证**

   ```bash
   gh auth login
   ```

2. **构建失败**
   - 检查 GitHub Actions 日志
   - 验证依赖是否正确安装

3. **权限不足**

   ```bash
   gh auth status
   ```

4. **版本号格式错误**
   - 确保格式为 `x.y.z` 或 `x.y.z-identifier`
   - 不要使用无效字符

### 版本号格式错误示例

```bash
# 错误示例
pnpm run release 1.0.0beta1  # 缺少连字符
pnpm run release 1.0.0-beta  # 缺少数字

# 正确示例
pnpm run release 1.0.0-beta.1
```

### 标签冲突

```bash
# 如果标签已存在，先删除
git tag -d v1.0.0-beta.1
git push origin :refs/tags/v1.0.0-beta.1

# 然后重新发布
pnpm run release 1.0.0-beta.1
```

## 手动发布

如果自动脚本失败，可以手动执行：

```bash
# 1. 更新版本号
npm version 1.0.0 --no-git-tag-version

# 2. 提交并推送标签
git add . && git commit -m "chore: prepare release v1.0.0"
git tag -a "v1.0.0" -m "Release v1.0.0"
git push origin HEAD && git push origin v1.0.0
```

## 最佳实践

### 1. 版本规划

- 制定清晰的版本发布计划
- 确定预发布版本的用途
- 遵循语义化版本规范

### 2. 测试策略

- 建立完善的测试流程
- 确保预发布版本的质量
- 在发布前充分测试

### 3. 沟通机制

- 与用户保持良好沟通
- 及时响应用户反馈
- 通知用户版本变化

### 4. 文档维护

- 保持文档的及时更新
- 记录版本变化和问题修复
- 更新变更日志

## 使用场景

### Beta 版本

- 功能基本完成，需要用户测试
- 修复已知问题
- 收集用户反馈

### Alpha 版本

- 早期功能预览
- 内部测试
- 验证核心功能

### RC 版本

- 发布候选版本
- 最终测试
- 准备正式发布

## 详细文档

更多详细信息请查看：[`.github/README.md`](.github/README.md)

## 支持

如果遇到问题，请：

1. 运行 `pnpm run release:check` 检查环境
2. 查看 [`.github/README.md`](.github/README.md) 详细文档
3. 提交 Issue 描述问题

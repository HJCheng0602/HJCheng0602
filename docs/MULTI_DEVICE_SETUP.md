# 多设备同步指南

这套同步工具会读取每台机器本地的 Codex、Qoder、Claude Code 和 OpenCode 会话记录，把过去 183 天内的聚合 token 数据提交到本仓库，再由 GitHub Actions 合并所有设备并重新生成主页图表。

```text
~/.codex/sessions
~/.qoder/...（存在时）
~/.claude/projects
~/.local/share/opencode/opencode.db
        ↓ npm run sync
data/devices/<设备名>.json
data/devices/<设备名>-qoder.json
data/devices/<设备名>-claude.json
data/devices/<设备名>-opencode.json
        ↓ push
GitHub Actions 合并并生成 SVG
```

## 开始之前

每台新机器需要：

- Git
- Node.js 20 或更高版本
- 已经运行并产生过会话记录的 Codex CLI/IDE
- 若需采集 OpenCode：安装 `sqlite3`（采集器只查询模型、时间与 token 字段）
- 能向 `HJCheng0602/HJCheng0602` 推送的 GitHub SSH 密钥

每台机器必须使用唯一的设备名，例如：

| 机器 | 建议设备名 |
| --- | --- |
| 当前 WSL | `linux`（保持不变） |
| MacBook Pro | `macbook-pro` |
| Windows 台式机 | `windows-desktop` |
| 另一台 WSL | `wsl-laptop` |

> [!IMPORTANT]
> 在第一次运行 `npm run collect` 或 `npm run sync` **之前**设置设备名。若先用默认名采集、之后再改名，仓库中可能同时保留两份快照并造成重复统计。

## macOS

如果尚未安装依赖：

```bash
brew install git node
```

为这台 Mac 创建 SSH 密钥：

```bash
ssh-keygen -t ed25519 -C "macbook-pro"
cat ~/.ssh/id_ed25519.pub
```

将输出的公钥添加到 [GitHub SSH Keys](https://github.com/settings/ssh/new)，然后验证并克隆仓库：

```bash
ssh -T git@github.com
git clone git@github.com:HJCheng0602/HJCheng0602.git
cd HJCheng0602
```

永久设置设备名，再完成首次采集和同步：

```bash
echo 'export AI_WORKBENCH_DEVICE=macbook-pro' >> ~/.zshrc
source ~/.zshrc
npm run collect
npm run sync
```

## Windows 原生环境

在 PowerShell 中安装依赖：

```powershell
winget install Git.Git
winget install OpenJS.NodeJS.LTS
```

重新打开 PowerShell，创建 SSH 密钥：

```powershell
ssh-keygen -t ed25519 -C "windows-desktop"
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

将输出的公钥添加到 [GitHub SSH Keys](https://github.com/settings/ssh/new)，然后验证并克隆仓库：

```powershell
ssh -T git@github.com
git clone git@github.com:HJCheng0602/HJCheng0602.git
cd HJCheng0602
```

永久设置设备名：

```powershell
[Environment]::SetEnvironmentVariable(
  "AI_WORKBENCH_DEVICE",
  "windows-desktop",
  "User"
)
```

重新打开 PowerShell，进入仓库并完成首次同步：

```powershell
cd HJCheng0602
npm run collect
npm run sync
```

## 另一台电脑的 WSL/Linux

WSL 使用自己的 home 目录和 SSH 配置。即使 Windows 已经配置过 SSH，WSL 中仍需单独配置：

```bash
ssh-keygen -t ed25519 -C "wsl-laptop"
cat ~/.ssh/id_ed25519.pub
```

将输出的公钥添加到 [GitHub SSH Keys](https://github.com/settings/ssh/new)，然后执行：

```bash
ssh -T git@github.com
git clone git@github.com:HJCheng0602/HJCheng0602.git
cd HJCheng0602
echo 'export AI_WORKBENCH_DEVICE=wsl-laptop' >> ~/.zshrc
source ~/.zshrc
npm run collect
npm run sync
```

如果使用 Bash，把环境变量写入 `~/.bashrc`，然后运行 `source ~/.bashrc`。

## 日常更新

初始化完成后，每台机器只需要：

```bash
cd HJCheng0602
npm run sync
```

`npm run sync` 会依次：

1. 拉取其他设备的最新快照；
2. 扫描本机 Codex、Qoder、Claude Code 与 OpenCode 的本地记录（不存在的数据源会跳过）；
3. 只更新本机对应的设备快照；Claude Code 与 OpenCode 分别使用 `<设备名>-claude.json` 和 `<设备名>-opencode.json`，避免与 Codex 重叠；
4. 提交并推送更改；
5. 触发 GitHub Actions 合并数据并更新主页 SVG。

如果两台机器恰好同时推送，其中一台可能收到 `non-fast-forward`。在失败的机器上重新运行一次 `npm run sync` 即可。

## 首次同步检查

可分别单独采集一次：

```bash
npm run collect
npm run collect:qoder
npm run collect:claude
npm run collect:opencode
```

终端应显示扫描位置和发现的模型数量，例如：

```text
Collected 3 model(s) from /Users/you/.codex/sessions for 2026-01-16..2026-07-17.
```

然后检查设备文件是否生成：

```bash
ls data/devices
git status --short
```

如果显示 `0 model(s)`，先确认本机在过去 183 天内运行过对应客户端，并检查相应记录目录是否存在。采集器不会上传提示词、代码、文件路径、请求 ID、会话 ID 或机器 hostname，只会提交按日期和模型聚合后的 token 数量。Claude transcript 中重复出现的同一 API 请求会按 `requestId` 去重；OpenCode 只读取 SQLite 中的聚合所需字段，不读取消息正文。

## 图表统计口径

- 顶部 token 总量、每日积木、设备贡献和模型明细全部使用滚动 183 天窗口；窗口每天随同步向前移动。
- 缓存率为 `cached input tokens / input tokens`。缓存 token 是输入 token 的子集，不应再次加到 token 总量中。
- reasoning token 已包含在 output token 中，只作为补充明细展示。
- 成本按各厂商官方 API 单价估算为 USD，不代表实际订阅或 API 账单。Claude Code 会分别计算普通输入、5 分钟缓存写入、1 小时缓存写入、缓存读取与输出；费率来自 [Anthropic 官方价格文档](https://platform.claude.com/docs/en/about-claude/pricing)。
- 模型超过八种时，前七名逐行展示，其余模型合并到 `OTHER · N MODELS`，所有 token、缓存与可计算成本仍会计入。
- 设备超过三台时，前两台逐行展示，其余设备合并到 `OTHER · N DEVICES`。

旧版设备快照只有 token 总量，没有输入、缓存和输出明细。图表会显示 `RESYNC FOR DETAILS`，而不是把缺失数据当成 0；在对应设备拉取新版采集器并重新运行 `npm run sync` 后即可补齐完整历史窗口。

## API 模式能否统计

- 通过 Codex CLI/IDE 使用 API，只要会话仍写入 `~/.codex/sessions`，当前采集器就可以统计。
- 使用 `--ephemeral` 等不保存会话的模式无法被当前采集器统计。
- 直接从 Python、JavaScript 或其他应用调用 OpenAI API，不会自动写入 Codex 会话目录，因此当前采集器不会统计这部分用量；需要另接 API Usage 数据源。

## 常见问题

### `cannot pull with rebase: You have unstaged changes`

同步前先查看本地改动：

```bash
git status --short
```

如果是自己需要保留的修改，先提交后再同步：

```bash
git add <文件路径>
git commit -m "docs: describe the change"
npm run sync
```

不要使用会丢弃修改的强制重置命令。

### `Permission denied (publickey)`

确认该环境中的公钥已经添加到 GitHub，而不是只添加了另一台机器或 Windows/WSL 另一侧的密钥：

```bash
ssh -T git@github.com
```

### 仓库使用 HTTPS，推送时要求密码

切换到 SSH remote：

```bash
git remote set-url origin git@github.com:HJCheng0602/HJCheng0602.git
ssh -T git@github.com
```

### 数据重复

检查是否存在以下情况：

- 同一台机器先后使用了两个设备名；
- 两个设备正在读取同一份 `~/.codex/sessions`；
- 两台不同机器使用了相同设备名，互相覆盖快照。

当前 WSL 已经使用 `linux.json`，不要直接改成新设备名。若确实需要重命名，应在同一次提交中迁移旧快照，避免新旧文件同时参与合并。

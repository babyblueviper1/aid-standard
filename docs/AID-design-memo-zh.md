# AID（Agent Identity）设计备忘录 · 第一轮

版本 0.2 · 2026-09-30 · 内部讨论稿（Gary / Carl / Victor）· R1 已确认，R2 已交付

本备忘录记录 AID 标准在起草 ERC 全文之前已经确认的设计决策、与 Carl v0.2 讨论稿的差异、以及留给下一轮的开放问题。英文 EIP 骨架见 `ERCS/erc-aid.md`，两份文件的规则必须一致，以本备忘录为准。

---

## 0. 一句话定位

AID 是 DID 谱系里的 Agent 身份：**任何一个链上地址都是一个待激活的 AID；当这个地址背后有一个活着的 Agent（有 ERC-8004 注册、有心跳、有链上行为），它就是一个激活的 AID。** AID 自己只定义一层极薄的链上登记（绑定、状态、心跳、自述 facet 指针），其余全部继承复用 ERC-8004（身份注册、原始评价、验证）与 ERC-8419（KYA 断言、ZK 断言、策略），并通过链上事件与 ERC-8338（Skill）、ERC-8414（Task）天然关联。

标准的价值不在于"又一个注册表"，而在于给出一套**确定的解析规则**：拿到一个地址，任何人都能按同一套规则算出它的状态、拼出它的画像、并逐项到链上复核。

---

## 1. 已确认的决策（2026-09-30）

### D1 锚点 = 地址（did:pkh 风格）

- AID 的主键是 `(namespace, chainId, address)`，规范字符串采用 CAIP-10：`eip155:8453:0xabc…`；DID 形式 `did:aid:eip155:8453:0xabc…`（DID method 规范作为 companion 提交 W3C did-extensions，不进 ERC 正文）。
- 任何地址（EOA 或合约账户）都是一个 **Dormant** 状态的 AID，无需任何登记。
- 同一私钥在各 EVM 链上地址相同，但 AID 是 chain-scoped 的；跨链同地址通过 AID Document 的 `alsoKnownAs` 互指，不强制合并。
- 推荐 profile：锚点使用智能账户（ERC-4337 或 ERC-6551），这样签名密钥可轮换而地址不变。EOA 换钥匙等价于"退休 + 指定继任者"（见 D2 的 Retired 与 `successor`）。

### D2 与 ERC-8004 的绑定是一对一

- 一个 AID 最多绑定一个 `(identityRegistry, agentId)`；一个 `(identityRegistry, agentId)` 最多被一个 AID 绑定。AID 注册表用双向映射强制这一点，ERC-8004 本身不强制。
- 绑定条件：调用者就是锚点地址（或锚点的 EIP-712 / EIP-1271 签名），且 `IdentityRegistry.getAgentWallet(agentId) == anchor` 或 `ownerOf(agentId) == anchor`。
- **推荐** 以 `agentWallet` 作为锚点而不是 `owner`：金融行为画像描述的是"Agent 实际用来交易的地址"，owner 往往是人的地址。一个 owner 名下有多个 Agent 时，每个 Agent 用各自的 agentWallet（或各自的 6551 TBA）作为各自的 AID 锚点，这正是"一对一"的自然落地。
- 8004 侧的反向指针：注册文件 `services[]` 里加一条 `type: "DID"` 指向 `did:aid:…`，并 `setMetadata("aid", anchor)`，这样从 8004 也能走到 AID。

### D3 四态状态机

| 状态 | 判定 |
|---|---|
| **Dormant** | 默认态。无绑定记录。 |
| **Active** | 存在绑定；`ownerOf(agentId)` 不 revert；`agentWallet == anchor` 或 `owner == anchor` 仍成立；`lastSeen + livenessWindow ≥ now`；解析器另需注册文件 `active == true`。 |
| **Stale** | 存在绑定，但上述任一条件失败（超窗未续、agentWallet 被改走、注册文件 active=false）。可通过心跳 / 修复绑定回到 Active。 |
| **Retired** | 锚点主动调用 `retire(successor)`，不可逆；历史（事件、facet 记录）全部保留，可选指向 `successor` 地址。退休时**释放绑定**（发 `Unbound`），使继任地址在 8004 的 agentWallet/owner 指向它之后可以绑定同一个 agent。 |

- 链上 `state(anchor)` 视图只用链上可判的条件（绑定、8004 视图、心跳）；注册文件 `active` 标志由解析器补充判断。ERC 正文要把"链上状态"和"解析状态"分开定义，避免评审说链上视图不确定。
- 心跳：`heartbeat()` 由锚点调用刷新 `lastSeen`；AID 注册表上任何由锚点发起的写操作也刷新 `lastSeen`。索引器**可以**（informative）把锚点的其它链上活动视作活性证据，但链上视图不依赖它。
- `livenessWindow` 为注册表参数（建议默认 90 天），AID 可自行声明更短的窗口。

### D4 AID 只做极薄的一层，Credit 不另设注册表

AID 自己的链上部分只包含锚点授权的记录：绑定 / 解绑、心跳、退休与继任者、自述 facet 指针。其余复用：

| 内容 | 落在哪 |
|---|---|
| 身份注册文件、端点、收款钱包 | ERC-8004 Identity Registry |
| 每一笔第三方原始评价（你的第 7 点） | ERC-8004 Reputation Registry，`tag1` = 开放的评价 term |
| 机构聚合信用分（Carl 的 Credit） | ERC-8419 assertion：scheme = 评分标准，level/value = 分数，`claimDigest` = 评价哈希链头，`validUntil` = 信用时间窗，报告 URI = 机构公开的完整历史 |
| 证书 / 等级 / 审计（Carl 的 Credential） | ERC-8419 assertion（ATTESTED） |
| 第三方 profiler 算出的链上金融画像、AI 行为画像 | ERC-8419 assertion（ATTESTED 或 PROVED） |
| Skill 记录 | ERC-8338 合约事件（按角色推导） |
| Task 记录 | ERC-8414 合约事件（按角色推导） |

Carl 方案里"历史长度只增不减"的防删史规则，作为 credit scheme 的 profile 规则写在附录，不进 AID 正文。

### D5 金融画像默认保密

第 ② 类（交易图谱、频次、额度、方向、对手方分散度、杠杆）默认只在链上放 commitment；访问三档：`PUBLIC` / `GATED`（授权方取明文）/ `ZK`（通过 8419 PROVED 模式证明谓词，如"信用 ≥ 80"、"杠杆 < X"）。这是 ZK-KYA 分支的第一个刚需场景。

### D6 命名：坚持 AID

检索结果（2026-09-30）：eips.ethereum.org 上没有任何以 "Agent Identity" 或 "AID" 命名的 EIP/ERC。相邻的有 ERC-8004 Trustless Agents（媒体常称其为 agent identity，但标题不是）、ERC-8126 AI Agent Verification、ERC-8196 AI Agent Authenticated Wallet、ERC-8107 ENS Trust Registry for Agent Coordination、ERC-7812 ZK Identity Registry、ERC-7734 Decentralized Identity Verification。链外撞名：agentcommunity.org 的 "AID = Agent Identity & Discovery"（DNS `_agent` TXT，即 isitagentready 的 dnsAid 项）；`did:aaid` 曾申请 W3C 注册后撤回。

结论：ERC 标题用 **"Agent Identity (AID)"**，正文首次出现写全称。评审若质疑与 DNS-AID 撞名，回应口径：DNS-AID 是发现层（找端点），本标准是身份与画像层（链上、可复核），两者互补且可以互指——8004 注册文件 `services[]` 本来就能同时列 DNS 端点和 DID。

### D7 起草节奏与仓库

沿用 KYA 的节奏：本轮 = 中文备忘录 + 英文骨架；下一轮 = 全文 + 参考合约 + schema + vectors；再下一轮 = Sepolia 部署 + worked examples + Magicians 帖。仓库 `github.com/garyyang-finchip/aid-standard`，布局镜像 `kya-standard`。ERCs PR 分支 `add-erc-aid` 必须从 `ethereum/ERCs` 最新 master 切，永不用 fork 的 master（#1879 专用）。

---

## 2. 核心模型：Facet + Provenance

AID Document（链下 JSON，由 AID 注册表的 `documentURI` 或 8004 注册文件的 DID 条目指向）是一个 facet 列表。每个 facet：

```
facetType    URI 命名空间，如 aid:finance/observed/v1；链上以 keccak256(URI) 为 bytes32 键
provenance   SELF | OBSERVED | ATTESTED | PROVED
issuer       谁出的（SELF 时 = 锚点）
validFrom / validUntil / observedAt
digest       内容哈希（或 commitment）
access       PUBLIC | GATED | ZK（+ policy 描述）
resolver     去哪复核：erc8004-identity | erc8004-reputation | erc8419-assertion | erc8338 | erc8414 | uri
```

四个 provenance 等级对应"真实不可篡改"的四种含义，ERC 正文必须把这点说透：

- **SELF**：8004 注册文件 + 自述的 runtime / skill / 行业 / 交互方式。链上只保证防篡改，不保证真实。
- **OBSERVED**：从链上事件按钉死版本的算法确定性推导（8338 / 8414 记录、交易图谱指标）。任何人可复算。
- **ATTESTED**：第三方经 8419 断言（信用分、KYA 等级、审计、profiler 输出）。可信度来自发证方，查询方选认谁。
- **PROVED**：ZK 证明谓词成立，明文不暴露。

核心 facet 类型（正文 normative 定义容器和这几个的 schema，其余走注册扩展）：

| facetType | 对应你的分类 | 默认 provenance |
|---|---|---|
| `aid:core/identity/v1` | ① 8004 注册文件 | SELF |
| `aid:core/kya/v1` | ① 8419 断言集合 | ATTESTED / PROVED |
| `aid:finance/observed/v1` | ② 链上金融行为 | OBSERVED（commitment）+ PROVED |
| `aid:behavior/*` | ③ AI 行为画像（开放命名空间） | SELF / ATTESTED |
| `aid:skills/erc8338/v1` | ④ Skill 记录 | OBSERVED |
| `aid:tasks/erc8414/v1` | ⑤ Task 记录 | OBSERVED |
| `aid:review/erc8004/v1` | 第 7 点 外部评价 term | ATTESTED（8004 Reputation） |

### 时效规则（你的第 6 点）

- 每个 facet 都带 `validUntil`；过期 facet **不得**被当作当前状态，**可以**作为历史列出。
- 信用类断言无 `validUntil` 视为无效（不接受"永久信用"）。
- Skill / Task facet 区分 open 窗口（进行中的 tender、在售的 skill）与 history 窗口（已结算 / 已下架），窗口长度由 facet schema 给出默认值。
- 解析器输出的每个字段都带 `observedAt`，让下游自己判断新鲜度。

### 8338 / 8414 的关联方式

不复制数据，只按 `(chainId, contract, tokenId, role)` 引用：8338 的 role ∈ {creator, owner, executor, genesisCreator}，8414 的 role ∈ {creator, funder, bidder, fulfiller, judge}。因为 8338 / 8414 事件里本来就是地址，锚点 = 地址意味着零登记成本，这是 D1 最实在的好处。ERC 正文给出推导算法（informative）和 facet schema（normative）。

---

## 3. 与 Carl v0.2 讨论稿的差异清单

| Carl v0.2 | 本备忘录 | 原因 |
|---|---|---|
| 锚在 `agentId`：`did:aid:eip155:8453:0xRegistry:42` | 锚在地址：`did:aid:eip155:8453:0xWallet` | 见 D1；8004 的 agentId 作为一对一绑定 |
| AIDRegistry 继承 8004 Identity、禁转让、`rotateController` | 不继承、不复制 8004；地址锚下无"转让"概念；密钥轮换靠智能账户，EOA 走 Retired + successor | 极薄一层 |
| `registerResource` 登记名下 Skill/Service | 从 8338 / 8414 事件推导，无需登记 | 零登记成本 |
| 独立 CreditRegistry（`declare / latest`） | 8004 Reputation（原始评价）+ 8419 assertion（聚合分） | D4 |
| Credential L1→L3 递进、统一经 FinchAttester | 进 informative 附录作为 Finch profile；正文只规定"scheme 可声明等级单调约束" | 服务方不得成为 normative（与 8414 上的红线一致） |
| `/skill/7` 路径指向名下资源 | 保留为 DID URL 路径语法（companion），链上不建模 | 与 DID URL 兼容 |
| ARD 信任插口填 AID | 保留，写进 Motivation 与 8004 `services[]` 互指 | 一致 |
| 收录站"每一项可自己上链复核" | 原样进 Rationale，成为解析规则的设计原则 | 一致 |

需要 Carl 确认的两点：Credit 并入 8419 后，他设计的哈希链 + 回执机制是否仍作为 Finch 的 credit scheme 参考实现保留（我建议保留）；L1–L3 是否愿意以 "Finch Skill Trust Ladder" 名义出现在附录。

---

## 4. 开放问题（下一轮前定）

1. **每条链上 AID 注册表的地址如何被解析器找到？** 选项：a) 像 8004 一样争取 vanity 地址 + 各链 CREATE2 同地址；b) DID method 规范维护各链注册表清单；c) 两者都做。倾向 c。
2. **`bind` 是否必须由锚点自己发起？** 合约账户走 EIP-1271 签名的 `bindWithSig` 让 relayer 代付，是否 v1 就要？倾向要，成本低。
3. **livenessWindow 的默认值** 与 8004 `active` 标志的优先级：注册文件 active=false 但心跳仍在，算 Stale 还是 Active？倾向 Stale（自述"停用"应被尊重）。
4. ~~8419 subject 编码~~ **已定（R2）**：直接复用 8419 已有的 subject type `account`（`subjectData = abi.encode(chainId, anchor)`），不新增类型。8419 里 `account` 目前是 SHOULD 支持，建议在 8419 下一版把 `account` 提为 MUST——这是 AID 反哺 8419 的唯一改动。
5. **OBSERVED facet 的算法钉法**：算法版本作为 8419 scheme 登记（descriptor 含算法哈希）是否足够，还是 AID 自己开一个 profiler registry？倾向复用 8419 scheme registry，不新增。
6. **`retire()` 后地址继续交易怎么办？** 地址无法被"关掉"，Retired 只表示"此地址不再代表这个 Agent"；解析器对 Retired 地址之后的行为一律不归入该 AID 画像。需要在 Security Considerations 明写。
7. 是否要给 Dormant 地址一个最低限度的"预留"操作（例如只声明 documentURI 而不绑定 8004）？倾向不要，保持"未绑定即 Dormant"的纯粹性。
8. **依赖未合并的风险（R4 前必须解决）**：AID 的 `requires: 8419`，而 ERC-8419（PR #2012）、8338（#1879）、8414（#2005）都还是未合并的 PR。eipw 会因 `./eip-8419.md` 不存在而报红。选项：a) 等 #2012 合并为 Draft 后再提 AID（最干净，PR 已 CI 全绿，可能性不低）；b) 提 AID 时把 8419 改为文字描述"一个断言注册表"，不进 requires、不加链接，合并后再补。倾向 a，并把 AID 的 Magicians 帖先发出去不受影响。
9. **EIP lint（R2 已按 eipw 规则核对）**：eipw 没有"正文引用必须列入 requires"的规则，所以 8338/8414 只链接不进 requires 是合规的；真正会红的是 `markdown-link-first`（每个 EIP/ERC 首次出现必须是链接）、`markdown-refs`（ERC 类提案必须写 ERC-X，因此 1271、55、165、6551 写作 ERC-）、`markdown-link-first-rfc`（RFC 首次出现必须链接）、`markdown-link-status`/`preamble-requires-status`（被链接/被 requires 的提案状态不得低于本提案——都是 Draft，合规）。这些已在 R2 文本里改齐。剩下唯一的硬阻塞仍是第 8 条：被链接的 `./eip-8419.md`、`./eip-8338.md`、`./eip-8414.md` 在 ethereum/ERCs master 上都还不存在（2026-09-30 核实三者均 404），HTMLProofer 会报断链。

---

## 5. 路线图

| 轮次 | 交付 | 状态 |
|---|---|---|
| R1 | 本备忘录 + `ERCS/erc-aid.md` 骨架 + 仓库 README | 已确认 |
| R2 | ERC 全文；`AIDRegistry.sol` 参考实现 + 22 项行为测试；`aid-document` / facet / 五个核心 facet content schema；vectors；`tools/aid-resolve` 参考解析器 | **已交付（2026-09-30）** |
| R3 | Sepolia 部署（沿用 KYA 方式：沙箱签名、桌面内置浏览器广播）；worked examples 绑定 8004 官方 IdentityRegistry 上的示例 agent 与 8419 Sepolia 部署；Magicians 帖 | R2 后 |
| R4 | ERCs PR（分支 `add-erc-aid`，占位 9999）；`did:aid` method 规范 companion 提交 W3C did-extensions | PR 文件包已备好（`ercs-pr-package/`），等 #2012 合并后开 PR |

---

## 6. R2 交付说明（2026-09-30）

**ERC 全文** `ERCS/erc-aid.md`：Specification 十一节全部写实，无 TODO。相对骨架的实质变化：`retire` 释放绑定（见 D3）；8419 subject 用 `account`（开放问题 4）；新增 §10 解析算法（七步，normative）；`IAIDRegistry` 增加 `isRetired`、`nonces`，interfaceId `0x72750a54`；`requires` 增加 165。

**参考合约** `assets/erc-aid/contracts/`：`AIDRegistry.sol`（无 owner、无升级、两个 immutable 活性边界；自含 EIP-712 + ECDSA low-s + EIP-1271）、`interfaces/IAIDRegistry.sol`、`interfaces/IERC8004Identity.sol`（只取 `ownerOf`/`getAgentWallet` 两个视图）、`mocks/`。solc 0.8.28 编译零警告，部署字节码 8.4 KB。

**测试** `test/run.js`（solc-js 编译 + Hardhat 本地链，22/22 通过）：默认 Dormant；两种绑定前置条件；双向唯一性；活性窗口超时→Stale→心跳→Active；每锚点自定义窗口与上限；任何写操作刷新 lastSeen；agentWallet 被改走 / token 被 burn 时无需任何 AID 交易即 Stale；facet 校验与列表维护；`bindWithSig` 的 EOA 与 EIP-1271 合约锚点、重放/错签/过期拒绝；退休释放绑定、封锁所有写、继任者可绑定同一 agent；参考解析器端到端（data: URI 文档、digest 校验、facet 分类、退休规则）。

**Schema** `assets/erc-aid/schemas/`：`aid-document.schema.json`、`facet.schema.json`、`facets/{finance-observed,skills-erc8338,tasks-erc8414,review-erc8004,behavior}-v1.schema.json`。金融画像 schema 里带 `predicates[]`，声明 profiler 愿意对 commitment 做哪些 ZK 谓词证明。

**Vectors** `assets/erc-aid/vectors/aid-vectors.json`：七个 facetType 的 keccak 键；样例 AID Document 的 JCS 串与 digest；EIP-712 `Bind` 的 domainSeparator / typehash / digest；锚点的 8419 `account` subjectKey；interfaceId。样例用的是 8419 那次 Sepolia 的真实地址（官方 8004 IdentityRegistry、agent 10387、KYARegistry、Groth16 adapter），R3 部署后可直接复用。

**解析器** `tools/aid-resolve/resolve.js`：RPC 模式或 fixture 模式，输出 on-chain state / resolved state / 降级原因 / 文档校验 / facet 三分类；`vectors/fixtures/` 里有 active、active=false、retired 三个 fixture。

**R3 起点**：Sepolia 部署 AIDRegistry（默认窗 90 天、上限 365 天），用 8419 那次的 demo agent 10387 做 worked example：把 agentWallet 设到新锚点、bind、setDocumentURI、setFacet(finance, ZK)、对该 subject 发一条 8419 `account` 断言、再跑解析器出完整报告。需要你给一个 Sepolia 地址接收合约控制权（这次注册表本身无 owner，只有 8004 demo agent 的 owner 与 8419 scheme controller 仍在上次的临时 key 上）。

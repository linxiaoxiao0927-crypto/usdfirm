# USDFirm (`usdfirm.com`) — ShineMight OS 美元稳定币发行与合规储备协议底座

本仓库承载 **ShineMight OS** Web2.5 金控矩阵的稳定币底层发行与储备金证明协议层，严格遵循五大独立模块物理隔离与合规防火墙规范：
- **`usdfirm.com`**：美元稳定币 (`USDF` / 微粒燃料 `uUSDF`) 底层发行、100%+ 储备金证明 (PoR) 预言机、3-of-5 多签时间锁财资池协议（物理隔离于交易所撮合风险）。
- **`itiscoin.com`**（备用域名 `asdcoin.com`）：底层财资清算、生息资产中心与生态权益治理通证（≠ 交易所）。
- **`xpayes.com`**（标准流动性输出桥接）：法币出入金、vIBAN 商户收单与四流合一支付网关。
- **隔离做市缓冲金库 (`segregated-mm`)**：仅通过 `/api/v1/usdfirm/bridge/segregated-mm` 受 $20M 硬顶隔离流动性缓冲约束，严禁参与任何交易所撮合或钱包管理，禁止未授权外部交易台直连 `/api/mint`。

## 一、 USDFirm.com 稳定币发行与 PoR 储备证明协议

### 1. Solidity 智能合约层 (`/contracts`)
- `USDF.sol`：符合 ERC-20 标准的合规美元稳定币，内置 OFAC 制裁黑名单拦截、紧急熔断开关 (Pausable) 与时间锁铸币权限控制。
- `USDFTimelockController.sol`：3-of-5 多签治理时间锁控制器，强制大额铸币（$> \$2,000,000$ USD）与核心参数变更执行 24 小时（86,400 秒）最小延迟。
- `ProofOfReservesFeed.sol`：兼容 Chainlink `AggregatorV3Interface` 的链上储备金证明 (PoR) 预言机，防止无足额储备超发。

### 2. 核心后端引擎与 API 路由 (`/api/v1/usdfirm/*`)
- `GET /api/v1/usdfirm/por`：实时 PoR 储备率（102.97% 超额抵押，$173.5M / $168.5M 基准）、SHA-256 Merkle Root 与国债/现金托管资产明细。
- `GET | POST /api/v1/usdfirm/mint`：机构铸币接口（5 bps 费率，OFAC 校验，$> \$2\text{M}$ 自动进入 24h 多签时间锁队列；拦截未授权外部交易台强制路由至隔离缓冲桥）。
- `POST /api/v1/usdfirm/burn`：USDF 销毁与法币赎回结算（3 bps 费率）。
- `GET | POST /api/v1/usdfirm/multisig`：3-of-5 多签委员会提案、签名确认与时间锁到期执行。
- `GET | POST /api/v1/usdfirm/bridge/xpayes`：XPayes 支付网关 HMAC-SHA256 签名验证与 `paymentRef` 幂等清算。
- `GET | POST /api/v1/usdfirm/bridge/segregated-mm`：隔离做市流动性缓冲桥（HMAC-SHA256 + Nonce 防重放 + $20M 风险隔离硬顶，当前已分配基准 $8.5M）。
- `GET | POST /api/v1/usdfirm/risk`：脱锚监测预警、紧急熔断器与 SHA-256 哈希链防篡改审计日志。

## 二、 矩阵复式记账与四流合一清算特性

1. **双态通证与复式记账总账 (`Double-Entry Ledger`)**
   - 每笔交易严格校验 `DEBIT === CREDIT`，内置幂等键防重放保护与 Rust/Merkle 证明校验。
2. **AI Business Skills 燃料矩阵 (`Skill_01` ~ `Skill_06`)**
   - 覆盖 `setupyes.com`、`taxyesai.com`、`uptoyes.com`、`fitjob.ai`、`tocads.com`、`idles.site` 实时扣费（`uUSDF`）与通缩销毁。
3. **“四流合一”智能托管与原子分润 (`4-Flow Escrow`)**
   - 自动对齐主体流 + 税务流 + 资金流 + 物理履约流，签收即触发多方分润。

## 三、 快速启动与验证

```bash
# 1. 生成 Prisma 客户端
npx prisma generate

# 2. 运行 TypeScript 严格类型检查与 Vitest 全量测试
npx tsc --noEmit
npx vitest run

# 3. 执行生产构建验证
npm run build
```

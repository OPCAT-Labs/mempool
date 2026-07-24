# WebSocket "invalid frame" — 根因分析与解决方案

针对后端长时间运行后 WS 客户端出现 `invalid frame` / 异常断连的问题。基于对
`backend/src/api/websocket-handler.ts`、`backend/src/index.ts`、`nginx-mempool.conf`、
`frontend/src/app/services/websocket.service.ts` 的只读排查。

## 先排除的两个"想当然"原因

1. **并发 `client.send()` 交错损坏帧 —— 不成立。**
   两个 WS server 都以 `new WebSocket.Server({ server })` 构造(index.ts:168/171),**未开
   `perMessageDeflate`**(ws 默认关闭)。压缩关闭时,`ws` 对单个 socket 的一次 `send()` 是
   同步成帧并一次性写入;JS 单线程,别的 send 不可能插到帧中间。代码里也没有裸 `socket.write`。
   所以"多个循环写同一 socket 把字节流搞乱"这条不成立。

2. **nginx idle 超时切断 —— 已修复,非主因。**
   `/api/v1/ws`、`/ws`(nginx-mempool.conf:127-165)已正确设置 `Upgrade`/`Connection "Upgrade"`、
   `proxy_http_version 1.1`、`proxy_read_timeout/proxy_send_timeout 3600s`(> 后端 30s 心跳),
   gzip 不作用于已升级的 WS 隧道。配置基本正确。

## 根因(按可能性排序)

### 1. 【高】心跳 `terminate()` 截断正在发送的帧 —— 最贴合"invalid frame"
`websocket-handler.ts:124-137`。心跳对未回 pong 的客户端调用 `client.terminate()`(:127),
即 `socket.destroy()`:**丢弃尚未发出的缓冲字节、立刻 RST 掉 TCP**。长时间运行后,慢/拥塞
客户端会累积背压,而服务端发送的载荷很大(全量 mempool delta、区块 tx 列表)。当这样的客户端
恰好错过一次 ping,`terminate()` 可能在一个大帧只发出一半时触发 → 客户端已按帧头预期 N 字节、
实际只收到 M(<N)就断 → 解析出**残帧/`invalid frame`**(或 1006、UTF-8 解码失败)。慢客户端 +
载荷增大随运行时间累积,正好解释"时间长了才出现"。

### 2. 【高】readyState 在 await 之前检查、send 在 await 之后 —— send-after-close + 未处理拒绝
`$handleMempoolChange` 用 **async 回调遍历**:`server.clients.forEach(async (client) => {...})`
(:768)。`readyState === OPEN` 只在 :769 检查一次,之后 :798/:815 等处 `await` 拉取 bitcoind
交易,最终 :1025 才 `client.send()`。await 期间 socket 可能已转为 CLOSING/CLOSED,此时 send 会
报错;又因为 async 回调**没有被 await**,错误变成**未处理的 Promise 拒绝**(Node ≥15 默认可导致
进程退出)→ 在 pm2 下表现为周期性重启 → 大面积断连。

### 3. 【中】async `forEach` 是 fire-and-forget —— 更新周期重叠、共享状态竞争
:768 的 async 回调不被 await,`$handleMempoolChange` 在各客户端 send 完成前就已 resolve
(mempool.ts:375)。下一个 mempool 周期、以及独立的 `handleNewStatistic` setInterval
(statistics.ts:26)可能在上一批回调仍挂在 await 时并发运行,读写它们共享的结构(newMempool、
mempoolBlocks、this.socketData、局部 responseCache、cpfp 字段)→ 产出逻辑不一致/错乱的载荷,
且在途并发数无上限。

### 4. 【中】`client.send()` 未包 try/catch —— 一次抛错中断整个广播循环
同步广播处理器直接 send、无 try/catch:handleNewBlock(:1421)、handleNewStatistic(:532)、
handleReorg(:603)、handleNewConversionRates(:505)、handleLoadingChanged(:486)、
handleNewStratumJob(:1440)、handleNewDonation(:466)。若 send 对"readyState 检查后又关闭"的
socket 抛错,异常会冲出 `forEach` 中断遍历,导致该失败客户端**之后的所有客户端**都漏收这条消息
→ 随时间推移随机客户端漏收区块/统计 → 前端 ping 超时(websocket.service.ts:337-347)→ 反复重连。

### 5. 【低】nginx 基本正确
见上。仅小瑕疵:`location /api/v1/`(:139-146)对非 WS 流量也设了 Upgrade 头,无害。

## 前端
`frontend/src/app/services/websocket.service.ts` 用 rxjs `webSocket()`,出错即离线并带抖动退避
重连(:323-331),30s 空闲 → ping → 5s 超时强制重连(:333-348)。重连逻辑健全,不区分
"invalid frame",帧错误只会走通用错误路径触发重连。所以前端不是根源,但会把服务端的发送失败/
截断放大为可见的重连抖动。

## 解决方案(按优先级)

### 修复 A(小而安全,高收益):每次 send 前复检 readyState + 逐个包 try/catch
对所有 `client.send(...)` 统一改为:
```ts
if (client.readyState !== WebSocket.OPEN) return; // 紧邻 send 复检
try {
  client.send(payload);
} catch (e) {
  logger.debug('ws send failed: ' + (e instanceof Error ? e.message : e));
}
```
覆盖 :466 :486 :505 :532 :603 :1025 :1421 :1440。解决 #2 的 send-after-close 与未处理拒绝、
以及 #4 的循环中断。

### 修复 B(消除竞争窗口):把 `$handleMempoolChange` 的每客户端循环改为同步
在进入 `forEach` 之前**一次性预取**所有需要 await 的数据(`getFullTransactions` 等),
循环内不再有任何 `await`,readyState 检查与 send 之间不存在挂起窗口。
或用 `await Promise.all(clients.map(...))` 收敛在途并发。解决 #2 #3。

### 修复 C(根治 invalid frame 的字面成因):心跳用优雅关闭 + 背压保护
- 把 `terminate()` 改为先 `client.close()`,给一个宽限期(如 5s)后仍未关闭再 `terminate()`。
- 发送前跳过/降级 `client.bufferedAmount` 过大的慢客户端,避免背压下强杀截断大帧。
- 可给 server 设置合理 `maxPayload`。解决 #1(最可能的字面 invalid frame)。

三项建议一起上:A+B 消除 send-after-close 与竞争,C 消除慢客户端被 `terminate` 截断的残帧。

## 关键位置
- `backend/src/api/websocket-handler.ts`:124-137(心跳/terminate)、768/769/798/815/1025
  (async 竞争)、486/505/532/603/1421/1440(无 try/catch 的同步 send)
- `backend/src/index.ts`:168/171(server 构造)
- `backend/src/api/mempool.ts`:375、`backend/src/api/statistics/statistics.ts`:26(重叠触发源)
- `nginx-mempool.conf`:127-165(WS location,已正确)

<script setup lang="ts">
// Outside (pinned V) | boundary (two functions) | inside (HEAD only).
import { computed } from 'vue'
import { useSlideContext } from '@slidev/client'

const { $clicks } = useSlideContext()
const step = computed(() => $clicks.value)
</script>

<template>
  <div class="bd">
    <div class="zone out" :class="{ lit: step >= 2 }">
      <div class="zh"><ph-users-three /> 外部 · 锁在 2026-07</div>
      <div class="who">客户的程序、我们自己的控制台和命令行工具</div>
      <pre class="js">{ "recipient": "+1555…",
  "text": "Hello" }</pre>
      <pre class="js">{ "sender": "+1555…" }</pre>
      <div class="tag2">事实二：永远收到 2026-07 的格式</div>
    </div>
    <div class="zone mid" :class="{ lit: step >= 3 }">
      <div class="zh"><ph-arrows-left-right /> 边界 · 只有两个函数</div>
      <div class="fn up"><span>升级</span><i class="flow r" /></div>
      <div class="fn down"><i class="flow l" /><span>降级</span></div>
      <div class="tag2">事实三：中间只是翻译，不做业务</div>
    </div>
    <div class="zone in" :class="{ lit: step >= 1 }">
      <div class="zh"><ph-crown-simple /> 内部 · 只有最新版</div>
      <div class="who">业务代码、数据结构、内部消息</div>
      <pre class="js">{ "to": { "handle": "+1555…",
          "protocol": "sms" },
  "text": "Hello" }</pre>
      <pre class="js">{ "sender": { "handle": "+1555…", … } }</pre>
      <div class="tag2">事实一：开发新功能就是直接改这里</div>
    </div>
  </div>
</template>

<style scoped>
.bd { display: grid; grid-template-columns: 1fr .8fr 1fr; gap: .7rem; }
.zone { border: 1px solid #2c2c2e; border-radius: 16px; padding: .7rem .8rem; background: #0a0a0a; opacity: .35; transition: all .45s ease; display: flex; flex-direction: column; gap: .4rem; }
.zone.lit { opacity: 1; }
.out.lit { border-color: rgba(166,224,122,.6); }
.in.lit { border-color: rgba(90,176,216,.6); }
.mid.lit { border-color: rgba(242,132,92,.7); box-shadow: 0 12px 40px -18px rgba(242,132,92,.6); }
.zh { display: flex; align-items: center; gap: .4rem; font-weight: 700; color: #fff; font-size: .82rem; }
.who { font-size: .66rem; color: #8e8e93; }
.js { margin: 0; font-family: var(--slidev-code-font-family); font-size: .62rem; line-height: 1.45; color: #d1d1d6; background: #050505; border: 1px solid #1c1c1e; border-radius: 8px; padding: .4rem .5rem; white-space: pre; }
.tag2 { margin-top: auto; font-size: .66rem; color: #c7c7cc; border-top: 1px solid #1c1c1e; padding-top: .4rem; }
.fn { display: flex; align-items: center; gap: .5rem; font-size: .78rem; font-weight: 700; color: #fff; border: 1px solid #3a3a3c; border-radius: 999px; padding: .4rem .7rem; position: relative; overflow: hidden; }
.fn.up { color: #c4f0a0; } .fn.down { color: #ffb79c; justify-content: flex-end; }
.flow { flex: 1; height: 2px; background-size: 24px 2px; }
.flow.r { background-image: repeating-linear-gradient(90deg, #a6e07a 0 6px, transparent 6px 12px); }
.flow.l { background-image: repeating-linear-gradient(90deg, #f2845c 0 6px, transparent 6px 12px); }
.mid.lit .flow.r { animation: bd-r .7s linear infinite; }
.mid.lit .flow.l { animation: bd-l .7s linear infinite; }
@keyframes bd-r { from { background-position: 0 0; } to { background-position: 24px 0; } }
@keyframes bd-l { from { background-position: 0 0; } to { background-position: -24px 0; } }
</style>

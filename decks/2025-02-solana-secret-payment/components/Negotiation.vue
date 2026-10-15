<template>
      <HoverShow>
        <template #trigger>
          <a class="text-sm opacity-40">协商</a>
        </template>
        <template #content>
          <div class="slidev-hover-content">
            <span class="text-bold text-xl">协商流程</span>
            <ol>
                <li>用户选择 provider 之后同时向 provider 发起连接请求</li>
                <li>provider 收到连接请求后，检查用户 ID 是否存在于 HermesImpl 合约中</li>
                <li>便允许用户连接，开始协商价格</li>
            </ol>
          </div>
        </template>
      </HoverShow>
  </template>
  
  <script>
  import HoverShow from './HoverShow.vue';
  
  export default {
    components: {
        HoverShow,
    },
  };
  </script>
  
  <style scoped>
  /* 示例样式，可以根据 Slidev 风格进一步调整 */
  .slidev-button {
    padding: 8px 16px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: #fff;
    cursor: pointer;
  }
  
  .slidev-hover-content {
    font-size: 14px;
    line-height: 1.5;
  }
  </style>
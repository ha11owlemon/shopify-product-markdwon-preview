# Shopify Product Helper

一个 Chrome / Edge 浏览器插件，在 Shopify 商品编辑页面提供辅助功能。

## 功能

- 自动检测当前页面是否为 Shopify 商品编辑页面
- 在编辑页面底部显示悬浮操作按钮
- 支持 Shopify SPA 页面切换（无需刷新页面）

## 安装方法

### Chrome

1. 打开 `chrome://extensions/`
2. 开启右上角「开发者模式」
3. 点击「加载已解压的扩展程序」
4. 选择本项目文件夹

### Edge

1. 打开 `edge://extensions/`
2. 开启左下角「开发人员模式」
3. 点击「加载扩展」
4. 选择本项目文件夹

## 项目结构

```
├── manifest.json    # 插件配置（Manifest V3）
├── content.js      # 内容脚本（检测页面 + 注入按钮）
├── style.css       # 按钮样式
├── icons/          # 插件图标
└── README.md
```

## 匹配的 Shopify 页面

- `https://admin.shopify.com/store/{store}/products/{productId}`
- `https://{store}.myshopify.com/admin/products/{productId}`

> 仅匹配商品编辑页面（URL 中 products 后跟数字 ID），不匹配商品列表页。

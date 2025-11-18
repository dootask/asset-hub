# DooTask 插件配置

`dootask-plugin/` 目录存放 Asset Hub 插件与 DooTask 主平台对接所需的清单文件。结构如下：

```
dootask-plugin/
├── config.yml         # 插件元数据与版本列表
├── logo.svg           # 菜单图标
└── 1.0.0/
    └── config.yml     # 具体版本的菜单与入口配置
```

## 部署指引

1. 构建 Web 应用并将服务部署在 `https://{host}/apps/asset-hub`。
2. 把 `dootask-plugin/` 目录提交到 DooTask 应用市场仓库或内部分发系统。
3. 在 DooTask 后台上传插件清单，确保菜单入口 URL 与部署地址保持一致。
4. 菜单 URL 中的 `theme`、`lang`、`user_id`、`user_token` 会由 DooTask 注入，用于控制主题、多语言及用户上下文。

如需新增菜单或调整入口，只需要在对应版本目录下更新 `config.yml` 并 bump 根目录中的 `version` 字段。


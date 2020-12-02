# PROMET-ICONS

[PROMET-ICONS](https://yued-fe.github.io/promet-icons/)

## 使用

> 基于 CSS 变量，组件具体可根据业务需要进行封装

```html
<i
  class="promet-icon normal"
  style="--image: var(--add); --size: 40px; --color: #545454"
></i>
```

```css
.promet-icon {
  width: var(--size);
  height: var(--size);
}

/* tint icon */
.promet-icon.normal {
  background-color: var(--color, #000);
  -webkit-mask-image: var(--image);
  -webkit-mask-position: center center;
  -webkit-mask-repeat: no-repeat;
  -webkit-mask-size: 100%;
}

/* 多色 icon */
.promet-icon.ext {
  background: center / var(--size) no-repeat var(--image);
}
```

## icon 是怎么生成的？

1. 通过 `fetch` 先把 figma 的 icon components 抓取下来保存为 svg 或 png 等。
2. 通过 `convert` 对 👆 抓取下来的 icon assets 进行转换（通常针对业务中对 icon 的使用方法来决定转换的格式）。
   1. 将 svg 的图片通过 SVGO 进行压缩处理，并以 Data URLs 的形式作为 CSS 变量保存在`icons.css`中。
   2. 将 png 的以 Base64 Data URLs 的形式作为 CSS 变量保存在`icons.css`中。
3. 业务方可以通过 `npm scripts` 等方法对 npm 包进行更新，同时将 `./node_modules/PROMET-icons/dist` 下的内容进行处理。如：
   ```sh
   DIR_PATH=./node_modules/PROMET-icons/dist
   cp ${DIR_PATH}/icons.css ./style/icons.css
   ```

## 生成文件

```
├── compressed
│   └── svg // 压缩后的 svg 文件
├── png // 从 figma 导出的 png 文件
└── svg // 从 figma 导出的 svg 文件
└── icons.css // icon CSS 变量
└── data.json // 所有 icon 名称的JSON
```

## figma 配置 & 发布 & 更新

1. 可参考 [webnovel-icons](https://github.com/yued-fe/webnovel-icons) 或 [leadream/figma-icon-automation](https://github.com/leadream/figma-icon-automation) README 文档
2. Github token：联系 [Gwokhov](https://github.com/Gwokhov) 获取

Base on:

1. [primer/figma-action](https://github.com/primer/figma-action)
2. [leadream/juuust-react-icon](https://github.com/leadream/juuust-react-icon)
3. [leadream/figma-icon-automation](https://github.com/leadream/figma-icon-automation)

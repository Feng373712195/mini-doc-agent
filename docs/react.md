# React 官方文档摘录（示例）

React 是一个用于构建用户界面的 JavaScript 库。

## useEffect

`useEffect` 用来在函数组件中处理副作用。常见场景包括：

- 订阅事件
- 请求数据
- 操作 DOM

默认情况下，`useEffect` 会在每次渲染后执行。你可以通过依赖数组控制执行时机。

## useState

`useState` 让你在函数组件中声明状态变量。

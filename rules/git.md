# Git规范

- 必须使用 Conventional Commits：

    - feat
    - fix
    - refactor
    - docs

- 单次提交必须只做一个功能
- 提交时提交信息必须使用中文

## 禁止执行以下 Git 操作，除非我明确授权：

    - git checkout
    - git restore
    - git reset
    - git clean
    - git stash
    - git revert


## 如果检测到工作区存在未提交修改：

    - 禁止覆盖
    - 禁止回退
    - 禁止自动合并
    - 必须先询问
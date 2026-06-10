# Navia Documentation History

本目录保存已经完成、过期、未继续激活或仅用于追溯决策的历史文档。

历史文档不会被删除，但默认不作为当前开发、验收或审计依据。当前激活文档入口在：

```text
docs/navia_v1_project_docs/README.md
```

## 归档分类

| 目录 | 内容 |
|---|---|
| `V1.0/` | V1.0 runtime、AgentCore、Side Panel、阅读工具、Session recovery 等历史 stage gate、旧合同和 onboarding 图谱 |
| `V1.1/` | V1.1 前端高保真、Figma baseline、视觉截图、V1.1 stage gate |
| `A-V1.1/` | A 模块高信号网页感知的历史计划、验收和 readiness 审计 |
| `V1.13-V1.16/` | 历史 V1.13-V1.16 / legacy V2.13-V2.16 文档包 |
| `remote-mercury/` | 远端 Mercury 文档合并记录和源文档副本 |
| `legacy/` | 已明确不再作为当前实现依据的旧草案或 open questions |
| `backups/` | 编辑工具产生的临时备份文件 |

## 使用规则

- 可以读取历史文档理解背景。
- 不要把历史文档作为当前实现依据。
- 不要把历史 stage gate 作为当前验收通过依据。
- 如果需要重新启用历史文档中的计划，先迁回当前文档区或新建当前阶段文档，并完成 PRD / 架构 / 合同 / 验收审计。
- 当前仍被 runtime/tests 依赖的兼容合同不会放入 history，即使文件名带有旧阶段编号。

## 当前激活阶段

当前激活阶段是 `A-V1.2 Production Page Perception`。核心入口：

```text
docs/navia_v1_project_docs/design/v1.2-a-page-perception-gap.drawio
docs/navia_v1_project_docs/design/a-v1.2-contract-freeze-readiness-audit.md
docs/navia_v1_project_docs/stage-gates/v1.2-a-v1.2-production-page-perception.md
docs/navia_v1_project_docs/contracts/a_v1_2_page_perception.schema.json
```

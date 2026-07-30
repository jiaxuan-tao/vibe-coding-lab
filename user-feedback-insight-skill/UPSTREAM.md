# 上游来源与参考说明

## AWS Automated Insight Extraction Framework

- 项目：[aws-solutions-library-samples/guidance-automated-insight-extraction-framework-for-customer-feedback-analysis-with-amazon-bedrock](https://github.com/aws-solutions-library-samples/guidance-automated-insight-extraction-framework-for-customer-feedback-analysis-with-amazon-bedrock)
- 维护者：Amazon Web Services
- 许可证：MIT-0
- 核对日期：2026-07-30
- 参考范围：反馈文件输入校验、预定义分类、无法归类时保留 `unknown`、模型结果后处理，以及把原始记录与分析结果关联保存。

上游是面向 AWS 的企业级参考架构，依赖 S3、EventBridge、Step Functions、Lambda、RDS、KMS、Bedrock、SNS 和 QuickSight。本项目没有复制或捆绑这些部署代码、提示词、云资源定义或运行时组件。

## Meituan-Dianping ASAP

- 项目：[Meituan-Dianping/asap](https://github.com/Meituan-Dianping/asap)
- 维护者：Meituan-Dianping
- 许可证：Apache-2.0
- 最近仓库提交：2021-05-27
- 核对日期：2026-07-30
- 参考范围：将一条中文评价拆成方面、观点和情绪关系，以及预定义方面分类对细粒度分析的价值。

ASAP 是中文餐饮评论数据集和研究材料。本项目没有复制、训练、重新分发或捆绑其数据集，也没有复用其模型代码。

## 本项目的实现策略

本目录采用聚焦式轻量重实现（focused reimplementation）：

- 将上游的反馈分类思路进一步收敛为证据台账、独立来源、矛盾与产品机会判断；
- 使用 Python 标准库提供本地只读预处理，不需要 AWS、模型 API、数据库或额外依赖；
- 为 Markdown、TXT、CSV 和 JSON 建立统一证据 ID、重复提示和隐私提醒；
- 用中文产品判断框架约束样本外推、功能化偏差和同一来源重复计算；
- 通过静态契约、脚本单元测试和独立前向评估验证行为。

这里记录的是参考关系和产品方法上的再组织，不把第三方工作描述为本项目自有成果。

## 分发要求

本项目按 [MIT License](LICENSE.txt) 发布。由于没有复制或捆绑上游代码与数据，本目录不包含 MIT-0 或 Apache-2.0 原文副本；若后续实际复用上游文件，应按对应许可证补充版权、许可和 NOTICE 要求。

本项目不暗示与 Amazon Web Services、Meituan-Dianping 或相关维护者存在官方关联或背书。

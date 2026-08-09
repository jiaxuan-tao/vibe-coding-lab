const cleanText = (value, limit = 6000) => String(value || '').trim().slice(0, limit)

export function createStudyPlanPrompt({ subject, examDate }) {
  return `你是一名复习规划助手。请为以下复习主题创建一份务实、可执行的 4 周复习计划。

主题：${cleanText(subject, 200)}
目标日期：${examDate || '未指定'}

要求：
- 每周只聚焦一个明确主题。
- 每周给出 3 条可执行任务，覆盖资料回顾、记忆巩固和测验检验。
- 使用简体中文，不要虚构资料来源。
- 只返回 JSON，不要 Markdown。

JSON 格式：
{"subject":"...","weeks":[{"week":1,"topic":"...","tasks":["...","...","..."]}]}`
}

export function createQuizPrompt({ title, content }) {
  return `你是一名复习测验助手。请根据下列学习资料生成 3 道四选一选择题。

资料标题：${cleanText(title, 200) || '学习资料'}
资料内容：${cleanText(content)}

要求：
- 使用简体中文。
- 每题只考查资料中的一个关键概念。
- 每题给出 4 个选项，ans 为正确选项的 0 开始索引。
- topic 为对应知识点，recommendation 为答错后的简短回看建议。
- 只返回 JSON 数组，不要 Markdown。

JSON 格式：
[{"q":"...","opts":["...","...","...","..."],"ans":0,"topic":"...","recommendation":"..."}]`
}

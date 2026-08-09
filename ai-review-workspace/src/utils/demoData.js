export const DEMO_USER = {
  id: 'demo-user-001',
  name: '演示同学',
  email: 'demo@review-workspace.local',
  avatar: null,
  isDemo: true,
  streak: 7,
  totalStudyHours: 142,
  joinDate: '2025-09-01'
}

export const DEMO_NOTES = [
  {
    id: 'note-demo-1',
    title: '概率分布与期望',
    content: '# 概率分布与期望\n\n## 离散型随机变量\n- 用概率质量函数描述每个取值的概率。\n- 所有取值的概率之和为 1。\n\n## 数学期望\n**公式：** E(X) = Σ xᵢP(X=xᵢ)\n\n期望描述随机变量长期重复试验后的平均结果，不一定是一次试验中能够出现的值。\n\n## 易错点\n- 先确认所有概率是否相加为 1。\n- 方差不是标准差：Var(X) 的单位是原单位的平方。\n- 计算 E(aX+b) 时，结果是 aE(X)+b。',
    courseId: 'course-1',
    color: '#ff6b9d',
    pinned: true,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    updatedAt: Date.now() - 1000 * 60 * 30,
  },
  {
    id: 'note-demo-2',
    title: '访谈提纲：学习习惯',
    content: '# 访谈提纲：学习习惯\n\n## 目标\n了解自学者在制定复习计划、回顾资料和检验掌握程度时的真实阻碍。\n\n## 核心问题\n1. 你通常在什么情况下开始复习？\n2. 面对大量笔记时，最难开始的是哪一步？\n3. 你如何判断一个知识点已经掌握？\n4. 哪些复习提醒最容易被忽略？\n\n## 记录原则\n- 追问具体场景，而不是只记录结论。\n- 区分“想做”和“实际做了”的行为。',
    courseId: 'course-2',
    color: '#c44dff',
    pinned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 1,
    updatedAt: Date.now() - 1000 * 60 * 45,
  },
  {
    id: 'note-demo-3',
    title: '现代设计史：包豪斯',
    content: '# 现代设计史：包豪斯\n\n## 核心主张\n包豪斯强调艺术、工艺与技术的统一，重视功能与生产方式对设计的影响。\n\n## 记忆线索\n- 1919 年创立于魏玛。\n- 教学从基础课开始，再进入工坊实践。\n- 代表人物：格罗皮乌斯、保罗·克利、康定斯基。\n\n## 复习提醒\n把“理念、课程、代表人物、影响”四部分串成一条时间线。',
    courseId: 'course-3',
    color: '#4daaff',
    pinned: false,
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
    updatedAt: Date.now() - 1000 * 60 * 10,
  },
]

export const DEMO_DECKS = [
  {
    id: 'deck-demo-1',
    name: '概率论：核心概念',
    courseId: 'course-1',
    createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    cards: [
      { id: 'c1', front: '数学期望 E(X) 表示什么？', back: '表示随机变量在大量重复试验中的平均结果。它是加权平均，不一定是一次试验中实际出现的值。', streak: 3, nextReview: Date.now() + 86400000 },
      { id: 'c2', front: '离散型随机变量的概率和必须满足什么条件？', back: '所有可能取值对应的概率之和必须等于 1。', streak: 2, nextReview: Date.now() - 1000 },
      { id: 'c3', front: 'E(aX+b) 等于什么？', back: 'E(aX+b) = aE(X)+b。', streak: 0, nextReview: null },
      { id: 'c4', front: '方差与标准差的关系是什么？', back: '标准差等于方差的平方根；方差的单位是原数据单位的平方。', streak: 1, nextReview: Date.now() - 1000 },
      { id: 'c5', front: '计算期望前应先检查什么？', back: '检查概率分布是否完整，以及所有概率相加是否等于 1。', streak: 0, nextReview: null },
    ]
  },
  {
    id: 'deck-demo-2',
    name: '包豪斯：设计史要点',
    courseId: 'course-2',
    createdAt: Date.now() - 1000 * 60 * 60 * 12,
    cards: [
      { id: 'c6', front: '包豪斯最重要的设计主张是什么？', back: '强调艺术、工艺与技术的统一，并让设计适应现代工业生产。', streak: 2, nextReview: Date.now() - 1000 },
      { id: 'c7', front: '包豪斯创立于哪一年、哪里？', back: '1919 年，德国魏玛。', streak: 3, nextReview: Date.now() + 172800000 },
      { id: 'c8', front: '包豪斯课程为什么先安排基础课？', back: '先训练材料、色彩、形式与构成感知，再进入工坊实践。', streak: 1, nextReview: Date.now() - 1000 },
      { id: 'c9', front: '举出一位包豪斯代表人物。', back: '格罗皮乌斯、保罗·克利、康定斯基等。', streak: 0, nextReview: null },
    ]
  }
]

export const DEMO_STUDY_PLANS = [
  {
    id: 'plan-demo-1',
    subject: '概率论与数理统计期末复习',
    createdAt: Date.now() - 86400000,
    weeks: [
      { week: 1, topic: '概率分布与期望', tasks: ['阅读“概率分布与期望”资料', '复习 5 张核心概念卡片', '完成一次知识测验'] },
      { week: 2, topic: '方差与协方差', tasks: ['整理公式与适用条件', '用两道例题检查计算步骤', '标记仍不确定的概念'] },
      { week: 3, topic: '抽样分布与估计', tasks: ['复习常见分布', '完成章节练习', '根据测验结果回看薄弱点'] },
      { week: 4, topic: '综合回顾', tasks: ['完成一套模拟题', '回顾错题与卡片', '整理考前速记清单'] },
    ],
  },
]

export const DEMO_REVIEW_QUIZ = [
  { q: '离散型随机变量的所有取值概率之和应当等于多少？', opts: ['0', '1', '取值个数', '不确定'], ans: 1, topic: '概率分布的基本条件', recommendation: '回看资料中的“离散型随机变量”，确认完整分布的概率和为 1。' },
  { q: '若 E(X)=3，E(2X+1) 等于多少？', opts: ['4', '6', '7', '9'], ans: 2, topic: '期望的线性性质', recommendation: '回看 E(aX+b)=aE(X)+b，并用一个数字例子重新代入计算。' },
  { q: '下列哪项对方差的描述正确？', opts: ['方差等于标准差', '方差可以为负数', '标准差是方差的平方根', '方差与单位无关'], ans: 2, topic: '方差与标准差', recommendation: '回看方差与标准差的定义，记住标准差等于方差的平方根。' },
]

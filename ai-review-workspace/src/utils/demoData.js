export const DEMO_USER = {
  id: 'demo-user-001',
  name: '小林',
  email: 'demo@review-workspace.local',
  avatar: null,
  isDemo: true,
  streak: 7,
  totalStudyHours: 142,
  joinDate: '2025-09-01'
}

export const DEMO_COURSES = [
  { id: 'course-1', name: '概率论与数理统计', code: 'MATH 301', color: '#ff6b9d', instructor: '王老师', credits: 3 },
  { id: 'course-2', name: '用户研究方法', code: 'DES 204', color: '#c44dff', instructor: '李老师', credits: 2 },
  { id: 'course-3', name: '产品设计史', code: 'DES 117', color: '#4daaff', instructor: '陈老师', credits: 2 }
]

const now = new Date()
const daysFromNow = (n) => new Date(now.getTime() + n * 24 * 60 * 60 * 1000).toISOString()

export const DEMO_ASSIGNMENTS = [
  {
    id: 'assign-1',
    title: 'Integration by Parts Problem Set',
    courseId: 'course-1',
    courseName: 'Calculus II',
    dueDate: daysFromNow(2),
    status: 'pending',
    priority: 'high',
    description: 'Complete exercises 7.1 – 7.4 from textbook. Show all work.',
    estimatedHours: 3,
    grade: null
  },
  {
    id: 'assign-2',
    title: 'Binary Search Tree Implementation',
    courseId: 'course-2',
    courseName: 'Data Structures',
    dueDate: daysFromNow(4),
    status: 'in-progress',
    priority: 'high',
    description: 'Implement BST with insert, delete, search, and traversal methods in Python.',
    estimatedHours: 5,
    grade: null
  },
  {
    id: 'assign-3',
    title: 'Essay: Causes of WWI',
    courseId: 'course-3',
    courseName: 'World History',
    dueDate: daysFromNow(6),
    status: 'pending',
    priority: 'medium',
    description: '1500-word analytical essay on the primary causes of World War I.',
    estimatedHours: 4,
    grade: null
  },
  {
    id: 'assign-4',
    title: "Newton's Laws Lab Report",
    courseId: 'course-4',
    courseName: 'Physics I',
    dueDate: daysFromNow(8),
    status: 'pending',
    priority: 'medium',
    description: "Write up lab results from last week's experiment on Newton's second law.",
    estimatedHours: 2,
    grade: null
  },
  {
    id: 'assign-5',
    title: 'Midterm Review — Integration Techniques',
    courseId: 'course-1',
    courseName: 'Calculus II',
    dueDate: daysFromNow(11),
    status: 'pending',
    priority: 'high',
    description: 'Midterm exam covers integration by parts, trig substitution, and partial fractions.',
    estimatedHours: 6,
    grade: null
  },
  {
    id: 'assign-6',
    title: 'Graph Traversal Algorithms Quiz',
    courseId: 'course-2',
    courseName: 'Data Structures',
    dueDate: daysFromNow(-3),
    status: 'completed',
    priority: 'low',
    description: 'Quiz on BFS and DFS algorithms.',
    estimatedHours: 1,
    grade: 92
  },
  {
    id: 'assign-7',
    title: 'Research Proposal: AI Ethics',
    courseId: 'course-5',
    courseName: 'English Composition',
    dueDate: daysFromNow(5),
    status: 'pending',
    priority: 'medium',
    description: '500-word research proposal on AI bias in hiring systems.',
    estimatedHours: 2,
    grade: null
  },
  {
    id: 'assign-8',
    title: 'Projectile Motion Problems',
    courseId: 'course-4',
    courseName: 'Physics I',
    dueDate: daysFromNow(-5),
    status: 'graded',
    priority: 'low',
    description: 'Problem set on 2D kinematics and projectile motion.',
    estimatedHours: 2,
    grade: { pointsEarned: 91, pointsPossible: 100 }
  },
  {
    id: 'assign-9',
    title: 'Sorting Algorithms Analysis',
    courseId: 'course-2',
    courseName: 'Data Structures',
    dueDate: daysFromNow(14),
    status: 'pending',
    priority: 'low',
    description: 'Write analysis comparing time/space complexity of merge sort, quick sort, heap sort.',
    estimatedHours: 3,
    grade: null
  },
  {
    id: 'assign-10',
    title: 'Peer Review: Classmate Essay',
    courseId: 'course-5',
    courseName: 'English Composition',
    dueDate: daysFromNow(9),
    status: 'pending',
    priority: 'low',
    description: 'Review and provide feedback on 2 classmate research proposals.',
    estimatedHours: 1,
    grade: null
  }
]

export const DEMO_EVENTS = [
  {
    id: 'event-1',
    title: 'Calculus Office Hours',
    start: daysFromNow(1),
    type: 'academic',
    description: 'Dr. Chen office hours — bring integration questions',
    color: '#ff6b9d'
  },
  {
    id: 'event-2',
    title: 'CS 301 Group Study',
    start: daysFromNow(3),
    type: 'study',
    description: 'BST implementation group session in library room 204',
    color: '#c44dff'
  },
  {
    id: 'event-3',
    title: 'Physics Lab',
    start: daysFromNow(5),
    type: 'academic',
    description: 'Lab session — bring your completed pre-lab worksheet',
    color: '#4dff91'
  },
  {
    id: 'event-4',
    title: 'History Essay Draft Due',
    start: daysFromNow(6),
    type: 'deadline',
    description: 'First draft for peer review',
    color: '#4daaff'
  },
  {
    id: 'event-5',
    title: 'Calculus II Midterm',
    start: daysFromNow(11),
    type: 'exam',
    description: 'Integration techniques — 90 minutes, closed book',
    color: '#ff4d6a'
  },
  {
    id: 'event-6',
    title: 'CS Study Session',
    start: daysFromNow(7),
    type: 'study',
    description: 'Algorithm complexity review before quiz',
    color: '#c44dff'
  },
  {
    id: 'event-7',
    title: 'Physics Lecture',
    start: daysFromNow(2),
    type: 'academic',
    description: 'Chapter 5: Work, Energy, Power',
    color: '#4dff91'
  },
  {
    id: 'event-8',
    title: 'English Writing Workshop',
    start: daysFromNow(4),
    type: 'academic',
    description: 'Workshop on argumentative essay structure',
    color: '#ffd6a0'
  }
]

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

export const DEMO_COURSE_WEIGHTS = {
  'course-1': [
    { id: 'cat-calc-hw', name: 'Homework', weight: 25 },
    { id: 'cat-calc-quiz', name: 'Quizzes', weight: 25 },
    { id: 'cat-calc-mid', name: 'Midterm', weight: 25 },
    { id: 'cat-calc-fin', name: 'Final Exam', weight: 25 },
  ],
  'course-2': [
    { id: 'cat-cs-hw', name: 'Assignments', weight: 40 },
    { id: 'cat-cs-quiz', name: 'Quizzes', weight: 20 },
    { id: 'cat-cs-proj', name: 'Projects', weight: 40 },
  ],
}

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

export const DEMO_GRADES = {
  'course-1': {
    'hw1': { name: 'HW 1 — U-Substitution', pointsEarned: 48, pointsPossible: 50 },
    'hw2': { name: 'HW 2 — Trig Integrals', pointsEarned: 44, pointsPossible: 50 },
    'quiz1': { name: 'Quiz 1', pointsEarned: 18, pointsPossible: 20 },
    'quiz2': { name: 'Quiz 2 — Partial Fractions', pointsEarned: 17, pointsPossible: 20 },
    'midterm1': { name: 'Midterm 1', pointsEarned: 138, pointsPossible: 150 }
  },
  'course-2': {
    'hw1': { name: 'Arrays & Linked Lists', pointsEarned: 95, pointsPossible: 100 },
    'hw2': { name: 'Stacks & Queues', pointsEarned: 88, pointsPossible: 100 },
    'quiz1': { name: 'BFS/DFS Quiz', pointsEarned: 92, pointsPossible: 100 },
    'project1': { name: 'Linked List Project', pointsEarned: 145, pointsPossible: 150 }
  },
  'course-3': {
    'essay1': { name: 'Short Essay — Ancient Rome', pointsEarned: 87, pointsPossible: 100 },
    'reading1': { name: 'Reading Response 1', pointsEarned: 19, pointsPossible: 20 },
    'reading2': { name: 'Reading Response 2', pointsEarned: 18, pointsPossible: 20 },
    'quiz1': { name: 'Chapter 3-4 Quiz', pointsEarned: 44, pointsPossible: 50 }
  },
  'course-4': {
    'lab1': { name: 'Lab 1 — Kinematics', pointsEarned: 96, pointsPossible: 100 },
    'lab2': { name: 'Lab 2 — Projectile Motion', pointsEarned: 91, pointsPossible: 100 },
    'hw1': { name: 'HW 1 — Motion Equations', pointsEarned: 47, pointsPossible: 50 },
    'quiz1': { name: 'Vectors & Forces Quiz', pointsEarned: 38, pointsPossible: 40 }
  },
  'course-5': {
    'essay1': { name: 'Descriptive Essay', pointsEarned: 92, pointsPossible: 100 },
    'hw1': { name: 'Grammar Workshop 1', pointsEarned: 24, pointsPossible: 25 },
    'hw2': { name: 'Grammar Workshop 2', pointsEarned: 23, pointsPossible: 25 }
  }
}

// Pre-seeded quiz history for demo mode
export const DEMO_QUIZ_HISTORY = [
  { date: Date.now() - 86400000 * 2, score: 4, total: 5, title: '概率论：核心概念' },
  { date: Date.now() - 86400000 * 5, score: 3, total: 4, title: '包豪斯：设计史要点' },
  { date: Date.now() - 86400000 * 9, score: 4, total: 5, title: '用户研究：访谈方法' },
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

// Pre-seeded leaderboard data for demo mode
export const DEMO_LEADERBOARD = [
  { id: 'friend-1', name: 'Ploy S.', avatar: 'P', streak: 12, completionRate: 94, gpa: '91.2', score: 214, isMe: false },
  { id: 'friend-2', name: 'Nat K.', avatar: 'N', streak: 5, completionRate: 78, gpa: '85.0', score: 120, isMe: false },
]

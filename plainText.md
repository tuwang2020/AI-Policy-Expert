e:\code-file\talk2file\
├── backend/ # 后端 (Node.js + Express)
│ ├── src/
│ │ ├── app.js # 主入口
│ │ ├── config/
│ │ │ └── database.js # MySQL配置
│ │ ├── models/ # 6个数据模型
│ │ │ ├── Policy.model.js # 政策表（20+字段）
│ │ │ ├── Enterprise.model.js # 企业表（25+字段）
│ │ │ ├── MatchResult.model.js # 匹配结果表
│ │ │ ├── Reminder.model.js # 提醒表
│ │ │ ├── User.model.js # 用户表（含密码加密）
│ │ │ └── PolicyVersion.model.js # 版本历史表
│ │ ├── services/ # 7个核心服务
│ │ │ ├── llm.service.js # LLM大模型服务（OpenAI/通义千问）
│ │ │ ├── fileParse.service.js # PDF/Word文件解析
│ │ │ ├── policy.service.js # 政策管理核心逻辑
│ │ │ ├── enterprise.service.js # 企业管理+Excel导入导出
│ │ │ ├── matching.service.js # 智能匹配引擎（四维评分）
│ │ │ ├── search.service.js # Elasticsearch全文检索
│ │ │ ├── reminder.service.js # 提醒调度（Bull队列）
│ │ │ ├── feishu.service.js # 飞书Bot推送
│ │ │ └── wechat.service.js # 微信模板消息
│ │ ├── controllers/ # 6个API控制器
│ │ ├── routes/ # 6个路由模块
│ │ ├── tasks/ # 定时任务
│ │ │ ├── reminder.scheduler.js # 提醒调度器
│ │ │ └── es.sync.js # ES同步任务
│ │ ├── middleware/ # 中间件
│ │ └── utils/ # 工具函数
│ ├── uploads/ # 文件上传目录
│ ├── Dockerfile # 后端Docker镜像
│ ├── package.json # 依赖配置
│ └── .env.example # 环境变量模板
│
├── frontend/ # 前端 (Vue3 + Vite)
│ ├── src/
│ │ ├── main.js # 入口文件
│ │ ├── App.vue # 根组件
│ │ ├── router/index.js # 路由配置（13个页面）
│ │ ├── stores/ # Pinia状态管理
│ │ │ ├── user.js # 用户认证状态
│ │ │ └── app.js # 应用全局状态
│ │ ├── api/index.js # API封装（6大模块）
│ │ ├── views/ # 页面组件
│ │ │ ├── Login.vue # 登录注册页
│ │ │ ├── Dashboard.vue # 工作台仪表盘
│ │ │ ├── layout/MainLayout.vue # 主布局（侧边栏+顶栏）
│ │ │ ├── policy/ # 政策模块
│ │ │ │ ├── PolicyList.vue # 政策列表（搜索筛选）
│ │ │ │ ├── PolicyUpload.vue # 上传解析（4步流程）
│ │ │ │ ├── PolicyDetail.vue # 政策详情（结构化展示）
│ │ │ │ └── PolicyCompare.vue # 版本对比（可视化）
│ │ │ ├── enterprise/ # 企业模块
│ │ │ │ ├── EnterpriseList.vue # 企业管理（CRUD+导入）
│ │ │ │ └── EnterpriseDetail.vue # 企业详情
│ │ │ ├── match/ # 匹配模块
│ │ │ │ └── MatchList.vue # 匹配中心（四维评分）
│ │ │ ├── reminder/ # 提醒模块
│ │ │ │ └── ReminderList.vue # 提醒管理
│ │ │ ├── search/ # 搜索模块
│ │ │ │ └── AdvancedSearch.vue # ES高级搜索
│ │ │ └── 404.vue # 404页面
│ │ ├── assets/styles/index.scss # 全局样式
│ │ └── components/ # 公共组件
│ ├── public/ # 静态资源
│ │ ├── logo.svg # Logo图标
│ │ └── favicon.svg # 网站图标
│ ├── index.html # HTML入口
│ ├── vite.config.js # Vite配置
│ └── package.json # 前端依赖
│
├── docker-compose.yml # 一键部署编排
└── docs/ # 文档目录

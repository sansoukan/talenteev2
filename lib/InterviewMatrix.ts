export type InterviewItem = { label: string; value: string };

type SubDomainMap = {
  default: InterviewItem[];
  [sub: string]: InterviewItem[];
};

type DomainMatrix = {
  [domain: string]: SubDomainMap;
};

type StageMatrix = {
  [stage: string]: DomainMatrix | { default: SubDomainMap };
};

export const INTERVIEW_MATRIX: StageMatrix = {
  // 🎓 Student
  student: {
    default: {
      default: [
        { label: "🎯 Job Interview", value: "job_interview" },
        { label: "🎓 Internship / First Job", value: "internship" },
        { label: "🧠 Mini-Case (Reasoning Basics)", value: "case_study" },
        { label: "💪 Practice Mode", value: "practice" },
      ],
    },
  },

  // 🧑‍🎓 Graduate
  graduate: {
    default: {
      default: [
        { label: "🎯 Job Interview", value: "job_interview" },
        { label: "🧠 Case Study (Structured – OW style)", value: "case_study" },
        { label: "💪 Practice Mode", value: "practice" },
      ],
    },
  },

  // 💼 Professional
  professional: {
    marketing: {
      default: [
        { label: "🎯 Marketing Interview", value: "job_interview" },
        { label: "🧠 Brand / Growth Strategy Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
      brand: [
        { label: "🎯 Brand Manager Interview", value: "job_interview" },
        { label: "🧠 Positioning & Storytelling Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      growth: [
        { label: "🎯 Growth Interview", value: "job_interview" },
        { label: "🧠 Funnel / CAC-LTV Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      performance: [
        { label: "🎯 Performance Marketing Interview", value: "job_interview" },
        { label: "🧠 Campaign Optimization Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },

    sales: {
      default: [
        { label: "🎯 Sales Interview", value: "job_interview" },
        { label: "🧠 Business Development Case", value: "case_study" },
        { label: "🚀 Promotion / Review", value: "promotion" },
      ],
      enterprise: [
        { label: "🎯 Enterprise Sales Interview", value: "job_interview" },
        { label: "🧠 Large Account Strategy Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      smb: [
        { label: "🎯 SMB Sales Interview", value: "job_interview" },
        { label: "🧠 Growth & Conversion Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      account_management: [
        { label: "🎯 Account Management Interview", value: "job_interview" },
        { label: "🧠 Retention & Upsell Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },

    finance: {
      default: [
        { label: "🎯 Finance Interview", value: "job_interview" },
        { label: "🧠 FP&A / Profitability Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      mna: [
        { label: "🎯 M&A Interview", value: "job_interview" },
        { label: "🧠 M&A Deal Case (Valuation / Synergies)", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      fpna: [
        { label: "🎯 FP&A Interview", value: "job_interview" },
        { label: "🧠 Forecast / Variance Analysis Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      audit: [
        { label: "🎯 Audit / Accounting Interview", value: "job_interview" },
        { label: "🧠 Controls & Risks Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      markets: [
        { label: "🎯 Capital Markets Interview", value: "job_interview" },
        { label: "🧠 Trading / Structuring Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      risk: [
        { label: "🎯 Risk / Compliance Interview", value: "job_interview" },
        { label: "🧠 Risk Framework Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
    },

    consulting: {
      default: [
        { label: "🎯 Consulting Interview", value: "job_interview" },
        { label: "🧠 Generalist Business Case (McK style)", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      strategy: [
        { label: "🎯 Strategy Consulting Interview", value: "job_interview" },
        { label: "🧠 Strategy Case (Market Entry / Growth)", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      operations: [
        { label: "🎯 Operations Consulting Interview", value: "job_interview" },
        { label: "🧠 Ops Efficiency / Cost Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
      digital: [
        { label: "🎯 Digital Consulting Interview", value: "job_interview" },
        { label: "🧠 Digital Transformation Case", value: "case_study" },
        { label: "📊 Annual Review", value: "annual_review" },
      ],
    },

    tech: {
      default: [
        { label: "🎯 Tech Interview", value: "job_interview" },
        { label: "🧠 System Design & Problem Solving", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
      backend: [
        { label: "🎯 Backend Interview", value: "job_interview" },
        { label: "🧠 Architecture Design Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
      frontend: [
        { label: "🎯 Frontend Interview", value: "job_interview" },
        { label: "🧠 UX / Interaction Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
      data: [
        { label: "🎯 Data Interview", value: "job_interview" },
        { label: "🧠 Analytics / KPI Design Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
      ml: [
        { label: "🎯 Machine Learning Interview", value: "job_interview" },
        { label: "🧠 ML Product / Eval Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
      devops: [
        { label: "🎯 DevOps / Cloud Interview", value: "job_interview" },
        { label: "🧠 Reliability / Scaling Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
    },

    product: {
      default: [
        { label: "🎯 Product Interview", value: "job_interview" },
        { label: "🧠 Product Strategy / Design Case", value: "case_study" },
        { label: "💬 Review / Growth Discussion", value: "annual_review" },
      ],
      strategy: [
        { label: "🎯 Product Strategy Interview", value: "job_interview" },
        { label: "🧠 Roadmap / Prioritization Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      discovery: [
        { label: "🎯 Product Discovery Interview", value: "job_interview" },
        { label: "🧠 User Research / Insights Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      delivery: [
        { label: "🎯 Delivery / Execution Interview", value: "job_interview" },
        { label: "🧠 Execution / Risk Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },

    hr: {
      default: [
        { label: "🎯 HR Interview", value: "job_interview" },
        { label: "🧠 People Strategy Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },

    ops: {
      default: [
        { label: "🎯 Operations Interview", value: "job_interview" },
        { label: "🧠 Process Optimization Case", value: "case_study" },
        { label: "💬 Performance Review", value: "annual_review" },
      ],
    },

    legal: {
      default: [
        { label: "🎯 Legal Interview", value: "job_interview" },
        { label: "🧠 Risk & Compliance Case", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },

    general: {
      default: [
        { label: "🎯 Job Interview", value: "job_interview" },
        { label: "🧠 Business Case (Generalist)", value: "case_study" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },
  },

  // 👥 Manager
  manager: {
    sales: {
      default: [
        { label: "🎯 Sales Leadership Interview", value: "job_interview" },
        { label: "🧠 Go-To-Market Strategy Case", value: "strategic_case" },
        { label: "💬 Performance Review (N/N+1)", value: "annual_review" },
      ],
    },
    marketing: {
      default: [
        { label: "🎯 Marketing Leadership Interview", value: "job_interview" },
        { label: "🧠 Strategic Marketing Case", value: "strategic_case" },
        { label: "💬 Annual Review (N/N+1)", value: "annual_review" },
      ],
    },
    finance: {
      default: [
        { label: "🎯 Finance Leadership Interview", value: "job_interview" },
        { label: "🧠 Corporate Strategy Case", value: "strategic_case" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
      mna: [
        { label: "🎯 M&A Leadership Interview", value: "job_interview" },
        { label: "🧠 Strategic M&A Case", value: "strategic_case" },
        { label: "💬 Annual Review", value: "annual_review" },
      ],
    },
    default: {
      default: [
        { label: "🎯 Leadership Interview", value: "job_interview" },
        { label: "🧠 Strategic Case / Leadership Challenge", value: "strategic_case" },
        { label: "🚀 Promotion / Evolution", value: "promotion" },
      ],
    },
  },
};

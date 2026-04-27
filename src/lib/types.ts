export const CONSTRUCTION_UNITS = ["华显", "绿筑", "一腾", "鑫宇", "煜坤"] as const
export type ConstructionUnit = (typeof CONSTRUCTION_UNITS)[number]

export const DRAWING_SPECIALTIES = ["土建", "安装", "电气", "管道", "钢结构"] as const
export type DrawingSpecialty = (typeof DRAWING_SPECIALTIES)[number]

export type UserRole = "admin" | "department_head" | "worker"

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  department: string
  avatar?: string
}

export interface Drawing {
  id: string
  name: string
  code: string
  version: string
  uploadDate: string
  uploader: string
  status: "published" | "reviewing" | "draft"
  fileSize: string
  recipients: DrawingRecipient[]
  hasChange: boolean
  changeVersion?: string
  constructionUnit?: ConstructionUnit
  specialty?: DrawingSpecialty
  fileUrl?: string
}

export interface DrawingRecipient {
  userId: string
  userName: string
  department: string
  status: "viewed" | "received" | "pending"
  viewedAt?: string
}

export interface ReviewMinute {
  id: string
  drawingId: string
  drawingName: string
  date: string
  participants: string[]
  content: string
  workload: number
  workloadUnit: string
  constructionPlan: string
  status: "completed" | "in_progress" | "pending"
}

export interface MaterialPlan {
  id: string
  planNo: string
  drawingId: string
  drawingName: string
  drawingVersion: string
  status: "submitted" | "approved" | "rejected" | "pending"
  hasVersionUpgrade: boolean
  hasChange: boolean
  changeWorkload?: number
  contactNo?: string
  submitter: string
  submitDate: string
  materials: MaterialItem[]
  constructionUnit?: ConstructionUnit
}

export interface MaterialItem {
  name: string
  specification: string
  quantity: number
  unit: string
}

export interface PipelineInspection {
  id: string
  pipelineNo: string
  weldNo: string
  welderName: string
  welderCertNo: string
  date: string
  status: "completed" | "in_progress" | "pending"
  constructionUnit?: ConstructionUnit
  photos: {
    preAssembly: string[]
    rootPass: string[]
    capPass: string[]
    weldingMaterial: string[]
    process: string[]
  }
}

export interface ProjectImage {
  id: string
  name: string
  category: string
  uploadDate: string
  uploader: string
  url: string
  description: string
  constructionUnit?: ConstructionUnit
}

export interface Milestone {
  id: string
  name: string
  startDate: string
  endDate: string
  progress: number
  status: "completed" | "in_progress" | "delayed" | "pending"
  responsible: string
  constructionUnit?: ConstructionUnit
}

export interface IssueRecord {
  id: string
  title: string
  description: string
  category: string
  priority: "high" | "medium" | "low"
  status: "open" | "in_progress" | "resolved" | "closed"
  responsible: string
  reporter: string
  createDate: string
  resolveDate?: string
  constructionUnit?: ConstructionUnit
}

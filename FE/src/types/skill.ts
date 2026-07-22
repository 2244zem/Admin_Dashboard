export type AchievementType = "KEYWORD" | "TIME" | "KEYWORD_AND_TIME"

export interface SkillDefinition {
  id: string
  nama_skill: string
  keyword: string[]
  deskripsi: string
  is_auto: boolean
  threshold: number
  achievement_type: AchievementType
  response_time_threshold_seconds: number
}

export interface SkillDefinitionPayload {
  nama_skill: string
  keyword: string[]
  deskripsi: string
  is_auto: boolean
  threshold: number
  achievement_type: AchievementType
  response_time_threshold_seconds: number
}

export interface AssignSkillPayload {
  ob_id: string
  skill_id: string
}

export interface ObSkill {
  id: string
  nama_skill: string
  deskripsi: string
  keyword: string[]
  achievement_type: AchievementType
  achieved_at: string
}

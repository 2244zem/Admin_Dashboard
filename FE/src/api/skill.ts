import apiClient from "../services/apiClient"
import { unwrapData } from "../lib/response"
import type { SkillDefinition, SkillDefinitionPayload, AssignSkillPayload, ObSkill } from "../types/skill"

export async function getAllSkillDefinitions() {
  const data = await apiClient.get<unknown>("/api/skill/definitions")
  return unwrapData<SkillDefinition[]>(data)
}

export async function getSkillDefinitionById(id: string) {
  const data = await apiClient.get<unknown>(`/api/skill/definitions/${id}`)
  return unwrapData<SkillDefinition>(data)
}

export async function createSkillDefinition(payload: SkillDefinitionPayload) {
  return apiClient.post("/api/skill/definitions", payload)
}

export async function updateSkillDefinition(id: string, payload: Partial<SkillDefinitionPayload>) {
  return apiClient.patch(`/api/skill/definitions/${id}`, payload)
}

export async function deleteSkillDefinition(id: string) {
  return apiClient.delete(`/api/skill/definitions/${id}`)
}

export async function assignSkillToOb(payload: AssignSkillPayload) {
  return apiClient.post("/api/skill/assign", payload)
}

export async function getObSkills(ob_id: string) {
  const data = await apiClient.get<unknown>(`/api/skill/ob/${ob_id}`)
  return unwrapData<ObSkill[]>(data)
}

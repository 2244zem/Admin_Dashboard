import { useQuery, useQueryClient } from "@tanstack/react-query"
import {
  getAllSkillDefinitions,
  getSkillDefinitionById,
  createSkillDefinition,
  updateSkillDefinition,
  deleteSkillDefinition,
  assignSkillToOb,
  getObSkills,
} from "../api/skill"
import { extractArray } from "../lib/response"
import { getErrorMessage } from "../lib/utils"
import type { SkillDefinition, SkillDefinitionPayload, AssignSkillPayload, ObSkill } from "../types/skill"

export { useSkillDefinitions, useSkillDefinitionDetail, useObSkills }
export default useSkillDefinitions
function useSkillDefinitions() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ["skill-definitions"],
    queryFn: async () => {
      const raw = await getAllSkillDefinitions()
      return extractArray<SkillDefinition>(raw)
    },
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ["skill-definitions"] })

  return {
    skillDefinitions: (query.data as SkillDefinition[] | undefined) ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: invalidate,
    createDefinition: async (p: SkillDefinitionPayload) => {
      const r = await createSkillDefinition(p)
      invalidate()
      return r
    },
    updateDefinition: async (id: string, p: Partial<SkillDefinitionPayload>) => {
      const r = await updateSkillDefinition(id, p)
      invalidate()
      return r
    },
    deleteDefinition: async (id: string) => {
      const r = await deleteSkillDefinition(id)
      invalidate()
      return r
    },
  }
}

function useSkillDefinitionDetail(id: string | undefined) {
  const query = useQuery({
    queryKey: ["skill-definition", id],
    queryFn: () => getSkillDefinitionById(id!),
    enabled: !!id,
  })

  return {
    skillDefinition: query.data ?? null,
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
  }
}

function useObSkills(ob_id: string | undefined) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ["ob-skills", ob_id],
    queryFn: async () => {
      const raw = await getObSkills(ob_id!)
      return extractArray<ObSkill>(raw)
    },
    enabled: !!ob_id,
  })

  return {
    obSkills: (query.data as ObSkill[] | undefined) ?? [],
    isLoading: query.isPending,
    error: query.error ? getErrorMessage(query.error) : null,
    refetch: () => qc.invalidateQueries({ queryKey: ["ob-skills", ob_id] }),
    assignSkill: async (p: AssignSkillPayload) => {
      const r = await assignSkillToOb(p)
      qc.invalidateQueries({ queryKey: ["ob-skills", p.ob_id] })
      return r
    },
  }
}

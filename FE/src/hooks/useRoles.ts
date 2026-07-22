import { useQuery } from "@tanstack/react-query";
import { getAllRoles } from "../api/user";
import { extractArray } from "../lib/response";

interface Role { id: string; nama_role: string }

async function fetchRoles() {
  const data = await getAllRoles();
  return extractArray<Role>(data);
}

export { useRoles };
export default useRoles;
function useRoles() {
  const query = useQuery({
    queryKey: ["roles"],
    queryFn: fetchRoles,
    staleTime: 5 * 60 * 1000, // Roles rarely change
  });

  return {
    roles: query.data ?? [],
    isLoading: query.isPending,
    error: query.error ? String(query.error) : null,
  };
}

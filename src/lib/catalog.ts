import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

// Runtime catalog (fields/skills/plans) — DB-backed, admin-editable.

export interface FieldDef {
  id: string;
  label: string;
  skills: string[];
}

export function useFields() {
  return useQuery({
    queryKey: ["catalog-fields"],
    queryFn: async (): Promise<FieldDef[]> => {
      const [fields, skills] = await Promise.all([
        supabase.from("fields").select("id,label,sort_order").order("sort_order"),
        supabase.from("skills").select("field_id,name"),
      ]);
      const byField = new Map<string, string[]>();
      for (const s of skills.data ?? []) {
        const arr = byField.get(s.field_id) ?? [];
        arr.push(s.name);
        byField.set(s.field_id, arr);
      }
      return (fields.data ?? []).map((f) => ({
        id: f.id,
        label: f.label,
        skills: (byField.get(f.id) ?? []).sort((a, b) => a.localeCompare(b)),
      }));
    },
    staleTime: 5 * 60 * 1000,
  });
}

export interface PlanDef {
  tier: string;
  name: string;
  price_cents: number;
  posts_allowed: number;
  invitations_allowed: number;
  features: string[];
  is_popular: boolean;
  active: boolean;
  sort_order: number;
}

export function usePlans() {
  return useQuery({
    queryKey: ["catalog-plans"],
    queryFn: async (): Promise<PlanDef[]> =>
      ((await supabase.from("plans").select("*").eq("active", true).order("sort_order")).data ?? []) as PlanDef[],
    staleTime: 5 * 60 * 1000,
  });
}

export const formatPrice = (cents: number) => `$${Math.round(cents / 100)}`;

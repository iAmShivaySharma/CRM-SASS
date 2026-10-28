export const DISABLED_MODULES = ['fmcg'] as const

export type DisabledModule = (typeof DISABLED_MODULES)[number]

export function isModuleDisabled(id?: string | null): boolean {
  return !!id && (DISABLED_MODULES as readonly string[]).includes(id)
}

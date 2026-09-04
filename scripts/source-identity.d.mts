export declare const GENERATED_FILE_PATTERNS: readonly RegExp[]
export declare const GENERATED_PREFIXES: readonly string[]
export declare const SOURCE_ROOTS: readonly string[]

export declare function sourceTreeIdentitySync(projectRoot: string): {
  hash: string
  files: number
}

export declare function sourceTreeIdentity(projectRoot: string): Promise<{
  hash: string
  files: number
}>

import { GitCommitInfo } from "@/handles/git"
import { ScanResult } from "@/types"

export interface CommitScan {
	commit: GitCommitInfo
	result: ScanResult
}

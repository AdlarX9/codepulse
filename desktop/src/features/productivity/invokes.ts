import { GitFileChange } from "@/handles/git";
import { invoke } from "@tauri-apps/api";
import { ScanSettings } from "../settings/types";
import { CommitScan } from "./types";

export async function getCommitFileChanges(
	path: string,
	commitSha: string
): Promise<GitFileChange[]> {
	return invoke<GitFileChange[]>('git_get_commit_file_changes', { path, commitSha })
}

export async function scanRepoHistory(
	path: string,
	scanSettings: ScanSettings,
	limit: number
): Promise<CommitScan[]> {
	return invoke<CommitScan[]>('scan_repo_history_cmd', { path, scanSettings, limit })
}
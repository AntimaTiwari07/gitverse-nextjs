/**
 * Contribution Path Types
 * Defines types for repository analysis and contribution data
 */

export interface RepositoryFile {
  path: string;
  name?: string;
  language?: string;
  size?: number;
  lines?: number;
  extension?: string;
}

export interface ContributorInfo {
  name: string;
  email?: string;
  commits: number;
  additions?: number;
  deletions?: number;
  percentage?: number;
  firstCommit?: Date;
  lastCommit?: Date;
}

export interface CommitData {
  hash: string;
  shortHash?: string;
  message: string;
  author: string;
  date: Date;
  filesChanged: number;
  additions?: number;
  deletions?: number;
  branch?: string;
}

export interface RepositoryInsight {
  title: string;
  description: string;
  type: "positive" | "warning" | "info";
  metric?: string;
  value?: string | number;
}

export interface RepositoryAnalysisData {
  files: RepositoryFile[];
  commits?: CommitData[];
  contributors?: ContributorInfo[];
  commitHash?: string;
  analysisDate?: Date;
  totalFiles?: number;
  totalCommits?: number;
  totalContributors?: number;
  insights?: RepositoryInsight[];
  languages?: Array<{
    name: string;
    percentage: number;
    bytes?: number;
    lines?: number;
  }>;
  statistics?: {
    totalInsertions?: number;
    totalDeletions?: number;
    averageFilesPerCommit?: number;
    averageContributorCommits?: number;
  };
}

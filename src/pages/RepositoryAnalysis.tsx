"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import Link from "next/link";

import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RepositoryOverview } from "@/components/repository/RepositoryOverview";
import { FileStructure } from "@/components/repository/FileStructure";
import { CommitHistory } from "@/components/repository/CommitHistory";
import { Contributors } from "@/components/repository/Contributors";
import { RepositoryInsights } from "@/components/repository/RepositoryInsights";
import { RepositoryMentorTab } from "@/components/ai/RepositoryMentorTab";

import {
  Home,
  FolderTree,
  GitCommit,
  Users,
  Sparkles,
  BarChart3,
  ArrowLeft,
  Trash2,
  Activity,
} from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import { EmptyState } from "@/components/ui";
import { buildApiUrl } from "@/services/apiConfig";
import { RepositoryAnalysisSkeleton } from "@/components/ui/RepositoryAnalysisSkeleton";

type TabType =
  | "overview"
  | "files"
  | "commits"
  | "contributors"
  | "mentor"
  | "insights";

interface Tab {
  id: TabType;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: "overview", label: "Overview", icon: <Home className="h-4 w-4" /> },
  { id: "files", label: "Files", icon: <FolderTree className="h-4 w-4" /> },
  { id: "commits", label: "Commits", icon: <GitCommit className="h-4 w-4" /> },
  { id: "contributors", label: "Contributors", icon: <Users className="h-4 w-4" /> },
  { id: "mentor", label: "AI Mentor", icon: <Sparkles className="h-4 w-4" /> },
  { id: "insights", label: "Insights", icon: <BarChart3 className="h-4 w-4" /> },
];

export default function RepositoryAnalysis() {
  const params = useParams();
  const id = params?.id as string;

  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [repository, setRepository] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [job, setJob] = useState<any>(null);

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // ✅ ERROR STATE (improved usage)
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRepository();
  }, [id]);

  useEffect(() => {
    const repoStatus = repository?.status as string | undefined;
    const jobStatus = job?.status as string | undefined;

    const shouldShowAnalyzing =
      repoStatus === "pending" ||
      repoStatus === "analyzing" ||
      jobStatus === "QUEUED" ||
      jobStatus === "PROCESSING";

    setIsAnalyzing(Boolean(shouldShowAnalyzing));

    const jobId = job?.id || repository?.latestJob?.id;
    if (!jobId) return;

    if (jobStatus === "DONE" || jobStatus === "FAILED") return;

    let stopped = false;
    let intervalMs = 2000;

    const poll = async () => {
      if (stopped) return;
      await fetchJob(jobId);
      if (stopped) return;
      setTimeout(poll, intervalMs);
      intervalMs = Math.min(5000, intervalMs + 500);
    };

    poll();

    return () => {
      stopped = true;
    };
  }, [repository?.status, repository?.latestJob?.id, job?.id, job?.status]);

  // =========================
  // FETCH REPOSITORY (FIXED)
  // =========================
  const fetchRepository = async () => {
    if (!id) return;

    setError(null); // ✅ reset error on retry

    try {
      const token = localStorage.getItem("gitverse_token");

      const response = await axios.get(
        buildApiUrl(`/api/repositories/${id}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const repo = response.data.repository || response.data;
      setRepository(repo);

      if (response.data.latestJob) {
        setJob(response.data.latestJob);
      }
    } catch (error: any) {
      console.error("Error fetching repository:", error);

      setError(
        error?.response?.data?.error ||
        "Failed to load repository. Check your connection and try again."
      );

      toast({
        title: "Error",
        description: "Failed to load repository data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // =========================
  // FETCH JOB (FIXED)
  // =========================
  const fetchJob = async (jobId: string) => {
    if (!jobId) return;

    try {
      const token = localStorage.getItem("gitverse_token");

      const response = await axios.get(
        buildApiUrl(`/api/analysis-jobs/${jobId}`),
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const nextJob = response.data.job || response.data;
      setJob(nextJob);

      if (nextJob?.status === "DONE") {
        await fetchRepository();
      }

      if (nextJob?.status === "FAILED") {
        const msg =
          nextJob?.error || "The repository analysis failed.";

        setError(msg); // ✅ UI error added

        toast({
          title: "Analysis failed",
          description: msg,
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error fetching analysis job:", error);

      toast({
        title: "Error",
        description: "Failed to fetch analysis job status",
        variant: "destructive",
      });
    }
  };

  // =========================
  // DELETE REPO
  // =========================
  const handleDeleteRepository = async () => {
    if (!id) return;
    setIsDeleting(true);

    try {
      const token = localStorage.getItem("gitverse_token");

      await axios.delete(buildApiUrl(`/api/repositories/${id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: "Repository deleted",
        description: "The repository has been successfully deleted.",
      });

      router.push("/dashboard");
    } catch (error: any) {
      toast({
        title: "Error",
        description:
          error.response?.data?.error || "Failed to delete repository",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <RepositoryOverview repositoryData={repository} />;
      case "files":
        return <FileStructure repository={repository} />;
      case "commits":
        return <CommitHistory repository={repository} />;
      case "contributors":
        return <Contributors repository={repository} />;
      case "mentor":
        return <RepositoryMentorTab repositoryData={repository} />;
      case "insights":
        return <RepositoryInsights repository={repository} />;
      default:
        return <RepositoryOverview repositoryData={repository} />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {loading ? (
          <RepositoryAnalysisSkeleton />
        ) : !job ? (
          <EmptyState
            icon={Activity}
            title="No analysis jobs found"
            description="Run your first analysis to get started!"
            actionLabel="Go to Dashboard"
            onAction={() => router.push("/dashboard")}
          />
        ) : (
          <>
            {/* ✅ IMPROVED ERROR UI */}
            {error && (
              <div className="glass border border-red-500/40 p-4 rounded-lg text-red-300 flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <Link
                href="/dashboard"
                className="glass p-2 rounded-lg hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" />
              </Link>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold truncate">
                  {repository?.name || "Repository"}
                </h1>

                <p className="text-sm text-muted-foreground truncate">
                  {repository?.url || "No URL available"}
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  Status:{" "}
                  <span className="capitalize">
                    {repository?.status || "unknown"}
                  </span>
                </p>
              </div>

              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="glass p-2 rounded-lg text-red-500"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            {/* ANALYZING STATE */}
            {isAnalyzing ? (
              <div className="glass p-10 text-center">
                <h2 className="text-xl font-semibold">
                  Analyzing Repository...
                </h2>
                <p className="text-muted-foreground mt-2">
                  Please wait while we process your data
                </p>
              </div>
            ) : (
              <>
                {/* TABS */}
                <div className="glass p-2 rounded-lg flex gap-2 overflow-x-auto">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-4 py-2 rounded-lg ${
                        activeTab === tab.id
                          ? "bg-primary text-white"
                          : "text-muted-foreground"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* CONTENT */}
                <div>{renderContent()}</div>
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
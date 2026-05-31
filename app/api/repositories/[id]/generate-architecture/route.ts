import { NextRequest, NextResponse } from "next/server";
import { isHttpError, requireAuth, sanitizeError } from "@/lib/middleware";
import { repositoryService } from "@/lib/services/repositoryService";
import { getGeminiService } from "@/lib/services/geminiService";

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await requireAuth(request);
        const id = parseInt(params.id);

        if (isNaN(id)) {
            return NextResponse.json({ error: "Invalid repository ID" }, { status: 400 });
        }

        const repository = await repositoryService.getRepository(id, user.userId);
        if (!repository) {
            return NextResponse.json({ error: "Repository not found" }, { status: 404 });
        }

        // Limit files to avoid huge context payloads for prompt
        const flatFiles = repository.files || [];
        const contextFiles = flatFiles.slice(0, 100).map((f: any) => ({
            path: f.path || f,
            content: "" // We omit content to save tokens on architecture overview
        }));

        const geminiService = getGeminiService();

        let aiResponse = await geminiService.analyzeRepository({
            repositoryId: id,
            type: "architecture-document",
            context: {
                fileTree: contextFiles.map((f: any) => f.path).join("\n"),
                commits: (repository.commits || []).slice(0, 50),
                languages: repository.languages || [],
                contributors: repository.contributors || []
            }
        });

        // Remove any markdown block tics wrapping the AI response if they exist
        aiResponse = aiResponse.replace(/^```markdown\n/i, "").replace(/\n```$/i, "");

        return new NextResponse(aiResponse, {
            status: 200,
            headers: {
                "Content-Type": "text/markdown",
                "Cache-Control": "no-store",
            },
        });

    } catch (error: any) {
        console.error("Error generating architecture doc:", sanitizeError(error));

        if (isHttpError(error)) {
            return NextResponse.json({ error: error.message }, { status: error.status });
        }

        return NextResponse.json(
            { error: "Failed to generate architecture document" },
            { status: 500 }
        );
    }
}

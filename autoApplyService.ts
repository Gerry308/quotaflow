import { storage } from "./storage";
import { db } from "./db";
import { userProfiles } from "@shared/schema";
import { eq } from "drizzle-orm";

export class AutoApplyService {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;

  async start() {
    if (this.intervalId) return;
    
    console.log("[AutoApply] Starting auto-apply service...");
    
    // Run every 4 hours (6 times per day)
    this.intervalId = setInterval(() => this.runAutoApply(), 4 * 60 * 60 * 1000);
    
    // Also run immediately on startup (delayed by 30 seconds)
    setTimeout(() => this.runAutoApply(), 30000);
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  async runAutoApply() {
    if (this.isRunning) {
      console.log("[AutoApply] Already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("[AutoApply] Running auto-apply job...");

    try {
      // Get users with autoMode enabled and active subscription
      const activeUsers = await db.select()
        .from(userProfiles)
        .where(eq(userProfiles.autoMode, true));

      for (const profile of activeUsers) {
        // Skip if no subscription or trial expired
        if (profile.subscriptionStatus !== "active" && profile.subscriptionStatus !== "trial") {
          continue;
        }

        // Check trial expiry
        if (profile.subscriptionStatus === "trial" && profile.trialEndsAt) {
          if (new Date(profile.trialEndsAt) < new Date()) {
            continue;
          }
        }

        await this.applyForUser(profile);
      }
    } catch (error) {
      console.error("[AutoApply] Error in auto-apply job:", error);
    } finally {
      this.isRunning = false;
    }
  }

  private async applyForUser(profile: typeof userProfiles.$inferSelect) {
    const userId = profile.userId;
    const dailyLimit = profile.dailyLimit || 5;
    const industries = profile.industries || [];

    if (!industries.length) {
      console.log(`[AutoApply] User ${userId} has no industries configured, skipping`);
      return;
    }

    // Get today's applications count
    const todayApps = await this.getTodayApplicationCount(userId);
    const remainingToday = Math.max(0, dailyLimit - todayApps);

    if (remainingToday === 0) {
      console.log(`[AutoApply] User ${userId} has reached daily limit`);
      return;
    }

    // Get matching jobs
    const allJobs = await storage.getJobs();
    
    // Score and filter jobs
    const scoredJobs = allJobs
      .map(job => {
        let score = 50;
        if (industries.includes(job.industry || "")) score += 30;
        if (profile.location && job.location.toLowerCase().includes(profile.location.toLowerCase().split(",")[0])) {
          score += 20;
        }
        return { ...job, matchScore: score };
      })
      .filter(job => job.matchScore >= 70) // Only apply to good matches
      .sort((a, b) => b.matchScore - a.matchScore);

    // Get resumes for this user
    const resumes = await storage.getTailoredResumes(userId);

    let applied = 0;
    for (const job of scoredJobs) {
      if (applied >= remainingToday) break;

      // Check if can apply (7-day duplicate prevention)
      const canApply = await storage.canApplyToJob(userId, job.id);
      if (!canApply) continue;

      // Find matching resume
      const matchingResume = resumes.find(r => r.industry === job.industry);
      const resumeUsed = matchingResume?.industry || "Default";

      // Create application
      try {
        await storage.createApplication({
          userId,
          jobId: job.id,
          jobTitle: job.title,
          company: job.company,
          location: job.location,
          source: job.source,
          status: "applied",
          resumeUsed,
          matchScore: job.matchScore,
          autoApplied: true,
        });

        console.log(`[AutoApply] Applied for ${job.title} at ${job.company} for user ${userId}`);
        applied++;
      } catch (error) {
        console.error(`[AutoApply] Failed to apply for job ${job.id}:`, error);
      }
    }

    console.log(`[AutoApply] Applied to ${applied} jobs for user ${userId}`);
  }

  private async getTodayApplicationCount(userId: string): Promise<number> {
    const apps = await storage.getApplications(userId);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return apps.filter(app => {
      if (!app.appliedAt) return false;
      const appDate = new Date(app.appliedAt);
      return appDate >= today;
    }).length;
  }
}

export const autoApplyService = new AutoApplyService();

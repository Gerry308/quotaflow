import { 
  userProfiles, jobs, applications, tailoredResumes,
  type UserProfile, type InsertUserProfile,
  type Job, type Application, type TailoredResume,
  type CreateJobRequest, type CreateApplicationRequest, type CreateTailoredResumeRequest
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";
// import { authStorage, type IAuthStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  getUserProfile(userId: string): Promise<UserProfile | undefined>;
  updateUserProfile(userId: string, prefs: Partial<InsertUserProfile>): Promise<UserProfile>;
  
  getJobs(): Promise<Job[]>;
  getJobById(id: number): Promise<Job | undefined>;
  createJob(job: CreateJobRequest): Promise<Job>;
  clearJobs(): Promise<void>;
  
  getApplications(userId: string): Promise<(Application & { job?: Job })[]>;
  createApplication(app: CreateApplicationRequest): Promise<Application>;
  canApplyToJob(userId: string, jobId: number): Promise<boolean>;
  
  getTailoredResumes(userId: string): Promise<TailoredResume[]>;
  createTailoredResume(resume: CreateTailoredResumeRequest): Promise<TailoredResume>;
  updateTailoredResume(id: number, updates: Partial<TailoredResume>): Promise<TailoredResume | undefined>;
  deleteTailoredResumes(userId: string): Promise<void>;

  // Stripe helpers
  getProduct(productId: string): Promise<any>;
  listProducts(): Promise<any[]>;
  listProductsWithPrices(): Promise<any[]>;
  getSubscription(subscriptionId: string): Promise<any>;

  // Site Metrics temporarily disabled for publishing
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string) { 
    // Placeholder - auth integration removed for deployment
    return null; 
  }
  
  async upsertUser(user: any) { 
    // Placeholder - auth integration removed for deployment
    return null; 
  }

  // User Profile
  async getUserProfile(userId: string): Promise<UserProfile | undefined> {
    const [profile] = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return profile;
  }

  async updateUserProfile(userId: string, prefs: Partial<InsertUserProfile>): Promise<UserProfile> {
    const existing = await this.getUserProfile(userId);
    
    if (existing) {
      const [updated] = await db.update(userProfiles)
        .set({ ...prefs, updatedAt: new Date() })
        .where(eq(userProfiles.userId, userId))
        .returning();
      return updated;
    } else {
      const [created] = await db.insert(userProfiles)
        .values({ ...prefs, userId } as any)
        .returning();
      return created;
    }
  }

  // Jobs
  async getJobs(): Promise<Job[]> {
    return await db.select().from(jobs).orderBy(desc(jobs.createdAt));
  }

  async getJobById(id: number): Promise<Job | undefined> {
    const [job] = await db.select().from(jobs).where(eq(jobs.id, id));
    return job;
  }

  async createJob(job: CreateJobRequest): Promise<Job> {
    const [newJob] = await db.insert(jobs).values(job).returning();
    return newJob;
  }

  async clearJobs(): Promise<void> {
    await db.delete(jobs);
  }

  // Applications with 7-day duplicate prevention
  async canApplyToJob(userId: string, jobId: number): Promise<boolean> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const [existing] = await db.select()
      .from(applications)
      .where(
        and(
          eq(applications.userId, userId),
          eq(applications.jobId, jobId),
          gte(applications.appliedAt, sevenDaysAgo)
        )
      );
    
    return !existing;
  }

  async getApplications(userId: string): Promise<(Application & { job?: Job })[]> {
    const rows = await db.select({
      application: applications,
      job: jobs,
    })
    .from(applications)
    .leftJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.userId, userId))
    .orderBy(desc(applications.appliedAt));

    return rows.map(r => ({ ...r.application, job: r.job || undefined }));
  }

  async createApplication(app: CreateApplicationRequest): Promise<Application> {
    const [newApp] = await db.insert(applications).values(app).returning();
    return newApp;
  }

  // Resumes
  async getTailoredResumes(userId: string): Promise<TailoredResume[]> {
    return await db.select().from(tailoredResumes).where(eq(tailoredResumes.userId, userId));
  }

  async createTailoredResume(resume: CreateTailoredResumeRequest): Promise<TailoredResume> {
    const [newResume] = await db.insert(tailoredResumes).values(resume).returning();
    return newResume;
  }

  async updateTailoredResume(id: number, updates: Partial<TailoredResume>): Promise<TailoredResume | undefined> {
    const [updated] = await db.update(tailoredResumes)
      .set({ ...updates, isEdited: true })
      .where(eq(tailoredResumes.id, id))
      .returning();
    return updated;
  }

  async deleteTailoredResumes(userId: string): Promise<void> {
    await db.delete(tailoredResumes).where(eq(tailoredResumes.userId, userId));
  }

  // Stripe data queries (from stripe schema)
  async getProduct(productId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE id = ${productId}`
    );
    return result.rows[0] || null;
  }

  async listProducts() {
    const result = await db.execute(
      sql`SELECT * FROM stripe.products WHERE active = true LIMIT 20`
    );
    return result.rows;
  }

  async listProductsWithPrices() {
    const result = await db.execute(
      sql`
        SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.active as product_active,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency,
          pr.recurring,
          pr.active as price_active
        FROM stripe.products p
        LEFT JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY p.id, pr.unit_amount
      `
    );
    return result.rows;
  }

  async getSubscription(subscriptionId: string) {
    const result = await db.execute(
      sql`SELECT * FROM stripe.subscriptions WHERE id = ${subscriptionId}`
    );
    return result.rows[0] || null;
  }

  // Site Metrics temporarily disabled for publishing
}

export const storage = new DatabaseStorage();

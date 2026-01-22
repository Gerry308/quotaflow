import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";

// === TABLE DEFINITIONS ===

// Re-export auth users
export const users = authUsers;

// User Profile / Preferences (Extended User Data)
export const userProfiles = pgTable("user_profiles", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().unique(), // References auth user id
  
  // Profile Data
  baseResume: text("base_resume"),
  baseCoverLetter: text("base_cover_letter"),
  industries: text("industries").array(), // Max 3
  location: text("location"),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  radiusKm: integer("radius_km").default(15),
  salaryMin: integer("salary_min").default(50000),
  employmentType: text("employment_type").default("full-time"), // full-time, part-time, casual, contract
  notificationEmail: text("notification_email"),
  
  // Settings
  autoMode: boolean("auto_mode").default(false),
  dailyLimit: integer("daily_limit").default(5),
  weeklyMode: boolean("weekly_mode").default(false),
  
  // Stripe / Subscription
  stripeCustomerId: text("stripe_customer_id"),
  subscriptionStatus: text("subscription_status").default("trial"), // active, canceled, trial, past_due
  trialEndsAt: timestamp("trial_ends_at"),
  
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const jobs = pgTable("jobs", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  company: text("company").notNull(),
  location: text("location").notNull(),
  latitude: doublePrecision("latitude"),
  longitude: doublePrecision("longitude"),
  salary: integer("salary"),
  type: text("type"),
  source: text("source"), // Seek, Indeed, Adzuna
  industry: text("industry"),
  description: text("description"),
  externalId: text("external_id"), // ID from the source (Adzuna etc)
  url: text("url"), // Link to job
  postedAt: timestamp("posted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const applications = pgTable("applications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  jobId: integer("job_id").notNull(), // Our internal DB ID
  
  // Snapshot of job details at time of application (in case job is deleted)
  jobTitle: text("job_title"),
  company: text("company"),
  location: text("location"),
  source: text("source"),
  
  status: text("status").default("applied"),
  resumeUsed: text("resume_used"), // Industry
  matchScore: integer("match_score"),
  autoApplied: boolean("auto_applied").default(false),
  appliedAt: timestamp("applied_at").defaultNow(),
});

export const tailoredResumes = pgTable("tailored_resumes", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  industry: text("industry").notNull(),
  content: text("content").notNull(),
  coverLetterTemplate: text("cover_letter_template"),
  isEdited: boolean("is_edited").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// TEMPORARILY REMOVED FOR PUBLISHING - email_logs and site_metrics tables
// Will be re-added after successful deployment

// === RELATIONS ===
export const applicationsRelations = relations(applications, ({ one }) => ({
  job: one(jobs, {
    fields: [applications.jobId],
    references: [jobs.id],
  }),
}));

// === BASE SCHEMAS ===
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ id: true, updatedAt: true });
export const insertJobSchema = createInsertSchema(jobs).omit({ id: true, createdAt: true });
export const insertApplicationSchema = createInsertSchema(applications).omit({ id: true, appliedAt: true });
export const insertTailoredResumeSchema = createInsertSchema(tailoredResumes).omit({ id: true, createdAt: true });
// insertEmailLogSchema temporarily removed for publishing

// === EXPLICIT API CONTRACT TYPES ===

// Base types
export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type Job = typeof jobs.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type TailoredResume = typeof tailoredResumes.$inferSelect;
// EmailLog and SiteMetric types temporarily removed for publishing

// Request types
export type UpdateProfileRequest = Partial<InsertUserProfile>;
export type CreateJobRequest = z.infer<typeof insertJobSchema>;
export type CreateApplicationRequest = z.infer<typeof insertApplicationSchema>;
export type CreateTailoredResumeRequest = z.infer<typeof insertTailoredResumeSchema>;

// Backward compatibility exports
export const insertUserPreferencesSchema = insertUserProfileSchema;

// Response types
// Aligning with what frontend expects (it uses UserPreferences type name)
// We alias UserProfile to UserPreferences to keep frontend happy
export type UserPreferences = UserProfile; 
export type UserPreferencesResponse = UserProfile;

export type JobResponse = Job & { matchScore?: number };
export type ApplicationResponse = Application & { job?: Job };
export type TailoredResumeResponse = TailoredResume;

// Export sub-modules
export * from "./models/auth";
export * from "./models/chat";

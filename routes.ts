import { z } from 'zod';
import { 
  insertUserProfileSchema, 
  insertJobSchema, 
  insertApplicationSchema, 
  insertTailoredResumeSchema,
  jobs,
  applications,
  tailoredResumes,
  userProfiles
} from './schema';

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  preferences: {
    get: {
      method: 'GET' as const,
      path: '/api/preferences',
      responses: {
        200: z.custom<typeof userProfiles.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/preferences',
      input: insertUserProfileSchema.partial().omit({ userId: true }),
      responses: {
        200: z.custom<typeof userProfiles.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  jobs: {
    list: {
      method: 'GET' as const,
      path: '/api/jobs',
      input: z.object({
        scan: z.string().optional(),
      }).optional(),
      responses: {
        200: z.array(z.custom<typeof jobs.$inferSelect & { matchScore?: number }>()),
        401: errorSchemas.unauthorized,
      },
    },
    get: {
      method: 'GET' as const,
      path: '/api/jobs/:id',
      responses: {
        200: z.custom<typeof jobs.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
  },
  applications: {
    list: {
      method: 'GET' as const,
      path: '/api/applications',
      responses: {
        200: z.array(z.custom<typeof applications.$inferSelect & { job?: typeof jobs.$inferSelect }>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: 'POST' as const,
      path: '/api/applications',
      input: z.object({
        jobId: z.number(),
        resumeUsed: z.string().optional(),
        matchScore: z.number().optional(),
        autoApplied: z.boolean().optional(),
      }),
      responses: {
        201: z.custom<typeof applications.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
  },
  resumes: {
    list: {
      method: 'GET' as const,
      path: '/api/resumes',
      responses: {
        200: z.array(z.custom<typeof tailoredResumes.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    generate: {
      method: 'POST' as const,
      path: '/api/resumes/generate',
      responses: {
        200: z.array(z.custom<typeof tailoredResumes.$inferSelect>()),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: 'PUT' as const,
      path: '/api/resumes/:id',
      input: insertTailoredResumeSchema.partial().omit({ userId: true, industry: true }),
      responses: {
        200: z.custom<typeof tailoredResumes.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
};

// ============================================
// HELPER
// ============================================
export function buildUrl(path: string, params?: Record<string, string | number>): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

// ============================================
// TYPE HELPERS
// ============================================
export type PreferencesResponse = z.infer<typeof api.preferences.get.responses[200]>;
export type UpdatePreferencesRequest = z.infer<typeof api.preferences.update.input>;
export type JobListResponse = z.infer<typeof api.jobs.list.responses[200]>;
export type ApplicationListResponse = z.infer<typeof api.applications.list.responses[200]>;

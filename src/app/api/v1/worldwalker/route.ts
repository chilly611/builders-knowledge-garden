import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import crypto from 'crypto';

// Types
interface ProcessingJob {
  id: string;
  status: 'uploaded' | 'analyzing' | 'generating' | 'rendering' | 'complete' | 'failed';
  userId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  completedAt?: Date;
  error?: string;
  result?: JobResult;
  progress: number;
}

interface JobResult {
  model_url: string;
  preview_image_url: string;
  materials_detected: DetectedMaterial[];
  dimensions: DimensionData;
  metadata: {
    processingTime: number;
    apiProvider: 'worldlabs' | 'mock';
    generatedAt: string;
  };
}

interface DetectedMaterial {
  id: string;
  name: string;
  color: string;
  confidence: number;
}

interface DimensionData {
  width: string;
  height: string;
  depth: string;
  estimatedSquareFootage: number;
}

// In-memory job store (in production, use a database)
const jobStore = new Map<string, ProcessingJob>();
const userJobCounts = new Map<string, number>();

// Constants
const MAX_CONCURRENT_JOBS_PER_USER = 5;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
const PROCESSING_DELAYS = {
  upload: 500,
  analyze: 2000,
  generating: 3000,
  rendering: 2500,
  complete: 500,
};

// Utility functions
function generateJobId(): string {
  return `job_${crypto.randomBytes(12).toString('hex')}`;
}

function generateUserId(request: NextRequest): string {
  // In production, extract from authenticated session/token
  const authHeader = request.headers.get('authorization') || '';
  const hash = crypto.createHash('sha256').update(authHeader).digest('hex');
  return `user_${hash.substring(0, 16)}`;
}

function validateFileSize(size: number): { valid: boolean; error?: string } {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

function validateContentType(contentType: string): { valid: boolean; error?: string } {
  if (!SUPPORTED_FORMATS.includes(contentType)) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${SUPPORTED_FORMATS.join(', ')}`,
    };
  }
  return { valid: true };
}

function checkJobLimit(userId: string): { allowed: boolean; error?: string } {
  const currentJobs = userJobCounts.get(userId) || 0;
  if (currentJobs >= MAX_CONCURRENT_JOBS_PER_USER) {
    return {
      allowed: false,
      error: `Maximum ${MAX_CONCURRENT_JOBS_PER_USER} concurrent jobs per user reached`,
    };
  }
  return { allowed: true };
}

function incrementJobCount(userId: string): void {
  const current = userJobCounts.get(userId) || 0;
  userJobCounts.set(userId, current + 1);
}

function decrementJobCount(userId: string): void {
  const current = userJobCounts.get(userId) || 0;
  const updated = Math.max(0, current - 1);
  userJobCounts.set(userId, updated);
}

// Mock World Labs API call simulation
async function callWorldLabsAPI(
  imageBuffer: Buffer,
  fileName: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const apiKey = process.env.WORLDLABS_API_KEY;

    if (!apiKey) {
      // Return mock data when API key is not configured
      await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.analyze));
      return {
        success: true,
        data: generateMockWorldLabsResponse(fileName),
      };
    }

    // In production, make actual API call to World Labs Marble API
    // This would look something like:
    // const formData = new FormData();
    // formData.append('image', new Blob([imageBuffer]));
    // const response = await fetch('https://api.worldlabs.ai/v1/process', {
    //   method: 'POST',
    //   headers: {
    //     'Authorization': `Bearer ${apiKey}`,
    //   },
    //   body: formData,
    // });

    // For now, simulate the API response
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.analyze));
    return {
      success: true,
      data: generateMockWorldLabsResponse(fileName),
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to call World Labs API: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Generate mock World Labs response
function generateMockWorldLabsResponse(fileName: string): JobResult {
  const materials: DetectedMaterial[] = [
    { id: 'mat_1', name: 'Oak Hardwood', color: '#8B4513', confidence: 0.92 },
    { id: 'mat_2', name: 'Granite Countertop', color: '#696969', confidence: 0.88 },
    { id: 'mat_3', name: 'Brushed Nickel', color: '#C0C0C0', confidence: 0.85 },
    { id: 'mat_4', name: 'Ceramic Tile', color: '#F5DEB3', confidence: 0.81 },
  ];

  const dimensions: DimensionData = {
    width: '16\' 4"',
    height: '9\' 2"',
    depth: '20\' 8"',
    estimatedSquareFootage: 337,
  };

  return {
    model_url: `https://cdn.example.com/models/${crypto.randomBytes(8).toString('hex')}.glb`,
    preview_image_url: `https://cdn.example.com/previews/${crypto.randomBytes(8).toString('hex')}.jpg`,
    materials_detected: materials,
    dimensions,
    metadata: {
      processingTime: Object.values(PROCESSING_DELAYS).reduce((a, b) => a + b, 0),
      apiProvider: process.env.WORLDLABS_API_KEY ? 'worldlabs' : 'mock',
      generatedAt: new Date().toISOString(),
    },
  };
}

// Simulate async processing pipeline
async function processImagePipeline(job: ProcessingJob, imageBuffer: Buffer): Promise<void> {
  try {
    // Stage 1: Upload (already done, but simulate confirmation)
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.upload));
    job.status = 'uploaded';
    job.progress = 20;

    // Stage 2: Analyze
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.analyze));
    job.status = 'analyzing';
    job.progress = 40;

    // Call World Labs API
    const apiResult = await callWorldLabsAPI(imageBuffer, job.fileName);
    if (!apiResult.success) {
      throw new Error(apiResult.error || 'API call failed');
    }

    // Stage 3: Generate 3D
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.generating));
    job.status = 'generating';
    job.progress = 60;

    // Stage 4: Render
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.rendering));
    job.status = 'rendering';
    job.progress = 85;

    // Stage 5: Complete
    await new Promise((resolve) => setTimeout(resolve, PROCESSING_DELAYS.complete));
    job.status = 'complete';
    job.progress = 100;
    job.result = apiResult.data as JobResult;
    job.completedAt = new Date();
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof Error ? error.message : 'Processing failed';
    job.progress = 0;
  }
}

// POST /api/v1/worldwalker - Upload image and start processing
export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';

    // Validate content type
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: 'Content-Type must be multipart/form-data' },
        { status: 400 }
      );
    }

    // Get user ID from auth header
    const userId = generateUserId(request);

    // Check job limit
    const limitCheck = checkJobLimit(userId);
    if (!limitCheck.allowed) {
      return NextResponse.json({ error: limitCheck.error }, { status: 429 });
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate content type
    const typeCheck = validateContentType(file.type);
    if (!typeCheck.valid) {
      return NextResponse.json({ error: typeCheck.error }, { status: 400 });
    }

    // Validate file size
    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.valid) {
      return NextResponse.json({ error: sizeCheck.error }, { status: 413 });
    }

    // Create job
    const jobId = generateJobId();
    const imageBuffer = await file.arrayBuffer();

    const job: ProcessingJob = {
      id: jobId,
      status: 'uploaded',
      userId,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date(),
      progress: 10,
    };

    jobStore.set(jobId, job);
    incrementJobCount(userId);

    // Start async processing pipeline
    processImagePipeline(job, Buffer.from(imageBuffer))
      .catch((error) => {
        console.error(`Processing error for job ${jobId}:`, error);
      })
      .finally(() => {
        decrementJobCount(userId);
      });

    return NextResponse.json(
      {
        success: true,
        job_id: jobId,
        status: job.status,
        progress: job.progress,
        message: 'Image uploaded successfully. Processing has started.',
      },
      { status: 202 }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET /api/v1/worldwalker?job_id=xxx - Get job status and results
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json({ error: 'job_id parameter is required' }, { status: 400 });
    }

    const job = jobStore.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', job_id: jobId },
        { status: 404 }
      );
    }

    // Get user ID to verify authorization
    const userId = generateUserId(request);
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this job' },
        { status: 403 }
      );
    }

    // Return job status
    const response: any = {
      job_id: job.id,
      status: job.status,
      progress: job.progress,
      fileName: job.fileName,
      fileSize: job.fileSize,
      uploadedAt: job.uploadedAt.toISOString(),
    };

    // Include error if failed
    if (job.error) {
      response.error = job.error;
    }

    // Include completion time if done
    if (job.completedAt) {
      response.completedAt = job.completedAt.toISOString();
    }

    // Include results if complete
    if (job.status === 'complete' && job.result) {
      response.result = job.result;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve job status',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// DELETE /api/v1/worldwalker?job_id=xxx - Cancel a processing job
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('job_id');

    if (!jobId) {
      return NextResponse.json({ error: 'job_id parameter is required' }, { status: 400 });
    }

    const job = jobStore.get(jobId);

    if (!job) {
      return NextResponse.json(
        { error: 'Job not found', job_id: jobId },
        { status: 404 }
      );
    }

    // Get user ID to verify authorization
    const userId = generateUserId(request);
    if (job.userId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: You do not have access to this job' },
        { status: 403 }
      );
    }

    // Check if job can be cancelled
    if (job.status === 'complete' || job.status === 'failed') {
      return NextResponse.json(
        {
          error: `Cannot cancel job with status: ${job.status}`,
          job_id: jobId,
        },
        { status: 400 }
      );
    }

    // Mark job as failed with cancellation message
    job.status = 'failed';
    job.error = 'Job cancelled by user';
    job.progress = 0;

    decrementJobCount(userId);

    return NextResponse.json(
      {
        success: true,
        job_id: jobId,
        message: 'Job cancelled successfully',
        status: job.status,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Cancellation error:', error);
    return NextResponse.json(
      {
        error: 'Failed to cancel job',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// Cleanup old jobs periodically (in production, implement proper cleanup)
if (typeof window === 'undefined') {
  setInterval(() => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [jobId, job] of jobStore.entries()) {
      if (job.completedAt && job.completedAt < oneHourAgo) {
        jobStore.delete(jobId);
        decrementJobCount(job.userId);
      }
    }
  }, 60 * 1000); // Cleanup every minute
}

// Additional helper functions for production use

/**
 * Get all jobs for a user (for listing/history)
 * This would be called from a separate endpoint like GET /api/v1/worldwalker/jobs
 */
export function getJobsForUser(userId: string): ProcessingJob[] {
  return Array.from(jobStore.values()).filter((job) => job.userId === userId);
}

/**
 * Get job statistics
 * This would be called from a monitoring/analytics endpoint
 */
export function getJobStatistics(): {
  totalJobs: number;
  completedJobs: number;
  processingJobs: number;
  failedJobs: number;
  activeUsers: number;
} {
  const jobs = Array.from(jobStore.values());
  const completed = jobs.filter((j) => j.status === 'complete').length;
  const processing = jobs.filter((j) => j.status !== 'complete' && j.status !== 'failed').length;
  const failed = jobs.filter((j) => j.status === 'failed').length;
  const uniqueUsers = new Set(jobs.map((j) => j.userId)).size;

  return {
    totalJobs: jobs.length,
    completedJobs: completed,
    processingJobs: processing,
    failedJobs: failed,
    activeUsers: uniqueUsers,
  };
}

/**
 * Update processing delays (for testing/tuning)
 */
export function updateProcessingDelay(stage: keyof typeof PROCESSING_DELAYS, ms: number): void {
  if (stage in PROCESSING_DELAYS) {
    PROCESSING_DELAYS[stage] = ms;
  }
}

/**
 * Validate World Labs API connectivity
 * This would be called from a health check endpoint
 */
export async function validateWorldLabsConnection(): Promise<{
  connected: boolean;
  provider: 'worldlabs' | 'mock';
  message: string;
}> {
  const apiKey = process.env.WORLDLABS_API_KEY;

  if (!apiKey) {
    return {
      connected: false,
      provider: 'mock',
      message: 'World Labs API key not configured. Using mock data.',
    };
  }

  // In production, test the actual API connection
  // For now, just verify the key exists
  if (apiKey.length < 20) {
    return {
      connected: false,
      provider: 'mock',
      message: 'Invalid API key format. Using mock data.',
    };
  }

  return {
    connected: true,
    provider: 'worldlabs',
    message: 'Connected to World Labs Marble API',
  };
}

/**
 * Stream processing updates via Server-Sent Events
 * This would be called from a streaming endpoint like GET /api/v1/worldwalker/stream?job_id=xxx
 */
export function getJobStream(jobId: string): ProcessingJob | null {
  return jobStore.get(jobId) || null;
}

/**
 * Batch job submission (for multiple images)
 * This would be called from a batch endpoint like POST /api/v1/worldwalker/batch
 */
export async function submitBatchJobs(
  userId: string,
  files: File[]
): Promise<{ jobIds: string[]; skipped: string[] }> {
  const jobIds: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    const limitCheck = checkJobLimit(userId);
    if (!limitCheck.allowed) {
      skipped.push(`${file.name}: Job limit reached`);
      continue;
    }

    const typeCheck = validateContentType(file.type);
    if (!typeCheck.valid) {
      skipped.push(`${file.name}: ${typeCheck.error}`);
      continue;
    }

    const sizeCheck = validateFileSize(file.size);
    if (!sizeCheck.valid) {
      skipped.push(`${file.name}: ${sizeCheck.error}`);
      continue;
    }

    const jobId = generateJobId();
    const job: ProcessingJob = {
      id: jobId,
      status: 'uploaded',
      userId,
      fileName: file.name,
      fileSize: file.size,
      uploadedAt: new Date(),
      progress: 10,
    };

    jobStore.set(jobId, job);
    incrementJobCount(userId);
    jobIds.push(jobId);
  }

  return { jobIds, skipped };
}

/**
 * Export job data for analytics
 * This would be called from an analytics/export endpoint
 */
export function exportJobData(jobId: string): string {
  const job = jobStore.get(jobId);
  if (!job) {
    return '';
  }

  return JSON.stringify(
    {
      id: job.id,
      status: job.status,
      fileName: job.fileName,
      fileSize: job.fileSize,
      uploadedAt: job.uploadedAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
      result: job.result,
      metadata: {
        totalDuration:
          job.completedAt && job.uploadedAt
            ? job.completedAt.getTime() - job.uploadedAt.getTime()
            : null,
      },
    },
    null,
    2
  );
}

/**
 * Clear old job data (for maintenance)
 * This would be called from an admin endpoint or scheduled task
 */
export function clearOldJobs(olderThanHours: number = 24): number {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - olderThanHours * 60 * 60 * 1000);

  let cleared = 0;

  for (const [jobId, job] of jobStore.entries()) {
    if (job.uploadedAt < cutoffTime) {
      jobStore.delete(jobId);
      decrementJobCount(job.userId);
      cleared++;
    }
  }

  return cleared;
}

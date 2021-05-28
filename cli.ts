#!/usr/bin/env node

import { Jobs } from '@gitbeaker/node';
import { Command } from 'commander';

type Options = {
  accessToken: string
  excludeJob?: string
  project: string
  pipeline: string
};

async function main() {
  const program = new Command();

  program.requiredOption("-p, --project <projectId>", "Gitlab project id", process.env.CI_PROJECT_ID)

  program.requiredOption("--pipeline <pipelineId>", "Gitlab pipeline id", process.env.CI_PIPELINE_ID)

  program.option("--exclude-job <excludeJobId>", "Gitlab job id to exclude", process.env.CI_JOB_ID)

  program.requiredOption("-t, --access-token <accessToken>", "Gitlab API Access Token", process.env.GITLAB_ACCESS_TOKEN)

  program.parse()

  const opts = program.opts() as Options;

  const jobs = new Jobs({
    token: opts.accessToken,
  });

  let allJobsFinished = false;

  const excludeJobId = opts.excludeJob ? parseInt(opts.excludeJob) : undefined

  const pipelineId = parseInt(opts.pipeline);

  console.log('Will wait for jobs from project', opts.project, 'and pipeline', pipelineId)
  if (excludeJobId) {
    console.log('except for job with id', excludeJobId)
  }
  do {
    const allPipelineJobsBad = await jobs.showPipelineJobs(opts.project, pipelineId);
    // I think there's a bug in showPipelineJobs as it returns a single JobSchema
    const allPipelineJobsFixed = allPipelineJobsBad as unknown as (typeof allPipelineJobsBad)[]

    const relevantJobs = allPipelineJobsFixed.filter(job => job.id !== excludeJobId)

    const unfinishedJobs = relevantJobs.filter(job => !job.finished_at);

    allJobsFinished = unfinishedJobs.length == 0;

    if (!allJobsFinished) {
      console.log(`Found ${unfinishedJobs.length} not finished jobs:`, unfinishedJobs.map(job => ({
        id: job.id,
        name: job.name,
        status: job.status
      })))

      console.log('Pause for 10 seconds');
      await delay({ millis: 10_000 })
    }
  } while (!allJobsFinished)

  console.log('Done waiting for all jobs')
}

async function delay({ millis }: { millis: number }) {
  return new Promise((resolve) => {
    setTimeout(resolve, millis)
  })
}

main().catch(err => {
  console.log(err);
  process.exit(1)
})


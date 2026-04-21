#!/usr/bin/env node

import { readFileSync, createReadStream } from "fs";
import { randomBytes } from "crypto";
import { S3Client } from "@aws-sdk/client-s3";
import { S3TransferManager } from "@aws-sdk/lib-storage";


const MAX_CONCURRENT_UPLOADS = 64;

function bytesToGigabits(bytes) {
  return (bytes * 8) / 1_000_000_000;
}

function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length < 4) {
    console.error(
      "Usage: node main.mjs S3_CLIENT WORKLOAD BUCKET REGION"
    );
    process.exit(1);
  }
  return {
    s3Client: args[0],
    workloadPath: args[1],
    bucket: args[2],
    region: args[3],
  };
}

function loadWorkload(workloadPath) {
  const raw = readFileSync(workloadPath, "utf-8");
  return JSON.parse(raw);
}

async function runTask(tm, task, bucket, filesOnDisk, randomData) {
  const body = filesOnDisk
    ? createReadStream(task.key)
    : randomData.subarray(0, task.size);
  await tm.upload({
    Bucket: bucket,
    Key: task.key,
    Body: body,
    ContentLength: task.size,
  });
}

async function runAllTasks(tm, tasks, bucket, filesOnDisk, randomData) {
  for (const task of tasks) {
    await runTask(tm, task, bucket, filesOnDisk, randomData);
  }
}

async function main() {
  const { s3Client, workloadPath, bucket, region, targetThroughput } =
    parseArgs();

  const validClients = ["sdk-js-classic"];
  if (!validClients.includes(s3Client)) {
    console.error(`Unknown S3_CLIENT: ${s3Client}. Valid: ${validClients}`);
    process.exit(1);
  }

  const workload = loadWorkload(workloadPath);

  const s3 = new S3Client({ region });
  const tm = new S3TransferManager({
    s3,
    maxConcurrentUploads: MAX_CONCURRENT_UPLOADS,
  });

  // Pre-generate random data for RAM uploads
  let randomData = Buffer.alloc(0);
  if (!workload.filesOnDisk) {
    const maxUploadSize = workload.tasks
      .filter((t) => t.action === "upload")
      .reduce((max, t) => Math.max(max, t.size), 0);
    if (maxUploadSize > 0) {
      if (maxUploadSize > 2147483647) {
        randomData = new Uint8Array(maxUploadSize);
        // Fill in 1GB chunks
        for (let offset = 0; offset < maxUploadSize; offset += 1024 * 1024 * 1024) {
          const chunkSize = Math.min(1024 * 1024 * 1024, maxUploadSize - offset);
          randomData.set(randomBytes(chunkSize), offset);
        }
      } else {
        randomData = randomBytes(maxUploadSize);
      }
    }
  }

  let bytesPerRun = 0;
  for (const task of workload.tasks) {
    bytesPerRun += task.size;
  }

  const appStart = performance.now();
  for (let runNum = 1; runNum <= workload.maxRepeatCount; runNum++) {
    const runStart = performance.now();

    // Run all tasks in the given workload
    await runAllTasks(tm, workload.tasks, bucket, workload.filesOnDisk, randomData);

    const runSecs = (performance.now() - runStart) / 1000;
    const gbps = bytesToGigabits(bytesPerRun) / runSecs;
    console.log(`Run:${runNum} Secs:${runSecs.toFixed(6)} Gb/s:${gbps.toFixed(6)}`);

    if ((performance.now() - appStart) / 1000 >= workload.maxRepeatSecs) {
      break;
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

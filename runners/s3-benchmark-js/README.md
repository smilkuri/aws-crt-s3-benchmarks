# s3-benchrunner-js

s3-benchrunner for [@aws-sdk/lib-storage S3TransferManager](https://github.com/aws/aws-sdk-js-v3/tree/main/lib/lib-storage) (JavaScript/Node.js).

## Building

### Using a local (unpublished) build of lib-storage

First, build and pack your local lib-storage:

```sh
cd /path/to/aws-sdk-js-v3/lib/lib-storage
# build if not already built
npm run build
# create a .tgz package
npm pack
```

This produces a file like `aws-sdk-lib-storage-3.1030.0.tgz`.

Copy this artifact into runner directory:

```sh
cp /path/to/aws-sdk-js-v3/lib/lib-storage/aws-sdk-lib-storage-*.tgz \
   /path/to/aws-crt-s3-benchmarks/runners/s3-benchrunner-js/aws-sdk-lib-storage.tgz
```

Then install dependencies:

```sh
cd aws-crt-s3-benchmarks/runners/s3-benchrunner-js
yarn install
```

## Running

```
node /path/to/main.mjs S3_CLIENT WORKLOAD BUCKET REGION 
```

Example:

```sh
cd FILES_DIR
node /path/to/runners/s3-benchrunner-js/main.mjs sdk-js-classic workloads/upload-5GiB-1x.run.json s3-tm-benchmarks us-west-2 
```

See further instructions [here](../../README.md#run-a-benchmark).

const { spawn } = require('child_process');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const IMAGE_NAME = process.env.PYTHON_GRADER_IMAGE || 'grader-python-image';
const DOCKER_TIMEOUT_BUFFER_MS = 250;

const runPythonInDocker = async ({ submissionPath, input = '', timeout = 5000 }) => {
  const workDir = path.dirname(submissionPath);
  const fileName = path.basename(submissionPath);
  const containerName = `grader-${uuidv4()}`;
  let timedOut = false;

  return new Promise((resolve) => {
    const args = [
      'run',
      '--rm',
      '--name',
      containerName,
      '--memory=128m',
      '--cpus=0.5',
      '--network=none',
      '--pids-limit=50',
      '--read-only',
      '--tmpfs',
      '/tmp:rw,noexec,nosuid,size=64m',
      '-v',
      `${workDir}:/code:ro`,
      '-e',
      `PYTHON_EXEC_TIMEOUT_MS=${timeout}`,
      IMAGE_NAME,
      '/code/' + fileName
    ];

    const child = spawn('docker', args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeout + DOCKER_TIMEOUT_BUFFER_MS);

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({
        success: false,
        error: error.message,
        output: stdout,
        stderr,
        exitCode: null
      });
    });

    child.on('close', (code, signal) => {
      clearTimeout(timer);

      if (timedOut) {
        return resolve({
          success: false,
          error: 'Execution timeout (code took too long to execute)',
          output: stdout,
          stderr,
          timedOut: true,
          exitCode: null
        });
      }

      if (code !== 0) {
        return resolve({
          success: false,
          error: stderr.trim() || `Docker runner exited with code ${code}${signal ? ` (signal ${signal})` : ''}`,
          output: stdout,
          stderr,
          exitCode: code
        });
      }

      resolve({
        success: true,
        output: stdout,
        stderr,
        exitCode: code
      });
    });
  });
};

module.exports = {
  runPythonInDocker
};

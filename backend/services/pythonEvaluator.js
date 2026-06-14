const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { runPythonInDocker } = require('./dockerRunner');

// Directory for temporary code execution
const TEMP_DIR = path.join(__dirname, '..', 'temp');

// Ensure temp directory exists
const ensureTempDir = async () => {
  try {
    await fs.mkdir(TEMP_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create temp directory:', err);
  }
};

// Execute Python code inside the Docker sandbox and capture output
const executePythonCode = async (code, testInput = '', timeout = 5000) => {
  const executionId = uuidv4();
  const filePath = path.join(TEMP_DIR, `${executionId}.py`);

  try {
    await ensureTempDir();
    await fs.writeFile(filePath, code, 'utf8');

    return await runPythonInDocker({
      submissionPath: filePath,
      input: testInput,
      timeout
    });
  } finally {
    try {
      await fs.unlink(filePath);
    } catch (cleanupErr) {
      console.error('Failed to cleanup temp file:', cleanupErr);
    }
  }
};

// Check if code contains specific patterns (syntax check)
const checkCodePatterns = (code, patterns) => {
  const results = [];
  
  for (const pattern of patterns) {
    const regex = new RegExp(pattern.pattern, 'gi');
    const matches = code.match(regex);
    
    results.push({
      criterion: pattern.name,
      passed: !!matches,
      details: matches ? `Found: ${matches.length} occurrence(s)` : 'Not found',
      points: matches ? pattern.points : 0,
      maxPoints: pattern.points
    });
  }
  
  return results;
};

// Evaluate code against test cases (with function calls)
const evaluateAgainstTests = async (code, testCases, criterionWeight = 0.25) => {
  const results = [];
  const totalWeight = 100; // Total points
  const criterionMaxPoints = Math.round(criterionWeight * totalWeight);
  const pointsPerTest = testCases.length > 0 ? criterionMaxPoints / testCases.length : 0;
  
  console.log(`[evaluateAgainstTests] Weight: ${criterionWeight}, MaxPoints: ${criterionMaxPoints}, PointsPerTest: ${pointsPerTest}, NumTests: ${testCases.length}`);
  
  for (const test of testCases) {
    try {
      // Check if this is a function-based test case
      if (test.function_call) {
        // Remove or neutralize the if __name__ == "__main__" block to prevent test output pollution
        let cleanCode = code;
        
        // Replace if __name__ == "__main__": with if False: to disable the block
        cleanCode = cleanCode.replace(/if\s+__name__\s*==\s*['"]__main__['"]\s*:/g, 'if False:');
        
        // Create a test script that imports the code and calls the function
        const testScript = `
${cleanCode}

# Test case execution
result = ${test.function_call}
print(result)
`;
        
        console.log(`[Test] Running: ${test.function_call}`);
        const result = await executePythonCode(testScript, '', test.timeout || 5000);
        console.log(`[Test] Result: success=${result.success}, output="${result.output.trim()}", error="${result.error || 'none'}"`);
        
        // Compare output with expected
        const actualOutput = result.output.trim();
        const expectedOutput = String(test.expected_output || test.expectedOutput).trim();
        const outputMatches = actualOutput === expectedOutput;
        
        console.log(`[Test] Expected: "${expectedOutput}", Got: "${actualOutput}", Matches: ${outputMatches}`);
        
        const passed = result.success && outputMatches;
        
        results.push({
          criterion: test.name || `Test: ${test.function_call}`,
          passed: passed,
          details: passed 
            ? 'Test passed' 
            : (result.error || `Expected: "${expectedOutput}", Got: "${actualOutput}"`),
          output: result.output,
          error: result.error,
          points: passed ? pointsPerTest : 0,
          maxPoints: pointsPerTest
        });
      } else {
        // Old style test with input/expectedOutput
        const result = await executePythonCode(code, test.input, test.timeout || 5000);
        
        const outputMatches = test.expectedOutput 
          ? result.output.trim() === test.expectedOutput.trim()
          : true;
        
        const passed = result.success && outputMatches;
        
        results.push({
          criterion: test.name || 'Test',
          passed: passed,
          details: passed 
            ? 'Test passed' 
            : (result.error || `Expected: "${test.expectedOutput}", Got: "${result.output.trim()}"`),
          output: result.output,
          error: result.error,
          points: passed ? (test.points || pointsPerTest) : 0,
          maxPoints: test.points || pointsPerTest
        });
      }
    } catch (err) {
      console.error(`[Test] Exception: ${err.message}`);
      results.push({
        criterion: test.name || 'Test',
        passed: false,
        details: `Execution error: ${err.message}`,
        points: 0,
        maxPoints: test.points || pointsPerTest
      });
    }
  }
  
  console.log(`[evaluateAgainstTests] Results: ${results.length} tests, Total points: ${results.reduce((s,r)=>s+r.points,0)}/${results.reduce((s,r)=>s+r.maxPoints,0)}`);
  return results;
};

// Main auto-grading function
const autoGradeSubmission = async (code, rubric) => {
  const results = {
    totalPoints: 0,
    maxPoints: 0,
    criteria: [],
    syntaxValid: true,
    executionError: null
  };

  if (!rubric || !rubric.criteria) {
    return {
      ...results,
      error: 'No rubric provided'
    };
  }

  // First, do a basic syntax check by trying to compile
  try {
    const syntaxCheck = await executePythonCode(`
import py_compile
import sys
import tempfile

code = """${code.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"""

try:
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False) as f:
        f.write(code)
        temp_file = f.name
    
    py_compile.compile(temp_file, doraise=True)
    print("SYNTAX_VALID")
except SyntaxError as e:
    print(f"SYNTAX_ERROR: {e}")
`, '', 3000);

    if (!syntaxCheck.output.includes('SYNTAX_VALID')) {
      results.syntaxValid = false;
      results.executionError = syntaxCheck.output.replace('SYNTAX_ERROR:', '').trim();
    }
  } catch (err) {
    results.syntaxValid = false;
    results.executionError = 'Failed to check syntax';
  }

  // Evaluate each criterion
  for (const criterion of rubric.criteria) {
    let criterionResult;

    // Skip AI-assisted criteria (manual grading only)
    if (criterion.ai_assisted === true && !criterion.auto_gradable) {
      criterionResult = {
        name: criterion.name,
        description: criterion.description,
        passed: null,
        points: 0,
        maxPoints: Math.round((criterion.weight || 0.25) * 100),
        details: 'Manual grading required (AI-assisted)',
        skipped: true
      };
      results.criteria.push(criterionResult);
      results.maxPoints += criterionResult.maxPoints;
      continue;
    }

    // Check if criterion has test_cases
    if (criterion.test_cases && criterion.test_cases.length > 0) {
      // Run test cases
      const testResults = await evaluateAgainstTests(code, criterion.test_cases, criterion.weight || 0.25);
      const passed = testResults.every(t => t.passed);
      const points = testResults.reduce((sum, t) => sum + t.points, 0);
      const maxPoints = testResults.reduce((sum, t) => sum + t.maxPoints, 0);
      
      criterionResult = {
        name: criterion.name,
        description: criterion.description,
        passed: passed,
        points: Math.round(points),
        maxPoints: Math.round(maxPoints),
        details: testResults.map(t => `${t.criterion}: ${t.details}`).join('; '),
        testResults: testResults
      };
    } else if (criterion.testCases && criterion.testCases.length > 0) {
      // Old format support
      const testResults = await evaluateAgainstTests(code, criterion.testCases, criterion.maxPoints / 100);
      const passed = testResults.every(t => t.passed);
      const points = testResults.reduce((sum, t) => sum + t.points, 0);
      
      criterionResult = {
        name: criterion.name,
        description: criterion.description,
        passed: passed,
        points: Math.round(points),
        maxPoints: criterion.maxPoints,
        details: testResults.map(t => `${t.criterion}: ${t.details}`).join('; '),
        testResults: testResults
      };
    } else if (criterion.patterns && criterion.patterns.length > 0) {
      // Check code patterns
      const patternResults = checkCodePatterns(code, criterion.patterns);
      const passed = patternResults.every(p => p.passed);
      const points = passed ? criterion.maxPoints : 0;
      
      criterionResult = {
        name: criterion.name,
        description: criterion.description,
        passed: passed,
        points: points,
        maxPoints: criterion.maxPoints,
        details: patternResults.map(p => `${p.criterion}: ${p.details}`).join('; '),
        patternResults: patternResults
      };
    } else {
      // Basic execution test
      try {
        const execResult = await executePythonCode(code, '', 5000);
        const passed = execResult.success && results.syntaxValid;
        const points = passed ? criterion.maxPoints : 0;
        
        criterionResult = {
          name: criterion.name,
          description: criterion.description,
          passed: passed,
          points: points,
          maxPoints: criterion.maxPoints,
          details: passed ? 'Code executed successfully' : (execResult.error || 'Execution failed')
        };
      } catch (err) {
        criterionResult = {
          name: criterion.name,
          description: criterion.description,
          passed: false,
          points: 0,
          maxPoints: criterion.maxPoints,
          details: `Error: ${err.message}`
        };
      }
    }

    results.criteria.push(criterionResult);
    results.totalPoints += criterionResult.points;
    results.maxPoints += criterionResult.maxPoints;
  }

  return results;
};

// Generate feedback from grading results
const generateFeedback = (gradingResults) => {
  let feedback = `Auto-Grading Results:\n`;
  feedback += `Total Score: ${gradingResults.totalPoints}/${gradingResults.maxPoints}\n\n`;

  if (!gradingResults.syntaxValid) {
    feedback += `Syntax Error: ${gradingResults.executionError}\n\n`;
  }

  feedback += `Criteria Evaluation:\n`;
  for (const criterion of gradingResults.criteria) {
    const status = criterion.passed ? 'PASS' : 'FAIL';
    feedback += `${status} ${criterion.name} (${criterion.points}/${criterion.maxPoints} points)\n`;
    feedback += `   ${criterion.details}\n`;
  }

  return feedback;
};

module.exports = {
  executePythonCode,
  autoGradeSubmission,
  generateFeedback,
  checkCodePatterns,
  evaluateAgainstTests
};

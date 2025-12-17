"""
Factorial Calculator Assignment
Student: Sample Student
Implements factorial function with error handling
"""

def factorial(n):
    """
    Calculate the factorial of a non-negative integer
    Returns None for negative numbers
    """
    # Handle negative numbers
    if n < 0:
        return None
    
    # Base cases
    if n == 0 or n == 1:
        return 1
    
    # Calculate factorial
    result = 1
    for i in range(2, n + 1):
        result *= i
    
    return result

# Test cases
if __name__ == "__main__":
    print(f"factorial(5) = {factorial(5)}")
    print(f"factorial(0) = {factorial(0)}")
    print(f"factorial(10) = {factorial(10)}")
    print(f"factorial(-1) = {factorial(-1)}")

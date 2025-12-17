"""
Factorial Calculator - Recursive Implementation
Student: Advanced Student
Uses recursion instead of loops
"""

def factorial(n):
    """Calculate factorial using recursion"""
    if n < 0:
        return None
    if n == 0 or n == 1:
        return 1
    return n * factorial(n - 1)

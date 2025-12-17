"""
List Operations Assignment
Student: Sample Student with Partial Solution
Some functions are correct, some have bugs
"""

def sum_list(numbers):
    """Calculate the sum - CORRECT"""
    if not numbers:
        return 0
    total = 0
    for num in numbers:
        total += num
    return total

def average_list(numbers):
    """Calculate the average - BUG: doesn't handle empty list"""
    # BUG: Will crash with empty list due to division by zero
    return sum(numbers) / len(numbers)

def find_max(numbers):
    """Find the maximum - BUG: wrong logic"""
    if not numbers:
        return None
    # BUG: Returns the last element instead of max
    return numbers[-1]

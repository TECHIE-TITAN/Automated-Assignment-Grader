"""
List Operations Assignment
Student: Sample Student
Functions to perform operations on lists
"""

def sum_list(numbers):
    """Calculate the sum of all numbers in a list"""
    if not numbers:
        return 0
    total = 0
    for num in numbers:
        total += num
    return total

def average_list(numbers):
    """Calculate the average of numbers in a list"""
    if not numbers:
        return 0.0
    return sum_list(numbers) / len(numbers)

def find_max(numbers):
    """Find the maximum number in a list"""
    if not numbers:
        return None
    max_num = numbers[0]
    for num in numbers:
        if num > max_num:
            max_num = num
    return max_num

# Test the functions
if __name__ == "__main__":
    test_list = [1, 2, 3, 4, 5]
    print(f"Sum: {sum_list(test_list)}")
    print(f"Average: {average_list(test_list)}")
    print(f"Max: {find_max(test_list)}")

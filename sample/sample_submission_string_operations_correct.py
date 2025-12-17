"""
String Manipulation Assignment
Student: Sample Student
Functions for string operations
"""

def reverse_string(s):
    """Reverse a string"""
    return s[::-1]

def is_palindrome(s):
    """Check if a string is a palindrome"""
    s = s.lower()
    return s == s[::-1]

def count_vowels(s):
    """Count the number of vowels in a string"""
    vowels = 'aeiouAEIOU'
    count = 0
    for char in s:
        if char in vowels:
            count += 1
    return count

# Test the functions
if __name__ == "__main__":
    print(f"reverse_string('hello') = {reverse_string('hello')}")
    print(f"is_palindrome('radar') = {is_palindrome('radar')}")
    print(f"count_vowels('Education') = {count_vowels('Education')}")

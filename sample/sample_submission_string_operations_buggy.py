"""
String Manipulation Assignment - With Bugs
Student: Sample Student with Errors
Some functions work, some don't
"""

def reverse_string(s):
    """Reverse a string - WRONG LOGIC"""
    # BUG: Just returns original string
    return s

def is_palindrome(s):
    """Check if palindrome - CORRECT"""
    s = s.lower()
    return s == s[::-1]

def count_vowels(s):
    """Count vowels - BUG: misses lowercase vowels"""
    # BUG: Only counts uppercase vowels
    vowels = 'AEIOU'
    count = 0
    for char in s:
        if char in vowels:
            count += 1
    return count

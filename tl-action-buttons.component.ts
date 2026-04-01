text = re.sub(r'\[\[(\d+)\]\]\(\s*#[^)]+\s*\)', r'<font color="blue"><super>[\1]</super></font>', text)
    text = re.sub(r'\[(\d+)\]\(\s*#[^)]+\s*\)', r'<font color="blue"><super>[\1]</super></font>', text)
    # Hand

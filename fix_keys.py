import os

def replace_in_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original = content
    
    # Remove global assignments
    content = content.replace('GROQ_API_KEY = os.getenv("GROQ_API_KEY")\n', '')
    content = content.replace('GROQ_API_KEY = os.getenv("GROQ_API_KEY")', '')
    
    # Replace usage
    content = content.replace('{GROQ_API_KEY}', '{os.environ.get("GROQ_API_KEY")}')
    content = content.replace(' GROQ_API_KEY', ' os.environ.get("GROQ_API_KEY")')
    content = content.replace('(GROQ_API_KEY', '(os.environ.get("GROQ_API_KEY")')
    
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Updated {filepath}')

for root, _, files in os.walk('.'):
    if 'venv' in root or 'node_modules' in root or '__pycache__' in root or '.git' in root:
        continue
    for file in files:
        if file.endswith('.py') and file != 'fix_keys.py':
            replace_in_file(os.path.join(root, file))
print('done')

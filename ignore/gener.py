import os

# Path to your project folder
folder = r"C:\Users\GAYATHRI\projectpro"  # Change this to your folder path
output_file = r"ignore/folder_path.dot"

# List folders to ignore
ignore_folders = ["node_modules", ".git", "__pycache__","ignore"]

def generate_dot(folder_path, parent=None):
    lines = []
    folder_name = os.path.basename(folder_path) or folder_path
    
    # Skip ignored folders
    if folder_name in ignore_folders:
        return lines
    
    # Link current folder to its parent (skip for root)
    if parent:
        lines.append(f'"{parent}" -> "{folder_name}"')
    
    # List directory contents sorted for consistency
    try:
        entries = sorted(os.listdir(folder_path))
    except PermissionError:
        entries = []

    for entry in entries:
        entry_path = os.path.join(folder_path, entry)
        if os.path.isdir(entry_path):
            lines.extend(generate_dot(entry_path, folder_name))  # Recurse for subfolders
        else:
            # Files as leaf nodes
            lines.append(f'"{folder_name}" -> "{entry}"')
    return lines

# DOT header with tree-like layout settings
dot_lines = [
    "digraph folder_tree {",
    "rankdir=LR;",              # Left to Right tree
    "node [shape=folder, style=filled, color=lightblue, fontname=Helvetica];",
    "edge [arrowhead=none];",   # No arrowheads to look like branches
    "splines=false;",           # Straight lines for edges
    "ranksep=0.8;",             # Vertical spacing
    "nodesep=0.4;",             # Horizontal spacing
]

dot_lines += generate_dot(folder)
dot_lines.append("}")

# Save to DOT file
with open(output_file, "w") as f:
    f.write("\n".join(dot_lines))

print(f"Tree DOT file saved as {output_file}")
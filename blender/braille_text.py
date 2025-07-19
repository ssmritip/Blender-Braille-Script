import bpy

def clear_scene():
    """
    Remove all mesh objects from the current scene
    to start fresh before generating Braille.
    """
    if bpy.ops.object.select_all.poll():
        bpy.ops.object.select_all(action='DESELECT')
    for obj in bpy.data.objects:
        if obj.type == 'MESH':
            obj.select_set(True)
    if bpy.context.selected_objects:
        bpy.ops.object.delete()

def create_braille_dot(location, radius, height):
    """
    Creates a dome-shaped braille dot using a bisected UV sphere.

    Args:
        location (tuple): Center position of the dot base (x, y, z).
        radius (float): Base radius of the sphere.
        height (float): Final height after Z scaling.
    Returns:
        bpy.types.Object: Reference to the created dot object.
    """
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32, ring_count=16, radius=radius, location=location
    )
    dot_obj = bpy.context.active_object
    dot_obj.name = "BrailleDot"

    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    bpy.ops.mesh.bisect(
        plane_co=location, plane_no=(0, 0, 1), clear_inner=True
    )
    bpy.ops.object.mode_set(mode='OBJECT')

    for vert in dot_obj.data.vertices:
        if vert.co.z > 0:
            vert.co.z *= (height / radius)

    modifier = dot_obj.modifiers.new(name="Subdivision", type='SUBSURF')
    modifier.levels = 1
    modifier.render_levels = 1

    return dot_obj

def generate_braille_text(text_input="Hello", dot_radius=0.5, dot_height=0.5,
                          dot_spacing_x=2.5, dot_spacing_y=2.5,
                          cell_spacing_x=6.2, line_spacing_y=10.0,
                          base_height=3.0, padding_x=2.0, padding_y=2.0):    
    """
    Converts input text to 3D braille layout and generates a base plate underneath.

    Args:
        text_input (str): Text string to be converted. Use '\\n' for new lines.
        dot_radius (float): Radius of individual dots.
        dot_height (float): Height of the dots (via Z-scaling).
        dot_spacing_x (float): Horizontal distance between dot columns.
        dot_spacing_y (float): Vertical distance between dot rows.
        cell_spacing_x (float): Spacing between braille cells.
        line_spacing_y (float): Spacing between lines of braille.
        base_height (float): Thickness of the backing plate.
        padding_x (float): Extra margin on the X-axis.
        padding_y (float): Extra margin on the Y-axis.
    """
    clear_scene()

    braille_map = {
        'a': [1,0,0,0,0,0], 'b': [1,1,0,0,0,0], 'c': [1,0,0,1,0,0], 'd': [1,0,0,1,1,0],
        'e': [1,0,0,0,1,0], 'f': [1,1,0,1,0,0], 'g': [1,1,0,1,1,0], 'h': [1,1,0,0,1,0],
        'i': [0,1,0,1,0,0], 'j': [0,1,0,1,1,0], 'k': [1,0,1,0,0,0], 'l': [1,1,1,0,0,0],
        'm': [1,0,1,1,0,0], 'n': [1,0,1,1,1,0], 'o': [1,0,1,0,1,0], 'p': [1,1,1,1,0,0],
        'q': [1,1,1,1,1,0], 'r': [1,1,1,0,1,0], 's': [0,1,1,1,0,0], 't': [0,1,1,1,1,0],
        'u': [1,0,1,0,0,1], 'v': [1,1,1,0,0,1], 'w': [0,1,0,1,1,1], 'x': [1,0,1,1,0,1],
        'y': [1,0,1,1,1,1], 'z': [1,0,1,0,1,1],
        '1': [1,0,0,0,0,0], '2': [1,1,0,0,0,0], '3': [1,0,0,1,0,0], '4': [1,0,0,1,1,0],
        '5': [1,0,0,0,1,0], '6': [1,1,0,1,0,0], '7': [1,1,0,1,1,0], '8': [1,1,0,0,1,0],
        '9': [0,1,0,1,0,0], '0': [0,1,0,1,1,0],
        'CAPS': [0,0,0,0,0,1],
    }

    dot_positions = [
        (0, 2 * dot_spacing_y), (0, dot_spacing_y), (0, 0),
        (dot_spacing_x, 2 * dot_spacing_y), (dot_spacing_x, dot_spacing_y), (dot_spacing_x, 0)
    ]

    all_dots = []

    def add_cell(pattern, x, y):
        for i in range(6):
            if pattern[i]:
                dx, dy = dot_positions[i]
                loc = (x + dx, y + dy, base_height / 2)
                dot = create_braille_dot(loc, dot_radius, dot_height)
                all_dots.append(dot)

    current_y = 0.0
    max_cells = 0
    lines = text_input.split('\n')
    num_lines = len(lines)

    for line in lines:
        current_x = 0.0
        cells = 0
        words = line.split(' ')

        for word_index, word in enumerate(words):
            if not word:
                current_x += cell_spacing_x
                cells += 1
                continue

            if word.isupper() and len(word) > 1:
                for _ in range(2):
                    add_cell(braille_map['CAPS'], current_x, current_y)
                    current_x += cell_spacing_x
                    cells += 1
            elif word and word[0].isupper():
                add_cell(braille_map['CAPS'], current_x, current_y)
                current_x += cell_spacing_x
                cells += 1

            for char in word.lower():
                pattern = braille_map.get(char, [0,0,0,0,0,0])
                add_cell(pattern, current_x, current_y)
                current_x += cell_spacing_x
                cells += 1

            if word_index < len(words) - 1:
                current_x += cell_spacing_x
                cells += 1

        max_cells = max(max_cells, cells)
        current_y -= line_spacing_y

    if max_cells == 0:
        return

    span_x = (max_cells - 1) * cell_spacing_x + dot_spacing_x
    top_y = 2 * dot_spacing_y
    bottom_y = -((num_lines - 1) * line_spacing_y)
    span_y = top_y - bottom_y

    geom_width = span_x + 2 * dot_radius
    geom_depth = span_y + 2 * dot_radius
    base_width = geom_width + 2 * padding_x
    base_depth = geom_depth + 2 * padding_y

    center_x = span_x / 2
    center_y = (top_y + bottom_y) / 2
    center_z = 0

    # Add base cube
    bpy.ops.mesh.primitive_cube_add(size=1, location=(center_x, center_y, center_z))
    base = bpy.context.active_object
    base.name = "BrailleBase"
    base.scale = (base_width, base_depth, base_height)

    # Join all dots into one object
    bpy.ops.object.select_all(action='DESELECT')
    for dot in all_dots:
        dot.select_set(True)
    bpy.context.view_layer.objects.active = all_dots[0]
    bpy.ops.object.join()
    dots_joined = bpy.context.active_object
    dots_joined.name = "BrailleDots"

    # Apply boolean union modifier to base with all dots at once
    bool_mod = base.modifiers.new(name="BoolUnion", type='BOOLEAN')
    bool_mod.operation = 'UNION'
    bool_mod.object = dots_joined
    bool_mod.solver = 'EXACT'

    bpy.context.view_layer.objects.active = base
    bpy.ops.object.modifier_apply(modifier=bool_mod.name)

    # Remove dots joined object
    bpy.data.objects.remove(dots_joined, do_unlink=True)

    # Rename base to original text
    safe_name = text_input.strip().replace('\n', ' ')[:100]
    base.name = safe_name


# Example usage:
text_to_braille = "Chain for Changee"

generate_braille_text(
    text_input=text_to_braille,
    dot_radius=0.85,
    dot_height=0.768612,
    dot_spacing_x=2.5,
    dot_spacing_y=2.5,
    cell_spacing_x=7.0,
    line_spacing_y=10.0,
    base_height=3.0,
    padding_x=3.0,
    padding_y=3.0
)